/**
 * BIA v4.2 — MICROCANAIS (Difusão e Capilares)
 *
 * Microcanais: diâmetro 20–300 µm, para:
 *   - Difusão de O₂ e nutrientes (limite de Folkman ~200µm sem canais)
 *   - Microcirculação (capilares artificiais)
 *   - Sinalização parácrina (gradientes bioquímicos)
 *   - Migração celular guiada
 *
 * Diâmetros típicos:
 *   - Capilares: 5-10 µm (nativos), impressão mínima 50-80 µm
 *   - Microvilosidades: 20-50 µm
 *   - Microductos: 100-300 µm
 *
 * Diferença CRÍTICA vs macrocanais:
 *   - Não necessitam material sacrificial (podem ser deixados como porosidade intrínseca)
 *   - Espaçamento próximo ao limite de difusão (100-200 µm entre canais)
 *   - Densidade ALTA (100-1000 canais/cm²)
 *   - Padrão frequentemente estocástico (difícil resolver por DLP/extrusão direta)
 *
 * Estratégias de fabricação:
 *   - Freeze-casting direcional (alinhamento térmico)
 *   - Pore-leaching (sal/açúcar dissolvido pós-impressão)
 *   - Gás-foaming (NaHCO₃ + ácido)
 *   - Bioink com esferas de PMMA sacrificial
 *   - Padrões lineares ultrafinos via DLP
 *
 * Referências:
 *   - Homan KA et al. (2019) Nature 569, 505-510 — microchannels renais
 *   - Skylar-Scott MA et al. (2019) Sci. Adv. 5(9), eaaw2459 — SWIFT (embedded)
 *   - Zhu W et al. (2017) Biomaterials 124, 106-115 — microchannel density
 */

import type { BBox2D, Segment2D, Point2D } from "../../core/types"

export type MicroChannelPattern =
  | "linear_dense"       // linhas paralelas densas
  | "cross_dense"        // grade ortogonal densa
  | "hexagonal_pores"    // rede hexagonal fina
  | "stochastic"         // distribuição aleatória (pore-leaching)
  | "radial_capillary"   // capilares radiais (villi-like)
  | "directional_aligned" // fibras alinhadas (freeze-casting)
  | "interpenetrating"   // duas redes independentes (bi-canal)

export interface MicroChannelConfig {
  pattern: MicroChannelPattern
  diameter_um: number         // 20-300 µm
  spacing_um: number          // distância entre canais (100-500 µm típico)
  density_per_mm2?: number    // alternativa a spacing
  angle_deg?: number
  alignmentFactor?: number    // 0-1 (freeze-casting)
  porogenType?: "nacl" | "pmma_beads" | "ice_crystals" | "caco3" | "none"
  porogenSize_um?: number
  seed?: number
  // Parâmetros de difusão
  oxygenDiffusion_mm?: number // para cálculo de limite Folkman
}

export interface MicroChannelResult {
  segments: Segment2D[]
  channelCount: number
  density_per_mm2: number
  avgSpacing_um: number
  porosity_pct: number
  diffusionLimit_um: number     // distância máx até um canal (limite de Folkman)
  folkmanCompliance: boolean    // <200µm atende Folkman
  surfaceAreaRatio: number      // área de superfície / volume (× original)
  notes: string[]
}

// ═══════════════════════════════════════════════════════════════
// PATTERN GENERATORS
// ═══════════════════════════════════════════════════════════════

function microLinearDense(bbox: BBox2D, cfg: MicroChannelConfig): Segment2D[] {
  const segs: Segment2D[] = []
  const spacing_mm = cfg.spacing_um / 1000
  const angle = ((cfg.angle_deg ?? 0) * Math.PI) / 180
  const cosA = Math.cos(angle), sinA = Math.sin(angle)
  const w = bbox.maxX - bbox.minX
  const h = bbox.maxY - bbox.minY
  const diag = Math.sqrt(w * w + h * h)
  const cx = (bbox.minX + bbox.maxX) / 2
  const cy = (bbox.minY + bbox.maxY) / 2
  const n = Math.ceil(diag / spacing_mm)
  for (let i = -Math.ceil(n / 2); i <= Math.ceil(n / 2); i++) {
    const off = i * spacing_mm
    const px = cx + off * -sinA
    const py = cy + off * cosA
    segs.push({
      a: { x: px - diag * cosA, y: py - diag * sinA },
      b: { x: px + diag * cosA, y: py + diag * sinA },
    })
  }
  return segs.map((s) => clipSegment(s, bbox)).filter((s): s is Segment2D => s !== null)
}

