/**
 * BIA v4.2 — Well Plates Catalog
 * Placas de cultura padronizadas SBS/ANSI
 *
 * Standard: SBS/ANSI SLAS 1-2004 (footprint 127.76 × 85.48 mm)
 * Fonte: ANSI/SLAS 1-2004 (R2012) — Dimensões externas e pitch padronizados.
 *
 * Referências:
 * - ANSI/SLAS 1-2004 (footprint)
 * - ANSI/SLAS 2-2004 (altura)
 * - ANSI/SLAS 4-2004 (posição do poço A1)
 */

import type { WellPlateSpec, WellPlateFormat, Point2D } from "../core/types"

// ═══════════════════════════════════════════════════════════════
// FOOTPRINT PADRÃO SBS/ANSI (todas as placas)
// ═══════════════════════════════════════════════════════════════
export const SBS_FOOTPRINT = {
  width: 127.76,    // mm (X)
  height: 85.48,    // mm (Y)
  height_mm: 14.35, // altura vertical padrão (Z) — varia por fabricante
}

// ═══════════════════════════════════════════════════════════════
// ESPECIFICAÇÕES POR FORMATO
// ═══════════════════════════════════════════════════════════════
/**
 * Coordenadas do centro do A1 no referencial do canto inferior-esquerdo da placa.
 * (offsetA1.x = distância em X do canto da placa até o centro do poço A1)
 *
 * Valores baseados no Corning® Costar® / Greiner Bio-One® (referência industry).
 */
export const WELL_PLATES: Record<WellPlateFormat, WellPlateSpec> = {
  6: {
    format: 6,
    rows: 2,
    cols: 3,
    rowLabels: ["A", "B"],
    wellDiameter_mm: 34.8,
    wellDepth_mm: 17.4,
    wellSpacing_mm: 39.12,
    offsetA1: { x: 24.76, y: 23.16 },   // ANSI SLAS 4
    plateSize: { ...SBS_FOOTPRINT },
    volumeMin_uL: 1500,
    volumeWorking_uL: 3000,
    volumeMax_uL: 8000,
    standard: "SBS",
    notes: [
      "Placa grande para estudos de scaffold volumoso (até Ø 34 mm)",
      "Ideal para organoides mega, tecido ósseo, constructos cardíacos",
      "Working volume típico: 2–3 mL por poço",
    ],
  },
  12: {
    format: 12,
    rows: 3,
    cols: 4,
    rowLabels: ["A", "B", "C"],
    wellDiameter_mm: 22.1,
    wellDepth_mm: 17.5,
    wellSpacing_mm: 26.0,
    offsetA1: { x: 24.94, y: 16.79 },
    plateSize: { ...SBS_FOOTPRINT },
    volumeMin_uL: 400,
    volumeWorking_uL: 1500,
    volumeMax_uL: 4000,
    standard: "SBS",
    notes: [
      "Equilíbrio entre volume e réplicas (12 condições / ensaio)",
      "Comum em ensaios de diferenciação e toxicidade",
    ],
  },
  24: {
    format: 24,
    rows: 4,
    cols: 6,
    rowLabels: ["A", "B", "C", "D"],
    wellDiameter_mm: 15.6,
    wellDepth_mm: 17.4,
    wellSpacing_mm: 19.3,
    offsetA1: { x: 15.13, y: 13.49 },
    plateSize: { ...SBS_FOOTPRINT },
    volumeMin_uL: 200,
    volumeWorking_uL: 500,
    volumeMax_uL: 3400,
    standard: "SBS",
    notes: [
      "Formato mais usado em bioimpressão de scaffolds médios",
      "Permite múltiplas réplicas (n=4-6) com poucos grupos",
      "CELLINK BIO X & Allevi 2 suportam nativamente",
    ],
  },
  48: {
    format: 48,
    rows: 6,
    cols: 8,
    rowLabels: ["A", "B", "C", "D", "E", "F"],
    wellDiameter_mm: 11.0,
    wellDepth_mm: 17.4,
    wellSpacing_mm: 13.0,
    offsetA1: { x: 18.16, y: 10.08 },
    plateSize: { ...SBS_FOOTPRINT },
    volumeMin_uL: 100,
    volumeWorking_uL: 250,
    volumeMax_uL: 1600,
    standard: "SBS",
    notes: [
      "Ideal para screening mid-throughput de bioinks",
      "Imprime construtos pequenos (Ø ≤ 9 mm)",
    ],
  },
  96: {
    format: 96,
    rows: 8,
    cols: 12,
    rowLabels: ["A", "B", "C", "D", "E", "F", "G", "H"],
    wellDiameter_mm: 6.86,
    wellDepth_mm: 10.9,
    wellSpacing_mm: 9.0,
    offsetA1: { x: 14.38, y: 11.24 },
    plateSize: { ...SBS_FOOTPRINT },
    volumeMin_uL: 25,
    volumeWorking_uL: 200,
    volumeMax_uL: 360,
    standard: "SBS",
    notes: [
      "High-throughput screening — 96 condições/placa",
      "Nozzle recomendado ≤ 400 µm (poço Ø 6.86 mm)",
      "Usado para organoides, spheroids, microscaffolds",
      "Requer auto-leveling preciso (<0.1 mm)",
    ],
  },
  384: {
    format: 384,
    rows: 16,
    cols: 24,
    rowLabels: ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P"],
    wellDiameter_mm: 3.3,
    wellDepth_mm: 11.5,
    wellSpacing_mm: 4.5,
    offsetA1: { x: 12.13, y: 8.99 },
    plateSize: { ...SBS_FOOTPRINT },
    volumeMin_uL: 5,
    volumeWorking_uL: 50,
    volumeMax_uL: 112,
    standard: "SBS",
    notes: [
      "Ultra-high-throughput — 384 condições/placa",
      "Nozzle obrigatório ≤ 200 µm",
      "Restrito a micro-esferoides e bioinks de baixa viscosidade",
      "Shear stress crítico — revisar protocolo celular",
    ],
  },
}

