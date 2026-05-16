"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA — Etapa 3 / 4 · Fatiamento (slicing + G-code)
 *  ───────────────────────────────────────────────────────────────────────
 *  Unifica em uma única tela:
 *    A. PARÂMETROS — bioprinter + layer height + speed + pressão + bico + infill
 *    B. MULTI-POÇO  — placas SBS 6/12/24/48/96/384 (opcional)
 *    C. G-CODE      — preview do código + download + estatísticas
 *
 *  LÊ:  state.model (geometria, params) + state.bioink (material, conc, cells)
 *  ESCREVE: state.slice (parâmetros + gcode + estimate)
 *
 *  Substitui /dashboard/bioprinting/engine + tab slicer de /bioprinting.
 *  Usa motor real /api/gcode/generate (engine validado + auditoria + créditos).
 *
 *  Pré-requisito: state.model.status === "ready" && state.bioink.status === "ready"
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import {
  Layers, Wrench, FileCode2, Printer, Settings2, Loader2, Sparkles,
  ArrowRight, AlertTriangle, CheckCircle2, Info, Download, Copy,
  Wind, Thermometer, Target, BarChart3, Clock, Droplets, Activity,
  Beaker, Zap, AlertCircle, ChevronDown, ChevronRight, Microscope,
  Lightbulb, ShieldAlert,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { useBioprintProcess } from "@/lib/bioprint/process-context"
import { INFILL_PATTERNS, TEMPERATURE_PROFILES } from "@/lib/bioprinter/biomedical-params"
import { BIOPRINTERS, getBioprinterById, supportsWebSerial } from "@/lib/bioprinting/bioprinters"
import { SUPPORTED_GEOMETRY_IDS } from "@/lib/gcode/slicer/geometry-bounds"
import { TissueDesigner, type TissueDesignerValue } from "@/components/bioprinting/TissueDesigner"
import { PrinterConnection } from "@/components/bioprinting/PrinterConnection"

// Timeout máximo de geração — evita rodar para sempre se o engine travar
const GCODE_TIMEOUT_MS = 45_000

// ─── Mapeamento material BIA → algoritmo padrão do engine ────────────────
// O motor /api/gcode/generate aceita algoritmos enum específicos.
const ENGINE_ALGORITHMS = [
  { id: "gyroid_tpms",   name: "Gyroid TPMS",        category: "paramétrico",     icon: "🌀",  bestFor: ["osso", "cartilagem", "vascularização"] },
  { id: "voronoi_3d",    name: "Voronoi 3D",          category: "não-paramétrico", icon: "🕸️",  bestFor: ["osso trabecular", "scaffolds biomiméticos"] },
  { id: "voronoi_2d",    name: "Voronoi 2D",          category: "não-paramétrico", icon: "🔷",  bestFor: ["pele", "membranas finas"] },
  { id: "perlin_noise",  name: "Perlin (orgânico)",   category: "não-paramétrico", icon: "🌫️",  bestFor: ["fígado", "parênquima"] },
  { id: "gradient",      name: "Gradient",            category: "paramétrico",     icon: "📈",  bestFor: ["pele", "vascularização radial"] },
  { id: "rectilinear",   name: "Rectilinear",         category: "paramétrico",     icon: "┼",    bestFor: ["scaffolds simples", "MVP"] },
  { id: "linear",        name: "Linear",              category: "paramétrico",     icon: "≡",    bestFor: ["pele fina", "córnea"] },
  { id: "honeycomb",     name: "Honeycomb",           category: "paramétrico",     icon: "🔶",  bestFor: ["osso", "regeneração"] },
  { id: "concentric",    name: "Concêntrico",         category: "paramétrico",     icon: "◎",    bestFor: ["córnea", "lente"] },
  { id: "schwarz_p",     name: "Schwarz P (TPMS)",   category: "paramétrico",     icon: "🧊",  bestFor: ["scaffolds volumosos"] },
  { id: "diamond_tpms",  name: "Diamond (TPMS)",     category: "paramétrico",     icon: "💎",  bestFor: ["alta resistência"] },
] as const

type EngineAlgorithm = typeof ENGINE_ALGORITHMS[number]["id"]

// Heurística de material da biotinta → perfil de temperatura do biomedical-params
function pickTempProfile(materialLabel: string | null) {
  if (!materialLabel) return TEMPERATURE_PROFILES[0]
  const lower = materialLabel.toLowerCase()
  if (lower.includes("gelma") || lower.includes("gelatina")) return TEMPERATURE_PROFILES.find(p => p.bioinkType.toLowerCase().includes("gelma")) ?? TEMPERATURE_PROFILES[0]
  if (lower.includes("alginato") || lower.includes("alginate")) return TEMPERATURE_PROFILES.find(p => p.bioinkType.toLowerCase().includes("alginato")) ?? TEMPERATURE_PROFILES[0]
  if (lower.includes("colágeno") || lower.includes("colageno") || lower.includes("collagen")) return TEMPERATURE_PROFILES.find(p => p.bioinkType.toLowerCase().includes("colágeno")) ?? TEMPERATURE_PROFILES[0]
  if (lower.includes("fibrin")) return TEMPERATURE_PROFILES.find(p => p.bioinkType.toLowerCase().includes("fibrina")) ?? TEMPERATURE_PROFILES[0]
  if (lower.includes("pegda") || lower.includes("pegma")) return TEMPERATURE_PROFILES.find(p => p.bioinkType.toLowerCase().includes("pegda")) ?? TEMPERATURE_PROFILES[0]
  if (lower.includes("decm")) return TEMPERATURE_PROFILES.find(p => p.bioinkType.toLowerCase().includes("decm")) ?? TEMPERATURE_PROFILES[0]
  if (lower.includes("pluronic")) return TEMPERATURE_PROFILES.find(p => p.bioinkType.toLowerCase().includes("pluronic")) ?? TEMPERATURE_PROFILES[0]
  return TEMPERATURE_PROFILES[0]
}

// Heurística de algoritmo recomendado baseado em categoria do modelo + tipo celular
function recommendAlgorithm(category: string | null, hasCells: boolean): EngineAlgorithm {
  if (category === "rigid-tissue") return "gyroid_tpms"
  if (category === "biomimetic-tpms") return "gyroid_tpms"
  if (category === "organoid-vascular") return "voronoi_3d"
  if (category === "printability-test") return "rectilinear"
  if (category === "soft-tissue" && hasCells) return "gradient"
  return "gyroid_tpms"
}

// ─── Tipo do resultado do engine ────────────────────────────────────────────
interface GCodeResponse {
  success: boolean
  jobName: string
  jobId: string
  gcode: string
  totalLines?: number
  estimatedTime_min: number
  bioinkVolume_uL: number
  layerCount: number
  wellsUsed?: string[]
  warnings?: string[]
  stats?: {
    viabilityEstimate_pct?: number
    shearStressMax_Pa?: number
    totalMoves?: number
  }
  summary?: {
    bioprinter: string
    bioink: string
    algorithm: string
    wellsCount: number
    layerCount: number
    estimatedTime: string
    volume: string
    viability: string
  }
  creditsUsed: number
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
export default function BioprintSlicePage() {
  const { state, updateSlice } = useBioprintProcess()

  // Pré-requisitos
  const modelReady = state.model.status === "ready"
  const bioinkReady = state.bioink.status === "ready"
  const isUnlocked = modelReady && bioinkReady

  // ── Tab atual ──
  const [tab, setTab] = useState<"tissue" | "params" | "wells" | "gcode">("tissue")

  // ── TissueDesigner (R10) ─ perfil biomimético inteligente ──
  const [tissueDesign, setTissueDesign] = useState<TissueDesignerValue>({
    profileId: null,
    pattern: null,
  })

  // ── Parâmetros do slicer ──
  // Inicializa do state.slice (se houver) ou de defaults conservadores
  const [bioprinterId, setBioprinterId] = useState<string>("cellink_biox")
  const [algorithm, setAlgorithm] = useState<EngineAlgorithm>(
    () => recommendAlgorithm(state.model.category, !!state.bioink.cellType)
  )

  // Recomendar perfil térmico baseado na biotinta
  const recommendedProfile = useMemo(() => pickTempProfile(state.bioink.material), [state.bioink.material])

  const [layerHeightMm, setLayerHeightMm] = useState<number>(state.slice.layerHeightMm ?? 0.25)
  const [printSpeedMmS, setPrintSpeedMmS] = useState<number>(state.slice.printSpeedMmS ?? 8)
  const [pressureKPa, setPressureKPa] = useState<number>(state.slice.pressureKPa ?? 80)
  const [nozzleDiameterUm, setNozzleDiameterUm] = useState<number>(state.slice.nozzleDiameterUm ?? 410)
  const [infillPercent, setInfillPercent] = useState<number>(state.slice.infillPercent ?? 30)
  const [infillPatternId, setInfillPatternId] = useState<string>(state.slice.infillPatternId ?? INFILL_PATTERNS[0].id)
  const [walls, setWalls] = useState<number>(2)
  const [skirtLoops, setSkirtLoops] = useState<number>(state.slice.skirtLoops ?? 2)
  const [retractionMm, setRetractionMm] = useState<number>(state.slice.retractionMm ?? 0)

  // Temperaturas — sugestão automática do perfil mas editável
  const [cartridgeTempC, setCartridgeTempC] = useState<number>(
    state.slice.cartridgeTempC ?? recommendedProfile.cartridgeTempC.ideal
  )
  const [bedTempC, setBedTempC] = useState<number>(
    state.slice.bedTempC ?? recommendedProfile.bedTempC.ideal
  )
  const [chamberTempC, setChamberTempC] = useState<number>(
    state.slice.chamberTempC ?? recommendedProfile.chamberTempC.ideal
  )

  // ── Multi-poço (opcional) ──
  const [useMultiWell, setUseMultiWell] = useState<boolean>(false)
  const [plateFormat, setPlateFormat] = useState<6 | 12 | 24 | 48 | 96 | 384>(24)
  const [selectedWells, setSelectedWells] = useState<string[]>(["A1"])
  const [zHopBetweenWellsMm, setZHopBetweenWellsMm] = useState<number>(5)
  const [pauseBetweenWellsS, setPauseBetweenWellsS] = useState<number>(2)
  const [purgeVolumeUL, setPurgeVolumeUL] = useState<number>(1)

  // ── Estado de geração ──
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ message: string; details?: string; suggestions?: string[] } | null>(null)
  const [result, setResult] = useState<GCodeResponse | null>(
    state.slice.gcode
      ? {
          success: true,
          jobName: "biprint_local",
          jobId: "cached",
          gcode: state.slice.gcode,
          estimatedTime_min: state.slice.estimate?.estimatedTimeMin ?? 0,
          bioinkVolume_uL: (state.slice.estimate?.estimatedVolumeMl ?? 0) * 1000,
          layerCount: state.slice.estimate?.totalLayers ?? 0,
          creditsUsed: 0,
        }
      : null
  )

  // ── Preview do bioprinter selecionado ──
  const currentPrinter = useMemo(() => getBioprinterById(bioprinterId), [bioprinterId])

  // Quando o material muda no state.bioink, ajustar perfil de temperatura sugerido
  useEffect(() => {
    setCartridgeTempC(recommendedProfile.cartridgeTempC.ideal)
    setBedTempC(recommendedProfile.bedTempC.ideal)
    setChamberTempC(recommendedProfile.chamberTempC.ideal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.bioink.material])

  // Persistir parâmetros no context (sem o gcode, que é separado)
  useEffect(() => {
    if (!isUnlocked) return
    updateSlice({
      // status só vira "ready" quando G-code é gerado com sucesso
      status: result ? "ready" : "draft",
      layerHeightMm,
      printSpeedMmS,
      pressureKPa,
      nozzleDiameterUm,
      infillPatternId,
      infillPercent,
      cartridgeTempC,
      bedTempC,
      chamberTempC,
      skirtLoops,
      retractionMm,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isUnlocked,
    layerHeightMm, printSpeedMmS, pressureKPa, nozzleDiameterUm,
    infillPatternId, infillPercent, cartridgeTempC, bedTempC, chamberTempC,
    skirtLoops, retractionMm, result,
  ])

  // ── Helper: gera lista de sugestões contextuais quando há falha ──
  const buildSuggestions = useCallback((reason: "geometry-unsupported" | "validation" | "engine" | "timeout" | "auth"): string[] => {
    const out: string[] = []
    const gid = state.model.geometryId ?? ""

    if (reason === "geometry-unsupported") {
      out.push(
        `A geometria "${gid}" ainda não tem caminho 3D otimizado no engine BIA. Use uma das geometrias com suporte completo:`,
        "• disk (Ø10mm × 3mm) — teste rápido de printabilidade",
        "• membrane (30×30×2 mm) — pele/derme",
        "• cube_tissue (20×20×10 mm) — bloco de tecido",
        "• tpms_gyroid (20×20×20 mm) — scaffold ósseo",
        "• organoid_sphere (Ø10mm) — organoide",
      )
      return out
    }

    if (reason === "validation") {
      out.push(
        "Algum parâmetro está fora da faixa aceita. Verifique:",
        `• Layer height entre 0.05 e 1.0 mm (atual: ${layerHeightMm})`,
        `• Pressão entre 5 e 700 kPa (atual: ${pressureKPa})`,
        `• Speed entre 1 e 50 mm/s (atual: ${printSpeedMmS})`,
        `• Nozzle entre 100 e 1500 µm (atual: ${nozzleDiameterUm})`,
        `• Infill entre 0 e 100% (atual: ${infillPercent})`,
      )
      return out
    }

    if (reason === "timeout") {
      out.push(
        "A geração demorou mais que 45 segundos — provavelmente a geometria está muito grande ou complexa.",
        "Tente reduzir os parâmetros:",
        "• Diminua o tamanho do modelo na Etapa 1 (ex: TPMS 20×20×20 → 10×10×10 mm)",
        "• Aumente layer height (ex: 0.25 → 0.40 mm) — reduz nº de camadas",
        "• Reduza infill (ex: 30% → 15%)",
        "• Para Voronoi 3D em construtos > 30mm, prefira gyroid_tpms (mais rápido)",
      )
      return out
    }

    if (reason === "auth") {
      out.push(
        "Sessão expirou ou créditos insuficientes (6 créditos por geração).",
        "• Faça login novamente",
        "• Verifique seus créditos em /dashboard/billing",
      )
      return out
    }

    // engine error genérico — sugestões baseadas em contexto
    out.push("Algumas dicas para a próxima tentativa:")
    if (state.bioink.cellType && pressureKPa > 100) {
      out.push(`⚠️ Pressão ${pressureKPa} kPa é alta para células vivas. Reduza para 30–80 kPa.`)
    }
    if (nozzleDiameterUm < 250 && state.bioink.cellType) {
      out.push(`⚠️ Bico ${nozzleDiameterUm}µm muito fino para células. Use 410µm (22G) ou 580µm (20G).`)
    }
    if (printSpeedMmS > 20 && state.bioink.cellType) {
      out.push(`⚠️ Speed ${printSpeedMmS}mm/s alto para células. Use 5–10 mm/s.`)
    }
    if (layerHeightMm > nozzleDiameterUm / 1000 * 0.8) {
      out.push(`⚠️ Layer height ${layerHeightMm}mm > 80% do bico. Use ${(nozzleDiameterUm / 1000 * 0.5).toFixed(2)} mm.`)
    }
    if (useMultiWell && selectedWells.length === 0) {
      out.push("⚠️ Multi-poço ativado mas nenhum poço selecionado. Vá na tab Multi-poço.")
    }
    if (algorithm === "voronoi_3d" && infillPercent > 50) {
      out.push("⚠️ Voronoi 3D com infill > 50% gera trabéculas muito densas. Tente 25–40%.")
    }
    if (out.length === 1) {
      // nenhum aviso específico — sugestão padrão segura
      out.push(
        "• Tente o algoritmo padrão: gyroid_tpms com infill 30%, layer 0.25mm, speed 8mm/s",
        "• Use um modelo simples (disk Ø10mm × 3mm) para validar antes",
        "• Verifique que sua geometria está entre as 20 suportadas pelo engine",
      )
    }
    return out
  }, [
    state.model.geometryId, state.bioink.cellType, layerHeightMm, pressureKPa,
    printSpeedMmS, nozzleDiameterUm, infillPercent, useMultiWell,
    selectedWells.length, algorithm,
  ])

  // ── Geração de G-code ──
  const generateGCode = useCallback(async () => {
    if (!isUnlocked) {
      setError({ message: "Complete as etapas 1 (Modelo) e 2 (Biotinta) antes de gerar G-code." })
      return
    }
    if (!state.model.geometryId) {
      setError({
        message: "Modelo 3D não tem geometryId — verifique a Etapa 1.",
        suggestions: ["Volte para /dashboard/bioprint/model e selecione/gere um modelo válido."],
      })
      return
    }

    // Pré-check: geometria está mapeada no engine de bounds?
    if (!(SUPPORTED_GEOMETRY_IDS as readonly string[]).includes(state.model.geometryId)) {
      setError({
        message: `A geometria "${state.model.geometryId}" não tem caminho 3D otimizado.`,
        details: "Engine vai usar um fallback genérico (disk Ø20mm × 5mm), o que pode não representar fielmente o modelo.",
        suggestions: buildSuggestions("geometry-unsupported"),
      })
      // Não bloqueia — apenas avisa. Continua se usuário insistir.
    }

    setLoading(true)
    setError(null)
    setResult(null)

    // AbortController para timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), GCODE_TIMEOUT_MS)

    try {
      // ─ Geometry: id + params do state.model ─
      const geomParams: Record<string, number> = {}
      if (state.model.params) {
        for (const [k, v] of Object.entries(state.model.params)) {
          if (typeof v === "number") geomParams[k] = v
        }
      }

      // ─ Bioink payload (formato esperado pelo /api/gcode/generate) ─
      const bioinkPayload = {
        material: state.bioink.material ?? "Custom",
        concentration: state.bioink.concentration ?? 5,
        hasCells: !!state.bioink.cellType,
        cellDensity: state.bioink.cellDensityMillionMl ?? undefined,
        viscosity_cP: state.bioink.rheology?.viscosityPaS
          ? state.bioink.rheology.viscosityPaS * 1000  // Pa·s → cP
          : 1500,
        crosslinker: state.bioink.crosslinker ?? undefined,
        temperature_c: cartridgeTempC,
        pressure_kpa: pressureKPa,
        shearStressMax_Pa: 50,
        nozzleDiameter_um: nozzleDiameterUm,
        flowMultiplier: 1.0,
        retraction_mm: retractionMm,
        printSpeed_mms: printSpeedMmS,
        travelSpeed_mms: 50,
      }

      // ─ WellPlate (opcional) ─
      const wellPlatePayload = useMultiWell
        ? {
            format: plateFormat,
            selectedWells,
            replicationMode: "same" as const,
            zHopBetweenWells_mm: zHopBetweenWellsMm,
            pauseBetweenWells_s: pauseBetweenWellsS,
            purgeVolume_uL: purgeVolumeUL,
            wipeTowerEnabled: false,
          }
        : undefined

      const body = {
        geometry: { id: state.model.geometryId, params: geomParams },
        infill: {
          algorithm,
          infillPercent,
          macroPorosity: {
            density: 1 - infillPercent / 100,
            poreSize_um: 450,
          },
        },
        bioink: bioinkPayload,
        bioprinterId,
        layerHeight_mm: layerHeightMm,
        walls,
        skirtLoops,
        wellPlate: wellPlatePayload,
        tissue: state.model.category ?? "tecido",
        application: "scaffold",
        jobName: `bia_${state.model.geometryId}_${algorithm}`,
      }

      const res = await fetch("/api/gcode/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      let data: { error?: string; details?: unknown; gcode?: string; layerCount?: number; estimatedTime_min?: number; bioinkVolume_uL?: number; success?: boolean } & Partial<GCodeResponse>
      try {
        data = await res.json()
      } catch {
        throw new Error("Resposta do servidor inválida (não-JSON). Engine pode ter caído — tente novamente em 30 segundos.")
      }

      if (!res.ok) {
        // Auth/credits
        if (res.status === 401) {
          setError({
            message: "Não autenticado — sessão expirou.",
            suggestions: buildSuggestions("auth"),
          })
          return
        }
        if (res.status === 402 || (data.error || "").toLowerCase().includes("crédito")) {
          setError({
            message: data.error || "Créditos insuficientes (6 por geração).",
            suggestions: buildSuggestions("auth"),
          })
          return
        }
        // Validação Zod
        if (res.status === 400 && data.details) {
          setError({
            message: data.error || "Dados inválidos enviados ao engine.",
            details: typeof data.details === "object"
              ? JSON.stringify(data.details, null, 2).slice(0, 500)
              : String(data.details).slice(0, 500),
            suggestions: buildSuggestions("validation"),
          })
          return
        }
        // Erro do engine (5xx ou outro 4xx)
        setError({
          message: data.error || `Erro ${res.status} do engine`,
          suggestions: buildSuggestions("engine"),
        })
        return
      }

      // Sanity check do resultado
      if (!data.gcode || (data.layerCount ?? 0) === 0) {
        setError({
          message: "Engine retornou G-code vazio ou sem camadas.",
          details: `O motor calculou ${data.layerCount ?? 0} camadas para a geometria "${state.model.geometryId}". Isso normalmente indica que a geometria não tem bounds válidos no slicer.`,
          suggestions: buildSuggestions("geometry-unsupported"),
        })
        return
      }

      setResult(data as GCodeResponse)
      // Persistir gcode + estimate
      updateSlice({
        status: "ready",
        gcode: data.gcode ?? null,
        estimate: {
          totalLayers: data.layerCount ?? 0,
          estimatedTimeMin: data.estimatedTime_min ?? 0,
          estimatedVolumeMl: data.bioinkVolume_uL ? data.bioinkVolume_uL / 1000 : undefined,
        },
      })
      // Pular para tab G-code
      setTab("gcode")
    } catch (err) {
      clearTimeout(timeoutId)
      // Timeout/abort
      if (err instanceof Error && err.name === "AbortError") {
        setError({
          message: `Geração cancelada — passou de ${GCODE_TIMEOUT_MS / 1000}s.`,
          details: "O engine pode estar processando uma geometria muito complexa. Veja as sugestões abaixo para simplificar.",
          suggestions: buildSuggestions("timeout"),
        })
        return
      }
      const msg = err instanceof Error ? err.message : "Erro inesperado"
      setError({
        message: msg,
        suggestions: buildSuggestions("engine"),
      })
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [
    isUnlocked, state.model, state.bioink, algorithm, infillPercent,
    bioprinterId, layerHeightMm, walls, skirtLoops, retractionMm,
    pressureKPa, printSpeedMmS, nozzleDiameterUm, cartridgeTempC,
    useMultiWell, plateFormat, selectedWells, zHopBetweenWellsMm,
    pauseBetweenWellsS, purgeVolumeUL, updateSlice, buildSuggestions,
  ])

  // ── Download do G-code ──
  const downloadGCode = useCallback(() => {
    if (!result?.gcode) return
    const header = [
      "; ═══════════════════════════════════════════════════════════",
      "; BIA · Bioprint Process — G-code",
      "; ═══════════════════════════════════════════════════════════",
      `; Modelo: ${state.model.name ?? state.model.geometryId}`,
      `; Bioink: ${state.bioink.material} ${state.bioink.concentration}%`,
      state.bioink.cellType
        ? `; Células: ${state.bioink.cellType} ${state.bioink.cellDensityMillionMl}×10^6/mL`
        : "; Sem células (scaffold acelular)",
      `; Bioprinter: ${currentPrinter?.fullName ?? bioprinterId}`,
      `; Algoritmo: ${algorithm}  | Infill: ${infillPercent}%`,
      `; Layer: ${layerHeightMm} mm | Speed: ${printSpeedMmS} mm/s | Pressão: ${pressureKPa} kPa`,
      `; Temp: cartucho ${cartridgeTempC}°C / bed ${bedTempC}°C / chamber ${chamberTempC}°C`,
      "; ═══════════════════════════════════════════════════════════",
      "; ⚠️  ANTES DE INICIAR: faça homing (G28), nivele a mesa e calibre Z-offset",
      "; ═══════════════════════════════════════════════════════════",
      "",
    ].join("\n")

    const blob = new Blob([header + result.gcode], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${result.jobName ?? "bia"}.gcode`
    a.click()
    URL.revokeObjectURL(url)
  }, [result, state.model, state.bioink, currentPrinter, bioprinterId, algorithm, infillPercent, layerHeightMm, printSpeedMmS, pressureKPa, cartridgeTempC, bedTempC, chamberTempC])

  return (
    <div className="bia-slice-page flex flex-col min-h-full bg-[#0a0a0f]">
      {/* Cabeçalho */}
      <header className="px-4 sm:px-6 py-5 border-b border-white/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-violet-300/80 font-semibold mb-1">
              Etapa 3 / 4 · Bioimpressão
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-violet-400" />
              Fatiamento
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl">
              Configure a bioimpressora, padrão de preenchimento, temperaturas e gere o G-code real
              com cálculo de viabilidade celular e tempo estimado.
            </p>
          </div>

          {state.slice.status === "ready" && (
            <Link
              href="/dashboard/bioprint/control"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-violet-500/15 hover:bg-violet-500/25
                border border-violet-500/40 text-violet-200 text-sm font-medium rounded-xl transition-colors"
            >
              Continuar para Execução <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-5 flex gap-1.5 bg-white/3 border border-white/8 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
          <TabButton label="Tecido" icon={Microscope} active={tab === "tissue"} onClick={() => setTab("tissue")} dot={tissueDesign.profileId ? "violet" : null} />
          <TabButton label="Parâmetros" icon={Settings2} active={tab === "params"} onClick={() => setTab("params")} />
          <TabButton label="Multi-poço" icon={Beaker} active={tab === "wells"} onClick={() => setTab("wells")} dot={useMultiWell ? "violet" : null} />
          <TabButton label="G-code" icon={FileCode2} active={tab === "gcode"} onClick={() => setTab("gcode")} dot={result ? "emerald" : null} />
        </div>
      </header>

      {/* Aviso se etapas anteriores não prontas */}
      {!isUnlocked && (
        <div className="mx-4 sm:mx-6 mt-4 rounded-xl bg-amber-500/8 border border-amber-500/30 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-amber-200">
              {!modelReady && !bioinkReady && "Etapas 1 e 2 ainda não foram concluídas"}
              {!modelReady && bioinkReady && "Etapa 1 (Modelo 3D) ainda não foi concluída"}
              {modelReady && !bioinkReady && "Etapa 2 (Biotinta) ainda não foi concluída"}
            </div>
            <div className="text-xs text-amber-100/70 mt-0.5">
              Para gerar G-code é necessário ter o modelo 3D pronto E a biotinta formulada.
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {!modelReady && (
              <Link
                href="/dashboard/bioprint/model"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-100 whitespace-nowrap"
              >
                → Modelo 3D
              </Link>
            )}
            {!bioinkReady && (
              <Link
                href="/dashboard/bioprint/bioink"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-100 whitespace-nowrap"
              >
                → Biotinta
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Contexto resumido (etapas anteriores) */}
      {isUnlocked && (
        <div className="mx-4 sm:mx-6 mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-rose-500/5 border border-rose-500/20 px-4 py-3 flex items-center gap-3">
            <Microscope className="w-4 h-4 text-rose-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wider text-rose-300/70 font-semibold">Etapa 1 · Modelo</div>
              <div className="text-sm text-rose-100 truncate">
                {state.model.name ?? state.model.geometryId}
                <span className="text-rose-300/60 text-xs ml-2">
                  ({state.model.source === "upload" ? "upload" : state.model.source === "generated" ? "gerado" : "IA"})
                </span>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-cyan-500/5 border border-cyan-500/20 px-4 py-3 flex items-center gap-3">
            <Droplets className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wider text-cyan-300/70 font-semibold">Etapa 2 · Biotinta</div>
              <div className="text-sm text-cyan-100 truncate">
                {state.bioink.material} {state.bioink.concentration}%
                {state.bioink.cellType && (
                  <span className="text-cyan-300/60 text-xs ml-2">
                    + {state.bioink.cellType} {state.bioink.cellDensityMillionMl}×10⁶/mL
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da tab */}
      <main className="flex-1 px-4 sm:px-6 py-6 pb-24">
        {tab === "tissue" && (
          <div className="max-w-5xl mx-auto">
            <TissueDesigner
              value={tissueDesign}
              hasCells={!!state.bioink.cellType}
              onChange={(v) => {
                setTissueDesign(v)
                // Auto-aplica os parâmetros do perfil aos sliders clássicos
                if (v.infillDensity !== undefined) setInfillPercent(v.infillDensity)
                if (v.nozzleDiameter !== undefined) setNozzleDiameterUm(v.nozzleDiameter)
                if (v.printSpeed !== undefined) setPrintSpeedMmS(v.printSpeed)
                if (v.pressure !== undefined) setPressureKPa(v.pressure)
                if (v.layerHeight !== undefined) setLayerHeightMm(v.layerHeight)
              }}
            />
            {tissueDesign.profileId && (
              <div className="mt-6 flex items-center justify-between rounded-2xl bg-quantis-purple-500/10 border border-quantis-purple-400/30 p-4">
                <div className="text-sm text-quantis-lilac-100">
                  Perfil aplicado. Avance para <strong>Parâmetros</strong> para ajustes finais e depois gere o G-code.
                </div>
                <button
                  onClick={() => setTab("params")}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-quantis-lilac-500 hover:bg-quantis-lilac-400 text-quantis-ink-950 text-sm font-bold rounded-lg transition-colors"
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
        {tab === "params" && (
          <ParamsPanel
            bioprinterId={bioprinterId} onBioprinterChange={setBioprinterId}
            currentPrinter={currentPrinter}
            algorithm={algorithm} onAlgorithmChange={setAlgorithm}
            layerHeightMm={layerHeightMm} onLayerHeightChange={setLayerHeightMm}
            printSpeedMmS={printSpeedMmS} onPrintSpeedChange={setPrintSpeedMmS}
            pressureKPa={pressureKPa} onPressureChange={setPressureKPa}
            nozzleDiameterUm={nozzleDiameterUm} onNozzleChange={setNozzleDiameterUm}
            infillPercent={infillPercent} onInfillChange={setInfillPercent}
            infillPatternId={infillPatternId} onInfillPatternChange={setInfillPatternId}
            walls={walls} onWallsChange={setWalls}
            skirtLoops={skirtLoops} onSkirtLoopsChange={setSkirtLoops}
            retractionMm={retractionMm} onRetractionChange={setRetractionMm}
            cartridgeTempC={cartridgeTempC} onCartridgeTempChange={setCartridgeTempC}
            bedTempC={bedTempC} onBedTempChange={setBedTempC}
            chamberTempC={chamberTempC} onChamberTempChange={setChamberTempC}
            recommendedProfile={recommendedProfile}
            modelCategory={state.model.category}
            hasCells={!!state.bioink.cellType}
          />
        )}
        {tab === "wells" && (
          <WellsPanel
            useMultiWell={useMultiWell} onUseMultiWellChange={setUseMultiWell}
            plateFormat={plateFormat} onPlateFormatChange={setPlateFormat}
            selectedWells={selectedWells} onSelectedWellsChange={setSelectedWells}
            zHopBetweenWellsMm={zHopBetweenWellsMm} onZHopChange={setZHopBetweenWellsMm}
            pauseBetweenWellsS={pauseBetweenWellsS} onPauseChange={setPauseBetweenWellsS}
            purgeVolumeUL={purgeVolumeUL} onPurgeVolumeChange={setPurgeVolumeUL}
          />
        )}
        {tab === "gcode" && (
          <div className="space-y-6">
            {/* PREPARAÇÃO DA BIOIMPRESSORA — conexão USB + joystick (R10) */}
            <PrinterPrepSection
              gcode={result?.gcode ?? state.slice.gcode ?? ""}
              printerName={currentPrinter?.fullName ?? "Bioimpressora BIA"}
            />
            <GCodePanel
              loading={loading}
              error={error}
              result={result}
              onGenerate={generateGCode}
              onDownload={downloadGCode}
              isUnlocked={isUnlocked}
            />
          </div>
        )}
      </main>

      {/* Rodapé sticky com botão de geração ou CTA de avançar */}
      <footer className="sticky bottom-0 z-10 bg-[#0a0a0f]/95 backdrop-blur border-t border-violet-500/20 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm min-w-0">
          {state.slice.status === "ready" ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
              <span className="text-violet-300 font-medium shrink-0">G-code:</span>
              <span className="text-gray-300 truncate">
                {result?.layerCount ?? state.slice.estimate?.totalLayers} camadas ·
                {" "}{result?.estimatedTime_min ?? state.slice.estimate?.estimatedTimeMin} min
                {result?.stats?.viabilityEstimate_pct && ` · viabilidade ${result.stats.viabilityEstimate_pct}%`}
              </span>
            </>
          ) : (
            <>
              <Info className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="text-gray-400 text-xs">
                {isUnlocked ? "Configure os parâmetros e gere o G-code para avançar" : "Complete as etapas 1 e 2 primeiro"}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isUnlocked && !state.slice.status.includes("ready") && (
            <button
              onClick={generateGCode}
              disabled={loading || !isUnlocked}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors",
                loading || !isUnlocked
                  ? "bg-white/5 text-gray-500 cursor-not-allowed"
                  : "bg-violet-500 hover:bg-violet-400 text-violet-950"
              )}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {loading ? "Gerando…" : "Gerar G-code"}
            </button>
          )}
          {state.slice.status === "ready" && (
            <Link
              href="/dashboard/bioprint/control"
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-400 text-violet-950 text-sm font-semibold rounded-lg transition-colors"
            >
              Etapa 4 · Execução <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </footer>
    </div>
  )
}

// ─── Tab button ──────────────────────────────────────────────────────────
function TabButton({
  label, icon: Icon, active, onClick, dot,
}: {
  label: string; icon: typeof Layers; active: boolean; onClick: () => void; dot?: "violet" | "emerald" | null
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap",
        active
          ? "bg-violet-500/20 text-violet-200 ring-1 ring-violet-500/40"
          : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
      {dot && <span className={cn(
        "w-1.5 h-1.5 rounded-full",
        dot === "violet" ? "bg-violet-400" : "bg-emerald-400"
      )} />}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PAINEL A — PARÂMETROS
// ═══════════════════════════════════════════════════════════════════════════
interface ParamsProps {
  bioprinterId: string; onBioprinterChange: (id: string) => void
  currentPrinter: ReturnType<typeof getBioprinterById>
  algorithm: EngineAlgorithm; onAlgorithmChange: (a: EngineAlgorithm) => void
  layerHeightMm: number; onLayerHeightChange: (n: number) => void
  printSpeedMmS: number; onPrintSpeedChange: (n: number) => void
  pressureKPa: number; onPressureChange: (n: number) => void
  nozzleDiameterUm: number; onNozzleChange: (n: number) => void
  infillPercent: number; onInfillChange: (n: number) => void
  infillPatternId: string; onInfillPatternChange: (id: string) => void
  walls: number; onWallsChange: (n: number) => void
  skirtLoops: number; onSkirtLoopsChange: (n: number) => void
  retractionMm: number; onRetractionChange: (n: number) => void
  cartridgeTempC: number; onCartridgeTempChange: (n: number) => void
  bedTempC: number; onBedTempChange: (n: number) => void
  chamberTempC: number; onChamberTempChange: (n: number) => void
  recommendedProfile: typeof TEMPERATURE_PROFILES[number]
  modelCategory: string | null
  hasCells: boolean
}

function ParamsPanel(p: ParamsProps) {
  const [showRationale, setShowRationale] = useState(false)
  const recommendedAlgo = recommendAlgorithm(p.modelCategory, p.hasCells)
  const algoInfo = ENGINE_ALGORITHMS.find(a => a.id === p.algorithm)
  const patternInfo = INFILL_PATTERNS.find(x => x.id === p.infillPatternId)

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* ── Bioimpressora ── */}
      <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Printer className="w-4 h-4 text-violet-400" />
          Bioimpressora
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3 max-h-72 overflow-y-auto pr-1">
          {BIOPRINTERS.map(bp => (
            <button
              key={bp.id}
              onClick={() => p.onBioprinterChange(bp.id)}
              className={cn(
                "p-3 rounded-xl border text-left transition-all",
                p.bioprinterId === bp.id
                  ? "border-violet-500/50 bg-violet-500/10 ring-1 ring-violet-500/30"
                  : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-0.5">
                <div className={cn(
                  "text-xs font-semibold",
                  p.bioprinterId === bp.id ? "text-violet-200" : "text-white"
                )}>
                  {bp.brand} {bp.model}
                </div>
                <span className="text-base shrink-0">{bp.icon}</span>
              </div>
              <div className="text-[10px] text-gray-500">
                {bp.buildVolume.x}×{bp.buildVolume.y}×{bp.buildVolume.z} mm · {bp.numHeads} cabeçote{bp.numHeads > 1 ? "s" : ""}
                {bp.hasUVcuring && " · UV"}
                {supportsWebSerial(bp) && " · USB"}
              </div>
            </button>
          ))}
        </div>
        {p.currentPrinter && (
          <div className="rounded-xl bg-violet-500/5 border border-violet-500/20 p-3 text-xs text-violet-100/85 space-y-1">
            <p><strong className="text-violet-300">{p.currentPrinter.fullName}</strong></p>
            <p className="text-gray-400">
              Resolução XY: {p.currentPrinter.resolution_um.xy} µm ·
              Speed: ≤{p.currentPrinter.maxSpeed_mm_s} mm/s ·
              Temp: {p.currentPrinter.temperatureRange_C.min}–{p.currentPrinter.temperatureRange_C.max}°C
              {p.currentPrinter.pressureRange_kPa && ` · Pressão: ${p.currentPrinter.pressureRange_kPa.min}–${p.currentPrinter.pressureRange_kPa.max} kPa`}
            </p>
            <p className="text-gray-500">{p.currentPrinter.description}</p>
          </div>
        )}
      </section>

      {/* ── Algoritmo de infill ── */}
      <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            Algoritmo de preenchimento
          </h3>
          {recommendedAlgo === p.algorithm && (
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
              ✓ Recomendado
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
          {ENGINE_ALGORITHMS.map(algo => (
            <button
              key={algo.id}
              onClick={() => p.onAlgorithmChange(algo.id)}
              className={cn(
                "p-2.5 rounded-xl border text-left transition-all",
                p.algorithm === algo.id
                  ? "border-violet-500/50 bg-violet-500/10 ring-1 ring-violet-500/30"
                  : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5",
                recommendedAlgo === algo.id && p.algorithm !== algo.id && "border-emerald-500/30"
              )}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm">{algo.icon}</span>
                {recommendedAlgo === algo.id && p.algorithm !== algo.id && (
                  <span className="text-[8px] text-emerald-400 font-bold">REC</span>
                )}
              </div>
              <div className={cn(
                "text-xs font-semibold leading-tight",
                p.algorithm === algo.id ? "text-violet-200" : "text-white"
              )}>
                {algo.name}
              </div>
              <div className="text-[9px] text-gray-500 mt-0.5">{algo.category}</div>
            </button>
          ))}
        </div>
        {algoInfo && (
          <div className="rounded-xl bg-violet-500/5 border border-violet-500/20 p-3 text-xs text-violet-100/85">
            <strong className="text-violet-300">Melhor para:</strong> {algoInfo.bestFor.join(", ")}
          </div>
        )}
      </section>

      {/* ── Parâmetros físicos ── */}
      <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-violet-400" />
          Parâmetros físicos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SliderField
            label="Altura de camada" icon={Layers}
            min={0.05} max={0.5} step={0.025}
            value={p.layerHeightMm} onChange={p.onLayerHeightChange}
            display={`${p.layerHeightMm.toFixed(3)} mm`}
            hint="50–500 µm · padrão 200–250 µm"
          />
          <SliderField
            label="Velocidade impressão" icon={Wind}
            min={1} max={30} step={1}
            value={p.printSpeedMmS} onChange={p.onPrintSpeedChange}
            display={`${p.printSpeedMmS} mm/s`}
            hint={p.hasCells ? "Com células: 3–10 mm/s" : "Acelular: 5–20 mm/s"}
          />
          <SliderField
            label="Pressão extrusão" icon={Activity}
            min={5} max={600} step={5}
            value={p.pressureKPa} onChange={p.onPressureChange}
            display={`${p.pressureKPa} kPa`}
            hint="Hidrogéis 10–120 · PCL >300"
          />
          <SliderField
            label="Diâmetro bico" icon={Target}
            min={100} max={1200} step={10}
            value={p.nozzleDiameterUm} onChange={p.onNozzleChange}
            display={`${p.nozzleDiameterUm} µm`}
            hint="Bio: 200–410 µm padrão"
          />
          <SliderField
            label="Preenchimento" icon={BarChart3}
            min={5} max={100} step={5}
            value={p.infillPercent} onChange={p.onInfillChange}
            display={`${p.infillPercent}%`}
            hint="Scaffolds: 20–40% · sólidos: 80–100%"
          />
          <SliderField
            label="Paredes (walls)" icon={Layers}
            min={1} max={5} step={1}
            value={p.walls} onChange={p.onWallsChange}
            display={`${p.walls}`}
            hint="2 é padrão"
          />
          <SliderField
            label="Saia (skirt loops)" icon={Wrench}
            min={0} max={5} step={1}
            value={p.skirtLoops} onChange={p.onSkirtLoopsChange}
            display={`${p.skirtLoops}`}
            hint="2 ajuda a estabilizar bico"
          />
          <SliderField
            label="Retração" icon={Wrench}
            min={0} max={2} step={0.1}
            value={p.retractionMm} onChange={p.onRetractionChange}
            display={`${p.retractionMm.toFixed(1)} mm`}
            hint={p.hasCells ? "Com células: 0 mm" : "0.3–0.5 mm"}
          />
          <div>
            <label className="text-[11px] text-gray-400 mb-1.5 block">Padrão BIO</label>
            <select
              value={p.infillPatternId}
              onChange={e => p.onInfillPatternChange(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white
                focus:outline-none focus:border-violet-500/40"
            >
              {INFILL_PATTERNS.map(x => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
          </div>
        </div>

        {patternInfo && (
          <div className="mt-4 rounded-xl bg-violet-500/5 border border-violet-500/20 p-3 text-xs">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-violet-200 font-medium">{patternInfo.name}</p>
                <p className="text-gray-400">{patternInfo.description}</p>
                <p className="text-gray-500 text-[10px]">
                  Spacing ideal: {patternInfo.filamentSpacingUm.ideal} µm ·
                  Porosidade: {patternInfo.porosityPercent.min}–{patternInfo.porosityPercent.max}% ·
                  Ref: {patternInfo.ref}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Temperaturas ── */}
      <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-violet-400" />
            Perfil térmico
            <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300">
              sugerido p/ {p.recommendedProfile.bioinkType}
            </span>
          </h3>
          <button
            onClick={() => setShowRationale(!showRationale)}
            className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1"
          >
            {showRationale ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Racional
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SliderField
            label="Cartucho (bico)" icon={Thermometer}
            min={4} max={100} step={1}
            value={p.cartridgeTempC} onChange={p.onCartridgeTempChange}
            display={`${p.cartridgeTempC} °C`}
            hint={`Ideal: ${p.recommendedProfile.cartridgeTempC.ideal}°C`}
          />
          <SliderField
            label="Mesa (bed)" icon={Thermometer}
            min={4} max={80} step={1}
            value={p.bedTempC} onChange={p.onBedTempChange}
            display={`${p.bedTempC} °C`}
            hint={`Ideal: ${p.recommendedProfile.bedTempC.ideal}°C`}
          />
          <SliderField
            label="Câmara" icon={Thermometer}
            min={4} max={50} step={1}
            value={p.chamberTempC} onChange={p.onChamberTempChange}
            display={`${p.chamberTempC} °C`}
            hint={`Ideal: ${p.recommendedProfile.chamberTempC.ideal}°C · UR ${p.recommendedProfile.humidityPercent.ideal}%`}
          />
        </div>
        {showRationale && (
          <div className="mt-4 rounded-xl bg-violet-500/5 border border-violet-500/20 p-3 text-xs space-y-1">
            <p className="text-gray-300">{p.recommendedProfile.rationale}</p>
            <p className="text-gray-500 text-[10px]">Ref: {p.recommendedProfile.ref}</p>
          </div>
        )}
      </section>
    </div>
  )
}

// ─── Slider field reutilizável ────────────────────────────────────────────
function SliderField({
  label, icon: Icon, min, max, step, value, onChange, display, hint,
}: {
  label: string; icon: typeof Layers
  min: number; max: number; step: number
  value: number; onChange: (n: number) => void
  display: string; hint?: string
}) {
  return (
    <div>
      <label className="text-[11px] text-gray-400 mb-1 flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="flex-1 accent-violet-500"
        />
        <span className="text-xs text-violet-300 font-mono w-20 text-right">{display}</span>
      </div>
      {hint && <p className="text-[10px] text-gray-600 mt-0.5">{hint}</p>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PAINEL B — MULTI-POÇO (opcional)
// ═══════════════════════════════════════════════════════════════════════════
function WellsPanel({
  useMultiWell, onUseMultiWellChange,
  plateFormat, onPlateFormatChange,
  selectedWells, onSelectedWellsChange,
  zHopBetweenWellsMm, onZHopChange,
  pauseBetweenWellsS, onPauseChange,
  purgeVolumeUL, onPurgeVolumeChange,
}: {
  useMultiWell: boolean; onUseMultiWellChange: (b: boolean) => void
  plateFormat: 6 | 12 | 24 | 48 | 96 | 384; onPlateFormatChange: (f: 6 | 12 | 24 | 48 | 96 | 384) => void
  selectedWells: string[]; onSelectedWellsChange: (w: string[]) => void
  zHopBetweenWellsMm: number; onZHopChange: (n: number) => void
  pauseBetweenWellsS: number; onPauseChange: (n: number) => void
  purgeVolumeUL: number; onPurgeVolumeChange: (n: number) => void
}) {
  // Gerar matriz da placa
  const rows = useMemo(() => {
    const config: Record<number, [number, number]> = {
      6: [2, 3], 12: [3, 4], 24: [4, 6], 48: [6, 8], 96: [8, 12], 384: [16, 24],
    }
    const [r, c] = config[plateFormat]
    const wells: string[] = []
    for (let i = 0; i < r; i++) {
      for (let j = 0; j < c; j++) {
        wells.push(`${String.fromCharCode(65 + i)}${j + 1}`)
      }
    }
    return { rows: r, cols: c, wells }
  }, [plateFormat])

  const toggleWell = (w: string) => {
    if (selectedWells.includes(w)) {
      onSelectedWellsChange(selectedWells.filter(s => s !== w))
    } else {
      onSelectedWellsChange([...selectedWells, w])
    }
  }

  const selectAll = () => onSelectedWellsChange(rows.wells)
  const clearAll = () => onSelectedWellsChange([])
  const selectRow = (rowIdx: number) => {
    const rowWells = rows.wells.filter(w => w.charCodeAt(0) - 65 === rowIdx)
    onSelectedWellsChange(Array.from(new Set([...selectedWells, ...rowWells])))
  }
  const selectCol = (colIdx: number) => {
    const colWells = rows.wells.filter(w => parseInt(w.slice(1)) - 1 === colIdx)
    onSelectedWellsChange(Array.from(new Set([...selectedWells, ...colWells])))
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Seletor de modo: Direto na mesa OU Placa multi-poços */}
      <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
          <Beaker className="w-4 h-4 text-violet-400" />
          Modo de impressão
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Escolha onde a bioimpressora vai depositar o material.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card: Direto na mesa */}
          <button
            type="button"
            onClick={() => onUseMultiWellChange(false)}
            className={cn(
              "rounded-xl border p-4 text-left transition-all",
              !useMultiWell
                ? "border-violet-500/60 bg-violet-500/10 ring-1 ring-violet-500/30"
                : "border-white/10 bg-white/[0.02] hover:border-white/20"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                !useMultiWell ? "bg-violet-500/25 text-violet-200" : "bg-white/5 text-gray-400"
              )}>
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className={cn(
                  "text-sm font-semibold mb-0.5",
                  !useMultiWell ? "text-violet-100" : "text-white"
                )}>
                  Direto na mesa
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Bioimpressão em superfície aberta (Petri, lâmina, scaffold). 1 peça única no centro da mesa.
                </p>
              </div>
            </div>
          </button>

          {/* Card: Placa multi-poços */}
          <button
            type="button"
            onClick={() => onUseMultiWellChange(true)}
            className={cn(
              "rounded-xl border p-4 text-left transition-all",
              useMultiWell
                ? "border-violet-500/60 bg-violet-500/10 ring-1 ring-violet-500/30"
                : "border-white/10 bg-white/[0.02] hover:border-white/20"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                useMultiWell ? "bg-violet-500/25 text-violet-200" : "bg-white/5 text-gray-400"
              )}>
                <Beaker className="w-5 h-5" />
              </div>
              <div>
                <div className={cn(
                  "text-sm font-semibold mb-0.5",
                  useMultiWell ? "text-violet-100" : "text-white"
                )}>
                  Placa multi-poços
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Placas SBS padrão (6–384 poços) para replicar a mesma geometria. Ideal para screening, viabilidade e validação estatística.
                </p>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* === MODO: DIRETO NA MESA — visualização da mesa de impressão === */}
      {!useMultiWell && (
        <section className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.06] to-blue-500/[0.03] p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-violet-300" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-0.5">Mesa de impressão (build plate)</h3>
              <p className="text-[11px] text-gray-400">
                A peça será impressa no centro da mesa. Verifique se a superfície (Petri, lâmina ou scaffold) está bem fixada antes de iniciar.
              </p>
            </div>
          </div>
          {/* Visualização simplificada da mesa */}
          <div className="relative mx-auto" style={{ maxWidth: "320px", aspectRatio: "4/3" }}>
            <div className="absolute inset-0 rounded-xl border-2 border-violet-400/40 bg-gradient-to-br from-violet-900/20 via-quantis-ink-900/40 to-quantis-ink-900/60 shadow-inner shadow-violet-900/30" />
            {/* Grid sutil */}
            <div className="absolute inset-2 rounded-lg opacity-40"
              style={{
                backgroundImage: "linear-gradient(rgba(167,139,250,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(167,139,250,0.15) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />
            {/* Crosshair centro */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16">
              <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-violet-300/40" />
              <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-violet-300/40" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-violet-300" />
            </div>
            {/* Origem X0/Y0 */}
            <div className="absolute bottom-1 left-1 text-[9px] text-violet-300/70 font-mono">X0,Y0</div>
            {/* Indicador */}
            <div className="absolute top-1 right-2 text-[10px] text-violet-200 font-medium bg-violet-500/20 px-1.5 py-0.5 rounded">
              Centro · origem da peça
            </div>
          </div>
          {/* Alerta posicionamento inicial */}
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/8 p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-100 leading-relaxed">
              <strong className="block mb-0.5">Antes de iniciar a impressão:</strong>
              Posicione o cabeçote no centro da mesa (X0,Y0 lógico = centro físico) com a biotinta carregada e o Z-offset calibrado para tocar levemente a superfície (~0,1 mm acima). O G-code parte deste ponto.
            </div>
          </div>
        </section>
      )}

      {/* === MODO: MULTI-POÇOS === */}
      {useMultiWell && (
        <>
          {/* Alerta de posicionamento inicial — primeira impressão */}
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-300" />
              </div>
              <div className="text-[12px] text-amber-100 leading-relaxed space-y-1">
                <strong className="text-amber-50">Posicionamento inicial obrigatório:</strong>
                <p>
                  O G-code assume que a <strong>primeira impressão começa no centro do primeiro poço selecionado</strong> (canto superior esquerdo, ex.: <code className="font-mono text-amber-200 bg-amber-900/30 px-1 rounded">A1</code>).
                  Posicione manualmente o cabeçote no centro de A1 com a biotinta carregada e ajuste o <strong>Z-offset</strong> para o bico tocar levemente o fundo do poço (~0,1 mm acima).
                </p>
                <p>
                  Entre poços, o cabeçote sobe <strong>{zHopBetweenWellsMm.toFixed(1)} mm</strong> (Z-hop) para não bater nas paredes — ajuste abaixo se o seu cabeçote tiver folga lateral grande ou se os poços forem profundos (recomendado: ≥ altura do poço + 2 mm).
                </p>
              </div>
            </div>
          </section>

          {/* Formato da placa */}
          <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Formato SBS</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {([6, 12, 24, 48, 96, 384] as const).map(f => (
                <button
                  key={f}
                  onClick={() => { onPlateFormatChange(f); onSelectedWellsChange(["A1"]) }}
                  className={cn(
                    "p-3 rounded-xl border transition-all text-center",
                    plateFormat === f
                      ? "border-violet-500/50 bg-violet-500/10 ring-1 ring-violet-500/30"
                      : "border-white/8 bg-white/3 hover:border-white/15"
                  )}
                >
                  <div className={cn(
                    "text-base font-bold",
                    plateFormat === f ? "text-violet-200" : "text-white"
                  )}>
                    {f}
                  </div>
                  <div className="text-[10px] text-gray-500">poços</div>
                </button>
              ))}
            </div>
          </section>

          {/* Mapa visual de poços */}
          <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">
                Poços selecionados: <span className="text-violet-300">{selectedWells.length}</span> / {rows.wells.length}
              </h3>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-[10px] px-2 py-1 rounded bg-white/5 text-gray-300 hover:bg-white/10">
                  Todos
                </button>
                <button onClick={clearAll} className="text-[10px] px-2 py-1 rounded bg-white/5 text-gray-300 hover:bg-white/10">
                  Limpar
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="border-collapse">
                <thead>
                  <tr>
                    <th></th>
                    {Array.from({ length: rows.cols }).map((_, c) => (
                      <th key={c}>
                        <button
                          onClick={() => selectCol(c)}
                          className="text-[9px] text-gray-500 hover:text-violet-300 px-1 cursor-pointer"
                        >
                          {c + 1}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: rows.rows }).map((_, r) => (
                    <tr key={r}>
                      <td>
                        <button
                          onClick={() => selectRow(r)}
                          className="text-[9px] text-gray-500 hover:text-violet-300 px-1 cursor-pointer"
                        >
                          {String.fromCharCode(65 + r)}
                        </button>
                      </td>
                      {Array.from({ length: rows.cols }).map((_, c) => {
                        const w = `${String.fromCharCode(65 + r)}${c + 1}`
                        const sel = selectedWells.includes(w)
                        const size = plateFormat <= 24 ? "w-7 h-7" : plateFormat <= 96 ? "w-5 h-5" : "w-3 h-3"
                        return (
                          <td key={c} className="p-0.5">
                            <button
                              onClick={() => toggleWell(w)}
                              title={w}
                              className={cn(
                                size, "rounded-full border transition-all",
                                sel
                                  ? "bg-violet-500/40 border-violet-400"
                                  : "border-white/15 hover:border-violet-400/50"
                              )}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Parâmetros multi-well */}
          <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Parâmetros entre poços</h3>
            <p className="text-[11px] text-gray-400 mb-4">
              <strong className="text-violet-200">Z-hop</strong> é a altura que o bico sobe ao migrar de um poço para o próximo —
              evita choque com as paredes. Aumente se os poços forem profundos.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SliderField
                label="Z-hop entre poços (altura de segurança)" icon={Layers}
                min={1} max={20} step={0.5}
                value={zHopBetweenWellsMm} onChange={onZHopChange}
                display={`${zHopBetweenWellsMm.toFixed(1)} mm`}
                hint="Subida do bico ao mover entre poços"
              />
              <SliderField
                label="Pausa entre poços" icon={Clock}
                min={0} max={30} step={1}
                value={pauseBetweenWellsS} onChange={onPauseChange}
                display={`${pauseBetweenWellsS} s`}
                hint="Para gelificação parcial"
              />
              <SliderField
                label="Purga (volume)" icon={Droplets}
                min={0} max={10} step={0.5}
                value={purgeVolumeUL} onChange={onPurgeVolumeChange}
                display={`${purgeVolumeUL.toFixed(1)} µL`}
                hint="Por troca de poço"
              />
            </div>
          </section>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PAINEL C — G-CODE
// ═══════════════════════════════════════════════════════════════════════════
function GCodePanel({
  loading, error, result, onGenerate, onDownload, isUnlocked,
}: {
  loading: boolean
  error: { message: string; details?: string; suggestions?: string[] } | null
  result: GCodeResponse | null
  onGenerate: () => void; onDownload: () => void; isUnlocked: boolean
}) {
  const [copied, setCopied] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const handleCopy = useCallback(() => {
    if (!result?.gcode) return
    navigator.clipboard.writeText(result.gcode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [result])

  // Contador de tempo enquanto loading — feedback ao usuário
  useEffect(() => {
    if (!loading) { setElapsed(0); return }
    const start = Date.now()
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 250)
    return () => clearInterval(id)
  }, [loading])

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Botão de gerar (se ainda não gerou) */}
      {!result && !loading && !error && (
        <section className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-8 text-center">
          <FileCode2 className="w-12 h-12 text-violet-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-2">Pronto para gerar o G-code</h3>
          <p className="text-xs text-gray-400 mb-4 max-w-md mx-auto">
            O motor real BIA vai aplicar Hagen-Poiseuille, calcular viabilidade celular e gerar o
            G-code Marlin/Klipper completo para sua bioimpressora.
          </p>
          <button
            onClick={onGenerate}
            disabled={!isUnlocked}
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors",
              isUnlocked
                ? "bg-violet-500 hover:bg-violet-400 text-violet-950"
                : "bg-white/5 text-gray-500 cursor-not-allowed"
            )}
          >
            <Zap className="w-4 h-4" /> Gerar G-code agora
          </button>
          <p className="text-[10px] text-gray-600 mt-3">Custo: 6 créditos por geração · timeout em 45s</p>
        </section>
      )}

      {/* Loading com contador e mensagens progressivas */}
      {loading && (
        <section className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-8 text-center">
          <Loader2 className="w-12 h-12 text-violet-400 mx-auto mb-3 animate-spin" />
          <h3 className="text-base font-semibold text-white mb-1">
            Gerando G-code… <span className="text-violet-300 tabular-nums">{elapsed}s</span>
          </h3>
          <p className="text-xs text-gray-400">
            {elapsed < 5 && "Validando parâmetros e calculando bounds da geometria"}
            {elapsed >= 5 && elapsed < 15 && "Pré-computando Voronoi/TPMS e trajetória entre poços"}
            {elapsed >= 15 && elapsed < 30 && "Emitindo movimentos camada a camada (Hagen-Poiseuille)"}
            {elapsed >= 30 && "Quase lá — formatando G-code final e calculando viabilidade…"}
          </p>
          {elapsed >= 30 && (
            <p className="text-[10px] text-amber-400 mt-2">
              ⏱️ Demorando mais que o normal — vai cancelar automaticamente em {45 - elapsed}s se não responder.
            </p>
          )}
        </section>
      )}

      {/* Erro estruturado com sugestões inteligentes */}
      {error && !loading && (
        <section className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.04] p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-rose-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-rose-100">Não foi possível gerar o G-code</h3>
              <p className="text-xs text-rose-100/80 mt-1 leading-relaxed">{error.message}</p>
              {error.details && (
                <pre className="mt-2 p-2 rounded-lg bg-black/30 border border-rose-500/20 text-[10px] text-rose-200/70 font-mono overflow-x-auto whitespace-pre-wrap">
                  {error.details}
                </pre>
              )}
            </div>
            <button
              onClick={onGenerate}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-100 whitespace-nowrap shrink-0"
            >
              Tentar novamente
            </button>
          </div>

          {/* Sugestões inteligentes */}
          {error.suggestions && error.suggestions.length > 0 && (
            <div className="mt-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/25 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-amber-300" />
                <span className="text-xs font-semibold text-amber-200 uppercase tracking-wider">
                  Sugestões da BIA para você continuar
                </span>
              </div>
              <ul className="space-y-1 text-xs text-amber-100/85 leading-relaxed">
                {error.suggestions.map((s, i) => (
                  <li key={i} className={s.startsWith("•") || s.startsWith("⚠️") ? "ml-3" : "font-medium"}>{s}</li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-amber-500/15 flex flex-wrap gap-2">
                <Link
                  href="/dashboard/bioprint/model"
                  className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-200"
                >
                  ← Trocar modelo (Etapa 1)
                </Link>
                <Link
                  href="/dashboard/bioprint/bioink"
                  className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 text-cyan-200"
                >
                  ← Reformular biotinta (Etapa 2)
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Resultado */}
      {result && (
        <>
          {/* Sumário */}
          <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-emerald-200">G-code gerado com sucesso</h3>
                  <p className="text-xs text-emerald-100/70 mt-0.5">{result.jobName}</p>
                </div>
              </div>
              <button
                onClick={onGenerate}
                disabled={loading}
                className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-200"
              >
                Regenerar
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBox label="Camadas" value={`${result.layerCount}`} icon={Layers} />
              <StatBox label="Tempo estimado" value={`${result.estimatedTime_min} min`} icon={Clock} />
              <StatBox label="Volume bioink" value={`${result.bioinkVolume_uL} µL`} icon={Droplets} />
              <StatBox
                label="Viabilidade"
                value={result.stats?.viabilityEstimate_pct ? `${result.stats.viabilityEstimate_pct}%` : "N/A"}
                icon={Activity}
                tone={
                  result.stats?.viabilityEstimate_pct
                    ? result.stats.viabilityEstimate_pct >= 85 ? "good"
                    : result.stats.viabilityEstimate_pct >= 70 ? "warn"
                    : "bad"
                    : "neutral"
                }
              />
            </div>
            {result.summary && (
              <div className="mt-4 pt-4 border-t border-emerald-500/15 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] text-emerald-100/60">
                <div><span className="text-gray-500">Bioimpressora:</span> {result.summary.bioprinter}</div>
                <div><span className="text-gray-500">Biotinta:</span> {result.summary.bioink}</div>
                <div><span className="text-gray-500">Algoritmo:</span> {result.summary.algorithm}</div>
              </div>
            )}
            {result.creditsUsed > 0 && (
              <p className="mt-3 text-[10px] text-emerald-300/60">Créditos usados: {result.creditsUsed}</p>
            )}
          </section>

          {/* Warnings */}
          {result.warnings && result.warnings.length > 0 && (
            <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
              <h3 className="text-sm font-semibold text-amber-200 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Avisos do engine ({result.warnings.length})
              </h3>
              <ul className="space-y-1.5 text-xs text-amber-100/85">
                {result.warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ⚠️ BANNER CRÍTICO: Checklist de calibração ANTES da impressão real */}
          <PrePrintChecklist />

          {/* Actions */}
          <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Ações</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onDownload}
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-400 text-violet-950 text-sm font-semibold rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" /> Baixar .gcode
              </button>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-sm font-medium rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" /> {copied ? "Copiado!" : "Copiar G-code"}
              </button>
            </div>
          </section>

          {/* Preview do G-code */}
          <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-violet-400" />
              Preview do G-code
              <span className="text-[10px] font-normal text-gray-500">(primeiras 100 linhas)</span>
            </h3>
            <pre className="bg-black/40 border border-white/5 rounded-xl p-3 text-[10px] text-gray-300 font-mono overflow-x-auto max-h-96 overflow-y-auto">
              {result.gcode.split("\n").slice(0, 100).join("\n")}
              {result.gcode.split("\n").length > 100 && (
                <span className="text-gray-600">
                  {"\n; ... +" + (result.gcode.split("\n").length - 100) + " linhas"}
                </span>
              )}
            </pre>
          </section>
        </>
      )}
    </div>
  )
}

// ─── Pre-print Checklist (banner crítico Z-offset + calibração) ────────────
function PrePrintChecklist() {
  const ITEMS = [
    {
      icon: "🎯",
      title: "Calibre o Z-offset com bioink real, não com plástico",
      body: "Bioinks são viscoelásticas. O offset que funciona com PLA NÃO funciona com hidrogel. Coloque uma gota da SUA bioink no cartucho, faça G28 e use G92 Z0 quando o menisco encostar no leito. Diferença típica: bioink precisa de Z 0.05–0.10 mm MAIS alto do que filamento.",
      tone: "violet",
    },
    {
      icon: "🌡️",
      title: "Pré-aqueça/refrigere TUDO 10 minutos antes do print",
      body: "Cartucho, leito E câmara precisam estar em equilíbrio térmico estável. GelMA a 22°C cristaliza no canto frio do leito 4°C — o filamento entope. Use M190 (bed wait) + M109 (cartridge wait) ANTES do G28.",
      tone: "rose",
    },
    {
      icon: "💨",
      title: "Purgue o ar do cartucho (anti-bolha)",
      body: "Bolha de ar = filamento descontínuo = camada falha. Antes de iniciar, faça G1 E1.0 F60 (extrude 1mm devagar) até sair bioink limpa. Repita se a bioink ficou parada > 15 min.",
      tone: "amber",
    },
    {
      icon: "🦠",
      title: "Esterilização do bico — UV 5 min ou EtOH 70% (sem encostar)",
      body: "O bico passou pela mesa e pelo cartucho. Antes de iniciar, ligue UV (M355 S1) por 5 min OU borrife EtOH 70% e espere evaporar. NUNCA toque o bico com luva contaminada.",
      tone: "cyan",
    },
    {
      icon: "📐",
      title: "Verifique a primeira camada visualmente",
      body: "Os primeiros 5mm² da bioimpressão revelam tudo. Se viu filamento descolando do leito, despressurize (Z+5) e RE-CALIBRE. Não tente salvar — repita do zero. Um print ruim contamina o resto.",
      tone: "emerald",
    },
    {
      icon: "🧊",
      title: "Crosslinker pronto e na mesa ANTES do start",
      body: "Para GelMA: lâmpada UV 365nm com filtro Schott UG-11 configurada e CaCl₂ 100mM pré-aquecida 37°C ao lado. NUNCA crosslinkar a frio — choque térmico mata 30–50% das células.",
      tone: "blue",
    },
  ]

  const TONE_MAP: Record<string, { bg: string; border: string; title: string }> = {
    violet:  { bg: "bg-violet-500/[0.04]",  border: "border-violet-500/25",  title: "text-violet-100" },
    rose:    { bg: "bg-rose-500/[0.04]",    border: "border-rose-500/25",    title: "text-rose-100" },
    amber:   { bg: "bg-amber-500/[0.04]",   border: "border-amber-500/25",   title: "text-amber-100" },
    cyan:    { bg: "bg-cyan-500/[0.04]",    border: "border-cyan-500/25",    title: "text-cyan-100" },
    emerald: { bg: "bg-emerald-500/[0.04]", border: "border-emerald-500/25", title: "text-emerald-100" },
    blue:    { bg: "bg-blue-500/[0.04]",    border: "border-blue-500/25",    title: "text-blue-100" },
  }

  return (
    <section className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/[0.05] to-rose-500/[0.05] p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-5 h-5 text-amber-300" />
        </div>
        <div>
          <h3 className="text-base font-bold text-amber-100">
            ⚠️ Checklist crítico ANTES de mandar pra impressora
          </h3>
          <p className="text-xs text-amber-100/75 mt-0.5 leading-relaxed">
            Bioink não é filamento. Pulei essa lista = print falha + bioink desperdiçada + células mortas.
            Leia os 6 itens abaixo antes de pressionar &quot;Iniciar&quot; na Etapa 4.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {ITEMS.map((it, i) => {
          const t = TONE_MAP[it.tone]
          return (
            <div
              key={i}
              className={cn("rounded-xl border p-3", t.bg, t.border)}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-xl shrink-0 leading-none mt-0.5">{it.icon}</span>
                <div className="min-w-0">
                  <p className={cn("text-xs font-semibold leading-tight", t.title)}>{it.title}</p>
                  <p className="text-[11px] text-gray-300/80 mt-1 leading-relaxed">{it.body}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-amber-500/15 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[11px] text-amber-100/60 italic">
          Dica BIA: imprima primeiro a versão SEM CÉLULAS (acelular) para validar geometria + Z-offset.
          Só depois rode com bioink celular cara.
        </p>
        <Link
          href="/dashboard/bioprint/control"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-200 inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          Ir para Execução · Etapa 4 <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  )
}

// ─── Stat box ───────────────────────────────────────────────────────────────
function StatBox({
  label, value, icon: Icon, tone = "neutral",
}: {
  label: string; value: string; icon: typeof Layers
  tone?: "good" | "warn" | "bad" | "neutral"
}) {
  const colors = {
    good:    "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    warn:    "border-amber-500/30 bg-amber-500/10 text-amber-200",
    bad:     "border-rose-500/30 bg-rose-500/10 text-rose-200",
    neutral: "border-white/8 bg-white/3 text-violet-200",
  }
  return (
    <div className={cn("rounded-xl border p-3", colors[tone])}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 opacity-70" />
        <span className="text-[10px] uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// PrinterPrepSection (R10) — Conexão + joystick no topo da aba G-code.
// Permite que o usuário PREPARE a máquina (homing, Z-offset, purga)
// ANTES de gerar/enviar o G-code.
// ═══════════════════════════════════════════════════════════════════════
function PrinterPrepSection({ gcode, printerName }: { gcode: string; printerName: string }) {
  const [expanded, setExpanded] = useState(true)
  const [isConnected, setIsConnected] = useState(false)

  return (
    <section className="rounded-2xl bg-gradient-to-br from-quantis-blue-500/[0.06] to-quantis-purple-500/[0.04] border border-quantis-blue-400/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="w-11 h-11 rounded-xl bg-quantis-blue-500/20 border border-quantis-blue-400/40 flex items-center justify-center shrink-0">
          <Printer className="w-5 h-5 text-quantis-blue-200" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-white">Preparar a Bioimpressora</h3>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full border font-semibold inline-flex items-center gap-1",
              isConnected
                ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-200"
                : "bg-quantis-ink-700/40 border-quantis-ink-500/40 text-quantis-ink-200"
            )}>
              {isConnected ? "● ONLINE" : "○ OFFLINE"}
            </span>
          </div>
          <p className="text-sm text-quantis-blue-100/80 mt-0.5">
            Conecte por USB, faça homing, ajuste Z-offset e purgue antes de gerar/enviar o G-code.
          </p>
        </div>
        {expanded ? <ChevronDown className="w-5 h-5 text-quantis-blue-200" /> : <ChevronRight className="w-5 h-5 text-quantis-blue-200" />}
      </button>

      {expanded && (
        <div className="px-4 sm:px-5 pb-5 border-t border-white/5 pt-4">
          <PrinterConnection
            gcode={gcode}
            printerName={printerName}
            onConnectionChange={setIsConnected}
          />
        </div>
      )}
    </section>
  )
}
