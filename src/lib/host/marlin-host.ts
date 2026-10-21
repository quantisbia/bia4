/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R15 · MarlinHost — host profissional para bioimpressoras
 *  Marlin/Klipper/RepRap (Ender · BioEnder · Enderstruder · Replistruder)
 *  ─────────────────────────────────────────────────────────────────────
 *   · Linhas numeradas com checksum (N123 G1 … *67) → "Resend: N" tratado.
 *   · Janela de envio ("in-flight") 1–6 — aproveita o planner buffer.
 *   · Classificação: ok / busy / wait / echo / Error / Resend / temps / posição.
 *   · Autoreport M155 ou polling M105; M114 opcional.
 *   · Pausa segura com script (M400 → retrai → Z+5) e retomada no ponto.
 *   · Fila de injeção prioritária (jog, M220/M221, macros de seringa).
 *   · Progresso por camada (;LAYER:n), ETA, resends. Emergência M112.
 *  Usa a interface PrinterTransport (PrinterConnection USB ou PrinterMock).
 * ═══════════════════════════════════════════════════════════════════════
 */

import type { PrinterTransport, IncomingMessage } from "@/lib/bioprint/printer-connection"

export type HostState = "disconnected" | "connected" | "printing" | "pausing" | "paused" | "resuming" | "cancelling" | "finished" | "error"

export interface HostTemps {
  hotend_C: number | null; hotendTarget_C: number | null
  bed_C: number | null; bedTarget_C: number | null
  chamber_C: number | null; ts: number
}
export interface HostPosition { x: number; y: number; z: number; e: number; ts: number }
export interface HostProgress {
  sent: number; acked: number; total: number; percent: number
  layer: number; layerCount: number | null
  elapsed_s: number; eta_s: number | null; lps: number; resends: number; inFlight: number
}
export interface HostEvents {
  onState?: (s: HostState, reason?: string) => void
  onProgress?: (p: HostProgress) => void
  onTemps?: (t: HostTemps) => void
  onPosition?: (p: HostPosition) => void
  onLog?: (kind: "tx" | "rx" | "info" | "warn" | "error", text: string) => void
  onFinished?: (ok: boolean, reason: string) => void
}
export interface HostOptions {
  window?: number
  lineNumbers?: boolean
  okTimeout_ms?: number
  tempPoll_ms?: number
  posPoll_ms?: number
  tryAutoreport?: boolean
  pauseScript?: string[]
  resumeScript?: string[]
  safetyFooter?: string[]
  stripComments?: boolean
  firmware?: "marlin" | "klipper" | "reprap" | "unknown"
}

const DEFAULTS: Required<HostOptions> = {
  window: 2, lineNumbers: true, okTimeout_ms: 45000, tempPoll_ms: 3000, posPoll_ms: 0, tryAutoreport: true,
  pauseScript: ["G91", "G1 E-0.3 F120", "G1 Z5 F300", "G90"],
  resumeScript: ["G91", "G1 Z-5 F300", "G1 E0.3 F120", "G90"],
  safetyFooter: ["M104 S0", "M140 S0"],
  stripComments: true, firmware: "marlin",
}

export interface PendingLine { n: number; idx: number; raw: string; cmd: string; sentAt: number }

export function marlinChecksum(line: string): number {
  let cs = 0
  for (let i = 0; i < line.length; i++) cs ^= line.charCodeAt(i)
  return cs & 0xff
}

export function parseTemps(text: string): Partial<HostTemps> | null {
  const t = text.match(/\bT0?:\s*(-?[\d.]+)\s*\/\s*(-?[\d.]+)/)
  const b = text.match(/\bB:\s*(-?[\d.]+)\s*\/\s*(-?[\d.]+)/)
  const c = text.match(/\bC:\s*(-?[\d.]+)/)
  if (!t && !b) return null
  return {
    hotend_C: t ? +t[1] : null, hotendTarget_C: t ? +t[2] : null,
    bed_C: b ? +b[1] : null, bedTarget_C: b ? +b[2] : null,
    chamber_C: c ? +c[1] : null,
  }
}

export function parsePosition(text: string): Omit<HostPosition, "ts"> | null {
  const m = text.match(/\bX:\s*(-?[\d.]+)\s+Y:\s*(-?[\d.]+)\s+Z:\s*(-?[\d.]+)(?:\s+E:\s*(-?[\d.]+))?/)
  if (!m) return null
  return { x: +m[1], y: +m[2], z: +m[3], e: m[4] ? +m[4] : 0 }
}

