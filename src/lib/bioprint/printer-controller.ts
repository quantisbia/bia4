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
 *    · cancel() — para e envia footer de segurança (M104 S0, M140 S0, M141 S0)
 *      [R12.20] M84 removido do footer — motor fica ligado até o usuário desligar manualmente.
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
    // R12.20: M84 removido — motor permanece ligado até o usuário desligar
    // manualmente via botões "M18 Off" / "M84 Off" no painel de comandos rápidos.
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

  // R12.39: fila de injeção (jog, M220, M221) processada pelo runLoop ENTRE
  // linhas do G-code para evitar conflito de waiters (apenas 1 pendingOkResolver
  // existe globalmente — se sendAndWait for chamado durante runLoop, o waiter
  // do runLoop é sobrescrito e a linha em curso perde sua resolução de ok).
  //
  // A fila é drenada no início de cada iteração do runLoop, ANTES de enviar
  // a próxima linha do stream. Cada comando injetado é enviado com handshake
  // `ok` normal — Marlin processa M220/M221/jog antes da próxima linha do
  // stream. Latência típica: 50-300ms (uma linha do stream).
  private injectionQueue: Array<{ cmd: string; tag: string }> = []

  // ok-await
  private pendingOkResolver: (() => void) | null = null
  private pendingErrorResolver: ((err: Error) => void) | null = null
  private offMessage: (() => void) | null = null

  /**
   * R12.33: Contador de "ok"s órfãos a ignorar antes de aceitar o próximo
   * "ok" como resolução do waiter atual.
   *
   * Cenário do bug que isso resolve:
   *   1) sendAndWait("G28") arma waiter A com timeout 30s.
   *   2) G28 demora 31s no firmware real → timeout dispara, waiter A rejeita.
   *   3) ~1s depois, o "ok" REAL do G28 chega pela serial.
   *   4) Sem isso, esse "ok" vazaria → resolveria QUALQUER waiter novo
   *      (jog, M114, qualquer coisa) prematuramente, criando um efeito
   *      cascata onde cada waiter resolve com o ok do comando ANTERIOR.
   *      Resultado: joystick parece travado (cada clique aparenta funcionar
   *      mas o firmware está sempre um passo atrás).
   *
   * Solução: ao detectar timeout, incrementamos staleOksToIgnore. Cada
   * "ok" recebido enquanto este contador > 0 é DESCARTADO silenciosamente
   * (mas logado) sem tocar no waiter atual.
   */
  private staleOksToIgnore = 0

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

    // ok → libera o waiter (a menos que seja "ok" órfão de comando que deu timeout)
    if (msg.kind === "ok") {
      // R12.33: drena "ok"s atrasados de comandos que deram timeout antes
      // do firmware responder. Sem isso eles vazariam e resolveriam o
      // próximo waiter prematuramente, criando o efeito "joystick travado".
      if (this.staleOksToIgnore > 0) {
        this.staleOksToIgnore--
        this.logger.info(
          `(ok órfão descartado — ${this.staleOksToIgnore} restantes)`,
          "controller",
        )
        return
      }
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
          // R12.33: o firmware ainda deve um "ok" para este comando — quando
          // ele finalmente chegar (depois do timeout), precisa ser descartado
          // em vez de resolver erroneamente o próximo waiter. Ver doc em
          // `staleOksToIgnore` para o cenário completo.
          this.staleOksToIgnore++
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

  /**
   * R12.33: Reseta o contador de oks órfãos. Usado pelo handleConnect /
   * handleResetAll após reconectar — começa uma sessão limpa sem dívidas
   * de "ok" de sessões anteriores.
   */
  resetOkDebt(): void {
    if (this.staleOksToIgnore > 0) {
      this.logger.info(
        `Resetando contador de ok órfãos (${this.staleOksToIgnore} descartados)`,
        "controller",
      )
      this.staleOksToIgnore = 0
    }
  }

  /**
   * R12.39: Injeta um comando em tempo real durante o streaming.
   *
   * Uso típico: jog do joystick (G91/G1/G90, E+/E-, Z+/Z-), M220 (feedrate
   * override), M221 (flow override), M114 (get position).
   *
   * COMPORTAMENTO:
   *   • Se o controller está em `streaming`, o comando entra na fila
   *     `injectionQueue` e é enviado pelo runLoop ANTES da próxima linha
   *     do stream. Não bloqueia o caller.
   *   • Se o controller está em `idle/ready/paused`, o comando é enviado
   *     diretamente via sendAndWait (handshake completo).
   *
   * IMPORTANTE: para comandos durante streaming, NÃO retorna Promise<ok> —
   * é fire-and-forget. Se você precisa esperar o ok, use sendAndWait
   * fora do streaming. Isto é por design: durante streaming, await
   * causaria deadlock (estaríamos esperando ok do runLoop, mas o runLoop
   * está esperando seu próprio ok).
   *
   * O comando jog típico envolve 3 linhas (G91 + G1 + G90). Use múltiplas
   * chamadas inject() ou chame em loop que as 3 entram em ordem na fila.
   */
  inject(cmd: string, tag: string = "inject"): void {
    const clean = cmd.trim()
    if (!clean) return
    // Fora do streaming → envia direto (fire-and-forget) para latência mínima.
    // Não esperamos `ok` porque o caller usa inject() em contextos onde não
    // pode bloquear (eventos de UI rápidos como slider arrastando).
    if (this.state !== "streaming" && this.state !== "paused") {
      this.logger.tx(`${clean}  (inject direto)`, tag)
      this.events.onLine?.(clean, "tx")
      void this.transport.write(clean).catch((e) => {
        this.logger.warn(
          `Inject direto falhou: ${e instanceof Error ? e.message : String(e)}`,
          tag,
        )
      })
      return
    }
    // Em streaming/paused → enfileira para o runLoop processar entre linhas
    this.injectionQueue.push({ cmd: clean, tag })
    this.logger.info(
      `Inject enfileirado (${this.injectionQueue.length} pendente${this.injectionQueue.length === 1 ? "" : "s"}): ${clean}`,
      tag,
    )
  }

  /**
   * R12.39: Versão que ESPERA o ok do comando injetado. Use APENAS fora
   * do streaming (idle/ready/paused). Durante streaming usar inject()
   * (que não bloqueia).
   *
   * Internamente é um alias para sendAndWait quando idle, ou enfileira e
   * espera o flush quando paused/streaming (em streaming, isso bloqueia
   * até o runLoop drenar a fila — pode ser lento se houver fila longa).
   */
  async injectAndWait(cmd: string, timeoutMs?: number): Promise<void> {
    const clean = cmd.trim()
    if (!clean) return
    if (this.state !== "streaming" && this.state !== "paused") {
      return this.sendAndWait(clean, timeoutMs)
    }
    // Em streaming/paused, sendAndWait causaria conflito de waiter — força
    // a injeção via fila. Não há feedback de ok aqui (não dá pra esperar
    // sem deadlock). Usuário deve preferir inject() em streaming.
    this.inject(clean, "inject-wait")
  }

  /** R12.39: Drena a fila de injeção dentro do runLoop. NUNCA chame externamente. */
  private async drainInjectionQueue(): Promise<void> {
    while (this.injectionQueue.length > 0) {
      const item = this.injectionQueue.shift()!
      try {
        this.logger.tx(`${item.cmd}  (injetado)`, item.tag)
        this.events.onLine?.(item.cmd, "tx")
        // Mesmo padrão do runLoop: arma waiter ANTES do write.
        // Timeout um pouco menor (10s) porque comandos de jog/M220 são
        // rápidos no Marlin — se demorar mais, algo está errado e
        // não queremos travar o stream principal.
        const waiter = this.armOkWaiter(10000)
        await this.transport.write(item.cmd)
        await waiter
      } catch (e) {
        // Comando injetado falhou — loga mas NÃO aborta o stream.
        // O usuário pode retentar o jog/slider.
        this.logger.warn(
          `Comando injetado "${item.cmd}" falhou: ${e instanceof Error ? e.message : String(e)} — continuando stream.`,
          item.tag,
        )
      }
    }
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
        // R12.39: durante pausa, ainda drenamos injeções (jog, M220, M221)
        // periodicamente, para o usuário poder ajustar fluxo/posição.
        // O waitForResume é interrompido por uma nova injeção via um polling
        // leve (200ms) — implementação simples e robusta.
        await this.waitForResumeWithInjections()
        if (this.cancelRequested) continue
        this.setState("streaming")
        this.logger.info("Retomado.", "controller")
      }

      // R12.39: drena fila de injeção (jog, M220, M221) ANTES da próxima
      // linha do stream. Isso garante que comandos do usuário (joystick,
      // sliders) sejam aplicados em ~50-300ms (latência de uma linha) sem
      // conflitar com o waiter do runLoop.
      if (this.injectionQueue.length > 0) {
        await this.drainInjectionQueue()
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

  /**
   * R12.39: variante do waitForResume que processa injeções (jog, M220, M221)
   * durante a pausa. Implementação: polling a 200ms — se houver itens na
   * fila e não estivermos retomados, drena-os. Continua até resume() ser
   * chamado (resumeResolver disparado).
   *
   * Por que polling em vez de notificação event-driven: simplicidade. A
   * frequência de injeções durante pausa é baixa (usuário ajustando manualmente),
   * e 200ms de latência é imperceptível.
   */
  private async waitForResumeWithInjections(): Promise<void> {
    const resumed = new Promise<void>((resolve) => {
      this.resumeResolver = resolve
    })
    let done = false
    void resumed.then(() => { done = true })
    while (!done) {
      if (this.injectionQueue.length > 0) {
        await this.drainInjectionQueue()
      }
      // Espera 200ms ou até resume disparar (o que vier primeiro)
      await Promise.race([
        this.delay(200),
        resumed,
      ])
    }
  }

  cancel(): void {
    this.cancelRequested = true
    // R12.39: descarta injeções pendentes — segurança ao cancelar.
    if (this.injectionQueue.length > 0) {
      this.logger.warn(
        `Cancel: descartando ${this.injectionQueue.length} comando(s) injetado(s) pendente(s).`,
        "controller",
      )
      this.injectionQueue = []
    }
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
