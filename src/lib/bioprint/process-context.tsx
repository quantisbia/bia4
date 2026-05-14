"use client"

/**
 * BIA — Bioprint Process Context
 *
 * Estado global do processo de bioimpressão em 4 etapas:
 *   1. MODEL  — modelo 3D (upload ou gerado)
 *   2. BIOINK — formulação da biotinta
 *   3. SLICE  — parâmetros de fatiamento + G-code
 *   4. CONTROL — execução na bioimpressora
 *
 * Persistido em sessionStorage para sobreviver navegação entre etapas
 * sem precisar de DB. Cada etapa atualiza só seu próprio slice.
 *
 * Convenção: status de cada etapa pode ser "empty" | "draft" | "ready"
 * — o stepper visual usa esses estados para mostrar progresso.
 */

import {
  createContext, useContext, useEffect, useState, useCallback,
  type ReactNode,
} from "react"

// ─── Tipos de cada etapa ────────────────────────────────────────────────

export type StepStatus = "empty" | "draft" | "ready"

/** Categoria de modelo 3D — 5 buckets conforme reestruturação */
export type ModelCategory =
  | "soft-tissue"          // Tecidos moles (esferóide, vaso, patch cardíaco, fígado)
  | "rigid-tissue"         // Tecidos rígidos (osso, cartilagem, auricular)
  | "biomimetic-tpms"      // Geometrias TPMS (Gyroid, Schwarz P, Diamond)
  | "printability-test"    // Testes de imprimibilidade
  | "organoid-vascular"    // Organoides + estratégias de vascularização

/** Fonte do modelo 3D */
export type ModelSource = "upload" | "generated" | "ai-prompt"

export interface ModelStepState {
  status: StepStatus
  source: ModelSource | null
  /** Nome do arquivo (se upload) ou ID da geometria (se gerado) */
  name: string | null
  /** Categoria quando gerado */
  category: ModelCategory | null
  /** ID interno (chave em BIOMIMETIC_GEOMETRIES ou geometria clássica) */
  geometryId: string | null
  /** Parâmetros usados na geração (se gerado) */
  params: Record<string, number | string | boolean> | null
  /** Stats opcionais do mesh */
  stats: {
    triangles?: number
    volumeMm3?: number
    surfaceMm2?: number
    bboxMm?: { x: number; y: number; z: number }
  } | null
  /** Validação opcional */
  validation: {
    isManifold?: boolean
    hasDegenerate?: boolean
    issues?: string[]
  } | null
}

export interface BioinkStepState {
  status: StepStatus
  /** Nome do material principal (GelMA, Alginato, Colágeno, ...) */
  material: string | null
  /** Concentração % w/v */
  concentration: number | null
  /** Crosslinker */
  crosslinker: string | null
  crosslinkerConc: number | null
  /** Tipo celular (chave de CELL_SENSITIVITY) */
  cellType: string | null
  cellDensityMillionMl: number | null
  /** Aditivos opcionais */
  additives: string[]
  /** Propriedades reológicas calculadas/preenchidas */
  rheology: {
    viscosityPaS?: number
    flowIndex?: number       // n da power-law
    consistencyK?: number    // K da power-law
    yieldStressPa?: number
  } | null
}

export interface SliceStepState {
  status: StepStatus
  /** Parâmetros principais do slicer */
  layerHeightMm: number | null
  printSpeedMmS: number | null
  pressureKPa: number | null
  nozzleDiameterUm: number | null
  /** Padrão BIO de infill (id de INFILL_PATTERNS) */
  infillPatternId: string | null
  infillPercent: number | null
  /** Temperaturas */
  cartridgeTempC: number | null
  bedTempC: number | null
  chamberTempC: number | null
  /** Outros */
  skirtLoops: number | null
  retractionMm: number | null
  /** G-code gerado */
  gcode: string | null
  /** Estimativas */
  estimate: {
    totalLayers?: number
    estimatedTimeMin?: number
    estimatedVolumeMl?: number
  } | null
}

export interface ControlStepState {
  status: StepStatus
  /** Tipo de tecido alvo (chave em POST_PROCESSING) */
  tissueType: string | null
  /** Se a impressora já está conectada (futuro WebSerial) */
  connected: boolean
}

// ─── Estado global ──────────────────────────────────────────────────────

export interface BioprintProcessState {
  model: ModelStepState
  bioink: BioinkStepState
  slice: SliceStepState
  control: ControlStepState
}

const DEFAULT_STATE: BioprintProcessState = {
  model: {
    status: "empty",
    source: null,
    name: null,
    category: null,
    geometryId: null,
    params: null,
    stats: null,
    validation: null,
  },
  bioink: {
    status: "empty",
    material: null,
    concentration: null,
    crosslinker: null,
    crosslinkerConc: null,
    cellType: null,
    cellDensityMillionMl: null,
    additives: [],
    rheology: null,
  },
  slice: {
    status: "empty",
    layerHeightMm: null,
    printSpeedMmS: null,
    pressureKPa: null,
    nozzleDiameterUm: null,
    infillPatternId: null,
    infillPercent: null,
    cartridgeTempC: null,
    bedTempC: null,
    chamberTempC: null,
    skirtLoops: null,
    retractionMm: null,
    gcode: null,
    estimate: null,
  },
  control: {
    status: "empty",
    tissueType: null,
    connected: false,
  },
}

