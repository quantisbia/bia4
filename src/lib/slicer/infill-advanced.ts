/**
 * BIA v4 · R20 · Etapa B · BioSlicer — Infills "honestos" adicionais
 * ─────────────────────────────────────────────────────────────────────
 * Cada padrão gera EXATAMENTE o que o nome diz (mandato Janaina: "gyroid é
 * gyroid, grid é grid"). Todos recebem a região (outer CCW, holes CW, já
 * insetada pelas paredes) e devolvem polilinhas recortadas contra ela.
 *
 *  BÁSICO
 *   · waves      — linhas senoidais paralelas (ondas); amplitude = ¼ do
 *                  espaçamento, período = 2× espaçamento; alterna fase por camada.
 *  AVANÇADO (aba "Avançado" da Etapa 3)
 *   · schwarz_p  — TPMS Schwarz P: iso-curvas de cos x + cos y + cos z = 0
 *                  por camada (marching squares) → poros esféricos interconectados.
 *   · diamond    — TPMS Schwarz D: sin·sin·sin + sin·cos·cos + ... = 0.
 *   · voronoi    — células de Voronoi 2D (sementes pseudo-aleatórias, mesma
 *                  semente por peça → camadas alinhadas) — arestas das células.
 *   · perlin     — iso-curvas de ruído de valor 2D suavizado (fase em Z) →
 *                  canais orgânicos não periódicos.
 *   · gradient   — linhas paralelas com espaçamento que cresce do centro
 *                  para a borda (ou vice-versa) → gradiente de porosidade radial.
 */

import type { Polygon, Path, Vec2, BBox2 } from "./types"
import { bboxOf, bboxUnion, clipPathToPolySet, clipSegmentToPolySet, rotate, dist } from "./polygon-ops"

export type AdvancedInfillPattern = "schwarz_p" | "diamond" | "voronoi" | "perlin" | "gradient"
/** Padrões da aba "Avançado" (ondas é básico). */
export const ADVANCED_INFILL_PATTERNS: AdvancedInfillPattern[] = ["schwarz_p", "diamond", "voronoi", "perlin", "gradient"]
export const BASIC_INFILL_PATTERNS = ["rectilinear", "zigzag", "grid", "triangles", "honeycomb", "waves", "concentric", "gyroid", "none"] as const

export const INFILL_PATTERN_LABELS: Record<string, { label: string; hint: string; tier: "basic" | "advanced" }> = {
  rectilinear: { label: "Linhas (woodpile 0/90)", hint: "Linhas paralelas; alterna 0/90° por camada → poros quadrados.", tier: "basic" },
  zigzag: { label: "Zigzag contínuo", hint: "Linhas conectadas pela borda → menos partidas/paradas.", tier: "basic" },
  grid: { label: "Grid (quadriculado)", hint: "0° + 90° na mesma camada.", tier: "basic" },
  triangles: { label: "Triangular", hint: "0/60/120° na mesma camada → rígido.", tier: "basic" },
  honeycomb: { label: "Hexagonal (honeycomb)", hint: "Favo de mel real, arestas contínuas.", tier: "basic" },
  waves: { label: "Ondas", hint: "Linhas senoidais paralelas; fase alterna por camada.", tier: "basic" },
  concentric: { label: "Concêntrico", hint: "Anéis internos seguindo o contorno.", tier: "basic" },
  gyroid: { label: "Gyroid", hint: "Curvas senoidais defasadas em Z → canais interconectados.", tier: "basic" },
  none: { label: "Sem preenchimento (só paredes)", hint: "Casca oca.", tier: "basic" },
  schwarz_p: { label: "Schwarz P (TPMS)", hint: "Iso-superfície cos x + cos y + cos z = 0 → poros esféricos.", tier: "advanced" },
  diamond: { label: "Diamond (TPMS Schwarz D)", hint: "Rede tetraédrica interconectada; alta área superficial.", tier: "advanced" },
  voronoi: { label: "Voronoi", hint: "Células poligonais irregulares (trabecular/osso).", tier: "advanced" },
  perlin: { label: "Perlin (orgânico)", hint: "Iso-curvas de ruído → canais não periódicos.", tier: "advanced" },
  gradient: { label: "Gradiente radial", hint: "Espaçamento cresce do centro para a borda.", tier: "advanced" },
}

