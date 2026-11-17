/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · Impressão Básica — motor (R35)
 *  ─────────────────────────────────────────────────────────────────────
 *  Porta do racional do módulo MIA Print 2 (MORPHÊ) para a BIA, em versão
 *  BÁSICA e sem dependências externas:
 *
 *   • 3 cabeçotes (T0..T2) — cada um com o mesmo modelo de extrusão da MIA:
 *       - filament   → E em mm de filamento (Ø configurável, M83 relativo)
 *       - volumetric → E em mm³ (seringa / M200 D0)
 *       - pneumatic  → válvula on/off (M106/M107 ou comando custom, sem eixo E)
 *   • Superfícies: mesa (redonda/quadrada), placa de Petri, lâmina de
 *     microscopia e placas multiwell (6/12/24/48/96) com offsets de poço.
 *   • Objetos simples: disco, quadrado, anel, malha (scaffold) e linhas.
 *   • Preenchimento básico: grade, linear, concêntrico ou nenhum.
 *   • G-code Marlin comentado (cabeçalho estilo MIA/DNA Studio).
 *
 *  Tudo roda no browser; o servidor só cobra créditos (/api/gcode/charge).
 * ═══════════════════════════════════════════════════════════════════════
 */

import { offsetPolySet, offsetPolygon, clipSegmentToPolySet, clipPathToPolySet, pointInPolySet, normalizeContours, simplify as rdpSimplify, signedArea } from "@/lib/slicer/polygon-ops"

/* ───────────────────────── utilidades ───────────────────────── */
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
export const fmtDot = (v: number, d = 3) => (+v).toFixed(d).replace(/\.?0+$/, (m) => (m.startsWith(".") ? "" : m)) || "0"
const F3 = (v: number) => fmtDot(v, 3)
export const uid = () => Math.random().toString(36).slice(2, 9)

export type Pt = { x: number; y: number }

/* ───────────────────────── cabeçotes (copiado da MIA) ───────────────────────── */
export const HEAD_COLORS = ["#0A58CA", "#E0457B", "#2E9E5B"] as const
export const MAX_HEADS = 3

/** gauge → diâmetro interno (mm) — idêntico à MIA */
export const GAUGES: Record<number, number> = {
  14: 1.6, 16: 1.19, 18: 0.84, 20: 0.6, 21: 0.51, 22: 0.41, 23: 0.34, 25: 0.25, 27: 0.21, 30: 0.16,
}

export type ExtrusionMode = "filament" | "volumetric" | "pneumatic"

export interface HeadType { id: string; label: string; ext: ExtrusionMode; hint: string }
export const HEAD_TYPES: HeadType[] = [
  { id: "pneumatic3", label: "Pneumático 3 mL", ext: "pneumatic", hint: "Seringa 3 mL acionada por ar comprimido (válvula on/off)." },
  { id: "pneumatic10", label: "Pneumático 10 mL", ext: "pneumatic", hint: "Seringa 10 mL acionada por ar comprimido (válvula on/off)." },
  { id: "syringe", label: "Bomba de seringa (mecânico · volumétrico)", ext: "volumetric", hint: "Êmbolo movido por motor de passo — E em mm³ (M200 D0)." },
  { id: "thermo", label: "Termoplástico (filamento 1,75 mm)", ext: "filament", hint: "Extrusora de filamento (PCL/PLA) — E em mm de filamento." },
  { id: "droplet", label: "Gotejamento (droplet)", ext: "pneumatic", hint: "Deposição por gotas — válvula pulsada." },
]

export interface Head {
  id: number                 // 1..3
  enabled: boolean
  type: string               // HEAD_TYPES.id
  gauge: number
  lineWidth: number          // mm (largura do filete = Ø interno da agulha)
  pressure: number           // kPa (pneumático)
  speed: number              // mm/s
  temp: number               // °C (0 = off)
  flowDelay: number          // s (pneumático)
  extrusionMode: ExtrusionMode
  filamentD: number          // mm (filament)
  flow: number               // %
  retract: number            // mm (filament) ou mm³ (volumetric)
  zHop: number               // mm
  onCmd: string              // pneumático
  offCmd: string
  pressureCmd: string        // ex.: "M42 P{head} S{kPa}"
  offsetX: number
  offsetY: number
  color: string
  label: string              // nome livre (ex.: "GelMA 7%")
}

export function defaultHead(i: number): Head {
  return {
    id: i + 1, enabled: i === 0, type: "pneumatic3", gauge: 22, lineWidth: GAUGES[22], pressure: 24, speed: 20, temp: 0, flowDelay: 0,
    extrusionMode: "pneumatic", filamentD: 1.75, flow: 100, retract: 1.0, zHop: 0.3, onCmd: "M106 S255", offCmd: "M107", pressureCmd: "",
    offsetX: 0, offsetY: 0, color: HEAD_COLORS[i] ?? "#888", label: `Cabeçote ${i + 1}`,
  }
}

/* ───────────────────────── superfícies ───────────────────────── */
export type SurfaceKind = "bed" | "petri" | "slide" | "multiwell"

export interface BedOption { id: string; label: string; w: number; h: number }
export const BED_ROUND: BedOption[] = [100, 150, 200, 220, 250, 300].map((d) => ({ id: String(d), label: `Ø ${d} mm`, w: d, h: d }))
export const BED_SQUARE: BedOption[] = [
  { id: "120", label: "120 × 120 mm", w: 120, h: 120 },
  { id: "150", label: "150 × 150 mm", w: 150, h: 150 },
  { id: "200", label: "200 × 200 mm", w: 200, h: 200 },
  { id: "220", label: "220 × 220 mm (Ender 3)", w: 220, h: 220 },
  { id: "235", label: "235 × 235 mm", w: 235, h: 235 },
  { id: "250", label: "250 × 250 mm", w: 250, h: 250 },
  { id: "300", label: "300 × 300 mm", w: 300, h: 300 },
]

/** Placas de Petri — diâmetro externo e diâmetro útil (interno) */
export const PETRI: { id: string; label: string; outer: number; inner: number }[] = [
  { id: "35", label: "Ø 35 mm", outer: 35, inner: 33 },
  { id: "60", label: "Ø 60 mm", outer: 60, inner: 52 },
  { id: "90", label: "Ø 90 mm", outer: 90, inner: 86 },
  { id: "100", label: "Ø 100 mm", outer: 100, inner: 88 },
]

/** Lâminas de microscopia */
export const SLIDES: { id: string; label: string; w: number; h: number }[] = [
  { id: "25x75", label: "25 × 75 mm (padrão)", w: 75, h: 25 },
  { id: "50x75", label: "50 × 75 mm (dupla)", w: 75, h: 50 },
  { id: "22x22", label: "Lamínula 22 × 22 mm", w: 22, h: 22 },
]

