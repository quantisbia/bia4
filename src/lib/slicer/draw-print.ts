/**
 * BIA v4 · R23 · Draw & Print — desenhe e a bioimpressora imprime
 * ─────────────────────────────────────────────────────────────────────
 * Inspirado no "Draw and Print" do DNA Studio 4 (CELLINK): "crie
 * construtos com o dedo — linhas, círculos ou quadrados — e atribua
 * cabeçotes diferentes para multi-material". Mandato Janaina: "fazer três
 * linhas e a impressora entender 3 caminhos de impressão; desenhar em
 * tela touch ou padmouse e criar volume a partir dessas linhas."
 *
 * Modelo: cada TRAÇO (stroke) é um caminho de extrusão em mm no plano da
 * mesa (origem = ponto zero = bico). Um desenho vira VOLUME repetindo os
 * traços por N camadas (altura total = camadas × altura de camada), com
 * opção de alternar o ângulo (woodpile) e de preencher formas fechadas.
 * A saída é `SlicedLayer[]` — o MESMO writer do BioSlicer gera o G-code
 * (origem no bico, cabeçotes T0..Tn, alvo Petri/placa, cobrança igual).
 */

import type { Vec2, Path, Polygon, SlicedLayer, ToolPath, SliceParams, ExtrusionModel } from "./types"
import { writeGCode, type WriteOptions, type WriteResult } from "./gcode-writer"
import { generateInfill } from "./infill"
import { rotate, signedArea } from "./polygon-ops"

export type StrokeKind = "freehand" | "line" | "circle" | "rect" | "polyline"

export interface Stroke {
  id: string
  kind: StrokeKind
  /** pontos em mm (plano da mesa, origem = ponto zero) */
  points: Vec2[]
  /** fechado (círculo, retângulo, laço) */
  closed: boolean
  /** cabeçote T0..T3 */
  tool: number
  /** preencher o interior (só se closed) */
  fill: boolean
  /** cor de exibição */
  color?: string
  /**
   * R24.3 · nº de camadas DESTE traço (altura própria). Se ausente, usa
   * DrawVolume.layers. Permite uma forma fechada virar volume de 10 camadas
   * enquanto uma linha ao lado fica em 1 camada.
   */
  layers?: number
}

export interface DrawVolume {
  /** nº de camadas a repetir o desenho (1 = só uma camada) */
  layers: number
  /** alterna o desenho 90° a cada camada (woodpile) — só faz sentido para linhas */
  alternate90: boolean
  /** densidade do preenchimento das formas fechadas com fill=true (%) */
  fillDensity: number
  fillPattern: SliceParams["infillPattern"]
}

export const DEFAULT_DRAW_VOLUME: DrawVolume = { layers: 1, alternate90: false, fillDensity: 30, fillPattern: "rectilinear" }

