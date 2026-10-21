/**
 * BIA v4 · R20 · BioSlicer — ALVO de impressão (onde a peça nasce)
 * ─────────────────────────────────────────────────────────────────
 * PONTO ZERO É PONTO ZERO: o bico está sobre o centro do alvo quando o
 * G92 X0 Y0 Z0 E0 roda. Para placas multi-poços, o bico fica sobre o centro
 * do PRIMEIRO poço selecionado (superior-esquerdo) e os demais poços são
 * OFFSETS relativos pelo pitch SBS/ANSI. Nenhuma coordenada absoluta de mesa.
 *
 * Catálogo SBS/ANSI SLAS 1-2004 (Corning/Greiner) — igual ao legado.
 */

export type PlateFormat = 6 | 12 | 24 | 48 | 96

export interface PlateSpec {
  format: PlateFormat
  rows: number
  cols: number
  rowLabels: string[]
  wellDiameter_mm: number
  wellDepth_mm: number
  pitch_mm: number
  workingVolume_uL: number
}

export const PLATES: Record<PlateFormat, PlateSpec> = {
  6:  { format: 6,  rows: 2, cols: 3,  rowLabels: ["A", "B"], wellDiameter_mm: 34.8, wellDepth_mm: 17.4, pitch_mm: 39.12, workingVolume_uL: 3000 },
  12: { format: 12, rows: 3, cols: 4,  rowLabels: ["A", "B", "C"], wellDiameter_mm: 22.1, wellDepth_mm: 17.5, pitch_mm: 26.0, workingVolume_uL: 1500 },
  24: { format: 24, rows: 4, cols: 6,  rowLabels: ["A", "B", "C", "D"], wellDiameter_mm: 15.6, wellDepth_mm: 17.4, pitch_mm: 19.3, workingVolume_uL: 500 },
  48: { format: 48, rows: 6, cols: 8,  rowLabels: ["A", "B", "C", "D", "E", "F"], wellDiameter_mm: 11.0, wellDepth_mm: 17.4, pitch_mm: 13.0, workingVolume_uL: 250 },
  96: { format: 96, rows: 8, cols: 12, rowLabels: ["A", "B", "C", "D", "E", "F", "G", "H"], wellDiameter_mm: 6.86, wellDepth_mm: 10.9, pitch_mm: 9.0, workingVolume_uL: 200 },
}

export type PetriSize = 30 | 35 | 60 | 90 | 100

export type PrintTarget =
  | { kind: "petri"; diameter_mm: PetriSize | number }
  | { kind: "slide" }                      // lâmina / superfície aberta
  | { kind: "plate"; format: PlateFormat; wells: string[]; zHop_mm: number; pause_s: number; purge_uL: number }

export const DEFAULT_TARGET: PrintTarget = { kind: "petri", diameter_mm: 60 }

export function parseWellId(spec: PlateSpec, id: string): { row: number; col: number } {
  const m = id.trim().toUpperCase().match(/^([A-H])(\d{1,2})$/)
  if (!m) throw new Error(`Poço inválido: ${id}`)
  const row = spec.rowLabels.indexOf(m[1])
  const col = parseInt(m[2], 10) - 1
  if (row < 0 || col < 0 || col >= spec.cols) throw new Error(`Poço ${id} fora da placa de ${spec.format}`)
  return { row, col }
}

export function wellId(spec: PlateSpec, row: number, col: number): string {
  return `${spec.rowLabels[row]}${col + 1}`
}

export function allWells(spec: PlateSpec): string[] {
  const out: string[] = []
  for (let r = 0; r < spec.rows; r++) for (let c = 0; c < spec.cols; c++) out.push(wellId(spec, r, c))
  return out
}

/** Poço de referência = o mais acima/à esquerda (menor linha, depois menor coluna). */
export function referenceWell(spec: PlateSpec, wells: string[]): string {
  return [...wells].sort((a, b) => {
    const pa = parseWellId(spec, a), pb = parseWellId(spec, b)
    return pa.row - pb.row || pa.col - pb.col
  })[0]
}

export interface WellOffset { id: string; dx: number; dy: number }

/**
 * Offsets (mm) de cada poço em relação ao poço de referência.
 * Y cresce para "baixo" na placa (linha A em cima). Na mesa da impressora o
 * eixo Y normalmente cresce para o fundo; a linha B fica em −Y em relação a A
 * se a placa está com A1 no canto traseiro-esquerdo. Usamos a convenção
 * "A1 traseiro-esquerdo, colunas crescem em +X, linhas crescem em −Y", que
 * é a mais comum nas bioimpressoras (CELLINK/Allevi/BioEnder com placa
 * encaixada no suporte). Ajustável por `rowDirection`.
 */
export function wellOffsets(spec: PlateSpec, wells: string[], rowDirection: 1 | -1 = -1): WellOffset[] {
  const ref = referenceWell(spec, wells)
  const r0 = parseWellId(spec, ref)
  // ordem: serpentina a partir da referência (minimiza travel, mantém ref em 1º)
  const sorted = [...wells].sort((a, b) => {
    const pa = parseWellId(spec, a), pb = parseWellId(spec, b)
    if (pa.row !== pb.row) return pa.row - pb.row
    const even = (pa.row - r0.row) % 2 === 0
    return even ? pa.col - pb.col : pb.col - pa.col
  })
  return sorted.map((id) => {
    const p = parseWellId(spec, id)
    const dx = (p.col - r0.col) * spec.pitch_mm, dy = rowDirection * (p.row - r0.row) * spec.pitch_mm
    return { id, dx: dx === 0 ? 0 : dx, dy: dy === 0 ? 0 : dy }
  })
}

/** Diâmetro útil onde a peça precisa caber (mm). */
export function targetUsableDiameter(t: PrintTarget): number | null {
  if (t.kind === "petri") return t.diameter_mm * 0.85
  if (t.kind === "plate") return PLATES[t.format].wellDiameter_mm * 0.85
  return null
}

export function describeTarget(t: PrintTarget): string {
  if (t.kind === "petri") return `Petri Ø${t.diameter_mm} mm — bico no centro da placa`
  if (t.kind === "slide") return "Lâmina / superfície aberta — bico no centro da peça"
  const spec = PLATES[t.format]
  const ref = t.wells.length ? referenceWell(spec, t.wells) : "—"
  return `Placa ${t.format} poços — bico no centro do poço ${ref}; ${t.wells.length} poço(s), pitch ${spec.pitch_mm} mm`
}
