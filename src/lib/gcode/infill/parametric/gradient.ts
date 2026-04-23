/**
 * BIA v4.2 — Gradient Infill
 *
 * Gera infill com densidade variável (gradient) — essencial para:
 *   - Pele: denso na base (derme) → poroso no topo (epiderme)
 *   - Osso cortical-trabecular: denso externo → poroso interno
 *   - Vascularização: gradient radial para mimetizar perfusão
 *
 * Implementação: infill retilíneo (rectilinear) com espaçamento variável
 * em função da posição (x, y, z).
 */

import type { BBox2D, Segment2D } from "../../core/types"

export type GradientAxis = "x" | "y" | "z" | "radial"
export type GradientProfile = "linear" | "exponential" | "sigmoid"

export interface GradientConfig {
  axis: GradientAxis
  profile: GradientProfile
  startDensity: number       // 0–1 (início do gradient)
  endDensity: number         // 0–1 (fim)
  z_mm?: number              // camada atual (necessário se axis="z")
  zMin?: number
  zMax?: number
  angle_deg?: number         // direção das linhas (0=horizontal, 90=vertical)
  minSpacing_mm?: number
  maxSpacing_mm?: number
}

function gradientFunction(t: number, profile: GradientProfile): number {
  const u = Math.max(0, Math.min(1, t))
  switch (profile) {
    case "linear":      return u
    case "exponential": return Math.pow(u, 2.5)
    case "sigmoid":     return 1 / (1 + Math.exp(-10 * (u - 0.5)))
  }
}

export function generateGradientInfill(
  bbox: BBox2D,
  config: GradientConfig,
): Segment2D[] {
  const segs: Segment2D[] = []
  const {
    axis, profile, startDensity, endDensity,
    angle_deg = 0,
    minSpacing_mm = 0.5,
    maxSpacing_mm = 5.0,
    z_mm = 0,
    zMin = 0,
    zMax = 10,
  } = config

  // Calcula densidade média para z (se axis=z)
  const getDensityAtPoint = (x: number, y: number): number => {
    let t = 0
    if (axis === "x") t = (x - bbox.minX) / (bbox.maxX - bbox.minX)
    else if (axis === "y") t = (y - bbox.minY) / (bbox.maxY - bbox.minY)
    else if (axis === "z") t = (z_mm - zMin) / (zMax - zMin)
    else if (axis === "radial") {
      const cx = (bbox.minX + bbox.maxX) / 2
      const cy = (bbox.minY + bbox.maxY) / 2
      const r = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      const rMax = Math.sqrt(
        ((bbox.maxX - bbox.minX) / 2) ** 2 + ((bbox.maxY - bbox.minY) / 2) ** 2,
      )
      t = r / rMax
    }
    const g = gradientFunction(t, profile)
    return startDensity + (endDensity - startDensity) * g
  }

  // Para axis=z, a densidade é constante na camada → retilíneo uniforme
  if (axis === "z") {
    const density = getDensityAtPoint(0, 0)
    const spacing = minSpacing_mm + (1 - density) * (maxSpacing_mm - minSpacing_mm)
    return rectilinear(bbox, spacing, angle_deg)
  }

  // Para axis=x/y/radial, usamos linhas varrendo e calculando espaçamento localmente.
  // Abordagem simples: amostrar centros a espaçamento constante pequeno, e
  // manter apenas os que "passam" no teste de densidade local.
  const baseSpacing = minSpacing_mm
  const allLines = rectilinear(bbox, baseSpacing, angle_deg)
  for (const seg of allLines) {
    const midX = (seg.a.x + seg.b.x) / 2
    const midY = (seg.a.y + seg.b.y) / 2
    const density = getDensityAtPoint(midX, midY)
    // probabilidade de manter a linha proporcional à densidade
    // para gradient pseudo-estocástico: usar hash determinístico
    const hash = Math.sin(midX * 12.9898 + midY * 78.233) * 43758.5453
    const rand = hash - Math.floor(hash)
    if (rand < density) segs.push(seg)
  }

  return segs
}

// ═══════════════════════════════════════════════════════════════
// INFILL RETILÍNEO PADRÃO
// ═══════════════════════════════════════════════════════════════
export function rectilinear(bbox: BBox2D, spacing: number, angle_deg: number): Segment2D[] {
  const segs: Segment2D[] = []
  const angle = (angle_deg * Math.PI) / 180
  const cosA = Math.cos(angle)
  const sinA = Math.sin(angle)

  const w = bbox.maxX - bbox.minX
  const h = bbox.maxY - bbox.minY
  const diag = Math.sqrt(w * w + h * h)
  const cx = (bbox.minX + bbox.maxX) / 2
  const cy = (bbox.minY + bbox.maxY) / 2

  const nLines = Math.ceil(diag / spacing) + 1
  for (let i = -nLines / 2; i < nLines / 2; i++) {
    const offset = i * spacing
    // linha definida por ponto (cx + offset*sin, cy - offset*cos) com direção (cosA, sinA)
    const px = cx + offset * -sinA
    const py = cy + offset * cosA
    // extender muito longe e clipar
    const aX = px - diag * cosA
    const aY = py - diag * sinA
    const bX = px + diag * cosA
    const bY = py + diag * sinA
    const clipped = clipSegmentBBox({ a: { x: aX, y: aY }, b: { x: bX, y: bY } }, bbox)
    if (clipped) segs.push(clipped)
  }
  return segs
}

function clipSegmentBBox(seg: Segment2D, bbox: BBox2D): Segment2D | null {
  // Liang-Barsky clipping
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
