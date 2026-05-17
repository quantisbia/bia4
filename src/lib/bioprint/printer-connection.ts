/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · PrinterConnection — Wrapper Web Serial API (Marlin/RepRap)
 *  ─────────────────────────────────────────────────────────────────────
 *  Camada de TRANSPORTE. Não conhece G-code de alto nível, não controla
 *  fluxo de impressão. Apenas:
 *    · Pede porta serial ao usuário (gesture)
 *    · Abre porta com baud configurado
 *    · Mantém um read-loop que linha-a-linha emite IncomingMessage
 *    · Permite escrever uma linha bruta
 *    · Classifica linhas recebidas em: ok | rx | info | error | busy | wait | echo
 *    · Faz handshake M115 e infere firmware
 *
 *  Interface PrinterTransport: mesmo formato do PrinterMock — assim o
 *  Controller pode receber qualquer transporte (real ou simulado).
 *
 *  Browsers: Chrome 89+, Edge 89+, Opera 75+ (NÃO Firefox/Safari).
 *  Contexto: HTTPS ou localhost.
 *
 *  R12.15 — Pipeline real de execução USB
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

// ─── Tipos Web Serial API ───────────────────────────────────────────────
// Declarados localmente porque @types/web não cobre completamente.

export interface WebSerialPortInfo {
  usbVendorId?: number
  usbProductId?: number
}

export interface WebSerialPort {
  readonly readable: ReadableStream<Uint8Array> | null
  readonly writable: WritableStream<Uint8Array> | null
  open(options: { baudRate: number; dataBits?: number; stopBits?: number; parity?: "none" | "even" | "odd"; flowControl?: "none" | "hardware"; bufferSize?: number }): Promise<void>
  close(): Promise<void>
  getInfo(): WebSerialPortInfo
  addEventListener(type: "disconnect", listener: () => void): void
  removeEventListener(type: "disconnect", listener: () => void): void
}

export interface WebSerialNavigator {
  requestPort(options?: { filters?: Array<{ usbVendorId?: number; usbProductId?: number }> }): Promise<WebSerialPort>
  getPorts(): Promise<WebSerialPort[]>
}

declare global {
  interface Navigator {
    serial?: WebSerialNavigator
  }
}

// ─── Mensagens do firmware ──────────────────────────────────────────────

export type IncomingKind = "ok" | "rx" | "info" | "error" | "busy" | "wait" | "echo"

export interface IncomingMessage {
  kind: IncomingKind
  text: string
  ts: number
}

export interface FirmwareInfo {
  raw: string
  name?: string
  version?: string
  family: "marlin" | "reprap" | "klipper" | "grbl" | "unknown"
  caps: Record<string, string>
}

/** Interface comum entre transport real e mock — permite drop-in replacement */
export interface PrinterTransport {
  connect(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
  write(line: string): Promise<void>
  onMessage(fn: (msg: IncomingMessage) => void): () => void
}

// ─── Classificador de linhas recebidas ──────────────────────────────────

export function classifyIncoming(line: string): IncomingKind {
  const t = line.trim()
  if (!t) return "rx"
  const low = t.toLowerCase()
  if (low === "ok" || low.startsWith("ok ") || low.startsWith("ok\t")) return "ok"
  if (low.startsWith("error")) return "error"
  if (low.startsWith("!!")) return "error"
  if (low.startsWith("busy")) return "busy"
  if (low === "wait" || low.startsWith("wait ")) return "wait"
  if (low.startsWith("echo:")) return "echo"
  // Marlin "FIRMWARE_NAME:" + capabilities respondem como info
  if (low.startsWith("firmware_name:") || low.startsWith("cap:")) return "info"
  return "rx"
}

// ─── Wrapper de conexão real ────────────────────────────────────────────

export interface PrinterConnectionOptions {
  baudRate?: number
  /** Timeout total para handshake M115 (ms) */
  handshakeTimeoutMs?: number
  /** Filtros de USB Vendor IDs aceitos. Ex.: [{usbVendorId: 0x1A86}] (CH340) */
  filters?: Array<{ usbVendorId?: number; usbProductId?: number }>
}

const DEFAULT_OPTS: Required<Pick<PrinterConnectionOptions, "baudRate" | "handshakeTimeoutMs">> = {
  baudRate: 115200,
  handshakeTimeoutMs: 5000,
}

export class PrinterConnection implements PrinterTransport {
  private port: WebSerialPort | null = null
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null
  private readLoopPromise: Promise<void> | null = null
  private listeners = new Set<(msg: IncomingMessage) => void>()
  private opts: Required<Pick<PrinterConnectionOptions, "baudRate" | "handshakeTimeoutMs">> & PrinterConnectionOptions
  private buffer = ""
  private connected = false
  private disconnectHandler: (() => void) | null = null

