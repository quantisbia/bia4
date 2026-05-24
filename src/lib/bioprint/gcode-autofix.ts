/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · GCode AutoFix — Correções automáticas dirigidas por validador
 *  ─────────────────────────────────────────────────────────────────────
 *  Módulo PURO (síncrono, sem React, sem rede).
 *
 *  Recebe:
 *    · gcodeText (string)
 *    · ValidationResult (issues + stats)
 *    · AutoFixOptions (limites + parâmetros user-overridable)
 *
 *  Retorna:
 *    · fixedGcode (string corrigida)
 *    · applied[]  (lista de correções feitas, com linha e descrição)
 *    · skipped[]  (issues que não podem ser corrigidas automaticamente)
 *
 *  Filosofia: NUNCA "começar do zero". Sempre patchear linhas individuais
 *  preservando comentários, indentação e ordem. Linhas substituídas ganham
 *  um sufixo " ; [auto-fix: ...]" para auditoria.
 *
 *  R12.21 — Auto-fix inteligente para G-code bloqueado
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import type {
  ValidationResult,
  ValidationIssue,
  PrinterLimits,
} from "./gcode-validator"
import { DEFAULT_BIO_LIMITS } from "./gcode-validator"

export interface AutoFixOptions {
  /** Limites da impressora (idem validador) */
  limits: PrinterLimits
  /** Velocidade default a injetar quando F=0 ou ausente. Default 1500 mm/min. */
  defaultFeedrate: number
  /** Temperatura segura para clamp de hotend "warm" (default 37°C — temp. corporal). */
  safeHotendC: number
  /** Retração máxima permitida (mm). Default 10. */
  maxRetractMm: number
  /** Se true, comenta linhas com comandos desconhecidos em vez de removê-las. Default true. */
  commentUnknown: boolean
  /** Se true, comenta G28 em vez de remover. Default true. */
  commentG28: boolean
  /** Se true, insere G21 (mm) no header caso ausente. Default true. */
  injectUnits: boolean
  /** Se true, insere G90 (absoluto) no header caso ausente. Default true. */
  injectPositioning: boolean
  /** Conjunto de códigos a aplicar (whitelist). Se vazio/undefined → todos suportados. */
  onlyCodes?: Set<string>
}

export const DEFAULT_AUTOFIX_OPTS: AutoFixOptions = {
  limits: DEFAULT_BIO_LIMITS,
  defaultFeedrate: 1500,
  safeHotendC: 37,
  maxRetractMm: 10,
  commentUnknown: true,
  commentG28: true,
  injectUnits: true,
  injectPositioning: true,
}

export interface AppliedFix {
  /** Linha 1-indexada da correção (0 = inserção no header) */
  line: number
  /** Código da issue que motivou a correção */
  code: string
  /** Linha original (vazio se inserção) */
  before: string
  /** Linha resultante */
  after: string
  /** Descrição humana */
  description: string
}

export interface AutoFixResult {
  /** G-code corrigido */
  fixedGcode: string
  /** Correções aplicadas */
  applied: AppliedFix[]
  /** Issues que não foram corrigidas (não suportadas ou desabilitadas) */
  skipped: ValidationIssue[]
  /** Resumo por código: quantas vezes cada correção foi aplicada */
  countByCode: Record<string, number>
}

/**
 * Códigos de issue suportados para auto-fix.
 * Mapa para a UI exibir claramente o que pode ser feito.
 */
export const FIXABLE_CODES = new Set<string>([
  "ZERO_FEED",
  "NEG_FEED",
  "FEED_TOO_HIGH",
  "OUT_OF_VOLUME_X",
  "OUT_OF_VOLUME_Y",
  "OUT_OF_VOLUME_Z",
  "Z_NEGATIVE",
  "HOTEND_TOO_HIGH",
  "HOTEND_WARM",
  "BED_TOO_HIGH",
  "CHAMBER_HIGH",
  "NO_POSITIONING_MODE",
  "NO_UNITS_DECLARED",
  "G28_PRESENT",
  "BIG_RETRACT",
  "UNKNOWN_GCODE",
  "UNKNOWN_MCODE",
  "UNKNOWN_CMD",
])

