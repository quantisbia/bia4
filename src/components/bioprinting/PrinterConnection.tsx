"use client"

/**
 * BIA — Conexão USB com Bioimpressora (Web Serial API)
 * ======================================================
 * Usa a Web Serial API (Chrome/Edge) para conectar diretamente ao
 * firmware Marlin/RepRap/Klipper via USB, enviar G-code e receber respostas
 * — sem necessidade de Pronterface/OctoPrint instalado localmente.
 *
 * Requisitos:
 *  - Navegador: Chrome 89+, Edge 89+, Opera 75+ (NÃO funciona no Firefox/Safari)
 *  - Contexto seguro: HTTPS ou localhost
 *  - Permissão do usuário (diálogo do navegador ao clicar em "Conectar")
 *
 * Baud típico: 115200 (Marlin/Ender/BioEnder), 250000 (algumas placas custom)
 *
 * ══════════════════════════════════════════════════════════════════════
 *  R12.60 — CORREÇÃO DA CONEXÃO BIOENDER (bugs #1-#4)
 *  ─────────────────────────────────────────────────
 *  Bug #1: requestPort() era chamado SEM filters → diálogo listava TODAS
 *          as portas seriais do sistema (impressora térmica, GPS, HC-05,
 *          cabos USB-TTL soltos, etc). Usuário podia escolher a errada e
 *          ficar travado no handshake.
 *  Bug #2: Não puxava bioprinterId da Etapa 3 → não sabia quais Vendor IDs
 *          filtrar (BioEnder usa CH340 0x1A86, CP210x 0x10C4, ou FTDI 0x0403).
 *  Bug #3: Sem toggle "Mostrar todos" → se filtro escondesse a porta (chip
 *          exótico), usuário ficava preso sem alternativa.
 *  Bug #4: Sem mensagens acionáveis → só mostrava erro cru do navegador.
 *
 *  Correção: propaga `bioprinterId` da Etapa 3 via context, aplica filtros
 *  USB do BioprinterSpec.usbVendorIds, oferece toggle "🔓 Mostrar todos os
 *  dispositivos", e mostra diagnóstico completo (HTTPS check, contexto,
 *  filtros aplicados) + mensagens de erro com hints acionáveis.
 * ══════════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import {
  Usb, Power, Send, Loader2, AlertCircle, XCircle,
  Terminal, RefreshCw, Wand2, Square, Filter, ShieldCheck, Info,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { useBioprintProcess } from "@/lib/bioprint/process-context"
import { getBioprinterById, supportsWebSerial, type BioprinterSpec } from "@/lib/bioprinting/bioprinters"

// ═══════════════════════════════════════════════════════════
// TIPOS Web Serial API
// ═══════════════════════════════════════════════════════════
interface SerialPortInfo {
  usbVendorId?: number
  usbProductId?: number
}

interface SerialPort {
  readonly readable: ReadableStream<Uint8Array> | null
  readonly writable: WritableStream<Uint8Array> | null
  open(options: {
    baudRate: number
    dataBits?: number
    stopBits?: number
    parity?: "none" | "even" | "odd"
    flowControl?: "none" | "hardware"
    bufferSize?: number
  }): Promise<void>
  close(): Promise<void>
  getInfo(): SerialPortInfo
  addEventListener(type: "disconnect", listener: () => void): void
  removeEventListener(type: "disconnect", listener: () => void): void
}

interface NavigatorSerial {
  requestPort(options?: {
    filters?: Array<{ usbVendorId?: number; usbProductId?: number }>
  }): Promise<SerialPort>
  getPorts(): Promise<SerialPort[]>
}

declare global {
  interface Navigator {
    serial?: NavigatorSerial
  }
}

interface LogLine {
  ts: Date
  text: string
  kind: "tx" | "rx" | "info" | "error"
}

interface PrinterConnectionProps {
  gcode?: string                            // G-code completo para enviar
  defaultBaud?: number                      // Baud padrão (115200)
  printerName?: string
  className?: string
  /**
   * R12.60: ID da bioimpressora selecionada (Etapa 3). Se fornecido,
   * usa os `usbVendorIds` do catálogo BIOPRINTERS para filtrar o diálogo
   * de porta serial. Se omitido, tenta puxar de `state.slice.bioprinterId`
   * do BioprintProcessContext. Se ambos ausentes, sem filtro (mostra tudo).
   */
  bioprinterId?: string
  /**
   * Slot para componentes adicionais (controles real-time customizados)
   * recebem o `sendCommand` e o estado `connected` para poderem operar.
   */
  renderExtraControls?: (api: {
    connected: boolean
    sendCommand: (cmd: string) => Promise<void>
  }) => React.ReactNode
  /**
   * Callback chamado quando o estado de conexão muda.
   * Útil para sincronizar a UI externa (ex: tag "ONLINE" no header).
   */
  onConnectionChange?: (connected: boolean) => void
}

