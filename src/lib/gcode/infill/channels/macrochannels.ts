/**
 * BIA v4.2 — MACROCANAIS (Vasos e Perfusão Ativa)
 *
 * Macrocanais: diâmetro 300–1200 µm, para:
 *   - Perfusão ativa em biorreator (fluxo convectivo)
 *   - Pré-vascularização (canais revestidos com HUVEC)
 *   - Drenagem linfática artificial
 *   - Bypass de difusão (tecidos > 1-2 mm espessura — limite de Folkman)
 *
 * Diâmetros típicos por aplicação:
 *   - Arteríolas: 300-500 µm
 *   - Vênulas: 500-800 µm
 *   - Vasos perfusão: 800-1200 µm
 *
 * Lei de Murray (1926): diâmetro ótimo minimiza gasto metabólico
 *     d_parent³ = d_child1³ + d_child2³
 * Ratio geométrico típico: d_child/d_parent ≈ 2^(-1/3) ≈ 0.794
 *
 * Estratégias de fabricação:
 *   - Sacrificial (Pluronic F127, gelatin melt-off, carbohydrate glass)
 *   - Coaxial (bioink + core removível)
 *   - Tubular (extrusão com mandril)
 *
 * Referências principais:
 *   - Kolesky DB et al. (2014) Adv. Mater. 26, 3124-3130
 *   - Miller JS et al. (2012) Nat. Mater. 11, 768-774 (carbohydrate glass)
 *   - Grigoryan B et al. (2019) Science 364(6439), 458-464 (multivascular)
 */

import type { BBox2D, Segment2D, Point2D } from "../../core/types"

export type MacroChannelPattern =
  | "parallel"         // canais paralelos unidirecionais (perfusão linear)
  | "cross_hatch"      // rede ortogonal (perfusão 2D)
  | "branching_murray" // árvore Murray (biomimético vascular)
  | "hexagonal"        // rede hexagonal (fígado — tríades portais)
  | "serpentine"       // serpentina (trocador de calor / biorreator)
  | "spiral"           // espiral (órgãos tubulares — glândula, intestino)

export interface MacroChannelConfig {
  pattern: MacroChannelPattern
  diameter_um: number          // 300-1200 µm
  spacing_mm: number           // entre canais principais
  angle_deg?: number           // orientação principal
  bifurcationLevels?: number   // Murray
  hexCellSize_mm?: number      // hexagonal
  serpentineTurns?: number     // serpentina
  sacrificialMaterial?: "pluronic_f127" | "gelatin" | "carbohydrate_glass" | "none"
  // Geração de parede (tubular) ou linha central (sacrificial)?
  mode: "tubular" | "sacrificial_core" | "centerline_only"
}

export interface MacroChannelResult {
  segments: Segment2D[]
  totalLength_mm: number
  channelCount: number
  avgDiameter_um: number
  estimatedPerfusion_mLminKg: number  // capacidade de fluxo estimada
  vascularEfficiency: number           // 0-1, Murray compliance
  notes: string[]
}

// ═══════════════════════════════════════════════════════════════
// PATTERN GENERATORS
// ═══════════════════════════════════════════════════════════════

function macroParallel(bbox: BBox2D, cfg: MacroChannelConfig): Segment2D[] {
  const segs: Segment2D[] = []
  const angle = ((cfg.angle_deg ?? 0) * Math.PI) / 180
  const cosA = Math.cos(angle), sinA = Math.sin(angle)
  const w = bbox.maxX - bbox.minX
  const h = bbox.maxY - bbox.minY
  const diag = Math.sqrt(w * w + h * h)
  const cx = (bbox.minX + bbox.maxX) / 2
  const cy = (bbox.minY + bbox.maxY) / 2
  const n = Math.ceil(diag / cfg.spacing_mm)
  for (let i = -Math.ceil(n / 2); i <= Math.ceil(n / 2); i++) {
    const off = i * cfg.spacing_mm
    const px = cx + off * -sinA
    const py = cy + off * cosA
    segs.push({
      a: { x: px - diag * cosA, y: py - diag * sinA },
      b: { x: px + diag * cosA, y: py + diag * sinA },
    })
  }
  return segs.map((s) => clipSegment(s, bbox)).filter((s): s is Segment2D => s !== null)
}

function macroCrossHatch(bbox: BBox2D, cfg: MacroChannelConfig): Segment2D[] {
  return [
    ...macroParallel(bbox, { ...cfg, angle_deg: 0 }),
    ...macroParallel(bbox, { ...cfg, angle_deg: 90 }),
  ]
}

/**
 * Árvore de Murray — bifurcação ótima (d_p³ = d_c1³ + d_c2³).
 * Simétrica, ângulo de bifurcação 37° (ótimo Murray).
 */