function regionBBox(region: Polygon[]): BBox2 {
  let b: BBox2 | null = null
  for (const p of region) b = b ? bboxUnion(b, bboxOf(p)) : bboxOf(p)
  return b ?? { minX: 0, minY: 0, maxX: 0, maxY: 0 }
}

// ─── Ondas ────────────────────────────────────────────────────────────────
export function waves(region: Polygon[], spacing: number, angle_deg: number, layerIndex: number, lineWidth: number): Path[] {
  const bb = regionBBox(region)
  const cx = (bb.minX + bb.maxX) / 2, cy = (bb.minY + bb.maxY) / 2
  const diag = Math.hypot(bb.maxX - bb.minX, bb.maxY - bb.minY) + spacing * 2
  const ang = (angle_deg * Math.PI) / 180
  const amp = spacing / 4
  const period = spacing * 2
  const phase = layerIndex % 2 === 0 ? 0 : Math.PI
  const step = Math.max(lineWidth * 0.5, period / 16)
  const out: Path[] = []
  const n = Math.ceil(diag / spacing) + 1
  let flip = false
  for (let k = -n; k <= n; k++) {
    const yy = cy + k * spacing
    const path: Vec2[] = []
    for (let x = cx - diag / 2; x <= cx + diag / 2; x += step) {
      path.push(rotate({ x, y: yy + amp * Math.sin((2 * Math.PI * x) / period + phase) }, ang, cx, cy))
    }
    const pieces = clipPathToPolySet(path, region)
    out.push(...(flip ? pieces.reverse().map((p) => [...p].reverse()) : pieces))
    flip = !flip
  }
  return out
}

// ─── Marching squares (iso-curva f = 0) ───────────────────────────────────
type Field = (x: number, y: number) => number

function isoContours(region: Polygon[], f: Field, cell: number): Path[] {
  const bb = regionBBox(region)
  const pad = cell
  const x0 = bb.minX - pad, y0 = bb.minY - pad
  const nx = Math.max(2, Math.ceil((bb.maxX - bb.minX + 2 * pad) / cell))
  const ny = Math.max(2, Math.ceil((bb.maxY - bb.minY + 2 * pad) / cell))
  const grid: number[][] = []
  for (let j = 0; j <= ny; j++) {
    const row: number[] = []
    for (let i = 0; i <= nx; i++) row.push(f(x0 + i * cell, y0 + j * cell))
    grid.push(row)
  }
  const lerp = (ax: number, ay: number, av: number, bx: number, by: number, bv: number): Vec2 => {
    const t = av === bv ? 0.5 : av / (av - bv)
    return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t }
  }
  const segs: Array<[Vec2, Vec2]> = []
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const xa = x0 + i * cell, xb = xa + cell, ya = y0 + j * cell, yb = ya + cell
      const v0 = grid[j][i], v1 = grid[j][i + 1], v2 = grid[j + 1][i + 1], v3 = grid[j + 1][i]
      const idx = (v0 > 0 ? 1 : 0) | (v1 > 0 ? 2 : 0) | (v2 > 0 ? 4 : 0) | (v3 > 0 ? 8 : 0)
      if (idx === 0 || idx === 15) continue
      const e0 = () => lerp(xa, ya, v0, xb, ya, v1) // top
      const e1 = () => lerp(xb, ya, v1, xb, yb, v2) // right
      const e2 = () => lerp(xb, yb, v2, xa, yb, v3) // bottom
      const e3 = () => lerp(xa, yb, v3, xa, ya, v0) // left
      switch (idx) {
        case 1: case 14: segs.push([e3(), e0()]); break
        case 2: case 13: segs.push([e0(), e1()]); break
        case 3: case 12: segs.push([e3(), e1()]); break
        case 4: case 11: segs.push([e1(), e2()]); break
        case 5: segs.push([e3(), e0()], [e1(), e2()]); break
        case 6: case 9: segs.push([e0(), e2()]); break
        case 7: case 8: segs.push([e3(), e2()]); break
        case 10: segs.push([e0(), e1()], [e2(), e3()]); break
      }
    }
  }
  // encadeia segmentos em polilinhas (busca por extremidade coincidente)
  const paths = chainSegments(segs, cell * 0.01)
  const out: Path[] = []
  for (const p of paths) out.push(...clipPathToPolySet(p, region))
  return out
}