export function stripComment(l: string): string {
  const s = l.indexOf(";")
  return (s >= 0 ? l.slice(0, s) : l).trim()
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Waiter = { resolve: () => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout>; n: number }

export class MarlinHost {
  private t: PrinterTransport
  private ev: HostEvents
  private o: Required<HostOptions>
  private state: HostState = "disconnected"
  private off: (() => void) | null = null

  private queue: string[] = []
  private layerAt: number[] = []
  private layerCount: number | null = null
  private nextIdx = 0
  private lineNo = 1
  private pending: PendingLine[] = []
  private resends = 0
  private ackedCount = 0
  private startedAt = 0
  private rateWindow: number[] = []
  private pauseReq = false
  private cancelReq = false
  private waiting: Waiter[] = []
  private injectQueue: Array<{ cmd: string; resolve: () => void; reject: (e: Error) => void }> = []
  private busyLoop = false
  private retries = new Map<number, number>()

  private tempTimer: ReturnType<typeof setInterval> | null = null
  private posTimer: ReturnType<typeof setInterval> | null = null
  private pausedPos: HostPosition | null = null
  private staleOks = 0
  private lastTemps: HostTemps = { hotend_C: null, hotendTarget_C: null, bed_C: null, bedTarget_C: null, chamber_C: null, ts: 0 }
  private lastPos: HostPosition | null = null
  private autoreportOk = false

  constructor(transport: PrinterTransport, events: HostEvents = {}, opts: HostOptions = {}) {
    this.t = transport
    this.ev = events
    this.o = { ...DEFAULTS, ...opts }
    if (this.o.firmware === "klipper") this.o.lineNumbers = false
    this.off = this.t.onMessage((m) => this.onIncoming(m))
    if (this.t.isConnected()) this.setState("connected")
  }

  getState(): HostState { return this.state }
  getTemps(): HostTemps { return this.lastTemps }
  getPosition(): HostPosition | null { return this.lastPos }
  private setState(s: HostState, reason?: string) {
    if (this.state === s) return
    this.state = s
    this.ev.onState?.(s, reason)
  }
  private log(kind: "tx" | "rx" | "info" | "warn" | "error", text: string) { this.ev.onLog?.(kind, text) }

  async connect(): Promise<void> {
    if (!this.t.isConnected()) await this.t.connect()
    this.setState("connected")
    try {
      if (this.o.lineNumbers) await this.sendRaw("M110 N0", 5000)
      this.lineNo = 1
    } catch (e) { this.log("warn", `M110 falhou: ${(e as Error).message}`) }
    try { await this.sendRaw("M115", 5000) } catch { /* alguns firmwares demoram */ }
    this.startPolling()
  }

  async disconnect(): Promise<void> {
    this.stopPolling()
    if (this.state === "printing" || this.state === "paused") this.cancel()
    await this.t.disconnect()
    this.setState("disconnected")
  }

  destroy(): void {
    this.stopPolling()
    this.off?.()
    this.off = null
  }

  private startPolling() {
    this.stopPolling()
    if (this.o.tempPoll_ms > 0) {
      if (this.o.tryAutoreport && this.o.firmware !== "klipper") {
        const sec = Math.max(1, Math.round(this.o.tempPoll_ms / 1000))
        this.inject(`M155 S${sec}`).then(() => { this.autoreportOk = true }).catch(() => { this.autoreportOk = false })
      }
      this.tempTimer = setInterval(() => {
        if (this.autoreportOk) return
        if (this.state !== "disconnected" && this.state !== "error") this.inject("M105").catch(() => {})
      }, this.o.tempPoll_ms)
    }
    if (this.o.posPoll_ms > 0) {
      this.posTimer = setInterval(() => {
        if (this.state === "connected" || this.state === "paused") this.inject("M114").catch(() => {})
      }, this.o.posPoll_ms)
    }
  }
  private stopPolling() {
    if (this.tempTimer) clearInterval(this.tempTimer)
    if (this.posTimer) clearInterval(this.posTimer)
    this.tempTimer = null; this.posTimer = null
    this.autoreportOk = false
  }

  private onIncoming(m: IncomingMessage) {
    const text = m.text
    this.log(m.kind === "error" ? "error" : "rx", text)

    const temps = parseTemps(text)
    if (temps) {
      this.lastTemps = { ...this.lastTemps, ...temps, ts: Date.now() }
      this.ev.onTemps?.(this.lastTemps)
    }
    const pos = parsePosition(text)
    if (pos && !/^ok\s*$/.test(text)) {
      this.lastPos = { ...pos, ts: Date.now() }
      this.ev.onPosition?.(this.lastPos)
    }

    const rs = text.match(/^(?:Resend|rs)\s*:?\s*N?(\d+)/i)
    if (rs) { this.handleResend(+rs[1]); return }

    if (m.kind === "ok" || /^ok\b/.test(text)) {
      if (this.staleOks > 0) { this.staleOks--; return }
      const okN = text.match(/^ok\s+N(\d+)/)
      this.ackOne(okN ? +okN[1] : undefined)
      return
    }
    if (m.kind === "error" || /^Error:/i.test(text)) {
      if (/checksum|Line Number|No Line Number/i.test(text)) return
      const w = this.waiting.shift()
      if (w) { clearTimeout(w.timer); w.reject(new Error(text)) }
      if (this.state === "printing") this.failPrint(text)
      return
    }
    if (m.kind === "busy") {
      for (const w of this.waiting) { clearTimeout(w.timer); w.timer = setTimeout(() => this.onTimeout(w.n), this.o.okTimeout_ms) }
    }
  }

  private ackOne(n?: number) {
    let w: Waiter | undefined
    if (n !== undefined) {
      const i = this.waiting.findIndex((x) => x.n === n)
      w = i >= 0 ? this.waiting.splice(i, 1)[0] : this.waiting.shift()
    } else {
      w = this.waiting.shift()
    }
    if (!w) return
    clearTimeout(w.timer)
    w.resolve()
  }

  private onTimeout(n: number) {
    const i = this.waiting.findIndex((x) => x.n === n)
    if (i < 0) return
    const w = this.waiting.splice(i, 1)[0]
    this.staleOks++
    w.reject(new Error(`timeout aguardando ok (N${n})`))
  }

  private handleResend(n: number) {
    this.resends++
    this.log("warn", `Resend solicitado a partir de N${n}`)
    const toResend = this.pending.filter((p) => p.n >= n).sort((a, b) => a.n - b.n)
    if (toResend.length === 0) {
      this.inject(`M110 N${n - 1}`).catch(() => {})
      return
    }
    for (const w of this.waiting) { clearTimeout(w.timer); w.reject(new Error("resend")) }
    this.waiting = []
    this.pending = this.pending.filter((p) => p.n < n)
    this.nextIdx = toResend[0].idx
    this.lineNo = n
    this.staleOks++ // Marlin envia "ok" após "Resend:" — absorve
  }

  private frame(cmd: string): { raw: string; n: number } {
    if (!this.o.lineNumbers) return { raw: cmd, n: -1 }
    const n = this.lineNo++
    const body = `N${n} ${cmd}`
    return { raw: `${body}*${marlinChecksum(body)}`, n }
  }

  async sendRaw(cmd: string, timeout = this.o.okTimeout_ms): Promise<void> {
    const clean = stripComment(cmd)
    if (!clean) return
    const { raw, n } = this.frame(clean)
    const p = this.armWaiter(n, timeout)
    this.log("tx", raw)
    await this.t.write(raw)
    await p
  }

  private armWaiter(n: number, timeout: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => this.onTimeout(n), timeout)
      this.waiting.push({ resolve, reject, timer, n })
    })
  }

  inject(cmd: string): Promise<void> {
    const clean = stripComment(cmd)
    if (!clean) return Promise.resolve()
    if (this.state !== "printing" && this.state !== "pausing" && this.state !== "resuming" && this.waiting.length === 0) {
      return this.sendRaw(clean)
    }
    return new Promise<void>((resolve, reject) => {
      this.injectQueue.push({ cmd: clean, resolve, reject })
      if (this.state !== "printing") this.drainInjections().catch(() => {})
    })
  }

  private async drainInjections() {
    if (this.busyLoop) return
    this.busyLoop = true
    try {
      while (this.injectQueue.length) {
        const j = this.injectQueue.shift()!
        try { await this.sendRaw(j.cmd); j.resolve() } catch (e) { j.reject(e as Error) }
      }
    } finally { this.busyLoop = false }
  }

  load(gcode: string): { lines: number; layers: number | null } {
    const lines = gcode.split(/\r?\n/)
    this.queue = []; this.layerAt = []; this.layerCount = null
    let layer = 0, maxLayer = -1
    for (const l0 of lines) {
      const l = l0.trim()
      const lm = l.match(/^;LAYER:(\d+)/)
      if (lm) { layer = +lm[1]; if (layer > maxLayer) maxLayer = layer; continue }
      const lc = l.match(/^;LAYER_COUNT:(\d+)/)
      if (lc) { this.layerCount = +lc[1]; continue }
      const cmd = this.o.stripComments ? stripComment(l) : l
      if (!cmd) continue
      this.queue.push(cmd)
      this.layerAt.push(layer)
    }
    if (this.layerCount === null && maxLayer >= 0) this.layerCount = maxLayer + 1
    return { lines: this.queue.length, layers: this.layerCount }
  }

  async start(gcode?: string): Promise<void> {
    if (gcode !== undefined) this.load(gcode)
    if (this.queue.length === 0) throw new Error("Nenhum G-code carregado.")
    if (!this.t.isConnected()) throw new Error("Impressora não conectada.")
    if (this.state === "printing" || this.state === "paused") throw new Error("Já há uma impressão em curso.")
    this.nextIdx = 0; this.pending = []; this.resends = 0; this.ackedCount = 0
    this.pauseReq = false; this.cancelReq = false; this.rateWindow = []; this.retries.clear()
    this.startedAt = Date.now()
    if (this.o.lineNumbers) {
      try { await this.sendRaw("M110 N0", 5000) } catch { /* ignore */ }
      this.lineNo = 1
    }
    this.setState("printing")
    this.runLoop().catch((e) => this.failPrint((e as Error).message))
  }

  private async runLoop() {
    while (this.nextIdx < this.queue.length || this.pending.length > 0) {
      if (this.cancelReq) { await this.doCancel(); return }
      if (this.pauseReq && this.pending.length === 0) {
        await this.doPause()
        if (this.cancelReq) { await this.doCancel(); return }
      }
      if (this.injectQueue.length && this.pending.length === 0) {
        const j = this.injectQueue.shift()!
        try { await this.sendRaw(j.cmd); j.resolve() } catch (e) { j.reject(e as Error) }
        continue
      }
      while (this.pending.length < this.o.window && this.nextIdx < this.queue.length && !this.pauseReq && !this.cancelReq) {
        const idx = this.nextIdx++
        const cmd = this.queue[idx]
        const { raw, n } = this.frame(cmd)
        const pl: PendingLine = { n: n < 0 ? idx : n, idx, raw, cmd, sentAt: Date.now() }
        this.pending.push(pl)
        const waiter = this.armWaiter(pl.n, this.o.okTimeout_ms)
        this.log("tx", raw)
        try { await this.t.write(raw) } catch (e) { this.failPrint(`write falhou: ${(e as Error).message}`); return }
        const blocking = /^(M109|M190|M191|G4|M400|M0|M1|M25|M600|G28|G29|M112)\b/i.test(cmd)
        waiter.then(() => this.onAcked(pl)).catch((e) => this.onLineError(pl, e as Error))
        if (blocking) { try { await waiter } catch { /* já tratado */ } }
      }
      if (this.pending.length === 0 && this.nextIdx >= this.queue.length) break
      await sleep(this.pending.length >= this.o.window ? 4 : 1)
    }
    if (!this.cancelReq && this.state === "printing") {
      this.setState("finished", "completed")
      this.ev.onFinished?.(true, "completed")
      this.emitProgress()
    }
  }

  private onAcked(pl: PendingLine) {
    const i = this.pending.indexOf(pl)
    if (i >= 0) this.pending.splice(i, 1)
    this.ackedCount++
    const now = Date.now()
    this.rateWindow.push(now)
    if (this.rateWindow.length > 60) this.rateWindow.shift()
    this.emitProgress()
  }

  private async onLineError(pl: PendingLine, e: Error) {
    if (e.message === "resend") return
    if (this.state !== "printing") return
    const r = (this.retries.get(pl.idx) ?? 0) + 1
    this.retries.set(pl.idx, r)
    if (r > 2) { this.failPrint(`Linha ${pl.idx + 1} falhou 3× (${e.message})`); return }
    this.log("warn", `Linha ${pl.idx + 1} sem ok (${e.message}) — reenviando`)
    const minIdx = Math.min(pl.idx, ...this.pending.map((p) => p.idx))
    for (const w of this.waiting) clearTimeout(w.timer)
    this.waiting = []
    this.pending = []
    this.nextIdx = minIdx
    if (this.o.lineNumbers) {
      try { await this.sendRaw(`M110 N${this.lineNo - 1}`, 5000) } catch { /* ignore */ }
    }
  }

  private failPrint(reason: string) {
    if (this.state === "error") return
    this.setState("error", reason)
    this.log("error", `Impressão abortada: ${reason}`)
    for (const w of this.waiting) clearTimeout(w.timer)
    this.waiting = []; this.pending = []; this.nextIdx = this.queue.length
    this.safety().catch(() => {})
    this.ev.onFinished?.(false, reason)
  }

  private emitProgress() {
    const total = this.queue.length
    const elapsed = (Date.now() - this.startedAt) / 1000
    const lps = this.rateWindow.length > 1
      ? (this.rateWindow.length - 1) / Math.max(0.001, (this.rateWindow[this.rateWindow.length - 1] - this.rateWindow[0]) / 1000)
      : 0
    const remaining = total - this.ackedCount
    const eta = lps > 0 ? remaining / lps : null
    const layer = this.layerAt[Math.min(this.ackedCount, Math.max(0, this.layerAt.length - 1))] ?? 0
    this.ev.onProgress?.({
      sent: this.nextIdx, acked: this.ackedCount, total,
      percent: total ? (this.ackedCount / total) * 100 : 0,
      layer, layerCount: this.layerCount,
      elapsed_s: Math.round(elapsed), eta_s: eta !== null ? Math.round(eta) : null,
      lps: Math.round(lps * 10) / 10, resends: this.resends, inFlight: this.pending.length,
    })
  }

  pause(): void {
    if (this.state !== "printing") return
    this.pauseReq = true
    this.setState("pausing")
  }
  private async doPause() {
    try { await this.sendRaw("M400", 60000) } catch { /* ok */ }
    try { await this.sendRaw("M114", 5000) } catch { /* ok */ }
    this.pausedPos = this.lastPos
    for (const l of this.o.pauseScript) { try { await this.sendRaw(l) } catch { /* continua */ } }
    this.setState("paused")
    while (this.pauseReq && !this.cancelReq) {
      if (this.injectQueue.length) await this.drainInjections()
      await sleep(100)
    }
    if (this.cancelReq) return
    this.setState("resuming")
    for (const l of this.o.resumeScript) { try { await this.sendRaw(l) } catch { /* continua */ } }
    if (this.pausedPos) {
      try { await this.sendRaw(`G0 X${this.pausedPos.x.toFixed(3)} Y${this.pausedPos.y.toFixed(3)} F2400`) } catch { /* ok */ }
    }
    this.setState("printing")
  }
  resume(): void { if (this.state === "paused") this.pauseReq = false }
  cancel(): void {
    if (this.state === "printing" || this.state === "paused" || this.state === "pausing") {
      this.cancelReq = true
      this.pauseReq = false
      this.setState("cancelling")
    }
  }
  private async doCancel() {
    for (const w of this.waiting) clearTimeout(w.timer)
    this.waiting = []; this.pending = []; this.nextIdx = this.queue.length
    await this.safety()
    this.setState("connected", "cancelled")
    this.ev.onFinished?.(false, "cancelled")
  }
  private async safety() {
    for (const l of this.o.safetyFooter) { try { await this.sendRaw(l, 5000) } catch { /* ignore */ } }
  }
  async emergency(): Promise<void> {
    this.cancelReq = true
    for (const w of this.waiting) clearTimeout(w.timer)
    this.waiting = []; this.pending = []; this.nextIdx = this.queue.length
    try { await this.t.write("M112") } catch { /* ignore */ }
    this.setState("error", "M112")
    this.ev.onFinished?.(false, "emergency")
  }
}