export function newStrokeId(): string { return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}` }

// ─── Geração de formas paramétricas ───────────────────────────────────────
export function circlePoints(c: Vec2, r: number, segments = 64): Vec2[] {
  const out: Vec2[] = []
  for (let i = 0; i < segments; i++) { const t = (i / segments) * Math.PI * 2; out.push({ x: c.x + r * Math.cos(t), y: c.y + r * Math.sin(t) }) }
  return out
}
export function rectPoints(a: Vec2, b: Vec2): Vec2[] {
  return [{ x: a.x, y: a.y }, { x: b.x, y: a.y }, { x: b.x, y: b.y }, { x: a.x, y: b.y }]
}

/** Simplifica traço livre (Douglas–Peucker leve) e remove pontos repetidos. */
export function simplifyStroke(points: Vec2[], tol = 0.15): Vec2[] {
  if (points.length <= 2) return points
  const keep = new Array(points.length).fill(false)
  keep[0] = keep[points.length - 1] = true
  const stack: Array<[number, number]> = [[0, points.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()!
    let maxD = 0, idx = -1
    const A = points[a], B = points[b]
    const L = Math.hypot(B.x - A.x, B.y - A.y) || 1e-9
    for (let i = a + 1; i < b; i++) {
      const P = points[i]
      const d = Math.abs((B.x - A.x) * (A.y - P.y) - (A.x - P.x) * (B.y - A.y)) / L
      if (d > maxD) { maxD = d; idx = i }
    }
    if (maxD > tol && idx > 0) { keep[idx] = true; stack.push([a, idx], [idx, b]) }
  }
  const out = points.filter((_, i) => keep[i])
  return out.filter((p, i) => i === 0 || Math.hypot(p.x - out[i - 1].x, p.y - out[i - 1].y) > 1e-3)
}

/** Comprimento total de um traço (mm). */
export function strokeLength(s: Stroke): number {
  let L = 0
  for (let i = 1; i < s.points.length; i++) L += Math.hypot(s.points[i].x - s.points[i - 1].x, s.points[i].y - s.points[i - 1].y)
  if (s.closed && s.points.length > 2) { const a = s.points[s.points.length - 1], b = s.points[0]; L += Math.hypot(a.x - b.x, a.y - b.y) }
  return L
}

/** Caixa envolvente de todos os traços. */
export function strokesBBox(strokes: Stroke[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let b: { minX: number; minY: number; maxX: number; maxY: number } | null = null
  for (const s of strokes) for (const p of s.points) {
    if (!b) b = { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y }
    else { b.minX = Math.min(b.minX, p.x); b.minY = Math.min(b.minY, p.y); b.maxX = Math.max(b.maxX, p.x); b.maxY = Math.max(b.maxY, p.y) }
  }
  return b
}

// ─── Desenho → camadas ────────────────────────────────────────────────────
function ensureCCW(poly: Polygon): Polygon { return signedArea(poly) >= 0 ? poly : [...poly].reverse() }

/**
 * Converte traços em camadas prontas para o writer. Cada traço = 1 caminho
 * (ou N quando repetido por camada). Formas fechadas com `fill` ganham
 * infill honesto do BioSlicer dentro do contorno.
 */
/** Camadas efetivas de um traço: valor próprio (≥1) ou o global do desenho. */
export function strokeLayers(s: Stroke, vol: DrawVolume): number {
  const own = s.layers != null && Number.isFinite(s.layers) ? Math.round(s.layers) : 0
  return Math.max(1, own > 0 ? own : Math.round(vol.layers))
}

/** Altura total do desenho = o traço mais alto. */
export function drawingLayerCount(strokes: Stroke[], vol: DrawVolume): number {
  if (!strokes.length) return Math.max(1, Math.round(vol.layers))
  return Math.max(...strokes.map((s) => strokeLayers(s, vol)))
}

export function strokesToLayers(strokes: Stroke[], P: SliceParams, vol: DrawVolume): SlicedLayer[] {
  const layers: SlicedLayer[] = []
  const n = drawingLayerCount(strokes, vol)
  for (let i = 0; i < n; i++) {
    const h = i === 0 ? P.firstLayerHeight_mm : P.layerHeight_mm
    const z = P.firstLayerHeight_mm + i * P.layerHeight_mm
    const ang = vol.alternate90 && i % 2 === 1 ? Math.PI / 2 : 0
    const paths: ToolPath[] = []
    const contours: Polygon[] = []
    for (const s of strokes) {
      if (s.points.length < 2) continue
      // R24.3: cada traço só existe até a SUA altura
      if (i >= strokeLayers(s, vol)) continue
      const pts: Path = ang ? s.points.map((p) => rotate(p, ang, 0, 0)) : s.points
      const isClosed = s.closed && pts.length >= 3
      const speed = i === 0 ? P.speedFirstLayer_mms : P.speedPerimeter_mms
      paths.push({ role: isClosed ? "wall_outer" : "infill", points: pts, closed: isClosed, speed_mms: speed, lineWidth_mm: P.lineWidth_mm, tool: s.tool })
      if (isClosed) {
        const poly = ensureCCW(pts)
        contours.push(poly)
        if (s.fill) {
          const inf = generateInfill({
            region: [poly], pattern: vol.fillPattern, lineWidth_mm: P.lineWidth_mm, density_pct: vol.fillDensity,
            angle_deg: P.infillAngle_deg + i * P.infillAngleStep_deg, layerIndex: i, z_mm: z, strandSpacing_mm: P.strandSpacing_mm,
          })
          for (const ip of inf.paths) paths.push({ role: "infill", points: ip, closed: false, speed_mms: i === 0 ? P.speedFirstLayer_mms : P.speedInfill_mms, lineWidth_mm: P.lineWidth_mm, tool: s.tool })
        }
      }
    }
    layers.push({ index: i, z_mm: z, height_mm: h, contours, paths })
  }
  return layers
}

export interface DrawPrintJob {
  strokes: Stroke[]
  params: SliceParams
  extrusion: ExtrusionModel
  volume: DrawVolume
  write: Omit<WriteOptions, "meta"> & { meta?: WriteOptions["meta"] }
}

/** Desenho → G-code (mesmo writer do BioSlicer). */
export function drawToGCode(job: DrawPrintJob): { layers: SlicedLayer[]; result: WriteResult; warnings: string[] } {
  const warnings: string[] = []
  const strokes = job.strokes.filter((s) => s.points.length >= 2)
  if (strokes.length === 0) warnings.push("Nenhum traço com 2+ pontos.")
  const tiny = strokes.filter((s) => strokeLength(s) < job.params.lineWidth_mm * 2)
  if (tiny.length) warnings.push(`${tiny.length} traço(s) menores que 2× a largura da linha foram mantidos, mas podem virar só uma gota.`)
  const layers = strokesToLayers(strokes, job.params, job.volume)
  const result = writeGCode(layers, { ...job.params, skirtLoops: 0, purgeLine_mm: 0 }, job.extrusion, {
    ...job.write,
    meta: { ...(job.write.meta ?? {}), source: "draw-print", strokes: strokes.length, drawLayers: drawingLayerCount(strokes, job.volume), alternate90: job.volume.alternate90 },
  })
  return { layers, result, warnings }
}

/** Resumo legível (para o modal de confirmação / relatório). */
export function describeDrawing(strokes: Stroke[], vol: DrawVolume, layerHeight_mm: number): string {
  const byTool = new Map<number, number>()
  for (const s of strokes) byTool.set(s.tool, (byTool.get(s.tool) ?? 0) + 1)
  const tools = Array.from(byTool.entries()).sort((a, b) => a[0] - b[0]).map(([t, n]) => `T${t}: ${n}`).join(" · ")
  const L = strokes.reduce((acc, s) => acc + strokeLength(s), 0)
  const n = drawingLayerCount(strokes, vol)
  const mixed = strokes.some((s) => strokeLayers(s, vol) !== n)
  return `${strokes.length} traço(s) (${tools}) · ${L.toFixed(0)} mm por camada · ${n} camada(s)${mixed ? " (máx.; alturas por traço)" : ""} = ${(n * layerHeight_mm).toFixed(2)} mm de altura${vol.alternate90 ? " · alterna 90°" : ""}`
}
