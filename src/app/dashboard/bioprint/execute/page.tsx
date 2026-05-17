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
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

// Módulos novos R12.15
import { PrintLogger, formatEntryText, type LogEntry, type LogSeverity } from "@/lib/bioprint/print-logger"
import { validateGcode, verdictLabel, DEFAULT_BIO_LIMITS, type ValidationResult } from "@/lib/bioprint/gcode-validator"
import { PrinterMock } from "@/lib/bioprint/printer-mock"
import {
  PrinterConnection as RealPrinterConnection,
  handshakeM115,
  type PrinterTransport,
  type FirmwareInfo,
} from "@/lib/bioprint/printer-connection"
import { PrinterController, type ControllerState, type StreamProgress } from "@/lib/bioprint/printer-controller"

// Reutiliza preview 3D existente
import { GcodeViewer3D, type ColorMode } from "@/components/bioprinter/GcodeViewer3D"
import { parseGcode, type ParsedGcode } from "@/lib/bioprint/toolpath-engine"

// ─── Constantes ──────────────────────────────────────────────────────────

const BAUD_OPTIONS = [9600, 19200, 38400, 57600, 115200, 230400, 250000]
const DEFAULT_BAUD = 115200

// G-code de demo (hello world quadrado pequeno)
const DEMO_GCODE = `; ═════════════════════════════════════════════════
; BIA · G-code de demo — Hello Square 20×20 mm
; Use este para validar conexão e preview antes de
; enviar G-code real para a bioimpressora.
; ═════════════════════════════════════════════════
G21 ; mm
G90 ; absoluto
M82 ; extrusão absoluta
G92 X0 Y0 Z0 E0 ; zero relativo (NÃO faz home)

; Sobe segurança
G1 Z2 F300

; Primeiro layer
G1 Z0.2 F300
G1 X10 Y10 F1500
G1 X30 Y10 E0.5 F800
G1 X30 Y30 E1.0 F800
G1 X10 Y30 E1.5 F800
G1 X10 Y10 E2.0 F800

; Segundo layer
G1 Z0.4 F300
G1 X10 Y10 E2.5 F800
G1 X30 Y10 E3.0 F800
G1 X30 Y30 E3.5 F800
G1 X10 Y30 E4.0 F800
G1 X10 Y10 E4.5 F800

; Volta para segurança
G1 Z10 F300
M104 S0 ; bico off
M140 S0 ; cama off
M84     ; motores off
`

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

  // ─── Transport + Controller ──
  const [mode, setMode] = useState<"mock" | "real">("mock")
  const [baud, setBaud] = useState(DEFAULT_BAUD)
  const [connected, setConnected] = useState(false)
  const [firmware, setFirmware] = useState<FirmwareInfo | null>(null)
  const [supported, setSupported] = useState(false)

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
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      loggerRef.current.error(`Falha ao conectar: ${msg}`)
      transportRef.current = null
      controllerRef.current = null
      setConnected(false)
    }
  }, [connected, mode, supported, baud])

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
      await controllerRef.current.start(gcodeText)
    } catch (e) {
      loggerRef.current.error(`Stream falhou: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [connected, gcodeText, validation, handleValidate])

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
    const sign = delta >= 0 ? "" : ""
    try {
      await controllerRef.current.sendOnce("G91")
      await controllerRef.current.sendOnce(`G1 ${axis}${sign}${delta} F${feedrate}`)
      await controllerRef.current.sendOnce("G90")
      setPosition((p) => ({ ...p, [axis.toLowerCase()]: +(p[axis.toLowerCase() as "x" | "y" | "z" | "e"] + delta).toFixed(3) }))
    } catch (e) {
      loggerRef.current.error(`Jog ${axis}${delta} falhou: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [connected, controllerState])

  const sendZero = useCallback(async () => {
    if (!controllerRef.current || !connected) return
    try {
      await controllerRef.current.sendOnce("G92 X0 Y0 Z0 E0")
      setPosition({ x: 0, y: 0, z: 0, e: 0 })
      loggerRef.current.ok("G92 ZERO AQUI — coordenadas zeradas no ponto atual (sem mover).")
    } catch (e) {
      loggerRef.current.error(`G92 falhou: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [connected])

  // ─── Manual command ──
  const [manualCmd, setManualCmd] = useState("")
  const handleManualSend = useCallback(async () => {
    if (!controllerRef.current || !manualCmd.trim()) return
    try {
      await controllerRef.current.sendOnce(manualCmd)
      setManualCmd("")
    } catch (e) {
      loggerRef.current.error(`Comando manual falhou: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [manualCmd])

  // ─── Quick actions ──
  const quickActions: Array<{ label: string; cmd: string; title: string }> = [
    { label: "M114",     cmd: "M114",     title: "Posição atual" },
    { label: "M105",     cmd: "M105",     title: "Temperaturas" },
    { label: "M115",     cmd: "M115",     title: "Firmware info" },
    { label: "M18 Off",  cmd: "M18",      title: "Motores off" },
    { label: "M84 Off",  cmd: "M84",      title: "Disable steppers" },
    { label: "Cool All", cmd: "M104 S0\nM140 S0\nM141 S0", title: "Desliga todos os aquecedores" },
  ]

  const runQuickAction = useCallback(async (cmds: string) => {
    if (!controllerRef.current || !connected) return
    for (const c of cmds.split("\n")) {
      try { await controllerRef.current.sendOnce(c) } catch {}
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
    setGcodeName("demo-hello-square.gcode")
    setValidation(null)
    loggerRef.current.info("G-code de demo carregado.")
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
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-200 transition-colors flex items-center gap-1.5"
                title="Carrega um G-code Hello Square 20×20 mm para teste"
              >
                <Sparkles className="w-3.5 h-3.5" /> Demo
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
            <button
              onClick={handleValidate}
              disabled={!gcodeText.trim()}
              className="w-full px-3 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500/20 to-violet-500/20 hover:from-cyan-500/30 hover:to-violet-500/30 border border-cyan-500/40 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ShieldAlert className="w-4 h-4" />
              Validar G-code
            </button>

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
                      {(showAllIssues ? validation.issues : validation.issues.slice(0, 8)).map((iss, i) => (
                        <div
                          key={i}
                          className={cn(
                            "px-2 py-1 rounded border",
                            iss.severity === "error" && "bg-rose-500/10 border-rose-500/30 text-rose-200",
                            iss.severity === "warning" && "bg-amber-500/10 border-amber-500/30 text-amber-200",
                            iss.severity === "info" && "bg-cyan-500/10 border-cyan-500/30 text-cyan-200",
                          )}
                        >
                          <span className="font-bold">L{iss.line}</span>{" "}
                          <span className="text-[9px] uppercase opacity-60">[{iss.code}]</span>{" "}
                          {iss.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Panel>

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
                  <GcodeViewer3D
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
              <div className="mb-3 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2">
                <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>O G-code está BLOQUEADO ({validation.errorCount} erros). Corrija antes de enviar.</span>
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
            {/* Step size */}
            <div className="mb-2">
              <div className="text-[9px] uppercase tracking-wider text-gray-500 mb-1">Step (mm)</div>
              <div className="grid grid-cols-6 gap-1">
                {JOYSTICK_STEPS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStep(s)}
                    className={cn(
                      "px-1 py-1 rounded text-[10px] font-mono transition-colors",
                      step === s
                        ? "bg-cyan-500/30 border border-cyan-500/50 text-cyan-100"
                        : "bg-white/5 border border-white/10 text-gray-400 hover:text-white"
                    )}
                  >
                    {s}
                  </button>
                ))}
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