// ─── Utilitário: contexto seguro (HTTPS ou localhost) ────────────────────
function isSecureContextForWebSerial(): boolean {
  if (typeof window === "undefined") return false
  // Web Serial exige HTTPS ou localhost (127.0.0.1 / ::1)
  if (window.isSecureContext) return true
  const h = window.location.hostname
  return h === "localhost" || h === "127.0.0.1" || h === "::1"
}

// ─── Utilitário: descreve vendor por ID (para logs) ──────────────────────
function vendorLabel(vendorId: number): string {
  const labels: Record<number, string> = {
    0x1A86: "WCH CH340/CH341",        // BioEnder, Ender 3, clones
    0x10C4: "Silicon Labs CP210x",    // Ender 3 v4.2.7, Ultimaker original
    0x0403: "FTDI FT232",             // Prusa MK2/MK3 antigos, RepRap 2
    0x2341: "Arduino oficial",         // Placas Arduino oficiais
    0x2A03: "Arduino.org",             // Arduino.org (split de 2016)
    0x2C99: "Prusa Research",          // Prusa MK3+/MK4
    0x1D50: "OpenMoko / Duet",         // Duet3D
    0x03EB: "Atmel/Microchip",         // ATmega direto (raro)
    0x0483: "STMicroelectronics",      // STM32 BTT SKR
  }
  return labels[vendorId] ?? `VendorID 0x${vendorId.toString(16).toUpperCase().padStart(4, "0")}`
}

// ─── Utilitário: hint acionável para erros comuns ────────────────────────
function buildErrorHint(rawError: string, usedFilter: boolean, printer: BioprinterSpec | undefined): string {
  const lower = rawError.toLowerCase()

  if (lower.includes("no port selected") || lower.includes("nenhuma porta") || lower.includes("cancelou")) {
    if (usedFilter && printer) {
      return (
        `📋 O diálogo do navegador abriu mas nenhuma porta foi selecionada.\n\n` +
        `Possíveis causas para a ${printer.brand} ${printer.model}:\n` +
        `  1️⃣  A bioimpressora não está conectada via USB (verifique o cabo)\n` +
        `  2️⃣  O cabo USB é só de carga (sem fios de dados) — teste outro cabo\n` +
        `  3️⃣  Driver CH340 não instalado — baixe em https://www.wch.cn/downloads/CH341SER_ZIP.html (Windows) ou http://www.wch.cn/downloads/CH34XSER_MAC_ZIP.html (Mac)\n` +
        `  4️⃣  Sua placa usa um chip USB-Serial diferente — clique em "🔓 Mostrar todos os dispositivos" abaixo e tente de novo\n` +
        `  5️⃣  A impressora está ligada mas com a placa em modo bootloader (LED piscando) — pressione RESET\n`
      )
    }
    return (
      `📋 O diálogo do navegador abriu mas nenhuma porta foi selecionada.\n\n` +
      `Verifique:\n` +
      `  1️⃣  A bioimpressora está conectada via cabo USB de dados\n` +
      `  2️⃣  Está ligada (LED da placa aceso)\n` +
      `  3️⃣  O driver USB-Serial (CH340/CP210x/FTDI) está instalado no sistema\n`
    )
  }

  if (lower.includes("access denied") || lower.includes("failed to open") || lower.includes("resource busy")) {
    return (
      `🔒 A porta serial está em uso por outro programa.\n\n` +
      `Feche estes programas se estiverem abertos:\n` +
      `  • Cura (Ultimaker)\n` +
      `  • Pronterface / Printrun\n` +
      `  • OctoPrint (aba do navegador ou app)\n` +
      `  • Repetier-Host\n` +
      `  • Arduino IDE (Monitor Serial)\n` +
      `  • Outra aba do Chrome com BIA conectada\n\n` +
      `Depois recarregue esta página e tente conectar de novo.`
    )
  }

  if (lower.includes("not supported") || lower.includes("não suportada")) {
    return (
      `🌐 Este navegador não suporta Web Serial API.\n\n` +
      `Compatíveis:\n` +
      `  ✅ Google Chrome 89+ (desktop)\n` +
      `  ✅ Microsoft Edge 89+ (desktop)\n` +
      `  ✅ Opera 75+ (desktop)\n` +
      `  ✅ Brave (desktop)\n\n` +
      `Não compatíveis:\n` +
      `  ❌ Firefox (todas as versões)\n` +
      `  ❌ Safari (todas as versões)\n` +
      `  ❌ Chrome/Edge/Firefox Mobile (Android/iOS)\n\n` +
      `Alternativa: baixe o .gcode e use Pronterface ou OctoPrint.`
    )
  }

  if (lower.includes("secure context") || lower.includes("https")) {
    return (
      `🔐 A Web Serial API exige contexto seguro (HTTPS ou localhost).\n\n` +
      `A URL atual não é segura. Soluções:\n` +
      `  • Acesse via HTTPS: https://bia.quantis.bio\n` +
      `  • Desenvolvimento local: http://localhost:3000 (OK)\n` +
      `  • Nunca funciona: http://<ip>:<porta> em rede\n`
    )
  }

  // Fallback genérico com hint sobre driver
  return (
    `⚠️  Erro inesperado ao conectar. Coisas para tentar:\n` +
    `  1️⃣  Reconecte o cabo USB (desconecte, espere 3s, reconecte)\n` +
    `  2️⃣  Reinicie a bioimpressora (desligue/ligue no botão)\n` +
    `  3️⃣  Feche outros programas que usam serial (Cura/Pronterface/Arduino IDE)\n` +
    `  4️⃣  Instale driver CH340 (Windows/Mac) — http://www.wch.cn/downloads.html\n` +
    `  5️⃣  Recarregue a página do BIA (Ctrl+Shift+R) e tente novamente\n`
  )
}

