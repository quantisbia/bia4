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
import type { AnatomyKind, AnatomyParams } from "./anatomy"
import { ANATOMY_CATALOG, getAnatomyMeta } from "./anatomy"

export interface ParseResult {
  /** ★ R14.4 · Parâmetros da FORMA ANATÔMICA sólida (o que vai no STL). */
  anatomy: AnatomyParams
  /**
   * Padrão de INFILL sugerido (gyroid/schwarz-p/diamond) — NÃO faz parte
   * do STL. É um metadado que a BIA passa pro slicer na próxima etapa
   * (geração do G-code). O STL exportado é sempre o sólido anatômico.
   */
  infillSuggestion: {
    pattern: TPMSKind
    porosity: number
    cellsPerAxis: number
  }
  /** Params TPMS prontos (caso o usuário queira ver o PADRÃO de infill isolado). */
  tpmsParams: TPMSParams
  /** Preset clínico detectado (se houver). */
  presetId: keyof typeof CLINICAL_PRESETS | null
  /** Lista de "fatos" extraídos do texto, pra feedback ao usuário. */
  extracted: {
    anatomyKind?: AnatomyKind
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
 *  R14.4 · Keywords de FORMA ANATÔMICA (prioridade sobre preset clínico)
 * ═══════════════════════════════════════════════════════════════════════ */

const ANATOMY_KEYWORDS: Array<{ patterns: RegExp[]; kind: AnatomyKind }> = [
  {
    patterns: [
      /\bmenisco\b/i, /\bmeia[- ]lua\b/i, /\bmeia lua\b/i, /\bsemi[- ]lunar\b/i,
      /\bcrescent/i,
    ],
    kind: "crescent",
  },
  {
    patterns: [
      /\bcalota\b/i, /\bcrani[aáâ]/i, /\bcran[eê]/i, /\bcraniotomia\b/i,
      /\bcranioplastia\b/i, /\bdefeito craniano\b/i,
    ],
    kind: "cranial_cap",
  },
  {
    patterns: [
      /\bmand[íi]bula\b/i, /\bmandibular\b/i,
      /\barco mandibular\b/i, /\bramo mandibular\b/i,
    ],
    kind: "mandible_seg",
  },
  {
    patterns: [
      /\bf[êe]mur\b/i, /\bt[íi]bia\b/i, /\b[úu]mero\b/i, /\br[áa]dio\b/i,
      /\bdi[áa]fise\b/i, /\bdiafis[áa]rio\b/i, /\bosso longo\b/i,
      /\bbone plug\b/i,
    ],
    kind: "femur_seg",
  },
  {
    patterns: [
      /\borelha\b/i, /\baurícula\b/i, /\bauricula\b/i, /\bauricular\b/i,
      /\bmicrotia\b/i, /\bpavilhão\b/i, /\bpavilhao\b/i,
    ],
    kind: "ear_auricle",
  },
  {
    patterns: [
      /\bdisco intervertebral\b/i, /\bdisco cervical\b/i, /\bdisco lombar\b/i,
      /\bannulus\b/i, /\bher[nñ]i[aá] de disco\b/i,
    ],
    kind: "disc",
  },
  {
    patterns: [
      /\bcilindro\b/i, /\btubo\b/i, /\btubular\b/i,
    ],
    kind: "cylinder",
  },
  {
    patterns: [
      /\bbloco\b/i, /\bret[âa]ngular\b/i, /\bparalelepípedo\b/i, /\bparalelepipedo\b/i,
      /\bcubo\b/i,
    ],
    kind: "block",
  },
]

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

  // ── 3. Tipo de TPMS (infill pattern, não parte do STL) ──
  let kind: TPMSKind | undefined
  for (const [kw, k] of Object.entries(KIND_KEYWORDS)) {
    if (normalized.includes(kw)) {
      kind = k
      extracted.kind = k
      break
    }
  }

  // ── 4. Preset clínico (define infill padrão + sugere forma) ──
  let presetId: keyof typeof CLINICAL_PRESETS | null = null
  for (const { patterns, preset } of PRESET_KEYWORDS) {
    if (patterns.some(p => p.test(normalized))) {
      presetId = preset
      extracted.preset = preset
      break
    }
  }
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

  // ★ R14.4 · 6. FORMA ANATÔMICA (prioridade sobre preset na escolha do mesh)
  let anatomyKind: AnatomyKind | undefined
  for (const { patterns, kind: k } of ANATOMY_KEYWORDS) {
    if (patterns.some(p => p.test(normalized))) {
      anatomyKind = k
      extracted.anatomyKind = k
      break
    }
  }
  if (!anatomyKind && presetId) {
    anatomyKind = inferAnatomyFromPreset(presetId)
  }
  if (!anatomyKind) {
    anatomyKind = "block"
    warnings.push("Forma anatômica não especificada — gerando bloco retangular. Diga 'menisco', 'calota', 'orelha', etc. pra formas específicas.")
  }

  // ── 7. Montagem final dos parâmetros ──
  const defaults = { ...BIA_DEFAULTS, ...opts.defaults }

  // Dimensões: se o usuário não disse, usa dimensões típicas da forma anatômica
  const anatomyMeta = getAnatomyMeta(anatomyKind)
  const finalDims = dimensions ?? {
    x: anatomyMeta.typicalDims.x,
    y: anatomyMeta.typicalDims.y,
    z: anatomyMeta.typicalDims.z,
    unit: "mm" as const,
  }
  if (!dimensions) {
    warnings.push(`Dimensões não especificadas — usando defaults típicos de ${anatomyMeta.shortLabel.toLowerCase()}: ${finalDims.x}×${finalDims.y}×${finalDims.z} mm.`)
  }

  const anatomy: AnatomyParams = {
    kind: anatomyKind,
    sizeX: finalDims.x,
    sizeY: finalDims.y,
    sizeZ: finalDims.z,
    resolution: defaults.resolution,
  }

  // TPMS params (padrão de infill — metadados pro slicer)
  let tpmsParams: TPMSParams
  if (presetId) {
    tpmsParams = presetToTPMSParams(presetId, finalDims.x, finalDims.y, finalDims.z, defaults.resolution)
    if (kind) tpmsParams.kind = kind
    if (porosity !== undefined) tpmsParams.wallThickness = porosityToWallThickness(porosity, tpmsParams.kind)
    if (cellsPerAxis !== undefined) tpmsParams.cellsPerAxis = cellsPerAxis
  } else {
    const finalKind = kind ?? defaults.kind
    tpmsParams = {
      kind: finalKind,
      sizeX: finalDims.x, sizeY: finalDims.y, sizeZ: finalDims.z,
      resolution: defaults.resolution,
      cellsPerAxis: cellsPerAxis ?? defaults.cellsPerAxis,
      wallThickness: porosity !== undefined
        ? porosityToWallThickness(porosity, finalKind)
        : defaults.wallThickness,
    }
  }

  // Infill suggestion derivada
  const inferredPorosity = porosity ?? inferPorosityFromWall(tpmsParams.wallThickness, tpmsParams.kind)
  const infillSuggestion = {
    pattern: tpmsParams.kind,
    porosity: inferredPorosity,
    cellsPerAxis: tpmsParams.cellsPerAxis,
  }

  // ── 8. Confiança ──
  let confidence = 0.3
  if (dimensions) confidence += 0.20
  if (porosity !== undefined) confidence += 0.10
  if (kind) confidence += 0.10
  if (presetId) confidence += 0.15
  if (anatomyKind && anatomyKind !== "block") confidence += 0.15
  confidence = Math.min(1, confidence)

  return {
    anatomy,
    infillSuggestion,
    tpmsParams,
    presetId,
    extracted,
    warnings,
    confidence,
  }
}

/* ═══════════════════════════════════════════════════════════════════════
 *  Mapeamento preset clínico → forma anatômica padrão sugerida
 * ═══════════════════════════════════════════════════════════════════════ */

function inferAnatomyFromPreset(preset: keyof typeof CLINICAL_PRESETS): AnatomyKind {
  switch (preset) {
    case "scaffold_ossea_cortical":  return "cranial_cap"
    case "scaffold_ossea_esponjosa": return "femur_seg"
    case "scaffold_cartilagem":      return "crescent"
    case "scaffold_pele":            return "block"
    case "scaffold_alveolar":        return "mandible_seg"
    case "scaffold_tecido_mole":     return "block"
    default:                         return "block"
  }
}

function inferPorosityFromWall(wall: number, kind: TPMSKind): number {
  const factor = kind === "gyroid" ? 1.5 : kind === "diamond" ? 1.3 : 1.2
  return Math.max(0.1, Math.min(0.95, 1 - wall / factor))
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
  const { anatomy, infillSuggestion, presetId } = result
  const parts: string[] = []

  if (presetId) {
    const label = PRESET_LABELS[presetId] ?? presetId
    parts.push(`🎯 ${label}`)
  }

  const anatomyMeta = getAnatomyMeta(anatomy.kind)
  parts.push(`${anatomyMeta.emoji} ${anatomyMeta.shortLabel}`)
  parts.push(`${anatomy.sizeX}×${anatomy.sizeY}×${anatomy.sizeZ} mm`)

  const patternLabel = infillSuggestion.pattern === "gyroid" ? "Gyroid" :
                       infillSuggestion.pattern === "schwarz_p" ? "Schwarz-P" : "Diamond"
  parts.push(`Infill sugerido: ${patternLabel} ~${(infillSuggestion.porosity * 100).toFixed(0)}%`)

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