/** Códigos que não podem ser auto-fixados, com motivo */
export const UNFIXABLE_REASONS: Record<string, string> = {
  EMPTY: "G-code vazio — não há nada a corrigir.",
  BAD_PARAM: "Parâmetro inválido — ambíguo demais para auto-correção segura.",
  M112_PRESENT: "M112 é parada de emergência — pode ser intencional, não removemos automaticamente.",
  GRBL_INCOMPATIBLE: "Compatibilidade GRBL exige reescrita; depende do firmware real conectado.",
}

// ─── Helpers ───────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/**
 * Substitui um token "X<num>" / "Y<num>" / "Z<num>" / "F<num>" / "S<num>"
 * em uma linha de G-code, preservando comentários.
 *
 * IMPORTANTE: se o token NÃO existir na linha original, decide via `allowInject`:
 *   - `true`  → injeta no final (antes do comentário). Use só para F em ZERO_FEED.
 *   - `false` → retorna a linha inalterada (padrão seguro). Evita poluir linhas
 *     cujo erro veio da propagação do estado da máquina virtual, não do conteúdo.
 */
function patchToken(line: string, axis: string, newValue: number, allowInject = false): string {
  // separa comentário
  const semi = line.indexOf(";")
  const code = semi >= 0 ? line.slice(0, semi) : line
  const cmt = semi >= 0 ? line.slice(semi) : ""

  // tokenize
  const parts = code.trimEnd().split(/\s+/)
  const re = new RegExp(`^${axis}-?\\d+(\\.\\d+)?$`, "i")
  let replaced = false
  for (let i = 0; i < parts.length; i++) {
    if (re.test(parts[i])) {
      parts[i] = `${axis}${formatNum(newValue)}`
      replaced = true
      break
    }
  }
  if (!replaced) {
    if (!allowInject) {
      // linha não tinha o token: não mexer (provavelmente erro propagado pelo
      // estado da máquina virtual, não pelo conteúdo desta linha em si).
      return line
    }
    // injetar antes do comentário
    parts.push(`${axis}${formatNum(newValue)}`)
  }
  const out = parts.join(" ")
  return cmt ? `${out} ${cmt}` : out
}

function getTokenValue(line: string, axis: string): number | null {
  const semi = line.indexOf(";")
  const code = semi >= 0 ? line.slice(0, semi) : line
  const re = new RegExp(`\\b${axis}(-?\\d+(?:\\.\\d+)?)`, "i")
  const m = code.match(re)
  if (!m) return null
  const v = parseFloat(m[1])
  return Number.isFinite(v) ? v : null
}

function formatNum(v: number): string {
  // até 3 casas, sem zeros à direita
  if (Math.abs(v) < 0.0005) return "0"
  const s = v.toFixed(3)
  return s.replace(/\.?0+$/, "") || "0"
}

function appendAuditTag(line: string, tag: string): string {
  // se já tem comentário, anexa após
  if (line.includes(";")) {
    return `${line} [auto-fix: ${tag}]`
  }
  return `${line} ; [auto-fix: ${tag}]`
}

// ─── Engine principal ──────────────────────────────────────────────────