  constructor(opts: PrinterConnectionOptions = {}) {
    this.opts = { ...DEFAULT_OPTS, ...opts }
  }

  // ─── Static helpers ──
  static isSupported(): boolean {
    return typeof navigator !== "undefined" && "serial" in navigator
  }

  static async listPreviouslyAuthorizedPorts(): Promise<WebSerialPort[]> {
    if (!navigator.serial) return []
    return navigator.serial.getPorts()
  }

  // ─── Conexão ──
  /**
   * Pede ao usuário (via diálogo do navegador) para escolher uma porta serial.
   * Precisa ser chamado DENTRO de um user gesture (click).
   * Se já existe uma porta pré-autorizada, pode ser passada via `existingPort`.
   */
  async requestAndOpen(existingPort?: WebSerialPort | null): Promise<void> {
    if (!navigator.serial) {
      throw new Error("Web Serial API não suportada. Use Chrome 89+, Edge 89+ ou Opera 75+.")
    }
    if (this.connected) {
      throw new Error("Já conectado. Desconecte primeiro.")
    }

    let port: WebSerialPort
    if (existingPort) {
      port = existingPort
    } else {
      try {
        port = await navigator.serial.requestPort({ filters: this.opts.filters })
      } catch (e) {
        // Usuário cancelou o diálogo
        throw new Error("Nenhuma porta selecionada.")
      }
    }

    await port.open({
      baudRate: this.opts.baudRate,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
      flowControl: "none",
      bufferSize: 16384,
    })

    this.port = port
    this.connected = true

    // Listener de disconnect físico
    this.disconnectHandler = () => {
      this.emit("error", "Porta serial desconectada fisicamente.")
      void this.disconnect()
    }
    port.addEventListener("disconnect", this.disconnectHandler)

    // Inicializa writer
    if (!port.writable) {
      await this.disconnect()
      throw new Error("Porta serial não tem writable stream.")
    }
    this.writer = port.writable.getWriter()

    // Inicia read loop em background
    if (!port.readable) {
      await this.disconnect()
      throw new Error("Porta serial não tem readable stream.")
    }
    this.reader = port.readable.getReader()
    this.readLoopPromise = this.readLoop().catch((err) => {
      this.emit("error", `Read loop falhou: ${err instanceof Error ? err.message : String(err)}`)
    })

    this.emit("info", `Porta serial aberta @ ${this.opts.baudRate} baud`)
  }

