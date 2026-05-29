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
  Wrench, Undo2, Settings2, Droplet, Crosshair, Loader2,
  Printer, ListChecks,
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
// R12.47: estado global do processo + checagem de coerência modelo↔gcode
import { useBioprintProcess } from "@/lib/bioprint/process-context"
import { checkCoherence, coherenceBadge, type CoherenceReport } from "@/lib/bioprint/coherence-check"

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

/**
 * R12.33: Volume útil padrão da Bioender 200 (200×200 mm de leito).
 *
 * Após o G28, o cabeçote fica num canto (tipicamente X=0 Y=0 Z=0 ou Z=Zmax).
 * Antes de iniciar qualquer impressão / antes do usuário pegar o joystick, é
 * desejável posicionar o cabeçote no CENTRO da mesa, COM UM CLEARANCE em Z
 * para não bater na placa de cultura. Isso resolve dois problemas:
 *
 *   1) Coloca a impressora pronta para receber o G-code (start position
 *      previsível) — o usuário vê o cabeçote chegar no centro e sabe que
 *      a máquina está livre para imprimir.
 *
 *   2) Sai dos endstops (X=0 Y=0 Z=0) onde alguns firmwares Marlin com
 *      soft endstops ativos (M211 S1) podem rejeitar JOG NEGATIVO em todos
 *      os eixos, deixando o joystick "travado" para o usuário. Movendo para
 *      o centro, todos os 4 sentidos (X±, Y±) ficam disponíveis sem
 *      conflito com soft endstops.
 */
const BIOENDER_BED_X_MM = 200
const BIOENDER_BED_Y_MM = 200
const POST_HOME_Z_CLEARANCE_MM = 30    // sobe 30mm antes do XY → não bate na placa
const POST_HOME_XY_FEEDRATE = 3000     // 50 mm/s (3000 mm/min) — seguro
const POST_HOME_Z_FEEDRATE = 600       // 10 mm/s — Z lento para preservar células

// R12.40: após centralizar (Z=30mm), descer 22mm para ficar a Z=8mm
// próximo da mesa — pronto para iniciar a bioimpressão sem precisar
// fazer jog manual. Ainda preserva clearance de 8mm para não colidir
// com placas de cultura ao mover XY.
const POST_HOME_Z_APPROACH_DROP_MM = 22 // desce 22mm após o clearance (30 → 8)

// G-code de demo (hello world quadrado pequeno)
// R12.18: G-code demo agora é um cubo 20×20 com 2 camadas de infill TPMS
// gyroid (Triply Periodic Minimal Surface) — substitui o antigo "Hello Square"
// simples. Permite validar visualização 3D real do toolpath complexo.
const DEMO_GCODE = DEMO_GYROID_GCODE

// Step sizes do joystick
type StepSize = 0.05 | 0.1 | 0.5 | 1 | 5 | 10
const JOYSTICK_STEPS: StepSize[] = [0.05, 0.1, 0.5, 1, 5, 10]
// R12.40: passos do extrusor expandidos para UX intuitiva de bioimpressão.
// Valores grandes (2, 5, 10 mm) permitem PURGA da seringa antes da impressão
// e remoção de bolha de ar — operações comuns. Default subido para 1 mm
// (era 0.1 mm — alto demais para purga, baixo demais para "sentir" o motor).
const EXTRUDE_STEPS: number[] = [0.05, 0.1, 0.5, 1, 2, 5, 10]

// SessionStorage key — vindo de /quick-gcode, /gcode/medical, /gcode/advanced
const HANDOFF_KEY = "bia.execute.gcode.handoff"

// ─── Componente principal ────────────────────────────────────────────────

