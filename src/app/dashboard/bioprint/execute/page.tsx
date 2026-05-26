"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA — Execução da Bioimpressão (R12.15)
 *  ───────────────────────────────────────────────────────────────────────
 *  ROTA STANDALONE — não depende do fluxo de 5 etapas, não tem gating.
 *
 *  Fluxo mínimo obrigatório (mandato do usuário):
 *    1. Usuário cola/upload/import G-code
 *    2. Sistema valida (GCodeValidator)
 *    3. Sistema mostra preview profissional 3D (GcodeViewer3D)
 *    4. Usuário clica "Conectar USB" → Web Serial dialog
 *    5. Handshake M115 + detecção de firmware
 *    6. Usuário clica "Enviar para Bioimpressora"
 *    7. PrinterController envia linha-a-linha com ok-handshake
 *    8. Progress + layer + ETA em tempo real
 *    9. Pause / Resume / Cancel / Emergency Stop (M112)
 *   10. Joystick lateral para jog manual (sempre disponível quando conectado)
 *   11. Modo MOCK para testar sem hardware (sandbox, demo, CI)
 *
 *  Layout:
 *    [Header]                                                    [Mock/Real]
 *    ┌────────────────────────────────────────┐  ┌─────────────────────────┐
 *    │ G-code input (paste/upload/import)      │  │ Conexão USB              │
 *    │ Validador (verdict + issues + stats)    │  │ Joystick lateral         │
 *    │ Preview 3D profissional                 │  │ Terminal serial          │
 *    │ Stream UI (progress + pause/cancel)      │  │ Comandos rápidos         │
 *    └────────────────────────────────────────┘  └─────────────────────────┘
 *
 *  R12.15 — Pipeline real de execução USB
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import {
  Usb, Power, Send, Pause, Play, Square, AlertTriangle, CheckCircle2,
  Upload, FileCode2, Eye, Terminal as TerminalIcon, Cpu, Zap, Radio,
  ChevronDown, ChevronRight, Download, Trash2, Gamepad2, Sparkles,
  ShieldAlert, Info, RotateCcw, Wand2, X, Clipboard, ArrowLeft,
  Wrench, Undo2, Settings2, Droplet,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

// Módulos novos R12.15
import { PrintLogger, formatEntryText, type LogEntry, type LogSeverity } from "@/lib/bioprint/print-logger"
import { validateGcode, verdictLabel, DEFAULT_BIO_LIMITS, type ValidationResult } from "@/lib/bioprint/gcode-validator"
// R12.21: auto-fix inteligente de G-code bloqueado/com avisos
import {
  autoFixGcode,
  summarizeAutoFix,
  FIX_CODE_LABEL,
  DEFAULT_AUTOFIX_OPTS,
  type AutoFixOptions,
  type AutoFixResult,
} from "@/lib/bioprint/gcode-autofix"
import { PrinterMock } from "@/lib/bioprint/printer-mock"
import {
  PrinterConnection as RealPrinterConnection,
  handshakeM115,
  type PrinterTransport,
  type FirmwareInfo,
} from "@/lib/bioprint/printer-connection"
import { PrinterController, type ControllerState, type StreamProgress } from "@/lib/bioprint/printer-controller"

// Reutiliza preview 3D existente
import { type ColorMode } from "@/components/bioprinter/GcodeViewer3D"
import { SafeGcodeViewer3D } from "@/components/bioprinter/SafeGcodeViewer3D"
import { GcodeValidatorPanel } from "@/components/bioprinter/GcodeValidatorPanel"
import { parseGcode, type ParsedGcode } from "@/lib/bioprint/toolpath-engine"
import { DEMO_GYROID_GCODE } from "@/lib/bioprint/demo-gyroid-gcode"

// R12.17: ErrorBoundary local pra isolar crashes de sub-componentes
import { Component, type ReactNode } from "react"

class SectionErrorBoundary extends Component<
  { children: ReactNode; title: string },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error(`[Section: ${this.props.title}]`, error)
  }
  reset = () => this.setState({ hasError: false, error: null })
  render() {
    if (this.state.hasError) {
      const e = this.state.error
      return (
        <section className="rounded-2xl bg-rose-500/[0.05] border border-rose-500/30 overflow-hidden">
          <div className="px-3 py-2 border-b border-rose-500/20 flex items-center gap-2 bg-rose-500/10">
            <AlertTriangle className="w-4 h-4 text-rose-300" />
            <h3 className="text-xs font-bold text-rose-100">{this.props.title} — falhou</h3>
          </div>
          <div className="p-3 text-xs text-rose-100/90 space-y-2">
            <div>Este painel não pôde ser renderizado. O resto da página continua funcionando.</div>
            {e?.message && (
              <pre className="text-[10px] bg-black/40 rounded p-2 font-mono whitespace-pre-wrap break-words max-h-32 overflow-auto">
                {e.name}: {e.message}
              </pre>
            )}
            <button
              onClick={this.reset}
              className="px-2.5 py-1 rounded text-[11px] font-semibold bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-100 inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              Tentar de novo
            </button>
          </div>
        </section>
      )
    }
    return this.props.children
  }
}

// ─── Constantes ──────────────────────────────────────────────────────────

const BAUD_OPTIONS = [9600, 19200, 38400, 57600, 115200, 230400, 250000]
const DEFAULT_BAUD = 115200

// G-code de demo (hello world quadrado pequeno)
// R12.18: G-code demo agora é um cubo 20×20 com 2 camadas de infill TPMS
// gyroid (Triply Periodic Minimal Surface) — substitui o antigo "Hello Square"
// simples. Permite validar visualização 3D real do toolpath complexo.
const DEMO_GCODE = DEMO_GYROID_GCODE

// Step sizes do joystick
type StepSize = 0.05 | 0.1 | 0.5 | 1 | 5 | 10
const JOYSTICK_STEPS: StepSize[] = [0.05, 0.1, 0.5, 1, 5, 10]
const EXTRUDE_STEPS: number[] = [0.01, 0.05, 0.1, 0.5, 1.0]

// SessionStorage key — vindo de /quick-gcode, /gcode/medical, /gcode/advanced
const HANDOFF_KEY = "bia.execute.gcode.handoff"

// ─── Componente principal ────────────────────────────────────────────────

