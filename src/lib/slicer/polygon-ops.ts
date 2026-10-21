/**
 * BIA v4 · R15 · BioSlicer — Operações 2D sobre polígonos
 *
 * Tudo em mm, sem dependências. Robusto a concavidades, furos e ilhas múltiplas.
 */

import type { Vec2, Polygon, Path, BBox2 } from "./types"

export const EPS = 1e-9

export function signedArea(poly: Polygon): number {
  let a = 0
  const n = poly.length
  for (let i = 0; i < n; i++) {
    const p = poly[i], q = poly[(i + 1) % n]
    a += p.x * q.y - q.x * p.y
  }
  return a / 2
}

export function area(poly: Polygon): number { return Math.abs(signedArea(poly)) }
export function isCCW(poly: Polygon): boolean { return signedArea(poly) > 0 }
export function reversed<T>(arr: T[]): T[] { return [...arr].reverse() }
export function ensureCCW(poly: Polygon): Polygon { return isCCW(poly) ? poly : reversed(poly) }
export function ensureCW(poly: Polygon): Polygon { return isCCW(poly) ? reversed(poly) : poly }

export function bboxOf(points: Vec2[]): BBox2 {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  return { minX, minY, maxX, maxY }
}

export function bboxUnion(a: BBox2, b: BBox2): BBox2 {
  return {
    minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY),
  }
}

export function centroid(poly: Polygon): Vec2 {
  const a = signedArea(poly)
  if (Math.abs(a) < EPS) {
    const b = bboxOf(poly)
    return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }
  }
  let cx = 0, cy = 0
  const n = poly.length
  for (let i = 0; i < n; i++) {
    const p = poly[i], q = poly[(i + 1) % n]
    const f = p.x * q.y - q.x * p.y
    cx += (p.x + q.x) * f
    cy += (p.y + q.y) * f
  }
  return { x: cx / (6 * a), y: cy / (6 * a) }
}

export function dist(a: Vec2, b: Vec2): number { return Math.hypot(a.x - b.x, a.y - b.y) }

export function pathLength(path: Path, closed = false): number {
  let L = 0
  for (let i = 1; i < path.length; i++) L += dist(path[i - 1], path[i])
  if (closed && path.length > 2) L += dist(path[path.length - 1], path[0])
  return L
}

/** Ray casting even-odd. */
export function pointInPolygon(p: Vec2, poly: Polygon): boolean {
  let inside = false
  const n = poly.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = poly[i], b = poly[j]
    const intersects = (a.y > p.y) !== (b.y > p.y) &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / ((b.y - a.y) || 1e-12) + a.x
    if (intersects) inside = !inside
  }
  return inside
}

export function pointInPolySet(p: Vec2, polys: Polygon[]): boolean {
  let count = 0
  for (const poly of polys) if (pointInPolygon(p, poly)) count++
  return count % 2 === 1
}

/** Profundidade par → outer CCW; ímpar → furo CW. Remove degenerados. */
export function normalizeContours(polys: Polygon[], minArea = 1e-4): Polygon[] {
  const valid = polys.filter((p) => p.length >= 3 && area(p) >= minArea)
  const result: Polygon[] = []
  for (let i = 0; i < valid.length; i++) {
    const p = valid[i]
    const probe = p[0]
    let depth = 0
    for (let j = 0; j < valid.length; j++) {
      if (i === j) continue
      const mid = { x: (probe.x + p[1].x) / 2, y: (probe.y + p[1].y) / 2 }
      if (pointInPolygon(mid, valid[j])) depth++
    }
    result.push(depth % 2 === 0 ? ensureCCW(p) : ensureCW(p))
  }
  return result
}

export interface Island { outer: Polygon; holes: Polygon[] }

export function groupIslands(normalized: Polygon[]): Island[] {
  const outers = normalized.filter(isCCW)
  const holes = normalized.filter((p) => !isCCW(p))
  const islands: Island[] = outers.map((o) => ({ outer: o, holes: [] }))
  for (const h of holes) {
    let best = -1, bestArea = Infinity
    const probe = { x: (h[0].x + h[1].x) / 2, y: (h[0].y + h[1].y) / 2 }
    for (let i = 0; i < outers.length; i++) {
      if (pointInPolygon(probe, outers[i])) {
        const a = area(outers[i])
        if (a < bestArea) { bestArea = a; best = i }
      }
    }
    if (best >= 0) islands[best].holes.push(h)
  }
  return islands
}

