"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA — Etapa 4 / 4 · Execução (controle da bioimpressora)
 *  ───────────────────────────────────────────────────────────────────────
 *  Hub central de controle da bioimpressora em 4 painéis:
 *    A. JOYSTICK + CONSOLE — controle manual + log de G-code real
 *    B. EXTRUSÃO + SENSORES — pneumático/pistão/screw + temperaturas + UR
 *    C. TECIDO VIVO         — viabilidade live (Hagen-Poiseuille + Blaeser)
 *    D. PÓS-BIOIMPRESSÃO    — cultura → biorreator → assays (7 protocolos)
 *
 *  LÊ:  state.model (categoria → tipo tecido) +
 *       state.bioink (material → perfil, células → sensibilidade) +
 *       state.slice  (gcode → pré-carregado no console, pressão/temps)
 *  ESCREVE: state.control (tissueType + connected)
 *
 *  Substitui /dashboard/bioprinter-control (será alvo do R7 redirect).
 *
 *  Pré-requisito: state.slice.status === "ready" (precisa de G-code)
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Gamepad2, Terminal, Microscope, Beaker, FlaskConical, Settings2,
  ShieldCheck, Info, AlertTriangle, CheckCircle2, Layers, Droplets,
  PlayCircle, Download, Cable,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { useBioprintProcess } from "@/lib/bioprint/process-context"
import { Joystick3D, type JoystickPosition } from "@/components/bioprinter/Joystick3D"
import { ExtrusionPanel, type ExtrusionState } from "@/components/bioprinter/ExtrusionPanel"
import { TissueViabilityPanel, type TissueState } from "@/components/bioprinter/TissueViabilityPanel"
import { PostBioprintingPanel, type PostBioState } from "@/components/bioprinter/PostBioprintingPanel"

// ─── Mapas auxiliares ──────────────────────────────────────────────────────

// state.bioink.material → bioinkType de TEMPERATURE_PROFILES (chave usada nos painéis)
function mapToProfileKey(materialLabel: string | null): string {
  if (!materialLabel) return "Gelatina/GelMA"
  const lower = materialLabel.toLowerCase()
  if (lower.includes("gelma") || lower.includes("gelatina")) return "Gelatina/GelMA"
  if (lower.includes("alginato") || lower.includes("alginate")) return "Alginato"
  if (lower.includes("colágeno") || lower.includes("colageno") || lower.includes("collagen")) return "Colágeno"
  if (lower.includes("fibrin")) return "Fibrina"
  if (lower.includes("pegda") || lower.includes("pegma")) return "PEGDA / PEGMA"
  if (lower.includes("decm")) return "dECM (decellularizada)"
  if (lower.includes("pluronic")) return "Pluronic F127 (sacrificial)"
  return "Gelatina/GelMA"
}

// state.bioink.cellType (id) → label legível para CELL_SENSITIVITY
function mapCellTypeLabel(cellTypeId: string | null): string {
  if (!cellTypeId) return "Fibroblastos (NIH-3T3)"
  const map: Record<string, string> = {
    hMSC: "hMSC (mesenchymal stem)",
    iPSC: "iPSC (pluripotent)",
    Hepatocyte: "Hepatócitos",
    Cardiomyocyte: "Cardiomiócitos",
    Chondrocyte: "Condrócitos",
    Osteoblast: "Osteoblastos",
    Fibroblast: "Fibroblastos (NIH-3T3)",
    Keratinocyte: "Queratinócitos",
    Endothelial: "Endoteliais (HUVEC)",
    Neuron: "Neurônios",
  }
  return map[cellTypeId] ?? cellTypeId
}

// state.model.category → tipo de tecido alvo (chave em POST_PROCESSING)
function mapCategoryToTissue(category: string | null): string {
  if (!category) return "Cardíaco (patch)"
  switch (category) {
    case "rigid-tissue":      return "Ósseo (scaffold)"
    case "biomimetic-tpms":   return "Ósseo (scaffold)"
    case "organoid-vascular": return "Vascular (vaso)"
    case "printability-test": return "Cardíaco (patch)"
    case "soft-tissue":
    default:                  return "Cardíaco (patch)"
  }
}

