/**
 * BIA v4.2 — Macro and Micro Channels Generator
 *
 * Canais para perfusão e vascularização:
 *   - MACROCANAIS: 300–1000 µm — vasos grandes, perfusão ativa
 *   - MICROCANAIS: 50–300 µm — capilares, difusão O₂/nutrientes
 *
 * Estratégias:
 *   1. Grid de canais paralelos (x, y, ou ambos — cross-hatch)
 *   2. Canais bifurcantes (biomimético — Murray's Law)
 *   3. Canais sacrificiais (Pluronic F127 / gelatin) removidos pós-impressão
 *
 * Referência: Kolesky et al. (2014) Adv. Mater. 26, 3124–3130 —
 * "3D Bioprinting of Vascularized, Heterogeneous Cell-Laden Tissue Constructs"
 */

import type { BBox2D, Segment2D } from "../../core/types"

export type ChannelPattern = "parallel" | "cross_hatch" | "branching" | "radial"
export type ChannelType = "macro" | "micro" | "dual"

export interface ChannelConfig {
  type: ChannelType
  pattern: ChannelPattern
  spacing_mm: number             // distância entre canais
  diameter_um: number            // 50–1000 µm
  depth_mm?: number              // profundidade (se 2D→camada única)
  angle_deg?: number             // orientação
  z_mm?: number                  // altura atual
  bifurcationLevels?: number     // só para pattern="branching"
}

/**
 * Canais paralelos em uma direção.
 */
export function parallelChannels(bbox: BBox2D, config: ChannelConfig): Segment2D[] {
  const { spacing_mm, angle_deg = 0 } = config
  const segs: Segment2D[] = []
  const cosA = Math.cos((angle_deg * Math.PI) / 180)
  const sinA = Math.sin((angle_deg * Math.PI) / 180)

  const w = bbox.maxX - bbox.minX
  const h = bbox.maxY - bbox.minY
  const diag = Math.sqrt(w * w + h * h)
  const cx = (bbox.minX + bbox.maxX) / 2
  const cy = (bbox.minY + bbox.maxY) / 2

  const nLines = Math.ceil(diag / spacing_mm) + 1
  for (let i = -nLines / 2; i < nLines / 2; i++) {
    const offset = i * spacing_mm
    const px = cx + offset * -sinA
    const py = cy + offset * cosA
    segs.push({
      a: { x: px - diag * cosA, y: py - diag * sinA },
      b: { x: px + diag * cosA, y: py + diag * sinA },
    })
  }
  return segs.map((s) => clipSegment(s, bbox)).filter((s): s is Segment2D => s !== null)
}

/**
 * Cross-hatch — duas direções perpendiculares.
 */
export function crossHatchChannels(bbox: BBox2D, config: ChannelConfig): Segment2D[] {
  return [
    ...parallelChannels(bbox, { ...config, angle_deg: 0 }),
    ...parallelChannels(bbox, { ...config, angle_deg: 90 }),
  ]
}

/**
 * Radial — canais saindo do centro (para perfusão radial).
 */
export function radialChannels(bbox: BBox2D, config: ChannelConfig): Segment2D[] {
  const { spacing_mm } = config
  const cx = (bbox.minX + bbox.maxX) / 2
  const cy = (bbox.minY + bbox.maxY) / 2
  const rMax = Math.sqrt(
    ((bbox.maxX - bbox.minX) / 2) ** 2 + ((bbox.maxY - bbox.minY) / 2) ** 2,
  )
  const nRays = Math.max(8, Math.floor((2 * Math.PI * rMax) / spacing_mm))
  const segs: Segment2D[] = []
  for (let i = 0; i < nRays; i++) {
    const theta = (2 * Math.PI * i) / nRays
    segs.push({
      a: { x: cx, y: cy },
      b: { x: cx + rMax * Math.cos(theta), y: cy + rMax * Math.sin(theta) },
    })
  }
  return segs.map((s) => clipSegment(s, bbox)).filter((s): s is Segment2D => s !== null)
}

/**
 * Branching — rede bifurcante inspirada em Murray's Law.
 * Murray: d₀³ = d₁³ + d₂³ (raízes cúbicas dos diâmetros de bifurcação)
 * Simplificação 2D: árvore binária recursiva com ângulo de bifurcação ~37°
 */