/** Ramer–Douglas–Peucker. */
export function simplify(points: Vec2[], tolerance: number, closed = true): Vec2[] {
  if (points.length <= 3 || tolerance <= 0) return points
  if (closed) {
    let far = 0, farD = -1
    for (let i = 1; i < points.length; i++) {
      const d = dist(points[0], points[i])
      if (d > farD) { farD = d; far = i }
    }
    const a = rdp([...points.slice(0, far + 1)], tolerance)
    const b = rdp([...points.slice(far), points[0]], tolerance)
    const out = [...a.slice(0, -1), ...b.slice(0, -1)]
    return out.length >= 3 ? out : points
  }
  return rdp(points, tolerance)
}

function rdp(pts: Vec2[], tol: number): Vec2[] {
  if (pts.length < 3) return pts
  const first = pts[0], last = pts[pts.length - 1]
  let idx = -1, maxD = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDistance(pts[i], first, last)
    if (d > maxD) { maxD = d; idx = i }
  }
  if (maxD > tol && idx > 0) {
    const left = rdp(pts.slice(0, idx + 1), tol)
    const right = rdp(pts.slice(idx), tol)
    return [...left.slice(0, -1), ...right]
  }
  return [first, last]
}

function perpDistance(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x, dy = b.y - a.y
  const L2 = dx * dx + dy * dy
  if (L2 < EPS) return dist(p, a)
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy })
}

export function cleanPolygon(poly: Polygon, weld = 1e-4): Polygon {
  const out: Polygon = []
  for (const p of poly) {
    if (out.length === 0 || dist(out[out.length - 1], p) > weld) out.push(p)
  }
  while (out.length > 1 && dist(out[0], out[out.length - 1]) <= weld) out.pop()
  return out
}

/**
 * Offset de polígono (delta > 0 = remove material: inset em outer CCW, furo CW cresce).
 * Normal "à esquerda" do percurso = (-dy, dx) aponta para o material em ambos os casos.
 * Miter com limite → bevel; remove arestas invertidas; [] se colapsar.
 */
export function offsetPolygon(poly: Polygon, delta: number, miterLimit = 2): Polygon {
  const pts = cleanPolygon(poly)
  const n = pts.length
  if (n < 3) return []
  const ccw = isCCW(pts)
  const nx: number[] = new Array(n), ny: number[] = new Array(n)
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n]
    const dx = b.x - a.x, dy = b.y - a.y
    const L = Math.hypot(dx, dy) || 1
    nx[i] = -dy / L
    ny[i] = dx / L
  }
  const out: Polygon = []
  for (let i = 0; i < n; i++) {
    const prev = (i - 1 + n) % n
    const p = pts[i]
    let mx = nx[prev] + nx[i]
    let my = ny[prev] + ny[i]
    const mlen = Math.hypot(mx, my)
    if (mlen < 1e-9) {
      out.push({ x: p.x + nx[i] * delta, y: p.y + ny[i] * delta })
      continue
    }
    mx /= mlen; my /= mlen
    const cosHalf = mx * nx[i] + my * ny[i]
    const miter = 1 / Math.max(cosHalf, 1e-6)
    if (miter > miterLimit) {
      out.push({ x: p.x + nx[prev] * delta, y: p.y + ny[prev] * delta })
      out.push({ x: p.x + nx[i] * delta, y: p.y + ny[i] * delta })
      continue
    }
    out.push({ x: p.x + mx * delta * miter, y: p.y + my * delta * miter })
  }
  const cleaned = removeInvertedEdges(out, pts)
  if (cleaned.length < 3) return []
  if ((signedArea(cleaned) > 0) !== ccw) return []
  if (area(cleaned) < Math.max(1e-3, delta * delta * 0.5)) return []
  return cleanPolygon(cleaned)
}