  // PrinterTransport.connect — para compat com mock, usa requestAndOpen
  async connect(): Promise<void> {
    return this.requestAndOpen()
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return
    this.connected = false

    try {
      if (this.reader) {
        try { await this.reader.cancel() } catch {}
        try { this.reader.releaseLock() } catch {}
        this.reader = null
      }
      if (this.writer) {
        try { await this.writer.close() } catch {}
        this.writer = null
      }
      if (this.port) {
        if (this.disconnectHandler) {
          try { this.port.removeEventListener("disconnect", this.disconnectHandler) } catch {}
          this.disconnectHandler = null
        }
        try { await this.port.close() } catch {}
        this.port = null
      }
      this.buffer = ""
      this.emit("info", "Porta serial fechada.")
    } catch (e) {
      this.emit("error", `Erro ao desconectar: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  isConnected(): boolean {
    return this.connected
  }

  async write(line: string): Promise<void> {
    if (!this.writer || !this.connected) {
      throw new Error("Não conectado.")
    }
    const withNewline = line.endsWith("\n") ? line : line + "\n"
    const data = new TextEncoder().encode(withNewline)
    await this.writer.write(data)
  }

  /** Envia M112 emergency stop. Não passa pelo controller. */
  async emergencyStop(): Promise<void> {
    if (!this.connected) return
    try {
      await this.write("M112")
      this.emit("error", "M112 (emergency stop) enviado.")
    } catch (e) {
      this.emit("error", `M112 falhou: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  onMessage(fn: (msg: IncomingMessage) => void): () => void {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }

  // ─── Read loop ──
  private async readLoop(): Promise<void> {
    if (!this.reader) return
    const decoder = new TextDecoder()
    try {
      while (this.connected) {
        const { value, done } = await this.reader.read()
        if (done) break
        this.buffer += decoder.decode(value, { stream: true })
        // Quebra em linhas
        let idx: number
        while ((idx = this.buffer.indexOf("\n")) >= 0) {
          const line = this.buffer.slice(0, idx).replace(/\r$/, "").trim()
          this.buffer = this.buffer.slice(idx + 1)
          if (line.length === 0) continue
          const kind = classifyIncoming(line)
          this.emit(kind, line)
        }
      }
    } catch (e) {
      if (this.connected) {
        this.emit("error", `Leitura interrompida: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  private emit(kind: IncomingKind, text: string): void {
    const msg: IncomingMessage = { kind, text, ts: Date.now() }
    for (const fn of this.listeners) {
      try { fn(msg) } catch {}
    }
  }

  // ─── Info da porta ──
  getPortInfo(): WebSerialPortInfo | null {
    return this.port?.getInfo() ?? null
  }
}

// ─── Handshake M115 ─────────────────────────────────────────────────────

/**
 * Envia M115 e aguarda a resposta com timeout. Coleta as linhas de info+caps
 * até receber "ok". Retorna FirmwareInfo parseado.
 *
 * Pode ser usado tanto com PrinterConnection real quanto com PrinterMock —
 * basta passar qualquer PrinterTransport.
 */
export async function handshakeM115(
  transport: PrinterTransport,
  timeoutMs = 5000,
): Promise<FirmwareInfo> {
  return new Promise<FirmwareInfo>((resolve, reject) => {
    const collected: string[] = []
    let resolved = false

    const off = transport.onMessage((msg) => {
      if (resolved) return
      if (msg.kind === "info" || msg.kind === "rx" || msg.kind === "echo") {
        collected.push(msg.text)
      } else if (msg.kind === "ok") {
        resolved = true
        off()
        clearTimeout(timer)
        resolve(parseM115Response(collected))
      } else if (msg.kind === "error") {
        resolved = true
        off()
        clearTimeout(timer)
        reject(new Error(`Erro no handshake: ${msg.text}`))
      }
    })

    const timer = setTimeout(() => {
      if (resolved) return
      resolved = true
      off()
      if (collected.length === 0) {
        reject(new Error(`Handshake M115 timeout após ${timeoutMs}ms (nenhuma resposta).`))
      } else {
        // Mesmo sem 'ok', se coletou algo, considera parcial
        resolve(parseM115Response(collected))
      }
    }, timeoutMs)

    transport.write("M115").catch((err) => {
      if (resolved) return
      resolved = true
      off()
      clearTimeout(timer)
      reject(err)
    })
  })
}

export function parseM115Response(lines: string[]): FirmwareInfo {
  const raw = lines.join("\n")
  const caps: Record<string, string> = {}
  let name: string | undefined
  let version: string | undefined
  let family: FirmwareInfo["family"] = "unknown"

  for (const ln of lines) {
    const t = ln.trim()
    // FIRMWARE_NAME:Marlin 2.1.2 (Aug 13 2023 16:00:00)
    const fwMatch = t.match(/FIRMWARE_NAME:\s*(\S+)\s*([^\s]+)?/i)
    if (fwMatch) {
      name = fwMatch[1]
      version = fwMatch[2]
    }
    // Cap:EEPROM:1
    const capMatch = t.match(/^Cap:([A-Z0-9_]+):(\S+)/i)
    if (capMatch) {
      caps[capMatch[1].toUpperCase()] = capMatch[2]
    }
  }

  const lower = raw.toLowerCase()
  if (lower.includes("marlin")) family = "marlin"
  else if (lower.includes("klipper")) family = "klipper"
  else if (lower.includes("reprap")) family = "reprap"
  else if (lower.includes("grbl")) family = "grbl"

  return { raw, name, version, family, caps }
}