function macroBranchingMurray(bbox: BBox2D, cfg: MacroChannelConfig): Segment2D[] {
  const segs: Segment2D[] = []
  const levels = cfg.bifurcationLevels ?? 4
  const murrayRatio = Math.pow(2, -1 / 3)  // 0.7937
  const murrayAngle = (37 * Math.PI) / 180
  const startX = (bbox.minX + bbox.maxX) / 2
  const startY = bbox.minY + 0.5
  const initLen = (bbox.maxY - bbox.minY) * 0.35

  const branch = (
    x0: number, y0: number, ang: number, len: number, depth: number,
  ): void => {
    if (depth <= 0 || len < 0.3) return
    const x1 = x0 + len * Math.sin(ang)
    const y1 = y0 + len * Math.cos(ang)
    segs.push({ a: { x: x0, y: y0 }, b: { x: x1, y: y1 } })
    const nextLen = len * murrayRatio * 1.15  // compensação para exibição
    branch(x1, y1, ang - murrayAngle, nextLen, depth - 1)
    branch(x1, y1, ang + murrayAngle, nextLen, depth - 1)
  }
  branch(startX, startY, 0, initLen, levels)

  // Também descendente (segunda árvore espelhada — veia + artéria)
  const startY2 = bbox.maxY - 0.5
  const branchDown = (
    x0: number, y0: number, ang: number, len: number, depth: number,
  ): void => {
    if (depth <= 0 || len < 0.3) return
    const x1 = x0 + len * Math.sin(ang)
    const y1 = y0 - len * Math.cos(ang)
    segs.push({ a: { x: x0, y: y0 }, b: { x: x1, y: y1 } })
    const nextLen = len * murrayRatio * 1.15
    branchDown(x1, y1, ang - murrayAngle, nextLen, depth - 1)
    branchDown(x1, y1, ang + murrayAngle, nextLen, depth - 1)
  }
  branchDown(startX, startY2, 0, initLen, levels)

  return segs.map((s) => clipSegment(s, bbox)).filter((s): s is Segment2D => s !== null)
}

/**
 * Hexagonal — lóbulos tipo parênquima hepático.
 * Cada hexágono tem um canal central (veia central lobular).
 */
function macroHexagonal(bbox: BBox2D, cfg: MacroChannelConfig): Segment2D[] {
  const cellSize = cfg.hexCellSize_mm ?? cfg.spacing_mm * 1.5
  const segs: Segment2D[] = []
  const dx = cellSize * 1.5
  const dy = cellSize * Math.sqrt(3)
  for (let j = 0; (bbox.minY + j * dy / 2) <= bbox.maxY; j++) {
    const offsetX = (j % 2) * (dx / 2)
    for (let i = 0; (bbox.minX + i * dx + offsetX) <= bbox.maxX + dx; i++) {
      const cx = bbox.minX + i * dx + offsetX
      const cy = bbox.minY + j * dy / 2
      // vertices do hexágono
      const verts: Point2D[] = []
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3
        verts.push({ x: cx + (cellSize / 2) * Math.cos(a),
                     y: cy + (cellSize / 2) * Math.sin(a) })
      }
      for (let k = 0; k < 6; k++) {
        segs.push({ a: verts[k], b: verts[(k + 1) % 6] })
      }
    }
  }
  return segs.map((s) => clipSegment(s, bbox)).filter((s): s is Segment2D => s !== null)
}

/**
 * Serpentina — canal único longo com curvas.
 */
function macroSerpentine(bbox: BBox2D, cfg: MacroChannelConfig): Segment2D[] {
  const turns = cfg.serpentineTurns ?? Math.floor((bbox.maxY - bbox.minY) / cfg.spacing_mm)
  const segs: Segment2D[] = []
  const stripH = (bbox.maxY - bbox.minY) / turns
  for (let i = 0; i < turns; i++) {
    const y = bbox.minY + (i + 0.5) * stripH
    const [x1, x2] = i % 2 === 0
      ? [bbox.minX + 0.3, bbox.maxX - 0.3]
      : [bbox.maxX - 0.3, bbox.minX + 0.3]
    segs.push({ a: { x: x1, y }, b: { x: x2, y } })
    if (i < turns - 1) {
      segs.push({
        a: { x: x2, y },
        b: { x: x2, y: y + stripH },
      })
    }
  }
  return segs
}

/**
 * Espiral — para órgãos tubulares como intestino, ducto.
 */
function macroSpiral(bbox: BBox2D, cfg: MacroChannelConfig): Segment2D[] {
  const segs: Segment2D[] = []
  const cx = (bbox.minX + bbox.maxX) / 2
  const cy = (bbox.minY + bbox.maxY) / 2
  const rMax = Math.min((bbox.maxX - bbox.minX), (bbox.maxY - bbox.minY)) / 2 - 0.5
  const pitch = cfg.spacing_mm
  const turns = Math.floor(rMax / pitch)
  const steps = turns * 40
  let prev: Point2D | null = null
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * turns * 2 * Math.PI
    const r = (t / (2 * Math.PI)) * pitch
    const p = { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) }
    if (prev) segs.push({ a: prev, b: p })
    prev = p
  }
  return segs
}

