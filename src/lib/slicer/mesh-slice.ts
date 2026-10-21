/**
 * BIA v4 · R15 · BioSlicer — Fatiamento de malha (plane–mesh intersection)
 *
 * Para cada plano Z: coleta segmentos de interseção de cada triângulo,
 * costura em polígonos fechados usando hash espacial e normaliza
 * orientação (outer CCW / hole CW). Também: parsing STL binário/ASCII,
 * conversão de malha indexada e posicionamento (escala, rotação, centro).
 */

import type { TriMesh, Vec2, Polygon, BBox3 } from "./types"
import { normalizeContours, cleanPolygon, simplify } from "./polygon-ops"

const EPS = 1e-7

export function parseSTL(buffer: ArrayBuffer, name?: string): TriMesh {
  if (isAsciiSTL(buffer)) return parseAsciiSTL(buffer, name)
  return parseBinarySTL(buffer, name)
}

function isAsciiSTL(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 84) return true
  const head = new TextDecoder("ascii").decode(new Uint8Array(buffer, 0, Math.min(512, buffer.byteLength)))
  if (!/^\s*solid\b/i.test(head)) return false
  const count = new DataView(buffer).getUint32(80, true)
  if (84 + count * 50 === buffer.byteLength) return false
  return /facet|vertex/i.test(head)
}

function parseBinarySTL(buffer: ArrayBuffer, name?: string): TriMesh {
  const dv = new DataView(buffer)
  const count = dv.getUint32(80, true)
  const maxTris = Math.floor((buffer.byteLength - 84) / 50)
  const n = Math.min(count, maxTris)
  const vertices = new Float32Array(n * 9)
  let off = 84
  for (let i = 0; i < n; i++) {
    off += 12
    for (let k = 0; k < 9; k++) { vertices[i * 9 + k] = dv.getFloat32(off, true); off += 4 }
    off += 2
  }
  return finalizeMesh(vertices, n, name)
}

function parseAsciiSTL(buffer: ArrayBuffer, name?: string): TriMesh {
  const text = new TextDecoder("utf-8").decode(buffer)
  const re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g
  const vals: number[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) vals.push(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]))
  const n = Math.floor(vals.length / 9)
  return finalizeMesh(new Float32Array(vals.slice(0, n * 9)), n, name)
}

export function finalizeMesh(vertices: Float32Array, triangleCount: number, name?: string): TriMesh {
  return { vertices, triangleCount, bbox: computeBBox(vertices, triangleCount), name }
}

export function computeBBox(v: Float32Array, triCount: number): BBox3 {
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  const n = triCount * 9
  for (let i = 0; i < n; i += 3) {
    const x = v[i], y = v[i + 1], z = v[i + 2]
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 }
  return { minX, minY, minZ, maxX, maxY, maxZ }
}

export function fromIndexed(vertices: Float32Array | number[], indices: Uint32Array | number[], name?: string): TriMesh {
  const triCount = Math.floor(indices.length / 3)
  const out = new Float32Array(triCount * 9)
  for (let t = 0; t < triCount; t++) {
    for (let k = 0; k < 3; k++) {
      const vi = indices[t * 3 + k] * 3
      out[t * 9 + k * 3] = vertices[vi]
      out[t * 9 + k * 3 + 1] = vertices[vi + 1]
      out[t * 9 + k * 3 + 2] = vertices[vi + 2]
    }
  }
  return finalizeMesh(out, triCount, name)
}

export interface PlacementOptions {
  scale: number
  rotationZ_deg: number
  centerX: number
  centerY: number
  baseZ: number
}

export function placeMesh(mesh: TriMesh, opt: PlacementOptions): TriMesh {
  const { bbox } = mesh
  const cx = (bbox.minX + bbox.maxX) / 2
  const cy = (bbox.minY + bbox.maxY) / 2
  const ang = (opt.rotationZ_deg * Math.PI) / 180
  const c = Math.cos(ang), s = Math.sin(ang)
  const n = mesh.triangleCount * 9
  const out = new Float32Array(n)
  for (let i = 0; i < n; i += 3) {
    const x = (mesh.vertices[i] - cx) * opt.scale
    const y = (mesh.vertices[i + 1] - cy) * opt.scale
    const z = (mesh.vertices[i + 2] - bbox.minZ) * opt.scale
    out[i] = x * c - y * s + opt.centerX
    out[i + 1] = x * s + y * c + opt.centerY
    out[i + 2] = z + opt.baseZ
  }
  return finalizeMesh(out, mesh.triangleCount, mesh.name)
}

interface Seg { ax: number; ay: number; bx: number; by: number }