export function autoFixGcode(
  gcodeText: string,
  validation: ValidationResult,
  optsPartial: Partial<AutoFixOptions> = {},
): AutoFixResult {
  const opts: AutoFixOptions = { ...DEFAULT_AUTOFIX_OPTS, ...optsPartial }
  const limits = { ...DEFAULT_BIO_LIMITS, ...opts.limits }

  const lines = gcodeText.split(/\r?\n/)
  const applied: AppliedFix[] = []
  const skipped: ValidationIssue[] = []
  const countByCode: Record<string, number> = {}

  const isAllowed = (code: string): boolean => {
    if (!FIXABLE_CODES.has(code)) return false
    if (opts.onlyCodes && opts.onlyCodes.size > 0 && !opts.onlyCodes.has(code)) return false
    return true
  }

  const bumpCount = (code: string) => {
    countByCode[code] = (countByCode[code] || 0) + 1
  }

  // ─── 1) Issues globais (line = 0) — header injections ──
  for (const iss of validation.issues) {
    if (iss.line !== 0) continue
    if (!isAllowed(iss.code)) {
      if (!FIXABLE_CODES.has(iss.code)) skipped.push(iss)
      continue
    }

    if (iss.code === "NO_POSITIONING_MODE" && opts.injectPositioning) {
      // já será resolvido na injeção do header abaixo
      bumpCount(iss.code)
    } else if (iss.code === "NO_UNITS_DECLARED" && opts.injectUnits) {
      bumpCount(iss.code)
    }
  }

  // ─── 2) Issues por linha — patch in place ──
  for (const iss of validation.issues) {
    if (iss.line <= 0) continue
    if (!isAllowed(iss.code)) {
      if (!FIXABLE_CODES.has(iss.code)) skipped.push(iss)
      continue
    }
    const idx = iss.line - 1
    if (idx < 0 || idx >= lines.length) continue
    const before = lines[idx]

    switch (iss.code) {
      // ──────────────────────────────────────────────────────────────
      case "ZERO_FEED": {
        // F=0 → setar F=defaultFeedrate (esta é a única em que faz sentido
        // injetar o token quando ausente — F pode "herdar" do feedrate corrente).
        const after = appendAuditTag(
          patchToken(before, "F", opts.defaultFeedrate, true),
          `F=0 → F=${opts.defaultFeedrate}`,
        )
        lines[idx] = after
        applied.push({
          line: iss.line, code: iss.code, before, after,
          description: `Velocidade F=0 corrigida para F=${opts.defaultFeedrate} mm/min`,
        })
        bumpCount(iss.code)
        break
      }
      case "NEG_FEED": {
        const cur = getTokenValue(before, "F") ?? 0
        const fixed = Math.max(1, Math.abs(cur))
        const after = appendAuditTag(
          patchToken(before, "F", fixed),
          `F=${cur} → F=${fixed}`,
        )
        lines[idx] = after
        applied.push({
          line: iss.line, code: iss.code, before, after,
          description: `Velocidade negativa F=${cur} corrigida para F=${fixed}`,
        })
        bumpCount(iss.code)
        break
      }
      case "FEED_TOO_HIGH": {
        const cur = getTokenValue(before, "F") ?? 0
        const fixed = limits.feedrateMaxMmMin
        const after = appendAuditTag(
          patchToken(before, "F", fixed),
          `F=${cur} → F=${fixed} (clamp max)`,
        )
        lines[idx] = after
        applied.push({
          line: iss.line, code: iss.code, before, after,
          description: `Velocidade F=${cur} mm/min clampada para o máximo (${fixed} mm/min)`,
        })
        bumpCount(iss.code)
        break
      }
      // ──────────────────────────────────────────────────────────────
      case "OUT_OF_VOLUME_X": {
        const cur = getTokenValue(before, "X")
        if (cur === null) { skipped.push(iss); break }
        const fixed = clamp(cur, 0, limits.xMaxMm)
        if (Math.abs(cur - fixed) < 0.0005) { break }
        const after = appendAuditTag(
          patchToken(before, "X", fixed),
          `X=${formatNum(cur)} → X=${formatNum(fixed)}`,
        )
        lines[idx] = after
        applied.push({
          line: iss.line, code: iss.code, before, after,
          description: `X=${formatNum(cur)} clampado para [0, ${limits.xMaxMm}]`,
        })
        bumpCount(iss.code)
        break
      }
      case "OUT_OF_VOLUME_Y": {
        const cur = getTokenValue(before, "Y")
        if (cur === null) { skipped.push(iss); break }
        const fixed = clamp(cur, 0, limits.yMaxMm)
        if (Math.abs(cur - fixed) < 0.0005) { break }
        const after = appendAuditTag(
          patchToken(before, "Y", fixed),
          `Y=${formatNum(cur)} → Y=${formatNum(fixed)}`,
        )
        lines[idx] = after
        applied.push({
          line: iss.line, code: iss.code, before, after,
          description: `Y=${formatNum(cur)} clampado para [0, ${limits.yMaxMm}]`,
        })
        bumpCount(iss.code)
        break
      }
      case "Z_NEGATIVE":
      case "OUT_OF_VOLUME_Z": {
        const cur = getTokenValue(before, "Z")
        // se a linha não tem Z explícito, o erro veio do estado virtual
        // (ex: Z herdado de uma linha anterior). A correção daquela linha
        // anterior já basta — não poluímos esta linha.
        if (cur === null) { skipped.push(iss); break }
        const fixed = clamp(cur, Math.max(0, limits.zMinMm), limits.zMaxMm)
        if (Math.abs(cur - fixed) < 0.0005) { break }
        const after = appendAuditTag(
          patchToken(before, "Z", fixed),
          `Z=${formatNum(cur)} → Z=${formatNum(fixed)}`,
        )
        lines[idx] = after
        applied.push({
          line: iss.line, code: iss.code, before, after,
          description: `Z=${formatNum(cur)} clampado para [0, ${limits.zMaxMm}]`,
        })
        bumpCount(iss.code)
        break
      }
      // ──────────────────────────────────────────────────────────────
      case "HOTEND_TOO_HIGH": {
        const cur = getTokenValue(before, "S") ?? 0
        const fixed = limits.hotendMaxC
        const after = appendAuditTag(
          patchToken(before, "S", fixed),
          `S=${cur}°C → S=${fixed}°C`,
        )
        lines[idx] = after
        applied.push({
          line: iss.line, code: iss.code, before, after,
          description: `Hotend ${cur}°C reduzido para limite biológico ${fixed}°C`,
        })
        bumpCount(iss.code)
        break
      }
      case "HOTEND_WARM": {
        const cur = getTokenValue(before, "S") ?? 0
        const fixed = opts.safeHotendC
        const after = appendAuditTag(
          patchToken(before, "S", fixed),
          `S=${cur}°C → S=${fixed}°C`,
        )
        lines[idx] = after
        applied.push({
          line: iss.line, code: iss.code, before, after,
          description: `Hotend ${cur}°C reduzido para temperatura segura ${fixed}°C`,
        })
        bumpCount(iss.code)
        break
      }
      case "BED_TOO_HIGH": {
        const cur = getTokenValue(before, "S") ?? 0
        const fixed = limits.bedMaxC
        const after = appendAuditTag(
          patchToken(before, "S", fixed),
          `S=${cur}°C → S=${fixed}°C`,
        )
        lines[idx] = after
        applied.push({
          line: iss.line, code: iss.code, before, after,
          description: `Mesa ${cur}°C reduzida para limite ${fixed}°C`,
        })
        bumpCount(iss.code)
        break
      }
      case "CHAMBER_HIGH": {
        const cur = getTokenValue(before, "S") ?? 0
        const fixed = limits.chamberMaxC
        const after = appendAuditTag(
          patchToken(before, "S", fixed),
          `S=${cur}°C → S=${fixed}°C`,
        )
        lines[idx] = after
        applied.push({
          line: iss.line, code: iss.code, before, after,
          description: `Câmara ${cur}°C reduzida para limite ${fixed}°C`,
        })
        bumpCount(iss.code)
        break
      }
      // ──────────────────────────────────────────────────────────────
      case "BIG_RETRACT": {
        const cur = getTokenValue(before, "E")
        if (cur === null) { skipped.push(iss); break }
        // assume negativo (retração) — limitar magnitude
        const fixed = cur < 0 ? -opts.maxRetractMm : opts.maxRetractMm
        const after = appendAuditTag(
          patchToken(before, "E", fixed),
          `E=${formatNum(cur)} → E=${formatNum(fixed)}`,
        )
        lines[idx] = after
        applied.push({
          line: iss.line, code: iss.code, before, after,
          description: `Retração E=${formatNum(cur)} limitada a ${formatNum(fixed)} mm`,
        })
        bumpCount(iss.code)
        break
      }
      // ──────────────────────────────────────────────────────────────
      case "G28_PRESENT": {
        if (!opts.commentG28) { skipped.push(iss); break }
        const after = `; [auto-fix: G28 removido] ${before}`
        lines[idx] = after
        applied.push({
          line: iss.line, code: iss.code, before, after,
          description: `G28 (Home) comentado para evitar colisão`,
        })
        bumpCount(iss.code)
        break
      }
      case "UNKNOWN_GCODE":
      case "UNKNOWN_MCODE":
      case "UNKNOWN_CMD": {
        if (!opts.commentUnknown) { skipped.push(iss); break }
        // se já é comentário, pula
        if (before.trim().startsWith(";")) break
        const after = `; [auto-fix: cmd desconhecido] ${before}`
        lines[idx] = after
        applied.push({
          line: iss.line, code: iss.code, before, after,
          description: `Comando desconhecido comentado`,
        })
        bumpCount(iss.code)
        break
      }
      default: {
        skipped.push(iss)
        break
      }
    }
  }

  // ─── 3) Header injection (G21 + G90) ──
  // só se a issue global aparecer e a flag estiver ON
  const needG21 = opts.injectUnits &&
    validation.issues.some((i) => i.code === "NO_UNITS_DECLARED")
  const needG90 = opts.injectPositioning &&
    validation.issues.some((i) => i.code === "NO_POSITIONING_MODE")

  if (needG21 || needG90) {
    const headerInsert: string[] = []
    if (needG21) {
      headerInsert.push("G21 ; [auto-fix: unidades em mm]")
      applied.push({
        line: 0, code: "NO_UNITS_DECLARED",
        before: "", after: "G21",
        description: "Inserido G21 (mm) no header",
      })
      bumpCount("NO_UNITS_DECLARED")
    }
    if (needG90) {
      headerInsert.push("G90 ; [auto-fix: posicionamento absoluto]")
      applied.push({
        line: 0, code: "NO_POSITIONING_MODE",
        before: "", after: "G90",
        description: "Inserido G90 (modo absoluto) no header",
      })
      bumpCount("NO_POSITIONING_MODE")
    }
    // procurar índice após o último comentário inicial
    let insertAt = 0
    while (insertAt < lines.length && lines[insertAt].trim().startsWith(";")) insertAt++
    lines.splice(insertAt, 0, ...headerInsert)
  }

  return {
    fixedGcode: lines.join("\n"),
    applied,
    skipped,
    countByCode,
  }
}

