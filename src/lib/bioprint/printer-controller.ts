/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · PrinterController — Streamer de G-code com ok-handshake
 *  ─────────────────────────────────────────────────────────────────────
 *  Implementa o protocolo correto Marlin/RepRap:
 *    1. Envia uma linha
 *    2. Espera "ok" do firmware (com timeout configurável)
 *    3. Trata "busy: processing" → continua aguardando, NÃO conta como erro
 *    4. Trata "wait" → continua aguardando
 *    5. Trata "echo:..." → loga, continua aguardando
 *    6. Trata "Error:..." → para, marca erro, opcionalmente retry
 *    7. Implementa Resend (N: + checksum) — futuro, fase 2
 *
 *  Estados: idle | streaming | paused | aborting | completed | error
 *  Eventos: progress, line, state-change, finished
 *
 *  Botões disponíveis:
 *    · start(gcode) — começa streaming
 *    · pause() — espera fim da linha atual, depois para
 *    · resume() — continua de onde parou
 *    · cancel() — para e envia footer de segurança (M104 S0, M140 S0, M84)
 *    · emergency() — envia M112 imediato (via transport)
 *    · sendOnce(cmd) — manda comando fora do stream (jog do joystick, M114, etc.)
 *
 *  R12.15 — Pipeline real de execução USB
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import type { PrinterTransport, IncomingMessage } from "./printer-connection"
import type { PrintLogger } from "./print-logger"

export type ControllerState =
  | "idle"
  | "connecting"
  | "ready"
  | "streaming"
  | "paused"
  | "aborting"
  | "completed"
  | "error"

export interface StreamProgress {
  current: number     // 1-based
  total: number
  percent: number
  currentLine: string
  /** Estimativa de layer atual com base no Z (heurística leve) */
  currentLayer: number
  elapsedMs: number
  remainingMsEst: number | null
}

export interface ControllerEvents {
  onState?: (s: ControllerState) => void
  onProgress?: (p: StreamProgress) => void
  onLine?: (line: string, kind: "tx" | "rx") => void
  onFinished?: (success: boolean, reason: string) => void
}

export interface ControllerOptions {
  /** Timeout para receber "ok" de cada linha (ms). Default 30s. */
  okTimeoutMs?: number
  /** Quantas vezes tentar reenviar uma linha após timeout */
  maxRetries?: number
  /** Footer de segurança ao cancelar/completar */
  safetyFooter?: string[]
  /** Filtra linhas vazias e comentários puros (default true) */
  stripComments?: boolean
}

const DEFAULT_OPTS: Required<ControllerOptions> = {
  okTimeoutMs: 30000,
  maxRetries: 2,
  safetyFooter: [
    "M104 S0  ; desliga hotend (cartucho)",
    "M140 S0  ; desliga bed (cama)",
    "M141 S0  ; desliga câmara",
    "M84      ; desabilita motores",
  ],
  stripComments: true,
}

export class PrinterController {
  private transport: PrinterTransport
  private logger: PrintLogger
  private opts: Required<ControllerOptions>
  private events: ControllerEvents
  private state: ControllerState = "idle"

  // Fila de linhas
  private queue: string[] = []
  private index = 0
  private totalForProgress = 0
  private currentLayer = 0
  private lastZ = -Infinity
  private startedAt = 0

  // Sinal de pause / cancel
  private pauseRequested = false
  private cancelRequested = false

  // ok-await
  private pendingOkResolver: (() => void) | null = null
  private pendingErrorResolver: ((err: Error) => void) | null = null
  private offMessage: (() => void) | null = null

  // Tempo médio por linha (rolling avg para ETA)
  private avgLineTimeMs = 50

  constructor(
    transport: PrinterTransport,
    logger: PrintLogger,
    events: ControllerEvents = {},
    opts: ControllerOptions = {},
  ) {
    this.transport = transport
    this.logger = logger
    this.events = events
    this.opts = { ...DEFAULT_OPTS, ...opts }
    this.attachMessageListener()
  }

  // ─── Listener centralizado: as mesmas mensagens alimentam logger e ok-wait ──
  private attachMessageListener(): void {
    this.offMessage = this.transport.onMessage((msg) => this.handleIncoming(msg))
  }

  private handleIncoming(msg: IncomingMessage): void {
    // Loga sempre
    switch (msg.kind) {
      case "ok":    this.logger.ok(msg.text, "controller"); break
      case "error": this.logger.error(msg.text, "controller"); break
      case "busy":  this.logger.info(`(busy) ${msg.text}`, "controller"); break
      case "wait":  this.logger.info("(wait)", "controller"); break
      case "echo":  this.logger.info(msg.text, "controller"); break
      case "info":  this.logger.info(msg.text, "connection"); break
      default:      this.logger.rx(msg.text, "connection")
    }
    this.events.onLine?.(msg.text, "rx")

    // ok → libera o waiter
    if (msg.kind === "ok") {
      if (this.pendingOkResolver) {
        this.pendingOkResolver()
        this.pendingOkResolver = null
        this.pendingErrorResolver = null
      }
      return
    }

    // error → rejeita
    if (msg.kind === "error") {
      if (this.pendingErrorResolver) {
        this.pendingErrorResolver(new Error(msg.text))
        this.pendingErrorResolver = null
        this.pendingOkResolver = null
      }
      return
    }
    // busy/wait/echo → continua esperando (não toca os resolvers)
  }

