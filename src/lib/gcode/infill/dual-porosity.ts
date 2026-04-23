/**
 * BIA v4.2 — DUAL-POROSITY ENGINE
 *
 * Combina MACROPOROSIDADE + MICROPOROSIDADE simultaneamente em uma mesma construção:
 *   - Macroporos (300-1200 µm): perfusão ativa, vascularização, drenagem
 *   - Microporos (20-300 µm): difusão, adesão celular, sinalização
 *
 * Esta é a arquitetura biomimética correta:
 *   - OSSO: macro (canais de Havers, 300-500µm) + micro (canais de Volkmann, 50-100µm)
 *   - FÍGADO: macro (sinusóides lobulares, 500-800µm) + micro (espaços de Disse, 80-150µm)
 *   - RIM: macro (ramos arciformes, 700µm) + micro (glomérulos, 80µm)
 *
 * Estratégia de combinação:
 *   1. Gerar camada estrutural (walls + infill base, ex: Gyroid)
 *   2. Subtrair macrocanais (maior prioridade, vasculatura)
 *   3. Subtrair microcanais (textura, poros secundários)
 *   4. Preservar integridade mecânica (densidade mínima de parede > 15%)
 *
 * Em G-code, isto significa:
 *   - Toolpaths sobrepostos por camada (infill + canais)
 *   - Macrocanais impressos com material sacrificial (extruder 2)
 *   - Microcanais via porogênio embutido na bioink
 *
 * Compliance: respeita limite de Folkman (<200µm até vaso) e
 * densidade trabecular para carga mecânica (>15% sólido).
 *
 * Referências:
 *   - Karageorgiou V & Kaplan D (2005) Biomaterials 26, 5474-5491
 *     "Porosity of 3D biomaterial scaffolds and osteogenesis"
 *   - Grayson WL et al. (2008) PNAS 105, 17169-17174 (bone dual-scale)
 *   - Miri AK et al. (2018) Adv. Mater. 30, 1800242 (hierarchical bioprinting)
 */

import type { BBox2D, Segment2D } from "../core/types"
import {
  generateMacroChannels,
  recommendMacroChannels,
  type MacroChannelConfig,
  type MacroChannelResult,
} from "./channels/macrochannels"
import {
  generateMicroChannels,
  recommendMicroChannels,
  type MicroChannelConfig,
  type MicroChannelResult,
} from "./channels/microchannels"
import { generateGyroidInfill } from "./parametric/gyroid-tpms"
import { generateVoronoi3D, type Voronoi3DResult } from "./non-parametric/voronoi-3d"
import { generatePerlinInfill, type PerlinInfillResult } from "./non-parametric/perlin-noise"

// ═══════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════
export type BaseStructureAlgorithm =
  | "gyroid"
  | "voronoi_3d"
  | "perlin"

export interface DualPorosityConfig {
  // Estrutura base (matriz sólida)
  baseStructure: BaseStructureAlgorithm
  baseDensity: number           // 0.15-0.60 (mínimo 15% para mecânica)
  baseSeed?: number

  // Macroporosidade (vasos/perfusão)
  macroConfig?: MacroChannelConfig
  macroEnabled: boolean

  // Microporosidade (difusão/células)
  microConfig?: MicroChannelConfig
  microEnabled: boolean

  // Constraint biomecânica
  minSolidDensity_pct?: number   // default 15% (mínimo para carga)
  maxTotalPorosity_pct?: number  // default 85%
}

export interface DualPorosityLayerResult {
  z_mm: number
  baseSegments: Segment2D[]       // estrutura principal (Gyroid/Voronoi/Perlin)
  macroSegments: Segment2D[]      // canais macro (extruder 2 — sacrificial)
  microSegments: Segment2D[]      // textura micro (mesmo extruder, porogênio)
  totalSegments: number
  warnings: string[]
}

export interface DualPorosityResult {
  layers: Map<number, DualPorosityLayerResult>
  summary: {
    totalPorosity_pct: number
    macroPorosity_pct: number
    microPorosity_pct: number
    solidDensity_pct: number
    folkmanCompliant: boolean
    mechanicalCompliant: boolean  // >15% solid
    hierarchyRatio: number        // macro/micro em diâmetros
    estimatedCompressiveModulus_kPa: number
    estimatedViability_pct: number
  }
  macroResult?: MacroChannelResult
  microResult?: MicroChannelResult
  voronoi3DResult?: Voronoi3DResult
  perlinResults?: Map<number, PerlinInfillResult>
  notes: string[]
  warnings: string[]
}

// ═══════════════════════════════════════════════════════════════
// GERAÇÃO DA ESTRUTURA BASE
// ═══════════════════════════════════════════════════════════════

