/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · PrinterMock — Simulador de firmware Marlin (sem hardware)
 *  ─────────────────────────────────────────────────────────────────────
 *  Implementa um subset de Marlin que se comporta como uma impressora real:
 *    · Responde "ok" para cada comando (com latência configurável)
 *    · Responde "echo:" para alguns comandos (G0/G1 silenciosos é default Marlin)
 *    · M115 → string de capabilities tipo Marlin
 *    · M114 → posição atual
 *    · M105 → temperaturas
 *    · M104/M109/M140/M190 → atualiza temps (M109/M190 com "wait")
 *    · M112 → "Error:Emergency stop" e fecha
 *    · Injeta erros simulados configuráveis (probabilidade de "busy:", "Error:", etc.)
 *
 *  Implementa a interface PrinterTransport (ver printer-connection.ts) para
 *  ser drop-in replacement do SerialPort real.
 *
 *  R12.15 — Pipeline real de execução USB
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import type { PrinterTransport, IncomingMessage } from "./printer-connection"

export interface PrinterMockOptions {
  /** Latência base por comando, em ms */
  latencyMs?: number
  /** Probabilidade [0–1] de injetar "busy: processing" entre ok */
  busyRate?: number
  /** Probabilidade [0–1] de injetar erro simulado */
  errorRate?: number
  /** Movimentação simulada — true → emite log de cada G1 */
  echoMoves?: boolean
  /** Firmware string para M115 */
  firmwareName?: string
}

const DEFAULT_OPTS: Required<PrinterMockOptions> = {
  latencyMs: 35,
  busyRate: 0,
  errorRate: 0,
  echoMoves: false,
  firmwareName: "FIRMWARE_NAME:Marlin 2.1.2 (BIA Mock) SOURCE_CODE_URL:https://github.com/MarlinFirmware/Marlin PROTOCOL_VERSION:1.0 MACHINE_TYPE:BIA Mock Bioprinter EXTRUDER_COUNT:1 UUID:bia-mock-0000",
}

export class PrinterMock implements PrinterTransport {
  private opts: Required<PrinterMockOptions>
  private listeners = new Set<(msg: IncomingMessage) => void>()
  private connected = false
  private x = 0; private y = 0; private z = 0; private e = 0
  private absolute = true
  private absoluteE = true
  private hotendC = 23
  private hotendTargetC = 0
  private bedC = 22
  private bedTargetC = 0
  private feedrate = 1500
  private emergency = false
  private autoTempInterval: ReturnType<typeof setInterval> | null = null

  constructor(opts: PrinterMockOptions = {}) {
    this.opts = { ...DEFAULT_OPTS, ...opts }
  }

  // ─── PrinterTransport interface ──
  async connect(): Promise<void> {
    if (this.connected) return
    this.connected = true
    this.emergency = false
    // Simula o "start" que Marlin solta
    await this.delay(50)
    this.emit("info", "start")
    await this.delay(this.opts.latencyMs)
    this.emit("info", "echo:Marlin ready.")
  }

  async disconnect(): Promise<void> {
    this.connected = false
    if (this.autoTempInterval) {
      clearInterval(this.autoTempInterval)
      this.autoTempInterval = null
    }
  }

  isConnected(): boolean {
    return this.connected && !this.emergency
  }

  async write(line: string): Promise<void> {
    if (!this.connected) throw new Error("Mock printer not connected")
    if (this.emergency) {
      this.emit("error", "Error:Printer halted. kill() called!")
      return
    }
    const clean = line.trim()
    if (!clean) {
      // Linha vazia → ok imediato (comportamento Marlin)
      await this.delay(2)
      this.emit("ok", "ok")
      return
    }
    // Remove comentários
    const semi = clean.indexOf(";")
    const cmdPart = (semi >= 0 ? clean.slice(0, semi) : clean).trim()
    if (!cmdPart) {
      await this.delay(2)
      this.emit("ok", "ok")
      return
    }

    // Injeção opcional de busy/erro
    if (this.opts.busyRate > 0 && Math.random() < this.opts.busyRate) {
      this.emit("info", "busy: processing")
      await this.delay(this.opts.latencyMs * 2)
    }
    if (this.opts.errorRate > 0 && Math.random() < this.opts.errorRate) {
      this.emit("error", "Error:Mock-injected error")
      this.emit("ok", "ok")
      return
    }

    await this.processCommand(cmdPart)
  }