export default function BioprintExecutePage() {
  // ─── Logger global (singleton por mount) ──
  const loggerRef = useRef<PrintLogger>(new PrintLogger())
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])

  useEffect(() => {
    const off = loggerRef.current.subscribe((entries) => setLogEntries(entries))
    return () => off()
  }, [])

  // ─── G-code source ──
  const [gcodeText, setGcodeText] = useState("")
  const [gcodeName, setGcodeName] = useState<string>("(sem nome)")

  // Carrega handoff vindo de outras páginas
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(HANDOFF_KEY)
      if (raw) {
        const obj = JSON.parse(raw) as { gcode: string; name?: string; from?: string }
        if (obj.gcode) {
          setGcodeText(obj.gcode)
          setGcodeName(obj.name ?? "G-code importado")
          loggerRef.current.info(`G-code importado de ${obj.from ?? "outra página"} — ${obj.gcode.split("\n").length} linhas`)
          sessionStorage.removeItem(HANDOFF_KEY)
        }
      }
    } catch {}
  }, [])

  // ─── Validação ──
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [showAllIssues, setShowAllIssues] = useState(false)

  const handleValidate = useCallback(() => {
    if (!gcodeText.trim()) {
      loggerRef.current.warn("Sem G-code para validar.")
      return
    }
    const result = validateGcode(gcodeText, DEFAULT_BIO_LIMITS, "marlin")
    setValidation(result)
    const v = verdictLabel(result.verdict)
    loggerRef.current.info(`Validação: ${v.text} (${result.errorCount} erros, ${result.warningCount} avisos)`, "validator")
  }, [gcodeText])

  // ─── R12.21: Auto-fix inteligente ──
  const [showAutoFixPanel, setShowAutoFixPanel] = useState(false)
  const [autoFixOpts, setAutoFixOpts] = useState<AutoFixOptions>(DEFAULT_AUTOFIX_OPTS)
  const [autoFixResult, setAutoFixResult] = useState<AutoFixResult | null>(null)
  const [gcodeTextBeforeFix, setGcodeTextBeforeFix] = useState<string | null>(null)

  /** Resumo do que dá pra corrigir (memoizado) — atualiza ao revalidar. */
  const autoFixSummary = useMemo(() => {
    if (!validation) return null
    return summarizeAutoFix(validation)
  }, [validation])

  const handleAutoFix = useCallback(() => {
    if (!validation) {
      loggerRef.current.warn("Rode a validação primeiro para que o auto-fix saiba o que corrigir.")
      return
    }
    if (!gcodeText.trim()) return
    const result = autoFixGcode(gcodeText, validation, autoFixOpts)
    if (result.applied.length === 0) {
      loggerRef.current.warn("Nenhuma correção automática aplicável foi encontrada.")
      return
    }
    // backup do original para Undo
    setGcodeTextBeforeFix(gcodeText)
    setGcodeText(result.fixedGcode)
    setAutoFixResult(result)
    loggerRef.current.ok(
      `Auto-fix aplicou ${result.applied.length} correção(ões) em ${Object.keys(result.countByCode).length} categoria(s).`,
      "validator",
    )
    // Revalidar automaticamente
    const reval = validateGcode(result.fixedGcode, DEFAULT_BIO_LIMITS, "marlin")
    setValidation(reval)
    const v = verdictLabel(reval.verdict)
    loggerRef.current.info(
      `Após auto-fix: ${v.text} (${reval.errorCount} erros, ${reval.warningCount} avisos).`,
      "validator",
    )
  }, [validation, gcodeText, autoFixOpts])

  const handleUndoAutoFix = useCallback(() => {
    if (gcodeTextBeforeFix == null) return
    setGcodeText(gcodeTextBeforeFix)
    setGcodeTextBeforeFix(null)
    setAutoFixResult(null)
    // Revalidar com o texto restaurado
    const reval = validateGcode(gcodeTextBeforeFix, DEFAULT_BIO_LIMITS, "marlin")
    setValidation(reval)
    loggerRef.current.info("Auto-fix desfeito. G-code original restaurado.", "validator")
  }, [gcodeTextBeforeFix])

  // ─── Preview 3D ──
  const [showPreview, setShowPreview] = useState(true)
  const [colorMode, setColorMode] = useState<ColorMode>("layer")

  const parsed: ParsedGcode | null = useMemo(() => {
    if (!gcodeText.trim()) return null
    try {
      return parseGcode(gcodeText)
    } catch (e) {
      return null
    }
  }, [gcodeText])

  // ─── R12.11: Análise de complexidade do G-code ──
  // Detecta gargalos comuns que fazem prints falharem.
  const complexityAnalysis = useMemo(() => {
    if (!parsed || !validation) return null
    const alerts: Array<{
      severity: "critical" | "warning" | "info"
      title: string
      detail: string
      suggestion: string
    }> = []

    // 1. Muitos moves
    const moveCount = parsed.moves.length
    if (moveCount > 50000) {
      alerts.push({
        severity: "critical",
        title: "G-code muito longo (>50k moves)",
        detail: `${moveCount.toLocaleString()} moves — pode sobrecarregar firmware Marlin clássico (buffer pode estourar).`,
        suggestion: "Considere aumentar layer height, reduzir infill ou dividir em sub-prints.",
      })
    } else if (moveCount > 20000) {
      alerts.push({
        severity: "warning",
        title: "G-code longo (>20k moves)",
        detail: `${moveCount.toLocaleString()} moves — buffer USB pode atrasar. Use SD card se possível.`,
        suggestion: "Recomendado: imprimir via SD card em vez de USB streaming.",
      })
    }

    // 2. Muitas camadas
    const layerCount = parsed.layers.length
    if (layerCount > 500) {
      alerts.push({
        severity: "warning",
        title: "Muitas camadas (>500)",
        detail: `${layerCount} camadas — tempo de impressão será muito longo, risco de desidratação da bioink.`,
        suggestion: "Aumente layer height para 0.3–0.4 mm ou imprima em câmara umidificada.",
      })
    }

    // 3. Bbox fora do build volume
    const { bbox } = validation.stats
    const sizeX = bbox.maxX - bbox.minX
    const sizeY = bbox.maxY - bbox.minY
    const sizeZ = bbox.maxZ - bbox.minZ
    if (sizeX > 200 || sizeY > 200) {
      alerts.push({
        severity: "critical",
        title: "Geometria muito grande",
        detail: `${sizeX.toFixed(0)}×${sizeY.toFixed(0)}×${sizeZ.toFixed(0)} mm — pode exceder o build volume da bioimpressora.`,
        suggestion: "Verifique as dimensões da mesa da sua bioimpressora antes de enviar.",
      })
    }

    // 4. Coordenadas negativas (sem G92 zero)
    if (bbox.minX < 0 || bbox.minY < 0 || bbox.minZ < 0) {
      alerts.push({
        severity: "warning",
        title: "Coordenadas negativas detectadas",
        detail: `Min: X=${bbox.minX.toFixed(2)} Y=${bbox.minY.toFixed(2)} Z=${bbox.minZ.toFixed(2)} — pode causar crash do bico contra a mesa.`,
        suggestion: "Adicione um G92 X0 Y0 Z0 ANTES de zerar a posição da peça.",
      })
    }

    // 5. Feedrate fora de faixa para bioimpressão
    const feedrates = parsed.moves.filter((m) => m.type === "G1").map((m) => m.feedrate)
    const maxF = feedrates.length ? Math.max(...feedrates) : 0
    if (maxF > 3000) {
      alerts.push({
        severity: "warning",
        title: "Velocidade alta para bioimpressão",
        detail: `Feedrate máximo: ${maxF.toFixed(0)} mm/min (${(maxF / 60).toFixed(1)} mm/s) — alto para hidrogéis.`,
        suggestion: "Para células vivas, mantenha ≤ 600 mm/min (10 mm/s) para preservar viabilidade.",
      })
    }

    // 6. Tempo de impressão muito alto
    if (validation.stats.estTotalTimeMin > 240) {
      alerts.push({
        severity: "warning",
        title: "Tempo de impressão > 4 horas",
        detail: `Estimativa: ${(validation.stats.estTotalTimeMin / 60).toFixed(1)} horas.`,
        suggestion: "Bioinks com células perdem viabilidade após 2-3h fora da incubadora. Use câmara controlada.",
      })
    }

    // 7. Travels muito longos (indicador de eficiência de path)
    const travelCount = parsed.moves.filter((m) => m.type === "G0").length
    const travelRatio = moveCount > 0 ? travelCount / moveCount : 0
    if (travelRatio > 0.4) {
      alerts.push({
        severity: "info",
        title: "Muitos travels (movimentos sem extrusão)",
        detail: `${(travelRatio * 100).toFixed(1)}% dos moves são travels — pode indicar slicing ineficiente.`,
        suggestion: "Considere otimizar o slicer (combine infill, evite ilhas pequenas, ordene paredes).",
      })
    }

    // 8. Comandos M104/M140 ausentes (sem aquecimento)
    const hasHeatCmd = validation.stats.uniqueCommands.some((c) => c === "M104" || c === "M109" || c === "M140")
    if (!hasHeatCmd && validation.stats.uniqueCommands.includes("G1")) {
      alerts.push({
        severity: "info",
        title: "Sem comandos de aquecimento",
        detail: "Não há M104/M109 (bico) nem M140/M190 (mesa) no G-code.",
        suggestion: "OK se a bioink polimeriza à temperatura ambiente OU se você vai pré-aquecer manualmente.",
      })
    }

    // 9. Sem G92 inicial (origin reset)
    if (!validation.stats.uniqueCommands.includes("G92")) {
      alerts.push({
        severity: "warning",
        title: "Sem G92 (zero relativo)",
        detail: "Não há G92 no G-code — a impressora vai usar a origem atual (pode estar errada).",
        suggestion: "Adicione G92 X0 Y0 Z0 E0 no início para garantir posicionamento correto.",
      })
    }

    // 10. Detecção de complexidade geral
    const complexityScore =
      Math.min(50, moveCount / 1000) +
      Math.min(20, layerCount / 25) +
      (alerts.filter((a) => a.severity === "critical").length * 15) +
      (alerts.filter((a) => a.severity === "warning").length * 5)

    const complexityLabel =
      complexityScore < 20 ? "Baixa" :
      complexityScore < 50 ? "Média" :
      complexityScore < 80 ? "Alta" : "Muito alta"

    const complexityColor =
      complexityScore < 20 ? "emerald" :
      complexityScore < 50 ? "cyan" :
      complexityScore < 80 ? "amber" : "rose"

    return {
      alerts,
      complexityScore: Math.min(100, complexityScore),
      complexityLabel,
      complexityColor,
      moveCount,
      layerCount,
      travelCount,
      maxFeedrate: maxF,
    }
  }, [parsed, validation])

  // ─── Transport + Controller ──
  const [mode, setMode] = useState<"mock" | "real">("mock")
  const [baud, setBaud] = useState(DEFAULT_BAUD)
  const [connected, setConnected] = useState(false)
  const [firmware, setFirmware] = useState<FirmwareInfo | null>(null)
  const [supported, setSupported] = useState(false)
  /**
   * R12.23: Auto-home ao conectar. Default ON. Sequência ao conectar:
   *   1) Handshake M115
   *   2) M18 S0 (motor sempre ligado)
   *   3) Se autoHomeOnConnect=true → APENAS G28 (home all eixos)
   *
   * O G92 X0 Y0 Z0 E0 (definir origem lógica) foi DESACOPLADO do home: agora é
   * uma ação manual via botão "Ponto inicial" nos Comandos rápidos. Isso
   * permite ao usuário fazer jog até o ponto desejado (centro de poço, etc.)
   * e só então definir aquele ponto como (0,0,0). Em mock, G28 sempre roda.
   */
  const [autoHomeOnConnect, setAutoHomeOnConnect] = useState<boolean>(true)
  const [didAutoHome, setDidAutoHome] = useState<boolean>(false)

  /**
   * R12.24: Controle de fluxo (extrusão) em tempo real para hidrogéis.
   *
   * G-codes "filamento" tradicionais (FDM) calculam E com base em nozzle ×
   * layerHeight e assumem material termoplástico. Para hidrogéis o fluxo
   * ideal costuma ser muito menor — tipicamente 30%–60% dos valores
   * calculados. Usamos Marlin M221 S{percent} (Set Flow Percentage) que
   * multiplica TODOS os valores E subsequentes em runtime, permitindo
   * otimização em tempo real durante a impressão.
   *
   * Default: 50 (apropriado para a maioria dos hidrogéis genéricos).
   *
   * flowAppliedRef rastreia o último valor efetivamente enviado, evitando
   * reenvios redundantes quando o slider só muda visualmente.
   */
  const [flowPercent, setFlowPercent] = useState<number>(50)
  const flowAppliedRef = useRef<number | null>(null)
  const flowSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const transportRef = useRef<PrinterTransport | null>(null)
  const controllerRef = useRef<PrinterController | null>(null)

  const [controllerState, setControllerState] = useState<ControllerState>("idle")
  const [progress, setProgress] = useState<StreamProgress | null>(null)

  // Detecta suporte Web Serial no mount
  useEffect(() => {
    setSupported(typeof navigator !== "undefined" && "serial" in navigator)
  }, [])

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      controllerRef.current?.destroy()
      void transportRef.current?.disconnect()
    }
  }, [])

  // ─── CONNECT ──
  const handleConnect = useCallback(async () => {
    if (connected) return
    loggerRef.current.info(`Conectando em modo ${mode.toUpperCase()}…`)
    try {
      let transport: PrinterTransport
      if (mode === "mock") {
        transport = new PrinterMock({ latencyMs: 25, busyRate: 0.02 })
        await transport.connect()
      } else {
        if (!supported) throw new Error("Web Serial API não suportada neste navegador.")
        const real = new RealPrinterConnection({ baudRate: baud })
        await real.requestAndOpen()
        transport = real
      }

      transportRef.current = transport

      // Cria controller
      const ctrl = new PrinterController(
        transport,
        loggerRef.current,
        {
          onState: (s) => setControllerState(s),
          onProgress: (p) => setProgress(p),
        },
        { okTimeoutMs: 30000, maxRetries: 2 },
      )
      controllerRef.current = ctrl

      setConnected(true)
      loggerRef.current.ok(`Conectado em modo ${mode.toUpperCase()}.`)

      // Handshake M115
      try {
        loggerRef.current.info("Iniciando handshake M115…")
        const fw = await handshakeM115(transport, 5000)
        setFirmware(fw)
        loggerRef.current.ok(`Firmware detectado: ${fw.family}${fw.name ? ` (${fw.name})` : ""}`, "handshake")
      } catch (e) {
        loggerRef.current.warn(`Handshake M115 sem resposta completa: ${e instanceof Error ? e.message : String(e)} — continuando assim mesmo.`)
        setFirmware({ raw: "", family: "unknown", caps: {} })
      }

      // R12.27: TODO o handshake agora usa sendAndWait — sendOnce não espera 'ok'
      // do firmware, e em sequência os comandos se atropelam: o 'ok' do M18
      // pode ser capturado pelo waiter do G28, fazendo o sendAndWait do G28
      // resolver ANTES do home realmente terminar — deixando os eixos travados
      // ("axis not homed") e bloqueando todo movimento subsequente (jog/joystick).

      // R12.20: Desabilita o timeout interno de inatividade do firmware (Marlin "M18 S0" /
      // "M84 S0") para que os motores permaneçam energizados até o usuário desligar
      // manualmente. Caso o firmware não suporte o parâmetro, ignoramos silenciosamente.
      try {
        await controllerRef.current?.sendAndWait("M18 S0 ; mantém steppers sempre habilitados (sem timeout)")
        loggerRef.current.info("Timeout interno de inatividade do motor desabilitado (M18 S0).", "controller")
      } catch (e) {
        loggerRef.current.warn(`Não foi possível desabilitar timeout do motor: ${e instanceof Error ? e.message : String(e)}`)
      }

      // R12.24: aplica fluxo inicial (default 50% — apropriado para hidrogéis).
      // O usuário pode ajustar em tempo real depois via o painel "Fluxo do hidrogel".
      try {
        await controllerRef.current?.sendAndWait(`M221 S${flowPercent} ; fluxo inicial ${flowPercent}% para hidrogel (R12.24)`)
        flowAppliedRef.current = flowPercent
        loggerRef.current.info(`Fluxo do hidrogel definido em ${flowPercent}% (M221). Ajustável em tempo real no painel "Fluxo do hidrogel".`, "controller")
      } catch (e) {
        loggerRef.current.warn(`Não foi possível definir fluxo inicial: ${e instanceof Error ? e.message : String(e)}`)
      }

      // R12.23: Auto-home ao conectar envia APENAS G28 (home mecânico).
      // O G92 (definir ponto inicial / origem lógica) foi desacoplado e agora é uma
      // ação manual do usuário, disponível no painel de Comandos rápidos como
      // "Ponto inicial". Isso permite ao usuário fazer o jog até a posição desejada
      // (centro de poço, etc.) e só então definir aquele ponto como (0,0,0).
      if (autoHomeOnConnect) {
        try {
          loggerRef.current.info("Auto-home: enviando G28 (home all eixos)…", "controller")
          // Marlin: G28 retorna ok só ao terminar o home; timeout padrão do controller (30s) basta
          await controllerRef.current?.sendAndWait("G28 ; auto-home all (R12.23)")
          loggerRef.current.ok("Home concluído em todos os eixos (G28). Use \"Ponto inicial\" nos Comandos rápidos para definir a origem (0,0,0) quando estiver no ponto desejado.", "controller")
          setDidAutoHome(true)
        } catch (e) {
          loggerRef.current.warn(`Auto-home falhou: ${e instanceof Error ? e.message : String(e)}. Use o botão "Home All" do painel se a impressora estiver pronta.`)
          setDidAutoHome(false)
        }
      } else {
        loggerRef.current.info("Auto-home desabilitado — use o botão \"Home All\" se necessário.", "controller")
        setDidAutoHome(false)
      }

      // R12.27: Após o home, garante modo POSICIONAMENTO ABSOLUTO (G90) +
      // EXTRUSORA RELATIVA (M83). Sem M83, jog do eixo E falha silenciosamente:
      // o Marlin pode estar em modo extrusora absoluta após boot/G28; o
      // primeiro G1 E0.1 move uma vez (vai p/ E=0.1mm absoluto), o segundo
      // não move (já está em 0.1). Com M83, todo G1 E<n> passa a ser delta.
      // G91/G90 controla apenas X/Y/Z; o modo do extrusor é independente.
      try {
        await controllerRef.current?.sendAndWait("G90 ; XYZ em modo absoluto")
        await controllerRef.current?.sendAndWait("M83 ; extrusora em modo relativo (R12.27)")
        loggerRef.current.info("Modo de coordenadas pronto: XYZ absoluto (G90) + E relativo (M83).", "controller")
      } catch (e) {
        loggerRef.current.warn(`Não foi possível ajustar modo de coordenadas: ${e instanceof Error ? e.message : String(e)}`)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      loggerRef.current.error(`Falha ao conectar: ${msg}`)
      transportRef.current = null
      controllerRef.current = null
      setConnected(false)
    }
  }, [connected, mode, supported, baud, autoHomeOnConnect, flowPercent])

  // ─── DISCONNECT ──
  const handleDisconnect = useCallback(async () => {
    if (!connected) return
    loggerRef.current.info("Desconectando…")
    try {
      controllerRef.current?.cancel()
      controllerRef.current?.destroy()
      controllerRef.current = null
      await transportRef.current?.disconnect()
      transportRef.current = null
    } catch (e) {
      loggerRef.current.error(`Erro ao desconectar: ${e instanceof Error ? e.message : String(e)}`)
    }
    setConnected(false)
    setFirmware(null)
    setControllerState("idle")
    setProgress(null)
    loggerRef.current.ok("Desconectado.")
  }, [connected])

  /**
   * R12.24: Aplica fluxo (M221) na impressora.
   *
   * Pode ser chamado em qualquer momento (antes ou durante o streaming) —
   * Marlin processa M221 imediatamente e aplica nas próximas linhas de E.
   *
   * R12.27: usa sendAndWait (não sendOnce). M221 é instantâneo mas se ele
   * for enviado entre outros comandos via sendOnce, seu 'ok' pode ser
   * capturado pelo waiter de um sendAndWait subsequente — corrompendo o
   * handshake.
   *
   * Idempotente: se o valor não mudou desde o último envio, não reenvía.
   *
   * NOTA: declarado ANTES de handleSend para evitar "Cannot access before
   * initialization" (temporal dead zone) — handleSend o usa em suas deps.
   */
  const applyFlow = useCallback(async (percent: number) => {
    if (!controllerRef.current || !connected) return
    const clamped = Math.max(10, Math.min(200, Math.round(percent)))
    if (flowAppliedRef.current === clamped) return // sem mudança real
    try {
      await controllerRef.current.sendAndWait(`M221 S${clamped} ; fluxo ${clamped}% (R12.24)`)
      flowAppliedRef.current = clamped
      loggerRef.current.ok(`Fluxo aplicado: ${clamped}% (M221 S${clamped}).`, "controller")
    } catch (e) {
      loggerRef.current.warn(`M221 falhou: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [connected])

  // ─── SEND G-CODE ──
  const handleSend = useCallback(async () => {
    if (!connected || !controllerRef.current) {
      loggerRef.current.warn("Conecte primeiro.")
      return
    }
    if (!gcodeText.trim()) {
      loggerRef.current.warn("Sem G-code para enviar.")
      return
    }
    if (!validation) {
      loggerRef.current.warn("Valide o G-code antes de enviar.")
      handleValidate()
      return
    }
    if (validation.verdict === "blocked") {
      loggerRef.current.error(`Bloqueado: ${validation.errorCount} erros precisam ser corrigidos.`)
      return
    }
    try {
      // R12.24: garante que o fluxo configurado (default 50% para hidrogéis)
      // está aplicado ANTES do streaming começar. Sem isso, Marlin usaria o
      // último M221 da sessão (pode ser 100% após reset).
      await applyFlow(flowPercent)
      await controllerRef.current.start(gcodeText)
    } catch (e) {
      loggerRef.current.error(`Stream falhou: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [connected, gcodeText, validation, handleValidate, applyFlow, flowPercent])

  // ─── PAUSE / RESUME / CANCEL / EMERGENCY ──
  const handlePause = useCallback(() => controllerRef.current?.pause(), [])
  const handleResume = useCallback(() => controllerRef.current?.resume(), [])
  const handleCancel = useCallback(() => controllerRef.current?.cancel(), [])
  const handleEmergency = useCallback(async () => {
    if (!controllerRef.current) return
    if (!confirm("⚠️ EMERGENCY STOP — M112\n\nIsso envia parada imediata para a impressora. Marlin trava o firmware e exige restart físico.\n\nConfirmar?")) return
    await controllerRef.current.emergency()
  }, [])

  // ─── JOYSTICK ──
  const [step, setStep] = useState<StepSize>(1)
  const [extrudeStep, setExtrudeStep] = useState(0.1)
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0, e: 0 })

  const sendJog = useCallback(async (axis: "X" | "Y" | "Z" | "E", delta: number) => {
    if (!controllerRef.current || !connected) {
      loggerRef.current.warn("Conecte para usar o joystick.")
      return
    }
    if (controllerState === "streaming") {
      loggerRef.current.warn("Pause a impressão antes de jog manual.")
      return
    }
    const feedrate = axis === "Z" ? 300 : axis === "E" ? 200 : 1500
    // R12.27: BUGFIX — joystick não movia após o home.
    //
    // Causa: usávamos sendOnce (fire-and-forget) para G91/G1/G90. O Marlin
    // recebe os 3 comandos no buffer USB de uma vez e o 'ok' do G91 ainda
    // estava sendo aguardado pelo waiter de um sendAndWait anterior (G28).
    // Pior: como o sendOnce não bloqueia, G91 e G90 chegavam quase juntos
    // ao parser, e o G1 podia ser interpretado em modo absoluto — um
    // "G1 X1" virava "vá para X=1", e nas chamadas seguintes a impressora
    // já estava em X=1 → nada se mexia.
    //
    // Solução:
    //   1) Tudo via sendAndWait — cada comando só sai depois do 'ok' do
    //      anterior, garantindo ordem determinística.
    //   2) Eixo E NÃO usa G91/G90: configuramos M83 no handshake, então o
    //      G1 E<delta> já é tratado como relativo permanentemente, sem
    //      precisar alternar o modo (evita 2 round-trips extras).
    //   3) XYZ: G91 → G1 (relativo) → G90, mantendo o invariante "impressora
    //      sempre volta para absoluto entre operações".
    try {
      if (axis === "E") {
        // E já está em relativo permanente (M83) — basta o G1
        await controllerRef.current.sendAndWait(`G1 E${delta} F${feedrate}`)
      } else {
        await controllerRef.current.sendAndWait("G91")
        await controllerRef.current.sendAndWait(`G1 ${axis}${delta} F${feedrate}`)
        await controllerRef.current.sendAndWait("G90")
      }
      setPosition((p) => ({ ...p, [axis.toLowerCase()]: +(p[axis.toLowerCase() as "x" | "y" | "z" | "e"] + delta).toFixed(3) }))
    } catch (e) {
      loggerRef.current.error(`Jog ${axis}${delta} falhou: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [connected, controllerState])

  const sendZero = useCallback(async () => {
    if (!controllerRef.current || !connected) return
    try {
      // R12.27: sendAndWait para garantir que o G92 termine antes de qualquer
      // próximo comando — evita race com clique imediato no joystick.
      await controllerRef.current.sendAndWait("G92 X0 Y0 Z0 E0")
      setPosition({ x: 0, y: 0, z: 0, e: 0 })
      loggerRef.current.ok("G92 ZERO AQUI — coordenadas zeradas no ponto atual (sem mover).")
    } catch (e) {
      loggerRef.current.error(`G92 falhou: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [connected])

  /**
   * R12.24: Handler do slider/preset — atualiza estado imediatamente e
   * debounce o envio para M221 (evita spam quando o usuário arrasta).
   * Durante o streaming, debounce é menor (120ms) para resposta rápida;
   * fora dele, 250ms.
   */
  const handleFlowChange = useCallback((next: number) => {
    setFlowPercent(next)
    if (flowSendTimerRef.current) clearTimeout(flowSendTimerRef.current)
    const delay = controllerState === "streaming" ? 120 : 250
    flowSendTimerRef.current = setTimeout(() => { void applyFlow(next) }, delay)
  }, [applyFlow, controllerState])

  // R12.24: Cleanup do timer ao desmontar (evita setState em componente desmontado)
  useEffect(() => {
    return () => {
      if (flowSendTimerRef.current) clearTimeout(flowSendTimerRef.current)
    }
  }, [])

  // R12.22: Home All manual (espelha o auto-home, mas sob demanda)
  const handleHomeAll = useCallback(async () => {
    if (!controllerRef.current || !connected) {
      loggerRef.current.warn("Conecte antes de fazer home.")
      return
    }
    if (controllerState === "streaming") {
      loggerRef.current.warn("Aguarde o streaming terminar antes de fazer home.")
      return
    }
    try {
      loggerRef.current.info("Home All: enviando G28…", "controller")
      await controllerRef.current.sendAndWait("G28 ; home all (manual)")
      // R12.27: re-aplica G90 + M83 após o home para garantir que o modo de
      // coordenadas continue consistente (alguns firmwares resetam o modo do
      // extrusor para absoluto após G28).
      await controllerRef.current.sendAndWait("G90 ; XYZ absoluto")
      await controllerRef.current.sendAndWait("M83 ; E relativo (R12.27)")
      setDidAutoHome(true)
      loggerRef.current.ok("Home All concluído (G28) + modo XYZ absoluto / E relativo. Para definir a origem (0,0,0), use \"Ponto inicial\" nos Comandos rápidos.", "controller")
    } catch (e) {
      loggerRef.current.error(`Home All falhou: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [connected, controllerState])

  // ─── Manual command ──
  const [manualCmd, setManualCmd] = useState("")
  const handleManualSend = useCallback(async () => {
    if (!controllerRef.current || !manualCmd.trim()) return
    try {
      // R12.27: sendAndWait — usuário digita um comando por vez e espera ver
      // o 'ok' antes de digitar outro. Evita race com qualquer outro envio.
      await controllerRef.current.sendAndWait(manualCmd)
      setManualCmd("")
    } catch (e) {
      loggerRef.current.error(`Comando manual falhou: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [manualCmd])

  // ─── Quick actions ──
  const quickActions: Array<{ label: string; cmd: string; title: string }> = [
    { label: "M114",          cmd: "M114",                     title: "Posição atual" },
    { label: "M105",          cmd: "M105",                     title: "Temperaturas" },
    { label: "M115",          cmd: "M115",                     title: "Firmware info" },
    // R12.23: G92 desacoplado do Home All — ação manual do usuário para definir
    // o ponto atual como origem lógica (0,0,0). Útil após jog manual.
    { label: "Ponto inicial", cmd: "G92 X0 Y0 Z0 E0",          title: "Define o ponto atual como origem (0,0,0) — origem lógica" },
    { label: "M18 Off",       cmd: "M18",                      title: "Motores off" },
    { label: "M84 Off",       cmd: "M84",                      title: "Disable steppers" },
    { label: "Cool All",      cmd: "M104 S0\nM140 S0\nM141 S0", title: "Desliga todos os aquecedores" },
  ]

  const runQuickAction = useCallback(async (cmds: string) => {
    if (!controllerRef.current || !connected) return
    // R12.27: sendAndWait sequencial — quick actions como "Cool All" (M104+M140+M141)
    // têm múltiplas linhas que precisam ser executadas em ordem. Sem o waiter,
    // os 'ok's de cada uma podem ser capturados por outro sendAndWait pendente.
    for (const c of cmds.split("\n")) {
      try { await controllerRef.current.sendAndWait(c) } catch {}
    }
  }, [connected])

  // ─── File upload ──
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const handleFile = useCallback(async (file: File) => {
    const text = await file.text()
    setGcodeText(text)
    setGcodeName(file.name)
    setValidation(null)
    loggerRef.current.info(`G-code carregado: ${file.name} (${text.split("\n").length} linhas)`)
  }, [])

  // ─── Load demo ──
  const loadDemo = useCallback(() => {
    setGcodeText(DEMO_GCODE)
    setGcodeName("comece-agora-hello-square.gcode")
    setValidation(null)
    loggerRef.current.info("G-code de exemplo carregado — quadrado 20×20 mm em 2 camadas. Próximo passo: clicar em 'Validar G-code'.")
    // R12.17: dispara validação automática para que o painel visual do
    // toolpath apareça imediatamente sem o usuário precisar clicar.
    setTimeout(() => {
      try {
        const result = validateGcode(DEMO_GCODE, DEFAULT_BIO_LIMITS, "marlin")
        setValidation(result)
        const v = verdictLabel(result.verdict)
        loggerRef.current.info(`Validação automática: ${v.text} (${result.errorCount} erros, ${result.warningCount} avisos)`, "validator")
      } catch (e) {
        loggerRef.current.warn(`Validação automática falhou: ${e instanceof Error ? e.message : String(e)}`)
      }
      // Scroll suave para o painel visual recém-aparecido
      try {
        const el = document.getElementById("toolpath-visual-panel")
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
      } catch {}
    }, 50)
  }, [])

  // ─── Auto-scroll terminal ──
  const terminalRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logEntries])

  // ─── Download log ──
  const downloadLog = useCallback(() => {
    const text = loggerRef.current.toText()
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bia-execution-log-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  // ─── Derived ──
  const lineCount = gcodeText.split("\n").length
  const isStreaming = controllerState === "streaming"
  const isPaused = controllerState === "paused"
  const canSend = connected && gcodeText.length > 0 && (controllerState === "idle" || controllerState === "completed" || controllerState === "ready" || controllerState === "error")

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 to-gray-950">
      {/* ─── HEADER ─────────────────────────────────────────────────── */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Link
            href="/dashboard/bioprint"
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Bioprint Hub
          </Link>
          <div className="w-px h-5 bg-white/10" />
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-300" />
            Execução da Bioimpressão
            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-semibold">
              R12.15 · Pipeline USB
            </span>
          </h1>

          <div className="flex-1" />

          {/* Mode toggle */}
          <div className="flex items-center gap-1 rounded-lg bg-black/40 border border-white/10 p-1">
            <button
              disabled={connected}
              onClick={() => setMode("mock")}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1",
                mode === "mock" ? "bg-violet-500/30 border border-violet-500/50 text-violet-100" : "text-gray-400 hover:text-white",
                connected && "opacity-50 cursor-not-allowed",
              )}
              title="Simulador (sem hardware) — útil para sandbox/demo"
            >
              <Cpu className="w-3 h-3" /> Mock
            </button>
            <button
              disabled={connected || !supported}
              onClick={() => setMode("real")}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1",
                mode === "real" ? "bg-emerald-500/30 border border-emerald-500/50 text-emerald-100" : "text-gray-400 hover:text-white",
                (connected || !supported) && "opacity-50 cursor-not-allowed",
              )}
              title={supported ? "Bioimpressora real via Web Serial USB" : "Web Serial API não suportada neste navegador"}
            >
              <Usb className="w-3 h-3" /> Real USB
            </button>
          </div>

          {/* Connection status */}
          <span className={cn(
            "text-[10px] px-2 py-1 rounded-full border font-semibold flex items-center gap-1.5",
            connected
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
              : "bg-gray-500/15 border-gray-500/30 text-gray-400",
          )}>
            <Radio className={cn("w-2.5 h-2.5", connected && "animate-pulse")} />
            {connected ? `ONLINE · ${mode.toUpperCase()}` : "OFFLINE"}
          </span>
        </div>

        {/* Progress bar (sempre visível durante stream) */}
        {progress && (
          <div className="max-w-[1800px] mx-auto px-4 pb-3">
            <div className="flex items-center justify-between text-[10px] text-gray-300 mb-1">
              <span>
                Linha {progress.current} / {progress.total} · Camada {progress.currentLayer}
              </span>
              <span className="font-mono">
                {progress.percent.toFixed(1)}% · ETA {formatMs(progress.remainingMsEst ?? 0)} · decorrido {formatMs(progress.elapsedMs)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  isPaused
                    ? "bg-gradient-to-r from-amber-400 to-amber-500"
                    : "bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400"
                )}
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <div className="mt-1 font-mono text-[10px] text-gray-500 truncate">
              ► {progress.currentLine}
            </div>
          </div>
        )}
      </header>

      {/* ─── MAIN 2-column layout ──────────────────────────────────── */}
      <main className="max-w-[1800px] mx-auto px-4 py-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ═══ COLUNA ESQUERDA (2/3): G-code + Validador + Preview + Stream ═══ */}
        <section className="lg:col-span-2 space-y-4">
          {/* ── 1. G-code input ───────────────────────────────────── */}
          <Panel
            title="1. G-code"
            icon={<FileCode2 className="w-4 h-4" />}
            badge={`${lineCount.toLocaleString()} linhas`}
            badgeColor="cyan"
          >
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".gcode,.gco,.nc,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleFile(f)
                  e.target.value = ""
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-200 transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Upload .gcode
              </button>
              <button
                onClick={loadDemo}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-gradient-to-r from-violet-500/25 to-fuchsia-500/25 hover:from-violet-500/40 hover:to-fuchsia-500/40 border border-violet-500/40 text-violet-100 transition-colors flex items-center gap-1.5 shadow-md shadow-violet-900/30"
                title="Carrega um G-code de exemplo (quadrado 20×20 mm em 2 camadas) para você começar agora — ideal para o aluno"
              >
                <Sparkles className="w-3.5 h-3.5" /> G-code começe agora
              </button>
              <button
                onClick={async () => {
                  try {
                    const txt = await navigator.clipboard.readText()
                    if (txt.trim()) {
                      setGcodeText(txt)
                      setGcodeName("(colado da área de transferência)")
                      setValidation(null)
                      loggerRef.current.info(`G-code colado: ${txt.split("\n").length} linhas`)
                    }
                  } catch (e) {
                    loggerRef.current.error("Não foi possível ler a área de transferência.")
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 transition-colors flex items-center gap-1.5"
              >
                <Clipboard className="w-3.5 h-3.5" /> Colar
              </button>
              <button
                onClick={() => { setGcodeText(""); setGcodeName("(sem nome)"); setValidation(null) }}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-white/10 border border-white/15 text-gray-400 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Limpar
              </button>
              <div className="flex-1" />
              <span className="text-[10px] text-gray-400 font-mono truncate max-w-[200px]" title={gcodeName}>
                {gcodeName}
              </span>
            </div>
            <textarea
              value={gcodeText}
              onChange={(e) => { setGcodeText(e.target.value); setValidation(null) }}
              placeholder="; Cole seu G-code aqui, ou clique em Upload, Demo, ou importe do G-code Hub (medical / advanced / quick)…"
              className="w-full h-40 px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-[11px] font-mono text-emerald-200 placeholder-gray-600 focus:border-cyan-500/50 outline-none resize-y"
              spellCheck={false}
            />
          </Panel>

          {/* ── 2. Validador ──────────────────────────────────────── */}
          <Panel
            title="2. Validação"
            icon={<CheckCircle2 className="w-4 h-4" />}
            badge={validation ? verdictLabel(validation.verdict).text : "Não validado"}
            badgeColor={validation ? (verdictLabel(validation.verdict).color as any) : "gray"}
          >
            {/* R12.21: Validar + Auto-fix lado a lado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={handleValidate}
                disabled={!gcodeText.trim()}
                className="px-3 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500/20 to-violet-500/20 hover:from-cyan-500/30 hover:to-violet-500/30 border border-cyan-500/40 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-4 h-4" />
                Validar G-code
              </button>
              <button
                onClick={handleAutoFix}
                disabled={!validation || !autoFixSummary || autoFixSummary.totalFixable === 0}
                title={
                  !validation
                    ? "Rode a validação primeiro"
                    : autoFixSummary && autoFixSummary.totalFixable > 0
                      ? `Corrigir automaticamente ${autoFixSummary.totalFixable} problema(s)`
                      : "Nada a corrigir automaticamente"
                }
                className={cn(
                  "px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border",
                  autoFixSummary && autoFixSummary.totalFixable > 0
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 border-amber-300 text-black shadow-lg shadow-amber-500/30 animate-pulse"
                    : "bg-white/5 border-white/10 text-gray-500 cursor-not-allowed opacity-50",
                )}
              >
                <Wrench className="w-4 h-4" />
                {autoFixSummary && autoFixSummary.totalFixable > 0
                  ? `Corrigir ${autoFixSummary.totalFixable} problema(s)`
                  : "Sem correções"}
              </button>
            </div>

            {/* R12.21: Bloco de detalhes / opções do auto-fix */}
            {validation && autoFixSummary && (autoFixSummary.totalFixable > 0 || autoFixResult) && (
              <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAutoFixPanel((v) => !v)}
                  className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-semibold text-amber-100 hover:bg-amber-500/10 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Settings2 className="w-3.5 h-3.5" />
                    Ajustes do Auto-fix
                    {autoFixResult && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-[9px] font-mono">
                        {autoFixResult.applied.length} aplicada(s)
                      </span>
                    )}
                  </span>
                  {showAutoFixPanel ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>

                {showAutoFixPanel && (
                  <div className="px-3 pb-3 pt-1 space-y-3 text-[10px]">
                    {/* Lista do que será corrigido */}
                    {autoFixSummary.totalFixable > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-amber-200/80 font-semibold mb-1">
                          O auto-fix pode corrigir:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {Object.entries(autoFixSummary.fixableByCode).map(([code, count]) => (
                            <div
                              key={code}
                              className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2"
                            >
                              <span className="text-amber-100">
                                {FIX_CODE_LABEL[code] || code}
                              </span>
                              <span className="font-mono text-amber-300 font-bold">
                                ×{count}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Parâmetros ajustáveis */}
                    <div className="pt-2 border-t border-amber-500/20">
                      <div className="text-[10px] uppercase tracking-wider text-amber-200/80 font-semibold mb-1">
                        Parâmetros (ajuste e clique em Corrigir):
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex flex-col gap-0.5">
                          <span className="text-gray-400">F default (mm/min)</span>
                          <input
                            type="number"
                            min={1}
                            max={autoFixOpts.limits.feedrateMaxMmMin}
                            step={50}
                            value={autoFixOpts.defaultFeedrate}
                            onChange={(e) => setAutoFixOpts((o) => ({ ...o, defaultFeedrate: Math.max(1, parseInt(e.target.value || "0", 10)) }))}
                            className="px-2 py-1 bg-black/40 border border-amber-500/30 rounded text-[11px] font-mono text-amber-100 focus:outline-none focus:border-amber-400"
                          />
                        </label>
                        <label className="flex flex-col gap-0.5">
                          <span className="text-gray-400">Hotend seguro (°C)</span>
                          <input
                            type="number"
                            min={20}
                            max={autoFixOpts.limits.hotendMaxC}
                            step={1}
                            value={autoFixOpts.safeHotendC}
                            onChange={(e) => setAutoFixOpts((o) => ({ ...o, safeHotendC: Math.max(20, parseInt(e.target.value || "37", 10)) }))}
                            className="px-2 py-1 bg-black/40 border border-amber-500/30 rounded text-[11px] font-mono text-amber-100 focus:outline-none focus:border-amber-400"
                          />
                        </label>
                        <label className="flex flex-col gap-0.5">
                          <span className="text-gray-400">Retração máx (mm)</span>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            step={0.5}
                            value={autoFixOpts.maxRetractMm}
                            onChange={(e) => setAutoFixOpts((o) => ({ ...o, maxRetractMm: Math.max(1, parseFloat(e.target.value || "10")) }))}
                            className="px-2 py-1 bg-black/40 border border-amber-500/30 rounded text-[11px] font-mono text-amber-100 focus:outline-none focus:border-amber-400"
                          />
                        </label>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-gray-400">Comportamento</span>
                          <div className="flex flex-wrap gap-1">
                            <label className="flex items-center gap-1 text-[10px] text-amber-100/90 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={autoFixOpts.commentUnknown}
                                onChange={(e) => setAutoFixOpts((o) => ({ ...o, commentUnknown: e.target.checked }))}
                                className="accent-amber-400"
                              />
                              Comentar cmd. desconhecidos
                            </label>
                            <label className="flex items-center gap-1 text-[10px] text-amber-100/90 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={autoFixOpts.commentG28}
                                onChange={(e) => setAutoFixOpts((o) => ({ ...o, commentG28: e.target.checked }))}
                                className="accent-amber-400"
                              />
                              Comentar G28
                            </label>
                            <label className="flex items-center gap-1 text-[10px] text-amber-100/90 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={autoFixOpts.injectUnits}
                                onChange={(e) => setAutoFixOpts((o) => ({ ...o, injectUnits: e.target.checked }))}
                                className="accent-amber-400"
                              />
                              Inserir G21
                            </label>
                            <label className="flex items-center gap-1 text-[10px] text-amber-100/90 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={autoFixOpts.injectPositioning}
                                onChange={(e) => setAutoFixOpts((o) => ({ ...o, injectPositioning: e.target.checked }))}
                                className="accent-amber-400"
                              />
                              Inserir G90
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Issues que NÃO podem ser auto-corrigidas */}
                    {autoFixSummary.totalUnfixable > 0 && (
                      <div className="pt-2 border-t border-amber-500/20">
                        <div className="text-[10px] uppercase tracking-wider text-rose-300/80 font-semibold mb-1">
                          Precisam de revisão manual:
                        </div>
                        <div className="space-y-0.5">
                          {Object.entries(autoFixSummary.unfixableByCode).map(([code, count]) => (
                            <div key={code} className="text-[10px] text-rose-200/90">
                              <span className="font-mono">[{code}]</span> ×{count}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resultado da última passada */}
                    {autoFixResult && autoFixResult.applied.length > 0 && (
                      <div className="pt-2 border-t border-amber-500/20">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase tracking-wider text-emerald-300/80 font-semibold">
                            Últimas correções aplicadas:
                          </span>
                          <button
                            onClick={handleUndoAutoFix}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-100 flex items-center gap-1"
                          >
                            <Undo2 className="w-3 h-3" />
                            Desfazer
                          </button>
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-0.5 text-[10px] font-mono">
                          {autoFixResult.applied.slice(0, 20).map((fix, i) => (
                            <div
                              key={i}
                              className="px-2 py-1 rounded bg-emerald-500/5 border border-emerald-500/20 text-emerald-100/90"
                            >
                              <span className="font-bold">L{fix.line}</span>{" "}
                              <span className="text-[9px] uppercase opacity-60">[{fix.code}]</span>{" "}
                              {fix.description}
                            </div>
                          ))}
                          {autoFixResult.applied.length > 20 && (
                            <div className="text-center text-[10px] text-gray-400">
                              ... e mais {autoFixResult.applied.length - 20} correção(ões).
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {validation && (
              <div className="mt-3 space-y-2">
                {/* Stats compactos */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                  <Stat label="Linhas de código" value={validation.stats.codeLines.toLocaleString()} />
                  <Stat label="Camadas (est.)" value={validation.stats.estLayerCount.toLocaleString()} />
                  <Stat label="Tempo (est.)" value={`${validation.stats.estTotalTimeMin.toFixed(1)} min`} />
                  <Stat label="Extrusão E" value={`${validation.stats.totalExtrusionE.toFixed(1)} mm`} />
                  <Stat label="X" value={`${validation.stats.bbox.minX.toFixed(1)} → ${validation.stats.bbox.maxX.toFixed(1)} mm`} />
                  <Stat label="Y" value={`${validation.stats.bbox.minY.toFixed(1)} → ${validation.stats.bbox.maxY.toFixed(1)} mm`} />
                  <Stat label="Z" value={`${validation.stats.bbox.minZ.toFixed(1)} → ${validation.stats.bbox.maxZ.toFixed(1)} mm`} />
                  <Stat label="Comandos únicos" value={validation.stats.uniqueCommands.length.toString()} />
                </div>

                {/* Issues */}
                {validation.issues.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                        {validation.errorCount} erros · {validation.warningCount} avisos · {validation.infoCount} infos
                      </span>
                      {validation.issues.length > 8 && (
                        <button
                          onClick={() => setShowAllIssues(!showAllIssues)}
                          className="text-[10px] text-cyan-300 hover:text-cyan-100"
                        >
                          {showAllIssues ? "Mostrar menos" : `Mostrar todos (${validation.issues.length})`}
                        </button>
                      )}
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-0.5 text-[10px] font-mono">
                      {(showAllIssues ? validation.issues : validation.issues.slice(0, 8)).map((iss, i) => {
                        const fixable = FIX_CODE_LABEL[iss.code] !== undefined
                        return (
                          <div
                            key={i}
                            className={cn(
                              "px-2 py-1 rounded border flex items-start gap-2",
                              iss.severity === "error" && "bg-rose-500/10 border-rose-500/30 text-rose-200",
                              iss.severity === "warning" && "bg-amber-500/10 border-amber-500/30 text-amber-200",
                              iss.severity === "info" && "bg-cyan-500/10 border-cyan-500/30 text-cyan-200",
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <span className="font-bold">L{iss.line}</span>{" "}
                              <span className="text-[9px] uppercase opacity-60">[{iss.code}]</span>{" "}
                              {iss.message}
                            </div>
                            {/* R12.21: badge "auto-fix disponível" */}
                            {fixable && (
                              <span
                                title="Esta issue pode ser corrigida pelo botão Auto-fix"
                                className="shrink-0 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] uppercase tracking-wider font-bold flex items-center gap-1"
                              >
                                <Wrench className="w-2.5 h-2.5" />
                                fix
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Panel>

          {/* ── 2.5 Análise de Complexidade (R12.11) ──────────────── */}
          {complexityAnalysis && (
            <Panel
              title="2.5 Complexidade do G-code"
              icon={<Cpu className="w-4 h-4" />}
              badge={complexityAnalysis.complexityLabel}
              badgeColor={complexityAnalysis.complexityColor as any}
            >
              {/* Score visual */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Complexidade geral</span>
                  <span className={cn(
                    "text-xs font-bold",
                    complexityAnalysis.complexityColor === "emerald" && "text-emerald-300",
                    complexityAnalysis.complexityColor === "cyan" && "text-cyan-300",
                    complexityAnalysis.complexityColor === "amber" && "text-amber-300",
                    complexityAnalysis.complexityColor === "rose" && "text-rose-300",
                  )}>
                    {complexityAnalysis.complexityScore.toFixed(0)}/100 · {complexityAnalysis.complexityLabel}
                  </span>
                </div>
                <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      complexityAnalysis.complexityColor === "emerald" && "bg-gradient-to-r from-emerald-500 to-cyan-500",
                      complexityAnalysis.complexityColor === "cyan" && "bg-gradient-to-r from-cyan-500 to-violet-500",
                      complexityAnalysis.complexityColor === "amber" && "bg-gradient-to-r from-amber-500 to-orange-500",
                      complexityAnalysis.complexityColor === "rose" && "bg-gradient-to-r from-rose-500 to-red-500",
                    )}
                    style={{ width: `${complexityAnalysis.complexityScore}%` }}
                  />
                </div>
              </div>

              {/* Stats compactos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                <Stat label="Moves" value={complexityAnalysis.moveCount.toLocaleString()} />
                <Stat label="Camadas" value={complexityAnalysis.layerCount.toString()} />
                <Stat label="Travels" value={complexityAnalysis.travelCount.toLocaleString()} />
                <Stat label="Feedrate max" value={`${complexityAnalysis.maxFeedrate.toFixed(0)} mm/min`} />
              </div>

              {/* Alertas */}
              {complexityAnalysis.alerts.length === 0 ? (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-100">
                    <strong>G-code limpo!</strong> Nenhum alerta de complexidade. Pronto para enviar à bioimpressora.
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
                    {complexityAnalysis.alerts.length} alerta{complexityAnalysis.alerts.length > 1 ? "s" : ""} ·
                    {" "}{complexityAnalysis.alerts.filter(a => a.severity === "critical").length} crítico{complexityAnalysis.alerts.filter(a => a.severity === "critical").length !== 1 ? "s" : ""},
                    {" "}{complexityAnalysis.alerts.filter(a => a.severity === "warning").length} aviso{complexityAnalysis.alerts.filter(a => a.severity === "warning").length !== 1 ? "s" : ""},
                    {" "}{complexityAnalysis.alerts.filter(a => a.severity === "info").length} info
                  </div>
                  {complexityAnalysis.alerts.map((alert, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-lg border p-2.5 text-xs",
                        alert.severity === "critical" && "bg-rose-500/10 border-rose-500/40",
                        alert.severity === "warning" && "bg-amber-500/10 border-amber-500/30",
                        alert.severity === "info" && "bg-cyan-500/10 border-cyan-500/30",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {alert.severity === "critical" && <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                        {alert.severity === "warning" && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                        {alert.severity === "info" && <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <div className={cn(
                            "font-semibold mb-0.5",
                            alert.severity === "critical" && "text-rose-100",
                            alert.severity === "warning" && "text-amber-100",
                            alert.severity === "info" && "text-cyan-100",
                          )}>
                            {alert.title}
                          </div>
                          <div className="text-gray-300 text-[11px] mb-1 leading-relaxed">{alert.detail}</div>
                          <div className={cn(
                            "text-[11px] italic flex items-start gap-1",
                            alert.severity === "critical" && "text-rose-200/80",
                            alert.severity === "warning" && "text-amber-200/80",
                            alert.severity === "info" && "text-cyan-200/80",
                          )}>
                            <span>💡</span> <span>{alert.suggestion}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}

          {/* ── 🔬 Validador Visual Unificado — viewer + validação + complexidade em tabs ── */}
          {gcodeText.trim() && (
            <div id="toolpath-visual-panel" className="scroll-mt-24">
              <SectionErrorBoundary title="Validador visual do G-code">
                <GcodeValidatorPanel
                  gcode={gcodeText}
                  title="Validação visual do G-code · pré-execução"
                  viewerHeight={460}
                />
              </SectionErrorBoundary>
            </div>
          )}

          {/* ── 3. Preview 3D ─────────────────────────────────────── */}
          <Panel
            title="3. Preview profissional (3D)"
            icon={<Eye className="w-4 h-4" />}
            badge={parsed ? `${parsed.moves.length.toLocaleString()} moves` : "sem dados"}
            badgeColor="violet"
            right={
              <div className="flex items-center gap-1.5">
                <select
                  value={colorMode}
                  onChange={(e) => setColorMode(e.target.value as ColorMode)}
                  className="px-1.5 py-1 rounded text-[10px] bg-black/40 border border-white/10 text-gray-300"
                >
                  <option value="layer">Por camada</option>
                  <option value="velocity">Velocidade</option>
                  <option value="shear">Shear stress</option>
                  <option value="type">Tipo (move/travel)</option>
                </select>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="px-2 py-1 rounded text-[10px] bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300"
                >
                  {showPreview ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            }
          >
            {showPreview ? (
              parsed && parsed.moves.length > 0 ? (
                <div className="rounded-lg overflow-hidden border border-white/5 bg-black/40">
                  <SafeGcodeViewer3D
                    parsed={parsed}
                    initialColorMode={colorMode}
                    className="h-[460px] w-full"
                  />
                </div>
              ) : (
                <div className="h-[200px] rounded-lg border border-dashed border-white/10 flex items-center justify-center text-xs text-gray-500">
                  Cole/carregue G-code para ver o preview 3D.
                </div>
              )
            ) : (
              <div className="text-xs text-gray-500 italic px-2 py-3">Preview oculto.</div>
            )}
          </Panel>

          {/* ── 4. Stream / Execução ──────────────────────────────── */}
          <Panel
            title="4. Enviar para a bioimpressora"
            icon={<Send className="w-4 h-4" />}
            badge={controllerState}
            badgeColor={
              controllerState === "streaming" ? "emerald" :
              controllerState === "paused" ? "amber" :
              controllerState === "completed" ? "violet" :
              controllerState === "error" ? "rose" : "gray"
            }
          >
            {!connected && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Conecte a bioimpressora (painel lateral à direita) antes de enviar.</span>
              </div>
            )}
            {connected && validation?.verdict === "blocked" && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-200 text-xs flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-start gap-2 flex-1">
                  <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>O G-code está BLOQUEADO ({validation.errorCount} erros). Corrija antes de enviar.</span>
                </div>
                {/* R12.21: atalho de auto-fix dentro do próprio alerta de bloqueio */}
                {autoFixSummary && autoFixSummary.totalFixable > 0 && (
                  <button
                    onClick={() => {
                      handleAutoFix()
                      setShowAutoFixPanel(true)
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-md text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-black border border-amber-300 shadow-lg shadow-amber-500/30 flex items-center gap-1.5 animate-pulse"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    Corrigir {autoFixSummary.totalFixable} automaticamente
                  </button>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {!isStreaming && !isPaused && (
                <button
                  onClick={handleSend}
                  disabled={!canSend || validation?.verdict === "blocked"}
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Send className="w-4 h-4" />
                  Enviar para Bioimpressora
                </button>
              )}
              {isStreaming && (
                <button
                  onClick={handlePause}
                  className="px-3 py-2 rounded-lg text-sm font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-100 transition-colors flex items-center gap-2"
                >
                  <Pause className="w-4 h-4" /> Pausar
                </button>
              )}
              {isPaused && (
                <button
                  onClick={handleResume}
                  className="px-3 py-2 rounded-lg text-sm font-bold bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-100 transition-colors flex items-center gap-2"
                >
                  <Play className="w-4 h-4" /> Retomar
                </button>
              )}
              {(isStreaming || isPaused) && (
                <button
                  onClick={handleCancel}
                  className="px-3 py-2 rounded-lg text-sm font-bold bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-100 transition-colors flex items-center gap-2"
                >
                  <Square className="w-4 h-4" /> Cancelar
                </button>
              )}
              <button
                onClick={handleEmergency}
                disabled={!connected}
                className="ml-auto px-3 py-2 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-lg shadow-red-500/30 border-2 border-red-400/50"
                title="M112 — Emergency Stop (Marlin trava, exige restart físico)"
              >
                <X className="w-4 h-4" /> EMERGENCY (M112)
              </button>
            </div>
          </Panel>
        </section>

        {/* ═══ COLUNA DIREITA (1/3): Conexão + Joystick + Terminal ═══ */}
        <aside className="space-y-4">
          {/* ── Conexão USB ──────────────────────────────────────── */}
          <Panel
            title="Conexão"
            icon={<Usb className="w-4 h-4" />}
            badge={connected ? "ONLINE" : "OFFLINE"}
            badgeColor={connected ? "emerald" : "gray"}
          >
            {!connected ? (
              <>
                {mode === "real" && !supported && (
                  <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[10px]">
                    Web Serial não suportada. Use Chrome 89+ ou Edge 89+. Modo MOCK funciona em qualquer navegador.
                  </div>
                )}
                {mode === "real" && (
                  <div className="mb-2 flex items-center gap-2 text-[11px]">
                    <span className="text-gray-400">Baud:</span>
                    <select
                      value={baud}
                      onChange={(e) => setBaud(parseInt(e.target.value))}
                      className="flex-1 px-2 py-1 rounded bg-black/40 border border-white/15 text-white"
                    >
                      {BAUD_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                )}
                {/* R12.22: Toggle auto-home — explícito antes de conectar */}
                <label className="flex items-start gap-2 mb-2 p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/20 cursor-pointer hover:bg-cyan-500/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={autoHomeOnConnect}
                    onChange={(e) => setAutoHomeOnConnect(e.target.checked)}
                    className="mt-0.5 accent-cyan-400"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-cyan-100 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Auto-home ao conectar
                    </div>
                    <div className="text-[9px] text-cyan-200/70 leading-tight mt-0.5">
                      Faz apenas <span className="font-mono">G28</span> (home mecânico)
                      ao conectar. Para definir o ponto atual como origem (0,0,0),
                      clique em <span className="font-mono">Ponto inicial</span> nos
                      Comandos rápidos quando quiser.
                    </div>
                  </div>
                </label>
                <button
                  onClick={handleConnect}
                  disabled={mode === "real" && !supported}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                    mode === "mock"
                      ? "bg-violet-500 hover:bg-violet-400 text-white"
                      : "bg-emerald-500 hover:bg-emerald-400 text-white",
                    "disabled:opacity-40 disabled:cursor-not-allowed"
                  )}
                >
                  <Usb className="w-3.5 h-3.5" />
                  {mode === "mock" ? "Iniciar Simulador" : "Conectar USB"}
                </button>
              </>
            ) : (
              <>
                {firmware && (
                  <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[10px] space-y-0.5">
                    <div className="text-emerald-300 font-semibold">
                      Firmware: <span className="text-emerald-100">{firmware.family}{firmware.name ? ` · ${firmware.name}` : ""}</span>
                    </div>
                    {firmware.version && (
                      <div className="text-emerald-200/70 text-[9px]">v{firmware.version}</div>
                    )}
                    {Object.keys(firmware.caps).length > 0 && (
                      <details className="text-[9px] text-emerald-200/60">
                        <summary className="cursor-pointer hover:text-emerald-100">
                          {Object.keys(firmware.caps).length} caps
                        </summary>
                        <ul className="mt-1 space-y-0.5 ml-2">
                          {Object.entries(firmware.caps).slice(0, 10).map(([k, v]) => (
                            <li key={k}>{k}: {v}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
                {/* R12.22: Status do auto-home + botão de Home All manual */}
                <div className={cn(
                  "mb-2 px-2.5 py-1.5 rounded-lg border text-[10px] flex items-start gap-2",
                  didAutoHome
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-200"
                )}>
                  <Sparkles className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>
                    {didAutoHome
                      ? "Home concluído (G28). Defina a origem com \"Ponto inicial\" nos Comandos rápidos antes de imprimir."
                      : "Sem home nesta sessão. Faça Home All antes de imprimir."}
                  </span>
                </div>
                <button
                  onClick={handleHomeAll}
                  disabled={controllerState === "streaming"}
                  className="w-full mb-2 px-3 py-2 rounded-lg text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Home All (G28)
                </button>
                <button
                  onClick={handleDisconnect}
                  className="w-full px-3 py-2 rounded-lg text-xs font-bold bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 text-red-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Power className="w-3.5 h-3.5" /> Desconectar
                </button>
              </>
            )}
          </Panel>

          {/* ── Joystick lateral ─────────────────────────────────── */}
          <Panel
            title="Joystick (jog manual)"
            icon={<Gamepad2 className="w-4 h-4" />}
            badge={`${step} mm`}
            badgeColor="cyan"
          >
            {/* Step size — R12.20: contraste reforçado p/ light mode + log no console técnico */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[9px] uppercase tracking-wider text-gray-500">Step (mm)</div>
                <div className="text-[10px] font-mono text-cyan-300 font-bold">
                  ativo: {step} mm
                </div>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {JOYSTICK_STEPS.map((s) => {
                  const active = step === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setStep(s)
                        loggerRef.current?.info(`Joystick step alterado: ${s} mm`, "controller")
                      }}
                      aria-pressed={active}
                      className={cn(
                        "px-1 py-1 rounded text-[10px] font-mono transition-all",
                        active
                          ? "bg-cyan-500 text-black font-bold border-2 border-cyan-300 ring-2 ring-cyan-400/60 shadow-[0_0_8px_rgba(34,211,238,0.6)] scale-105"
                          : "bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/30"
                      )}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* XY pad */}
            <div className="mb-2">
              <div className="text-[9px] uppercase tracking-wider text-gray-500 mb-1">XY</div>
              <div className="grid grid-cols-3 gap-1 max-w-[200px] mx-auto">
                <div />
                <JogBtn onClick={() => sendJog("Y", +step)} disabled={!connected || isStreaming}>Y+</JogBtn>
                <div />
                <JogBtn onClick={() => sendJog("X", -step)} disabled={!connected || isStreaming}>X−</JogBtn>
                <JogBtn onClick={sendZero} disabled={!connected} variant="zero" title="G92 zero aqui — não move, só zera coordenadas">⌂</JogBtn>
                <JogBtn onClick={() => sendJog("X", +step)} disabled={!connected || isStreaming}>X+</JogBtn>
                <div />
                <JogBtn onClick={() => sendJog("Y", -step)} disabled={!connected || isStreaming}>Y−</JogBtn>
                <div />
              </div>
            </div>

            {/* Z */}
            <div className="mb-2">
              <div className="text-[9px] uppercase tracking-wider text-gray-500 mb-1">Z (cuidado · sem home)</div>
              <div className="grid grid-cols-2 gap-1">
                <JogBtn onClick={() => sendJog("Z", +step)} disabled={!connected || isStreaming}>Z+</JogBtn>
                <JogBtn onClick={() => sendJog("Z", -step)} disabled={!connected || isStreaming} variant="warn">Z−</JogBtn>
              </div>
            </div>

            {/* Extrusora */}
            <div className="mb-2">
              <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-gray-500 mb-1">
                <span>Extrusora E</span>
                <select
                  value={extrudeStep}
                  onChange={(e) => setExtrudeStep(parseFloat(e.target.value))}
                  className="text-[9px] bg-black/40 border border-white/10 rounded px-1 py-0.5 text-gray-300"
                >
                  {EXTRUDE_STEPS.map((s) => <option key={s} value={s}>{s} mm</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <JogBtn onClick={() => sendJog("E", +extrudeStep)} disabled={!connected || isStreaming}>E+</JogBtn>
                <JogBtn onClick={() => sendJog("E", -extrudeStep)} disabled={!connected || isStreaming} variant="warn">E−</JogBtn>
              </div>
            </div>

            {/* Posição atual (virtual — só sandbox) */}
            <div className="mt-2 pt-2 border-t border-white/5 grid grid-cols-4 gap-1 text-[10px] font-mono">
              <div>
                <div className="text-[9px] text-gray-500 uppercase">X</div>
                <div className="text-cyan-300">{position.x.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[9px] text-gray-500 uppercase">Y</div>
                <div className="text-cyan-300">{position.y.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[9px] text-gray-500 uppercase">Z</div>
                <div className="text-amber-300">{position.z.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[9px] text-gray-500 uppercase">E</div>
                <div className="text-emerald-300">{position.e.toFixed(2)}</div>
              </div>
            </div>
          </Panel>

          {/* ── R12.24: Fluxo do hidrogel (M221 em tempo real) ───── */}
          <Panel
            title="Fluxo do hidrogel"
            icon={<Droplet className="w-4 h-4" />}
            badge={`${flowPercent}%`}
            badgeColor={
              flowPercent < 30 ? "amber" :
              flowPercent <= 70 ? "cyan" :
              flowPercent <= 110 ? "emerald" : "violet"
            }
          >
            <div className="space-y-2">
              {/* Display grande + status */}
              <div className="flex items-end justify-between">
                <div className="flex items-baseline gap-1">
                  <span className={cn(
                    "text-2xl font-bold tabular-nums",
                    flowPercent < 30 ? "text-amber-300" :
                    flowPercent <= 70 ? "text-cyan-200" :
                    flowPercent <= 110 ? "text-emerald-200" : "text-violet-200"
                  )}>
                    {flowPercent}
                  </span>
                  <span className="text-sm text-gray-400">%</span>
                </div>
                <div className="text-right text-[9px] leading-tight">
                  {!connected ? (
                    <span className="text-gray-500">Conecte para aplicar</span>
                  ) : flowAppliedRef.current === flowPercent ? (
                    <span className="text-emerald-400 flex items-center gap-0.5 justify-end">
                      <CheckCircle2 className="w-2.5 h-2.5" /> M221 ativo
                    </span>
                  ) : (
                    <span className="text-amber-300 animate-pulse">
                      ajustando…
                    </span>
                  )}
                  <div className="text-gray-500 mt-0.5">multiplica E em runtime</div>
                </div>
              </div>

              {/* Slider 10–200% */}
              <div>
                <input
                  type="range"
                  min={10}
                  max={200}
                  step={1}
                  value={flowPercent}
                  onChange={(e) => handleFlowChange(parseInt(e.target.value, 10))}
                  disabled={!connected}
                  className="w-full accent-cyan-400 disabled:opacity-40"
                  style={{
                    background: `linear-gradient(to right,
                      rgba(251,191,36,0.3) 0%,
                      rgba(251,191,36,0.3) 15%,
                      rgba(34,211,238,0.4) 15%,
                      rgba(34,211,238,0.4) 47%,
                      rgba(16,185,129,0.4) 47%,
                      rgba(16,185,129,0.4) 58%,
                      rgba(139,92,246,0.3) 58%,
                      rgba(139,92,246,0.3) 100%)`
                  }}
                />
                <div className="flex justify-between text-[8px] text-gray-500 mt-0.5 font-mono">
                  <span>10%</span>
                  <span className="text-amber-400/70">30</span>
                  <span className="text-cyan-400/70">50</span>
                  <span className="text-cyan-400/70">70</span>
                  <span className="text-emerald-400/70">100</span>
                  <span>200%</span>
                </div>
              </div>

              {/* Presets */}
              <div className="grid grid-cols-4 gap-1">
                <button
                  onClick={() => handleFlowChange(30)}
                  disabled={!connected}
                  title="Hidrogel leve / baixa viscosidade (alginato diluído, colágeno baixa conc.)"
                  className={cn(
                    "px-1 py-1 rounded text-[9px] font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                    flowPercent === 30
                      ? "bg-amber-500/30 border-amber-400/60 text-amber-100"
                      : "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-200"
                  )}
                >
                  <div>30%</div>
                  <div className="text-[7px] font-normal opacity-70 leading-tight">Leve</div>
                </button>
                <button
                  onClick={() => handleFlowChange(50)}
                  disabled={!connected}
                  title="Padrão para hidrogéis genéricos (GelMA, alginato 2%, Pluronic F-127)"
                  className={cn(
                    "px-1 py-1 rounded text-[9px] font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                    flowPercent === 50
                      ? "bg-cyan-500/30 border-cyan-400/60 text-cyan-100"
                      : "bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-200"
                  )}
                >
                  <div>50%</div>
                  <div className="text-[7px] font-normal opacity-70 leading-tight">Padrão</div>
                </button>
                <button
                  onClick={() => handleFlowChange(70)}
                  disabled={!connected}
                  title="Hidrogel denso / alta viscosidade (alginato 5%, GelMA com fillers)"
                  className={cn(
                    "px-1 py-1 rounded text-[9px] font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                    flowPercent === 70
                      ? "bg-cyan-500/30 border-cyan-400/60 text-cyan-100"
                      : "bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-200"
                  )}
                >
                  <div>70%</div>
                  <div className="text-[7px] font-normal opacity-70 leading-tight">Denso</div>
                </button>
                <button
                  onClick={() => handleFlowChange(100)}
                  disabled={!connected}
                  title="Sem ajuste — usa os valores E calculados pelo slicer (filamento FDM)"
                  className={cn(
                    "px-1 py-1 rounded text-[9px] font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                    flowPercent === 100
                      ? "bg-emerald-500/30 border-emerald-400/60 text-emerald-100"
                      : "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-200"
                  )}
                >
                  <div>100%</div>
                  <div className="text-[7px] font-normal opacity-70 leading-tight">Filamento</div>
                </button>
              </div>

              {/* Ajuste fino ±1% / ±5% */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleFlowChange(Math.max(10, flowPercent - 5))}
                  disabled={!connected || flowPercent <= 10}
                  className="flex-1 px-1 py-1 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 disabled:opacity-30"
                  title="−5%"
                >
                  −5
                </button>
                <button
                  onClick={() => handleFlowChange(Math.max(10, flowPercent - 1))}
                  disabled={!connected || flowPercent <= 10}
                  className="flex-1 px-1 py-1 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 disabled:opacity-30"
                  title="−1%"
                >
                  −1
                </button>
                <button
                  onClick={() => handleFlowChange(Math.min(200, flowPercent + 1))}
                  disabled={!connected || flowPercent >= 200}
                  className="flex-1 px-1 py-1 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 disabled:opacity-30"
                  title="+1%"
                >
                  +1
                </button>
                <button
                  onClick={() => handleFlowChange(Math.min(200, flowPercent + 5))}
                  disabled={!connected || flowPercent >= 200}
                  className="flex-1 px-1 py-1 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 disabled:opacity-30"
                  title="+5%"
                >
                  +5
                </button>
              </div>

              {/* Dica contextual */}
              <div className={cn(
                "rounded-md px-2 py-1.5 text-[9px] leading-tight border",
                isStreaming
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                  : "bg-cyan-500/5 border-cyan-500/20 text-cyan-200/80"
              )}>
                <Info className="w-2.5 h-2.5 inline mr-1 -mt-0.5" />
                {isStreaming
                  ? "Imprimindo — ajuste agora se notar sub-extrusão (linhas falhadas) ou super-extrusão (excesso na ponta)."
                  : "Para hidrogéis, comece em 50%. Ajustável em tempo real durante a impressão via Marlin M221."}
              </div>
            </div>
          </Panel>

          {/* ── Comandos rápidos ─────────────────────────────────── */}
          <Panel title="Comandos rápidos" icon={<Wand2 className="w-4 h-4" />} badge={`${quickActions.length}`} badgeColor="violet">
            <div className="grid grid-cols-2 gap-1">
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => runQuickAction(a.cmd)}
                  disabled={!connected}
                  title={a.title}
                  className="px-2 py-1.5 rounded-md text-[10px] font-semibold bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {a.label}
                </button>
              ))}
            </div>

            {/* Manual command */}
            <div className="mt-2 flex gap-1">
              <input
                value={manualCmd}
                onChange={(e) => setManualCmd(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleManualSend() }}
                placeholder="Comando G/M…"
                disabled={!connected}
                className="flex-1 px-2 py-1.5 rounded bg-black/40 border border-white/15 text-[11px] font-mono text-emerald-200 placeholder-gray-600 focus:border-cyan-500/50 outline-none disabled:opacity-40"
              />
              <button
                onClick={handleManualSend}
                disabled={!connected || !manualCmd.trim()}
                className="px-2.5 py-1.5 rounded bg-cyan-500/30 hover:bg-cyan-500/50 border border-cyan-500/50 text-cyan-100 text-[11px] font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          </Panel>

          {/* ── Terminal Serial ──────────────────────────────────── */}
          <Panel
            title="Terminal serial"
            icon={<TerminalIcon className="w-4 h-4" />}
            badge={`${logEntries.length} entries`}
            badgeColor="emerald"
            right={
              <div className="flex gap-1">
                <button
                  onClick={() => loggerRef.current.clear()}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                  title="Limpar log"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <button
                  onClick={downloadLog}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                  title="Baixar log"
                >
                  <Download className="w-3 h-3" />
                </button>
              </div>
            }
          >
            <div
              ref={terminalRef}
              className="h-64 overflow-y-auto bg-black/60 rounded-lg border border-white/5 p-2 font-mono text-[10px] leading-tight"
            >
              {logEntries.length === 0 ? (
                <div className="text-gray-600 italic">Aguardando…</div>
              ) : (
                logEntries.map((e) => (
                  <div key={e.seq} className={cn("whitespace-pre-wrap", severityColor(e.severity))}>
                    <span className="text-gray-600 text-[9px]">
                      {new Date(e.ts).toTimeString().slice(0, 8)}
                    </span>{" "}
                    {SEVERITY_PREFIX[e.severity]}{" "}
                    {e.source && <span className="text-gray-600">[{e.source}]</span>}{" "}
                    {e.text}
                  </div>
                ))
              )}
            </div>
          </Panel>
        </aside>
      </main>

      {/* ─── Footer info ─────────────────────────────────────────── */}
      <footer className="max-w-[1800px] mx-auto px-4 py-6 text-[10px] text-gray-500 space-y-1">
        <div className="flex items-center gap-1.5">
          <Info className="w-3 h-3" />
          <span>
            <strong className="text-gray-400">Modo MOCK</strong>: simulador Marlin sem hardware — funciona em qualquer navegador.{" "}
            <strong className="text-gray-400">Modo REAL</strong>: Web Serial API (Chrome/Edge 89+, contexto seguro).
            Protocolo: linha-a-linha com handshake <code className="text-emerald-400">ok</code>, retry × 2, timeout 30s.
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldAlert className="w-3 h-3 text-amber-400" />
          <span>
            <strong className="text-amber-400">Emergency (M112)</strong> trava o firmware Marlin — exige restart físico da impressora.
            Use só em situação real de risco.
          </span>
        </div>
      </footer>
    </div>
  )
}

// ─── Sub-componentes ─────────────────────────────────────────────────────

function Panel({
  title, icon, badge, badgeColor = "gray", right, children,
}: {
  title: string
  icon?: React.ReactNode
  badge?: string
  badgeColor?: "gray" | "cyan" | "violet" | "emerald" | "amber" | "rose"
  right?: React.ReactNode
  children: React.ReactNode
}) {
  const badgeColors: Record<string, string> = {
    gray:    "bg-white/5 border-white/15 text-gray-400",
    cyan:    "bg-cyan-500/15 border-cyan-500/40 text-cyan-200",
    violet:  "bg-violet-500/15 border-violet-500/40 text-violet-200",
    emerald: "bg-emerald-500/15 border-emerald-500/40 text-emerald-200",
    amber:   "bg-amber-500/15 border-amber-500/40 text-amber-200",
    rose:    "bg-rose-500/15 border-rose-500/40 text-rose-200",
  }
  return (
    <section className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
      <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2 bg-black/40">
        <div className="text-gray-300">{icon}</div>
        <h3 className="text-xs font-bold text-white">{title}</h3>
        {badge && (
          <span className={cn(
            "text-[9px] px-1.5 py-0.5 rounded-full border font-semibold uppercase tracking-wider",
            badgeColors[badgeColor]
          )}>
            {badge}
          </span>
        )}
        <div className="flex-1" />
        {right}
      </div>
      <div className="p-3">
        {children}
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-1.5 rounded bg-black/40 border border-white/5">
      <div className="text-[9px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-[11px] font-mono text-white">{value}</div>
    </div>
  )
}

function JogBtn({
  children, onClick, disabled, variant = "default", title,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: "default" | "warn" | "zero"
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "px-2 py-2 rounded-lg text-xs font-bold border transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
        variant === "default" && "bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/40 text-cyan-100",
        variant === "warn" && "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-100",
        variant === "zero" && "bg-violet-500/20 hover:bg-violet-500/30 border-violet-500/40 text-violet-100",
      )}
    >
      {children}
    </button>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const SEVERITY_PREFIX: Record<LogSeverity, string> = {
  tx:    "→",
  rx:    "←",
  info:  "·",
  warn:  "⚠",
  error: "✗",
  ok:    "✓",
}

function severityColor(s: LogSeverity): string {
  switch (s) {
    case "tx":    return "text-cyan-400"
    case "rx":    return "text-emerald-300"
    case "info":  return "text-gray-400"
    case "warn":  return "text-amber-300"
    case "error": return "text-rose-400"
    case "ok":    return "text-emerald-400 font-semibold"
  }
}

function formatMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—"
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h${(m % 60).toString().padStart(2, "0")}m`
  if (m > 0) return `${m}m${(s % 60).toString().padStart(2, "0")}s`
  return `${s}s`
}
