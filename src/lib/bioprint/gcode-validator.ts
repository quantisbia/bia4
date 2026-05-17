/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · GCodeValidator — Validador estático de G-code antes do envio
 *  ─────────────────────────────────────────────────────────────────────
 *  Módulo PURO (síncrono, sem React, sem rede).
 *  Faz análise estática de um G-code para Marlin/RepRap/GRBL e retorna:
 *    · Lista de issues (errors, warnings, info)
 *    · Estatísticas: linhas, comandos únicos, bbox X/Y/Z, extrusão, tempo estimado
 *    · Veredito final: "safe" | "review" | "blocked"
 *
 *  Checagens obrigatórias (mandato R12.15):
 *    A. Header de segurança (modo absoluto, unidades, sem G28 inesperado)
 *    B. Comandos desconhecidos
 *    C. Out-of-volume (X/Y/Z fora dos limites da impressora)
 *    D. Z negativo (colisão com bandeja)
 *    E. Velocidades absurdas (F > 30000 mm/min ou F = 0)
 *    F. Extrusão negativa não-retração (E indo absurdo)
 *    G. Temperaturas fora de faixa biológica (M104/M109/M140/M141)
 *    H. Compatibilidade de firmware (GRBL não suporta M104, etc.)
 *
 *  R12.15 — Pipeline real de execução USB
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

export type FirmwareKind = "marlin" | "reprap" | "grbl" | "unknown"

export interface ValidationIssue {
  severity: "error" | "warning" | "info"
  /** Linha 1-indexada onde o problema foi detectado (0 = global) */
  line: number
  /** Código curto: TEMP_HIGH, OUT_OF_VOLUME, UNKNOWN_CMD, etc. */
  code: string
  /** Texto humano */
  message: string
  /** Conteúdo bruto da linha (se aplicável) */
  raw?: string
}

export interface PrinterLimits {
  xMaxMm: number
  yMaxMm: number
  zMaxMm: number
  /** Limite mínimo de Z (geralmente 0 — Z negativo é colisão) */
  zMinMm: number
  /** Velocidade máxima em mm/min (F). Marlin ~12000–18000 típico, alguns custom 30000. */
  feedrateMaxMmMin: number
  /** Temperatura máxima do bico em °C (bioprinter ~80°C) */
  hotendMaxC: number
  /** Temperatura máxima da mesa em °C */
  bedMaxC: number
  /** Temperatura máxima da câmara */
  chamberMaxC: number
}

export const DEFAULT_BIO_LIMITS: PrinterLimits = {
  xMaxMm: 220,
  yMaxMm: 220,
  zMaxMm: 200,
  zMinMm: -0.5,           // pequena tolerância para z-offset
  feedrateMaxMmMin: 18000, // 300 mm/s
  hotendMaxC: 80,         // bioprinter, não FDM
  bedMaxC: 60,
  chamberMaxC: 50,
}

export interface ValidationStats {
  totalLines: number
  codeLines: number       // linhas não-vazias, não-comentário
  commentLines: number
  uniqueCommands: string[]
  bbox: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }
  totalExtrusionE: number
  estLayerCount: number
  estTotalTimeMin: number
  hasG28: boolean
  hasG90: boolean
  hasG91: boolean
  hasG21: boolean
  hasG20: boolean
  hasM112: boolean
  /** Inferência da firmware-family pelo G-code (não é o handshake M115) */
  inferredFirmware: FirmwareKind
}

export interface ValidationResult {
  verdict: "safe" | "review" | "blocked"
  issues: ValidationIssue[]
  errorCount: number
  warningCount: number
  infoCount: number
  stats: ValidationStats
}

// ─── Comandos conhecidos ────────────────────────────────────────────────
// Não exaustivo, mas cobre o que Marlin/RepRap geram em bioimpressão.
const KNOWN_G = new Set([
  "G0", "G1", "G2", "G3", "G4",         // moves + dwell
  "G10", "G11",                          // retract/recover
  "G20", "G21",                          // units
  "G28",                                 // home
  "G29",                                 // ABL
  "G90", "G91",                          // abs/rel
  "G92",                                 // set position
])

const KNOWN_M = new Set([
  "M0", "M1", "M17", "M18", "M82", "M83",
  "M84",                                  // disable motors
  "M104", "M105", "M106", "M107", "M108", "M109",
  "M110", "M111", "M112", "M114", "M115", "M117", "M118",
  "M140", "M141", "M155",
  "M190", "M191",
  "M201", "M203", "M204", "M205", "M206",
  "M211", "M218", "M220", "M221",
  "M280",                                 // servos
  "M290",                                 // babystep
  "M300",                                 // beeper
  "M400",                                 // wait for moves
  "M420",                                 // bed leveling on/off
  "M500", "M501", "M502", "M503",         // EEPROM
  "M600",                                 // filament change
  "M701", "M702",                         // load/unload
  "M851",                                 // probe Z offset
  "M900",                                 // linear advance
  "M999",                                 // restart
])