  onMessage(fn: (msg: IncomingMessage) => void): () => void {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }

  // ─── Comandos ──
  private async processCommand(cmd: string): Promise<void> {
    const parts = cmd.split(/\s+/)
    const op = parts[0].toUpperCase()
    const tokens = parts.slice(1)

    // Latência base
    await this.delay(this.opts.latencyMs)

    // ── G0/G1: movimento ──
    if (op === "G0" || op === "G1") {
      const { x, y, z, e, f } = this.parseAxes(tokens)
      if (f != null) this.feedrate = f
      const dx = this.applyAxis(this.absolute, this.x, x)
      const dy = this.applyAxis(this.absolute, this.y, y)
      const dz = this.applyAxis(this.absolute, this.z, z)
      const de = this.applyAxis(this.absoluteE, this.e, e)

      // Tempo de execução proporcional à distância
      const distSq = (dx - this.x) ** 2 + (dy - this.y) ** 2 + (dz - this.z) ** 2
      const dist = Math.sqrt(distSq)
      const moveTimeMs = Math.min(800, Math.max(5, (dist / Math.max(1, this.feedrate)) * 60 * 1000))

      this.x = dx; this.y = dy; this.z = dz; this.e = de
      if (this.opts.echoMoves) {
        this.emit("info", `echo:move to X${dx.toFixed(2)} Y${dy.toFixed(2)} Z${dz.toFixed(2)}`)
      }
      await this.delay(moveTimeMs)
      this.emit("ok", "ok")
      return
    }

    // ── G4: dwell ──
    if (op === "G4") {
      const pToken = tokens.find((t) => t.toUpperCase().startsWith("P"))
      const sToken = tokens.find((t) => t.toUpperCase().startsWith("S"))
      const ms = pToken ? parseFloat(pToken.slice(1)) : sToken ? parseFloat(sToken.slice(1)) * 1000 : 0
      await this.delay(Math.min(2000, ms))
      this.emit("ok", "ok")
      return
    }

    // ── Modos ──
    if (op === "G20") { this.emit("ok", "ok"); return }
    if (op === "G21") { this.emit("ok", "ok"); return }
    if (op === "G90") { this.absolute = true; this.emit("ok", "ok"); return }
    if (op === "G91") { this.absolute = false; this.emit("ok", "ok"); return }
    if (op === "M82") { this.absoluteE = true; this.emit("ok", "ok"); return }
    if (op === "M83") { this.absoluteE = false; this.emit("ok", "ok"); return }
    if (op === "G92") {
      const { x, y, z, e } = this.parseAxes(tokens)
      if (x != null) this.x = x
      if (y != null) this.y = y
      if (z != null) this.z = z
      if (e != null) this.e = e
      this.emit("ok", "ok"); return
    }

    // ── G28 home (simulado, sem alarme) ──
    if (op === "G28") {
      this.emit("info", "echo:enqueueing G28")
      await this.delay(500)
      this.x = 0; this.y = 0; this.z = 0
      this.emit("ok", "ok"); return
    }

    // ── M115 firmware ──
    if (op === "M115") {
      this.emit("info", this.opts.firmwareName)
      this.emit("info", "Cap:SERIAL_XON_XOFF:0")
      this.emit("info", "Cap:EEPROM:1")
      this.emit("info", "Cap:AUTOREPORT_TEMP:1")
      this.emit("info", "Cap:AUTOLEVEL:0")
      this.emit("info", "Cap:Z_PROBE:0")
      this.emit("ok", "ok"); return
    }

    // ── M114 posição ──
    if (op === "M114") {
      this.emit("info", `X:${this.x.toFixed(2)} Y:${this.y.toFixed(2)} Z:${this.z.toFixed(2)} E:${this.e.toFixed(2)} Count X:0 Y:0 Z:0`)
      this.emit("ok", "ok"); return
    }

    // ── M105 temps ──
    if (op === "M105") {
      this.emit("info", `T:${this.hotendC.toFixed(1)} /${this.hotendTargetC.toFixed(1)} B:${this.bedC.toFixed(1)} /${this.bedTargetC.toFixed(1)} @:0 B@:0`)
      this.emit("ok", "ok"); return
    }

    // ── M104/M109: hotend ──
    if (op === "M104" || op === "M109") {
      const sToken = tokens.find((t) => t.toUpperCase().startsWith("S"))
      if (sToken) {
        const s = parseFloat(sToken.slice(1))
        this.hotendTargetC = s
        if (op === "M109") {
          // Aguarda atingir (simula rampa rápida)
          while (Math.abs(this.hotendC - this.hotendTargetC) > 0.5) {
            this.hotendC += (this.hotendTargetC - this.hotendC) * 0.3
            this.emit("info", `T:${this.hotendC.toFixed(1)} E:0 W:?`)
            await this.delay(80)
            if (this.emergency) return
          }
          this.hotendC = this.hotendTargetC
        } else {
          this.hotendC = s * 0.05 + this.hotendC * 0.95  // converge devagar em background
        }
      }
      this.emit("ok", "ok"); return
    }
    if (op === "M140" || op === "M190") {
      const sToken = tokens.find((t) => t.toUpperCase().startsWith("S"))
      if (sToken) {
        const s = parseFloat(sToken.slice(1))
        this.bedTargetC = s
        if (op === "M190") {
          while (Math.abs(this.bedC - this.bedTargetC) > 0.5) {
            this.bedC += (this.bedTargetC - this.bedC) * 0.2
            this.emit("info", `T:${this.hotendC.toFixed(1)} B:${this.bedC.toFixed(1)} W:?`)
            await this.delay(80)
            if (this.emergency) return
          }
          this.bedC = this.bedTargetC
        }
      }
      this.emit("ok", "ok"); return
    }
    if (op === "M141" || op === "M191") {
      // Câmara — só ack
      this.emit("ok", "ok"); return
    }

    // ── M112 emergency stop ──
    if (op === "M112") {
      this.emergency = true
      this.emit("error", "Error:Emergency stop! Marlin halted.")
      // Não envia "ok" — Marlin trava
      return
    }

    // ── M0/M1 pausa firmware ──
    if (op === "M0" || op === "M1") {
      this.emit("info", `echo:${op} pause`)
      this.emit("ok", "ok"); return
    }

    // ── M84/M18/M17 motors ──
    if (op === "M84" || op === "M18" || op === "M17") {
      this.emit("ok", "ok"); return
    }

    // ── M117 LCD message ──
    if (op === "M117") {
      this.emit("info", `echo:${tokens.join(" ")}`)
      this.emit("ok", "ok"); return
    }

    // ── M400 wait for moves ──
    if (op === "M400") {
      await this.delay(50)
      this.emit("ok", "ok"); return
    }

    // ── Padrão: ack ──
    this.emit("ok", "ok")
  }