function microCrossDense(bbox: BBox2D, cfg: MicroChannelConfig): Segment2D[] {
  return [
    ...microLinearDense(bbox, { ...cfg, angle_deg: 0 }),
    ...microLinearDense(bbox, { ...cfg, angle_deg: 90 }),
  ]
}

/**
 * Rede hexagonal fina — poros interconectados.
 */
function microHexagonalPores(bbox: BBox2D, cfg: MicroChannelConfig): Segment2D[] {
  const segs: Segment2D[] = []
  const cellSize_mm = (cfg.spacing_um / 1000) * 1.2
  const dx = cellSize_mm * 1.5
  const dy = cellSize_mm * Math.sqrt(3)
  for (let j = 0; (bbox.minY + j * dy / 2) <= bbox.maxY; j++) {
    const offX = (j % 2) * (dx / 2)
    for (let i = 0; (bbox.minX + i * dx + offX) <= bbox.maxX + dx; i++) {
      const cx = bbox.minX + i * dx + offX
      const cy = bbox.minY + j * dy / 2
      const verts: Point2D[] = []
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3
        verts.push({
          x: cx + (cellSize_mm / 2) * Math.cos(a),
          y: cy + (cellSize_mm / 2) * Math.sin(a),
        })
      }
      for (let k = 0; k < 6; k++) {
        segs.push({ a: verts[k], b: verts[(k + 1) % 6] })
      }
    }
  }
  return segs.map((s) => clipSegment(s, bbox)).filter((s): s is Segment2D => s !== null)
}

/**
 * Stochastic — pore-leaching ou gás-foaming.
 * Gera "poros" (círculos pequenos) aleatórios como pequenos segmentos cruzados.
 */
function microStochastic(bbox: BBox2D, cfg: MicroChannelConfig): Segment2D[] {
  const rng = seededRng(cfg.seed ?? 42)
  const poreSize_mm = (cfg.porogenSize_um ?? cfg.diameter_um) / 1000
  const density_per_mm2 = cfg.density_per_mm2 ?? 200
  const area = (bbox.maxX - bbox.minX) * (bbox.maxY - bbox.minY)
  const nPores = Math.floor(area * density_per_mm2)
  const segs: Segment2D[] = []
  for (let i = 0; i < nPores; i++) {
    const cx = bbox.minX + rng() * (bbox.maxX - bbox.minX)
    const cy = bbox.minY + rng() * (bbox.maxY - bbox.minY)
    // representa o poro como um "+" pequeno
    const r = poreSize_mm / 2
    segs.push({ a: { x: cx - r, y: cy }, b: { x: cx + r, y: cy } })
    segs.push({ a: { x: cx, y: cy - r }, b: { x: cx, y: cy + r } })
  }
  return segs
}

/**
 * Radial capilar — vilosidades intestinais, glomérulos.
 */
function microRadialCapillary(bbox: BBox2D, cfg: MicroChannelConfig): Segment2D[] {
  const cx = (bbox.minX + bbox.maxX) / 2
  const cy = (bbox.minY + bbox.maxY) / 2
  const rMax = Math.sqrt(
    ((bbox.maxX - bbox.minX) / 2) ** 2 + ((bbox.maxY - bbox.minY) / 2) ** 2,
  )
  const nRays = Math.max(40, Math.floor((2 * Math.PI * rMax) / (cfg.spacing_um / 1000)))
  const segs: Segment2D[] = []
  for (let i = 0; i < nRays; i++) {
    const t = (2 * Math.PI * i) / nRays
    // mini-capilar: não vai até o centro, alcança só até raio máximo
    const rIn = rMax * 0.15
    const rOut = rMax * 0.95
    segs.push({
      a: { x: cx + rIn * Math.cos(t), y: cy + rIn * Math.sin(t) },
      b: { x: cx + rOut * Math.cos(t), y: cy + rOut * Math.sin(t) },
    })
  }
  return segs
}

/**
 * Direcional alinhado — freeze-casting.
 * Canais paralelos com leve ondulação (característica do freeze-casting).
 */