// ─── Context API ────────────────────────────────────────────────────────

export interface BioprintProcessContextValue {
  state: BioprintProcessState
  updateModel: (patch: Partial<ModelStepState>) => void
  updateBioink: (patch: Partial<BioinkStepState>) => void
  updateSlice: (patch: Partial<SliceStepState>) => void
  updateControl: (patch: Partial<ControlStepState>) => void
  resetStep: (step: keyof BioprintProcessState) => void
  resetAll: () => void
  /** Próxima etapa "pronta para entrar" baseada nos status */
  nextStep: keyof BioprintProcessState
}

const BioprintProcessContext = createContext<BioprintProcessContextValue | null>(null)

const STORAGE_KEY = "bia.bioprint.process.v1"

export function BioprintProcessProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BioprintProcessState>(DEFAULT_STATE)
  const [hydrated, setHydrated] = useState(false)

  // Hidratar do sessionStorage (se houver)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<BioprintProcessState>
        // Merge defensivo: garantir que todos os slices existam
        setState({
          model:   { ...DEFAULT_STATE.model,   ...(parsed.model   ?? {}) },
          bioink:  { ...DEFAULT_STATE.bioink,  ...(parsed.bioink  ?? {}) },
          slice:   { ...DEFAULT_STATE.slice,   ...(parsed.slice   ?? {}) },
          control: { ...DEFAULT_STATE.control, ...(parsed.control ?? {}) },
        })
      }
    } catch {
      /* sessionStorage indisponível (SSR) ou JSON corrompido — usa default */
    }
    setHydrated(true)
  }, [])

  // Persistir mudanças (só depois de hidratar para não sobrescrever)
  useEffect(() => {
    if (!hydrated) return
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* sessionStorage cheio ou bloqueado — ignora */
    }
  }, [state, hydrated])

  const updateModel = useCallback((patch: Partial<ModelStepState>) => {
    setState((prev) => ({ ...prev, model: { ...prev.model, ...patch } }))
  }, [])

  const updateBioink = useCallback((patch: Partial<BioinkStepState>) => {
    setState((prev) => ({ ...prev, bioink: { ...prev.bioink, ...patch } }))
  }, [])

  const updateSlice = useCallback((patch: Partial<SliceStepState>) => {
    setState((prev) => ({ ...prev, slice: { ...prev.slice, ...patch } }))
  }, [])

  const updateControl = useCallback((patch: Partial<ControlStepState>) => {
    setState((prev) => ({ ...prev, control: { ...prev.control, ...patch } }))
  }, [])

  const resetStep = useCallback((step: keyof BioprintProcessState) => {
    setState((prev) => ({ ...prev, [step]: DEFAULT_STATE[step] }))
  }, [])

  const resetAll = useCallback(() => {
    setState(DEFAULT_STATE)
  }, [])

  // Calcula próxima etapa pendente (primeiro slice que não está "ready")
  const nextStep: keyof BioprintProcessState =
    state.model.status   !== "ready" ? "model" :
    state.bioink.status  !== "ready" ? "bioink" :
    state.slice.status   !== "ready" ? "slice" :
    "control"

  const value: BioprintProcessContextValue = {
    state,
    updateModel,
    updateBioink,
    updateSlice,
    updateControl,
    resetStep,
    resetAll,
    nextStep,
  }

  return (
    <BioprintProcessContext.Provider value={value}>
      {children}
    </BioprintProcessContext.Provider>
  )
}

/** Hook para usar o context — lança erro se chamado fora do Provider */
export function useBioprintProcess(): BioprintProcessContextValue {
  const ctx = useContext(BioprintProcessContext)
  if (!ctx) {
    throw new Error(
      "[BIA] useBioprintProcess deve ser chamado dentro de <BioprintProcessProvider>. " +
      "Envolva sua árvore de páginas em /dashboard/bioprint com o Provider."
    )
  }
  return ctx
}

// ─── Helpers utilitários ────────────────────────────────────────────────

/** Retorna label visual da categoria de modelo */
export function modelCategoryLabel(c: ModelCategory): string {
  return {
    "soft-tissue":        "Tecidos moles",
    "rigid-tissue":       "Tecidos rígidos",
    "biomimetic-tpms":    "Biomiméticos (TPMS)",
    "printability-test":  "Testes de imprimibilidade",
    "organoid-vascular":  "Organoides e vascularização",
  }[c]
}

/** Retorna label visual de cada etapa */
export const STEP_LABELS = {
  model:   "Modelo 3D",
  bioink:  "Biotinta",
  slice:   "Fatiamento",
  control: "Execução",
} as const

/** Retorna se a etapa anterior está pronta (gate para avançar) */
export function isStepUnlocked(
  step: keyof BioprintProcessState,
  state: BioprintProcessState
): boolean {
  switch (step) {
    case "model":   return true
    case "bioink":  return state.model.status === "ready"
    case "slice":   return state.bioink.status === "ready"
    case "control": return state.slice.status === "ready"
  }
}