/** Placas multiwell — padrão ANSI/SLAS 127,76 × 85,48 mm (A1 no canto superior esquerdo) */
export interface MultiwellSpec { id: number; cols: number; rows: number; pitch: number; a1x: number; a1y: number; wellD: number }
export const MULTIWELL: MultiwellSpec[] = [
  { id: 6, cols: 3, rows: 2, pitch: 39.12, a1x: 24.76, a1y: 23.16, wellD: 34.8 },
  { id: 12, cols: 4, rows: 3, pitch: 26.01, a1x: 24.94, a1y: 16.79, wellD: 22.1 },
  { id: 24, cols: 6, rows: 4, pitch: 19.3, a1x: 15.13, a1y: 13.49, wellD: 15.6 },
  { id: 48, cols: 8, rows: 6, pitch: 13.08, a1x: 18.16, a1y: 10.08, wellD: 11.05 },
  { id: 96, cols: 12, rows: 8, pitch: 9.0, a1x: 14.38, a1y: 11.24, wellD: 6.4 },
]
export const PLATE_W = 127.76
export const PLATE_H = 85.48

export interface Surface {
  kind: SurfaceKind
  bedShape: "round" | "square"
  bedSize: string            // id em BED_ROUND/BED_SQUARE ou "custom"
  customW: number
  customH: number
  petri: string              // PETRI.id
  slide: string              // SLIDES.id
  wells: number              // MULTIWELL.id
  selectedWells: string[]    // [] = todos
  margin: number             // mm (borda não imprimível)
}

export interface Bed { x: number; y: number; z: number; cx: number; cy: number; zOffset: number }

export interface SurfaceExtent {
  w: number; h: number; round: boolean
  /** área imprimível (por poço quando multiwell), já descontada a margem */
  usableW: number; usableH: number; usableRound: boolean
  label: string
}

export function bedDims(s: Surface): { w: number; h: number } {
  if (s.bedSize === "custom") return { w: s.customW || 220, h: s.bedShape === "round" ? s.customW || 220 : s.customH || 220 }
  const list = s.bedShape === "round" ? BED_ROUND : BED_SQUARE
  const o = list.find((b) => b.id === s.bedSize) ?? list[3] ?? list[0]
  return { w: o.w, h: o.h }
}

export function surfaceExtent(s: Surface): SurfaceExtent {
  const m = Math.max(0, s.margin || 0)
  switch (s.kind) {
    case "petri": {
      const p = PETRI.find((x) => x.id === s.petri) ?? PETRI[1]
      return { w: p.outer, h: p.outer, round: true, usableW: p.inner - 2 * m, usableH: p.inner - 2 * m, usableRound: true, label: `Placa de Petri ${p.label}` }
    }
    case "slide": {
      const l = SLIDES.find((x) => x.id === s.slide) ?? SLIDES[0]
      return { w: l.w, h: l.h, round: false, usableW: l.w - 2 * m, usableH: l.h - 2 * m, usableRound: false, label: `Lâmina ${l.label}` }
    }
    case "multiwell": {
      const sp = MULTIWELL.find((x) => x.id === s.wells) ?? MULTIWELL[2]
      return { w: PLATE_W, h: PLATE_H, round: false, usableW: sp.wellD - 2 * m, usableH: sp.wellD - 2 * m, usableRound: true, label: `Placa ${sp.id} poços (Ø poço ${sp.wellD} mm)` }
    }
    default: {
      const d = bedDims(s)
      const round = s.bedShape === "round"
      return { w: d.w, h: d.h, round, usableW: d.w - 2 * m, usableH: d.h - 2 * m, usableRound: round, label: `Mesa ${round ? "redonda" : "quadrada"} ${round ? `Ø ${d.w}` : `${d.w} × ${d.h}`} mm` }
    }
  }
}

export function wellName(sp: MultiwellSpec, r: number, c: number) { return String.fromCharCode(65 + r) + (c + 1) }

/** Todos os poços da placa (coordenadas relativas ao centro da placa; Y para cima) */
export function allWells(sp: MultiwellSpec): { name: string; x: number; y: number }[] {
  const out: { name: string; x: number; y: number }[] = []
  for (let r = 0; r < sp.rows; r++) for (let c = 0; c < sp.cols; c++) {
    const x = sp.a1x + c * sp.pitch - PLATE_W / 2
    const y = PLATE_H / 2 - (sp.a1y + r * sp.pitch)   // A1 no topo (Y+)
    out.push({ name: wellName(sp, r, c), x: +x.toFixed(3), y: +y.toFixed(3) })
  }
  return out
}

/** Offsets onde o objeto será replicado (centro da superfície = 0,0) */
export function wellOffsets(s: Surface): { name: string; x: number; y: number }[] {
  if (s.kind !== "multiwell") return [{ name: "", x: 0, y: 0 }]
  const sp = MULTIWELL.find((x) => x.id === s.wells) ?? MULTIWELL[2]
  const all = allWells(sp)
  if (!s.selectedWells.length) return all
  const set = new Set(s.selectedWells.map((w) => w.toUpperCase()))
  const sel = all.filter((w) => set.has(w.name))
  return sel.length ? sel : all
}

/* ───────────────────────── objetos (formas simples) ───────────────────────── */
export type ShapeType = "disc" | "square" | "ring" | "lattice" | "lines" | "polygon" | "path"

export interface Shape {
  id: string
  type: ShapeType
  name: string
  head: number        // 1..3
  x: number; y: number
  size: number        // Ø (disc/ring) · lado (square/lattice) · comprimento (lines)
  size2: number       // Ø interno (ring) · pitch dos filetes (lattice) · espaçamento (lines)
  count: number       // nº de linhas (lines)
  height: number      // mm (altura total do objeto)
  solid: boolean      // disc/square/polygon: preencher (true) ou só perímetros (false)
  pts?: Pt[]          // polygon (fechado) / path (aberto) — coordenadas relativas ao centro da superfície
}

export function defaultShape(type: ShapeType, head = 1): Shape {
  const base: Shape = { id: uid(), type, name: "", head, x: 0, y: 0, size: 10, size2: 1, count: 5, height: 2, solid: true }
  switch (type) {
    case "disc": return { ...base, name: "Disco", size: 10, height: 2 }
    case "square": return { ...base, name: "Quadrado", size: 10, height: 2 }
    case "ring": return { ...base, name: "Anel", size: 10, size2: 6, height: 2, solid: false }
    case "lattice": return { ...base, name: "Malha (scaffold)", size: 10, size2: 1.0, height: 2, solid: false }
    case "lines": return { ...base, name: "Linhas", size: 20, size2: 2, count: 5, height: 0, solid: false }
    case "polygon": return { ...base, name: "Desenho", size: 0, height: 2, solid: true, pts: [] }
    case "path": return { ...base, name: "Traço", size: 0, height: 0, solid: false, pts: [] }
  }
}

