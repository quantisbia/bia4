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
 */

import { useState, useRef, useCallback, useEffect } from "react"
import {
  Usb, Power, Send, Loader2, AlertCircle, XCircle,
  Terminal, RefreshCw, Wand2, Square,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

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
  open(options: { baudRate: number }): Promise<void>
  close(): Promise<void>
  getInfo(): SerialPortInfo
  addEventListener(type: "disconnect", listener: () => void): void
  removeEventListener(type: "disconnect", listener: () => void): void
}

interface NavigatorSerial {
  requestPort(options?: { filters?: Array<{ usbVendorId?: number }> }): Promise<SerialPort>
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
}

export function PrinterConnection({
  gcode = "",
  defaultBaud = 115200,
  printerName = "Bioimpressora",
  className,
}: PrinterConnectionProps) {
  const [supported, setSupported] = useState<boolean>(false)
  const [port, setPort] = useState<SerialPort | null>(null)
  const [connected, setConnected] = useState(false)
  const [baud, setBaud] = useState(defaultBaud)
  const [log, setLog] = useState<LogLine[]>([])
  const [manualCmd, setManualCmd] = useState("")
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [paused, setPaused] = useState(false)

  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  const BAUDS = [9600, 19200, 38400, 57600, 115200, 230400, 250000]

  useEffect(() => {
    setSupported(typeof navigator !== "undefined" && "serial" in navigator)
  }, [])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [log])

  const addLog = useCallback((text: string, kind: LogLine["kind"] = "info") => {
    setLog((prev) => [...prev.slice(-499), { ts: new Date(), text, kind }])
  }, [])

  // ─────────────────────────────────────────────────────────
  // CONECTAR
  // ─────────────────────────────────────────────────────────
  async function connect() {
    if (!navigator.serial) {
      addLog("Web Serial API não suportada neste navegador. Use Chrome 89+ ou Edge 89+.", "error")
      return
    }
    try {
      const p = await navigator.serial.requestPort()
      await p.open({ baudRate: baud })
      setPort(p)
      setConnected(true)
      addLog(`✅ Conectado em ${baud} baud`, "info")

      // Writer
      writerRef.current = p.writable?.getWriter() ?? null

      // Reader loop
      const reader = p.readable?.getReader()
      if (reader) {
        readerRef.current = reader
        readLoop(reader)
      }

      // Comando inicial: identify firmware
      await sendRaw("M115\n")
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      addLog(`❌ Erro ao conectar: ${msg}`, "error")
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
        let idx
        while ((idx = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, idx).trim()
          buffer = buffer.slice(idx + 1)
          if (line) addLog(line, "rx")
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      addLog(`❌ Leitura interrompida: ${msg}`, "error")
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
        readerRef.current.releaseLock()
        readerRef.current = null
      }
      if (writerRef.current) {
        try {
          await writerRef.current.close()
        } catch {}
        writerRef.current = null
      }
      if (port) {
        await port.close()
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
    sendCommand("M112")  // Emergency stop (Marlin)
  }

  // ─────────────────────────────────────────────────────────
  // QUICK-ACTIONS
  // ─────────────────────────────────────────────────────────
  const quickActions: Array<{ label: string; cmd: string; title: string }> = [
    { label: "G28 Home", cmd: "G28", title: "Homing — zera as posições X/Y/Z na origem física" },
    { label: "G92 Zero", cmd: "G92 X0 Y0 Z0 E0", title: "Zera as posições atuais (sem mover)" },
    { label: "M114 Pos", cmd: "M114", title: "Mostra a posição atual do bico" },
    { label: "M105 Temp", cmd: "M105", title: "Mostra temperaturas do hotend e mesa" },
    { label: "M115 Info", cmd: "M115", title: "Informações do firmware" },
    { label: "M18 Off", cmd: "M18", title: "Desabilita motores (permite mover manualmente)" },
    { label: "Z +10", cmd: "G91\nG1 Z10 F300\nG90", title: "Sobe bico 10 mm" },
    { label: "Z -10", cmd: "G91\nG1 Z-10 F300\nG90", title: "Desce bico 10 mm" },
  ]

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
              >
                {BAUDS.map((b) => (
                  <option key={b} value={b}>
                    {b} baud
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
                onClick={connect}
                disabled={!supported}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
              >
                <Usb className="w-3.5 h-3.5" />
                Conectar USB
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SUPPORT WARNING */}
      {!supported && (
        <div className="p-3 bg-amber-950/40 border-b border-amber-500/30">
          <div className="flex items-start gap-2 text-amber-200 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <b>Navegador incompatível.</b> A Web Serial API só funciona em:
              <ul className="list-disc list-inside text-xs mt-1 space-y-0.5 text-amber-100/80">
                <li>Chrome 89+ / Edge 89+ / Opera 75+ (Desktop)</li>
                <li>Contexto seguro (HTTPS ou localhost)</li>
              </ul>
              <p className="text-xs mt-1.5 text-amber-100/80">
                ⚡ Alternativa: baixe o .gcode e use Pronterface ou OctoPrint manualmente.
              </p>
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
                onClick={() => a.cmd.split("\n").forEach((c) => sendCommand(c))}
                title={a.title}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/20 hover:border-cyan-400/50 transition-all"
              >
                {a.label}
              </button>
            ))}
          </div>
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
                  onClick={streamGCode}
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
              sendCommand(manualCmd)
              setManualCmd("")
            }
          }}
          placeholder="Digite um comando G-code (ex.: G28, M114, G1 X10 Y10 F1500)..."
          disabled={!connected}
          className="flex-1 px-3 py-1.5 rounded-md bg-black/60 border border-white/20 text-xs font-mono text-emerald-300 placeholder-gray-600 focus:border-cyan-400 outline-none disabled:opacity-40"
        />
        <button
          onClick={() => {
            sendCommand(manualCmd)
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
