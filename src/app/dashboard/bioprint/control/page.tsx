"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA — Etapa 4 / 5 · Execução (controle da bioimpressora)
 *  ───────────────────────────────────────────────────────────────────────
 *  Foco da etapa 4 (R12.3): controle ao vivo da bioimpressora.
 *    1. Conexão USB (Web Serial / Marlin) + Joystick 3D em destaque
 *    2. Real-Time Controls (temperatura, retração, Z-offset) abaixo do joystick
 *    3. Console G-code (lado direito do joystick)
 *    4. Modo avançado (colapsável): Extrusão + Sensores · Viabilidade + Encolhimento
 *
 *  A escolha do "Tipo de tecido alvo" e o painel "Pós-Bioimpressão"
 *  foram movidos para a Etapa 5 (/dashboard/bioprint/post).
 *
 *  LÊ:  state.model · state.bioink · state.slice
 *  ESCREVE: state.control (connected + status)
 *
 *  Pré-requisito: state.slice.status === "ready" (precisa de G-code)
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import {
  Gamepad2, Terminal, Microscope, Beaker, FlaskConical,
  ShieldCheck, Info, AlertTriangle, CheckCircle2, Layers, Droplets,
  PlayCircle, Download, Usb, Radio, ArrowRight, Sliders,
  Snowflake, Zap as ZapIcon, Crosshair,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { useBioprintProcess } from "@/lib/bioprint/process-context"
import { type JoystickPosition } from "@/components/bioprinter/Joystick3D"
import { ExtrusionPanel, type ExtrusionState } from "@/components/bioprinter/ExtrusionPanel"
import { TissueViabilityPanel, type TissueState } from "@/components/bioprinter/TissueViabilityPanel"
import { PrinterConnection } from "@/components/bioprinting/PrinterConnection"
import { RealtimeControls } from "@/components/bioprinting/RealtimeControls"
import { InfoButton } from "@/components/ui/InfoButton"
import { CollapsibleSection } from "@/components/ui/CollapsibleSection"
import { BioengineerLiveDock, type DockTab } from "@/components/bioprinter/BioengineerLiveDock"

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
    case "rigid-tissue":      return "Ósseo"
    case "biomimetic-tpms":   return "Ósseo"
    case "organoid-vascular": return "Vaso sanguíneo"
    case "printability-test": return "Cardíaco (patch)"
    case "soft-tissue":
    default:                  return "Cardíaco (patch)"
  }
}

