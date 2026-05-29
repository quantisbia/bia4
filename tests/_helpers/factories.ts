/**
 * BIA — Test factories (R12.48)
 *
 * Constrói BioprintProcessState e G-codes mock para uso nos testes
 * de aceitação. Evita repetir setup gigante em cada teste.
 */

import type {
  BioprintProcessState,
  ModelStepState,
  BioinkStepState,
  SliceStepState,
  ControlStepState,
  PostBioStepState,
} from "@/lib/bioprint/process-context"

// ─── Estados padrão (todos "empty") ────────────────────────────────────

const EMPTY_MODEL: ModelStepState = {
  status: "empty",
  source: null,
  name: null,
  category: null,
  geometryId: null,
  params: null,
  stats: null,
  validation: null,
}

const EMPTY_BIOINK: BioinkStepState = {
  status: "empty",
  formulations: [],
  strategy: "single",
  material: null,
  concentration: null,
  crosslinker: null,
  crosslinkerConc: null,
  cellType: null,
  cellDensityMillionMl: null,
  additives: [],
  rheology: null,
}

const EMPTY_SLICE: SliceStepState = {
  status: "empty",
  layerHeightMm: null,
  printSpeedMmS: null,
  pressureKPa: null,
  nozzleDiameterUm: null,
  infillPatternId: null,
  infillPercent: null,
  perimeterOnly: null,
  cartridgeTempC: null,
  bedTempC: null,
  chamberTempC: null,
  skirtLoops: null,
  retractionMm: null,
  gcode: null,
  estimate: null,
}

const EMPTY_CONTROL: ControlStepState = {
  status: "empty",
  tissueType: null,
  connected: false,
}

const EMPTY_POSTBIO: PostBioStepState = {
  status: "empty",
  tissueType: null,
  cultureConfirmed: false,
  bioreactorConfirmed: false,
  assaysConfirmed: false,
}

// ─── Factory raiz ──────────────────────────────────────────────────────

/** Estado vazio (default — tudo "empty") */
export function makeEmptyState(): BioprintProcessState {
  return {
    model: { ...EMPTY_MODEL },
    bioink: { ...EMPTY_BIOINK },
    slice: { ...EMPTY_SLICE },
    control: { ...EMPTY_CONTROL },
    postBio: { ...EMPTY_POSTBIO },
  }
}

/**
 * Estado completo "Orelha + GelMA + Cellink + Linhas" — caso real
 * que a Bia reportou. Use como ponto de partida e sobrescreva o que
 * quiser testar.
 */
export function makeEarGelmaLinesState(
  overrides?: Partial<{
    geometryId: string
    material: string
    infillPatternId: string
    layerHeight: number
  }>,
): BioprintProcessState {
  const s = makeEmptyState()
  s.model = {
    ...EMPTY_MODEL,
    status: "ready",
    source: "generated",
    name: "Orelha anatômica",
    category: "soft-tissue",
    geometryId: overrides?.geometryId ?? "ear",
    params: { width: 35, height: 60, depth: 18 },
  }
  s.bioink = {
    ...EMPTY_BIOINK,
    status: "ready",
    material: overrides?.material ?? "GelMA",
    concentration: 10,
    crosslinker: "UV 405nm",
    crosslinkerConc: 0.5,
    cellType: null,
    cellDensityMillionMl: null,
    additives: [],
    rheology: { viscosityPaS: 5 },
  }
  s.slice = {
    ...EMPTY_SLICE,
    status: "draft",
    layerHeightMm: overrides?.layerHeight ?? 0.2,
    printSpeedMmS: 8,
    pressureKPa: 80,
    nozzleDiameterUm: 410,
    infillPatternId: overrides?.infillPatternId ?? "classic-lines",
    infillPercent: 30,
    perimeterOnly: false,
    cartridgeTempC: 25,
    bedTempC: 30,
    chamberTempC: null,
    skirtLoops: 2,
    retractionMm: 0,
  }
  return s
}

// ─── G-codes mock ──────────────────────────────────────────────────────

/** G-code "real" de orelha (header completo BIA) */
export const GCODE_EAR_GELMA_LINES = `
; ═════════════════════════════════════════════════
; BIA · Job: bia_ear_linear
; Geometry: ear (orelha anatômica)
; Material: GelMA 10% w/v
; Infill: linhas (linear)
; Layer height: 0.20 mm
; ═════════════════════════════════════════════════
G21
G90
M83
G28
G1 Z2 F300
; Layer 1/300 z=0.20
G1 X10 Y10 Z0.20 E0.5 F480
G1 X20 Y10 Z0.20 E1.0 F480
G1 X20 Y20 Z0.20 E1.5 F480
G1 X10 Y20 Z0.20 E2.0 F480
`.trim()

/** G-code de cubo gyroide (NÃO é orelha — usado pra testar bloqueio) */
export const GCODE_CUBE_GYROID = `
; ═════════════════════════════════════════════════
; BIA · Job: bia_cube_tissue_gyroid
; Geometry: cube (cubo 20×20×20 mm)
; Material: Alginato 2%
; Infill: gyroid (TPMS)
; ═════════════════════════════════════════════════
G21
G90
M82
G92 X0 Y0 Z0 E0
G1 Z2 F300
G1 X0 Y0 Z0.20 E0.5 F480
G1 X20 Y0 Z0.20 E1.0 F480
G1 X20 Y20 Z0.20 E1.5 F480
G1 X0 Y20 Z0.20 E2.0 F480
G1 X0 Y0 Z0.20 E2.5 F480
`.trim()

/** G-code vazio (apenas header, sem G1) */
export const GCODE_NO_MOVES = `
; ═════════════════════════════════════════════════
; BIA · Job: empty_test
; ═════════════════════════════════════════════════
G21
G90
M83
`.trim()

/** G-code sem nenhum comentário (anônimo, externo) */
export const GCODE_ANONYMOUS = `
G21
G90
M83
G1 X10 Y10 Z0.2 E0.5 F480
G1 X20 Y20 Z0.2 E1.0 F480
`.trim()