export function sliceAtZ(mesh: TriMesh, z: number, simplifyTol = 0.02): Polygon[] {
  const v = mesh.vertices
  const segs: Seg[] = []
  for (let t = 0; t < mesh.triangleCount; t++) {
    const b = t * 9
    const z0 = v[b + 2], z1 = v[b + 5], z2 = v[b + 8]
    const lo = Math.min(z0, z1, z2), hi = Math.max(z0, z1, z2)
    if (hi < z - EPS || lo > z + EPS) continue
    if (hi - lo < EPS) continue
    const pts: Vec2[] = []
    pushEdge(v, b, 0, 1, z, pts)
    pushEdge(v, b, 1, 2, z, pts)
    pushEdge(v, b, 2, 0, z, pts)
    const uniq: Vec2[] = []
    for (const p of pts) {
      if (!uniq.some((q) => Math.abs(q.x - p.x) < 1e-6 && Math.abs(q.y - p.y) < 1e-6)) uniq.push(p)
    }
    if (uniq.length === 2) {
      segs.push({ ax: uniq[0].x, ay: uniq[0].y, bx: uniq[1].x, by: uniq[1].y })
    } else if (uniq.length > 2) {
      let bi = 0, bj = 1, bd = -1
      for (let i = 0; i < uniq.length; i++) for (let j = i + 1; j < uniq.length; j++) {
        const d = (uniq[i].x - uniq[j].x) ** 2 + (uniq[i].y - uniq[j].y) ** 2
        if (d > bd) { bd = d; bi = i; bj = j }
      }
      segs.push({ ax: uniq[bi].x, ay: uniq[bi].y, bx: uniq[bj].x, by: uniq[bj].y })
    }
  }
  const loops = stitch(segs)
  const cleaned = loops
    .map((p) => cleanPolygon(p, 1e-4))
    .map((p) => (simplifyTol > 0 ? simplify(p, simplifyTol, true) : p))
    .filter((p) => p.length >= 3)
  return normalizeContours(cleaned, 0.01)
}

function pushEdge(v: Float32Array, b: number, i0: number, i1: number, z: number, out: Vec2[]) {
  const ax = v[b + i0 * 3], ay = v[b + i0 * 3 + 1], az = v[b + i0 * 3 + 2]
  const bx = v[b + i1 * 3], by = v[b + i1 * 3 + 1], bz = v[b + i1 * 3 + 2]
  const da = az - z, db = bz - z
  if (Math.abs(da) < EPS && Math.abs(db) < EPS) {
    out.push({ x: ax, y: ay }, { x: bx, y: by })
  } else if (Math.abs(da) < EPS) {
    out.push({ x: ax, y: ay })
  } else if (Math.abs(db) < EPS) {
    out.push({ x: bx, y: by })
  } else if ((da < 0) !== (db < 0)) {
    const t = da / (da - db)
    out.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t })
  }
}

function stitch(segs: Seg[]): Polygon[] {
  if (segs.length === 0) return []
  const WELD = 2e-3
  const cell = WELD * 4
  const key = (x: number, y: number) => `${Math.round(x / cell)},${Math.round(y / cell)}`
  const index = new Map<string, Array<[number, 0 | 1]>>()
  const add = (k: string, val: [number, 0 | 1]) => {
    const arr = index.get(k)
    if (arr) arr.push(val); else index.set(k, [val])
  }
  for (let i = 0; i < segs.length; i++) {
    add(key(segs[i].ax, segs[i].ay), [i, 0])
    add(key(segs[i].bx, segs[i].by), [i, 1])
  }
  const used = new Uint8Array(segs.length)
  const loops: Polygon[] = []
  const neighbors = (x: number, y: number): Array<[number, 0 | 1]> => {
    const cx = Math.round(x / cell), cy = Math.round(y / cell)
    const out: Array<[number, 0 | 1]> = []
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const arr = index.get(`${cx + dx},${cy + dy}`)
      if (arr) for (const e of arr) out.push(e)
    }
    return out
  }
  for (let s = 0; s < segs.length; s++) {
    if (used[s]) continue
    used[s] = 1
    const poly: Polygon = [{ x: segs[s].ax, y: segs[s].ay }, { x: segs[s].bx, y: segs[s].by }]
    let cx = segs[s].bx, cy = segs[s].by
    let closed = false
    let guard = segs.length + 2
    while (guard-- > 0) {
      let found = -1, foundEnd: 0 | 1 = 0, bestD = WELD
      for (const [si, end] of neighbors(cx, cy)) {
        if (used[si]) continue
        const px = end === 0 ? segs[si].ax : segs[si].bx
        const py = end === 0 ? segs[si].ay : segs[si].by
        const d = Math.hypot(px - cx, py - cy)
        if (d < bestD) { bestD = d; found = si; foundEnd = end }
      }
      if (found < 0) break
      used[found] = 1
      const nx = foundEnd === 0 ? segs[found].bx : segs[found].ax
      const ny = foundEnd === 0 ? segs[found].by : segs[found].ay
      if (Math.hypot(nx - poly[0].x, ny - poly[0].y) < WELD) { closed = true; break }
      poly.push({ x: nx, y: ny })
      cx = nx; cy = ny
    }
    if (poly.length >= 3) {
      const gap = closed ? 0 : Math.hypot(poly[0].x - cx, poly[0].y - cy)
      if (gap < 0.5) loops.push(poly)
    }
  }
  return loops
}