export function branchingChannels(bbox: BBox2D, config: ChannelConfig): Segment2D[] {
  const segs: Segment2D[] = []
  const levels = config.bifurcationLevels ?? 4
  const startX = (bbox.minX + bbox.maxX) / 2
  const startY = bbox.minY + 1
  const initialLength = (bbox.maxY - bbox.minY) * 0.35

  const branch = (x0: number, y0: number, angle: number, len: number, depth: number) => {
    if (depth <= 0 || len < 0.5) return
    const x1 = x0 + len * Math.sin(angle)
    const y1 = y0 + len * Math.cos(angle)
    segs.push({ a: { x: x0, y: y0 }, b: { x: x1, y: y1 } })
    // Murray scaling: d_child = d_parent / 2^(1/3) ≈ 0.794
    const nextLen = len * 0.7
    const angLeft  = angle - (Math.PI * 37) / 180
    const angRight = angle + (Math.PI * 37) / 180
    branch(x1, y1, angLeft,  nextLen, depth - 1)
    branch(x1, y1, angRight, nextLen, depth - 1)
  }

  branch(startX, startY, 0, initialLength, levels)
  // Espelhamento descendente (segundo eixo)
  const startY2 = bbox.maxY - 1
  const branchDown = (x0: number, y0: number, angle: number, len: number, depth: number) => {
    if (depth <= 0 || len < 0.5) return
    const x1 = x0 + len * Math.sin(angle)
    const y1 = y0 - len * Math.cos(angle)
    segs.push({ a: { x: x0, y: y0 }, b: { x: x1, y: y1 } })
    const nextLen = len * 0.7
    const angLeft  = angle - (Math.PI * 37) / 180
    const angRight = angle + (Math.PI * 37) / 180
    branchDown(x1, y1, angLeft,  nextLen, depth - 1)
    branchDown(x1, y1, angRight, nextLen, depth - 1)
  }
  branchDown(startX, startY2, 0, initialLength, levels)

  return segs.map((s) => clipSegment(s, bbox)).filter((s): s is Segment2D => s !== null)
}

/**
 * Dispatcher principal.
 */
export function generateChannels(bbox: BBox2D, config: ChannelConfig): Segment2D[] {
  switch (config.pattern) {
    case "parallel":    return parallelChannels(bbox, config)
    case "cross_hatch": return crossHatchChannels(bbox, config)
    case "radial":      return radialChannels(bbox, config)
    case "branching":   return branchingChannels(bbox, config)
    default:            return parallelChannels(bbox, config)
  }
}

// ═══════════════════════════════════════════════════════════════
// CLIPPING UTILITÁRIO
// ═══════════════════════════════════════════════════════════════
function clipSegment(seg: Segment2D, bbox: BBox2D): Segment2D | null {
  const { x: x1, y: y1 } = seg.a
  const { x: x2, y: y2 } = seg.b
  const dx = x2 - x1, dy = y2 - y1
  const p = [-dx, dx, -dy, dy]
  const q = [x1 - bbox.minX, bbox.maxX - x1, y1 - bbox.minY, bbox.maxY - y1]
  let u1 = 0, u2 = 1
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return null
    } else {
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

// ═══════════════════════════════════════════════════════════════
// RECOMENDAÇÕES BIOLÓGICAS
// ═══════════════════════════════════════════════════════════════
export function recommendChannelConfig(
  tissue: string,
  constructDiameter_mm: number,
): ChannelConfig {
  const t = tissue.toLowerCase()
  // Distâncias recomendadas (literatura) por tipo de tecido
  if (t.includes("osso") || t.includes("bone")) {
    return {
      type: "macro", pattern: "cross_hatch",
      spacing_mm: 1.0, diameter_um: 500,
      depth_mm: constructDiameter_mm,
    }
  }
  if (t.includes("figado") || t.includes("hepat") || t.includes("liver")) {
    return {
      type: "dual", pattern: "branching",
      spacing_mm: 0.6, diameter_um: 300,
      bifurcationLevels: 5,
    }
  }
  if (t.includes("vaso") || t.includes("vascul")) {
    return {
      type: "macro", pattern: "parallel",
      spacing_mm: 1.2, diameter_um: 800, angle_deg: 0,
    }
  }
  if (t.includes("pele") || t.includes("skin") || t.includes("derm")) {
    return {
      type: "micro", pattern: "radial",
      spacing_mm: 0.4, diameter_um: 150,
    }
  }
  if (t.includes("cartilag") || t.includes("menisco")) {
    return {
      type: "micro", pattern: "cross_hatch",
      spacing_mm: 0.8, diameter_um: 200,
    }
  }
  // default
  return {
    type: "macro", pattern: "parallel",
    spacing_mm: 1.0, diameter_um: 400, angle_deg: 45,
  }
}