// ═══════════════════════════════════════════════════════════════
// DISPATCHER
// ═══════════════════════════════════════════════════════════════
export function generateMacroChannels(
  bbox: BBox2D,
  config: MacroChannelConfig,
): MacroChannelResult {
  let segments: Segment2D[]
  switch (config.pattern) {
    case "parallel":          segments = macroParallel(bbox, config); break
    case "cross_hatch":       segments = macroCrossHatch(bbox, config); break
    case "branching_murray":  segments = macroBranchingMurray(bbox, config); break
    case "hexagonal":         segments = macroHexagonal(bbox, config); break
    case "serpentine":        segments = macroSerpentine(bbox, config); break
    case "spiral":            segments = macroSpiral(bbox, config); break
    default:                  segments = macroParallel(bbox, config)
  }

  const totalLength = segments.reduce(
    (a, s) => a + Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y), 0,
  )

  // Estimativa de fluxo via Hagen-Poiseuille simplificado
  // Q = π·d⁴·ΔP / (128·η·L) ; por kg e por min em mL
  const d_m = config.diameter_um * 1e-6
  const area_m2 = Math.PI * (d_m / 2) ** 2
  const v_ms = 0.001  // velocidade típica perfusão biorreator
  const perfusion_mLmin = segments.length * area_m2 * v_ms * 1e9 * 60  // mL/min
  const perfusion_per_kg = perfusion_mLmin * 5  // normalização ~200g scaffold

  // Murray efficiency (só faz sentido para branching)
  const vascEff = config.pattern === "branching_murray" ? 0.92 :
                  config.pattern === "hexagonal" ? 0.80 :
                  config.pattern === "spiral" ? 0.65 : 0.55

  const notes: string[] = [
    `${config.pattern} — ${segments.length} canais, Ø${config.diameter_um}µm`,
    config.sacrificialMaterial && config.sacrificialMaterial !== "none"
      ? `Material sacrificial: ${config.sacrificialMaterial}`
      : "Canais estruturais (sem material sacrificial)",
  ]
  if (config.pattern === "branching_murray") {
    notes.push(`Bifurcações Murray: ${config.bifurcationLevels ?? 4} níveis, razão 0.794`)
  }
  if (config.diameter_um > 800) {
    notes.push("⚠ Diâmetro > 800 µm — requer suporte estrutural durante impressão")
  }

  return {
    segments,
    totalLength_mm: totalLength,
    channelCount: segments.length,
    avgDiameter_um: config.diameter_um,
    estimatedPerfusion_mLminKg: perfusion_per_kg,
    vascularEfficiency: vascEff,
    notes,
  }
}

// ═══════════════════════════════════════════════════════════════
// RECOMENDAÇÕES POR TECIDO (MACRO)
// ═══════════════════════════════════════════════════════════════
export function recommendMacroChannels(
  tissue: string,
  constructThickness_mm: number,
): MacroChannelConfig {
  const t = tissue.toLowerCase()
  if (t.includes("osso") || t.includes("bone")) {
    return {
      pattern: "cross_hatch",
      diameter_um: 600,
      spacing_mm: 1.2,
      mode: "sacrificial_core",
      sacrificialMaterial: "pluronic_f127",
    }
  }
  if (t.includes("figado") || t.includes("hepat") || t.includes("liver")) {
    return {
      pattern: "hexagonal",
      diameter_um: 500,
      spacing_mm: 0.8,
      hexCellSize_mm: 1.2,
      mode: "sacrificial_core",
      sacrificialMaterial: "carbohydrate_glass",
    }
  }
  if (t.includes("rim") || t.includes("kidney") || t.includes("renal")) {
    return {
      pattern: "branching_murray",
      diameter_um: 700,
      spacing_mm: 1.0,
      bifurcationLevels: 5,
      mode: "sacrificial_core",
      sacrificialMaterial: "pluronic_f127",
    }
  }
  if (t.includes("cardiac") || t.includes("cora") || t.includes("heart")) {
    return {
      pattern: "branching_murray",
      diameter_um: 900,
      spacing_mm: 1.5,
      bifurcationLevels: 4,
      mode: "sacrificial_core",
      sacrificialMaterial: "gelatin",
    }
  }
  if (t.includes("pele") || t.includes("skin")) {
    return {
      pattern: "parallel",
      diameter_um: 400,
      spacing_mm: 1.5,
      mode: "centerline_only",
      sacrificialMaterial: "none",
    }
  }
  // default
  return {
    pattern: constructThickness_mm > 3 ? "branching_murray" : "parallel",
    diameter_um: 600,
    spacing_mm: 1.2,
    bifurcationLevels: 4,
    mode: "sacrificial_core",
    sacrificialMaterial: "pluronic_f127",
  }
}

// ═══════════════════════════════════════════════════════════════
// CLIPPING (Liang-Barsky)
// ═══════════════════════════════════════════════════════════════
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