function removeInvertedEdges(off: Polygon, orig: Polygon): Polygon {
  let cur = off
  for (let iter = 0; iter < 4; iter++) {
    const n = cur.length
    if (n < 4) break
    const keep: boolean[] = new Array(n).fill(true)
    let removed = 0
    for (let i = 0; i < n; i++) {
      const a = cur[i], b = cur[(i + 1) % n]
      const oi = Math.min(orig.length - 1, Math.floor((i / n) * orig.length))
      const oa = orig[oi], ob = orig[(oi + 1) % orig.length]
      const dot = (b.x - a.x) * (ob.x - oa.x) + (b.y - a.y) * (ob.y - oa.y)
      const len = dist(a, b)
      if (len < 1e-6 || (dot < 0 && len < dist(oa, ob) * 0.5)) {
        keep[(i + 1) % n] = false
        removed++
      }
    }
    if (removed === 0) break
    cur = cur.filter((_, i) => keep[i])
  }
  return cur
}

export function offsetPolySet(polys: Polygon[], delta: number): Polygon[] {
  const out: Polygon[] = []
  for (const p of polys) {
    const o = offsetPolygon(p, delta)
    if (o.length >= 3) out.push(o)
  }
  return normalizeContours(out)
}

export function segSegT(a: Vec2, b: Vec2, c: Vec2, d: Vec2): number | null {
  const r = { x: b.x - a.x, y: b.y - a.y }
  const s = { x: d.x - c.x, y: d.y - c.y }
  const denom = r.x * s.y - r.y * s.x
  if (Math.abs(denom) < 1e-12) return null
  const qp = { x: c.x - a.x, y: c.y - a.y }
  const t = (qp.x * s.y - qp.y * s.x) / denom
  const u = (qp.x * r.y - qp.y * r.x) / denom
  if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) return null
  return Math.min(1, Math.max(0, t))
}

/** Partes INTERNAS (even-odd) de um segmento contra o conjunto. */
export function clipSegmentToPolySet(a: Vec2, b: Vec2, polys: Polygon[]): Array<[Vec2, Vec2]> {
  const ts: number[] = [0, 1]
  for (const poly of polys) {
    const n = poly.length
    for (let i = 0; i < n; i++) {
      const t = segSegT(a, b, poly[i], poly[(i + 1) % n])
      if (t !== null) ts.push(t)
    }
  }
  ts.sort((x, y) => x - y)
  const out: Array<[Vec2, Vec2]> = []
  for (let i = 0; i < ts.length - 1; i++) {
    const t0 = ts[i], t1 = ts[i + 1]
    if (t1 - t0 < 1e-7) continue
    const tm = (t0 + t1) / 2
    const mid = { x: a.x + (b.x - a.x) * tm, y: a.y + (b.y - a.y) * tm }
    if (pointInPolySet(mid, polys)) {
      out.push([
        { x: a.x + (b.x - a.x) * t0, y: a.y + (b.y - a.y) * t0 },
        { x: a.x + (b.x - a.x) * t1, y: a.y + (b.y - a.y) * t1 },
      ])
    }
  }
  return out
}

export function clipPathToPolySet(path: Path, polys: Polygon[]): Path[] {
  const out: Path[] = []
  let cur: Path = []
  for (let i = 1; i < path.length; i++) {
    const pieces = clipSegmentToPolySet(path[i - 1], path[i], polys)
    for (const [p, q] of pieces) {
      if (cur.length > 0 && dist(cur[cur.length - 1], p) < 1e-6) {
        cur.push(q)
      } else {
        if (cur.length > 1) out.push(cur)
        cur = [p, q]
      }
    }
    if (pieces.length === 0 && cur.length > 1) { out.push(cur); cur = [] }
  }
  if (cur.length > 1) out.push(cur)
  return out
}

export function rotate(p: Vec2, ang: number, cx = 0, cy = 0): Vec2 {
  const c = Math.cos(ang), s = Math.sin(ang)
  const dx = p.x - cx, dy = p.y - cy
  return { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c }
}

export function translatePoly(poly: Vec2[], dx: number, dy: number): Vec2[] {
  return poly.map((p) => ({ x: p.x + dx, y: p.y + dy }))
}

export function nearestVertexIndex(poly: Polygon, p: Vec2): number {
  let best = 0, bd = Infinity
  for (let i = 0; i < poly.length; i++) {
    const d = (poly[i].x - p.x) ** 2 + (poly[i].y - p.y) ** 2
    if (d < bd) { bd = d; best = i }
  }
  return best
}

export function rotateStart<T>(arr: T[], i: number): T[] {
  if (i <= 0 || i >= arr.length) return arr
  return [...arr.slice(i), ...arr.slice(0, i)]
}