function generateBaseStructure(
  bbox: BBox2D,
  z_mm: number,
  cfg: DualPorosityConfig,
  layerHeight_mm: number,
  zMin: number,
  zMax: number,
  cachedVoronoi?: Voronoi3DResult,
): { segments: Segment2D[]; meta?: unknown } {
  const baseDensity = cfg.baseDensity
  const baseSeed = cfg.baseSeed ?? 42

  // Poresize derivado da densidade (quanto menor density, maior o poro)
  const poreSize_um = Math.round(300 + (1 - baseDensity) * 500)  // 300-800µm

  switch (cfg.baseStructure) {
    case "gyroid":
      return {
        segments: generateGyroidInfill(bbox, z_mm, {
          density: baseDensity,
          poreSize_um,
          seed: baseSeed,
        }),
      }

    case "voronoi_3d": {
      if (cachedVoronoi) {
        const key = Math.round(z_mm * 1000) / 1000
        return { segments: cachedVoronoi.layerSegments.get(key) ?? [] }
      }
      // fallback: gerar só esta camada
      const res = generateVoronoi3D(
        {
          min: { x: bbox.minX, y: bbox.minY, z: zMin },
          max: { x: bbox.maxX, y: bbox.maxY, z: zMax },
        },
        {
          density: baseDensity,
          poreSize_um,
          seed: baseSeed,
          layerHeight_mm,
          zRange: [zMin, zMax],
          lloydIterations: 4,
        },
      )
      const key = Math.round(z_mm * 1000) / 1000
      return { segments: res.layerSegments.get(key) ?? [], meta: res }
    }

    case "perlin": {
      const res = generatePerlinInfill(bbox, z_mm, {
        density: baseDensity,
        poreSize_um,
        seed: baseSeed,
        octaves: 4,
        scale: 2.5,
        persistence: 0.55,
      })
      return { segments: res.segments, meta: res }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// API PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export interface DualPorosityInput {
  bbox: BBox2D
  zRange: [number, number]
  layerHeight_mm: number
  config: DualPorosityConfig
}

/**
 * Gera estrutura dual-poro completa (base + macro + micro) para todas as camadas.
 */
export function generateDualPorosity(input: DualPorosityInput): DualPorosityResult {
  const { bbox, zRange, layerHeight_mm, config } = input
  const [zMin, zMax] = zRange
  const layers = new Map<number, DualPorosityLayerResult>()
  const warnings: string[] = []
  const notes: string[] = []

  // 1) Pré-computar Voronoi 3D uma única vez (se aplicável)
  let cachedVoronoi: Voronoi3DResult | undefined
  if (config.baseStructure === "voronoi_3d") {
    cachedVoronoi = generateVoronoi3D(
      {
        min: { x: bbox.minX, y: bbox.minY, z: zMin },
        max: { x: bbox.maxX, y: bbox.maxY, z: zMax },
      },
      {
        density: config.baseDensity,
        poreSize_um: 300 + (1 - config.baseDensity) * 500,
        seed: config.baseSeed ?? 42,
        layerHeight_mm,
        zRange: [zMin, zMax],
        lloydIterations: 4,
      },
    )
    notes.push(
      `Voronoi 3D pré-computado: ${cachedVoronoi.cellCount} células, ` +
      `conectividade vertical ${(cachedVoronoi.vertConnectivity * 100).toFixed(1)}%`,
    )
  }

  // 2) Gerar canais macro/micro (mesmo para todas as camadas dentro da estrutura 3D)
  let macroResult: MacroChannelResult | undefined
  if (config.macroEnabled && config.macroConfig) {
    macroResult = generateMacroChannels(bbox, config.macroConfig)
    notes.push(...macroResult.notes)
  }
  let microResult: MicroChannelResult | undefined
  if (config.microEnabled && config.microConfig) {
    microResult = generateMicroChannels(bbox, config.microConfig)
    notes.push(...microResult.notes)
    if (!microResult.folkmanCompliance) {
      warnings.push(
        `Microcanais não atendem limite de Folkman: espaçamento ` +
        `${microResult.avgSpacing_um}µm > 200µm. Risco de necrose.`,
      )
    }
  }

  // 3) Loop de camadas
  const perlinResults = new Map<number, PerlinInfillResult>()
  for (let z = zMin; z <= zMax + 1e-6; z += layerHeight_mm) {
    const zKey = Math.round(z * 1000) / 1000
    const layerWarnings: string[] = []

    // Estrutura base
    const base = generateBaseStructure(
      bbox, z, config, layerHeight_mm, zMin, zMax, cachedVoronoi,
    )
    if (config.baseStructure === "perlin" && base.meta) {
      perlinResults.set(zKey, base.meta as PerlinInfillResult)
    }

    // Macrocanais: podem variar por Z se for serpentine, senão mesmos
    const macroSegs = macroResult?.segments ?? []

    // Microcanais: rotação por camada para evitar registro perfeito (mais orgânico)
    const microSegs = microResult?.segments.map((s) => {
      // pequena rotação por camada (2° por layer) para evitar registro
      const ang = ((z / layerHeight_mm) * 2 * Math.PI) / 180
      const cx = (bbox.minX + bbox.maxX) / 2
      const cy = (bbox.minY + bbox.maxY) / 2
      const rot = (p: { x: number; y: number }) => ({
        x: cx + (p.x - cx) * Math.cos(ang) - (p.y - cy) * Math.sin(ang),
        y: cy + (p.x - cx) * Math.sin(ang) + (p.y - cy) * Math.cos(ang),
      })
      return { a: rot(s.a), b: rot(s.b) }
    }) ?? []

    layers.set(zKey, {
      z_mm: z,
      baseSegments: base.segments,
      macroSegments: macroSegs,
      microSegments: microSegs,
      totalSegments: base.segments.length + macroSegs.length + microSegs.length,
      warnings: layerWarnings,
    })
  }

  // 4) Cálculo de métricas globais
  const macroPorosity = computeMacroPorosity(macroResult, bbox)
  const microPorosity = microResult?.porosity_pct ?? 0
  const baseMatrixPorosity = (1 - config.baseDensity) * 100

  // Porosidade total: agrega macro + micro + matriz base
  // usando fórmula aditiva com cap de 95% (não pode ser 100% — não há material)
  const totalPor = Math.min(95,
    baseMatrixPorosity + macroPorosity * (1 - baseMatrixPorosity / 100) +
    microPorosity * 0.5 * (1 - baseMatrixPorosity / 100),
  )
  const solidDensity = 100 - totalPor

  // Compliance mecânica
  const minSolid = config.minSolidDensity_pct ?? 15
  const mechanicalOK = solidDensity >= minSolid
  if (!mechanicalOK) {
    warnings.push(
      `Densidade sólida ${solidDensity.toFixed(1)}% < mínimo ` +
      `${minSolid}%. Risco de colapso mecânico.`,
    )
  }
  const maxPor = config.maxTotalPorosity_pct ?? 85
  if (totalPor > maxPor) {
    warnings.push(
      `Porosidade total ${totalPor.toFixed(1)}% excede máximo ${maxPor}%.`,
    )
  }

  // Ratio hierárquico: diâmetro macro / micro deve ser > 3 para arquitetura dual válida
  const hierarchyRatio = (macroResult?.avgDiameter_um ?? 0) / (microResult?.avgSpacing_um ?? 1)
  if (macroResult && microResult && hierarchyRatio < 3) {
    warnings.push(
      `Ratio hierárquico ${hierarchyRatio.toFixed(1)} < 3. Macro e micro estão ` +
      `em escalas próximas — considere aumentar diâmetro macro ou reduzir micro.`,
    )
  }

  // Módulo de compressão estimado (Gibson-Ashby para sólidos celulares):
  //   E/E_s ~ (ρ/ρ_s)²  (celular aberto)
  // Assumindo GelMA 10% E_s ~ 100 kPa
  const E_s_kPa = 100
  const rho_ratio = solidDensity / 100
  const compressiveModulus = E_s_kPa * Math.pow(rho_ratio, 2)

  // Viabilidade estimada: micro com Folkman + baixa shear → +viability
  let viability = 85
  if (microResult?.folkmanCompliance) viability += 7
  if (macroResult && macroResult.vascularEfficiency > 0.8) viability += 3
  if (!mechanicalOK) viability -= 10
  viability = Math.max(50, Math.min(99, viability))

  return {
    layers,
    summary: {
      totalPorosity_pct: totalPor,
      macroPorosity_pct: macroPorosity,
      microPorosity_pct: microPorosity,
      solidDensity_pct: solidDensity,
      folkmanCompliant: microResult?.folkmanCompliance ?? true,
      mechanicalCompliant: mechanicalOK,
      hierarchyRatio,
      estimatedCompressiveModulus_kPa: compressiveModulus,
      estimatedViability_pct: viability,
    },
    macroResult,
    microResult,
    voronoi3DResult: cachedVoronoi,
    perlinResults: perlinResults.size > 0 ? perlinResults : undefined,
    notes,
    warnings,
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER: porosidade macro via fração de área dos canais
// ═══════════════════════════════════════════════════════════════
function computeMacroPorosity(
  macro: MacroChannelResult | undefined,
  bbox: BBox2D,
): number {
  if (!macro) return 0
  // área do canal = soma(comprimento × diâmetro)
  const d_mm = macro.avgDiameter_um / 1000
  const channelArea = macro.totalLength_mm * d_mm
  const totalArea = (bbox.maxX - bbox.minX) * (bbox.maxY - bbox.minY)
  return Math.min(60, (channelArea / totalArea) * 100)
}

// ═══════════════════════════════════════════════════════════════
// PRESETS POR TECIDO — DUAL-POROSITY OTIMIZADO
// ═══════════════════════════════════════════════════════════════

/**
 * OSSO TRABECULAR — dual poro hierárquico:
 *   - Matriz: Voronoi 3D (mimetiza trabéculas)
 *   - Macro: cross-hatch Ø600µm (canais de Havers)
 *   - Micro: stochastic Ø80µm (canais de Volkmann via pore-leaching NaCl)
 */
export function dualPorosityBone(
  customization?: Partial<DualPorosityConfig>,
): DualPorosityConfig {
  return {
    baseStructure: "voronoi_3d",
    baseDensity: 0.25,  // 25% sólido = 75% poroso (osso esponjoso real: 10-30%)
    baseSeed: 42,
    macroEnabled: true,
    macroConfig: recommendMacroChannels("osso trabecular", 10),
    microEnabled: true,
    microConfig: recommendMicroChannels("osso trabecular"),
    minSolidDensity_pct: 15,
    maxTotalPorosity_pct: 85,
    ...customization,
  }
}

/**
 * FÍGADO — dual poro lobular:
 *   - Matriz: Perlin (parênquima irregular)
 *   - Macro: hexagonal Ø500µm (sinusóides — tríade portal)
 *   - Micro: hexagonal_pores Ø100µm (espaços de Disse)
 */
export function dualPorosityLiver(
  customization?: Partial<DualPorosityConfig>,
): DualPorosityConfig {
  return {
    baseStructure: "perlin",
    baseDensity: 0.35,  // maior densidade (parênquima é mais denso que osso)
    baseSeed: 42,
    macroEnabled: true,
    macroConfig: recommendMacroChannels("figado", 5),
    microEnabled: true,
    microConfig: recommendMicroChannels("figado"),
    minSolidDensity_pct: 25,  // maior mínimo (órgão de tecido mole)
    maxTotalPorosity_pct: 75,
    ...customization,
  }
}

/**
 * CARTILAGEM — dual poro anisotrópico:
 *   - Matriz: Gyroid (estrutura mecanicamente forte)
 *   - Macro: sem canais (cartilagem é avascular)
 *   - Micro: directional_aligned (fibras de colágeno orientadas)
 */
export function dualPorosityCartilage(
  customization?: Partial<DualPorosityConfig>,
): DualPorosityConfig {
  return {
    baseStructure: "gyroid",
    baseDensity: 0.5,  // cartilagem: alta densidade, baixa porosidade
    baseSeed: 42,
    macroEnabled: false,  // avascular!
    microEnabled: true,
    microConfig: recommendMicroChannels("cartilagem"),
    minSolidDensity_pct: 30,
    maxTotalPorosity_pct: 60,
    ...customization,
  }
}

/**
 * RIM — dual poro complexo (glomérulo):
 *   - Matriz: Voronoi 3D
 *   - Macro: branching Murray (sistema arcuato)
 *   - Micro: radial capillary (glomérulos)
 */
export function dualPorosityKidney(
  customization?: Partial<DualPorosityConfig>,
): DualPorosityConfig {
  return {
    baseStructure: "voronoi_3d",
    baseDensity: 0.3,
    baseSeed: 42,
    macroEnabled: true,
    macroConfig: recommendMacroChannels("rim", 8),
    microEnabled: true,
    microConfig: recommendMicroChannels("rim"),
    minSolidDensity_pct: 20,
    maxTotalPorosity_pct: 80,
    ...customization,
  }
}

/**
 * Dispatcher de presets por nome de tecido.
 */
export function dualPorosityPresetFor(tissue: string): DualPorosityConfig {
  const t = tissue.toLowerCase()
  if (t.includes("osso") || t.includes("bone")) return dualPorosityBone()
  if (t.includes("figado") || t.includes("hepat") || t.includes("liver")) return dualPorosityLiver()
  if (t.includes("cartilag") || t.includes("menisco")) return dualPorosityCartilage()
  if (t.includes("rim") || t.includes("kidney") || t.includes("renal")) return dualPorosityKidney()
  // default genérico
  return {
    baseStructure: "gyroid",
    baseDensity: 0.3,
    macroEnabled: true,
    macroConfig: recommendMacroChannels(tissue, 5),
    microEnabled: true,
    microConfig: recommendMicroChannels(tissue),
    minSolidDensity_pct: 15,
    maxTotalPorosity_pct: 85,
  }
}