  // ─── Estado ──
  getState(): ControllerState { return this.state }

  private setState(s: ControllerState): void {
    if (this.state === s) return
    this.state = s
    this.logger.info(`Estado: ${s}`, "controller")
    this.events.onState?.(s)
  }

  // ─── Comandos avulsos (fora do stream) ──
  async sendOnce(cmd: string): Promise<void> {
    const clean = cmd.trim()
    if (!clean) return
    this.logger.tx(clean, "manual")
    this.events.onLine?.(clean, "tx")
    await this.transport.write(clean)
  }

  /** Envia comando avulso AGUARDANDO ok (para handshake, M114, etc.) */
  async sendAndWait(cmd: string, timeoutMs?: number): Promise<void> {
    const clean = cmd.trim()
    if (!clean) return
    const t = timeoutMs ?? this.opts.okTimeoutMs
    this.logger.tx(clean, "manual")
    this.events.onLine?.(clean, "tx")

    // CRÍTICO: arma o waiter ANTES do write, senão o ok pode chegar antes
    const waiter = this.armOkWaiter(t)
    try {
      await this.transport.write(clean)
      await waiter
    } catch (e) {
      throw e
    }
  }

  /**
   * Cria um Promise que resolve no próximo "ok" / rejeita em "error" ou timeout.
   * IMPORTANTE: deve ser chamado ANTES de transport.write() — o transporte
   * (especialmente o mock) pode emitir o ok síncronamente DURANTE o write.
   */
  private armOkWaiter(timeoutMs: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
        if (this.pendingOkResolver === wrappedResolve) {
          this.pendingOkResolver = null
          this.pendingErrorResolver = null
        }
        timer = null
        reject(new Error(`Timeout esperando 'ok' após ${timeoutMs}ms`))
      }, timeoutMs)

      const wrappedResolve = () => {
        if (timer) { clearTimeout(timer); timer = null }
        resolve()
      }
      const wrappedReject = (err: Error) => {
        if (timer) { clearTimeout(timer); timer = null }
        reject(err)
      }

      this.pendingOkResolver = wrappedResolve
      this.pendingErrorResolver = wrappedReject
    })
  }

  // ─── Streaming ──
  /**
   * Inicia o streaming de um G-code. Resolve quando o stream termina
   * (completed, paused, cancelled, error).
   */
  async start(gcode: string): Promise<void> {
    if (this.state === "streaming" || this.state === "paused") {
      throw new Error("Já existe uma impressão em andamento.")
    }
    if (!this.transport.isConnected()) {
      throw new Error("Transport não conectado. Conecte a impressora primeiro.")
    }

    // Prepara fila
    this.queue = this.prepareQueue(gcode)
    this.totalForProgress = this.queue.length
    this.index = 0
    this.pauseRequested = false
    this.cancelRequested = false
    this.currentLayer = 0
    this.lastZ = -Infinity
    this.startedAt = Date.now()
    this.logger.markStart()
    this.logger.info(`Iniciando stream de ${this.totalForProgress} linhas`, "controller")

    this.setState("streaming")
    await this.runLoop()
  }

  private prepareQueue(gcode: string): string[] {
    return gcode
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => {
        if (!l) return false
        if (this.opts.stripComments && l.startsWith(";")) return false
        return true
      })
      .map((l) => {
        // Remove comentários inline (após ;) — Marlin aceita mas é desperdício de buffer
        const semi = l.indexOf(";")
        return semi >= 0 ? l.slice(0, semi).trim() : l
      })
      .filter((l) => l.length > 0)
  }

  private async runLoop(): Promise<void> {
    let lineStart = Date.now()
    while (this.index < this.queue.length) {
      // Cancelamento
      if (this.cancelRequested) {
        this.logger.warn("Cancelado pelo usuário.", "controller")
        await this.executeSafetyFooter()
        this.setState("idle")
        this.events.onFinished?.(false, "cancelled")
        return
      }

      // Pausa cooperativa (espera fim da linha atual)
      if (this.pauseRequested) {
        this.setState("paused")
        this.logger.warn("Pausado.", "controller")
        // Aguarda resume() liberar
        await this.waitForResume()
        if (this.cancelRequested) continue
        this.setState("streaming")
        this.logger.info("Retomado.", "controller")
      }

      const line = this.queue[this.index]
      // Atualiza heurística de layer baseada em Z
      this.updateLayerFromLine(line)

      // Envia + aguarda ok com retry
      let success = false
      let lastErr: Error | null = null
      for (let attempt = 0; attempt <= this.opts.maxRetries; attempt++) {
        try {
          this.logger.tx(line, "controller")
          this.events.onLine?.(line, "tx")
          // CRÍTICO: arma o waiter ANTES do write
          const waiter = this.armOkWaiter(this.opts.okTimeoutMs)
          await this.transport.write(line)
          await waiter
          success = true
          break
        } catch (e) {
          lastErr = e instanceof Error ? e : new Error(String(e))
          this.logger.error(`Linha ${this.index + 1} falhou (tentativa ${attempt + 1}): ${lastErr.message}`, "controller")
          if (attempt < this.opts.maxRetries) {
            await this.delay(200)
            this.logger.info(`Retry linha ${this.index + 1}…`, "controller")
          }
        }
      }

      if (!success) {
        this.setState("error")
        this.logger.error(`Stream abortado na linha ${this.index + 1}: ${lastErr?.message ?? "erro desconhecido"}`, "controller")
        await this.executeSafetyFooter()
        this.events.onFinished?.(false, `error: ${lastErr?.message ?? "unknown"}`)
        return
      }

      // Atualiza tempo médio por linha (rolling avg)
      const now = Date.now()
      const dt = now - lineStart
      this.avgLineTimeMs = this.avgLineTimeMs * 0.9 + dt * 0.1
      lineStart = now

      this.index++

      // Emite progresso
      const elapsed = now - this.startedAt
      const remaining = this.totalForProgress - this.index
      const remainingMsEst = remaining > 0 ? Math.round(remaining * this.avgLineTimeMs) : 0
      this.events.onProgress?.({
        current: this.index,
        total: this.totalForProgress,
        percent: (this.index / this.totalForProgress) * 100,
        currentLine: line,
        currentLayer: this.currentLayer,
        elapsedMs: elapsed,
        remainingMsEst,
      })
    }

    // Fim normal
    this.setState("completed")
    this.logger.ok(`Stream concluído (${this.totalForProgress} linhas)`, "controller")
    this.events.onFinished?.(true, "completed")
  }

  private updateLayerFromLine(line: string): void {
    // Heurística: cada novo Z único é um layer (não funciona com vase-mode mas
    // serve para a UI ter algo razoável)
    if (line.startsWith("G0") || line.startsWith("G1")) {
      const m = line.match(/\bZ([-\d.]+)/)
      if (m) {
        const z = parseFloat(m[1])
        if (Number.isFinite(z) && z > this.lastZ + 0.001) {
          this.currentLayer++
          this.lastZ = z
        }
      }
    }
  }

  // ─── Pause / Resume / Cancel ──
  pause(): void {
    if (this.state !== "streaming") return
    this.pauseRequested = true
  }

  private resumeResolver: (() => void) | null = null
  resume(): void {
    if (this.state !== "paused") return
    this.pauseRequested = false
    if (this.resumeResolver) {
      this.resumeResolver()
      this.resumeResolver = null
    }
  }

  private waitForResume(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.resumeResolver = resolve
    })
  }

  cancel(): void {
    this.cancelRequested = true
    // Se está pausado, libera para o loop ver o cancel
    if (this.resumeResolver) {
      this.resumeResolver()
      this.resumeResolver = null
    }
  }

  /** Envia M112 emergency stop direto pelo transport (não passa pela fila). */
  async emergency(): Promise<void> {
    this.cancelRequested = true
    this.setState("aborting")
    this.logger.error("EMERGENCY STOP — M112", "controller")
    try {
      await this.transport.write("M112")
    } catch (e) {
      this.logger.error(`M112 falhou: ${e instanceof Error ? e.message : String(e)}`, "controller")
    }
    this.setState("error")
    this.events.onFinished?.(false, "emergency")
  }

  // ─── Footer de segurança ──
  private async executeSafetyFooter(): Promise<void> {
    if (!this.transport.isConnected()) return
    this.logger.info("Enviando footer de segurança…", "controller")
    for (const cmd of this.opts.safetyFooter) {
      try {
        // Strip comentário inline
        const semi = cmd.indexOf(";")
        const clean = (semi >= 0 ? cmd.slice(0, semi) : cmd).trim()
        if (!clean) continue
        this.logger.tx(clean, "footer")
        const waiter = this.armOkWaiter(2000)
        await this.transport.write(clean)
        // Espera ok com timeout curto, mas não falha se não vier
        try { await waiter } catch {}
      } catch (e) {
        this.logger.warn(`Footer falhou: ${e instanceof Error ? e.message : String(e)}`, "footer")
      }
    }
  }

  // ─── Cleanup ──
  destroy(): void {
    if (this.offMessage) {
      this.offMessage()
      this.offMessage = null
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms))
  }
}
