/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  context-to-quick.ts — R12.59 · Fluxo contínuo Etapa 1+2 → Etapa 3
 *
 *  Converte o estado canônico do BioprintProcessContext (state.model +
 *  state.bioink.formulations[]) para os tipos "Quick" usados pelo
 *  generateQuickGcodeMulti() do Modo Básico. Estes helpers são PUROS
 *  (sem React, sem side effects) e servem para eliminar a duplicação
 *  de UI que existia no BasicModePanel — antes ele mantinha estado local
 *  próprio de geometria e blend, agora tudo vem do contexto.
 *
 *  Depende de:
 *    - process-context.tsx (BioinkFormulation, ModelStepState)
 *    - geometry-bounds.ts (ENGINE_TO_QUICK_ID, BASIC_GEOMETRY_IDS)
 *    - quick-gcode.ts (QuickGeometry, QuickMultiBioink, GEOMETRY_PRESETS)
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { ENGINE_TO_QUICK_ID } from "@/lib/gcode/slicer/geometry-bounds"
import {
  GEOMETRY_PRESETS,
  type QuickGeometry,
  type QuickGeometryId,
  type QuickMultiBioink,
  type QuickBioinkFormulation,
} from "@/lib/bioprint/quick-gcode"
import type { BioinkFormulation } from "@/lib/bioprint/process-context"

// ─── Types de entrada ────────────────────────────────────────────────────

/** Subset do state.model que precisamos aqui — evita depender do tipo completo. */
export interface ModelSnapshotForQuick {
  geometryId: string | null
  params: Record<string, number | string | boolean> | null
}

/** Subset do state.bioink que precisamos aqui. */
export interface BioinkSnapshotForQuick {
  formulations: BioinkFormulation[]
  // Fallback legacy (R12.0..R12.9) usados quando formulations está vazio
  material: string | null
  concentration: number | null
  cellType: string | null
  cellDensityMillionMl: number | null
  crosslinker: string | null
  rheology: { viscosityPaS?: number } | null
}

// ─── Conversão de Geometria ──────────────────────────────────────────────

/**
 * Mapa: `state.model.geometryId` (id do engine, ex: "cube_tissue")
 *       → `QuickGeometryId` (id do quick-gcode, ex: "cube").
 *
 * Se o id não estiver no mapa, retorna `"cube"` como fallback seguro.
 */
export function toQuickGeometryId(engineId: string | null | undefined): QuickGeometryId {
  if (!engineId) return "cube"
  const mapped = ENGINE_TO_QUICK_ID[engineId]
  if (mapped) return mapped as QuickGeometryId
  return "cube"
}

/**
 * Extrai dimensões (width/depth/height) do state.model.params se disponíveis,
 * cai no default do preset se ausentes/inválidos.
 *
 * Comportamento por chave:
 *  - width/depth/height: aceita number > 0
 *  - wallThickness: aceita number > 0 (só tube)
 *  - pitch: aceita number > 0 (só grid)
 *  - innerDiameter: aceita number > 0
 */
export function extractDims(
  geomId: QuickGeometryId,
  params: Record<string, number | string | boolean> | null | undefined,
): QuickGeometry {
  const preset = GEOMETRY_PRESETS.find(p => p.id === geomId)
  const defaults = preset?.defaultParams ?? { width: 10, depth: 10, height: 5 }

  const num = (key: string, fallback: number): number => {
    const raw = params?.[key]
    if (typeof raw === "number" && isFinite(raw) && raw > 0) return raw
    return fallback
  }

  const geom: QuickGeometry = {
    id: geomId,
    width: num("width", defaults.width),
    depth: num("depth", defaults.depth),
    height: num("height", defaults.height),
  }

  // Params opcionais só quando fazem sentido para a geometria
  if (geomId === "tube") {
    geom.wallThickness = num("wallThickness", defaults.wallThickness ?? 1.5)
    if (typeof params?.["innerDiameter"] === "number") {
      geom.innerDiameter = num("innerDiameter", geom.width - 2 * geom.wallThickness)
    }
  }
  if (geomId === "grid") {
    geom.pitch = num("pitch", defaults.pitch ?? 1.5)
  }

  return geom
}

/**
 * Combina toQuickGeometryId + extractDims num único helper.
 * Uso típico: `const geom = contextToQuickGeometry(state.model)`
 */
export function contextToQuickGeometry(model: ModelSnapshotForQuick): QuickGeometry {
  const quickId = toQuickGeometryId(model.geometryId)
  return extractDims(quickId, model.params)
}

// ─── Conversão de Biotinta ───────────────────────────────────────────────

/**
 * Heurística de bico (mm) por família de material.
 * GelMA/gelatina → 0.41mm (22G), Alginato → 0.41mm, Colágeno → 0.58mm (20G),
 * Fibrina → 0.41mm, PEGDA → 0.41mm, Pluronic → 0.58mm, dECM → 0.58mm.
 */
function guessNozzleMm(materialLabel: string): number {
  const m = materialLabel.toLowerCase()
  if (m.includes("colág") || m.includes("collagen") || m.includes("pluronic") || m.includes("decm")) return 0.58
  return 0.41
}

/**
 * Heurística de viscosidade (Pa·s) por família.
 * Fallback usa 5 Pa·s se nada mais é conhecido.
 */
function guessViscosityPaS(materialLabel: string): number {
  const m = materialLabel.toLowerCase()
  if (m.includes("gelma") || m.includes("gelatina")) return 5
  if (m.includes("algin")) return 3
  if (m.includes("colág") || m.includes("collagen")) return 8
  if (m.includes("fibrin")) return 4
  if (m.includes("pluronic")) return 30
  if (m.includes("pegda")) return 6
  if (m.includes("decm")) return 10
  return 5
}

