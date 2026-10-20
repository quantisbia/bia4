/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R14.3 · Parser clínico pt-BR → TPMSParams
 *  ─────────────────────────────────────────────────────────────────────
 *  Converte uma frase em português natural (digitada OU falada via Web
 *  Speech API) em parâmetros estruturados prontos pra o engine TPMS.
 *
 *  Exemplos de inputs aceitos:
 *    - "Scaffold ósseo 8x6 cm com 70% porosidade estrutura gyroid"
 *    - "Preciso de um scaffold de cartilagem 20mm x 20mm x 5mm"
 *    - "Enxerto alveolar 1,5cm diamond"
 *    - "Mini scaffold de pele 10 mm x 10 mm x 2 mm porosidade 85"
 *    - "quero um bloco gyroid 2x2x2 cm"
 *
 *  Estratégia:
 *   1) Normaliza o texto (lowercase, troca vírgula por ponto, acentos ok)
 *   2) Extrai dimensões via regex (aceita "mm", "cm", "x", "por", "×")
 *   3) Extrai porosidade (0-100% ou 0.0-1.0)
 *   4) Identifica tipo de TPMS por keywords
 *   5) Identifica preset clínico por keywords (sobrepõe TPMS se achar)
 *   6) Preenche defaults sensatos para o que faltar
 *
 *  Lib PURA — zero dependências, zero network. Determinística.
 *
 *  Para prompts complexos onde o regex falha, há um fallback LLM via
 *  OpenAI structured outputs (ver src/app/api/studio/scaffold/parse-llm/).
 *  Esse fallback é opcional e cobra créditos; o parser regex é grátis.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — Out/2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import type { TPMSKind, TPMSParams } from "./tpms"
import { CLINICAL_PRESETS, presetToTPMSParams, porosityToWallThickness } from "./tpms"

export interface ParseResult {
  /** Parâmetros TPMS prontos para generateTPMSMesh(). */
  params: TPMSParams
  /** Preset clínico detectado (se houver). */
  presetId: keyof typeof CLINICAL_PRESETS | null
  /** Lista de "fatos" extraídos do texto, pra feedback ao usuário. */
  extracted: {
    dimensions?: { x: number; y: number; z: number; unit: "mm" }
    porosity?: number
    kind?: TPMSKind
    preset?: string
    cellsPerAxis?: number
  }
  /** Avisos pt-BR quando um default foi usado. */
  warnings: string[]
  /** Score 0-1 de confiança (quanto mais específico, maior). */
  confidence: number
}

/* ═══════════════════════════════════════════════════════════════════════
 *  Catálogo de keywords pt-BR
 * ═══════════════════════════════════════════════════════════════════════ */

/** Mapeia keyword → tipo de TPMS. */
const KIND_KEYWORDS: Record<string, TPMSKind> = {
  "gyroid": "gyroid",
  "giroide": "gyroid",
  "giroid": "gyroid",
  "schwarz": "schwarz_p",
  "schwartz": "schwarz_p",  // typo comum
  "schwarz-p": "schwarz_p",
  "schwarz p": "schwarz_p",
  "diamond": "diamond",
  "diamante": "diamond",
}

/** Mapeia keyword clínica → preset.
 *  Nota: evitamos \b em palavras com acentos — usamos lookahead manual. */