// ─── Macros de bioimpressão (seringa) ───────────────────────────────────
export interface SyringeMacroContext { syringeArea_mm2: number; plungerSpeed_mms: number }

export function macroPrimeUl(uL: number, ctx: SyringeMacroContext): string[] {
  return ["M83", `G1 E${(uL / ctx.syringeArea_mm2).toFixed(4)} F${Math.round(ctx.plungerSpeed_mms * 60)}`]
}
export function macroRetractUl(uL: number, ctx: SyringeMacroContext): string[] {
  return ["M83", `G1 E-${(uL / ctx.syringeArea_mm2).toFixed(4)} F${Math.round(ctx.plungerSpeed_mms * 60)}`]
}
export function macroPurge(flow_uLs: number, seconds: number, ctx: SyringeMacroContext): string[] {
  const e = (flow_uLs * seconds) / ctx.syringeArea_mm2
  const f = Math.max(1, Math.round((e / seconds) * 60))
  return ["M83", `G1 E${e.toFixed(4)} F${f}`]
}
export const MACRO_SET_ORIGIN = ["G92 X0 Y0 Z0 E0"]
export const MACRO_GO_ORIGIN = ["G90", "G0 Z5 F300", "G0 X0 Y0 F2400", "G0 Z0 F300"]
export const MACRO_COLD_EXTRUSION = ["M302 S0"]
export const MACRO_ESTEP_TEST = ["M83", "G1 E10 F60"]
export function macroSetEsteps(stepsPerMm: number): string[] {
  return [`M92 E${stepsPerMm.toFixed(2)}`, "M500"]
}