/** Cria um objeto a partir de um traço desenhado (mm, relativo ao centro). Fechado → sólido; aberto → traço. */
export function shapeFromStroke(raw: Pt[], closed: boolean, head = 1, height = 2): Shape | null {
  let pts = raw.filter((p, i) => i === 0 || Math.hypot(p.x - raw[i - 1].x, p.y - raw[i - 1].y) > 0.05)
  if (pts.length < 2) return null
  pts = rdpSimplify(pts, 0.12, closed)
  pts = chaikin(pts, closed)
  if (closed) {
    if (pts.length < 3 || Math.abs(signedArea(pts)) < 0.5) return null
    if (signedArea(pts) < 0) pts = pts.slice().reverse()
    const b = bbox(pts)
    return { ...defaultShape("polygon", head), pts, x: 0, y: 0, size: Math.max(b.w, b.h), height }
  }
  const b = bbox(pts)
  return { ...defaultShape("path", head), pts, x: 0, y: 0, size: Math.max(b.w, b.h), height: 0 }
}

/** suavização Chaikin (1 passo) mantendo extremos — copiado da MIA */
export function chaikin(pts: Pt[], closed: boolean): Pt[] {
  if (pts.length < 3) return pts.slice()
  const out: Pt[] = []; const n = pts.length; const lim = closed ? n : n - 1
  if (!closed) out.push(pts[0])
  for (let i = 0; i < lim; i++) {
    const p = pts[i], q = pts[(i + 1) % n]
    out.push({ x: 0.75 * p.x + 0.25 * q.x, y: 0.75 * p.y + 0.25 * q.y })
    out.push({ x: 0.25 * p.x + 0.75 * q.x, y: 0.25 * p.y + 0.75 * q.y })
  }
  if (!closed) out.push(pts[n - 1])
  return out
}

/** pontos absolutos (com deslocamento x,y do objeto) */
export function shapePts(s: Shape): Pt[] { return (s.pts ?? []).map((p) => ({ x: p.x + s.x, y: p.y + s.y })) }

export function describeShape(s: Shape): string {
  switch (s.type) {
    case "disc": return `Disco Ø ${fmtDot(s.size, 2)} × ${fmtDot(s.height, 2)} mm`
    case "square": return `Quadrado ${fmtDot(s.size, 2)} × ${fmtDot(s.size, 2)} × ${fmtDot(s.height, 2)} mm`
    case "ring": return `Anel Ø ${fmtDot(s.size, 2)} / Ø ${fmtDot(s.size2, 2)} × ${fmtDot(s.height, 2)} mm`
    case "lattice": return `Malha ${fmtDot(s.size, 1)} mm · passo ${fmtDot(s.size2, 2)} mm × ${fmtDot(s.height, 2)} mm`
    case "lines": return `${s.count} linha(s) de ${fmtDot(s.size, 1)} mm · espaçamento ${fmtDot(s.size2, 2)} mm`
    case "polygon": { const b = bbox(s.pts ?? []); return `Desenho ${fmtDot(b.w, 1)} × ${fmtDot(b.h, 1)} × ${fmtDot(s.height, 2)} mm (${(s.pts ?? []).length} v)` }
    case "path": { const b = bbox(s.pts ?? []); return `Traço ${fmtDot(polyLength(s.pts ?? []), 1)} mm (${fmtDot(b.w, 1)} × ${fmtDot(b.h, 1)})` }
  }
}

/* ───────────────────────── configurações ───────────────────────── */
export type InfillPattern = "grid" | "honeycomb" | "meandering" | "linear" | "concentric" | "spiral" | "none"
export const INFILL: { id: InfillPattern; label: string; hint: string }[] = [
  { id: "grid", label: "Grade", hint: "Duas famílias de linhas a 90° — poros quadrados, o padrão clássico de scaffold." },
  { id: "honeycomb", label: "Favo de mel", hint: "Hexágonos — alta resistência com pouco material." },
  { id: "meandering", label: "Meandro (serpentina)", hint: "Linhas paralelas ligadas em zigue-zague — poucos saltos, bom para hidrogéis." },
  { id: "linear", label: "Linear", hint: "Linhas paralelas numa direção (alterne 90° por camada para formar poros)." },
  { id: "concentric", label: "Concêntrico", hint: "Anéis que seguem o contorno — ótimo para discos e anéis." },
  { id: "spiral", label: "Espiral", hint: "Trajetória contínua do contorno ao centro — sem interrupção de fluxo." },
  { id: "none", label: "Sem preenchimento", hint: "Só perímetros (casca)." },
]

export interface LayerSettings {
  layerHeight: number; firstLayerPct: number
  infillPattern: InfillPattern; infillDensity: number; infillAngle: number; alternate: boolean
  perimeters: number
}

export interface PrinterSettings {
  firmware: "marlin"
  /** needle = origem (0,0,0) no ponto onde a usuária clicou "Zerar" com a agulha sobre a superfície (sem G28);
   *  bed = coordenadas absolutas da mesa (G28 + offset do centro), racional MIA. */
  origin: "needle" | "bed"
  travelSpeed: number; homeFirst: boolean
  bedTempControl: boolean; bedTemp: number
  photocrosslinking: boolean; uvNm: number; uvSeconds: number; uvEvery: "end" | "layer"; uvOnCmd: string; uvOffCmd: string
  chamberLights: boolean
}

export interface BasicState {
  protocolName: string
  surface: Surface
  bed: Bed
  shapes: Shape[]
  layerSettings: LayerSettings
  heads: Head[]
  printer: PrinterSettings
}

export function defaultState(): BasicState {
  const h0 = defaultHead(0)
  const heads = [h0, defaultHead(1), defaultHead(2)]
  return {
    protocolName: "Protocolo básico",
    surface: { kind: "petri", bedShape: "square", bedSize: "220", customW: 220, customH: 220, petri: "60", slide: "25x75", wells: 24, selectedWells: [], margin: 2 },
    bed: { x: 220, y: 220, z: 250, cx: 110, cy: 110, zOffset: 0 },
    shapes: [{ ...defaultShape("disc", 1), id: "s1" }],
    layerSettings: { layerHeight: GAUGES[22], firstLayerPct: 80, infillPattern: "grid", infillDensity: 25, infillAngle: 45, alternate: true, perimeters: 1 },
    heads,
    printer: { firmware: "marlin", origin: "needle", travelSpeed: 50, homeFirst: false, bedTempControl: false, bedTemp: 20, photocrosslinking: false, uvNm: 365, uvSeconds: 10, uvEvery: "end", uvOnCmd: "M42 P4 S255", uvOffCmd: "M42 P4 S0", chamberLights: false },
  }
}

