/**
 * BIA v4 · R15 · BioSlicer — Geradores de infill para bioimpressão
 *
 * Recebem a REGIÃO (outer CCW, holes CW, já insetada pelas paredes) e
 * devolvem polilinhas recortadas contra a região.
 *
 *   · Espaçamento S de linhas paralelas com largura w: densidade = w/S
 *   · Grid: d ≈ 2w/S − (w/S)²   · Triângulos: ≈ 3w/S   · Honeycomb: ≈ w/(0.866·S)
 *   · Woodpile 0/90 (rectilinear com step 90°) → poros quadrados ≈ S − w.
 * Em bioimpressão o que importa é o TAMANHO DE PORO (S − w), então há
 * também `strandSpacing_mm` explícito (sobrepõe densidade).
 */

import type { Polygon, Path, Vec2, InfillPattern, BBox2 } from "./types"
import { bboxOf, bboxUnion, clipPathToPolySet, clipSegmentToPolySet, offsetPolySet, rotate, dist, pointInPolySet } from "./polygon-ops"

export interface InfillInput {
  region: Polygon[]
  pattern: InfillPattern
  lineWidth_mm: number
  density_pct: number
  angle_deg: number
  layerIndex: number
  z_mm: number
  strandSpacing_mm?: number
  gyroidCell_mm?: number
}

export interface InfillOutput {
  paths: Path[]
  spacing_mm: number
  poreSize_mm: number | null
}

export function spacingFromDensity(pattern: InfillPattern, lineWidth: number, density_pct: number): number {
  const d = Math.min(1, Math.max(0.01, density_pct / 100))
  switch (pattern) {
    case "grid": return lineWidth / (1 - Math.sqrt(Math.max(0, 1 - d)))
    case "triangles": return (3 * lineWidth) / d * 0.85
    case "honeycomb": return lineWidth / (d * 0.866)
    case "gyroid": return lineWidth / d * 1.15
    default: return lineWidth / d
  }
}

export function regionBBox(region: Polygon[]): BBox2 {
  let b: BBox2 | null = null
  for (const p of region) b = b ? bboxUnion(b, bboxOf(p)) : bboxOf(p)
  return b ?? { minX: 0, minY: 0, maxX: 0, maxY: 0 }
}

export function generateInfill(inp: InfillInput): InfillOutput {
  if (inp.pattern === "none" || inp.region.length === 0 || inp.density_pct <= 0) {
    return { paths: [], spacing_mm: 0, poreSize_mm: null }
  }
  const spacing = inp.strandSpacing_mm && inp.strandSpacing_mm > 0
    ? inp.strandSpacing_mm
    : spacingFromDensity(inp.pattern, inp.lineWidth_mm, inp.density_pct)

  let paths: Path[]
  switch (inp.pattern) {
    case "rectilinear": paths = parallelLines(inp.region, spacing, inp.angle_deg); break
    case "zigzag": paths = zigzag(inp.region, spacing, inp.angle_deg); break
    case "grid":
      paths = [...parallelLines(inp.region, spacing, inp.angle_deg), ...parallelLines(inp.region, spacing, inp.angle_deg + 90)]
      break
    case "triangles":
      paths = [
        ...parallelLines(inp.region, spacing, inp.angle_deg),
        ...parallelLines(inp.region, spacing, inp.angle_deg + 60),
        ...parallelLines(inp.region, spacing, inp.angle_deg + 120),
      ]
      break
    case "honeycomb": paths = honeycomb(inp.region, spacing, inp.angle_deg); break
    case "concentric": paths = concentric(inp.region, spacing); break
    case "gyroid": paths = gyroid2D(inp.region, inp.gyroidCell_mm ?? spacing * 2, inp.z_mm, inp.lineWidth_mm); break
    default: paths = []
  }
  const poreApplicable = ["rectilinear", "zigzag", "grid", "triangles", "honeycomb"].includes(inp.pattern)
  return {
    paths: paths.filter((p) => p.length >= 2 && pathLen(p) > inp.lineWidth_mm * 0.5),
    spacing_mm: spacing,
    poreSize_mm: poreApplicable ? Math.max(0, spacing - inp.lineWidth_mm) : null,
  }
}

function pathLen(p: Path): number {
  let L = 0
  for (let i = 1; i < p.length; i++) L += dist(p[i - 1], p[i])
  return L
}

/**
 * Linhas paralelas indexadas num referencial GLOBAL (não no bbox local) para
 * que camadas consecutivas com mesmo ângulo fiquem alinhadas (woodpile real).
 */