function chainSegments(segs: Array<[Vec2, Vec2]>, tol: number): Path[] {
  const key = (p: Vec2) => `${Math.round(p.x / tol)},${Math.round(p.y / tol)}`
  const used = new Array(segs.length).fill(false)
  const byEnd = new Map<string, number[]>()
  segs.forEach(([a, b], i) => {
    for (const k of [key(a), key(b)]) { const arr = byEnd.get(k) ?? []; arr.push(i); byEnd.set(k, arr) }
  })
  const out: Path[] = []
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue
    used[i] = true
    const path: Vec2[] = [segs[i][0], segs[i][1]]
    for (const dir of [1, -1] as const) {
      let guard = segs.length
      while (guard-- > 0) {
        const tip = dir === 1 ? path[path.length - 1] : path[0]
        const cands = (byEnd.get(key(tip)) ?? []).filter((j) => !used[j])
        if (cands.length === 0) break
        const j = cands[0]
        used[j] = true
        const [a, b] = segs[j]
        const next = dist(a, tip) < dist(b, tip) ? b : a
        if (dir === 1) path.push(next); else path.unshift(next)
      }
    }
    if (path.length >= 2) out.push(path)
  }
  return out
}

// ─── TPMS ─────────────────────────────────────────────────────────────────
export function schwarzP(region: Polygon[], cell_mm: number, z_mm: number, lineWidth: number): Path[] {
  const k = (2 * Math.PI) / cell_mm
  const cz = Math.cos(k * z_mm)
  const f: Field = (x, y) => Math.cos(k * x) + Math.cos(k * y) + cz
  return isoContours(region, f, Math.max(lineWidth * 0.6, cell_mm / 16))
}

export function diamond(region: Polygon[], cell_mm: number, z_mm: number, lineWidth: number): Path[] {
  const k = (2 * Math.PI) / cell_mm
  const sz = Math.sin(k * z_mm), cz = Math.cos(k * z_mm)
  const f: Field = (x, y) => {
    const sx = Math.sin(k * x), cx = Math.cos(k * x), sy = Math.sin(k * y), cy = Math.cos(k * y)
    return sx * sy * sz + sx * cy * cz + cx * sy * cz + cx * cy * sz
  }
  return isoContours(region, f, Math.max(lineWidth * 0.6, cell_mm / 16))
}

