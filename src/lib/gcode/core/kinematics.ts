/**
 * BIA v4.2 — Kinematics utilities
 * Cálculos de distância, tempo, shear stress e volume para G-code
 */

import type { Move, Bioink, Point3D } from "./types"

// ═══════════════════════════════════════════════════════════════
// DISTÂNCIAS E TEMPO
// ═══════════════════════════════════════════════════════════════
export function distance3D(a: Partial<Point3D>, b: Partial<Point3D>): number {
  const dx = (b.x ?? 0) - (a.x ?? 0)
  const dy = (b.y ?? 0) - (a.y ?? 0)
  const dz = (b.z ?? 0) - (a.z ?? 0)
  return Math.sqrt(dx*dx + dy*dy + dz*dz)
}

/** Tempo de um movimento em segundos: d(mm) / v(mm/s) */
export function moveTimeSec(distance_mm: number, feedrate_mm_min: number): number {
  if (feedrate_mm_min <= 0) return 0
  return (distance_mm * 60) / feedrate_mm_min
}

// ═══════════════════════════════════════════════════════════════
// EXTRUSÃO VOLUMÉTRICA
// ═══════════════════════════════════════════════════════════════
/**
 * Volume depositado em µL para um segmento linear extrudado.
 * Modelo: cilindro de bioink (nozzle diameter) × distância
 * V(µL) = π × (r_mm)² × L_mm × flowMultiplier
 * 1 mm³ = 1 µL
 */
export function extrusionVolume_uL(
  distance_mm: number,
  nozzleDiameter_um: number,
  flowMultiplier = 1.0,
  layerHeight_mm?: number,
): number {
  // Se temos layerHeight, usamos retângulo (mais real para deposição): W × H × L
  const w_mm = nozzleDiameter_um / 1000
  if (layerHeight_mm && layerHeight_mm > 0) {
    return w_mm * layerHeight_mm * distance_mm * flowMultiplier
  }
  // Senão, cilindro
  const r = w_mm / 2
  return Math.PI * r * r * distance_mm * flowMultiplier
}

// ═══════════════════════════════════════════════════════════════
// SHEAR STRESS (Hagen-Poiseuille em nozzle)
// ═══════════════════════════════════════════════════════════════
/**
 * Shear stress na parede do nozzle para fluxo laminar.
 * τ_wall = (4 × η × Q) / (π × R³)
 * η: viscosidade (Pa·s)  |  Q: vazão (m³/s)  |  R: raio (m)
 *
 * Para bioink: viscosidade típica 0.1–10 Pa·s (100–10000 cP)
 * Limite para viabilidade celular: τ < 50 Pa (GelMA/Alginate)
 */
export function shearStressWall_Pa(
  viscosity_cP: number,
  flowRate_uL_per_s: number,
  nozzleDiameter_um: number,
): number {
  const eta = viscosity_cP / 1000            // cP → Pa·s (cP = mPa·s)
  const Q = flowRate_uL_per_s * 1e-9         // µL/s → m³/s
  const R = (nozzleDiameter_um / 2) * 1e-6   // µm → m
  if (R <= 0) return 0
  return (4 * eta * Q) / (Math.PI * Math.pow(R, 3))
}

/**
 * Estimativa de viabilidade celular pós-impressão.
 * Modelo empírico baseado em Blaeser et al. (2016) Adv. Healthc. Mater.
 * Viabilidade cai ~linear acima de 5 Pa, atingindo ~60% em 50 Pa.
 */
export function estimateViability_pct(
  peakShear_Pa: number,
  exposureTime_s = 10,
  hasCells = true,
): number {
  if (!hasCells) return 100
  if (peakShear_Pa < 5) return 98
  if (peakShear_Pa > 100) return 30
  // Modelo simplificado: viab = 100 - k·τ·log(t)
  const k = 0.5
  const viab = 100 - k * peakShear_Pa * Math.log10(1 + exposureTime_s)
  return Math.max(20, Math.min(100, Math.round(viab)))
}

// ═══════════════════════════════════════════════════════════════
// ANÁLISE DE MOVES
// ═══════════════════════════════════════════════════════════════
export interface MoveStats {
  totalDistance_mm: number
  travelDistance_mm: number
  extrudeDistance_mm: number
  totalTime_sec: number
  extrudeTime_sec: number
  extrudedVolume_uL: number
  layerCount: number
}

export function analyzeMoves(
  moves: Move[],
  bioink: Bioink,
  layerHeight_mm: number,
): MoveStats {
  let curr: Partial<Point3D> = { x: 0, y: 0, z: 0 }
  const stats: MoveStats = {
    totalDistance_mm: 0,
    travelDistance_mm: 0,
    extrudeDistance_mm: 0,
    totalTime_sec: 0,
    extrudeTime_sec: 0,
    extrudedVolume_uL: 0,
    layerCount: 0,
  }
  const uniqueZ = new Set<number>()

  for (const m of moves) {
    if (m.x === undefined && m.y === undefined && m.z === undefined) continue
    const next: Partial<Point3D> = {
      x: m.x ?? curr.x,
      y: m.y ?? curr.y,
      z: m.z ?? curr.z,
    }
    const d = distance3D(curr, next)
    stats.totalDistance_mm += d
    const feedrate = m.f ?? (m.type === "travel" ? bioink.travelSpeed_mms * 60 : bioink.printSpeed_mms * 60)
    const t = moveTimeSec(d, feedrate)
    stats.totalTime_sec += t
    if (m.type === "extrude") {
      stats.extrudeDistance_mm += d
      stats.extrudeTime_sec += t
      if (m.e !== undefined) {
        stats.extrudedVolume_uL += m.e
      } else {
        stats.extrudedVolume_uL += extrusionVolume_uL(
          d, bioink.nozzleDiameter_um, bioink.flowMultiplier, layerHeight_mm,
        )
      }
    } else if (m.type === "travel") {
      stats.travelDistance_mm += d
    }
    if (next.z !== undefined) uniqueZ.add(Math.round(next.z * 1000) / 1000)
    curr = next
  }
  stats.layerCount = uniqueZ.size
  return stats
}

// ═══════════════════════════════════════════════════════════════
// FORMATAÇÃO
// ═══════════════════════════════════════════════════════════════
export function fmt(n: number | undefined, decimals = 3): string {
  if (n === undefined || Number.isNaN(n)) return ""
  return Number(n).toFixed(decimals).replace(/\.?0+$/, "") || "0"
}

/** Converte mm/s para mm/min (usado no G-code F parameter) */
export function mmsToMmMin(v: number): number {
  return Math.round(v * 60)
}