/**
 * Heurística de velocidade de impressão (mm/s) por família.
 * Materiais com células ou viscosos → mais devagar; puramente estruturais → mais rápido.
 */
function guessPrintSpeed(hasCells: boolean, materialLabel: string): number {
  if (hasCells) return 5  // células vivas → 5-8 mm/s seguros
  const m = materialLabel.toLowerCase()
  if (m.includes("pluronic")) return 4
  if (m.includes("colág")) return 5
  return 8
}

/**
 * Heurística de pressão (kPa) por família + presença de células.
 * Sem células: usa média por família. Com células: cai para 30-80 kPa (Nelson 2021).
 */
function guessPressureKPa(hasCells: boolean, materialLabel: string): number {
  const m = materialLabel.toLowerCase()
  if (hasCells) return 60  // faixa segura Nelson 2021
  if (m.includes("gelma")) return 80
  if (m.includes("algin")) return 60
  if (m.includes("colág")) return 100
  if (m.includes("fibrin")) return 70
  if (m.includes("pluronic")) return 150
  return 80
}

/**
 * Converte UMA BioinkFormulation do contexto (Etapa 2, R12.58) → QuickBioinkFormulation.
 * Preserva material, concentração, células, crosslinker, mas gera parâmetros
 * de impressão (velocidade, pressão, bico) via heurística.
 */
export function formulationToQuick(
  f: BioinkFormulation,
  fraction: number,
): QuickBioinkFormulation {
  const materialLabel = `${f.material} ${f.concentration}% w/v`
  const nozzleMm = guessNozzleMm(f.material)
  const viscosity = f.rheology?.viscosityPaS ?? guessViscosityPaS(f.material)
  const hasCells = !!f.cellType
  return {
    fraction,
    materialLabel,
    nozzleDiameter_mm: nozzleMm,
    viscosity_PaS: viscosity,
    printSpeed_mms: guessPrintSpeed(hasCells, f.material),
    travelSpeed_mms: 30,
    pressure_kpa: guessPressureKPa(hasCells, f.material),
    crosslinker: f.crosslinker,
    hasCells,
    cellType: f.cellType,
    cellDensity_M_per_mL: f.cellDensityMillionMl,
  }
}

/**
 * Converte o estado bioink do contexto → QuickMultiBioink (blend do quick-gcode).
 *
 * Regras:
 *  - Se `formulations[]` tem 1+ itens: usa TODAS (fração igual entre elas).
 *    Ex: 2 biotintas → cada uma fraction=0.5.
 *  - Se vazio mas `material` legacy existe: cria 1 formulação a partir dos
 *    campos legacy (backward compat R12.0..R12.9).
 *  - Se ambos vazios: retorna default GelMA 10% (fallback seguro, evita crash).
 */
export function contextToQuickBlend(bioink: BioinkSnapshotForQuick): QuickMultiBioink {
  // Caminho novo: formulations[] tem itens
  if (bioink.formulations && bioink.formulations.length > 0) {
    const n = bioink.formulations.length
    const fraction = 1.0 / n
    return bioink.formulations.map(f => formulationToQuick(f, fraction))
  }

  // Caminho legacy: state.bioink.material existe (R12.0..R12.9)
  if (bioink.material) {
    const materialLabel = `${bioink.material} ${bioink.concentration ?? 5}% w/v`
    const hasCells = !!bioink.cellType
    return [{
      fraction: 1.0,
      materialLabel,
      nozzleDiameter_mm: guessNozzleMm(bioink.material),
      viscosity_PaS: bioink.rheology?.viscosityPaS ?? guessViscosityPaS(bioink.material),
      printSpeed_mms: guessPrintSpeed(hasCells, bioink.material),
      travelSpeed_mms: 30,
      pressure_kpa: guessPressureKPa(hasCells, bioink.material),
      crosslinker: bioink.crosslinker,
      hasCells,
      cellType: bioink.cellType,
      cellDensity_M_per_mL: bioink.cellDensityMillionMl,
    }]
  }

  // Fallback duro (não deveria ocorrer se isBioinkReady() foi checado antes)
  return [{
    fraction: 1.0,
    materialLabel: "GelMA 10% w/v",
    nozzleDiameter_mm: 0.41,
    viscosity_PaS: 5,
    printSpeed_mms: 8,
    travelSpeed_mms: 30,
    pressure_kpa: 80,
    crosslinker: "UV 365nm + LAP 0.3%",
    hasCells: false,
  }]
}

// ─── Resumo textual (para cards read-only) ───────────────────────────────

/**
 * Formata state.model num resumo curto para o card "Contexto Etapa 1".
 * Ex: "cube_tissue (10×10×5mm)" ou "membrane (20×20×1mm)".
 */
export function summarizeModel(model: ModelSnapshotForQuick): string {
  if (!model.geometryId) return "—"
  const geom = contextToQuickGeometry(model)
  const dims = `${geom.width}×${geom.depth}×${geom.height}mm`
  return `${model.geometryId} (${dims})`
}

/**
 * Formata cada biotinta em texto compacto: "GelMA 8%" ou "Alginato 3% + hMSC 5×10⁶/mL".
 */
export function summarizeFormulation(f: BioinkFormulation): string {
  const base = `${f.material} ${f.concentration}%`
  if (f.cellType && f.cellDensityMillionMl) {
    return `${base} + ${f.cellType} ${f.cellDensityMillionMl}×10⁶/mL`
  }
  return base
}