// (Tipos de tecido movidos para a Etapa 5 — /dashboard/bioprint/post)

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
export default function BioprintControlPage() {
  const { state, updateControl } = useBioprintProcess()

  // ── Pré-requisito ──
  const sliceReady = state.slice.status === "ready"
  const isUnlocked = sliceReady

  // Tipo de tecido inferido (usado apenas pelo painel de viabilidade aqui;
  // a seleção real foi movida para a Etapa 5)
  const inferredTissue = state.control.tissueType ?? mapCategoryToTissue(state.model.category)

  // ── Joystick / Console ──
  const [position, setPosition] = useState<JoystickPosition>({ x: 0, y: 0, z: 0, e: 0 })

  // ── Conexão real com a bioimpressora (Web Serial) ──
  const [isConnected, setIsConnected] = useState(false)
  // Ref para o sendCommand exposto pelo PrinterConnection (via renderExtraControls)
  const sendCommandRef = useRef<((cmd: string) => Promise<void>) | null>(null)

  // Envia comando para a impressora real (se conectada) — joystick reaproveita isso
  const sendToPrinter = useCallback(async (cmd: string) => {
    if (isConnected && sendCommandRef.current) {
      try {
        await sendCommandRef.current(cmd)
      } catch (err) {
        console.error("[bioprint/control] Falha ao enviar comando:", err)
      }
    }
  }, [isConnected])

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

  // ── Logger ──
  const log = useCallback((line: string) => {
    setGcodeLog((prev) => [...prev.slice(-199), line])
  }, [])

  // ── Persistir control no context: Etapa 4 fica "ready" quando a impressão
  //    foi configurada ao menos uma vez (basta interagir com joystick OU conectar).
  //    A escolha de tecido foi movida para a Etapa 5. ──
  useEffect(() => {
    if (!isUnlocked) return
    updateControl({
      status: "ready",
      connected: isConnected,
      // Mantém qualquer tissueType prévio para retrocompat com Etapa 5
      tissueType: state.control.tissueType ?? inferredTissue,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked, isConnected])

  // ── Handlers do Joystick ────────────────────────────────────────────
  // Cada handler: registra no console + (se conectado) envia para a máquina real via sendToPrinter.
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
    const feedrate = axis === "Z" ? 300 : axis === "E" ? 200 : 1500
    void sendToPrinter("G91")
    void sendToPrinter(`G1 ${axis}${delta > 0 ? "+" : ""}${delta} F${feedrate}`)
    void sendToPrinter("G90")
  }, [log, sendToPrinter])

  // ❌ handleHome (G28) foi REMOVIDO intencionalmente.
  // Bioimpressora NUNCA faz home automático — preserva a posição da bandeja
  // (wells, scaffolds, samples) e do cartucho. Posicione manualmente com o
  // joystick e use G92 ZERO AQUI para definir o zero relativo.

  // ── G92 Zero AQUI · zera coordenadas virtuais no ponto atual SEM MOVER NADA ──
  // 🚫 IMPORTANTE: NUNCA chama G28 (home) — bioimpressora preserva bandeja/cartucho.
  // ✅ Envio síncrono pra impressora antes de logar — garante feedback real (não "fake zero").
  const handleZero = useCallback(async () => {
    const cmd = "G92 X0 Y0 Z0 E0"
    log(`; ╔══ 🎯 G92 ZERO AQUI · sem home, sem mover ══╗`)
    log(`${cmd} ; zera posições virtuais no ponto físico atual`)
    setPosition({ x: 0, y: 0, z: 0, e: 0 })
    if (sendCommandRef.current) {
      try {
        await sendCommandRef.current(cmd)
        log(`; ✓ G92 enviado para a impressora REAL — coordenadas zeradas`)
      } catch (err) {
        log(`; ✗ FALHA ao enviar G92: ${err instanceof Error ? err.message : String(err)}`)
      }
    } else {
      log(`; ⚠️ Modo simulação (sem conexão USB) — G92 só zerado virtualmente`)
    }
  }, [log])

  const handleProbeZ = useCallback(() => {
    log(`; ── Z-Probe suave (0.5N) — modo bio ──`)
    log(`M851 Z-2.5 ; offset do probe`)
    log(`G29 ; auto-bed-leveling com sensor suave`)
    log(`G1 Z2 F300 ; sobe 2mm para segurança`)
    void sendToPrinter("M851 Z-2.5")
    void sendToPrinter("G29")
    void sendToPrinter("G1 Z2 F300")
  }, [log, sendToPrinter])

  const handlePurge = useCallback(() => {
    log(`; ── Purga de ar (pré-print) ──`)
    log(`G91`)
    log(`G1 E1.0 F60 ; extrude 1mm devagar para tirar bolha de ar`)
    log(`G90`)
    setPosition((p) => ({ ...p, e: +(p.e + 1).toFixed(3) }))
    void sendToPrinter("G91")
    void sendToPrinter("G1 E1.0 F60")
    void sendToPrinter("G90")
  }, [log, sendToPrinter])

  const handleSterilePause = useCallback(() => {
    log(`; ── Pausa estéril (mantém pressão pneumática) ──`)
    log(`M0 ; pausa firmware`)
    log(`; ATENÇÃO: NÃO despressurizar — toggle pneumático fica ON`)
    void sendToPrinter("M0")
  }, [log, sendToPrinter])

  const handleGoToRest = useCallback(() => {
    log(`; ── Posição de repouso para troca de cartucho ──`)
    log(`G1 Z20 F300 ; sobe 20mm`)
    log(`G1 X0 Y200 F3000 ; canto traseiro`)
    setPosition({ x: 0, y: 200, z: 20, e: position.e })
    void sendToPrinter("G1 Z20 F300")
    void sendToPrinter("G1 X0 Y200 F3000")
  }, [log, position.e, sendToPrinter])

  // ── Resfriar TUDO — protege a placa de erro ao trocar cartucho ou desligar ──
  // M104 S0: cartucho off · M140 S0: cama off · M141 S0: câmara off
  const handleCoolAll = useCallback(() => {
    log(`; ── ❄️ Resfriar TUDO (proteção da placa) ──`)
    log(`M104 S0 ; desliga aquecedor do cartucho`)
    log(`M140 S0 ; desliga aquecedor da cama`)
    log(`M141 S0 ; desliga aquecedor da câmara`)
    void sendToPrinter("M104 S0")
    void sendToPrinter("M140 S0")
    void sendToPrinter("M141 S0")
  }, [log, sendToPrinter])

  // ── Bioengineer Live Dock (painel flutuante) ──
  // Resolve o problema de scroll jump: usa position:fixed, NUNCA é afetado pela rolagem
  const [dockOpen, setDockOpen] = useState(false)
  const [dockTab, setDockTab] = useState<DockTab>("joystick")

  const openDockTab = useCallback((t: DockTab) => {
    setDockTab(t)
    setDockOpen(true)
  }, [])

  const clearLog = () => setGcodeLog([...initialLog, "; (log limpo)"])

  // ── Download do G-code (re-disponibilizado aqui pra conveniência) ──
  // 🚫 NUNCA inclui G28 (HOME) — bioimpressora preserva cartucho/bandeja, não pode buscar endstop
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
      `; Tecido alvo (Etapa 5): ${state.control.tissueType ?? inferredTissue}`,
      "; ⚠️ ATENÇÃO: G-code SEM G28 (home) — posicione manualmente e use G92 para zerar.",
      "; ═══════════════════════════════════════════════════════════",
      "",
    ].join("\n")

    // 🚫 Filtra QUALQUER linha que comece com G28 (case-insensitive, ignora espaços iniciais)
    const sanitizedGcode = state.slice.gcode
      .split("\n")
      .filter((line) => {
        const trimmed = line.trim().toUpperCase()
        return !trimmed.startsWith("G28")
      })
      .join("\n")

    const blob = new Blob([header + sanitizedGcode], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bia_${state.model.geometryId ?? "job"}.gcode`
    a.click()
    URL.revokeObjectURL(url)
  }, [state, inferredTissue])

  // ── "Iniciar Print" — só simulação por enquanto ──
  const handleStartPrint = useCallback(() => {
    log(`; ╔═══════════════════════════════════════════════════════════╗`)
    log(`;   INICIANDO IMPRESSÃO (modo simulação)`)
    log(`;   ⚠️ Conexão serial real será disponibilizada em update futuro`)
    log(`; ╚═══════════════════════════════════════════════════════════╝`)
    log(`M82  ; extrusão absoluta`)
    log(`G21  ; mm`)
    log(`G90  ; coords absolutas`)
    log(`; SEM HOME (G28) — bioimpressora usa G92 no ponto atual para preservar bandeja/cartucho`)
    log(`G92 X0 Y0 Z0 E0  ; zera posições virtuais AQUI (sem mover)`)
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
    <div className="flex flex-col min-h-full bg-[#0a0a0f] bia-control-page">
      {/* Cabeçalho */}
      <header className="px-4 sm:px-6 py-5 border-b border-white/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-300/80 font-semibold mb-1">
              Etapa 4 / 5 · Bioimpressão
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-emerald-400" />
              Execução · Controle ao vivo
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl">
              Conecte a bioimpressora, mova o cabeçote com o joystick e acompanhe o G-code em tempo real.
              <span className="block mt-0.5 text-[11px] text-gray-500">
                A pós-bioimpressão (tecido alvo, cultura, biorreator, assays) está na <Link href="/dashboard/bioprint/post" className="text-rose-300 hover:text-rose-200 underline">Etapa 5</Link>.
              </span>
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

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  1. CONEXÃO + JOYSTICK + CONSOLE — em destaque, sem scroll-jump */}
        {/* ═══════════════════════════════════════════════════════════════ */}

        {/* Header compacto: Bioengenheiro + (i) Mais informações */}
        <section className="rounded-2xl bg-gradient-to-br from-emerald-500/[0.06] to-violet-500/[0.04] border border-emerald-500/20 p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  Bioengenheiro
                  <InfoButton title="Por que não é Pronterface?" align="left">
                    <p>
                      O Pronterface foi feito para imprimir plástico. Bioimpressão é outro mundo: células vivas,
                      hidrogéis viscoelásticos, riscos de contaminação, viabilidade que despenca se você apertar demais.
                    </p>
                    <p>
                      Este painel é o <strong className="text-emerald-200">controle remoto da sua bioimpressora pensado
                      por bioengenheiro</strong> — cada botão tem racional biológico.
                    </p>
                    <ul className="mt-1.5 space-y-1 text-[10.5px] list-disc list-inside">
                      <li>Joystick com micropasso 0.05 mm</li>
                      <li>G92 com 1 clique</li>
                      <li>Z-probe suave (0.5 N)</li>
                      <li>Purga anti-bolha</li>
                      <li>Pausa estéril (mantém pressão pneumática)</li>
                      <li>Triplo controle térmico (cartucho/cama/câmara)</li>
                      <li>Viabilidade live (Hagen-Poiseuille + Blaeser 2016)</li>
                      <li>Conexão serial real (Web Serial / Marlin)</li>
                    </ul>
                  </InfoButton>
                </h2>
                <p className="text-[11px] text-gray-400">
                  Controle remoto da bioimpressora pensado para tecidos vivos · cada botão tem racional biológico.
                </p>
              </div>
            </div>
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full border font-semibold inline-flex items-center gap-1",
              isConnected
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : "bg-gray-500/15 border-gray-500/30 text-gray-400"
            )}>
              <Radio className={cn("w-2.5 h-2.5", isConnected && "animate-pulse")} />
              {isConnected ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
        </section>

        {/* CONEXÃO USB — compacta no topo */}
        <section className="rounded-2xl bg-gradient-to-br from-cyan-500/[0.06] to-violet-500/[0.04] border border-cyan-500/25 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
              <Usb className="w-4 h-4 text-cyan-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                Passo 1 · Conexão USB
                <InfoButton title="Como funciona a Web Serial API?" align="left">
                  <p>
                    Conexão direta com sua bioimpressora via Web Serial API (Chrome/Edge 89+) ·
                    Firmware Marlin · Stream G-code em tempo real.
                  </p>
                  <p className="mt-1">
                    Sem driver, sem instalação. O navegador conversa direto com a placa USB
                    da bioimpressora — basta selecionar a porta serial e velocidade (115200 padrão).
                  </p>
                </InfoButton>
              </h3>
              <p className="text-[11px] text-gray-400">
                Conecte e selecione a porta serial. <strong>Sem conexão</strong>, tudo aqui funciona em modo simulação.
              </p>
            </div>
          </div>

          <PrinterConnection
            gcode={state.slice.gcode ?? ""}
            printerName={state.model.name ?? "Bioimpressora BIA"}
            onConnectionChange={setIsConnected}
            renderExtraControls={({ connected, sendCommand }) => {
              sendCommandRef.current = sendCommand
              // RealtimeControls renderizado fora — capturamos só o sendCommand
              return null
            }}
          />

          {/* ─── Linha de ações críticas (Resfriar Tudo + abrir dock) ─── */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-cyan-500/15">
            <button
              onClick={handleCoolAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-xs font-semibold transition-colors"
              title="M104 S0 + M140 S0 + M141 S0 — desliga todos os aquecedores. Importante antes de trocar cartucho ou desligar a impressora."
            >
              <Snowflake className="w-3.5 h-3.5" />
              Resfriar Tudo
              <InfoButton title="Por que resfriar tudo?" align="left" size="sm">
                <p>
                  Manda <code>M104 S0</code> (cartucho off), <code>M140 S0</code> (cama off) e{" "}
                  <code>M141 S0</code> (câmara off) de uma vez.
                </p>
                <p className="mt-1">
                  <strong>Importante:</strong> algumas placas Marlin entram em <em>thermal runaway</em>
                  ou crasham se você desligar a impressora com aquecedores ainda ativos. Sempre
                  resfrie antes de trocar cartucho ou desconectar.
                </p>
              </InfoButton>
            </button>

            {/* 🎯 G92 ZERO AQUI — funcional, sem home, envia direto pra impressora */}
            <button
              onClick={() => { void handleZero() }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/50 text-emerald-100 text-xs font-bold transition-colors"
              title="G92 X0 Y0 Z0 E0 — zera as coordenadas virtuais NO PONTO ATUAL. SEM home, SEM movimento."
            >
              <Crosshair className="w-3.5 h-3.5" />
              Zerar G92 aqui
              <InfoButton title="Zerar G92 sem home" align="left" size="sm">
                <p>
                  Envia <code>G92 X0 Y0 Z0 E0</code> direto para a impressora —
                  define o ponto atual como (0,0,0,0) sem mover nenhum eixo.
                </p>
                <p className="mt-1">
                  <strong className="text-emerald-200">🚫 NÃO faz home (G28)</strong> — bioimpressora preserva
                  a posição da bandeja e do cartucho. Bioimpressão não busca endstop como FDM convencional:
                  você posiciona manualmente o bico em cima do well/scaffold e zera AQUI.
                </p>
                <p className="mt-1 text-amber-200">
                  Feedback no console: <code>✓ G92 enviado para a impressora REAL</code> se conectado.
                </p>
              </InfoButton>
            </button>

            <button
              onClick={() => openDockTab("joystick")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/40 text-violet-100 text-xs font-bold transition-colors ml-auto"
              title="Abrir painel flutuante (joystick + temperaturas + console) — imune a scroll"
            >
              <ZapIcon className="w-3.5 h-3.5" />
              Painel Bioengenheiro
            </button>
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/*  PASSO 2 · Joystick está no PAINEL BIOENGENHEIRO flutuante    */}
        {/*  (clique no FAB ou no botão acima para abrir)                  */}
        {/*  Aqui mantemos apenas o CONSOLE G-code em full width.          */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section
          className="rounded-2xl bg-gradient-to-r from-violet-500/[0.06] to-purple-500/[0.03] border border-violet-500/25 p-4 flex flex-wrap items-center justify-between gap-3"
          id="joystick-zone"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/35 flex items-center justify-center shrink-0">
              <Gamepad2 className="w-5 h-5 text-violet-200" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 flex-wrap">
                Passo 2 · Joystick 3D
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-200 font-semibold uppercase tracking-wider">
                  no painel flutuante
                </span>
                {isConnected && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-semibold uppercase tracking-wider inline-flex items-center gap-1">
                    <Radio className="w-2 h-2 animate-pulse" /> LIVE
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                O joystick agora vive no <strong className="text-violet-200">Painel Bioengenheiro</strong> —
                imune ao scroll da página, com X/Y/Z/E em tempo real, temperaturas e console no mesmo lugar.
              </p>
            </div>
          </div>
          <button
            onClick={() => openDockTab("joystick")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-bold shadow-lg shadow-violet-500/30 transition-all"
            title="Abrir painel flutuante com joystick · imune a scroll · atalho G"
          >
            <Gamepad2 className="w-4 h-4" />
            Abrir Joystick
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/15 font-mono hidden sm:inline">G</span>
          </button>
        </section>

        {/* Console G-code · full width */}
        <div className="grid grid-cols-1 gap-6 scroll-mt-24">
          <section className="rounded-2xl bg-black/40 border border-white/5 p-5 space-y-3 min-h-[600px] flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <Terminal className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    Console G-code
                    <InfoButton title="O que aparece no console?" align="left">
                      <p>Cada interação com o joystick gera linhas de G-code reais (Marlin compatível) — útil para auditoria e debug.</p>
                      <p className="mt-1">Comandos <code>G28</code>, <code>G92</code>, <code>M851</code>, <code>G29</code>, <code>M0</code> são coloridos para inspeção rápida.</p>
                    </InfoButton>
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    Comandos do joystick + G-code da Etapa 3
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

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  2. REAL-TIME CONTROLS — logo abaixo do joystick                 */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section className="rounded-2xl bg-gradient-to-br from-cyan-500/[0.04] to-emerald-500/[0.03] border border-cyan-500/20 p-5 space-y-4">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Sliders className="w-4 h-4 text-cyan-300" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                Controles em tempo real
                <InfoButton title="Real-Time Controls" align="left">
                  <p>Ajustes ao vivo enviados para a impressora <strong>durante</strong> a impressão:</p>
                  <ul className="list-disc list-inside text-[10.5px] mt-1 space-y-0.5">
                    <li>Temperatura do cartucho (M104 S…)</li>
                    <li>Temperatura da cama (M140 S…)</li>
                    <li>Temperatura da câmara (M141 S…)</li>
                    <li>Retração do extrusor (G10/G11)</li>
                    <li>Z-offset live (M851 Z…)</li>
                  </ul>
                  <p className="mt-1">Sugestões pré-populadas a partir das Etapas 2 e 3.</p>
                </InfoButton>
              </h3>
              <p className="text-[11px] text-gray-400">
                Temperatura · retração · Z-offset · enviado direto para a máquina enquanto imprime.
              </p>
            </div>
          </div>
          <RealtimeControls
            connected={isConnected}
            sendCommand={async (cmd: string) => {
              if (sendCommandRef.current) {
                await sendCommandRef.current(cmd)
              }
            }}
            suggestedCartridgeC={state.slice.cartridgeTempC ?? 22}
            suggestedBedC={state.slice.bedTempC ?? 6}
            suggestedChamberC={state.slice.chamberTempC ?? 20}
            suggestedRetractionMm={state.slice.retractionMm ?? 0.5}
          />
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  3. MODO AVANÇADO — Extrusão · Viabilidade · Encolhimento        */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="flex items-center gap-2 pt-2">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] uppercase tracking-[0.25em] text-gray-500 font-semibold px-2">
            Modo avançado · Opcional
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <CollapsibleSection
          title="Extrusão Fluida + Sensores"
          subtitle="Mecanismo · pressão/vazão/rotação · cartucho · cama · câmara · umidade"
          icon={FlaskConical}
          badge="Avançado"
          badgeColor="cyan"
          defaultOpen={false}
          rightSlot={
            <span className="text-[10px] px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hidden sm:inline">
              Pré-populado Etapa 2 + 3
            </span>
          }
        >
          <ExtrusionPanel state={extrusion} onChange={setExtrusion} onGcode={log} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Tecido Vivo · Viabilidade ao Vivo + Encolhimento"
          subtitle="Shear stress → viabilidade prevista · Encolhimento pós-cura · Crosslinking"
          icon={Microscope}
          badge="Avançado"
          badgeColor="emerald"
          defaultOpen={false}
          rightSlot={
            <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hidden sm:inline">
              Hagen-Poiseuille + Blaeser
            </span>
          }
        >
          <TissueViabilityPanel state={tissue} onChange={setTissue} onGcode={log} />
        </CollapsibleSection>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  4. NAVEGAÇÃO PARA ETAPA 5 — Pós-Bioimpressão                   */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <Link
          href="/dashboard/bioprint/post"
          className="block rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/[0.08] to-amber-500/[0.04] p-5 hover:border-rose-500/60 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
              <Beaker className="w-6 h-6 text-rose-200" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-rose-300/80 font-semibold mb-0.5">
                Próxima · Etapa 5 / 5
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-rose-100 transition-colors">
                Pós-Bioimpressão · Cultura → Biorreator → Validação
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Defina o tipo de tecido alvo e os protocolos pós-impressão (cultura, crosslink, biorreator, assays).
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-rose-300 shrink-0 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

      </main>

      {/* Rodapé sticky com status do processo completo */}
      <footer className="sticky bottom-0 z-10 bg-[#0a0a0f]/95 backdrop-blur border-t border-emerald-500/20 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm min-w-0">
          {state.control.status === "ready" ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-emerald-300 font-medium shrink-0">Etapa 4/5 concluída:</span>
              <span className="text-gray-300 truncate">
                Bioimpressão executada · siga para Etapa 5 (Pós-Bioimpressão)
              </span>
            </>
          ) : (
            <>
              <Info className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="text-gray-400 text-xs">
                {isUnlocked ? "Conecte a bioimpressora e execute a impressão para liberar a Etapa 5" : "Complete a Etapa 3 (Fatiamento) primeiro"}
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
            href="/dashboard/bioprint/post"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-200 text-xs font-medium rounded-lg transition-colors"
          >
            Etapa 5 →
          </Link>
          <Link
            href="/dashboard/bioprint"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-medium rounded-lg transition-colors"
          >
            Hub
          </Link>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════════════════
       *  FAB FLUTUANTE — sempre visível em qualquer scroll
       *  Abre o Bioengineer Live Dock (controle remoto da bioimpressora)
       * ═══════════════════════════════════════════════════════════════════ */}
      {!dockOpen && (
        <button
          onClick={() => openDockTab("joystick")}
          className={cn(
            "fixed bottom-20 right-4 z-40 group",
            "inline-flex items-center gap-2 pl-4 pr-5 py-3 rounded-2xl",
            "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500",
            "border border-violet-400/50 shadow-2xl shadow-violet-900/50",
            "text-white font-bold text-sm",
            "transition-all duration-200 hover:scale-105 active:scale-95",
            "animate-in slide-in-from-right"
          )}
          title="Abrir painel Bioengenheiro (controle ao vivo, imune a scroll)"
          aria-label="Abrir painel Bioengenheiro"
        >
          <div className="relative">
            <Gamepad2 className="w-5 h-5" />
            {isConnected && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-violet-600 animate-pulse" />
            )}
          </div>
          <span className="hidden sm:inline">Painel Bioengenheiro</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/15 font-mono hidden md:inline">
            G
          </span>
        </button>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
       *  BIOENGINEER LIVE DOCK — painel flutuante de controle máximo
       * ═══════════════════════════════════════════════════════════════════ */}
      <BioengineerLiveDock
        open={dockOpen}
        onClose={() => setDockOpen(false)}
        connected={isConnected}
        sendCommand={async (cmd: string) => {
          if (sendCommandRef.current) {
            await sendCommandRef.current(cmd)
          }
          log(cmd)
        }}
        position={position}
        onMove={handleMove}
        onZero={handleZero}
        onProbeZ={handleProbeZ}
        onPurge={handlePurge}
        onSterilePause={handleSterilePause}
        onGoToRest={handleGoToRest}
        onCoolAll={handleCoolAll}
        consoleLog={gcodeLog}
        onClearLog={clearLog}
        cartridgeC={extrusion.cartridgeTempC}
        bedC={extrusion.bedTempC}
        chamberC={extrusion.chamberTempC}
        defaultTab={dockTab}
      />
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
