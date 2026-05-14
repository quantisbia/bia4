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
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { useBioprintProcess } from "@/lib/bioprint/process-context"
import { INFILL_PATTERNS, TEMPERATURE_PROFILES } from "@/lib/bioprinter/biomedical-params"
import { BIOPRINTERS, getBioprinterById, supportsWebSerial } from "@/lib/bioprinting/bioprinters"

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
  const [tab, setTab] = useState<"params" | "wells" | "gcode">("params")

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
  const [error, setError] = useState<string | null>(null)
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

  // ── Geração de G-code ──
  const generateGCode = useCallback(async () => {
    if (!isUnlocked) {
      setError("Complete as etapas 1 (Modelo) e 2 (Biotinta) antes de gerar G-code.")
      return
    }
    if (!state.model.geometryId) {
      setError("Modelo 3D não tem geometryId — verifique a Etapa 1.")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

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
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao gerar G-code")

      setResult(data as GCodeResponse)
      // Persistir gcode + estimate
      updateSlice({
        status: "ready",
        gcode: data.gcode ?? null,
        estimate: {
          totalLayers: data.layerCount,
          estimatedTimeMin: data.estimatedTime_min,
          estimatedVolumeMl: data.bioinkVolume_uL ? data.bioinkVolume_uL / 1000 : undefined,
        },
      })
      // Pular para tab G-code
      setTab("gcode")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado")
    } finally {
      setLoading(false)
    }
  }, [
    isUnlocked, state.model, state.bioink, algorithm, infillPercent,
    bioprinterId, layerHeightMm, walls, skirtLoops, retractionMm,
    pressureKPa, printSpeedMmS, nozzleDiameterUm, cartridgeTempC,
    useMultiWell, plateFormat, selectedWells, zHopBetweenWellsMm,
    pauseBetweenWellsS, purgeVolumeUL, updateSlice,
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
    <div className="flex flex-col min-h-full bg-[#0a0a0f]">
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
          <GCodePanel
            loading={loading}
            error={error}
            result={result}
            onGenerate={generateGCode}
            onDownload={downloadGCode}
            isUnlocked={isUnlocked}
          />
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
      {/* Toggle multi-well */}
      <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
              <Beaker className="w-4 h-4 text-violet-400" />
              Impressão em placa multi-poços
            </h3>
            <p className="text-xs text-gray-400 max-w-2xl">
              Use placas SBS padrão (6–384 poços) para replicar a mesma geometria em vários poços simultaneamente.
              Útil para screening de drogas, ensaios de viabilidade ou validação estatística.
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer shrink-0">
            <div
              onClick={() => onUseMultiWellChange(!useMultiWell)}
              className={cn(
                "w-10 h-5 rounded-full relative transition-colors cursor-pointer",
                useMultiWell ? "bg-violet-500" : "bg-white/10"
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
              )} style={{ left: useMultiWell ? "22px" : "2px" }} />
            </div>
            <span className="text-xs text-gray-300">{useMultiWell ? "Ativado" : "Direto na mesa"}</span>
          </label>
        </div>
      </section>

      {useMultiWell && (
        <>
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
            <h3 className="text-sm font-semibold text-white mb-3">Parâmetros entre poços</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SliderField
                label="Z-hop entre poços" icon={Layers}
                min={1} max={20} step={0.5}
                value={zHopBetweenWellsMm} onChange={onZHopChange}
                display={`${zHopBetweenWellsMm.toFixed(1)} mm`}
                hint="Subida do bico ao mover"
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
  loading: boolean; error: string | null; result: GCodeResponse | null
  onGenerate: () => void; onDownload: () => void; isUnlocked: boolean
}) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(() => {
    if (!result?.gcode) return
    navigator.clipboard.writeText(result.gcode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [result])

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Botão de gerar (se ainda não gerou) */}
      {!result && !loading && (
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
          <p className="text-[10px] text-gray-600 mt-3">Custo: 6 créditos por geração</p>
        </section>
      )}

      {/* Loading */}
      {loading && (
        <section className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-8 text-center">
          <Loader2 className="w-12 h-12 text-violet-400 mx-auto mb-3 animate-spin" />
          <h3 className="text-base font-semibold text-white mb-1">Gerando G-code…</h3>
          <p className="text-xs text-gray-400">Calculando trajetórias, viabilidade celular e cabeçalho de segurança</p>
        </section>
      )}

      {/* Erro */}
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-rose-200">Erro ao gerar G-code</p>
            <p className="text-xs text-rose-100/70 mt-1">{error}</p>
          </div>
          <button
            onClick={onGenerate}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-100 whitespace-nowrap"
          >
            Tentar novamente
          </button>
        </div>
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