export function lineWidthOf(h: Head) { return h.lineWidth || GAUGES[h.gauge] || 0.41 }
export function firstLayerH(ls: LayerSettings) { return ls.layerHeight * ls.firstLayerPct / 100 }

/* ───────────────────────── geometria básica ───────────────────────── */
export function circlePts(cx: number, cy: number, r: number, n?: number): Pt[] {
  const N = n ?? clamp(Math.ceil((2 * Math.PI * r) / 0.2), 24, 360)
  const pts: Pt[] = []
  for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2; pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }) }
  return pts
}
export function rectPts(cx: number, cy: number, w: number, h: number): Pt[] {
  const hw = w / 2, hh = h / 2
  return [{ x: cx - hw, y: cy - hh }, { x: cx + hw, y: cy - hh }, { x: cx + hw, y: cy + hh }, { x: cx - hw, y: cy + hh }]
}
export function polyLength(pts: Pt[], closed = false) {
  let l = 0
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  if (closed && pts.length > 1) l += Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y)
  return l
}
export function bbox(pts: Pt[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y) }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, h: 0, cx: 0, cy: 0 }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 }
}

/* ───────────────────────── preenchimentos (6 padrões, racional MIA) ───────────────────────── */
export type Region = Pt[][]   // conjunto de polígonos (outer CCW + furos CW), já normalizados

/**
 * Encolhe a região em `d` mm (polygon-ops usa delta>0 = para dentro; a MIA usa o sinal oposto).
 * Robustez para anéis finos: quando um furo (CW), ao crescer, alcança/ultrapassa o contorno externo
 * (CCW) que o contém, o par é descartado — sem isso o offset oscila e gera anéis infinitos.
 */
export function inset(regions: Region, d: number): Region {
  if (!regions.length) return []
  const outs: Pt[][] = [], holes: Pt[][] = []
  for (const poly of regions) {
    const o = offsetPolygon(poly, d)
    if (o.length < 3) continue
    if (signedArea(poly) > 0) { if (signedArea(o) > 0) outs.push(o) }
    else if (signedArea(o) < 0) holes.push(o)
  }
  const keepOut = outs.map(() => true)
  const keptHoles: Pt[][] = []
  for (const h of holes) {
    const c = h[0]
    let parent = -1
    for (let i = 0; i < outs.length; i++) if (keepOut[i] && pointInPolySet(c, [outs[i]])) { parent = i; break }
    if (parent < 0) continue // furo fora de qualquer externo → some
    const ao = Math.abs(signedArea(outs[parent])), ah = Math.abs(signedArea(h))
    // furo ocupa quase tudo, ou algum vértice do furo saiu do externo → região consumida
    const escaped = h.some((q) => !pointInPolySet(q, [outs[parent]]))
    if (ah >= ao * 0.98 || escaped) { keepOut[parent] = false; continue }
    keptHoles.push(h)
  }
  const kept = outs.filter((_, i) => keepOut[i])
  return kept.concat(keptHoles.filter((h) => kept.some((o) => pointInPolySet(h[0], [o]))))
}

function regionBBox(regions: Region) { return bbox(regions.flat()) }

/** linhas paralelas infinitas em um ângulo, recortadas pela região (com furos) */
export function infillLinear(regions: Region, spacing: number, angleDeg: number, serpentine = false): Pt[][] {
  if (spacing <= 0.01 || !regions.length) return []
  const b = regionBBox(regions)
  const rad = (angleDeg * Math.PI) / 180, dx = Math.cos(rad), dy = Math.sin(rad), nx = -dy, ny = dx
  const R = Math.hypot(b.w, b.h) / 2 + spacing
  const n = Math.ceil(R / spacing)
  const out: Pt[][] = []
  let cur: Pt[] | null = null; let dir = 1
  for (let i = -n; i <= n; i++) {
    const off = i * spacing
    const px = b.cx + nx * off, py = b.cy + ny * off
    const segs = clipSegmentToPolySet({ x: px - dx * R, y: py - dy * R }, { x: px + dx * R, y: py + dy * R }, regions)
    if (!serpentine) { for (const s of segs) out.push([s[0], s[1]]); continue }
    // serpentina (meandering): só liga quando há um único segmento na faixa e a ponte está dentro da região
    if (segs.length !== 1) { if (cur) { out.push(cur); cur = null } for (const s of segs) out.push([s[0], s[1]]); continue }
    let seg: Pt[] = [segs[0][0], segs[0][1]]; if (dir < 0) seg = [seg[1], seg[0]]
    if (cur) {
      const a = cur[cur.length - 1], c = seg[0]
      const mid = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 }
      if (pointInPolySet(mid, regions) && Math.hypot(a.x - c.x, a.y - c.y) < spacing * 3) cur.push(seg[0], seg[1])
      else { out.push(cur); cur = [seg[0], seg[1]] }
    } else cur = [seg[0], seg[1]]
    dir = -dir
  }
  if (cur) out.push(cur)
  return out
}

/** favo de mel — zigue-zagues + verticais curtas (geometria copiada da MIA) */
export function infillHoneycomb(regions: Region, lineWidth: number, density: number, angleDeg: number): Pt[][] {
  const b = regionBBox(regions)
  const a = clamp((1.1547 * lineWidth) / Math.max(0.02, density), lineWidth * 1.2, 50)
  const h = (a * Math.sqrt(3)) / 2
  const R = Math.hypot(b.w, b.h) / 2 + 3 * a
  const lines: Pt[][] = []
  const rows = Math.ceil(R / h) + 1, cols = Math.ceil(R / (1.5 * a)) + 1
  for (let r = -rows; r <= rows; r++) {
    const y0 = r * h; const up = r % 2 === 0 ? 1 : -1
    const zz: Pt[] = []
    for (let c = -cols; c <= cols; c++) {
      const x = c * 3 * a
      zz.push({ x: x - a, y: y0 - (up * h) / 2 }, { x: x - a / 2, y: y0 + (up * h) / 2 }, { x: x + a / 2, y: y0 + (up * h) / 2 }, { x: x + a, y: y0 - (up * h) / 2 })
    }
    lines.push(zz)
    for (let c = -cols; c <= cols; c++) { const x = c * 3 * a; lines.push([{ x: x - a, y: y0 - (up * h) / 2 }, { x: x - a, y: y0 - (up * h) / 2 - up * h }]) }
  }
  const rad = (angleDeg * Math.PI) / 180, cs = Math.cos(rad), sn = Math.sin(rad)
  const placed = lines.map((l) => l.map((p) => ({ x: p.x * cs - p.y * sn + b.cx, y: p.x * sn + p.y * cs + b.cy })))
  const out: Pt[][] = []
  for (const l of placed) for (const c of clipPathToPolySet(l, regions)) if (c.length > 1) out.push(c)
  return out
}