function microDirectionalAligned(bbox: BBox2D, cfg: MicroChannelConfig): Segment2D[] {
  const segs: Segment2D[] = []
  const spacing_mm = cfg.spacing_um / 1000
  const angle = ((cfg.angle_deg ?? 0) * Math.PI) / 180
  const alignment = cfg.alignmentFactor ?? 0.85
  const rng = seededRng(cfg.seed ?? 42)
  const w = bbox.maxX - bbox.minX
  const h = bbox.maxY - bbox.minY
  const diag = Math.sqrt(w * w + h * h)
  const cx = (bbox.minX + bbox.maxX) / 2
  const cy = (bbox.minY + bbox.maxY) / 2
  const n = Math.ceil(diag / spacing_mm)
  const steps = 20

  for (let i = -Math.ceil(n / 2); i <= Math.ceil(n / 2); i++) {
    const off = i * spacing_mm
    const baseX = cx + off * -Math.sin(angle)
    const baseY = cy + off * Math.cos(angle)
    let prev: Point2D | null = null
    for (let s = 0; s <= steps; s++) {
      const t = (s / steps - 0.5) * diag
      // oscilação transversal: maior quando alignment é baixo
      const wiggle = (rng() - 0.5) * spacing_mm * 0.3 * (1 - alignment)
      const px = baseX + t * Math.cos(angle) + wiggle * -Math.sin(angle)
      const py = baseY + t * Math.sin(angle) + wiggle * Math.cos(angle)
      if (prev) segs.push({ a: prev, b: { x: px, y: py } })
      prev = { x: px, y: py }
    }
  }
  return segs.map((s) => clipSegment(s, bbox)).filter((s): s is Segment2D => s !== null)
}

/**
 * Interpenetrantes — duas redes independentes (permite co-cultura).
 * Rede A em 0°, rede B em 60° com shift.
 */
function microInterpenetrating(bbox: BBox2D, cfg: MicroChannelConfig): Segment2D[] {
  const spacingA = cfg.spacing_um / 1000
  const spacingB = spacingA * 1.3  // offset para não coincidir
  return [
    ...microLinearDense(bbox, { ...cfg, spacing_um: spacingA * 1000, angle_deg: 0 }),
    ...microLinearDense(bbox, { ...cfg, spacing_um: spacingB * 1000, angle_deg: 60 }),
  ]
}

// ═══════════════════════════════════════════════════════════════
// DISPATCHER
// ═══════════════════════════════════════════════════════════════
export function generateMicroChannels(
  bbox: BBox2D,
  config: MicroChannelConfig,
): MicroChannelResult {
  let segments: Segment2D[]
  switch (config.pattern) {
    case "linear_dense":        segments = microLinearDense(bbox, config); break
    case "cross_dense":         segments = microCrossDense(bbox, config); break
    case "hexagonal_pores":     segments = microHexagonalPores(bbox, config); break
    case "stochastic":          segments = microStochastic(bbox, config); break
    case "radial_capillary":    segments = microRadialCapillary(bbox, config); break
    case "directional_aligned": segments = microDirectionalAligned(bbox, config); break
    case "interpenetrating":    segments = microInterpenetrating(bbox, config); break
    default:                    segments = microLinearDense(bbox, config)
  }

  const area = (bbox.maxX - bbox.minX) * (bbox.maxY - bbox.minY)
  const density = segments.length / area
  const totalLen = segments.reduce(
    (a, s) => a + Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y), 0,
  )
  const wallThickness_mm = (config.diameter_um * 0.15) / 1000
  const porosity = Math.max(0, Math.min(90,
    (1 - (totalLen * wallThickness_mm) / area) * 100,
  ))

  // Limite de difusão: metade do spacing
  const diffLimit = config.spacing_um / 2
  const folkmanOK = diffLimit <= 200  // Folkman 1971: limite 100-200 µm

  // Aumento de área superficial — proxy baseado em densidade de canais
  const surfaceRatio = 1 + (totalLen * Math.PI * config.diameter_um / 1000) / area

  const notes: string[] = [
    `${config.pattern} — ${segments.length} microcanais, Ø${config.diameter_um}µm`,
    `Densidade: ${density.toFixed(1)} canais/mm², espaçamento ${config.spacing_um}µm`,
    folkmanOK
      ? `✓ Limite de difusão ${diffLimit}µm — dentro do critério Folkman (< 200µm)`
      : `⚠ Limite de difusão ${diffLimit}µm — EXCEDE Folkman (200µm) — risco de necrose`,
  ]
  if (config.porogenType && config.porogenType !== "none") {
    notes.push(`Porogênio: ${config.porogenType}${config.porogenSize_um ? ` (${config.porogenSize_um}µm)` : ""}`)
  }
  if (config.pattern === "directional_aligned") {
    notes.push(`Alinhamento: ${((config.alignmentFactor ?? 0.85) * 100).toFixed(0)}% — freeze-casting típico`)
  }

  return {
    segments,
    channelCount: segments.length,
    density_per_mm2: density,
    avgSpacing_um: config.spacing_um,
    porosity_pct: porosity,
    diffusionLimit_um: diffLimit,
    folkmanCompliance: folkmanOK,
    surfaceAreaRatio: surfaceRatio,
    notes,
  }
}