/** Resumo legível de quais correções estão disponíveis para uma validação. */
export function summarizeAutoFix(validation: ValidationResult): {
  totalFixable: number
  totalUnfixable: number
  fixableByCode: Record<string, number>
  unfixableByCode: Record<string, number>
} {
  const fixableByCode: Record<string, number> = {}
  const unfixableByCode: Record<string, number> = {}
  for (const iss of validation.issues) {
    if (FIXABLE_CODES.has(iss.code)) {
      fixableByCode[iss.code] = (fixableByCode[iss.code] || 0) + 1
    } else {
      unfixableByCode[iss.code] = (unfixableByCode[iss.code] || 0) + 1
    }
  }
  const totalFixable = Object.values(fixableByCode).reduce((a, b) => a + b, 0)
  const totalUnfixable = Object.values(unfixableByCode).reduce((a, b) => a + b, 0)
  return { totalFixable, totalUnfixable, fixableByCode, unfixableByCode }
}

/** Rótulo humano por código (PT-BR) para a UI */
export const FIX_CODE_LABEL: Record<string, string> = {
  ZERO_FEED: "Velocidade F=0",
  NEG_FEED: "Velocidade negativa",
  FEED_TOO_HIGH: "Velocidade acima do máximo",
  OUT_OF_VOLUME_X: "X fora do volume",
  OUT_OF_VOLUME_Y: "Y fora do volume",
  OUT_OF_VOLUME_Z: "Z acima do máximo",
  Z_NEGATIVE: "Z negativo (colisão)",
  HOTEND_TOO_HIGH: "Hotend acima do limite biológico",
  HOTEND_WARM: "Hotend morno demais p/ células",
  BED_TOO_HIGH: "Mesa acima do limite",
  CHAMBER_HIGH: "Câmara acima do limite",
  NO_POSITIONING_MODE: "Sem G90/G91 no header",
  NO_UNITS_DECLARED: "Sem G21/G20 no header",
  G28_PRESENT: "G28 (Home) presente",
  BIG_RETRACT: "Retração absurda",
  UNKNOWN_GCODE: "Comando G desconhecido",
  UNKNOWN_MCODE: "Comando M desconhecido",
  UNKNOWN_CMD: "Comando não reconhecido",
}
