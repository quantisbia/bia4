/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R16 · Laboratório de Biotintas — Tipos
 *  ─────────────────────────────────────────────────────────────────────
 *  Filosofia: o usuário escolhe DECISÕES (objetivo, células, equipamento),
 *  não parâmetros. A BIA devolve uma RECEITA validada na literatura, a
 *  posição na JANELA DE BIOFABRICAÇÃO, o PROTOCOLO de bancada com volumes
 *  calculados e um guia de TROUBLESHOOTING.
 *
 *  Lib pura (zero DOM). Fontes principais:
 *   · Gao 2018 Biofabrication — tan δ 0,25–0,45 ótimo p/ gelatina-alginato
 *   · Elango 2025 Gels — faixas: η 10²–10⁴ mPa·s, τy 10–10³ Pa, tan δ 0,1–1
 *   · Ribeiro 2017 — yield stress × fidelidade; Ouyang 2016 — Pr
 *   · Blaeser 2016 — shear ≤ 5 kPa preserva viabilidade
 *   · CELLINK GelMA/Alginate protocols 2020-2023; Allevi GelMA; AdvBioMatrix
 *   · Cavallo 2025 Molecules — gelatina 15 % / alginato 6 % / CaCl₂ 150 mM
 *   · Hinton 2015 / Lee 2019 — FRESH; Kolesky 2014 — Pluronic sacrificial
 * ═══════════════════════════════════════════════════════════════════════
 */

export type Goal =
  | "learn"          // primeira vez / treino / calibração
  | "skin"
  | "cartilage"
  | "bone"
  | "vascular"
  | "liver"
  | "neural"
  | "organoid"
  | "cardiac"
  | "generic_cells"  // encapsular células genéricas (modelo in vitro)

export type CellTypeId =
  | "none" | "fibroblast" | "keratinocyte" | "chondrocyte" | "osteoblast" | "msc"
  | "huvec" | "hepatocyte" | "cardiomyocyte" | "neuron" | "ipsc" | "tumor"

export type CrosslinkKind = "ionic" | "photo" | "thermal" | "enzymatic" | "none" | "sacrificial"

export type Equipment = {
  /** Tem fonte de luz 365/405 nm (ou módulo UV na impressora)? */
  hasLight: boolean
  /** Cabeçote com controle térmico (aquece/refrigera a seringa)? */
  hasTempHead: boolean
  /** Mesa aquecida/refrigerada? */
  hasTempBed: boolean
  /** Agulha disponível (diâmetro interno mm). */
  nozzle_mm: number
}

export interface Component {
  name: string
  /** % w/v final na biotinta (ou mg/mL quando unit = "mg/mL", ou mM) */
  amount: number
  unit: "%w/v" | "mg/mL" | "mM" | "U/mL" | "%v/v"
  role: "polymer" | "crosslinker" | "photoinitiator" | "thickener" | "bioactive" | "solvent" | "cells"
  /** Função na receita — explicação curta pt-BR */
  why: string
  /** Alternativa aceitável, se houver */
  substitute?: string
}

export interface PrepStep {
  title: string
  detail: string
  /** tempo estimado (min) */
  minutes?: number
  /** temperatura (°C) */
  temp_C?: number
  /** alerta crítico */
  critical?: boolean
}

export interface RheologyEstimate {
  viscosity_PaS: number       // a ~10 s⁻¹, temperatura de impressão
  yieldStress_Pa: number
  gPrime_Pa: number
  tanDelta: number
  powerLawN: number           // n < 1 → shear-thinning
}

export interface Recipe {
  id: string
  name: string
  short: string
  /** nível: começar aqui × requer prática */
  level: "starter" | "intermediate" | "advanced"
  goals: Goal[]
  /** células que funcionam bem */
  cellsOk: CellTypeId[]
  crosslink: CrosslinkKind
  requires: Partial<Equipment>
  components: Component[]
  /** temperatura de impressão recomendada (°C) e mesa */
  printTemp_C: number
  bedTemp_C: number | null
  /** janela de tempo em que a biotinta permanece imprimível após preparo (min) */
  printWindow_min: [number, number]
  /** janela de tempo/estabilidade com células fora da incubadora (min) */
  cellWindow_min: number
  rheology: RheologyEstimate
  /** parâmetros iniciais que "dão certo" nesta receita */
  startParams: {
    nozzle_mm: number
    speed_mms: number
    layerHeight_mm: number
    pressure_kPa?: [number, number]
    flowPercent: number
  }
  crosslinkProtocol: PrepStep[]
  prep: PrepStep[]
  /** densidade celular recomendada (10⁶ cel/mL) */
  cellDensity_Mml: [number, number]
  /** fração de diluição ao adicionar células (ex.: 10 partes biotinta + 1 parte suspensão) */
  cellMixRatio: string
  sterilization: string
  shelfLife: string
  pros: string[]
  cons: string[]
  references: Array<{ label: string; doi?: string; url?: string }>
  /** mapeia para os ids de material do pipeline existente (process-context / slicer intent) */
  pipelineMaterialId: string
  pipelineMaterialLabel: string
  pipelineCrosslinker: string
}

export interface WindowPoint {
  /** 0–100: eixo "fidelidade de forma" */
  fidelity: number
  /** 0–100: eixo "viabilidade/bioatividade" */
  viability: number
  /** dentro da janela de biofabricação? */
  inWindow: boolean
  zone: "sweet" | "too_soft" | "too_stiff" | "too_fast" | "ok"
  notes: string[]
}

export interface BenchPlan {
  totalVolume_mL: number
  /** volume de biotinta sem células e volume de suspensão celular */
  bioinkVolume_mL: number
  cellSuspension_mL: number
  cellsNeeded_M: number | null
  /** massas/volumes por componente */
  lines: Array<{ name: string; value: string; note?: string }>
  /** volume morto estimado (agulha+cartucho) e sobra */
  deadVolume_mL: number
  perSyringe_mL: number
  syringes: number
}

export interface TroubleItem {
  id: string
  symptom: string
  likelyCauses: string[]
  fixes: string[]
  /** parâmetro do slicer/host a ajustar e direção */
  knob?: { param: string; direction: "up" | "down"; amount: string }
}