/** anéis concêntricos por offset até esgotar a região */
export function infillConcentric(regions: Region, spacing: number): Pt[][] {
  const out: Pt[][] = []
  let cur = regions; let guard = 0
  while (cur.length && guard++ < 400) {
    for (const p of cur) if (p.length >= 3) out.push(p.concat([p[0]]))
    cur = inset(cur, spacing)
  }
  return out
}

/** espiral contínua (anéis reamostrados e interpolados) — regiões simples; senão cai para concêntrico */
export function infillSpiral(regions: Region, spacing: number): Pt[][] {
  const rings: Region[] = []
  let cur = regions; let guard = 0
  while (cur.length && guard++ < 400) { rings.push(cur); cur = inset(cur, spacing) }
  if (!rings.length) return []
  if (!rings.every((r) => r.length === 1)) return infillConcentric(regions, spacing)
  const N = 96
  const resample = (poly: Pt[]) => {
    const closed = poly.concat([poly[0]]); const L = polyLength(closed)
    const pts: Pt[] = []; let acc = 0, i = 0
    const seg = (k: number) => Math.hypot(closed[k + 1].x - closed[k].x, closed[k + 1].y - closed[k].y)
    for (let k = 0; k < N; k++) {
      const target = (L * k) / N
      while (i < closed.length - 2 && acc + seg(i) < target) { acc += seg(i); i++ }
      const segL = seg(i) || 1; const t = clamp((target - acc) / segL, 0, 1)
      pts.push({ x: closed[i].x + (closed[i + 1].x - closed[i].x) * t, y: closed[i].y + (closed[i + 1].y - closed[i].y) * t })
    }
    return pts
  }
  const rs = rings.map((r) => resample(r[0]))
  for (let i = 1; i < rs.length; i++) {
    const ref = rs[i - 1][0]; let best = 0, bd = Infinity
    rs[i].forEach((p, k) => { const d = Math.hypot(p.x - ref.x, p.y - ref.y); if (d < bd) { bd = d; best = k } })
    rs[i] = rs[i].slice(best).concat(rs[i].slice(0, best))
    if (signedArea(rs[i]) * signedArea(rs[i - 1]) < 0) rs[i] = [rs[i][0]].concat(rs[i].slice(1).reverse())
  }
  const path: Pt[] = []
  for (let i = 0; i < rs.length; i++) {
    const A = rs[i], B = rs[i + 1]
    for (let k = 0; k < N; k++) { const t = k / N; path.push(B ? { x: A[k].x + (B[k].x - A[k].x) * t, y: A[k].y + (B[k].y - A[k].y) * t } : A[k]) }
  }
  if (path.length) path.push(rs[rs.length - 1][0])
  return path.length ? [path] : []
}

export function generateInfill(pattern: InfillPattern, regions: Region, lineWidth: number, density: number, angleDeg: number): Pt[][] {
  if (!regions.length || density <= 0 || pattern === "none") return []
  const d = clamp(density, 0.01, 1)
  switch (pattern) {
    case "linear": return infillLinear(regions, lineWidth / d, angleDeg)
    case "grid": return infillLinear(regions, (2 * lineWidth) / d, angleDeg).concat(infillLinear(regions, (2 * lineWidth) / d, angleDeg + 90))
    case "meandering": return infillLinear(regions, lineWidth / d, angleDeg, true)
    case "honeycomb": return infillHoneycomb(regions, lineWidth, d, angleDeg)
    case "concentric": return infillConcentric(inset(regions, lineWidth / d), lineWidth / d)
    case "spiral": return infillSpiral(inset(regions, lineWidth / d), lineWidth / d)
  }
  return []
}

/* ───────────────────────── trajetórias ───────────────────────── */
export interface Path { head: number; kind: "external perimeter" | "perimeter" | "infill" | "line"; pts: Pt[]; closed: boolean }
export interface ToolLayer { z: number; h: number; paths: Path[] }

/** Região 2D (polígonos) de uma forma fechada — outer CCW, furos CW */
export function shapeRegion(s: Shape): Region {
  switch (s.type) {
    case "disc": return normalizeContours([circlePts(s.x, s.y, s.size / 2)])
    case "square": return normalizeContours([rectPts(s.x, s.y, s.size, s.size)])
    case "ring": return s.size2 < s.size ? normalizeContours([circlePts(s.x, s.y, s.size / 2), circlePts(s.x, s.y, s.size2 / 2)]) : []
    case "polygon": { const p = shapePts(s); return p.length >= 3 ? normalizeContours([p]) : [] }
    default: return []
  }
}

/** perímetros + preenchimento de uma região (racional MIA Slicer.pathsFor) */
function regionPaths(head: number, regions: Region, lw: number, layerIndex: number, ls: LayerSettings, solid: boolean): Path[] {
  const paths: Path[] = []
  const per = solid ? Math.max(0, ls.perimeters) : Math.max(1, ls.perimeters)
  let inner = regions
  for (let i = 0; i < per; i++) {
    const ring = inset(regions, (lw / 2 + i * lw))
    for (const p of ring) paths.push({ head, kind: i === 0 ? "external perimeter" : "perimeter", pts: p, closed: true })
    inner = ring
  }
  inner = per === 0 ? inset(regions, lw / 2) : inset(inner, lw / 2)
  if (solid && ls.infillPattern !== "none" && inner.length) {
    let ang = ls.infillAngle || 0
    if (ls.alternate && layerIndex % 2 === 1) ang += 90
    for (const l of generateInfill(ls.infillPattern, inner, lw, clamp(ls.infillDensity, 0, 100) / 100, ang)) if (l.length > 1) paths.push({ head, kind: "infill", pts: l, closed: false })
  }
  return paths
}

/** Trajetórias de UMA forma numa camada (coordenadas relativas ao centro da superfície) */
export function shapePaths(s: Shape, layerIndex: number, ls: LayerSettings, heads: Head[]): Path[] {
  const hd = heads[s.head - 1] ?? heads[0]
  const lw = lineWidthOf(hd)
  const head = hd.id
  const paths: Path[] = []
  switch (s.type) {
    case "disc": case "square": case "ring": case "polygon":
      return regionPaths(head, shapeRegion(s), lw, layerIndex, ls, s.solid)
    case "path": {
      const p = shapePts(s); if (p.length > 1) paths.push({ head, kind: "line", pts: p, closed: false })
      break
    }
    case "lattice": {
      // scaffold clássico: filetes paralelos alternando 0°/90° por camada
      const pitch = Math.max(lw, s.size2)
      const half = s.size / 2
      const n = Math.floor(s.size / pitch)
      const start = -((n - 1) * pitch) / 2
      const vertical = layerIndex % 2 === 1
      let flip = false
      for (let i = 0; i < n; i++) {
        const o = start + i * pitch
        const a: Pt = vertical ? { x: s.x + o, y: s.y - half } : { x: s.x - half, y: s.y + o }
        const b: Pt = vertical ? { x: s.x + o, y: s.y + half } : { x: s.x + half, y: s.y + o }
        paths.push({ head, kind: "line", pts: flip ? [b, a] : [a, b], closed: false })
        flip = !flip
      }
      break
    }
    case "lines": {
      const n = Math.max(1, s.count | 0)
      const start = -((n - 1) * s.size2) / 2
      let flip = false
      for (let i = 0; i < n; i++) {
        const y = s.y + start + i * s.size2
        const a = { x: s.x - s.size / 2, y }, b = { x: s.x + s.size / 2, y }
        paths.push({ head, kind: "line", pts: flip ? [b, a] : [a, b], closed: false })
        flip = !flip
      }
      break
    }
  }
  return paths
}