  // ─── Helpers ──
  private parseAxes(tokens: string[]): {
    x: number | null; y: number | null; z: number | null; e: number | null; f: number | null
  } {
    let x: number | null = null, y: number | null = null
    let z: number | null = null, e: number | null = null, f: number | null = null
    for (const t of tokens) {
      const T = t.toUpperCase()
      const v = parseFloat(T.slice(1))
      if (!Number.isFinite(v)) continue
      if (T.startsWith("X")) x = v
      else if (T.startsWith("Y")) y = v
      else if (T.startsWith("Z")) z = v
      else if (T.startsWith("E")) e = v
      else if (T.startsWith("F")) f = v
    }
    return { x, y, z, e, f }
  }

  private applyAxis(absolute: boolean, current: number, target: number | null): number {
    if (target == null) return current
    return absolute ? target : current + target
  }

  private emit(kind: IncomingMessage["kind"], text: string): void {
    const msg: IncomingMessage = { kind, text, ts: Date.now() }
    for (const fn of this.listeners) {
      try { fn(msg) } catch { /* swallow */ }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms))
  }

  // ─── Estado público para UI (opcional) ──
  getState() {
    return {
      x: this.x, y: this.y, z: this.z, e: this.e,
      feedrate: this.feedrate,
      absolute: this.absolute, absoluteE: this.absoluteE,
      hotendC: this.hotendC, hotendTargetC: this.hotendTargetC,
      bedC: this.bedC, bedTargetC: this.bedTargetC,
      emergency: this.emergency,
    }
  }
}