/** Alturas Z (centro de cada camada). */
export function layerZs(bbox: BBox3, layerHeight: number, firstLayerHeight: number): number[] {
  const zs: number[] = []
  const height = bbox.maxZ - bbox.minZ
  if (height <= 0) return zs
  let top = bbox.minZ + firstLayerHeight
  zs.push(Math.min(top, bbox.maxZ) - firstLayerHeight / 2)
  while (top + layerHeight * 0.5 < bbox.maxZ) {
    top += layerHeight
    zs.push(Math.min(top, bbox.maxZ) - layerHeight / 2)
  }
  return zs
}

// ─── R21 · Arrumar na mesa: rotação livre X/Y/Z + escala + apoiar em Z=0 ──
export interface Orientation { rotX_deg: number; rotY_deg: number; rotZ_deg: number; scale: number }
export const IDENTITY_ORIENTATION: Orientation = { rotX_deg: 0, rotY_deg: 0, rotZ_deg: 0, scale: 1 }

/**
 * Aplica rotação (ordem X → Y → Z, em torno do centro da malha), escala
 * uniforme, re-centra em XY e apoia a face mais baixa em Z=0 ("drop to bed").
 */
export function orientMesh(mesh: TriMesh, o: Orientation): TriMesh {
  const { bbox } = mesh
  const cx = (bbox.minX + bbox.maxX) / 2, cy = (bbox.minY + bbox.maxY) / 2, cz = (bbox.minZ + bbox.maxZ) / 2
  const r = (d: number) => (d * Math.PI) / 180
  const [ax, ay, az] = [r(o.rotX_deg), r(o.rotY_deg), r(o.rotZ_deg)]
  const cxr = Math.cos(ax), sxr = Math.sin(ax), cyr = Math.cos(ay), syr = Math.sin(ay), czr = Math.cos(az), szr = Math.sin(az)
  const n = mesh.triangleCount * 9
  const out = new Float32Array(n)
  for (let i = 0; i < n; i += 3) {
    let x = (mesh.vertices[i] - cx) * o.scale
    let y = (mesh.vertices[i + 1] - cy) * o.scale
    let z = (mesh.vertices[i + 2] - cz) * o.scale
    // Rx
    let y1 = y * cxr - z * sxr, z1 = y * sxr + z * cxr; y = y1; z = z1
    // Ry
    let x1 = x * cyr + z * syr; z1 = -x * syr + z * cyr; x = x1; z = z1
    // Rz
    x1 = x * czr - y * szr; y1 = x * szr + y * czr; x = x1; y = y1
    out[i] = x; out[i + 1] = y; out[i + 2] = z
  }
  // re-centra XY e apoia em Z=0
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity
  for (let i = 0; i < n; i += 3) {
    if (out[i] < minX) minX = out[i]; if (out[i] > maxX) maxX = out[i]
    if (out[i + 1] < minY) minY = out[i + 1]; if (out[i + 1] > maxY) maxY = out[i + 1]
    if (out[i + 2] < minZ) minZ = out[i + 2]
  }
  const dx = (minX + maxX) / 2, dy = (minY + maxY) / 2
  for (let i = 0; i < n; i += 3) { out[i] -= dx; out[i + 1] -= dy; out[i + 2] -= minZ }
  return finalizeMesh(out, mesh.triangleCount, mesh.name)
}

/**
 * Sugere a rotação que deixa a peça MAIS BAIXA (maior área de apoio) na mesa,
 * testando as 6 orientações principais (±90° em X/Y). Retorna a melhor.
 */
export function suggestLayFlat(mesh: TriMesh): Orientation {
  const cands: Orientation[] = [
    { rotX_deg: 0, rotY_deg: 0, rotZ_deg: 0, scale: 1 },
    { rotX_deg: 90, rotY_deg: 0, rotZ_deg: 0, scale: 1 },
    { rotX_deg: -90, rotY_deg: 0, rotZ_deg: 0, scale: 1 },
    { rotX_deg: 0, rotY_deg: 90, rotZ_deg: 0, scale: 1 },
    { rotX_deg: 0, rotY_deg: -90, rotZ_deg: 0, scale: 1 },
    { rotX_deg: 180, rotY_deg: 0, rotZ_deg: 0, scale: 1 },
  ]
  let best = cands[0], bestScore = -Infinity
  for (const c of cands) {
    const m = orientMesh(mesh, c)
    const h = m.bbox.maxZ - m.bbox.minZ
    // área de apoio: triângulos com z ≈ 0 e normal para baixo
    let base = 0
    const v = m.vertices
    for (let t = 0; t < m.triangleCount; t++) {
      const k = t * 9
      if (v[k + 2] < 0.05 && v[k + 5] < 0.05 && v[k + 8] < 0.05) {
        const ax = v[k + 3] - v[k], ay = v[k + 4] - v[k + 1], bx = v[k + 6] - v[k], by = v[k + 7] - v[k + 1]
        base += Math.abs(ax * by - ay * bx) / 2
      }
    }
    const score = base * 10 - h
    if (score > bestScore) { bestScore = score; best = c }
  }
  return best
}