const PRESET_KEYWORDS: Array<{ patterns: RegExp[]; preset: keyof typeof CLINICAL_PRESETS }> = [
  {
    patterns: [
      /\bosso cortical\b/i, /\bcortical\b/i, /\bcalota\b/i,
      /(?:^|[\s.,;:!?])(mandíbula|mandibula)(?=[\s.,;:!?]|$)/i,
    ],
    preset: "scaffold_ossea_cortical",
  },
  {
    patterns: [
      /\bosso esponjoso\b/i, /\besponjoso\b/i, /\btrabécula/i, /\btrabecula/i,
      /(?:^|[\s.,;:!?])(femur|fêmur|tíbia|tibia|vértebra|vertebra)(?=[\s.,;:!?]|$)/i,
    ],
    preset: "scaffold_ossea_esponjosa",
  },
  {
    patterns: [/\bcartilagem\b/i, /\bmenisco\b/i, /\barticular\b/i, /\bcondr/i],
    preset: "scaffold_cartilagem",
  },
  {
    patterns: [
      /\bpele\b/i, /\bderme\b/i, /\bdermic/i, /\bepiderm/i, /\bqueimadura/i,
      /(?:^|[\s.,;:!?])(dérmic|dérmica|dérmico)/i,
    ],
    preset: "scaffold_pele",
  },
  {
    patterns: [
      /\balveolar\b/i, /\bperiodontal\b/i, /\bdente\b/i,
      /\bimplante dent[áa]rio\b/i, /\benxerto maxilar\b/i,
    ],
    preset: "scaffold_alveolar",
  },
  {
    patterns: [
      /\btecido mole\b/i, /\btend[ãa]o/i, /\bligament/i,
      /(?:^|[\s.,;:!?])(músculo|musculo)(?=[\s.,;:!?]|$)/i,
    ],
    preset: "scaffold_tecido_mole",
  },
]

/** Palavra que indica "osso" sem especificar cortical/esponjoso → default esponjoso.
 *  Nota: \b em JS não trata acentos — por isso usamos lookahead manual
 *  (?:^|\s|[.,;:!?]) ... (?=\s|$|[.,;:!?]) para "limites de palavra" que
 *  funcionam com caracteres UTF-8. */
const BONE_FALLBACK = /(?:^|[\s.,;:!?])(ósseo|osseo|ósso|osso|óssea|ossea)(?=[\s.,;:!?]|$)/i

/* ═══════════════════════════════════════════════════════════════════════
 *  Regex de dimensões (aceita 1D, 2D ou 3D; mm ou cm)
 * ═══════════════════════════════════════════════════════════════════════ */

// 3D: "8x6x3", "8 x 6 x 3", "8×6×3", "8 por 6 por 3"
const RE_3D = /(\d+(?:[.,]\d+)?)\s*(?:x|×|por)\s*(\d+(?:[.,]\d+)?)\s*(?:x|×|por)\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|milímetros?|milimetros?|centímetros?|centimetros?)?/i

// 2D (fallback — Z vira default)
const RE_2D = /(\d+(?:[.,]\d+)?)\s*(?:x|×|por)\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|milímetros?|milimetros?|centímetros?|centimetros?)?/i

// 1D isolado com unidade (ex: "20mm", "1.5 cm")
const RE_1D = /(\d+(?:[.,]\d+)?)\s*(mm|cm|milímetros?|milimetros?|centímetros?|centimetros?)/i

// Porosidade: "70%", "porosidade 70", "porosidade 0.7", "porosidade de 85 por cento"
const RE_POROSITY = /\bporosid?ad?e?\b[^\d]{0,20}(\d+(?:[.,]\d+)?)\s*(%|por\s*cento|porcento)?/i
const RE_PERCENT_STANDALONE = /(\d+(?:[.,]\d+)?)\s*%/

// Células por eixo (opcional): "4 células", "6 unidades"
const RE_CELLS = /\b(\d+)\s+(?:célula|celula|unidade)/i

/* ═══════════════════════════════════════════════════════════════════════
 *  Função principal: parseScaffoldPrompt(text)
 * ═══════════════════════════════════════════════════════════════════════ */

export interface ParseOptions {
  /** Defaults quando o texto não especifica (opcional). */
  defaults?: Partial<TPMSParams>
}

const BIA_DEFAULTS: TPMSParams = {
  kind: "gyroid",
  sizeX: 20,
  sizeY: 20,
  sizeZ: 10,
  resolution: 48,
  cellsPerAxis: 4,
  wallThickness: 0.3,
}