// ═══════════════════════════════════════════════════════════════
// RECOMENDAÇÕES POR TECIDO (MICRO)
// ═══════════════════════════════════════════════════════════════
export function recommendMicroChannels(
  tissue: string,
): MicroChannelConfig {
  const t = tissue.toLowerCase()
  if (t.includes("osso") || t.includes("bone")) {
    return {
      pattern: "stochastic",
      diameter_um: 80,
      spacing_um: 150,
      density_per_mm2: 250,
      porogenType: "nacl",
      porogenSize_um: 100,
    }
  }
  if (t.includes("figado") || t.includes("hepat") || t.includes("liver")) {
    return {
      pattern: "hexagonal_pores",
      diameter_um: 100,
      spacing_um: 180,
      porogenType: "pmma_beads",
      porogenSize_um: 120,
    }
  }
  if (t.includes("rim") || t.includes("kidney") || t.includes("glomer")) {
    return {
      pattern: "radial_capillary",
      diameter_um: 60,
      spacing_um: 100,
      porogenType: "caco3",
    }
  }
  if (t.includes("pele") || t.includes("skin") || t.includes("derm")) {
    return {
      pattern: "linear_dense",
      diameter_um: 50,
      spacing_um: 120,
      angle_deg: 0,
      porogenType: "none",
    }
  }
  if (t.includes("cartilag") || t.includes("menisco")) {
    return {
      pattern: "directional_aligned",
      diameter_um: 120,
      spacing_um: 200,
      alignmentFactor: 0.9,
      angle_deg: 0,
      porogenType: "ice_crystals",
    }
  }
  if (t.includes("tendao") || t.includes("tendon") || t.includes("ligam")) {
    return {
      pattern: "directional_aligned",
      diameter_um: 80,
      spacing_um: 130,
      alignmentFactor: 0.95,
      angle_deg: 0,
      porogenType: "ice_crystals",
    }
  }
  if (t.includes("intest") || t.includes("gut") || t.includes("colon")) {
    return {
      pattern: "radial_capillary",
      diameter_um: 100,
      spacing_um: 150,
      porogenType: "none",
    }
  }
  if (t.includes("cardiac") || t.includes("cora") || t.includes("heart")) {
    return {
      pattern: "interpenetrating",
      diameter_um: 150,
      spacing_um: 250,
      angle_deg: 0,
      porogenType: "pmma_beads",
    }
  }
  // default
  return {
    pattern: "cross_dense",
    diameter_um: 100,
    spacing_um: 180,
    porogenType: "nacl",
  }
}

// ═══════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════
function seededRng(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function clipSegment(seg: Segment2D, bbox: BBox2D): Segment2D | null {
  const x1 = seg.a.x, y1 = seg.a.y, x2 = seg.b.x, y2 = seg.b.y
  const dx = x2 - x1, dy = y2 - y1
  const p = [-dx, dx, -dy, dy]
  const q = [x1 - bbox.minX, bbox.maxX - x1, y1 - bbox.minY, bbox.maxY - y1]
  let u1 = 0, u2 = 1
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return null }
    else {
      const t = q[i] / p[i]
      if (p[i] < 0) { if (t > u2) return null; if (t > u1) u1 = t }
      else          { if (t < u1) return null; if (t < u2) u2 = t }
    }
  }
  return {
    a: { x: x1 + u1 * dx, y: y1 + u1 * dy },
    b: { x: x1 + u2 * dx, y: y1 + u2 * dy },
  }
}