// ─── Voronoi 2D ───────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Arestas das células de Voronoi (via bissetrizes recortadas pelas células vizinhas). Sementes em jitter-grid → células ~ cell_mm. */
export function voronoi(region: Polygon[], cell_mm: number, seed = 1337): Path[] {
  const bb = regionBBox(region)
  const pad = cell_mm
  const rnd = mulberry32(seed)
  const seeds: Vec2[] = []
  for (let y = bb.minY - pad; y <= bb.maxY + pad; y += cell_mm) {
    for (let x = bb.minX - pad; x <= bb.maxX + pad; x += cell_mm) {
      seeds.push({ x: x + (rnd() - 0.5) * cell_mm * 0.8, y: y + (rnd() - 0.5) * cell_mm * 0.8 })
    }
  }
  const out: Path[] = []
  const R = cell_mm * 3
  const seen = new Set<string>()
  for (let i = 0; i < seeds.length; i++) {
    const s = seeds[i]
    // célula = interseção dos semiplanos; recorta polígono grande por cada vizinho
    let cellPoly: Vec2[] = [
      { x: s.x - R, y: s.y - R }, { x: s.x + R, y: s.y - R }, { x: s.x + R, y: s.y + R }, { x: s.x - R, y: s.y + R },
    ]
    for (let j = 0; j < seeds.length; j++) {
      if (i === j) continue
      const t = seeds[j]
      if (dist(s, t) > R * 1.5) continue
      const mx = (s.x + t.x) / 2, my = (s.y + t.y) / 2
      const nx = t.x - s.x, ny = t.y - s.y
      cellPoly = clipHalfPlane(cellPoly, mx, my, nx, ny)
      if (cellPoly.length < 3) break
    }
    if (cellPoly.length < 3) continue
    for (let k = 0; k < cellPoly.length; k++) {
      const a = cellPoly[k], b = cellPoly[(k + 1) % cellPoly.length]
      const ka = `${a.x.toFixed(3)},${a.y.toFixed(3)}`, kb = `${b.x.toFixed(3)},${b.y.toFixed(3)}`
      const ek = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`
      if (seen.has(ek)) continue
      seen.add(ek)
      for (const [p, q] of clipSegmentToPolySet(a, b, region)) out.push([p, q])
    }
  }
  return out
}

/** Mantém a parte do polígono com (p − m)·n ≤ 0 (lado da semente). */
function clipHalfPlane(poly: Vec2[], mx: number, my: number, nx: number, ny: number): Vec2[] {
  const side = (p: Vec2) => (p.x - mx) * nx + (p.y - my) * ny
  const out: Vec2[] = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    const sa = side(a), sb = side(b)
    if (sa <= 0) out.push(a)
    if ((sa < 0 && sb > 0) || (sa > 0 && sb < 0)) {
      const t = sa / (sa - sb)
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
    }
  }
  return out
}

// ─── Perlin (value noise suavizado) ───────────────────────────────────────
function hash2(ix: number, iy: number, seed: number): number {
  let h = (ix * 374761393 + iy * 668265263 + seed * 982451653) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
function smooth(t: number) { return t * t * (3 - 2 * t) }
function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = smooth(x - ix), fy = smooth(y - iy)
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed), c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed)
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy
}

export function perlin(region: Polygon[], cell_mm: number, z_mm: number, lineWidth: number, seed = 7): Path[] {
  const zSeed = seed + Math.floor(z_mm / cell_mm)
  const zt = smooth(((z_mm / cell_mm) % 1 + 1) % 1)
  const f: Field = (x, y) => {
    const n0 = valueNoise(x / cell_mm, y / cell_mm, zSeed)
    const n1 = valueNoise(x / cell_mm, y / cell_mm, zSeed + 1)
    return (n0 * (1 - zt) + n1 * zt) - 0.5
  }
  return isoContours(region, f, Math.max(lineWidth * 0.6, cell_mm / 10))
}

// ─── Gradiente radial ─────────────────────────────────────────────────────
/** Linhas paralelas cujo espaçamento cresce linearmente do centro (spacing) à borda (spacing×ratio). */
export function gradient(region: Polygon[], spacing: number, angle_deg: number, ratio = 2.5): Path[] {
  const bb = regionBBox(region)
  const cx = (bb.minX + bb.maxX) / 2, cy = (bb.minY + bb.maxY) / 2
  const half = Math.hypot(bb.maxX - bb.minX, bb.maxY - bb.minY) / 2 + spacing
  const ang = (angle_deg * Math.PI) / 180
  const out: Path[] = []
  const emit = (off: number) => {
    const a = rotate({ x: cx - half, y: cy + off }, ang, cx, cy)
    const b = rotate({ x: cx + half, y: cy + off }, ang, cx, cy)
    for (const [p, q] of clipSegmentToPolySet(a, b, region)) out.push([p, q])
  }
  emit(0)
  let off = 0
  let guard = 2000
  while (off < half && guard-- > 0) {
    const t = Math.min(1, off / half)
    off += spacing * (1 + (ratio - 1) * t)
    emit(off); emit(-off)
  }
  return out
}