export function parseScaffoldPrompt(input: string, opts: ParseOptions = {}): ParseResult {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new Error("Prompt vazio. Diga ou escreva o que você quer gerar.")
  }

  const text = input.trim()
  const normalized = text.toLowerCase()
  const warnings: string[] = []
  const extracted: ParseResult["extracted"] = {}

  // ── 1. Dimensões ──
  let dimensions: { x: number; y: number; z: number; unit: "mm" } | undefined
  const m3d = text.match(RE_3D)
  if (m3d) {
    const [, a, b, c, unit] = m3d
    const factor = isMMUnit(unit) ? 1 : 10 // cm → mm, default cm é mais raro pra scaffolds
    dimensions = {
      x: parseFloatBR(a) * factor,
      y: parseFloatBR(b) * factor,
      z: parseFloatBR(c) * factor,
      unit: "mm",
    }
  } else {
    const m2d = text.match(RE_2D)
    if (m2d) {
      const [, a, b, unit] = m2d
      const factor = isMMUnit(unit) ? 1 : 10
      // Scaffold "placa fina" por padrão: z = 3 mm
      dimensions = {
        x: parseFloatBR(a) * factor,
        y: parseFloatBR(b) * factor,
        z: 3,
        unit: "mm",
      }
      warnings.push(`Dimensão Z não especificada — usei 3 mm (placa fina). Diga "espessura X mm" se quiser outro valor.`)
    } else {
      const m1d = text.match(RE_1D)
      if (m1d) {
        const [, a, unit] = m1d
        const factor = isMMUnit(unit) ? 1 : 10
        const v = parseFloatBR(a) * factor
        dimensions = { x: v, y: v, z: v, unit: "mm" }
        warnings.push(`Só 1 dimensão detectada — gerando cubo ${v}×${v}×${v} mm.`)
      }
    }
  }
  if (dimensions) {
    extracted.dimensions = dimensions
  }

  // ── 2. Porosidade ──
  let porosity: number | undefined
  const mPor = normalized.match(RE_POROSITY)
  if (mPor) {
    const raw = parseFloatBR(mPor[1])
    porosity = raw > 1 ? raw / 100 : raw
  } else {
    const mPct = normalized.match(RE_PERCENT_STANDALONE)
    if (mPct) {
      porosity = parseFloatBR(mPct[1]) / 100
    }
  }
  if (porosity !== undefined) {
    if (porosity < 0.1 || porosity > 0.95) {
      warnings.push(`Porosidade ${(porosity * 100).toFixed(0)}% fora do range útil (10-95%). Ajuste no slider se precisar.`)
      porosity = Math.max(0.1, Math.min(0.95, porosity))
    }
    extracted.porosity = porosity
  }

  // ── 3. Tipo de TPMS ──
  let kind: TPMSKind | undefined
  for (const [kw, k] of Object.entries(KIND_KEYWORDS)) {
    if (normalized.includes(kw)) {
      kind = k
      extracted.kind = k
      break
    }
  }

  // ── 4. Preset clínico ──
  let presetId: keyof typeof CLINICAL_PRESETS | null = null
  for (const { patterns, preset } of PRESET_KEYWORDS) {
    if (patterns.some(p => p.test(normalized))) {
      presetId = preset
      extracted.preset = preset
      break
    }
  }
  // Fallback: "osso" sem especificar → esponjoso (mais comum em pesquisa)
  if (!presetId && BONE_FALLBACK.test(normalized)) {
    presetId = "scaffold_ossea_esponjosa"
    extracted.preset = presetId
  }

  // ── 5. Cells per axis (opcional) ──
  const mCells = normalized.match(RE_CELLS)
  let cellsPerAxis: number | undefined
  if (mCells) {
    cellsPerAxis = parseInt(mCells[1], 10)
    extracted.cellsPerAxis = cellsPerAxis
  }

  // ── 6. Montagem final dos parâmetros ──
  const defaults = { ...BIA_DEFAULTS, ...opts.defaults }

  let params: TPMSParams
  if (presetId) {
    // Preset dá kind + porosityTarget + cellsPerAxis
    const sx = dimensions?.x ?? defaults.sizeX
    const sy = dimensions?.y ?? defaults.sizeY
    const sz = dimensions?.z ?? defaults.sizeZ
    params = presetToTPMSParams(presetId, sx, sy, sz, defaults.resolution)
    // Overrides manuais vindos do prompt
    if (kind) params.kind = kind
    if (porosity !== undefined) {
      params.wallThickness = porosityToWallThickness(porosity, params.kind)
    }
    if (cellsPerAxis !== undefined) params.cellsPerAxis = cellsPerAxis
  } else {
    // Sem preset — monta do zero com defaults
    const finalKind = kind ?? defaults.kind
    params = {
      kind: finalKind,
      sizeX: dimensions?.x ?? defaults.sizeX,
      sizeY: dimensions?.y ?? defaults.sizeY,
      sizeZ: dimensions?.z ?? defaults.sizeZ,
      resolution: defaults.resolution,
      cellsPerAxis: cellsPerAxis ?? defaults.cellsPerAxis,
      wallThickness: porosity !== undefined
        ? porosityToWallThickness(porosity, finalKind)
        : defaults.wallThickness,
    }
    if (!dimensions) {
      warnings.push("Dimensões não especificadas — usando default 20×20×10 mm.")
    }
    if (!kind) {
      warnings.push("Tipo de estrutura não especificado — usando gyroid (melhor pra vascularização).")
    }
    if (porosity === undefined) {
      warnings.push("Porosidade não especificada — usando default 70%.")
    }
  }

  // ── 7. Confiança ──
  let confidence = 0.3 // base
  if (dimensions) confidence += 0.25
  if (porosity !== undefined) confidence += 0.15
  if (kind) confidence += 0.15
  if (presetId) confidence += 0.15
  confidence = Math.min(1, confidence)

  return {
    params,
    presetId,
    extracted,
    warnings,
    confidence,
  }
}

