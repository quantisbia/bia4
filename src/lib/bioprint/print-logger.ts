/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · PrintLogger — Log estruturado da execução de G-code
 *  ─────────────────────────────────────────────────────────────────────
 *  Módulo PURO (não tem dependência de React, Web Serial ou DOM).
 *  Pode ser usado tanto no PrinterController (lib) quanto na UI.
 *
 *  Responsabilidades:
 *    · Ring buffer (max ~2000 entradas) — não estoura memória em prints longas
 *    · Timestamps absolutos (Date) + relativos ao início da impressão
 *    · 6 severidades: tx, rx, info, warn, error, ok
 *    · Subscribers pub/sub para refresh de UI sem polling
 *    · Export para texto plano (download .log) e CSV
 *
 *  R12.15 — Pipeline real de execução USB
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

export type LogSeverity = "tx" | "rx" | "info" | "warn" | "error" | "ok"

export interface LogEntry {
  /** Sequencial monotônico desde o boot do logger */
  seq: number
  /** Timestamp absoluto (ms desde epoch) */
  ts: number
  /** ms desde startedAt (se houver), ou desde criação do logger */
  rel: number
  severity: LogSeverity
  text: string
  /** Origem opcional (ex.: "connection", "controller", "validator", "mock") */
  source?: string
}

export interface LogStats {
  total: number
  tx: number
  rx: number
  info: number
  warn: number
  error: number
  ok: number
}

const MAX_ENTRIES = 2000

type Subscriber = (entries: LogEntry[]) => void

export class PrintLogger {
  private entries: LogEntry[] = []
  private subscribers = new Set<Subscriber>()
  private seqCounter = 0
  private startedAt: number
  private bootAt: number

  constructor() {
    this.bootAt = Date.now()
    this.startedAt = this.bootAt
  }

  /** Marca o início de uma impressão — relativos zerados a partir daqui */
  markStart(): void {
    this.startedAt = Date.now()
    this.log("info", "═══ Início da impressão ═══", "logger")
  }

  /** Registra uma linha. severity opcional (default info). */
  log(severity: LogSeverity, text: string, source?: string): LogEntry {
    const now = Date.now()
    const entry: LogEntry = {
      seq: ++this.seqCounter,
      ts: now,
      rel: now - this.startedAt,
      severity,
      text,
      source,
    }
    this.entries.push(entry)
    // Ring buffer: descarta os mais antigos
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.splice(0, this.entries.length - MAX_ENTRIES)
    }
    this.notify()
    return entry
  }

  // Atalhos
  tx(text: string, source = "controller"): LogEntry { return this.log("tx", text, source) }
  rx(text: string, source = "connection"): LogEntry { return this.log("rx", text, source) }
  info(text: string, source?: string): LogEntry { return this.log("info", text, source) }
  warn(text: string, source?: string): LogEntry { return this.log("warn", text, source) }
  error(text: string, source?: string): LogEntry { return this.log("error", text, source) }
  ok(text: string, source?: string): LogEntry { return this.log("ok", text, source) }

  /** Snapshot atual (cópia imutável) */
  getEntries(): LogEntry[] {
    return this.entries.slice()
  }

  getLast(n: number): LogEntry[] {
    return this.entries.slice(-n)
  }

  stats(): LogStats {
    const s: LogStats = { total: this.entries.length, tx: 0, rx: 0, info: 0, warn: 0, error: 0, ok: 0 }
    for (const e of this.entries) s[e.severity]++
    return s
  }

  clear(): void {
    this.entries = []
    this.seqCounter = 0
    this.startedAt = Date.now()
    this.notify()
  }

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn)
    // Disparo inicial
    fn(this.entries.slice())
    return () => { this.subscribers.delete(fn) }
  }

  private notify(): void {
    const snap = this.entries.slice()
    for (const s of this.subscribers) {
      try { s(snap) } catch (e) { /* não deixa um subscriber quebrar os outros */ }
    }
  }

  /** Exporta o log como texto plano formatado tipo Pronterface */
  toText(): string {
    return this.entries.map(formatEntryText).join("\n")
  }

  /** Exporta o log como CSV (timestamp,severity,source,text) */
  toCSV(): string {
    const header = "seq,ts_iso,rel_ms,severity,source,text"
    const rows = this.entries.map((e) => {
      const iso = new Date(e.ts).toISOString()
      const text = `"${e.text.replace(/"/g, '""')}"`
      return [e.seq, iso, e.rel, e.severity, e.source ?? "", text].join(",")
    })
    return [header, ...rows].join("\n")
  }
}

// ─── Formatação ────────────────────────────────────────────────────────

const SEVERITY_PREFIX: Record<LogSeverity, string> = {
  tx:    "→",
  rx:    "←",
  info:  "·",
  warn:  "⚠",
  error: "✗",
  ok:    "✓",
}

export function formatEntryText(e: LogEntry): string {
  const time = new Date(e.ts).toISOString().slice(11, 23) // HH:MM:SS.mmm
  const src = e.source ? `[${e.source}] ` : ""
  return `${time} ${SEVERITY_PREFIX[e.severity]} ${src}${e.text}`
}

/** Singleton global opcional — útil para componentes que não querem injetar */
let globalLogger: PrintLogger | null = null

export function getGlobalLogger(): PrintLogger {
  if (!globalLogger) globalLogger = new PrintLogger()
  return globalLogger
}

export function resetGlobalLogger(): PrintLogger {
  globalLogger = new PrintLogger()
  return globalLogger
}
