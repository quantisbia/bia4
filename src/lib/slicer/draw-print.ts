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

/**
 * R24.5 · Faixa do "sanduíche": um bloco de N camadas com um preenchimento
 * e densidade próprios. As faixas são empilhadas em ordem (de baixo para cima)
 * e repetidas ciclicamente se o desenho for mais alto que a soma delas.
 *   ex.: [gyroid 30% ×2] [grid 40% ×1] [triangles 30% ×2] → 5 camadas, repete
 */
export interface LayerBand {
  /** nº de camadas desta faixa (≥1) */
  layers: number
  pattern: SliceParams["infillPattern"]
  /** densidade (%) do preenchimento nesta faixa */
  density: number
  /** rótulo opcional (ex.: "derme") */
  label?: string
}

export interface DrawVolume {
  /** nº de camadas a repetir o desenho (1 = só uma camada) */
  layers: number
  /** alterna o desenho 90° a cada camada (woodpile) — só faz sentido para linhas */
  alternate90: boolean
  /** densidade do preenchimento das formas fechadas com fill=true (%) */
  fillDensity: number
  fillPattern: SliceParams["infillPattern"]
  /**
   * R24.5 · plano de preenchimento por camada ("sanduíche"). Se presente e
   * não vazio, substitui fillPattern/fillDensity: a camada i usa a faixa que
   * a contém (ciclando). Se ausente, todas as camadas usam fillPattern/fillDensity.
   */
  bands?: LayerBand[]
}

export const DEFAULT_DRAW_VOLUME: DrawVolume = { layers: 1, alternate90: false, fillDensity: 30, fillPattern: "rectilinear" }

/** Preenchimento efetivo (padrão + densidade) da camada i segundo o plano de faixas. */
export function fillForLayer(vol: DrawVolume, i: number): { pattern: SliceParams["infillPattern"]; density: number; band: number | null } {
  const bands = (vol.bands ?? []).filter((b) => b.layers >= 1)
  if (!bands.length) return { pattern: vol.fillPattern, density: vol.fillDensity, band: null }
  const total = bands.reduce((a, b) => a + Math.round(b.layers), 0)
  let k = ((i % total) + total) % total
  for (let b = 0; b < bands.length; b++) {
    const n = Math.round(bands[b].layers)
    if (k < n) return { pattern: bands[b].pattern, density: bands[b].density, band: b }
    k -= n
  }
  const last = bands[bands.length - 1]
  return { pattern: last.pattern, density: last.density, band: bands.length - 1 }
}

/** Soma de camadas das faixas (0 se não há plano). */
export function bandsTotalLayers(vol: DrawVolume): number {
  return (vol.bands ?? []).reduce((a, b) => a + Math.max(0, Math.round(b.layers)), 0)
}

/** Presets de sanduíche prontos (pt-BR). */
export const BAND_PRESETS: Array<{ id: string; label: string; hint: string; bands: LayerBand[] }> = [
  { id: "skin3", label: "Pele 3 camadas", hint: "derme reticular gyroid 30 % · derme papilar grid 40 % · epiderme concêntrico 60 %", bands: [
    { layers: 2, pattern: "gyroid", density: 30, label: "derme reticular" }, { layers: 1, pattern: "grid", density: 40, label: "derme papilar" }, { layers: 1, pattern: "concentric", density: 60, label: "epiderme" } ] },
  { id: "osteochondral", label: "Osteocondral", hint: "osso triangular 50 % embaixo · zona de transição grid 40 % · cartilagem honeycomb 30 % em cima", bands: [
    { layers: 3, pattern: "triangles", density: 50, label: "osso" }, { layers: 1, pattern: "grid", density: 40, label: "transição" }, { layers: 3, pattern: "honeycomb", density: 30, label: "cartilagem" } ] },
  { id: "sandwich", label: "Sanduíche clássico", hint: "casca densa 60 % · miolo gyroid 20 % · casca densa 60 %", bands: [
    { layers: 1, pattern: "rectilinear", density: 60, label: "base" }, { layers: 3, pattern: "gyroid", density: 20, label: "miolo" }, { layers: 1, pattern: "rectilinear", density: 60, label: "topo" } ] },
  { id: "alt3", label: "Alternado (gyroid · grid · triangular)", hint: "uma camada de cada, repete", bands: [
    { layers: 1, pattern: "gyroid", density: 30 }, { layers: 1, pattern: "grid", density: 30 }, { layers: 1, pattern: "triangles", density: 30 } ] },
]

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
          const F = fillForLayer(vol, i)
          const inf = generateInfill({
            region: [poly], pattern: F.pattern, lineWidth_mm: P.lineWidth_mm, density_pct: F.density,
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
    meta: { ...(job.write.meta ?? {}), source: "draw-print", strokes: strokes.length, drawLayers: drawingLayerCount(strokes, job.volume), alternate90: job.volume.alternate90,
      bands: job.volume.bands?.length ? job.volume.bands.map((b) => `${b.layers}x${b.pattern}@${b.density}%`).join("|") : undefined },
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
  const bands = (vol.bands ?? []).filter((b) => b.layers >= 1)
  const sand = bands.length ? ` · sanduíche ${bands.map((b) => `${Math.round(b.layers)}×${b.pattern} ${b.density}%`).join(" / ")}` : ""
  return `${strokes.length} traço(s) (${tools}) · ${L.toFixed(0)} mm por camada · ${n} camada(s)${mixed ? " (máx.; alturas por traço)" : ""} = ${(n * layerHeight_mm).toFixed(2)} mm de altura${vol.alternate90 ? " · alterna 90°" : ""}${sand}`
}