/** ordena trajetórias pelo vizinho mais próximo (copiado da MIA) */
export function orderPaths(paths: Path[], from: Pt): Path[] {
  const rest = paths.slice(); const out: Path[] = []; let cur = from
  while (rest.length) {
    let bi = 0, bd = Infinity, rev = false
    for (let i = 0; i < rest.length; i++) {
      const p = rest[i]; const a = p.pts[0], b = p.pts[p.pts.length - 1]
      const da = Math.hypot(a.x - cur.x, a.y - cur.y); if (da < bd) { bd = da; bi = i; rev = false }
      if (!p.closed && p.pts.length > 1) { const db = Math.hypot(b.x - cur.x, b.y - cur.y); if (db < bd) { bd = db; bi = i; rev = true } }
    }
    const p = rest.splice(bi, 1)[0]
    if (rev) p.pts = p.pts.slice().reverse()
    if (p.closed) {
      let k = 0, kd = Infinity; p.pts.forEach((q, i) => { const d = Math.hypot(q.x - cur.x, q.y - cur.y); if (d < kd) { kd = d; k = i } })
      p.pts = p.pts.slice(k).concat(p.pts.slice(0, k))
    }
    out.push(p); cur = p.closed ? p.pts[0] : p.pts[p.pts.length - 1]
  }
  return out
}

/** Altura total do trabalho (mm) */
export function jobHeight(state: BasicState) {
  return state.shapes.reduce((h, s) => Math.max(h, s.height), 0)
}

/** Número de camadas físicas */
export function layerCount(state: BasicState) {
  const ls = state.layerSettings
  const H = jobHeight(state)
  const f = firstLayerH(ls)
  if (H <= 0) return 1 // 'lines' sem altura = 1 camada
  return Math.max(1, Math.round((H - f) / ls.layerHeight) + 1)
}

/** Constrói todas as camadas (agrupando por cabeçote para reduzir trocas) */
export function buildToolpaths(state: BasicState): ToolLayer[] {
  const ls = state.layerSettings
  const f = firstLayerH(ls), lh = ls.layerHeight
  const n = layerCount(state)
  const layers: ToolLayer[] = []
  let cursor: Pt = { x: 0, y: 0 }
  for (let i = 0; i < n; i++) {
    const zTop = f + i * lh, h = i === 0 ? f : lh
    const zMid = zTop - h / 2
    let paths: Path[] = []
    for (const s of state.shapes) {
      if (!(state.heads[s.head - 1]?.enabled)) continue
      if (s.height > 0 && zMid > s.height) continue
      if (s.height <= 0 && i > 0) continue
      paths = paths.concat(shapePaths(s, i, ls, state.heads))
    }
    // agrupa por cabeçote (ordem crescente) e ordena dentro do grupo
    const heads = Array.from(new Set(paths.map((p) => p.head))).sort()
    let ordered: Path[] = []
    for (const hd of heads) { const grp = orderPaths(paths.filter((p) => p.head === hd), cursor); ordered = ordered.concat(grp); if (grp.length) { const lp = grp[grp.length - 1]; cursor = lp.closed ? lp.pts[0] : lp.pts[lp.pts.length - 1] } }
    layers.push({ z: zTop, h, paths: ordered })
  }
  return layers
}

/* ───────────────────────── validação ───────────────────────── */
export function validate(state: BasicState): { errors: string[]; warnings: string[] } {
  const errors: string[] = [], warnings: string[] = []
  const ext = surfaceExtent(state.surface)
  if (!state.shapes.length) errors.push("Adicione pelo menos um objeto.")
  for (const s of state.shapes) {
    const hd = state.heads[s.head - 1]
    if (!hd?.enabled) errors.push(`"${s.name || s.type}" usa o cabeçote ${s.head}, que está desativado.`)
    let fits: boolean
    if (s.type === "polygon" || s.type === "path") {
      const p = shapePts(s)
      if (p.length < 2) { errors.push(`"${s.name || s.type}": desenho vazio.`); continue }
      fits = ext.usableRound ? p.every((q) => Math.hypot(q.x, q.y) <= ext.usableW / 2 + 1e-6) : p.every((q) => Math.abs(q.x) <= ext.usableW / 2 + 1e-6 && Math.abs(q.y) <= ext.usableH / 2 + 1e-6)
    } else {
      const half = s.size / 2 + Math.max(Math.abs(s.x), Math.abs(s.y))
      const fitsW = s.size + 2 * Math.abs(s.x) <= ext.usableW + 1e-6
      const fitsH = (s.type === "lines" ? (s.count - 1) * s.size2 : s.size) + 2 * Math.abs(s.y) <= ext.usableH + 1e-6
      fits = ext.usableRound ? half <= ext.usableW / 2 + 1e-6 : fitsW && fitsH
    }
    if (!fits) errors.push(`"${s.name || s.type}" (${fmtDot(s.size, 1)} mm) não cabe na área útil (${fmtDot(ext.usableW, 1)} × ${fmtDot(ext.usableH, 1)} mm).`)
    if (s.type === "ring" && s.size2 >= s.size) errors.push(`"${s.name}": o Ø interno precisa ser menor que o externo.`)
    if (hd && s.type === "lattice" && s.size2 < lineWidthOf(hd)) warnings.push(`"${s.name}": passo menor que a largura do filete — os filetes vão se sobrepor.`)
  }
  const used = new Set(state.shapes.map((s) => s.head))
  for (const h of state.heads) {
    if (!h.enabled || !used.has(h.id)) continue
    if (h.extrusionMode === "pneumatic" && !h.onCmd) errors.push(`Cabeçote ${h.id}: informe o comando de ligar a válvula.`)
    if (h.extrusionMode === "filament" && !(h.filamentD > 0)) errors.push(`Cabeçote ${h.id}: Ø do filamento inválido.`)
    if (h.speed <= 0) errors.push(`Cabeçote ${h.id}: velocidade inválida.`)
    if (state.layerSettings.layerHeight > lineWidthOf(h) * 1.2) warnings.push(`Cabeçote ${h.id}: altura de camada (${fmtDot(state.layerSettings.layerHeight, 2)} mm) maior que a agulha (${fmtDot(lineWidthOf(h), 2)} mm) — risco de filete solto.`)
  }
  const n = layerCount(state)
  if (n > 400) warnings.push(`${n} camadas — impressão longa.`)
  return { errors, warnings }
}