// ─── Helpers ───────────────────────────────────────────────────────────

function parseAxisValue(token: string, axis: string): number | null {
  if (!token.toUpperCase().startsWith(axis)) return null
  const v = parseFloat(token.slice(1))
  return Number.isFinite(v) ? v : null
}

function tokenizeLine(raw: string): { cmd: string | null; tokens: string[]; comment: string } {
  let line = raw
  let comment = ""
  // separa comentário ; e ( )
  const semi = line.indexOf(";")
  if (semi >= 0) {
    comment = line.slice(semi + 1).trim()
    line = line.slice(0, semi)
  }
  line = line.trim()
  if (!line) return { cmd: null, tokens: [], comment }
  const parts = line.split(/\s+/)
  return { cmd: parts[0].toUpperCase(), tokens: parts.slice(1), comment }
}

// ─── Validador ──────────────────────────────────────────────────────────

export function validateGcode(
  gcode: string,
  limits: PrinterLimits = DEFAULT_BIO_LIMITS,
  firmware: FirmwareKind = "marlin",
): ValidationResult {
  const issues: ValidationIssue[] = []
  const lines = gcode.split(/\r?\n/)

  // Estado da máquina virtual
  let absolute = true              // G90 default Marlin
  let absoluteE = true             // M82 default
  let units: "mm" | "inch" = "mm"  // G21 default
  let x = 0, y = 0, z = 0, e = 0
  let feedrate = 0
  let minX = +Infinity, maxX = -Infinity
  let minY = +Infinity, maxY = -Infinity
  let minZ = +Infinity, maxZ = -Infinity
  let totalE = 0
  let totalDistMm = 0
  let totalTimeMin = 0
  let layerCount = 0
  let lastZ = -Infinity
  const uniqueCmds = new Set<string>()
  let codeLines = 0
  let commentLines = 0
  let hasG28 = false, hasG90 = false, hasG91 = false
  let hasG21 = false, hasG20 = false, hasM112 = false

  let firstMoveSeen = false

  // ─── Loop por linha ──
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1
    const raw = lines[i]
    const { cmd, tokens, comment } = tokenizeLine(raw)

    if (!cmd) {
      if (comment) commentLines++
      continue
    }
    codeLines++
    uniqueCmds.add(cmd)

    const letter = cmd[0]
    const num = cmd.slice(1)
    const isG = letter === "G"
    const isM = letter === "M"

    // A. Comandos desconhecidos
    if (isG && !KNOWN_G.has(cmd)) {
      issues.push({
        severity: "warning", line: lineNum, code: "UNKNOWN_GCODE",
        message: `Comando G desconhecido ou não suportado: ${cmd}`,
        raw: raw.trim(),
      })
    } else if (isM && !KNOWN_M.has(cmd)) {
      issues.push({
        severity: "warning", line: lineNum, code: "UNKNOWN_MCODE",
        message: `Comando M desconhecido ou não suportado: ${cmd}`,
        raw: raw.trim(),
      })
    } else if (!isG && !isM && !cmd.startsWith("T")) {
      issues.push({
        severity: "warning", line: lineNum, code: "UNKNOWN_CMD",
        message: `Comando não reconhecido: ${cmd}`,
        raw: raw.trim(),
      })
    }

    // B. Header / modos
    if (cmd === "G20") { units = "inch"; hasG20 = true }
    if (cmd === "G21") { units = "mm"; hasG21 = true }
    if (cmd === "G90") { absolute = true; hasG90 = true }
    if (cmd === "G91") { absolute = false; hasG91 = true }
    if (cmd === "M82") absoluteE = true
    if (cmd === "M83") absoluteE = false
    if (cmd === "G28") {
      hasG28 = true
      issues.push({
        severity: "warning", line: lineNum, code: "G28_PRESENT",
        message: "G28 (Home) detectado — em bioimpressão isso pode destruir bandeja/cartucho. Confirme se é intencional.",
        raw: raw.trim(),
      })
    }
    if (cmd === "M112") {
      hasM112 = true
      issues.push({
        severity: "info", line: lineNum, code: "M112_PRESENT",
        message: "M112 (Emergency stop) no G-code — parada imediata.",
        raw: raw.trim(),
      })
    }

    // C. Movimentos G0/G1/G2/G3
    if (cmd === "G0" || cmd === "G1" || cmd === "G2" || cmd === "G3") {
      firstMoveSeen = true
      let nx = x, ny = y, nz = z, ne = e
      let hasMove = false
      for (const t of tokens) {
        const T = t.toUpperCase()
        const v = parseFloat(T.slice(1))
        if (!Number.isFinite(v)) {
          issues.push({
            severity: "warning", line: lineNum, code: "BAD_PARAM",
            message: `Parâmetro inválido '${t}' em ${cmd}`,
            raw: raw.trim(),
          })
          continue
        }
        if (T.startsWith("X")) { nx = absolute ? v : x + v; hasMove = true }
        else if (T.startsWith("Y")) { ny = absolute ? v : y + v; hasMove = true }
        else if (T.startsWith("Z")) { nz = absolute ? v : z + v; hasMove = true }
        else if (T.startsWith("E")) { ne = absoluteE ? v : e + v }
        else if (T.startsWith("F")) {
          feedrate = v
          if (feedrate < 0) {
            issues.push({
              severity: "error", line: lineNum, code: "NEG_FEED",
              message: `Velocidade negativa F=${feedrate}`,
              raw: raw.trim(),
            })
          } else if (feedrate === 0 && hasMove) {
            issues.push({
              severity: "error", line: lineNum, code: "ZERO_FEED",
              message: `Velocidade F=0 em um movimento — máquina vai travar.`,
              raw: raw.trim(),
            })
          } else if (feedrate > limits.feedrateMaxMmMin) {
            issues.push({
              severity: "warning", line: lineNum, code: "FEED_TOO_HIGH",
              message: `Velocidade F=${feedrate} mm/min excede o máximo da impressora (${limits.feedrateMaxMmMin} mm/min)`,
              raw: raw.trim(),
            })
          }
        }
      }

      // Conversão de unidades — se G20 estiver ativo, posições estão em polegadas
      const scale = units === "inch" ? 25.4 : 1
      const fx = nx * scale, fy = ny * scale, fz = nz * scale

      // D. Out-of-volume
      if (fx < -0.001 || fx > limits.xMaxMm) {
        issues.push({
          severity: "error", line: lineNum, code: "OUT_OF_VOLUME_X",
          message: `X=${fx.toFixed(2)} mm fora do volume (0–${limits.xMaxMm})`,
          raw: raw.trim(),
        })
      }
      if (fy < -0.001 || fy > limits.yMaxMm) {
        issues.push({
          severity: "error", line: lineNum, code: "OUT_OF_VOLUME_Y",
          message: `Y=${fy.toFixed(2)} mm fora do volume (0–${limits.yMaxMm})`,
          raw: raw.trim(),
        })
      }
      if (fz < limits.zMinMm || fz > limits.zMaxMm) {
        issues.push({
          severity: fz < limits.zMinMm ? "error" : "warning",
          line: lineNum,
          code: fz < limits.zMinMm ? "Z_NEGATIVE" : "OUT_OF_VOLUME_Z",
          message: `Z=${fz.toFixed(2)} mm ${fz < limits.zMinMm ? "negativo — colisão com bandeja" : `acima do máximo (${limits.zMaxMm})`}`,
          raw: raw.trim(),
        })
      }

      // E. Extrusão
      const dE = ne - e
      if (dE < -50) {
        issues.push({
          severity: "warning", line: lineNum, code: "BIG_RETRACT",
          message: `Retração absurda E=${dE.toFixed(1)} (mais que 50 mm)`,
          raw: raw.trim(),
        })
      }
      if (dE > 0) totalE += dE

      // F. Bbox + distância + tempo
      if (hasMove) {
        if (fx < minX) minX = fx
        if (fx > maxX) maxX = fx
        if (fy < minY) minY = fy
        if (fy > maxY) maxY = fy
        if (fz < minZ) minZ = fz
        if (fz > maxZ) maxZ = fz

        // Detecta novo layer
        if (fz > lastZ + 0.001 && firstMoveSeen) {
          layerCount++
          lastZ = fz
        }

        const dx = fx - x * scale
        const dy = fy - y * scale
        const dz = fz - z * scale
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
        totalDistMm += dist
        if (feedrate > 0) {
          totalTimeMin += dist / feedrate
        }
      }

      x = nx; y = ny; z = nz; e = ne
    }

    // G. Temperaturas
    if (cmd === "M104" || cmd === "M109") {
      const sToken = tokens.find((t) => t.toUpperCase().startsWith("S"))
      if (sToken) {
        const s = parseFloat(sToken.slice(1))
        if (s > limits.hotendMaxC) {
          issues.push({
            severity: "error", line: lineNum, code: "HOTEND_TOO_HIGH",
            message: `Temperatura do bico ${s}°C excede o limite biológico (${limits.hotendMaxC}°C). Risco de morte celular.`,
            raw: raw.trim(),
          })
        } else if (s > 50) {
          issues.push({
            severity: "warning", line: lineNum, code: "HOTEND_WARM",
            message: `Temperatura do bico ${s}°C — verifique tolerância das células (típico ≤ 37°C).`,
            raw: raw.trim(),
          })
        }
      }
    }
    if (cmd === "M140" || cmd === "M190") {
      const sToken = tokens.find((t) => t.toUpperCase().startsWith("S"))
      if (sToken) {
        const s = parseFloat(sToken.slice(1))
        if (s > limits.bedMaxC) {
          issues.push({
            severity: "error", line: lineNum, code: "BED_TOO_HIGH",
            message: `Temperatura da mesa ${s}°C excede o limite (${limits.bedMaxC}°C).`,
            raw: raw.trim(),
          })
        }
      }
    }
    if (cmd === "M141" || cmd === "M191") {
      const sToken = tokens.find((t) => t.toUpperCase().startsWith("S"))
      if (sToken) {
        const s = parseFloat(sToken.slice(1))
        if (s > limits.chamberMaxC) {
          issues.push({
            severity: "warning", line: lineNum, code: "CHAMBER_HIGH",
            message: `Temperatura da câmara ${s}°C alta para bioimpressão.`,
            raw: raw.trim(),
          })
        }
      }
    }

    // H. Firmware-specific
    if (firmware === "grbl" && isM && (cmd === "M104" || cmd === "M109" || cmd === "M140" || cmd === "M190")) {
      issues.push({
        severity: "warning", line: lineNum, code: "GRBL_INCOMPATIBLE",
        message: `Firmware GRBL não suporta ${cmd} (controle de temperatura).`,
        raw: raw.trim(),
      })
    }
  }

  // ─── Checagens globais (linha 0) ──
  if (codeLines === 0) {
    issues.push({
      severity: "error", line: 0, code: "EMPTY",
      message: "G-code está vazio (nenhuma linha de comando).",
    })
  } else {
    if (!hasG90 && !hasG91) {
      issues.push({
        severity: "warning", line: 0, code: "NO_POSITIONING_MODE",
        message: "Nenhum G90 (absoluto) ou G91 (relativo) declarado. Marlin assume G90 por default, mas é boa prática declarar.",
      })
    }
    if (!hasG21 && !hasG20) {
      issues.push({
        severity: "info", line: 0, code: "NO_UNITS_DECLARED",
        message: "Nenhum G21/G20 declarado. Marlin assume mm (G21) por default.",
      })
    }
  }

  // ─── Inferir firmware família pelo conteúdo ──
  let inferredFirmware: FirmwareKind = "unknown"
  if (uniqueCmds.has("M104") || uniqueCmds.has("M140")) inferredFirmware = "marlin"
  else if (uniqueCmds.has("M115") || uniqueCmds.has("G28")) inferredFirmware = "reprap"

  // ─── Veredito ──
  const errorCount = issues.filter((i) => i.severity === "error").length
  const warningCount = issues.filter((i) => i.severity === "warning").length
  const infoCount = issues.filter((i) => i.severity === "info").length

  let verdict: ValidationResult["verdict"]
  if (errorCount > 0) verdict = "blocked"
  else if (warningCount > 0) verdict = "review"
  else verdict = "safe"

  const stats: ValidationStats = {
    totalLines: lines.length,
    codeLines,
    commentLines,
    uniqueCommands: Array.from(uniqueCmds).sort(),
    bbox: {
      minX: Number.isFinite(minX) ? minX : 0,
      maxX: Number.isFinite(maxX) ? maxX : 0,
      minY: Number.isFinite(minY) ? minY : 0,
      maxY: Number.isFinite(maxY) ? maxY : 0,
      minZ: Number.isFinite(minZ) ? minZ : 0,
      maxZ: Number.isFinite(maxZ) ? maxZ : 0,
    },
    totalExtrusionE: totalE,
    estLayerCount: layerCount,
    estTotalTimeMin: totalTimeMin,
    hasG28, hasG90, hasG91, hasG21, hasG20, hasM112,
    inferredFirmware,
  }

  return { verdict, issues, errorCount, warningCount, infoCount, stats }
}

/** Pretty-print de um veredito para exibição rápida */
export function verdictLabel(v: ValidationResult["verdict"]): { text: string; color: string } {
  switch (v) {
    case "safe":    return { text: "✓ Pronto para envio", color: "emerald" }
    case "review":  return { text: "⚠ Revisar antes de enviar", color: "amber" }
    case "blocked": return { text: "✗ Bloqueado — corrija os erros", color: "rose" }
  }
}