// Tipos de tecido disponíveis em POST_PROCESSING (visível na tab)
const TISSUE_TYPES = [
  "Cardíaco (patch)",
  "Ósseo (scaffold)",
  "Cartilagem",
  "Vascular (vaso)",
  "Pele",
  "Nervo (conduit)",
  "Hepático",
] as const

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
export default function BioprintControlPage() {
  const { state, updateControl } = useBioprintProcess()

  // ── Pré-requisito ──
  const sliceReady = state.slice.status === "ready"
  const isUnlocked = sliceReady

  // ── Tipo de tecido (escrito no context) ──
  const [tissueType, setTissueType] = useState<string>(
    state.control.tissueType ?? mapCategoryToTissue(state.model.category)
  )

  // ── Joystick / Console ──
  const [position, setPosition] = useState<JoystickPosition>({ x: 0, y: 0, z: 0, e: 0 })

  // Pré-carrega o console com info do contexto + (se houver) primeiras linhas do G-code
  const initialLog = useMemo(() => {
    const lines = [
      "; ═══════════════════════════════════════════════════════════",
      "; BIA · Bioprint Process — Etapa 4/4 · Execução",
      "; ═══════════════════════════════════════════════════════════",
      state.model.geometryId
        ? `; Modelo: ${state.model.name ?? state.model.geometryId} (${state.model.category ?? "—"})`
        : "; Modelo: (não definido)",
      state.bioink.material
        ? `; Biotinta: ${state.bioink.material} ${state.bioink.concentration ?? "?"}%${
            state.bioink.cellType
              ? ` + ${state.bioink.cellType} ${state.bioink.cellDensityMillionMl ?? "?"}×10^6/mL`
              : " (acelular)"
          }`
        : "; Biotinta: (não definida)",
      state.slice.gcode
        ? `; G-code: ${state.slice.estimate?.totalLayers ?? "?"} camadas · ${state.slice.estimate?.estimatedTimeMin ?? "?"} min`
        : "; G-code: (não gerado)",
      "; Modo simulação (impressora não conectada)",
      "; ═══════════════════════════════════════════════════════════",
    ]
    return lines
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [gcodeLog, setGcodeLog] = useState<string[]>(initialLog)

  // ── Extrusão (pré-populada do state.bioink + state.slice) ──
  const [extrusion, setExtrusion] = useState<ExtrusionState>(() => ({
    mechanism: "pneumatic",
    setpoint: state.slice.pressureKPa ?? 30,
    actual: (state.slice.pressureKPa ?? 30) * 0.95,
    cartridgeTempC: state.slice.cartridgeTempC ?? 25,
    bedTempC: state.slice.bedTempC ?? 6,
    chamberTempC: state.slice.chamberTempC ?? 20,
    humidityPercent: 85,
    bioink: mapToProfileKey(state.bioink.material),
  }))

  // ── Tecido vivo (pré-populado) ──
  const [tissue, setTissue] = useState<TissueState>(() => ({
    cellType: mapCellTypeLabel(state.bioink.cellType),
    cellDensityMillionMl: state.bioink.cellDensityMillionMl ?? 5,
    pressureKPa: state.slice.pressureKPa ?? 30,
    nozzleDiameterUm: state.slice.nozzleDiameterUm ?? 410,
    viscosityPaS: state.bioink.rheology?.viscosityPaS ?? 3.0,
    printSpeedMmS: state.slice.printSpeedMmS ?? 8,
    bioink: state.bioink.material ?? "GelMA",
    targetDimensionMm: 10,
    infillPatternId: state.slice.infillPatternId ?? "parallel-lines",
  }))

  // ── Pós-bioimpressão ──
  const [postBio, setPostBio] = useState<PostBioState>(() => ({
    tissueType: state.control.tissueType ?? mapCategoryToTissue(state.model.category),
  }))

  // ── Logger ──
  const log = useCallback((line: string) => {
    setGcodeLog((prev) => [...prev.slice(-199), line])
  }, [])

  // ── Quando tissueType muda: atualizar context + postBio ──
  const handleTissueChange = useCallback((newType: string) => {
    setTissueType(newType)
    setPostBio({ tissueType: newType })
    updateControl({
      status: "ready",
      tissueType: newType,
    })
  }, [updateControl])

  // ── Persistir control no context (status "ready" quando tem tissueType definido) ──
  useEffect(() => {
    if (!isUnlocked) return
    updateControl({
      status: tissueType ? "ready" : "draft",
      tissueType,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked, tissueType])

  // ── Handlers do Joystick ────────────────────────────────────────────
  const handleMove = useCallback((axis: "X" | "Y" | "Z" | "E", delta: number) => {
    setPosition((prev) => {
      const next = { ...prev }
      const key = axis.toLowerCase() as "x" | "y" | "z" | "e"
      next[key] = +(prev[key] + delta).toFixed(3)
      const feedrate = axis === "Z" ? 300 : axis === "E" ? 200 : 1500
      log(`G91 ; modo relativo`)
      log(`G1 ${axis}${delta > 0 ? "+" : ""}${delta} F${feedrate}`)
      log(`G90 ; modo absoluto`)
      return next
    })
  }, [log])

  const handleHome = useCallback((axis: "all" | "X" | "Y" | "Z") => {
    setPosition({ x: 0, y: 0, z: 0, e: 0 })
    log(`G28${axis === "all" ? "" : " " + axis} ; home ${axis === "all" ? "todos os eixos" : "eixo " + axis}`)
  }, [log])

  const handleZero = useCallback(() => {
    log(`G92 X0 Y0 Z0 E0 ; zera posições virtuais no local atual`)
    setPosition({ x: 0, y: 0, z: 0, e: 0 })
  }, [log])

  const handleProbeZ = useCallback(() => {
    log(`; ── Z-Probe suave (0.5N) — modo bio ──`)
    log(`M851 Z-2.5 ; offset do probe`)
    log(`G29 ; auto-bed-leveling com sensor suave`)
    log(`G1 Z2 F300 ; sobe 2mm para segurança`)
  }, [log])

  const handlePurge = useCallback(() => {
    log(`; ── Purga de ar (pré-print) ──`)
    log(`G91`)
    log(`G1 E1.0 F60 ; extrude 1mm devagar para tirar bolha de ar`)
    log(`G90`)
    setPosition((p) => ({ ...p, e: +(p.e + 1).toFixed(3) }))
  }, [log])

  const handleSterilePause = useCallback(() => {
    log(`; ── Pausa estéril (mantém pressão pneumática) ──`)
    log(`M0 ; pausa firmware`)
    log(`; ATENÇÃO: NÃO despressurizar — toggle pneumático fica ON`)
  }, [log])

  const handleGoToRest = useCallback(() => {
    log(`; ── Posição de repouso para troca de cartucho ──`)
    log(`G1 Z20 F300 ; sobe 20mm`)
    log(`G1 X0 Y200 F3000 ; canto traseiro`)
    setPosition({ x: 0, y: 200, z: 20, e: position.e })
  }, [log, position.e])

  const clearLog = () => setGcodeLog([...initialLog, "; (log limpo)"])

  // ── Download do G-code (re-disponibilizado aqui pra conveniência) ──
  const downloadFromContext = useCallback(() => {
    if (!state.slice.gcode) return
    const header = [
      "; ═══════════════════════════════════════════════════════════",
      "; BIA · Bioprint Process — G-code (Etapa 4/4 · Execução)",
      "; ═══════════════════════════════════════════════════════════",
      `; Modelo: ${state.model.name ?? state.model.geometryId}`,
      `; Bioink: ${state.bioink.material} ${state.bioink.concentration}%`,
      state.bioink.cellType
        ? `; Células: ${state.bioink.cellType} ${state.bioink.cellDensityMillionMl}×10^6/mL`
        : "; Sem células (scaffold acelular)",
      `; Tecido alvo: ${tissueType}`,
      "; ═══════════════════════════════════════════════════════════",
      "",
    ].join("\n")
    const blob = new Blob([header + state.slice.gcode], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bia_${state.model.geometryId ?? "job"}.gcode`
    a.click()
    URL.revokeObjectURL(url)
  }, [state, tissueType])

  // ── "Iniciar Print" — só simulação por enquanto ──
  const handleStartPrint = useCallback(() => {
    log(`; ╔═══════════════════════════════════════════════════════════╗`)
    log(`;   INICIANDO IMPRESSÃO (modo simulação)`)
    log(`;   ⚠️ Conexão serial real será disponibilizada em update futuro`)
    log(`; ╚═══════════════════════════════════════════════════════════╝`)
    log(`M82  ; extrusão absoluta`)
    log(`G21  ; mm`)
    log(`G90  ; coords absolutas`)
    log(`G28  ; HOME`)
    log(`G92 X0 Y0 Z0 E0  ; zera posições`)
    log(`G1 Z0.4 F300  ; sobe bico 0.4mm`)
    log(`G4 P500  ; pausa 0.5s`)
    log(`; ── PRINT STARTS HERE ──`)
    if (state.slice.gcode) {
      const firstLines = state.slice.gcode.split("\n").slice(0, 5)
      firstLines.forEach(l => log(l))
      log(`; ... +${state.slice.gcode.split("\n").length - 5} linhas`)
    }
  }, [log, state.slice.gcode])

  return (
    <div className="flex flex-col min-h-full bg-[#0a0a0f]">
      {/* Cabeçalho */}
      <header className="px-4 sm:px-6 py-5 border-b border-white/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-300/80 font-semibold mb-1">
              Etapa 4 / 4 · Bioimpressão
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-emerald-400" />
              Execução
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl">
              Controle ao vivo da bioimpressora — joystick, extrusão, viabilidade celular e
              protocolos pós-impressão (cultura + biorreator + assays).
            </p>
          </div>

          {state.slice.gcode && (
            <button
              onClick={downloadFromContext}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25
                border border-emerald-500/40 text-emerald-200 text-xs font-medium rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" /> Baixar G-code
            </button>
          )}
        </div>
      </header>

      {/* Aviso se etapa 3 não pronta */}
      {!isUnlocked && (
        <div className="mx-4 sm:mx-6 mt-4 rounded-xl bg-amber-500/8 border border-amber-500/30 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-amber-200">Etapa 3 (Fatiamento) ainda não foi concluída</div>
            <div className="text-xs text-amber-100/70 mt-0.5">
              Você pode explorar os painéis de controle, mas para executar uma bioimpressão real
              é necessário gerar o G-code na etapa anterior.
            </div>
          </div>
          <Link
            href="/dashboard/bioprint/slice"
            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-100 transition-colors"
          >
            Voltar à Etapa 3
          </Link>
        </div>
      )}

      {/* Contexto resumido das 3 etapas anteriores */}
      {isUnlocked && (
        <div className="mx-4 sm:mx-6 mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-rose-500/5 border border-rose-500/20 px-3 py-2.5 flex items-center gap-2">
            <Microscope className="w-4 h-4 text-rose-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[9px] uppercase tracking-wider text-rose-300/70 font-semibold">Etapa 1 · Modelo</div>
              <div className="text-xs text-rose-100 truncate">{state.model.name ?? state.model.geometryId}</div>
            </div>
          </div>
          <div className="rounded-xl bg-cyan-500/5 border border-cyan-500/20 px-3 py-2.5 flex items-center gap-2">
            <Droplets className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[9px] uppercase tracking-wider text-cyan-300/70 font-semibold">Etapa 2 · Biotinta</div>
              <div className="text-xs text-cyan-100 truncate">
                {state.bioink.material} {state.bioink.concentration}%
                {state.bioink.cellType && ` + ${state.bioink.cellType}`}
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-violet-500/5 border border-violet-500/20 px-3 py-2.5 flex items-center gap-2">
            <Layers className="w-4 h-4 text-violet-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[9px] uppercase tracking-wider text-violet-300/70 font-semibold">Etapa 3 · G-code</div>
              <div className="text-xs text-violet-100 truncate">
                {state.slice.estimate?.totalLayers ?? "?"} camadas · {state.slice.estimate?.estimatedTimeMin ?? "?"} min
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 px-4 sm:px-6 py-6 pb-24 space-y-6 max-w-7xl mx-auto w-full">
        {/* Aviso de fase */}
        <section className="rounded-2xl bg-gradient-to-br from-violet-500/8 to-emerald-500/8 border border-emerald-500/20 p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Info className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-white mb-1.5">
                Controle de bioimpressora — não é Pronterface, é bioengenheiro
              </h2>
              <p className="text-xs text-gray-300 leading-relaxed">
                O Pronterface foi feito para imprimir plástico. Bioimpressão é outro mundo:
                células vivas, hidrogéis viscoelásticos, riscos de contaminação, viabilidade que despenca
                se você apertar demais. Este painel é o <strong className="text-emerald-200">controle remoto da
                sua bioimpressora pensado por bioengenheiro</strong> — cada botão tem racional biológico.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                <Tag>Joystick com micropasso 0.05mm</Tag>
                <Tag>G92 com 1 clique</Tag>
                <Tag>Z-probe suave (0.5N)</Tag>
                <Tag>Purga anti-bolha</Tag>
                <Tag>Pausa estéril</Tag>
                <Tag>Extrusão (pneum/pistão/screw)</Tag>
                <Tag>Triplo controle térmico</Tag>
                <Tag>Viabilidade live (Blaeser 2016)</Tag>
                <Tag>Encolhimento + crosslink</Tag>
                <Tag>Pós-print: cultura + biorreator + assays</Tag>
                <Tag tone="pending">⏳ Conexão serial real (em desenvolvimento)</Tag>
              </div>
            </div>
          </div>
        </section>

        {/* Tipo de tecido alvo (chave para POST_PROCESSING) */}
        <section className="rounded-2xl bg-white/[0.02] border border-white/5 p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Beaker className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Tipo de tecido alvo</h3>
              <p className="text-[10px] text-gray-500">
                Define o protocolo pós-impressão (cultura, crosslink, biorreator, assays)
                {state.model.category && (
                  <span className="ml-2 text-emerald-400">
                    · sugerido para sua categoria de modelo: {mapCategoryToTissue(state.model.category)}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {TISSUE_TYPES.map(t => {
              const isRecommended = mapCategoryToTissue(state.model.category) === t
              return (
                <button
                  key={t}
                  onClick={() => handleTissueChange(t)}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all",
                    tissueType === t
                      ? "border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/30"
                      : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5",
                    isRecommended && tissueType !== t && "border-emerald-500/25"
                  )}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={cn(
                      "text-xs font-semibold leading-tight",
                      tissueType === t ? "text-emerald-200" : "text-white"
                    )}>
                      {t}
                    </span>
                    {isRecommended && tissueType !== t && (
                      <span className="text-[8px] text-emerald-400 font-bold">REC</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Grade: Joystick + Console */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_1fr] gap-6">
          {/* Joystick */}
          <section className="rounded-2xl bg-white/[0.02] border border-white/5 p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                <Gamepad2 className="w-4 h-4 text-violet-300" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Joystick 3D</h3>
                <p className="text-[10px] text-gray-500">Controle manual X/Y/Z + extrusora</p>
              </div>
            </div>

            <Joystick3D
              position={position}
              onMove={handleMove}
              onHome={handleHome}
              onZero={handleZero}
              onProbeZ={handleProbeZ}
              onPurge={handlePurge}
              onSterilePause={handleSterilePause}
              onGoToRest={handleGoToRest}
              connected={false}
            />
          </section>

          {/* Console G-code */}
          <section className="rounded-2xl bg-black/40 border border-white/5 p-5 space-y-3 min-h-[600px] flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <Terminal className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Console G-code</h3>
                  <p className="text-[10px] text-gray-500">
                    Comandos do joystick + G-code da Etapa 3 aparecem aqui
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {state.slice.gcode && (
                  <button
                    onClick={handleStartPrint}
                    className="text-[10px] px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 transition-colors flex items-center gap-1"
                  >
                    <PlayCircle className="w-3 h-3" /> Simular print
                  </button>
                )}
                <button
                  onClick={clearLog}
                  className="text-[10px] px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  Limpar
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto rounded-xl bg-black/60 border border-white/5 p-3 font-mono text-[11px] leading-relaxed">
              {gcodeLog.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.startsWith(";")
                      ? "text-gray-500"
                      : line.startsWith("G28")
                        ? "text-violet-300"
                        : line.startsWith("G92")
                          ? "text-cyan-300 font-semibold"
                          : line.startsWith("G29") || line.startsWith("M851")
                            ? "text-cyan-300"
                            : line.startsWith("M0")
                              ? "text-amber-300"
                              : "text-emerald-200"
                  }
                >
                  {line}
                </div>
              ))}
            </div>

            <div className="text-[10px] text-gray-500 flex items-center gap-2 pt-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              {Math.max(0, gcodeLog.length - initialLog.length)} comandos gerados nesta sessão · Marlin compatível
            </div>
          </section>
        </div>

        {/* Extrusão + Sensores */}
        <section className="rounded-2xl bg-white/[0.02] border border-white/5 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                <FlaskConical className="w-4 h-4 text-cyan-300" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Extrusão Fluida + Sensores</h3>
                <p className="text-[10px] text-gray-500">
                  Mecanismo · pressão/vazão/rotação · cartucho · cama · câmara · umidade
                </p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
              Pré-populado: Etapa 2 + Etapa 3
            </span>
          </div>
          <ExtrusionPanel state={extrusion} onChange={setExtrusion} onGcode={log} />
        </section>

        {/* Tecido vivo / Viabilidade */}
        <section className="rounded-2xl bg-white/[0.02] border border-white/5 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <Microscope className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Tecido Vivo · Viabilidade ao Vivo</h3>
                <p className="text-[10px] text-gray-500">
                  Shear stress → viabilidade prevista · Encolhimento · Crosslinking · Padrão BIO
                </p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              Hagen-Poiseuille + Blaeser 2016
            </span>
          </div>
          <TissueViabilityPanel state={tissue} onChange={setTissue} onGcode={log} />
        </section>

        {/* Pós-bioimpressão */}
        <section className="rounded-2xl bg-white/[0.02] border border-white/5 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                <Beaker className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Pós-Bioimpressão · Cultura → Biorreator → Validação</h3>
                <p className="text-[10px] text-gray-500">
                  Protocolos por tipo de tecido: cardíaco · ósseo · cartilagem · vaso · pele · nervo · hepático
                </p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
              Tecido alvo: {tissueType}
            </span>
          </div>
          <PostBioprintingPanel
            state={postBio}
            onChange={(s) => {
              setPostBio(s)
              if (s.tissueType !== tissueType) handleTissueChange(s.tissueType)
            }}
          />
        </section>

        {/* Próxima fase: serial real */}
        <section className="rounded-2xl bg-gradient-to-br from-cyan-500/[0.04] to-cyan-500/[0.02] border border-cyan-500/15 p-5 opacity-80 hover:opacity-100 transition-opacity">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Cable className="w-4 h-4 text-cyan-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white">Conexão serial real <span className="text-[10px] text-cyan-300 ml-2">(em construção)</span></h4>
              <p className="text-[11px] text-gray-400 leading-relaxed mt-1">
                Bridge USB para Marlin via WebSerial API · Stream G-code em tempo real para a bioimpressora física ·
                Console bidirecional (ler temperaturas, endstops, status da impressora) ·
                Perfis de impressora salvos em PRINTER_PROFILES
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Rodapé sticky com status do processo completo */}
      <footer className="sticky bottom-0 z-10 bg-[#0a0a0f]/95 backdrop-blur border-t border-emerald-500/20 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm min-w-0">
          {state.control.status === "ready" ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-emerald-300 font-medium shrink-0">Processo 4/4:</span>
              <span className="text-gray-300 truncate">
                Tecido alvo: {tissueType} · protocolos pós-impressão prontos
              </span>
            </>
          ) : (
            <>
              <Info className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="text-gray-400 text-xs">
                {isUnlocked ? "Defina o tipo de tecido alvo para finalizar o processo" : "Complete a Etapa 3 (Fatiamento) primeiro"}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {state.slice.gcode && (
            <button
              onClick={downloadFromContext}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-xs font-medium rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> G-code
            </button>
          )}
          <Link
            href="/dashboard/bioprint"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-200 text-sm font-medium rounded-lg transition-colors"
          >
            Voltar ao hub
          </Link>
        </div>
      </footer>
    </div>
  )
}

// ─── Componentes auxiliares ─────────────────────────────────────────────────

function Tag({ children, tone = "ok" }: { children: React.ReactNode; tone?: "ok" | "pending" }) {
  return (
    <span
      className={
        tone === "pending"
          ? "px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300"
          : "px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
      }
    >
      {children}
    </span>
  )
}