/* ───────────────────────── G-code (porta do MIA slicer.gcode) ───────────────────────── */
export interface GcodeStats { layers: number; pathMM: number; travelMM: number; volumeMM3: number; seconds: number; moves: number; perHead: Record<number, { pathMM: number; volumeMM3: number; seconds: number }>; wells: number }

export function generateGcode(state: BasicState, toolpaths?: ToolLayer[]): { lines: string[]; gcode: string; stats: GcodeStats } {
  const TP = toolpaths ?? buildToolpaths(state)
  const P = state.printer, LS = state.layerSettings
  const g: string[] = []
  const push = (s: string) => g.push(s)
  const H = (h: number) => state.heads[h - 1]
  const extMode = (h: number) => H(h).extrusionMode
  const headsUsed = Array.from(new Set(TP.flatMap((l) => l.paths.map((p) => p.head)))).sort()
  const offsets = wellOffsets(state.surface)
  const stats: GcodeStats = { layers: TP.length, pathMM: 0, travelMM: 0, volumeMM3: 0, seconds: 0, moves: 0, perHead: {}, wells: offsets.length }
  headsUsed.forEach((h) => (stats.perHead[h] = { pathMM: 0, volumeMM3: 0, seconds: 0 }))
  const needle = (P.origin ?? "needle") === "needle"
  // ponto zero na agulha: origem = centro da superfície (ou centro do 1º poço selecionado); sem home
  const ref = needle && offsets.length ? offsets[0] : { x: 0, y: 0, name: "" }
  const wellOffs = needle ? offsets.map((w) => ({ ...w, x: w.x - ref.x, y: w.y - ref.y })) : offsets
  const bx = needle ? 0 : state.bed.cx, by = needle ? 0 : state.bed.cy, zOff = needle ? 0 : state.bed.zOffset || 0
  const homeFirst = needle ? false : P.homeFirst
  const travelF = Math.round((P.travelSpeed || 50) * 60)
  const ext = surfaceExtent(state.surface)

  const now = new Date()
  push("; This file was generated by BIA Print Basic (MIA Print 2 rationale)")
  push("; Software: BIA v4 — Biofabrication Intelligent Assistant · Quantis")
  push("; Date: " + now.toISOString())
  push("; Protocol: " + state.protocolName)
  push("; Surface: " + ext.label + " · printable margin " + (+state.surface.margin || 0) + " mm" + (offsets.length > 1 ? " · wells: " + offsets.map((w) => w.name).join(",") : ""))
  push("; Objects: " + state.shapes.map((s) => describeShape(s) + " [T" + (s.head - 1) + "]").join(" | "))
  push("; Layer height: " + F3(LS.layerHeight) + " mm · First layer: " + LS.firstLayerPct + " % (" + F3(firstLayerH(LS)) + " mm) · Layers: " + TP.length)
  push("; Infill: " + LS.infillDensity + " % " + (INFILL.find((i) => i.id === LS.infillPattern)?.label ?? "") + " · Perimeters: " + LS.perimeters)
  for (const h of headsUsed) {
    const hd = H(h); const t = HEAD_TYPES.find((t) => t.id === hd.type)
    push("; Printhead " + h + " (T" + (h - 1) + ", " + hd.color + "): " + (t?.label ?? hd.type) + " · " + hd.gauge + " G (" + F3(lineWidthOf(hd)) + " mm) · mode " + hd.extrusionMode + (hd.extrusionMode === "pneumatic" ? " · " + hd.pressure + " kPa" : hd.extrusionMode === "filament" ? " · filament " + hd.filamentD + " mm" : " · E in mm3") + " · " + hd.speed + " mm/s · flow " + hd.flow + " % · temp " + (hd.temp > 0 ? hd.temp + " C" : "Off"))
  }
  push("; Printer: Marlin · printbed " + (P.bedTempControl ? P.bedTemp + " C" : "Off") + " · photocrosslinking " + (P.photocrosslinking ? P.uvNm + " nm / " + P.uvSeconds + " s (" + P.uvEvery + ")" : "Off"))
  push(needle
    ? "; Origin: NEEDLE ZERO — position the needle at the center of the " + (offsets.length > 1 ? "well " + offsets[0].name : "surface") + ", touching the substrate, and send G92 X0 Y0 Z0 before printing"
    : "; Origin: BED — absolute bed coordinates, offset X" + bx + " Y" + by + " Z" + zOff)
  push("; BIA_META " + JSON.stringify({ generator: "bia-print-basic-r36", origin: needle ? "needle" : "bed", surface: state.surface.kind, wells: offsets.length, heads: headsUsed.map((h) => ({ t: h - 1, mode: extMode(h) })) }))
  push("")
  push("G21 ; set units to millimeters")
  push("G90 ; use absolute coordinates")
  push("M204 S1000 ; set default acceleration")
  const anyFil = headsUsed.some((h) => extMode(h) === "filament"), anyVol = headsUsed.some((h) => extMode(h) === "volumetric")
  if (anyVol) push("M200 D0 ; volumetric extrusion (E in mm3)")
  if (anyFil || anyVol) { push("M83 ; relative extrusion"); push("G92 E0 ; reset extrusion distance") }
  if (P.bedTempControl) push("M140 S" + P.bedTemp + " ; printbed temperature")
  for (const h of headsUsed) { const hd = H(h); if (hd.temp > 0) push("M104 T" + (h - 1) + " S" + hd.temp + " ; printhead " + h + " temperature") }
  if (P.chamberLights) push("M355 S1 ; chamber lights on")
  if (homeFirst) { push("G28 ; home all axes"); push("G1 Z10 F600 ; lift") }
  if (needle) push("G92 X0 Y0 Z0 ; needle zero = origin (set by the user in the Print step)")
  if (P.bedTempControl) push("M190 S" + P.bedTemp + " ; wait for printbed temperature")
  for (const h of headsUsed) { const hd = H(h); if (hd.temp > 0) push("M109 T" + (h - 1) + " S" + hd.temp + " ; wait for printhead " + h) }

  let cur: Pt | null = null, curZ: number | null = null, curHead: number | null = null, extruding = false
  const travel = (x: number, y: number, z: number, hd: Head) => {
    const hop = hd.zHop > 0 && cur ? hd.zHop : 0
    if (hop && cur) push("G1 Z" + F3(z + hop) + " F600")
    if (cur) { const d = Math.hypot(x - cur.x, y - cur.y); stats.travelMM += d; stats.seconds += d / (P.travelSpeed || 50) }
    push("G0 X" + F3(x) + " Y" + F3(y) + (hop || curZ !== z ? " Z" + F3(z + hop) : "") + " F" + travelF + " ; travel")
    if (hop) push("G1 Z" + F3(z) + " F600")
    cur = { x, y }; curZ = z; stats.moves++
  }
  const startExtrude = (hd: Head, h: number) => {
    if (extruding) return
    if (extMode(h) === "pneumatic") {
      if (hd.pressureCmd) push(hd.pressureCmd.replace("{kPa}", String(hd.pressure)).replace("{head}", String(h - 1)) + " ; pressure " + hd.pressure + " kPa")
      if (hd.onCmd) push(hd.onCmd + " ; extrusion on (head " + h + ")")
      if (hd.flowDelay > 0) push("G4 P" + Math.round(hd.flowDelay * 1000) + " ; flow delay")
    } else if (hd.retract > 0) push("G1 E" + F3(hd.retract) + " F1500 ; unretract")
    extruding = true
  }
  const stopExtrude = (hd: Head, h: number) => {
    if (!extruding) return
    if (extMode(h) === "pneumatic") { if (hd.offCmd) push(hd.offCmd + " ; extrusion off") }
    else if (hd.retract > 0) push("G1 E-" + F3(hd.retract) + " F1500 ; retract")
    extruding = false
  }
  const extrudeTo = (x: number, y: number, h: number, layerH: number, kind: string) => {
    const hd = H(h); const lw = lineWidthOf(hd)
    if (!cur) { cur = { x, y }; return }
    const d = Math.hypot(x - cur.x, y - cur.y); if (d < 0.0005) return
    const vol = d * lw * layerH * (hd.flow / 100)
    let e = ""
    if (extMode(h) === "filament") e = " E" + fmtDot(vol / (Math.PI * Math.pow(hd.filamentD / 2, 2)), 5)
    else if (extMode(h) === "volumetric") e = " E" + fmtDot(vol, 5)
    push("G1 X" + F3(x) + " Y" + F3(y) + e + " F" + Math.round(hd.speed * 60) + " ; " + kind)
    stats.pathMM += d; stats.volumeMM3 += vol; stats.seconds += d / hd.speed; stats.moves++
    stats.perHead[h].pathMM += d; stats.perHead[h].volumeMM3 += vol; stats.perHead[h].seconds += d / hd.speed
    cur = { x, y }
  }
  const selectHead = (h: number) => {
    if (curHead === h) return
    if (curHead !== null) stopExtrude(H(curHead), curHead)
    push("T" + (h - 1) + " ; select printhead " + h)
    curHead = h; cur = null
  }
  const uv = (why: string) => {
    push((P.uvOnCmd || "M42 P4 S255") + " ; photocrosslinking " + P.uvNm + " nm (" + why + ")")
    push("G4 S" + P.uvSeconds + " ; crosslink dwell")
    push((P.uvOffCmd || "M42 P4 S0") + " ; UV off")
    stats.seconds += P.uvSeconds
  }

  let wellIdx = 0
  for (const w of wellOffs) {
    if (wellOffs.length > 1) { push(""); push("; ===== WELL " + w.name + " (" + (++wellIdx) + "/" + wellOffs.length + ") =====") }
    TP.forEach((L, li) => {
      const z = L.z + zOff
      push("")
      push("; LAYER " + (li + 1) + "/" + TP.length + " Z=" + F3(z) + " h=" + F3(L.h))
      if (curHead !== null) stopExtrude(H(curHead), curHead)
      push("G1 Z" + F3(z) + " F600 ; layer change"); curZ = z
      for (const p of L.paths) {
        const hd = H(p.head); const h = p.head
        selectHead(h)
        const pts = p.pts.map((q) => ({ x: q.x + hd.offsetX + bx + w.x, y: q.y + hd.offsetY + by + w.y }))
        const first = pts[0]
        const needTravel = !cur || Math.hypot(first.x - cur.x, first.y - cur.y) > 0.02 || curZ !== z
        if (needTravel) { stopExtrude(hd, h); travel(first.x, first.y, z, hd) }
        startExtrude(hd, h)
        for (let i = 1; i < pts.length; i++) extrudeTo(pts[i].x, pts[i].y, h, L.h, p.kind)
        if (p.closed) extrudeTo(first.x, first.y, h, L.h, p.kind)
      }
      if (curHead !== null) stopExtrude(H(curHead), curHead)
      if (P.photocrosslinking && P.uvEvery === "layer") uv("layer")
    })
  }

  push("")
  push("; ----- end of print -----")
  if (curHead !== null) stopExtrude(H(curHead), curHead)
  if (P.photocrosslinking && P.uvEvery !== "layer") uv("end")
  const zEnd = needle ? (TP.length ? TP[TP.length - 1].z : 0) + 15 : Math.min(state.bed.z, (TP.length ? TP[TP.length - 1].z : 0) + zOff + 20)
  push("G1 Z" + F3(zEnd) + " F600 ; lift")
  if (!needle) push("G0 X" + F3(Math.max(0, bx - 60)) + " Y" + F3(Math.min(state.bed.y - 5, by + 80)) + " F" + travelF + " ; park")
  for (const h of headsUsed) { const hd = H(h); if (hd.temp > 0) push("M104 T" + (h - 1) + " S0") }
  if (P.bedTempControl) push("M140 S0")
  push("M84 ; disable motors")
  push("; BIA Print Basic — done · " + stats.layers + " layers · " + offsets.length + " target(s) · " + fmtDot(stats.pathMM / 1000, 2) + " m · " + fmtDot(stats.volumeMM3, 1) + " mm3")
  stats.seconds += TP.length * 1.5 + 5

  return { lines: g, gcode: g.join("\n"), stats }
}

/** Sincroniza o centro da mesa com a superfície (porta do MIA Surface.syncBed) */
export function syncBed(state: BasicState): Bed {
  const d = bedDims(state.surface)
  return { ...state.bed, x: d.w, y: d.h, cx: +(d.w / 2).toFixed(2), cy: +(d.h / 2).toFixed(2) }
}

/** Resumo legível (para a etapa final) */
export function summarize(state: BasicState, stats: GcodeStats) {
  const ext = surfaceExtent(state.surface)
  return {
    surface: ext.label,
    wells: stats.wells,
    objects: state.shapes.map(describeShape),
    layers: stats.layers,
    minutes: Math.round(stats.seconds / 60),
    volume_uL: Math.round(stats.volumeMM3 * 10) / 10,
    path_m: Math.round(stats.pathMM / 100) / 10,
    heads: Object.keys(stats.perHead).map(Number),
  }
}