export function parallelLines(region: Polygon[], spacing: number, angle_deg: number): Path[] {
  const bb = regionBBox(region)
  const cx = (bb.minX + bb.maxX) / 2, cy = (bb.minY + bb.maxY) / 2
  const diag = Math.hypot(bb.maxX - bb.minX, bb.maxY - bb.minY) + spacing * 2
  const ang = (angle_deg * Math.PI) / 180
  const out: Path[] = []
  const originRot = rotate({ x: 0, y: 0 }, -ang, cx, cy)
  const phase = ((originRot.y - cy) % spacing + spacing) % spacing
  const n = Math.ceil(diag / spacing) + 1
  let flip = false
  for (let k = -n; k <= n; k++) {
    const yy = cy + phase + k * spacing
    if (yy < cy - diag / 2 || yy > cy + diag / 2) continue
    const a = rotate({ x: cx - diag / 2, y: yy }, ang, cx, cy)
    const b = rotate({ x: cx + diag / 2, y: yy }, ang, cx, cy)
    const pieces = clipSegmentToPolySet(a, b, region)
    const ordered = flip ? pieces.reverse().map(([p, q]) => [q, p] as [Vec2, Vec2]) : pieces
    for (const [p, q] of ordered) out.push([p, q])
    flip = !flip
  }
  return out
}

/** Rectilinear com conexões pela borda → caminho contínuo (menos starts/stops). */
export function zigzag(region: Polygon[], spacing: number, angle_deg: number): Path[] {
  const lines = parallelLines(region, spacing, angle_deg)
  if (lines.length === 0) return []
  const out: Path[] = []
  let cur: Path = [...lines[0]]
  for (let i = 1; i < lines.length; i++) {
    const prevEnd = cur[cur.length - 1]
    const next = lines[i]
    const d0 = dist(prevEnd, next[0]), d1 = dist(prevEnd, next[1])
    const ordered = d0 <= d1 ? next : [next[1], next[0]]
    const start = ordered[0]
    const gap = Math.min(d0, d1)
    const prevStart = cur[cur.length - 2]
    const dx = prevEnd.x - prevStart.x, dy = prevEnd.y - prevStart.y
    const L = Math.hypot(dx, dy) || 1
    const mid = { x: (prevEnd.x + start.x) / 2 - (dx / L) * 0.05, y: (prevEnd.y + start.y) / 2 - (dy / L) * 0.05 }
    if (gap <= spacing * 1.6 && pointInPolySet(mid, region)) {
      cur.push(start, ordered[1])
    } else {
      out.push(cur)
      cur = [ordered[0], ordered[1]]
    }
  }
  out.push(cur)
  return out
}

export function concentric(region: Polygon[], spacing: number): Path[] {
  const out: Path[] = []
  let cur = region
  let guard = 500
  while (cur.length > 0 && guard-- > 0) {
    for (const poly of cur) out.push([...poly, poly[0]])
    cur = offsetPolySet(cur, spacing)
  }
  return out
}

/** Malha hexagonal como fileiras de zigue-zague a 120° (arestas contínuas). */
export function honeycomb(region: Polygon[], spacing: number, angle_deg: number): Path[] {
  const bb = regionBBox(region)
  const cx = (bb.minX + bb.maxX) / 2, cy = (bb.minY + bb.maxY) / 2
  const diag = Math.hypot(bb.maxX - bb.minX, bb.maxY - bb.minY) + spacing * 3
  const ang = (angle_deg * Math.PI) / 180
  const a = spacing / 2
  const s = a / Math.cos(Math.PI / 6)
  const rowH = 1.5 * s
  const colW = 2 * a
  const out: Path[] = []
  const rows = Math.ceil(diag / rowH) + 2
  const cols = Math.ceil(diag / colW) + 2
  for (let r = -rows; r <= rows; r++) {
    const yBase = cy + r * rowH
    const xOff = (r % 2 === 0) ? 0 : a
    const path: Vec2[] = []
    for (let c = -cols; c <= cols; c++) {
      const x0 = cx + c * colW + xOff - diag / 2
      path.push({ x: x0, y: yBase - s / 2 })
      path.push({ x: x0 + a, y: yBase })
      path.push({ x: x0 + a, y: yBase + s / 2 })
    }
    const rot = path.map((p) => rotate(p, ang, cx, cy))
    out.push(...clipPathToPolySet(rot, region))
  }
  return out
}

/** Gyroid 2D: curvas senoidais defasadas em Z → canais interconectados isotrópicos. */
export function gyroid2D(region: Polygon[], cell_mm: number, z_mm: number, lineWidth: number): Path[] {
  const bb = regionBBox(region)
  const pad = cell_mm
  const phase = (2 * Math.PI * z_mm) / cell_mm
  const amp = cell_mm / 4
  const step = Math.max(lineWidth * 0.5, cell_mm / 24)
  const out: Path[] = []
  for (let y0 = bb.minY - pad; y0 <= bb.maxY + pad; y0 += cell_mm / 2) {
    const path: Vec2[] = []
    for (let x = bb.minX - pad; x <= bb.maxX + pad; x += step) {
      path.push({ x, y: y0 + amp * Math.sin((2 * Math.PI * x) / cell_mm + phase) })
    }
    out.push(...clipPathToPolySet(path, region))
  }
  for (let x0 = bb.minX - pad; x0 <= bb.maxX + pad; x0 += cell_mm / 2) {
    const path: Vec2[] = []
    for (let y = bb.minY - pad; y <= bb.maxY + pad; y += step) {
      path.push({ x: x0 + amp * Math.cos((2 * Math.PI * y) / cell_mm + phase), y })
    }
    out.push(...clipPathToPolySet(path, region))
  }
  return out
}