export function PrinterConnection({
  gcode = "",
  defaultBaud = 115200,
  printerName = "Bioimpressora",
  className,
  bioprinterId: bioprinterIdProp,
  renderExtraControls,
  onConnectionChange,
}: PrinterConnectionProps) {
  // ── R12.60: puxa bioprinterId do contexto se não vier por prop ──
  const { state } = useBioprintProcess()
  const effectiveBioprinterId = bioprinterIdProp ?? state.slice.bioprinterId ?? "bioender_bioedtech"

  const selectedPrinter = useMemo<BioprinterSpec | undefined>(
    () => getBioprinterById(effectiveBioprinterId),
    [effectiveBioprinterId],
  )

  const [supported, setSupported] = useState<boolean>(false)
  const [secureCtx, setSecureCtx] = useState<boolean>(false)
  const [port, setPort] = useState<SerialPort | null>(null)
  const [connected, setConnected] = useState(false)
  const [baud, setBaud] = useState(selectedPrinter?.baud ?? defaultBaud)
  const [log, setLog] = useState<LogLine[]>([])
  const [manualCmd, setManualCmd] = useState("")
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [paused, setPaused] = useState(false)
  /**
   * R12.60: Toggle "Filtrar USB pelo modelo".
   *  ON  (default): usa selectedPrinter.usbVendorIds para filtrar o diálogo
   *                 → só aparece a bioimpressora (limpo, sem confusão)
   *  OFF (fallback): passa filtros vazios → aparece TODO dispositivo serial
   *                  → útil quando placa tem chip exótico não catalogado
   */
  const [useUsbFilters, setUseUsbFilters] = useState(true)
  /** R12.60: mostra painel de diagnóstico técnico (colapsável) */
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  /** R12.60: erro estruturado (mensagem principal + hint acionável) */
  const [connectError, setConnectError] = useState<{ msg: string; hint: string } | null>(null)
  /** R12.60: portas previamente autorizadas (getPorts) para conexão rápida */
  const [authorizedPorts, setAuthorizedPorts] = useState<SerialPort[]>([])

  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  const BAUDS = [9600, 19200, 38400, 57600, 115200, 230400, 250000]

  // ── Detecta suporte + contexto seguro ──
  useEffect(() => {
    setSupported(typeof navigator !== "undefined" && "serial" in navigator)
    setSecureCtx(isSecureContextForWebSerial())
  }, [])

  // ── Atualiza baud quando muda a bioimpressora ──
  useEffect(() => {
    if (selectedPrinter?.baud && !connected) {
      setBaud(selectedPrinter.baud)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveBioprinterId])

  // ── Lista portas previamente autorizadas (getPorts) ao montar ──
  useEffect(() => {
    if (!navigator.serial) return
    void navigator.serial.getPorts().then((ports) => {
      setAuthorizedPorts(ports)
    }).catch(() => {})
  }, [])

  // ── Auto-scroll do terminal ──
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [log])

  // ── Notifica externamente quando conecta/desconecta ──
  useEffect(() => {
    onConnectionChange?.(connected)
  }, [connected, onConnectionChange])

  const addLog = useCallback((text: string, kind: LogLine["kind"] = "info") => {
    setLog((prev) => [...prev.slice(-499), { ts: new Date(), text, kind }])
  }, [])

  // ─── R12.60: filtros USB efetivos (usados no requestPort) ────────────
  const effectiveFilters = useMemo(() => {
    if (!useUsbFilters) return undefined  // undefined = sem filtro (mostra tudo)
    const vids = selectedPrinter?.usbVendorIds ?? []
    if (vids.length === 0) return undefined
    return vids.map((usbVendorId) => ({ usbVendorId }))
  }, [useUsbFilters, selectedPrinter])

  // ─────────────────────────────────────────────────────────
  // CONECTAR (com filtros USB corretos + mensagens acionáveis)
  // ─────────────────────────────────────────────────────────
  async function connect(existingPort?: SerialPort) {
    setConnectError(null)

    // Pré-check: Web Serial suportada?
    if (!navigator.serial) {
      const msg = "Web Serial API não suportada neste navegador."
      const hint = buildErrorHint("not supported", false, selectedPrinter)
      setConnectError({ msg, hint })
      addLog(`❌ ${msg}`, "error")
      return
    }

    // Pré-check: contexto seguro?
    if (!isSecureContextForWebSerial()) {
      const msg = "Contexto não seguro — precisa de HTTPS ou localhost."
      const hint = buildErrorHint("secure context", false, selectedPrinter)
      setConnectError({ msg, hint })
      addLog(`❌ ${msg}`, "error")
      return
    }

    try {
      let p: SerialPort
      if (existingPort) {
        p = existingPort
        addLog(`🔌 Reusando porta previamente autorizada...`, "info")
      } else {
        // R12.60: aplica filtros USB da bioimpressora selecionada
        const filterInfo = effectiveFilters
          ? `Filtrando por ${selectedPrinter?.brand ?? "?"} ${selectedPrinter?.model ?? "?"}: [${(selectedPrinter?.usbVendorIds ?? []).map((v) => vendorLabel(v)).join(", ")}]`
          : `Sem filtro USB — todos os dispositivos seriais aparecerão no diálogo.`
        addLog(`ℹ️  ${filterInfo}`, "info")

        try {
          p = await navigator.serial.requestPort(
            effectiveFilters ? { filters: effectiveFilters } : undefined,
          )
        } catch (e) {
          // Usuário cancelou o diálogo OU nenhuma porta compatível
          const raw = e instanceof Error ? e.message : String(e)
          const msg = "Nenhuma porta selecionada no diálogo do navegador."
          const hint = buildErrorHint(raw, !!effectiveFilters, selectedPrinter)
          setConnectError({ msg, hint })
          addLog(`❌ ${msg}`, "error")
          return
        }
      }

      // R12.60: abre com params completos (dataBits/stopBits/parity/flowControl)
      // — sem isso alguns firmwares Marlin ignoram os dados. Padrão 8N1 sem
      // flow control é o correto pra Ender 3 / BioEnder / clones.
      await p.open({
        baudRate: baud,
        dataBits: 8,
        stopBits: 1,
        parity: "none",
        flowControl: "none",
        bufferSize: 16384,
      })
      setPort(p)
      setConnected(true)

      // Log informativo com info da porta
      const info = p.getInfo()
      const vendorInfo = info.usbVendorId
        ? ` (${vendorLabel(info.usbVendorId)}, VID=0x${info.usbVendorId.toString(16).toUpperCase()})`
        : ""
      addLog(`✅ Conectado em ${baud} baud${vendorInfo}`, "info")

      // Writer
      writerRef.current = p.writable?.getWriter() ?? null

      // Reader loop
      const reader = p.readable?.getReader()
      if (reader) {
        readerRef.current = reader
        void readLoop(reader)
      }

      // Handshake M115 — identifica firmware
      addLog(`→ M115 (handshake — identificando firmware...)`, "tx")
      await sendRaw("M115\n")
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e)
      const msg = `Erro ao abrir porta serial: ${raw}`
      const hint = buildErrorHint(raw, !!effectiveFilters, selectedPrinter)
      setConnectError({ msg, hint })
      addLog(`❌ ${msg}`, "error")
    }
  }

  async function readLoop(reader: ReadableStreamDefaultReader<Uint8Array>) {
    const decoder = new TextDecoder()
    let buffer = ""
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let idx: number
        while ((idx = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, idx).replace(/\r$/, "").trim()
          buffer = buffer.slice(idx + 1)
          if (line) addLog(line, "rx")
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      // Não emite erro se foi desconexão intencional
      if (!msg.toLowerCase().includes("cancel")) {
        addLog(`❌ Leitura interrompida: ${msg}`, "error")
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  // DESCONECTAR
  // ─────────────────────────────────────────────────────────
  async function disconnect() {
    try {
      abortRef.current?.abort()
      if (readerRef.current) {
        try {
          await readerRef.current.cancel()
        } catch {}
        try {
          readerRef.current.releaseLock()
        } catch {}
        readerRef.current = null
      }
      if (writerRef.current) {
        try {
          await writerRef.current.close()
        } catch {}
        writerRef.current = null
      }
      if (port) {
        try {
          await port.close()
        } catch {}
      }
      setPort(null)
      setConnected(false)
      setProgress(null)
      setPaused(false)
      addLog("🔌 Desconectado", "info")
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      addLog(`Erro ao desconectar: ${msg}`, "error")
    }
  }

  // ─────────────────────────────────────────────────────────
  // ENVIAR COMANDO
  // ─────────────────────────────────────────────────────────
  async function sendRaw(cmd: string) {
    if (!writerRef.current) return
    const data = new TextEncoder().encode(cmd)
    await writerRef.current.write(data)
  }

  async function sendCommand(cmd: string) {
    if (!connected) {
      addLog("⚠️ Não conectado. Clique em 'Conectar USB' primeiro.", "error")
      return
    }
    const clean = cmd.trim()
    if (!clean) return
    addLog(clean, "tx")
    try {
      await sendRaw(clean + "\n")
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      addLog(`Erro ao enviar: ${msg}`, "error")
    }
  }

  // ─────────────────────────────────────────────────────────
  // ENVIAR G-CODE COMPLETO (streaming linha-por-linha)
  // ─────────────────────────────────────────────────────────
  async function streamGCode() {
    if (!connected) {
      addLog("⚠️ Não conectado. Clique em 'Conectar USB' primeiro.", "error")
      return
    }
    if (!gcode.trim()) {
      addLog("⚠️ Nenhum G-code disponível para envio.", "error")
      return
    }
    const lines = gcode.split("\n").filter((l) => {
      const t = l.trim()
      return t.length > 0 && !t.startsWith(";")  // remove comentários
    })
    setProgress({ current: 0, total: lines.length })
    setSending(true)
    setPaused(false)
    abortRef.current = new AbortController()

    addLog(`📤 Iniciando envio de ${lines.length} linhas de G-code...`, "info")

    try {
      for (let i = 0; i < lines.length; i++) {
        if (abortRef.current.signal.aborted) {
          addLog("⏹️ Envio cancelado pelo usuário.", "info")
          break
        }
        // Pausa cooperativa
        while (paused) {
          await new Promise((r) => setTimeout(r, 200))
          if (abortRef.current.signal.aborted) break
        }
        const line = lines[i]
        await sendRaw(line + "\n")
        addLog(line, "tx")
        setProgress({ current: i + 1, total: lines.length })
        // Micro-pausa para não sobrecarregar o buffer
        await new Promise((r) => setTimeout(r, 20))
      }
      addLog("✅ G-code enviado com sucesso.", "info")
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      addLog(`❌ Erro durante envio: ${msg}`, "error")
    } finally {
      setSending(false)
      setPaused(false)
    }
  }

  function stopStream() {
    abortRef.current?.abort()
    setSending(false)
    setPaused(false)
    // Comando de parada de emergência
    void sendCommand("M112")  // Emergency stop (Marlin)
  }

  // ─────────────────────────────────────────────────────────
  // QUICK-ACTIONS
  // ─────────────────────────────────────────────────────────
  // 🚫 G28 (Home) foi REMOVIDO dos quick-actions intencionalmente.
  // Bioimpressora nunca faz home automático — preserva bandeja/cartucho.
  // Use "G92 Zero" para zerar coordenadas no ponto atual sem mover.
  const quickActions: Array<{ label: string; cmd: string; title: string }> = [
    { label: "G92 Zero aqui", cmd: "G92 X0 Y0 Z0 E0", title: "Zera as coordenadas X/Y/Z/E no ponto atual (sem mover, sem home)" },
    { label: "M114 Pos", cmd: "M114", title: "Mostra a posição atual do bico" },
    { label: "M105 Temp", cmd: "M105", title: "Mostra temperaturas do hotend e mesa" },
    { label: "M115 Info", cmd: "M115", title: "Informações do firmware" },
    { label: "M18 Off", cmd: "M18", title: "Desabilita motores (permite mover manualmente)" },
    { label: "Z +10", cmd: "G91\nG1 Z10 F300\nG90", title: "Sobe bico 10 mm" },
    { label: "Z -10", cmd: "G91\nG1 Z-10 F300\nG90", title: "Desce bico 10 mm" },
  ]

  const printerSupportsSerial = selectedPrinter ? supportsWebSerial(selectedPrinter) : true

  return (
    <div className={cn("rounded-xl border border-white/10 bg-black/40 overflow-hidden", className)}>
      {/* HEADER */}
      <div className="px-4 py-3 bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border-b border-white/10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Usb className={cn("w-5 h-5", connected ? "text-emerald-400" : "text-gray-500")} />
            <span className="font-bold text-white">Conexão USB — {printerName}</span>
            <span
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider",
                connected
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                  : "bg-gray-600/20 border-gray-500/40 text-gray-400",
              )}
            >
              {connected ? "● Conectado" : "○ Desconectado"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!connected && supported && (
              <select
                value={baud}
                onChange={(e) => setBaud(parseInt(e.target.value))}
                className="px-2 py-1 rounded-md text-xs bg-black/40 border border-white/20 text-white focus:border-cyan-400 outline-none"
                title="Baud rate serial. BioEnder/Ender 3 usa 115200 (Marlin padrão)."
              >
                {BAUDS.map((b) => (
                  <option key={b} value={b}>
                    {b} baud {b === selectedPrinter?.baud ? "★" : ""}
                  </option>
                ))}
              </select>
            )}
            {connected ? (
              <button
                onClick={disconnect}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600/30 border border-red-500/50 text-red-200 hover:bg-red-600/50 transition-all flex items-center gap-1.5"
              >
                <Power className="w-3.5 h-3.5" />
                Desconectar
              </button>
            ) : (
              <button
                onClick={() => void connect()}
                disabled={!supported || !secureCtx || !printerSupportsSerial}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                title={
                  !supported ? "Web Serial não suportada — use Chrome/Edge desktop"
                  : !secureCtx ? "Precisa de HTTPS ou localhost"
                  : !printerSupportsSerial ? "Esta bioimpressora usa protocolo proprietário (não Marlin/RepRap)"
                  : "Abrir diálogo do navegador para escolher a porta USB"
                }
              >
                <Usb className="w-3.5 h-3.5" />
                Conectar USB
              </button>
            )}
          </div>
        </div>

        {/* R12.60: Barra de configuração de filtro USB (só quando desconectado) */}
        {!connected && supported && secureCtx && (
          <div className="mt-2 flex items-center gap-3 flex-wrap text-xs">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useUsbFilters}
                onChange={(e) => setUseUsbFilters(e.target.checked)}
                className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-cyan-500/40 focus:ring-1"
              />
              <Filter className="w-3 h-3 text-cyan-300" />
              <span className="text-cyan-100">
                {useUsbFilters ? (
                  <>
                    Filtrando por <b>{selectedPrinter?.brand ?? "?"} {selectedPrinter?.model ?? "?"}</b>
                    {(selectedPrinter?.usbVendorIds?.length ?? 0) > 0 && (
                      <span className="text-cyan-300/60 ml-1">
                        ({(selectedPrinter?.usbVendorIds ?? []).map((v) => "0x" + v.toString(16).toUpperCase()).join(", ")})
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-amber-200">🔓 Mostrar TODOS os dispositivos seriais</span>
                )}
              </span>
            </label>
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="ml-auto inline-flex items-center gap-1 text-cyan-300/70 hover:text-cyan-200 text-[10px] uppercase tracking-wider"
            >
              <Info className="w-3 h-3" />
              {showDiagnostics ? "Ocultar" : "Diagnóstico"}
            </button>
          </div>
        )}

        {/* R12.60: Painel de diagnóstico técnico (colapsável) */}
        {showDiagnostics && (
          <div className="mt-2 rounded-md bg-black/40 border border-cyan-500/20 p-2 text-[11px] font-mono text-cyan-100 space-y-0.5">
            <div>Web Serial API: <span className={supported ? "text-emerald-400" : "text-red-400"}>{supported ? "✅ suportada" : "❌ não suportada"}</span></div>
            <div>Contexto seguro (HTTPS/localhost): <span className={secureCtx ? "text-emerald-400" : "text-red-400"}>{secureCtx ? "✅ ok" : "❌ inseguro"}</span></div>
            <div>Bioimpressora: <b>{selectedPrinter?.brand ?? "?"} {selectedPrinter?.model ?? "?"}</b> (id: <code>{effectiveBioprinterId}</code>)</div>
            <div>Marlin/RepRap compat: <span className={printerSupportsSerial ? "text-emerald-400" : "text-red-400"}>{printerSupportsSerial ? "✅ sim" : "❌ proprietário"}</span></div>
            <div>Baud selecionado: <b>{baud}</b> (recomendado: {selectedPrinter?.baud ?? 115200})</div>
            <div>Filtros USB ativos: <span className={useUsbFilters ? "text-cyan-300" : "text-amber-300"}>
              {useUsbFilters
                ? `sim — ${(selectedPrinter?.usbVendorIds ?? []).map((v) => vendorLabel(v)).join(", ") || "(nenhum)"}`
                : "não (mostra tudo)"}
            </span></div>
            <div>Portas pré-autorizadas: <b>{authorizedPorts.length}</b></div>
            <div className="pt-1 border-t border-cyan-500/10 text-cyan-300/60">
              Dica: se a bioimpressora não aparecer no diálogo, desative "Filtrar por..." acima e tente de novo.
            </div>
          </div>
        )}
      </div>

      {/* SUPPORT WARNING */}
      {!supported && (
        <div className="p-3 bg-amber-950/40 border-b border-amber-500/30">
          <div className="flex items-start gap-2 text-amber-200 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <b>Navegador incompatível.</b> A Web Serial API só funciona em:
              <ul className="list-disc list-inside text-xs mt-1 space-y-0.5 text-amber-100/80">
                <li>Chrome 89+ / Edge 89+ / Opera 75+ / Brave (Desktop)</li>
                <li>Contexto seguro (HTTPS ou localhost)</li>
              </ul>
              <p className="text-xs mt-1.5 text-amber-100/80">
                ⚡ Alternativa: baixe o .gcode e use Pronterface ou OctoPrint manualmente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* HTTPS/CONTEXT WARNING */}
      {supported && !secureCtx && (
        <div className="p-3 bg-red-950/40 border-b border-red-500/30">
          <div className="flex items-start gap-2 text-red-200 text-sm">
            <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <b>Contexto não seguro.</b> A Web Serial API exige HTTPS ou localhost.
              <p className="text-xs mt-1 text-red-100/80">
                URL atual: <code className="bg-black/40 px-1 rounded">{typeof window !== "undefined" ? window.location.href : ""}</code>
              </p>
              <p className="text-xs mt-1 text-red-100/80">
                Acesse via <code className="bg-black/40 px-1 rounded">https://</code> ou <code className="bg-black/40 px-1 rounded">http://localhost</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* R12.60: Portas previamente autorizadas (conexão rápida sem re-abrir diálogo) */}
      {!connected && supported && secureCtx && authorizedPorts.length > 0 && (
        <div className="p-3 bg-emerald-950/30 border-b border-emerald-500/30">
          <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            {authorizedPorts.length} porta(s) previamente autorizada(s)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {authorizedPorts.map((p, idx) => {
              const info = p.getInfo()
              const label = info.usbVendorId
                ? `${vendorLabel(info.usbVendorId)}${info.usbProductId ? ` · PID=0x${info.usbProductId.toString(16).toUpperCase()}` : ""}`
                : `Porta serial #${idx + 1}`
              return (
                <button
                  key={idx}
                  onClick={() => void connect(p)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/40 text-emerald-100 hover:bg-emerald-500/20 transition-all flex items-center gap-1"
                >
                  <Usb className="w-3 h-3" />
                  {label}
                </button>
              )
            })}
          </div>
          <div className="text-[10px] text-emerald-300/60 mt-1">
            Clique numa porta já autorizada para conectar sem re-abrir o diálogo do navegador.
          </div>
        </div>
      )}

      {/* R12.60: Erro estruturado com hint acionável */}
      {connectError && (
        <div className="p-3 bg-red-950/40 border-b border-red-500/30">
          <div className="flex items-start gap-2 text-red-200 text-sm">
            <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" />
            <div className="flex-1 min-w-0">
              <b className="text-red-100">{connectError.msg}</b>
              <pre className="mt-1.5 text-[11px] text-red-100/80 whitespace-pre-wrap font-sans leading-snug">
                {connectError.hint}
              </pre>
              <button
                onClick={() => setConnectError(null)}
                className="mt-2 text-[10px] uppercase tracking-wider text-red-300 hover:text-red-100"
              >
                Fechar aviso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ACTIONS */}
      {connected && (
        <div className="p-3 border-b border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] uppercase tracking-wider font-bold text-cyan-300">
              Ações rápidas
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quickActions.map((a) => (
              <button
                key={a.label}
                onClick={() => a.cmd.split("\n").forEach((c) => void sendCommand(c))}
                title={a.title}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/20 hover:border-cyan-400/50 transition-all"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SLOT — Controles real-time customizados (Temperatura, Extrusão, Retração, Z-offset...) */}
      {renderExtraControls && (
        <div className="border-b border-white/10">
          {renderExtraControls({ connected, sendCommand })}
        </div>
      )}

      {/* STREAM G-CODE */}
      {connected && gcode && (
        <div className="p-3 border-b border-white/10 bg-gradient-to-r from-emerald-950/30 to-green-950/30">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-1">
                📤 Streaming de G-code
              </div>
              {progress ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-gray-300">
                    <span>
                      Linha {progress.current} / {progress.total}
                    </span>
                    <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-400">
                  {gcode.split("\n").length.toLocaleString()} linhas prontas para envio
                </div>
              )}
            </div>
            <div className="flex gap-1.5">
              {!sending ? (
                <button
                  onClick={() => void streamGCode()}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Iniciar Impressão
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setPaused(!paused)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition-all flex items-center gap-1.5"
                  >
                    {paused ? <Send className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    {paused ? "Retomar" : "Pausar"}
                  </button>
                  <button
                    onClick={stopStream}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    STOP (M112)
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TERMINAL */}
      <div className="bg-black border-b border-white/10">
        <div className="px-3 py-1.5 bg-gray-950 border-b border-white/5 flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-300">
            Terminal G-code (estilo Pronterface)
          </span>
          <button
            onClick={() => setLog([])}
            className="ml-auto px-2 py-0.5 rounded text-[10px] bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Limpar
          </button>
        </div>
        <div className="h-56 overflow-y-auto p-2 font-mono text-[11px] leading-tight">
          {log.length === 0 ? (
            <div className="text-gray-600 italic p-2">
              Terminal vazio. Conecte a impressora para ver as mensagens...
            </div>
          ) : (
            log.map((line, i) => (
              <div
                key={i}
                className={cn(
                  "whitespace-pre-wrap",
                  line.kind === "tx" && "text-cyan-400",
                  line.kind === "rx" && "text-emerald-300",
                  line.kind === "info" && "text-amber-300",
                  line.kind === "error" && "text-red-400",
                )}
              >
                <span className="text-gray-600 text-[9px]">
                  {line.ts.toTimeString().slice(0, 8)}{" "}
                </span>
                {line.kind === "tx" && "→ "}
                {line.kind === "rx" && "← "}
                {line.text}
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* MANUAL COMMAND */}
      <div className="p-2 bg-gray-950 flex gap-2">
        <input
          type="text"
          value={manualCmd}
          onChange={(e) => setManualCmd(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void sendCommand(manualCmd)
              setManualCmd("")
            }
          }}
          placeholder="Digite um comando G-code (ex.: G28, M114, G1 X10 Y10 F1500)..."
          disabled={!connected}
          className="flex-1 px-3 py-1.5 rounded-md bg-black/60 border border-white/20 text-xs font-mono text-emerald-300 placeholder-gray-600 focus:border-cyan-400 outline-none disabled:opacity-40"
        />
        <button
          onClick={() => {
            void sendCommand(manualCmd)
            setManualCmd("")
          }}
          disabled={!connected || !manualCmd.trim()}
          className="px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1"
        >
          {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          Enviar
        </button>
      </div>
    </div>
  )
}