// ═══════════════════════════════════════════════════════════════
// UTILITÁRIOS DE POSIÇÃO
// ═══════════════════════════════════════════════════════════════

/**
 * Retorna o ID do poço (ex "A1", "B3") a partir de (row, col) 0-indexed.
 */
export function wellId(spec: WellPlateSpec, row: number, col: number): string {
  if (row < 0 || row >= spec.rows || col < 0 || col >= spec.cols) {
    throw new Error(`Invalid well (${row},${col}) for ${spec.format}-well plate`)
  }
  return `${spec.rowLabels[row]}${col + 1}`
}

/**
 * Parse well ID → (row, col)
 * "A1" → { row: 0, col: 0 }
 * "H12" → { row: 7, col: 11 }
 * "AB3" não é suportado pois formatos até 384 usam 1 letra.
 */
export function parseWellId(spec: WellPlateSpec, id: string): { row: number; col: number } {
  const match = id.trim().match(/^([A-P])(\d{1,2})$/i)
  if (!match) throw new Error(`Invalid well ID: ${id}`)
  const letter = match[1].toUpperCase()
  const row = spec.rowLabels.indexOf(letter)
  const col = parseInt(match[2], 10) - 1
  if (row < 0 || col < 0 || col >= spec.cols)
    throw new Error(`Well ${id} out of range for ${spec.format}-well`)
  return { row, col }
}

/**
 * Posição (x, y) do centro do poço no referencial da placa.
 */
export function wellCenter(spec: WellPlateSpec, id: string): Point2D {
  const { row, col } = parseWellId(spec, id)
  return {
    x: spec.offsetA1.x + col * spec.wellSpacing_mm,
    y: spec.offsetA1.y + row * spec.wellSpacing_mm,
  }
}

/**
 * Todos os IDs de poços em ordem A1, A2, ..., An, B1, ...
 */
export function allWellIds(spec: WellPlateSpec): string[] {
  const ids: string[] = []
  for (let r = 0; r < spec.rows; r++) {
    for (let c = 0; c < spec.cols; c++) {
      ids.push(wellId(spec, r, c))
    }
  }
  return ids
}

/**
 * Verifica se um constructo de diâmetro D cabe no poço (com folga).
 */
export function fitsInWell(spec: WellPlateSpec, constructDiameter_mm: number, margin_mm = 1.0): boolean {
  return constructDiameter_mm + 2 * margin_mm <= spec.wellDiameter_mm
}

/**
 * Recomenda bioprinter + nozzle para uma placa dada.
 */
export function recommendNozzle_um(spec: WellPlateSpec): { min: number; max: number; recommended: number } {
  // Regra: nozzle ≤ 15% do diâmetro do poço
  const maxNozzle = Math.floor(spec.wellDiameter_mm * 1000 * 0.15)
  const minNozzle = Math.max(100, Math.floor(spec.wellDiameter_mm * 1000 * 0.04))
  const recommended = Math.floor((minNozzle + maxNozzle) / 2)
  return { min: minNozzle, max: maxNozzle, recommended }
}

/**
 * Retorna metadata enriquecida para UI.
 */
export function plateMetadata(format: WellPlateFormat) {
  const spec = WELL_PLATES[format]
  const nozzle = recommendNozzle_um(spec)
  return {
    format,
    totalWells: spec.rows * spec.cols,
    wellDiameter: `${spec.wellDiameter_mm} mm`,
    wellSpacing: `${spec.wellSpacing_mm} mm pitch`,
    workingVolume: `${spec.volumeWorking_uL} µL`,
    recommendedNozzle: `${nozzle.recommended} µm (${nozzle.min}–${nozzle.max})`,
    standard: spec.standard,
    notes: spec.notes,
  }
}