export default function BioprintExecutePage() {
  // R12.47: estado global do processo de bioimpressão (fonte da verdade).
  // O /execute agora consome o BioprintProcessState para verificar coerência
  // entre o que a usuária escolheu (modelo, biotinta, fatiamento) e o G-code
  // realmente carregado — antes de liberar o IMPRIMIR.
  const { state: bioprintState } = useBioprintProcess()

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
  // R12.29: também valida + auto-corrige automaticamente (igual aos demais
  // canais de carga). Não pode usar loadGcodeWithAutoFix aqui porque o
  // useCallback é declarado depois — então a lógica é inline (curta).
  //
  // R12.52: agora há DOIS canais de carga:
  //   1) sessionStorage HANDOFF_KEY — usado por /quick-gcode, /gcode/medical,
  //      /gcode/advanced, /printability (chamam sendToExecute)
  //   2) bioprintState.slice.gcode — usado pelo FLUXO PRINCIPAL (etapas
  //      model → bioink → slice). A /slice grava em state.slice.gcode via
  //      updateSlice e nunca chamava sendToExecute, então o /execute ficava
  //      sem G-code. Bug reportado pela Janaina: "faço membrana+linhas e
  //      não consigo imprimir".
  //
  // Prioridade: HANDOFF tem preferência (é mais recente, vem de um botão
  // explícito). Se vazio, usa o state.slice.gcode do context global.
  useEffect(() => {
    // Helper interno — carrega + valida + auto-fix
    const loadAndValidate = (gcode: string, name: string, from: string) => {
      setGcodeText(gcode)
      setGcodeName(name)
      loggerRef.current.info(`G-code importado de ${from} — ${gcode.split("\n").length} linhas`)
      try {
        const result = validateGcode(gcode, DEFAULT_BIO_LIMITS, "marlin")
        const summary = summarizeAutoFix(result)
        if (summary.totalFixable > 0) {
          const fix = autoFixGcode(gcode, result, DEFAULT_AUTOFIX_OPTS)
          if (fix.applied.length > 0) {
            setGcodeText(fix.fixedGcode)
            const reval = validateGcode(fix.fixedGcode, DEFAULT_BIO_LIMITS, "marlin")
            setValidation(reval)
            loggerRef.current.ok(
              `Auto-fix aplicou ${fix.applied.length} correção(ões) no G-code importado.`,
              "validator",
            )
          } else {
            setValidation(result)
          }
        } else {
          setValidation(result)
        }
      } catch (e) {
        loggerRef.current.warn(`Validação automática falhou: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    try {
      // ── Canal 1: sessionStorage HANDOFF ──
      const raw = sessionStorage.getItem(HANDOFF_KEY)
      if (raw) {
        const obj = JSON.parse(raw) as { gcode: string; name?: string; from?: string }
        if (obj.gcode) {
          sessionStorage.removeItem(HANDOFF_KEY)
          loadAndValidate(obj.gcode, obj.name ?? "G-code importado", obj.from ?? "outra página")
          return
        }
      }

      // ── Canal 2 (R12.52): bioprintState.slice.gcode ──
      // Se o usuário veio do fluxo principal (model → bioink → slice), o
      // G-code está no context. Sem isso, /execute fica vazio e o botão
      // IMPRIMIR mostra "Sem G-code carregado".
      if (bioprintState.slice.gcode && bioprintState.slice.gcode.trim().length > 0) {
        const modelName = bioprintState.model.name ?? bioprintState.model.geometryId ?? "fluxo principal"
        loadAndValidate(
          bioprintState.slice.gcode,
          `${modelName}.gcode`,
          "fluxo Bioprint (Etapa 3 · Fatiamento)",
        )
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intencionalmente só no mount — handoff e state inicial

  // ─── Validação ──
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [showAllIssues, setShowAllIssues] = useState(false)

  // R12.47: Coerência modelo↔gcode. Sempre que o gcodeText mudar, recalcula
  // o report comparando contra o BioprintProcessState. Se `isBlocking`, o
  // botão IMPRIMIR fica desabilitado e o modal de pré-flight mostra o motivo.
  const coherenceReport: CoherenceReport | null = useMemo(() => {
    if (!gcodeText.trim()) return null
    try {
      return checkCoherence(gcodeText, bioprintState)
    } catch {
      return null
    }
  }, [gcodeText, bioprintState])

  // R12.47: estado do modal "Pré-flight" — mostra checklist completo antes
  // de mandar o stream. Abre quando o usuário clica em IMPRIMIR (qualquer
  // dos dois botões: o do painel principal ou o do joystick).
  const [showPreflight, setShowPreflight] = useState(false)

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
  // R12.45 — Estado de "preparando impressora": true entre o `setConnected(true)` e o
  // fim do post-home (incluindo G28, G90/M83/M302, ir-pro-centro, descida Z, G92).
  // Bloqueia jog do usuário neste período — porque o waiter do G28/M400 é único,
  // se um jog do usuário entra ele rouba o ok do home e tudo trava (log da Bia).
  const [isHandshaking, setIsHandshaking] = useState(false)
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
   * R12.33: Pós-home — move cabeçote para o CENTRO da mesa com clearance Z.
   *
   * Sequência após o G28 (compatível com Marlin):
   *   G91                ; coordenadas relativas
   *   G1 Z+30 F600       ; sobe 30mm (clearance) — preserva placa de cultura
   *   G90                ; volta a absoluto
   *   G1 X100 Y100 F3000 ; centro da mesa Bioender 200×200
   *   M400               ; aguarda fim de todo movimento (sincroniza)
   *
   * Default ON: deixa a impressora pronta para receber G-code OU para o
   * usuário fazer jog manual sem encostar em soft endstops nos cantos.
   */
  const [autoCenterAfterHome, setAutoCenterAfterHome] = useState<boolean>(true)

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

  /**
   * R12.39: Controle de VELOCIDADE em tempo real via Marlin M220.
   *
   * M220 S{percent} = Set Feedrate Percentage — multiplica TODA velocidade
   * F<...> dos próximos comandos por esse fator. É o "irmão" do M221 (flow):
   *   • M220 → afeta velocidade de TODOS os movimentos (XYZ + E)
   *   • M221 → afeta apenas o fluxo de extrusão (E)
   *
   * Para bioimpressão é crítico ter ambos:
   *   • Slow-mo (M220 S30) — útil para depositar com precisão em geometrias
   *     delicadas ou quando o usuário quer observar visualmente.
   *   • Acelera (M220 S150) — útil em travels longos ou para terminar
   *     impressões rapidamente quando a viabilidade não está em risco.
   *
   * Faixa segura: 25–200% (clamp). Default: 100% (sem override).
   *
   * speedAppliedRef rastreia o último valor efetivo, evita reenvios redundantes.
   */
  const [speedPercent, setSpeedPercent] = useState<number>(100)
  const speedAppliedRef = useRef<number | null>(null)
  const speedSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // ─── R12.33: Move cabeçote para CENTRO da mesa (com clearance Z) ──
  //
  // R12.38: MOVIDO PARA ANTES de handleConnect/handleHomeAll para evitar
  // TDZ (Temporal Dead Zone) — esses callbacks usam `moveToSafeCenterAfterHome`
  // nos seus arrays de deps. Em produção minificada, o array é avaliado
  // durante `useCallback(...)` e referenciar a const ANTES dela ser
  // declarada (mais abaixo no corpo do componente) lança
  // ReferenceError: Cannot access 'moveToSafeCenterAfterHome' before initialization.
  //
  // Helper compartilhado entre auto-home (no connect) e handleHomeAll
  // (botão manual). Sequência idêntica em ambos os pontos:
  //   1) G91 (relativo) → G1 Z+30 F600 → G90 (absoluto)   — clearance Z
  //   2) G1 X<cx> Y<cy> F3000                             — centro da mesa
  //   3) M400                                              — aguarda fim do movimento
  //
  // Após esta função:
  //   · cabeçote está no centro com 30mm de altura → seguro p/ placa de cultura
  //   · todos os eixos saíram dos soft endstops (X=0/Y=0/Z=0) — joystick livre
  //   · próximo G-code enviado pode começar com posicionamento absoluto
  //
  // O M400 é CRÍTICO: ele faz o Marlin aguardar o BUFFER DE PLANEJAMENTO
  // esvaziar antes de responder 'ok'. Sem isso, o sendAndWait resolveria
  // assim que o G1 entrasse no planner, e os comandos seguintes do
  // handshake (G90/M83) viriam ANTES do movimento terminar fisicamente.
  // Resultado prático: o joystick travaria porque o Marlin ainda estaria
  // processando o movimento de centralização quando o usuário clicasse.
  const moveToSafeCenterAfterHome = useCallback(async (
    bedX: number = BIOENDER_BED_X_MM,
    bedY: number = BIOENDER_BED_Y_MM,
  ): Promise<void> => {
    if (!controllerRef.current) {
      loggerRef.current.warn("moveToSafeCenterAfterHome: sem controller — ignorando.")
      return
    }
    const cx = +(bedX / 2).toFixed(2)
    const cy = +(bedY / 2).toFixed(2)
    loggerRef.current.info(
      `Pós-home: subindo Z+${POST_HOME_Z_CLEARANCE_MM}mm e indo para o centro (${cx}, ${cy}) …`,
      "controller",
    )
    // 1) Clearance Z relativo
    await controllerRef.current.sendAndWait("G91 ; modo relativo p/ clearance Z")
    await controllerRef.current.sendAndWait(
      `G1 Z${POST_HOME_Z_CLEARANCE_MM} F${POST_HOME_Z_FEEDRATE} ; clearance Z (não bater na placa de cultura)`,
    )
    await controllerRef.current.sendAndWait("G90 ; volta para absoluto")
    // 2) Move XY para o centro
    await controllerRef.current.sendAndWait(
      `G1 X${cx} Y${cy} F${POST_HOME_XY_FEEDRATE} ; centro da mesa Bioender ${bedX}×${bedY}mm`,
    )
    // 3) SINCRONIZA — aguarda o buffer do planner esvaziar antes do próximo cmd
    //
    // Sem o M400 + sendAndWait, o Marlin libera o 'ok' assim que o G1 entra
    // no planner — mas o cabeçote ainda está se movendo fisicamente. Como o
    // handshake continua imediatamente (G90, M83, jog do usuário), o
    // próximo comando pode tentar setar modo de coordenadas DURANTE o
    // movimento, ou o joystick pode disparar G91/G1/G90 enquanto o
    // movimento de centralização ainda está em curso → resultado:
    // joystick aparenta estar TRAVADO até o cabeçote finalmente parar
    // (que pode levar 2-4 segundos a 50 mm/s atravessando 100mm).
    // O M400 bloqueia o firmware até o motion buffer estar VAZIO.
    await controllerRef.current.sendAndWait("M400 ; aguarda fim do movimento (sincroniza)")

    // R12.40: 4) APROXIMAÇÃO DA MESA — desce 22mm para ficar a Z=8mm.
    // Após o clearance, o cabeçote está em Z=30mm. Para iniciar a
    // bioimpressão, precisamos aproximar a ponta da seringa da mesa —
    // posição típica de "stand-by" entre 5-10mm acima do substrato
    // (placa de Petri, lamínula, well-plate). Z=8mm é uma altura
    // segura que permite ao usuário ver visualmente a ponta e fazer
    // jog fino (Z-) para encostar com precisão.
    //
    // Feedrate baixo (POST_HOME_Z_FEEDRATE = 600 mm/min = 10 mm/s) para
    // descida controlada — se houver obstáculo (placa de cultura mal
    // posicionada), o usuário tem tempo de pressionar Emergency Stop.
    const approachZ = +(POST_HOME_Z_CLEARANCE_MM - POST_HOME_Z_APPROACH_DROP_MM).toFixed(2)
    loggerRef.current.info(
      `Aproximação: descendo Z para ${approachZ}mm (clearance ${POST_HOME_Z_CLEARANCE_MM}mm − ${POST_HOME_Z_APPROACH_DROP_MM}mm)…`,
      "controller",
    )
    await controllerRef.current.sendAndWait(
      `G1 Z${approachZ} F${POST_HOME_Z_FEEDRATE} ; aproximação da mesa para iniciar bioimpressão (R12.40)`,
    )
    // SINCRONIZA aproximação para garantir que o usuário só interaja
    // com o joystick quando o cabeçote estiver FISICAMENTE em Z=8mm.
    await controllerRef.current.sendAndWait("M400 ; aguarda fim da aproximação (R12.40)")

    // R12.45 — CRÍTICO: redefine origem lógica para o CENTRO da mesa.
    //
    // PROBLEMA: G-codes de teste (incluindo /printability) usam coordenadas
    // X0/Y0/Z0 como ponto de partida (porque eles assumem que "0,0" é o
    // canto inferior-esquerdo da peça). Após o G28 + ir-para-centro, a
    // impressora sabe que está fisicamente em X=100 Y=100 — mas se o
    // G-code começa com "G0 X0 Y0", ela vai PRA TRÁS, até o canto da mesa.
    //
    // Foi exatamente o que aconteceu no log da Bia (R12.44 / 09:46:54):
    // após o pós-home colocar o cabeçote em (100,100), o G-code começou com
    // "G0 X0 Y0 Z0.250" e a impressora foi para o canto, imprimindo lá.
    //
    // SOLUÇÃO: G92 X0 Y0 Z<approachZ> redefine a origem lógica para o
    // ponto físico atual (centro, Z=8mm). Agora "X0 Y0" no G-code = centro
    // da mesa. O Z fica em 8mm para que a primeira camada (Z=0.25 por ex)
    // seja na altura correta — o G-code pode usar Z baixo sem bater na mesa.
    //
    // NOTA: alguns G-codes têm seu próprio G92 X0 Y0 Z0 no header. Quando
    // isso acontece, o nosso G92 vira no-op (o do G-code prevalece) — mas
    // garantimos o estado certo se o usuário enviar um G-code que NÃO tem
    // G92 (caso típico do /printability quick-gcode).
    await controllerRef.current.sendAndWait(
      `G92 X0 Y0 Z${approachZ} ; redefine origem lógica: centro da mesa = (0,0) (R12.45)`,
    )

    // Atualiza estado de UI da posição (cabeçote agora em X=0 Y=0 lógico,
    // mas FISICAMENTE no centro a Z=approachZ). A UI mostra coordenadas
    // lógicas, que é o que faz sentido para o usuário olhando o G-code.
    setPosition((p) => ({ ...p, x: 0, y: 0, z: approachZ }))
    loggerRef.current.ok(
      `Cabeçote no centro físico (${cx}, ${cy}) — origem lógica redefinida: agora (0,0,${approachZ}) = centro da mesa. Pronto para bioimprimir.`,
      "controller",
    )
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
      // R12.45: BLOQUEIA jog/comandos manuais durante TODO o handshake +
      // post-home. Liberado no `finally` lá embaixo (ou se algo der erro).
      setIsHandshaking(true)
      loggerRef.current.ok(`Conectado em modo ${mode.toUpperCase()}.`)
      loggerRef.current.info(
        "🔒 Preparando impressora — joystick BLOQUEADO até o cabeçote estar no centro da mesa. Aguarde o '✓ Pronto para bioimprimir'.",
        "controller",
      )

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

      // R12.23 + R12.33: Auto-home ao conectar envia G28 (home mecânico) e,
      // se autoCenterAfterHome=true, move o cabeçote para o CENTRO da mesa
      // com clearance Z (30mm). Isso resolve dois problemas:
      //   (a) deixa a impressora pronta para receber G-code (start position
      //       previsível no centro);
      //   (b) tira os eixos dos soft endstops do canto (0,0,0), onde alguns
      //       firmwares Marlin bloqueiam jog negativo em todos os eixos.
      //
      // O G92 (definir ponto inicial / origem lógica) foi desacoplado e agora é uma
      // ação manual do usuário, disponível no painel de Comandos rápidos como
      // "Ponto inicial". Isso permite ao usuário fazer o jog até a posição desejada
      // (centro de poço, etc.) e só então definir aquele ponto como (0,0,0).
      if (autoHomeOnConnect) {
        try {
          loggerRef.current.info("Auto-home: enviando G28 (home all eixos)…", "controller")
          // Marlin: G28 retorna ok só ao terminar o home; timeout padrão do controller (30s) basta
          await controllerRef.current?.sendAndWait("G28 ; auto-home all (R12.23)")
          loggerRef.current.ok("Home concluído em todos os eixos (G28).", "controller")
          setDidAutoHome(true)
          // Posição lógica pós-G28: cabeçote no canto (assumido 0,0,0)
          setPosition({ x: 0, y: 0, z: 0, e: 0 })
        } catch (e) {
          loggerRef.current.warn(`Auto-home falhou: ${e instanceof Error ? e.message : String(e)}. Use o botão "Home All" do painel se a impressora estiver pronta.`)
          setDidAutoHome(false)
        }
      } else {
        loggerRef.current.info("Auto-home desabilitado — use o botão \"Home All\" se necessário.", "controller")
        setDidAutoHome(false)
      }

      // R12.27: ANTES de qualquer movimento pós-home, garante modo POSICIONAMENTO
      // ABSOLUTO (G90) + EXTRUSORA RELATIVA (M83). Sem M83, jog do eixo E falha
      // silenciosamente: o Marlin pode estar em modo extrusora absoluta após
      // boot/G28; o primeiro G1 E0.1 move uma vez (vai p/ E=0.1mm absoluto), o
      // segundo não move (já está em 0.1). Com M83, todo G1 E<n> passa a ser
      // delta. G91/G90 controla apenas X/Y/Z; o modo do extrusor é independente.
      //
      // R12.33: este bloco foi MOVIDO para ANTES do moveToSafeCenter porque a
      // centralização usa G90/G91 (XYZ) — precisa do estado de coordenadas
      // previsível para o M400 sincronizar corretamente.
      try {
        await controllerRef.current?.sendAndWait("G90 ; XYZ em modo absoluto")
        await controllerRef.current?.sendAndWait("M83 ; extrusora em modo relativo (R12.27)")
        // R12.40: LIBERA EXTRUSÃO A FRIO. Marlin por padrão tem
        // PREVENT_COLD_EXTRUSION ativo: se a temperatura do hotend estiver
        // abaixo de EXTRUDE_MINTEMP (default 170°C), TODO comando `G1 E...`
        // é silenciosamente IGNORADO — o firmware responde "ok" mas o motor
        // do extrusor NÃO MOVE. Como bioimpressoras operam à temperatura
        // ambiente (sem hotend, ou hotend desligado, hidrogéis se degradam
        // acima de 37°C), precisamos desativar essa proteção. Esse era o
        // motivo principal de E+/E- "não funcionar" pós Home All.
        //   M302 S0   → minTemp = 0°C (qualquer temperatura permitida)
        //   M302 P1   → permite cold extrusion explicitamente (Marlin 2.0+)
        await controllerRef.current?.sendAndWait("M302 S0 P1 ; libera extrusão a frio (R12.40 — bioimpressora)")
        loggerRef.current.info("Modo pronto: XYZ absoluto (G90) + E relativo (M83) + cold extrusion liberada (M302).", "controller")
      } catch (e) {
        loggerRef.current.warn(`Não foi possível ajustar modo de coordenadas: ${e instanceof Error ? e.message : String(e)}`)
      }

      // R12.33: PÓS-HOME — move cabeçote para o centro com clearance Z.
      // Sem isso, o cabeçote fica em (0,0,0) onde:
      //   · soft endstops podem bloquear jog negativo
      //   · não há previsibilidade de start position para o G-code
      //   · risco de colisão com placa de cultura ao tentar mover XY com Z=0
      // Só roda se o auto-home teve sucesso E o usuário não desabilitou a opção.
      if (autoHomeOnConnect && autoCenterAfterHome) {
        try {
          await moveToSafeCenterAfterHome()
        } catch (e) {
          loggerRef.current.warn(
            `Centralização pós-home falhou: ${e instanceof Error ? e.message : String(e)}. ` +
            `Você pode mover manualmente com o joystick.`,
          )
        }
      }

      // R12.45: handshake + post-home COMPLETOS → libera joystick + comandos manuais
      setIsHandshaking(false)
      loggerRef.current.ok(
        "🔓 Impressora pronta. Joystick LIBERADO — você pode mover os eixos e iniciar a impressão.",
        "controller",
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      loggerRef.current.error(`Falha ao conectar: ${msg}`)
      // R12.29: cleanup defensivo — se a falha aconteceu APÓS o transport
      // ter aberto o port (ex.: handshake falhou), precisamos garantir que
      // o port USB seja liberado e o listener do controller seja removido.
      // Sem isso, o port fica "ocupado" e tentativas de reconectar dão
      // "Failed to open serial port" — o usuário só consegue se sair, ou
      // clicar em "Reiniciar Tudo".
      try { controllerRef.current?.destroy() } catch {}
      try { await transportRef.current?.disconnect() } catch {}
      transportRef.current = null
      controllerRef.current = null
      setConnected(false)
      setIsHandshaking(false)   // R12.45: libera mesmo em erro
      setFirmware(null)
      setControllerState("idle")
      loggerRef.current.info(
        "Dica: se a falha persistir, clique em \"Reiniciar Tudo\" no painel de conexão para limpar a sessão e tentar de novo.",
        "controller",
      )
    }
  }, [connected, mode, supported, baud, autoHomeOnConnect, autoCenterAfterHome, flowPercent, moveToSafeCenterAfterHome])

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

  // ─── R12.29: RESET TOTAL (botão "Reiniciar Tudo") ──
  //
  // Limpa COMPLETAMENTE o estado da sessão para começar do zero, sem
  // resíduos de comandos pendentes, validações antigas ou conexões
  // travadas. Endereça o cenário do usuário:
  //   1) impressora conectada com fila travada / 'ok' pendente capturando
  //      o waiter errado (joystick não move);
  //   2) G-code carregado com erros / paths inválidos que bloqueiam a
  //      validação e impedem o envio;
  //   3) controller em estado "error" / "aborting" sem caminho de volta
  //      para "idle".
  //
  // Esta função NÃO envia M112 (emergency) — isso forçaria o usuário a
  // reiniciar a impressora fisicamente. Em vez disso:
  //   · cancel() do stream (se houver) — interrompe loop interno
  //   · destroy() do controller — remove listener de mensagens
  //   · disconnect() do transport — fecha o port USB / mock
  //   · zera TODOS os estados de UI (G-code, validação, posição,
  //     progresso, fluxo, firmware, autofix, etc.)
  //   · preserva o logger (audit trail da sessão fica acessível)
  //
  // Após o reset, o usuário pode clicar em "Conectar USB" de novo e
  // começar uma sessão limpa, sem race condition nem fila suja.
  const handleResetAll = useCallback(async () => {
    const ok = confirm(
      "🔄 Reiniciar Tudo\n\n" +
      "Isso vai:\n" +
      "  • Cancelar qualquer impressão em andamento\n" +
      "  • Desconectar a bioimpressora (sem M112 / sem restart físico)\n" +
      "  • Limpar o G-code carregado e a validação\n" +
      "  • Zerar posição, progresso e fluxo aplicado\n" +
      "  • Manter o log técnico (auditoria)\n\n" +
      "Use isso se o joystick travou, a conexão deu erro ou o G-code está com problema. " +
      "Depois, conecte de novo normalmente.\n\n" +
      "Confirmar reset?"
    )
    if (!ok) return

    loggerRef.current.info("══ RESET TOTAL solicitado pelo usuário (R12.29) ══", "controller")

    // 1) Cancela streaming (se houver) e destrói controller
    try {
      if (controllerRef.current) {
        try { controllerRef.current.cancel() } catch {}
        try { controllerRef.current.destroy() } catch {}
        controllerRef.current = null
      }
    } catch (e) {
      loggerRef.current.warn(`Reset · destruir controller: ${e instanceof Error ? e.message : String(e)}`)
    }

    // 2) Desconecta transport (port USB / mock)
    try {
      if (transportRef.current) {
        try { await transportRef.current.disconnect() } catch {}
        transportRef.current = null
      }
    } catch (e) {
      loggerRef.current.warn(`Reset · desconectar transport: ${e instanceof Error ? e.message : String(e)}`)
    }

    // 3) Cancela qualquer timer pendente de fluxo
    if (flowSendTimerRef.current) {
      clearTimeout(flowSendTimerRef.current)
      flowSendTimerRef.current = null
    }
    flowAppliedRef.current = null

    // 4) Estados de conexão
    setConnected(false)
    setFirmware(null)
    setControllerState("idle")
    setProgress(null)
    setDidAutoHome(false)

    // 5) Estados de G-code / validação / auto-fix
    setGcodeText("")
    setGcodeName("(sem nome)")
    setValidation(null)
    setShowAllIssues(false)
    setAutoFixResult(null)
    setGcodeTextBeforeFix(null)
    setShowAutoFixPanel(false)

    // 6) Joystick / posição / comando manual
    setPosition({ x: 0, y: 0, z: 0, e: 0 })
    setManualCmd("")

    // 7) Fluxo volta ao default seguro de 50% (hidrogel)
    setFlowPercent(50)

    loggerRef.current.ok(
      "Reset concluído. Sessão limpa: sem conexão, sem G-code, sem fila pendente. " +
      "Clique em \"Conectar USB\" (ou \"Iniciar Simulador\") para começar do zero.",
      "controller",
    )
  }, [])

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
    const ctrl = controllerRef.current
    const state = ctrl.getState()
    const cmd = `M221 S${clamped} ; fluxo ${clamped}% (R12.24)`
    try {
      // R12.39: durante streaming, usa inject (não conflita com waiter do runLoop).
      // Idle/ready/paused: usa sendAndWait para feedback imediato no log.
      if (state === "streaming" || state === "paused") {
        ctrl.inject(cmd, "flow")
        flowAppliedRef.current = clamped
        loggerRef.current.info(`Fluxo ${clamped}% (M221) injetado durante ${state}.`, "flow")
      } else {
        await ctrl.sendAndWait(cmd)
        flowAppliedRef.current = clamped
        loggerRef.current.ok(`Fluxo aplicado: ${clamped}% (M221 S${clamped}).`, "controller")
      }
    } catch (e) {
      loggerRef.current.warn(`M221 falhou: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [connected])

  /**
   * R12.39: Aplica feedrate override (M220) em tempo real.
   * Mesmo padrão de applyFlow: inject durante streaming, sendAndWait quando idle.
   */
  const applySpeed = useCallback(async (percent: number) => {
    if (!controllerRef.current || !connected) return
    const clamped = Math.max(25, Math.min(200, Math.round(percent)))
    if (speedAppliedRef.current === clamped) return // sem mudança real
    const ctrl = controllerRef.current
    const state = ctrl.getState()
    const cmd = `M220 S${clamped} ; velocidade ${clamped}% (R12.39)`
    try {
      if (state === "streaming" || state === "paused") {
        ctrl.inject(cmd, "speed")
        speedAppliedRef.current = clamped
        loggerRef.current.info(`Velocidade ${clamped}% (M220) injetada durante ${state}.`, "speed")
      } else {
        await ctrl.sendAndWait(cmd)
        speedAppliedRef.current = clamped
        loggerRef.current.ok(`Velocidade aplicada: ${clamped}% (M220 S${clamped}).`, "controller")
      }
    } catch (e) {
      loggerRef.current.warn(`M220 falhou: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [connected])

  // ─── SEND G-CODE ──
  /**
   * R12.47: handleSend agora é o "confirm" final do pré-flight.
   * Use handleRequestPrint para abrir o modal de pré-flight; só depois
   * que a usuária confirmar é que handleSend é chamado.
   */
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
    // R12.47: bloqueia se coerência tem issues "blocking"
    if (coherenceReport?.isBlocking) {
      loggerRef.current.error(
        `Bloqueado por incoerência modelo↔G-code: ${coherenceReport.issues.filter(i => i.level === "blocking").map(i => i.code).join(", ")}. Confira o painel de Pré-flight.`,
      )
      return
    }
    try {
      // R12.24: garante que o fluxo configurado (default 50% para hidrogéis)
      // está aplicado ANTES do streaming começar. Sem isso, Marlin usaria o
      // último M221 da sessão (pode ser 100% após reset).
      await applyFlow(flowPercent)
      // R12.39: idem para velocidade — M220 da UI deve refletir antes do stream.
      await applySpeed(speedPercent)
      await controllerRef.current.start(gcodeText)
    } catch (e) {
      loggerRef.current.error(`Stream falhou: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [connected, gcodeText, validation, handleValidate, applyFlow, flowPercent, applySpeed, speedPercent, coherenceReport])

  /**
   * R12.47: Abre o modal de Pré-flight. Tanto o botão IMPRIMIR do joystick
   * quanto o do painel principal chamam isso. O modal mostra um checklist
   * completo (conectado? home? G-code? validação? coerência?) e só permite
   * confirmar se TUDO estiver verde.
   */
  const handleRequestPrint = useCallback(() => {
    if (!gcodeText.trim()) {
      loggerRef.current.warn("Sem G-code carregado. Volte para a Etapa 3 (Fatiamento) ou carregue um G-code antes de imprimir.")
      return
    }
    if (!connected) {
      loggerRef.current.warn("Conecte a bioimpressora (painel Conexão) antes de imprimir.")
      return
    }
    // Valida se ainda não validou
    if (!validation) {
      handleValidate()
    }
    setShowPreflight(true)
  }, [gcodeText, connected, validation, handleValidate])

  // ─── PAUSE / RESUME / CANCEL / EMERGENCY ──
  const handlePause = useCallback(() => controllerRef.current?.pause(), [])
  const handleResume = useCallback(() => controllerRef.current?.resume(), [])
  const handleCancel = useCallback(() => controllerRef.current?.cancel(), [])
  const handleEmergency = useCallback(async () => {
    if (!controllerRef.current) return
    if (!confirm("⚠️ EMERGENCY STOP — M112\n\nIsso envia parada imediata para a impressora. Marlin trava o firmware e exige restart físico.\n\nConfirmar?")) return
    await controllerRef.current.emergency()
  }, [])

  // R12.38: `moveToSafeCenterAfterHome` foi movido para ANTES de
  // `handleConnect` (acima) para evitar TDZ em produção minificada.
  // Ver comentário detalhado na declaração original.

  // ─── JOYSTICK ──
  const [step, setStep] = useState<StepSize>(1)
  // R12.40: default 1mm (era 0.1mm) — passo mais intuitivo para "sentir" o
  // motor na primeira tentativa. Hidrogel típico precisa de 1-5mm de purga
  // antes de começar a impressão.
  const [extrudeStep, setExtrudeStep] = useState<number>(1)
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0, e: 0 })

  const sendJog = useCallback(async (axis: "X" | "Y" | "Z" | "E", delta: number) => {
    if (!controllerRef.current || !connected) {
      loggerRef.current.warn("Conecte para usar o joystick.")
      return
    }
    // R12.45: BLOQUEIA jog durante o handshake/auto-home/post-home.
    //
    // ANTES: o joystick funcionava IMEDIATAMENTE após o setConnected(true) —
    // mas como o auto-home (G28) ainda estava rodando em paralelo no thread
    // do handshake, cliques do usuário entravam no controller, ROUBAVAM o
    // waiter do G28 (sendAndWait usa um único pendingOkResolver), e quando
    // o 'ok' do home finalmente chegava ele resolvia o waiter ERRADO. O
    // G28 dava timeout (30s) e tudo travava (caso real do log da Bia em
    // 09:42:29 — clicou Z+ durante o G28 → impressora parou de responder).
    //
    // AGORA: rejeitamos o clique com aviso amigável. O usuário entende que
    // precisa esperar o '✓ Joystick LIBERADO' antes de mexer nos eixos.
    if (isHandshaking) {
      loggerRef.current.warn(
        `⏳ Aguarde — impressora ainda preparando (home + centro da mesa). Jog ${axis}${delta} ignorado.`,
        "joystick",
      )
      return
    }
    const feedrate = axis === "Z" ? 300 : axis === "E" ? 200 : 1500

    // R12.39: jog AGORA funciona durante streaming (tempo real) via fila
    // de injeção do controller. Comandos entram em `injectionQueue` e são
    // processados pelo runLoop ANTES da próxima linha do stream — latência
    // típica 50-300ms (uma linha) sem conflito de waiters.
    //
    // Quando idle/paused: usa sendAndWait diretamente (latência <100ms).
    // Quando streaming: usa inject (fire-and-forget, processado entre linhas).
    //
    // R12.27: BUGFIX — joystick não movia após o home.
    //   1) Tudo via sendAndWait — cada comando só sai depois do 'ok' do
    //      anterior, garantindo ordem determinística.
    //   2) Eixo E NÃO usa G91/G90: configuramos M83 no handshake, então o
    //      G1 E<delta> já é tratado como relativo permanentemente.
    //   3) XYZ: G91 → G1 (relativo) → G90, mantendo o invariante "impressora
    //      sempre volta para absoluto entre operações".
    const isStreamingOrPaused = controllerState === "streaming" || controllerState === "paused"
    const ctrl = controllerRef.current
    try {
      if (axis === "E") {
        // R12.46: FORÇA M83 ANTES de cada jog do E.
        //
        // Bug real reportado pela Bia: depois de imprimir o demo gyroid
        // (que termina com `M82 ; extrusão absoluta` e E≈8.4mm), a posição
        // do E no firmware ficava EM ABSOLUTO. Aí "Purga +1" mandava `G1 E1`
        // que em modo absoluto significa "vá PARA E=1" → retract de ~7.4mm
        // ao invés de extrudar +1mm. Cabo do hidrogel sugava ar.
        //
        // Solução: sempre mandar M83 antes do G1 do E. Custa 1 linha extra
        // mas garante que +bolus sempre EXTRUDA e -bolus sempre RETRAIA,
        // independente do que o G-code anterior fez.
        const cmd = `G1 E${delta} F${feedrate}`
        if (isStreamingOrPaused) {
          ctrl.inject("M83", "joystick")
          ctrl.inject(cmd, "joystick")
        } else {
          await ctrl.sendAndWait("M83 ; força extrusora relativa antes do jog (R12.46)")
          await ctrl.sendAndWait(cmd)
        }
      } else {
        if (isStreamingOrPaused) {
          // Durante streaming/paused: enfileira na ordem certa — fila é FIFO
          // e o runLoop drena tudo antes da próxima linha. Não há race.
          ctrl.inject("G91", "joystick")
          ctrl.inject(`G1 ${axis}${delta} F${feedrate}`, "joystick")
          ctrl.inject("G90", "joystick")
        } else {
          await ctrl.sendAndWait("G91")
          await ctrl.sendAndWait(`G1 ${axis}${delta} F${feedrate}`)
          await ctrl.sendAndWait("G90")
        }
      }
      // Atualiza UI da posição imediatamente (otimista — o comando chegará)
      setPosition((p) => ({ ...p, [axis.toLowerCase()]: +(p[axis.toLowerCase() as "x" | "y" | "z" | "e"] + delta).toFixed(3) }))
      if (isStreamingOrPaused) {
        loggerRef.current.info(`Jog ${axis}${delta >= 0 ? "+" : ""}${delta} injetado durante ${controllerState} (latência ~50-300ms).`, "joystick")
      }
    } catch (e) {
      loggerRef.current.error(`Jog ${axis}${delta} falhou: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [connected, controllerState, isHandshaking])

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

  // R12.39: handler do slider/preset de Velocidade (M220) com debounce.
  // Mesmo comportamento do handleFlowChange.
  const handleSpeedChange = useCallback((next: number) => {
    setSpeedPercent(next)
    if (speedSendTimerRef.current) clearTimeout(speedSendTimerRef.current)
    const delay = controllerState === "streaming" ? 120 : 250
    speedSendTimerRef.current = setTimeout(() => { void applySpeed(next) }, delay)
  }, [applySpeed, controllerState])

  // R12.24 + R12.39: Cleanup dos timers ao desmontar
  useEffect(() => {
    return () => {
      if (flowSendTimerRef.current) clearTimeout(flowSendTimerRef.current)
      if (speedSendTimerRef.current) clearTimeout(speedSendTimerRef.current)
    }
  }, [])

  // R12.22 + R12.33: Home All manual (espelha o auto-home, mas sob demanda).
  // Após o G28, opcionalmente move o cabeçote para o centro da mesa com
  // clearance Z (igual ao auto-home no connect). Use isso quando você
  // perdeu o registro de posição ou quando o joystick estiver travado nos
  // soft endstops dos cantos.
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
      // R12.40: re-aplica cold-extrusion liberada após Home All. Alguns
      // firmwares Marlin resetam M302 para o default quando reset/G28. Sem
      // isso, E+/E- volta a "não funcionar" depois do home. Ver bloco
      // equivalente em handleConnect para explicação completa.
      await controllerRef.current.sendAndWait("M302 S0 P1 ; libera extrusão a frio (R12.40)")
      setDidAutoHome(true)
      // Posição lógica pós-G28: cabeçote no canto (assumido 0,0,0)
      setPosition({ x: 0, y: 0, z: 0, e: 0 })
      loggerRef.current.ok(
        "Home All concluído (G28) + XYZ absoluto + E relativo + cold extrusion liberada.",
        "controller",
      )
      // R12.33: centraliza com clearance Z se a opção estiver ativa
      if (autoCenterAfterHome) {
        try {
          await moveToSafeCenterAfterHome()
        } catch (e) {
          loggerRef.current.warn(
            `Centralização pós-home falhou: ${e instanceof Error ? e.message : String(e)}. ` +
            `Você pode mover manualmente com o joystick.`,
          )
        }
      } else {
        loggerRef.current.info(
          "Para definir a origem (0,0,0), use \"Ponto inicial\" nos Comandos rápidos.",
          "controller",
        )
      }
    } catch (e) {
      loggerRef.current.error(`Home All falhou: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [connected, controllerState, autoCenterAfterHome, moveToSafeCenterAfterHome])

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

  // ─── R12.29: Helper de carga com validação + auto-fix automático ──
  //
  // Sempre que um G-code entra no app (upload, demo, paste, deep-link),
  // rodamos imediatamente:
  //   1) validateGcode → ValidationResult (errors + warnings + stats)
  //   2) Se houver issues corrigíveis → autoFixGcode aplica patches
  //   3) Re-validateGcode no texto corrigido → mostra verdict final
  //
  // Antes da R12.29, o usuário precisava clicar Validar e depois Auto-Fix
  // manualmente — e se esquecia, o "Enviar" bloqueava com "Valide
  // primeiro" / "Bloqueado: N erros". Agora isso é transparente: o
  // G-code chega já pronto para enviar (na maioria dos casos).
  const loadGcodeWithAutoFix = useCallback((text: string, name: string) => {
    setGcodeText(text)
    setGcodeName(name)
    setShowAllIssues(false)
    setAutoFixResult(null)
    setGcodeTextBeforeFix(null)

    const lineCount = text.split("\n").length
    loggerRef.current.info(`G-code carregado: ${name} (${lineCount} linhas)`, "validator")

    // 1) Validação inicial
    let result: ValidationResult
    try {
      result = validateGcode(text, DEFAULT_BIO_LIMITS, "marlin")
    } catch (e) {
      loggerRef.current.warn(`Validação automática falhou: ${e instanceof Error ? e.message : String(e)}`)
      setValidation(null)
      return
    }
    setValidation(result)

    const initialVerdict = verdictLabel(result.verdict)
    loggerRef.current.info(
      `Validação automática: ${initialVerdict.text} (${result.errorCount} erros, ${result.warningCount} avisos).`,
      "validator",
    )

    // 2) Se houver issues corrigíveis → aplica auto-fix
    let fixable = 0
    try {
      const summary = summarizeAutoFix(result)
      fixable = summary.totalFixable
    } catch {}

    if (fixable === 0) {
      if (result.verdict === "safe") {
        loggerRef.current.ok("G-code limpo — pronto para enviar à bioimpressora.", "validator")
      }
      return
    }

    try {
      const fixResult = autoFixGcode(text, result, autoFixOpts)
      if (fixResult.applied.length === 0) return

      // Aplica
      setGcodeTextBeforeFix(text)
      setGcodeText(fixResult.fixedGcode)
      setAutoFixResult(fixResult)
      loggerRef.current.ok(
        `Auto-fix automático aplicou ${fixResult.applied.length} correção(ões) em ${Object.keys(fixResult.countByCode).length} categoria(s). ` +
        `Use "Desfazer" no painel de validação para reverter.`,
        "validator",
      )

      // 3) Revalida com o texto corrigido
      const reval = validateGcode(fixResult.fixedGcode, DEFAULT_BIO_LIMITS, "marlin")
      setValidation(reval)
      const v = verdictLabel(reval.verdict)
      loggerRef.current.info(
        `Após auto-fix: ${v.text} (${reval.errorCount} erros, ${reval.warningCount} avisos).`,
        "validator",
      )
      if (reval.verdict === "safe") {
        loggerRef.current.ok("G-code aprovado após auto-fix — pronto para enviar.", "validator")
      } else if (reval.verdict === "blocked") {
        loggerRef.current.warn(
          `G-code ainda bloqueado após auto-fix (${reval.errorCount} erros não auto-corrigíveis). ` +
          `Veja o painel de validação para detalhes.`,
          "validator",
        )
      }
    } catch (e) {
      loggerRef.current.warn(`Auto-fix automático falhou: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [autoFixOpts])

  // ─── File upload ──
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const handleFile = useCallback(async (file: File) => {
    const text = await file.text()
    loadGcodeWithAutoFix(text, file.name)
  }, [loadGcodeWithAutoFix])

  // ─── Load demo ──
  // R12.29: usa loadGcodeWithAutoFix → valida + auto-corrige automaticamente.
  const loadDemo = useCallback(() => {
    loadGcodeWithAutoFix(DEMO_GCODE, "comece-agora-hello-square.gcode")
    // Scroll suave para o painel visual após render
    setTimeout(() => {
      try {
        const el = document.getElementById("toolpath-visual-panel")
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
      } catch {}
    }, 80)
  }, [loadGcodeWithAutoFix])

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
                      // R12.29: paste também passa pelo auto-fix automático.
                      loadGcodeWithAutoFix(txt, "(colado da área de transferência)")
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
                  onClick={handleRequestPrint}
                  disabled={!canSend || validation?.verdict === "blocked" || coherenceReport?.isBlocking}
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                  title="Abre o pré-flight antes do envio (checklist completo)"
                >
                  <Send className="w-4 h-4" />
                  Enviar para Bioimpressora
                  {coherenceReport && coherenceReport.issues.length > 0 && (
                    <span className="text-[9px] font-normal bg-amber-500/30 border border-amber-300/40 px-1.5 py-0.5 rounded-full">
                      {coherenceReport.issues.length}
                    </span>
                  )}
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
                      Faz <span className="font-mono">G28</span> (home mecânico)
                      ao conectar. Para definir o ponto atual como origem (0,0,0),
                      clique em <span className="font-mono">Ponto inicial</span> nos
                      Comandos rápidos quando quiser.
                    </div>
                  </div>
                </label>
                {/* R12.33: Toggle centralização pós-home — vai para (100,100) com Z+30mm */}
                <label className={cn(
                  "flex items-start gap-2 mb-2 p-2 rounded-lg cursor-pointer transition-colors",
                  autoHomeOnConnect
                    ? "bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10"
                    : "bg-gray-500/5 border border-gray-500/20 opacity-50 cursor-not-allowed"
                )}>
                  <input
                    type="checkbox"
                    checked={autoCenterAfterHome}
                    disabled={!autoHomeOnConnect}
                    onChange={(e) => setAutoCenterAfterHome(e.target.checked)}
                    className="mt-0.5 accent-emerald-400"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-emerald-100 flex items-center gap-1">
                      <Crosshair className="w-3 h-3" /> Centralizar + aproximar mesa
                    </div>
                    <div className="text-[9px] text-emerald-200/70 leading-tight mt-0.5">
                      Após o <span className="font-mono">G28</span>: sobe
                      Z <span className="font-mono">+{POST_HOME_Z_CLEARANCE_MM}mm</span>,
                      vai para o centro (<span className="font-mono">{BIOENDER_BED_X_MM / 2},{BIOENDER_BED_Y_MM / 2}</span>)
                      e <span className="text-emerald-300 font-semibold">desce {POST_HOME_Z_APPROACH_DROP_MM}mm</span>
                      {" "}até Z=<span className="font-mono">{POST_HOME_Z_CLEARANCE_MM - POST_HOME_Z_APPROACH_DROP_MM}mm</span> —
                      pronto para iniciar a bioimpressão (R12.40).
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

            {/* R12.29: Botão "Reiniciar Tudo" — fail-safe sempre visível.
                Limpa estado, cancela stream, desconecta transport, zera
                G-code/validação/posição. Usado quando o joystick trava,
                a conexão dá erro ou o G-code está com problema. */}
            <div className="mt-3 pt-3 border-t border-white/10">
              <button
                onClick={handleResetAll}
                className="w-full px-3 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500/25 to-orange-500/25 hover:from-amber-500/40 hover:to-orange-500/40 border border-amber-500/50 text-amber-100 transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-900/30"
                title="Limpa toda a sessão: cancela stream, desconecta, zera G-code/validação/posição. Use se o joystick travou, a conexão deu erro ou o G-code está com problema."
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reiniciar Tudo
              </button>
              <div className="text-[9px] text-amber-200/60 leading-tight mt-1 px-0.5">
                Começa do zero — limpa G-code, fila e conexão.
                Use se travou ou está com erro.
              </div>
            </div>
          </Panel>

          {/* ── Joystick lateral ─────────────────────────────────── */}
          <Panel
            title="Joystick (jog manual)"
            icon={<Gamepad2 className="w-4 h-4" />}
            badge={isHandshaking ? "🔒 preparando…" : `${step} mm`}
            badgeColor={isHandshaking ? "amber" : "cyan"}
          >
            {/* R12.45: aviso visual quando bloqueado pelo handshake */}
            {isHandshaking && (
              <div className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/[0.08] p-2.5 flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10.5px] font-semibold text-amber-200 leading-snug">
                    Preparando a impressora — joystick BLOQUEADO
                  </div>
                  <div className="text-[9.5px] text-amber-100/80 leading-snug mt-0.5">
                    Aguarde o G28 (home) + ir-para-centro terminarem. Em ~10–15 s o
                    sistema desbloqueia automaticamente.
                  </div>
                </div>
              </div>
            )}
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
                {/* R12.39: jog AGORA funciona em qualquer estado (idle/streaming/paused)
                    via fila de injeção do controller. Removido `|| isStreaming`. */}
                <JogBtn onClick={() => sendJog("Y", +step)} disabled={!connected}>Y+</JogBtn>
                <div />
                <JogBtn onClick={() => sendJog("X", -step)} disabled={!connected}>X−</JogBtn>
                <JogBtn onClick={sendZero} disabled={!connected} variant="zero" title="G92 zero aqui — não move, só zera coordenadas">⌂</JogBtn>
                <JogBtn onClick={() => sendJog("X", +step)} disabled={!connected}>X+</JogBtn>
                <div />
                <JogBtn onClick={() => sendJog("Y", -step)} disabled={!connected}>Y−</JogBtn>
                <div />
              </div>
            </div>

            {/* Z */}
            <div className="mb-2">
              <div className="text-[9px] uppercase tracking-wider text-gray-500 mb-1">Z (cuidado · sem home)</div>
              <div className="grid grid-cols-2 gap-1">
                {/* R12.39: Z+/Z- em tempo real durante streaming via inject */}
                <JogBtn onClick={() => sendJog("Z", +step)} disabled={!connected}>Z+</JogBtn>
                <JogBtn onClick={() => sendJog("Z", -step)} disabled={!connected} variant="warn">Z−</JogBtn>
              </div>
            </div>

            {/* R12.46: MICRO-AJUSTE Z em tempo real durante a impressão.
                Botões dedicados de Z± 0.05/0.10/0.20 mm que NÃO alteram o
                passo do joystick (extrudeStep e step continuam intactos).
                Útil para descer um pouquinho o bico durante a impressão
                quando a primeira camada está alta demais (gap) ou subir
                quando está esmagando o filamento. Usa inject() durante
                streaming → latência ~50-300ms. */}
            <div className="mb-2 rounded-lg border border-cyan-500/30 bg-cyan-500/[0.05] p-1.5">
              <div className="text-[9px] uppercase tracking-wider text-cyan-300 mb-1 flex items-center justify-between">
                <span>Micro-ajuste Z (tempo real)</span>
                <span className="text-[8px] normal-case tracking-normal text-gray-500">durante impressão</span>
              </div>
              <div className="grid grid-cols-6 gap-0.5">
                {[0.05, 0.1, 0.2].map((d) => (
                  <button
                    key={`zfine-down-${d}`}
                    onClick={() => sendJog("Z", -d)}
                    disabled={!connected}
                    title={`Desce ${d} mm (mais perto da mesa) — bom se está saindo gap entre filamentos`}
                    className="px-1 py-1 rounded text-[9px] font-mono bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Z−{d}
                  </button>
                ))}
                {[0.05, 0.1, 0.2].map((d) => (
                  <button
                    key={`zfine-up-${d}`}
                    onClick={() => sendJog("Z", +d)}
                    disabled={!connected}
                    title={`Sobe ${d} mm (mais longe da mesa) — bom se está esmagando o filamento`}
                    className="px-1 py-1 rounded text-[9px] font-mono bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Z+{d}
                  </button>
                ))}
              </div>
            </div>

            {/* Extrusora — R12.40: UX intuitiva para bioimpressão */}
            <div className="mb-2">
              <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-gray-500 mb-1">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Droplet className="w-2.5 h-2.5" />
                  Extrusora E
                </span>
                <span className="text-[8px] normal-case tracking-normal text-gray-500">
                  passo: <span className="text-emerald-300 font-bold tabular-nums">{extrudeStep} mm</span>
                </span>
              </div>

              {/* R12.40: presets visuais do passo — clique muda extrudeStep.
                  Substituem o select antigo (menos cliques, mais visível). */}
              <div className="grid grid-cols-7 gap-0.5 mb-1.5">
                {EXTRUDE_STEPS.map((s) => {
                  const active = extrudeStep === s
                  return (
                    <button
                      key={s}
                      onClick={() => {
                        setExtrudeStep(s)
                        loggerRef.current?.info(`Passo do extrusor: ${s} mm`, "controller")
                      }}
                      aria-pressed={active}
                      className={cn(
                        "px-0.5 py-1 rounded text-[9px] font-mono transition-all",
                        active
                          ? "bg-emerald-500 text-black font-bold border-2 border-emerald-300 ring-1 ring-emerald-400/60 shadow-[0_0_6px_rgba(16,185,129,0.5)] scale-105"
                          : "bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/30"
                      )}
                      title={`${s} mm por clique`}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>

              {/* E+/E- com ícones e tamanho maior para fácil clique */}
              <div className="grid grid-cols-2 gap-1 mb-1.5">
                {/* R12.40: E+/E- funciona ANTES, DURANTE e DEPOIS da
                    bioimpressão (R12.39 inject + R12.40 M302 cold extrusion).
                    Pré-requisitos garantidos no handshake e no Home All:
                      • M83 — extrusora em modo relativo
                      • M302 S0 P1 — libera extrusão a frio (sem hotend)
                */}
                <JogBtn
                  onClick={() => sendJog("E", +extrudeStep)}
                  disabled={!connected}
                  title={`Extrude +${extrudeStep} mm (avança a seringa — empurra hidrogel para fora)`}
                >
                  <span className="flex items-center justify-center gap-1">
                    <span className="text-emerald-200">▼</span>
                    <span>E+ {extrudeStep}</span>
                  </span>
                </JogBtn>
                <JogBtn
                  onClick={() => sendJog("E", -extrudeStep)}
                  disabled={!connected}
                  variant="warn"
                  title={`Retract −${extrudeStep} mm (recua a seringa — pode formar bolha se exagerar)`}
                >
                  <span className="flex items-center justify-center gap-1">
                    <span className="text-amber-200">▲</span>
                    <span>E− {extrudeStep}</span>
                  </span>
                </JogBtn>
              </div>

              {/* R12.40: PURGA RÁPIDA — botões de bolus comuns para
                  preparar a seringa antes da bioimpressão (purgar ar,
                  preencher cânula, fazer teste de fluxo). Usam inject()
                  durante streaming via sendJog. */}
              <div className="flex items-center gap-0.5">
                <span className="text-[8px] uppercase tracking-wider text-gray-500 mr-1">Purga:</span>
                {[1, 2, 5, 10].map((bolus) => (
                  <button
                    key={`purge-${bolus}`}
                    onClick={() => sendJog("E", +bolus)}
                    disabled={!connected}
                    title={`Purga rápida +${bolus} mm (não muda o passo do joystick)`}
                    className="flex-1 px-1 py-1 rounded text-[9px] font-mono bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    +{bolus}
                  </button>
                ))}
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

            {/* ── R12.47: BOTÃO IMPRIMIR dentro do joystick ─────────────
                A Bia pediu explicitamente: precisa poder iniciar a impressão
                SEM sair do painel do joystick. Antes, o botão "Enviar"
                ficava só no painel principal, longe dos comandos manuais.
                Agora o IMPRIMIR fica aqui, com pré-flight check completo
                (conectado? home? G-code? validação? coerência?).
            */}
            <div className="mt-3 pt-3 border-t border-emerald-500/30">
              {(() => {
                // Razões para bloquear o botão (cada uma resulta em uma frase explicativa)
                const blockReasons: string[] = []
                if (!connected) blockReasons.push("conecte a impressora")
                if (!gcodeText.trim()) blockReasons.push("carregue um G-code")
                if (validation?.verdict === "blocked") blockReasons.push(`corrija ${validation.errorCount} erro(s) do G-code`)
                if (coherenceReport?.isBlocking) blockReasons.push("resolva incoerências modelo↔G-code")
                if (controllerState === "streaming") blockReasons.push("impressão já em andamento")
                if (isHandshaking) blockReasons.push("aguarde o handshake terminar")
                const blocked = blockReasons.length > 0

                return (
                  <>
                    <button
                      onClick={handleRequestPrint}
                      disabled={blocked}
                      className={cn(
                        "w-full px-3 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg",
                        blocked
                          ? "bg-gray-700/40 border border-gray-600/40 text-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white border border-emerald-300/40 shadow-emerald-900/40 hover:shadow-emerald-900/60"
                      )}
                      title={blocked ? `Bloqueado: ${blockReasons.join("; ")}` : "Abre o pré-flight e inicia a impressão"}
                    >
                      <Printer className="w-4 h-4" />
                      IMPRIMIR
                      {!blocked && coherenceReport && coherenceReport.issues.length > 0 && (
                        <span className="text-[9px] font-normal bg-amber-500/30 border border-amber-300/40 px-1.5 py-0.5 rounded-full">
                          {coherenceReport.issues.length} alerta{coherenceReport.issues.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </button>
                    {blocked ? (
                      <div className="mt-1.5 text-[9.5px] text-amber-200/80 leading-snug px-0.5">
                        <span className="font-semibold text-amber-300">Bloqueado:</span>{" "}
                        {blockReasons.join("; ")}.
                      </div>
                    ) : (
                      <div className="mt-1.5 text-[9.5px] text-emerald-200/70 leading-snug px-0.5 flex items-center gap-1">
                        <ListChecks className="w-2.5 h-2.5" />
                        Abre checklist de pré-flight antes do envio.
                      </div>
                    )}
                  </>
                )
              })()}
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

          {/* ── R12.39: Velocidade de impressão (M220 em tempo real) ───── */}
          <Panel
            title="Velocidade de impressão"
            icon={<Zap className="w-4 h-4" />}
            badge={`${speedPercent}%`}
            badgeColor={
              speedPercent < 50 ? "amber" :
              speedPercent <= 100 ? "emerald" :
              speedPercent <= 150 ? "cyan" : "violet"
            }
          >
            <div className="space-y-2">
              {/* Display grande + status */}
              <div className="flex items-end justify-between">
                <div className="flex items-baseline gap-1">
                  <span className={cn(
                    "text-2xl font-bold tabular-nums",
                    speedPercent < 50 ? "text-amber-300" :
                    speedPercent <= 100 ? "text-emerald-200" :
                    speedPercent <= 150 ? "text-cyan-200" : "text-violet-200"
                  )}>
                    {speedPercent}
                  </span>
                  <span className="text-sm text-gray-400">%</span>
                </div>
                <div className="text-right text-[9px] leading-tight">
                  {!connected ? (
                    <span className="text-gray-500">Conecte para aplicar</span>
                  ) : speedAppliedRef.current === speedPercent ? (
                    <span className="text-emerald-400 flex items-center gap-0.5 justify-end">
                      <CheckCircle2 className="w-2.5 h-2.5" /> M220 ativo
                    </span>
                  ) : (
                    <span className="text-amber-300 animate-pulse">
                      ajustando…
                    </span>
                  )}
                  <div className="text-gray-500 mt-0.5">multiplica F em runtime (XYZ+E)</div>
                </div>
              </div>

              {/* Slider 25–200% */}
              <div>
                <input
                  type="range"
                  min={25}
                  max={200}
                  step={1}
                  value={speedPercent}
                  onChange={(e) => handleSpeedChange(parseInt(e.target.value, 10))}
                  disabled={!connected}
                  className="w-full accent-emerald-400 disabled:opacity-40"
                  style={{
                    background: `linear-gradient(to right,
                      rgba(251,191,36,0.3) 0%,
                      rgba(251,191,36,0.3) 14%,
                      rgba(16,185,129,0.4) 14%,
                      rgba(16,185,129,0.4) 43%,
                      rgba(34,211,238,0.4) 43%,
                      rgba(34,211,238,0.4) 72%,
                      rgba(139,92,246,0.3) 72%,
                      rgba(139,92,246,0.3) 100%)`
                  }}
                />
                <div className="flex justify-between text-[8px] text-gray-500 mt-0.5 font-mono">
                  <span>25%</span>
                  <span className="text-amber-400/70">50</span>
                  <span className="text-emerald-400/70">100</span>
                  <span className="text-cyan-400/70">150</span>
                  <span>200%</span>
                </div>
              </div>

              {/* Presets */}
              <div className="grid grid-cols-4 gap-1">
                <button
                  onClick={() => handleSpeedChange(50)}
                  disabled={!connected}
                  title="Modo lento — para hidrogéis viscosos, primeiras camadas críticas ou afinação fina de fluxo"
                  className={cn(
                    "px-1 py-1 rounded text-[9px] font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                    speedPercent === 50
                      ? "bg-amber-500/30 border-amber-400/60 text-amber-100"
                      : "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-200"
                  )}
                >
                  <div>50%</div>
                  <div className="text-[7px] font-normal opacity-70 leading-tight">Lento</div>
                </button>
                <button
                  onClick={() => handleSpeedChange(100)}
                  disabled={!connected}
                  title="Velocidade nominal — usa exatamente os feedrates calculados pelo slicer"
                  className={cn(
                    "px-1 py-1 rounded text-[9px] font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                    speedPercent === 100
                      ? "bg-emerald-500/30 border-emerald-400/60 text-emerald-100"
                      : "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-200"
                  )}
                >
                  <div>100%</div>
                  <div className="text-[7px] font-normal opacity-70 leading-tight">Nominal</div>
                </button>
                <button
                  onClick={() => handleSpeedChange(150)}
                  disabled={!connected}
                  title="Rápido — para movimentos de deslocamento (travel) ou geometrias simples"
                  className={cn(
                    "px-1 py-1 rounded text-[9px] font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                    speedPercent === 150
                      ? "bg-cyan-500/30 border-cyan-400/60 text-cyan-100"
                      : "bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-200"
                  )}
                >
                  <div>150%</div>
                  <div className="text-[7px] font-normal opacity-70 leading-tight">Rápido</div>
                </button>
                <button
                  onClick={() => handleSpeedChange(200)}
                  disabled={!connected}
                  title="Máximo — apenas para teste de limites mecânicos / dry-run sem extrusão"
                  className={cn(
                    "px-1 py-1 rounded text-[9px] font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                    speedPercent === 200
                      ? "bg-violet-500/30 border-violet-400/60 text-violet-100"
                      : "bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/30 text-violet-200"
                  )}
                >
                  <div>200%</div>
                  <div className="text-[7px] font-normal opacity-70 leading-tight">Máximo</div>
                </button>
              </div>

              {/* Ajuste fino ±1% / ±5% */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleSpeedChange(Math.max(25, speedPercent - 5))}
                  disabled={!connected || speedPercent <= 25}
                  className="flex-1 px-1 py-1 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 disabled:opacity-30"
                  title="−5%"
                >
                  −5
                </button>
                <button
                  onClick={() => handleSpeedChange(Math.max(25, speedPercent - 1))}
                  disabled={!connected || speedPercent <= 25}
                  className="flex-1 px-1 py-1 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 disabled:opacity-30"
                  title="−1%"
                >
                  −1
                </button>
                <button
                  onClick={() => handleSpeedChange(Math.min(200, speedPercent + 1))}
                  disabled={!connected || speedPercent >= 200}
                  className="flex-1 px-1 py-1 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 disabled:opacity-30"
                  title="+1%"
                >
                  +1
                </button>
                <button
                  onClick={() => handleSpeedChange(Math.min(200, speedPercent + 5))}
                  disabled={!connected || speedPercent >= 200}
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
                  : "bg-emerald-500/5 border-emerald-500/20 text-emerald-200/80"
              )}>
                <Info className="w-2.5 h-2.5 inline mr-1 -mt-0.5" />
                {isStreaming
                  ? "Imprimindo — reduza se ver bordas mal extrudadas; aumente em deslocamentos longos. Afeta TODOS os feedrates (XYZ+E) e também o joystick."
                  : "Override global de feedrate (M220). Afeta XYZ+E e todo joystick. Ajustável em tempo real durante a impressão."}
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

      {/* ═══════════════════════════════════════════════════════════════
          R12.47: MODAL DE PRÉ-FLIGHT
          ───────────────────────────────────────────────────────────────
          Aparece quando a usuária clica em IMPRIMIR (no joystick ou no
          painel principal). Mostra checklist completo:
            - impressora conectada?
            - home feito?
            - G-code carregado e válido?
            - coerência modelo↔G-code?
            - parâmetros principais coerentes (printer, material, infill)
          Só permite "Confirmar" se TUDO estiver verde (ou apenas com
          alertas que a usuária aceita conscientemente).
          ═══════════════════════════════════════════════════════════════ */}
      {showPreflight && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowPreflight(false)}
        >
          <div
            className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-900/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <Printer className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <div className="text-base font-bold text-white">Pré-flight — Impressão</div>
                  <div className="text-[10px] text-gray-400">Checklist de segurança antes do envio</div>
                </div>
              </div>
              <button
                onClick={() => setShowPreflight(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3">
              {/* Checklist técnico */}
              <div className="rounded-xl border border-white/10 bg-black/30 p-3.5 space-y-2">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Status técnico</div>
                <PreflightItem
                  ok={connected}
                  label="Bioimpressora conectada"
                  detail={connected ? `Firmware: ${firmware?.family ?? "detectado"}` : "Use o painel Conexão para conectar"}
                />
                <PreflightItem
                  ok={didAutoHome}
                  label="Home (G28) realizado"
                  detail={didAutoHome ? "Eixos referenciados" : "Clique em Home All antes de imprimir"}
                  warnOnly
                />
                <PreflightItem
                  ok={gcodeText.trim().length > 0}
                  label="G-code carregado"
                  detail={gcodeText.trim() ? `${gcodeText.split("\n").length} linhas (${gcodeName})` : "Nenhum G-code carregado"}
                />
                <PreflightItem
                  ok={validation != null && validation.verdict !== "blocked"}
                  label="Validação do G-code"
                  detail={
                    !validation ? "Validação não executada" :
                    validation.verdict === "blocked" ? `${validation.errorCount} erro(s) bloqueante(s)` :
                    `${verdictLabel(validation.verdict)} — ${validation.warningCount} aviso(s)`
                  }
                />
              </div>

              {/* Coerência modelo↔gcode */}
              {coherenceReport && (
                <div className={cn(
                  "rounded-xl border p-3.5",
                  coherenceReport.isBlocking
                    ? "border-red-500/40 bg-red-500/[0.06]"
                    : coherenceReport.issues.length > 0
                      ? "border-amber-500/40 bg-amber-500/[0.06]"
                      : "border-emerald-500/40 bg-emerald-500/[0.06]"
                )}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <ListChecks className={cn(
                      "w-4 h-4",
                      coherenceReport.isBlocking ? "text-red-400" :
                      coherenceReport.issues.length > 0 ? "text-amber-400" : "text-emerald-400"
                    )} />
                    <span className="text-[11px] font-bold uppercase tracking-wide">
                      <span className={cn(
                        coherenceReport.isBlocking ? "text-red-300" :
                        coherenceReport.issues.length > 0 ? "text-amber-300" : "text-emerald-300"
                      )}>
                        Coerência modelo ↔ G-code
                      </span>
                    </span>
                  </div>

                  {/* Resumo do que foi escolhido vs encontrado */}
                  <div className="grid grid-cols-2 gap-3 mb-3 text-[10px]">
                    <div>
                      <div className="text-gray-500 uppercase tracking-wide mb-1">Você escolheu</div>
                      <ul className="space-y-0.5 text-gray-300">
                        <li>Modelo: <span className="text-cyan-300 font-mono">{coherenceReport.expected.modelGeometryId ?? "—"}</span></li>
                        <li>Material: <span className="text-cyan-300 font-mono">{coherenceReport.expected.materialName ?? "—"}</span></li>
                        <li>Padrão: <span className="text-cyan-300 font-mono">{coherenceReport.expected.pattern ?? "—"}</span></li>
                        <li>Altura: <span className="text-cyan-300 font-mono">{coherenceReport.expected.layerHeight ?? "—"} mm</span></li>
                      </ul>
                    </div>
                    <div>
                      <div className="text-gray-500 uppercase tracking-wide mb-1">G-code detectado</div>
                      <ul className="space-y-0.5 text-gray-300">
                        <li>Job: <span className="text-violet-300 font-mono">{coherenceReport.detected.jobName ?? "—"}</span></li>
                        <li>Geom: <span className="text-violet-300 font-mono">{coherenceReport.detected.geometryHints.join(", ") || "—"}</span></li>
                        <li>Mat: <span className="text-violet-300 font-mono">{coherenceReport.detected.materialHints.join(", ") || "—"}</span></li>
                        <li>Infill: <span className="text-violet-300 font-mono">{coherenceReport.detected.infillHints.join(", ") || "—"}</span></li>
                      </ul>
                    </div>
                  </div>

                  {/* Issues */}
                  {coherenceReport.issues.length === 0 ? (
                    <div className="text-[11px] text-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Modelo, biotinta e padrão batem com o G-code.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {coherenceReport.issues.map((issue, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "rounded-lg border p-2.5",
                            issue.level === "blocking" ? "border-red-500/40 bg-red-500/[0.08]" :
                            issue.level === "warning" ? "border-amber-500/40 bg-amber-500/[0.08]" :
                            "border-cyan-500/30 bg-cyan-500/[0.05]"
                          )}
                        >
                          <div className="flex items-start gap-2 mb-1">
                            {issue.level === "blocking" ? <ShieldAlert className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" /> :
                             issue.level === "warning" ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" /> :
                             <Info className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <div className={cn(
                                "text-[10px] font-bold uppercase tracking-wider mb-0.5",
                                issue.level === "blocking" ? "text-red-300" :
                                issue.level === "warning" ? "text-amber-300" : "text-cyan-300"
                              )}>
                                {issue.level === "blocking" ? "BLOQUEIA" : issue.level === "warning" ? "ALERTA" : "INFO"} — {issue.code}
                              </div>
                              <div className="text-[11px] text-gray-200 leading-snug">{issue.message}</div>
                            </div>
                          </div>
                          <div className="ml-5.5 mt-1.5 text-[10px] text-gray-400 leading-snug border-t border-white/5 pt-1.5">
                            <span className="font-semibold text-emerald-300">Como corrigir:</span> {issue.fixHint}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Parâmetros em tempo de run */}
              <div className="rounded-xl border border-white/10 bg-black/30 p-3.5">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Parâmetros que serão aplicados ANTES do stream</div>
                <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                  <div className="flex items-center gap-1.5">
                    <Droplet className="w-3 h-3 text-cyan-400" />
                    <span className="text-gray-400">Fluxo (M221):</span>
                    <span className="text-cyan-200 font-mono">{flowPercent}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-violet-400" />
                    <span className="text-gray-400">Velocidade (M220):</span>
                    <span className="text-violet-200 font-mono">{speedPercent}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer com ações */}
            <div className="px-5 py-3.5 border-t border-white/10 flex items-center justify-between gap-3 bg-slate-900/80 sticky bottom-0">
              <button
                onClick={() => setShowPreflight(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-300 hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              {(() => {
                const isBlocked =
                  !connected ||
                  !gcodeText.trim() ||
                  validation?.verdict === "blocked" ||
                  coherenceReport?.isBlocking ||
                  controllerState === "streaming"

                const handleConfirm = async () => {
                  setShowPreflight(false)
                  await handleSend()
                }
                return (
                  <button
                    onClick={handleConfirm}
                    disabled={isBlocked}
                    className={cn(
                      "px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                      isBlocked
                        ? "bg-gray-700/40 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-lg shadow-emerald-900/40"
                    )}
                  >
                    <Send className="w-4 h-4" />
                    Confirmar e Imprimir
                  </button>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Item do checklist do pré-flight (R12.47).
 * - ok=true → bullet verde
 * - ok=false + warnOnly=true → bullet amarelo (aviso, não bloqueia)
 * - ok=false + warnOnly=false → bullet vermelho (bloqueia)
 */
function PreflightItem({
  ok, label, detail, warnOnly = false,
}: {
  ok: boolean
  label: string
  detail?: string
  warnOnly?: boolean
}) {
  const color = ok ? "emerald" : (warnOnly ? "amber" : "red")
  const Icon = ok ? CheckCircle2 : (warnOnly ? AlertTriangle : ShieldAlert)
  return (
    <div className="flex items-start gap-2 text-[11.5px]">
      <Icon className={cn(
        "w-3.5 h-3.5 mt-0.5 shrink-0",
        color === "emerald" ? "text-emerald-400" :
        color === "amber" ? "text-amber-400" : "text-red-400"
      )} />
      <div className="flex-1 min-w-0">
        <div className={cn(
          "font-semibold",
          color === "emerald" ? "text-emerald-200" :
          color === "amber" ? "text-amber-200" : "text-red-200"
        )}>
          {label}
        </div>
        {detail && (
          <div className="text-[10px] text-gray-400 leading-snug mt-0.5">{detail}</div>
        )}
      </div>
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