/* ═══════════════════════════════════════════════════════════════════════
 *  Helpers
 * ═══════════════════════════════════════════════════════════════════════ */

function isMMUnit(unit: string | undefined): boolean {
  if (!unit) return true // default mm (mais comum em scaffolds)
  const u = unit.toLowerCase()
  return u.startsWith("mm") || u.startsWith("milím") || u.startsWith("milim")
}

function parseFloatBR(s: string): number {
  // Aceita "1,5" ou "1.5"
  return parseFloat(s.replace(",", "."))
}

/* ═══════════════════════════════════════════════════════════════════════
 *  Preview textual pt-BR (pra devolver pro usuário antes de gerar)
 * ═══════════════════════════════════════════════════════════════════════ */

export function describeParseResult(result: ParseResult): string {
  const { params, presetId, extracted } = result
  const parts: string[] = []

  if (presetId) {
    const label = PRESET_LABELS[presetId] ?? presetId
    parts.push(`🎯 ${label}`)
  }

  const kindLabel = params.kind === "gyroid" ? "Gyroid" : params.kind === "schwarz_p" ? "Schwarz-P" : "Diamond"
  parts.push(`Estrutura: ${kindLabel}`)

  parts.push(`Dimensões: ${params.sizeX}×${params.sizeY}×${params.sizeZ} mm`)

  // Porosidade estimada: 1 - wallThickness/factor (reversível)
  const porosityEst = extracted.porosity ?? (1 - params.wallThickness / 1.4)
  parts.push(`Porosidade alvo: ~${(porosityEst * 100).toFixed(0)}%`)

  parts.push(`${params.cellsPerAxis} células/eixo`)

  return parts.join(" · ")
}

const PRESET_LABELS: Record<string, string> = {
  "scaffold_ossea_cortical": "Scaffold ósseo cortical",
  "scaffold_ossea_esponjosa": "Scaffold ósseo esponjoso",
  "scaffold_cartilagem": "Scaffold de cartilagem",
  "scaffold_pele": "Scaffold de pele",
  "scaffold_alveolar": "Enxerto alveolar (odonto)",
  "scaffold_tecido_mole": "Scaffold de tecido mole",
}

export { PRESET_LABELS }
