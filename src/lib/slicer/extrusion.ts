/**
 * BIA v4 · R15 · BioSlicer — Modelo de extrusão volumétrica
 *
 * Em bioimpressão por SERINGA, o eixo E move o ÊMBOLO (mm).
 *   A_cordão = (w − h)·h + π·(h/2)²   (pista arredondada, Slic3r/Prusa)
 *   E_mm = V_µL / A_seringa_mm²       (1 µL = 1 mm³)
 *
 * Refs: Cordova 2024 (Enderstruder, BD 10 mL r=7.25 mm) · Tashman 2021 (FRESH
 * retraction) · Blaeser 2016 (viabilidade × shear) · Ribeiro 2017 (yield stress).
 */

import type { ExtrusionModel, SyringeSpec } from "./types"

export const SYRINGE_CATALOG: Array<SyringeSpec & { label: string }> = [
  { label: "BD 1 mL (insulina/tuberculina)", volume_mL: 1, innerDiameter_mm: 4.78 },
  { label: "BD 3 mL Luer-Lock", volume_mL: 3, innerDiameter_mm: 8.66 },
  { label: "BD 5 mL Luer-Lock", volume_mL: 5, innerDiameter_mm: 12.06 },
  { label: "BD 10 mL Luer-Lock (BioEnder / Enderstruder)", volume_mL: 10, innerDiameter_mm: 14.5 },
  { label: "BD 20 mL Luer-Lock", volume_mL: 20, innerDiameter_mm: 19.13 },
  { label: "Cartucho 3 cc (CELLINK/Nordson)", volume_mL: 3, innerDiameter_mm: 9.55 },
  { label: "Cartucho 10 cc (Nordson)", volume_mL: 10, innerDiameter_mm: 15.8 },
]

export const NEEDLE_GAUGES: Array<{ gauge: string; id_mm: number; color: string }> = [
  { gauge: "14G", id_mm: 1.60, color: "verde-oliva" },
  { gauge: "16G", id_mm: 1.19, color: "cinza" },
  { gauge: "18G", id_mm: 0.84, color: "verde" },
  { gauge: "20G", id_mm: 0.60, color: "rosa" },
  { gauge: "21G", id_mm: 0.51, color: "lilás" },
  { gauge: "22G", id_mm: 0.41, color: "azul" },
  { gauge: "23G", id_mm: 0.33, color: "laranja" },
  { gauge: "25G", id_mm: 0.26, color: "vermelho" },
  { gauge: "27G", id_mm: 0.21, color: "transparente" },
  { gauge: "30G", id_mm: 0.16, color: "lavanda" },
]

export function syringeArea_mm2(s: SyringeSpec): number {
  const r = s.innerDiameter_mm / 2
  return Math.PI * r * r
}

export function beadArea_mm2(lineWidth: number, layerHeight: number): number {
  const w = Math.max(lineWidth, layerHeight)
  return (w - layerHeight) * layerHeight + Math.PI * (layerHeight / 2) ** 2
}

export function beadVolume_uL(length_mm: number, lineWidth: number, layerHeight: number, flowMultiplier = 1): number {
  return beadArea_mm2(lineWidth, layerHeight) * length_mm * flowMultiplier
}

export function volumeToE(volume_uL: number, model: ExtrusionModel): number {
  switch (model.kind) {
    case "syringe_stepper": {
      const A = syringeArea_mm2(model.syringe ?? { volume_mL: 10, innerDiameter_mm: 14.5 })
      return volume_uL / A
    }
    case "filament_eq": {
      const d = model.filamentDiameter_mm ?? 1.75
      return volume_uL / (Math.PI * (d / 2) ** 2)
    }
    case "pneumatic":
      return volume_uL * 0.01
  }
}

export function ePerMm(lineWidth: number, layerHeight: number, model: ExtrusionModel): number {
  return volumeToE(beadArea_mm2(lineWidth, layerHeight) * model.flowMultiplier, model)
}

export function flowRate_uLs(lineWidth: number, layerHeight: number, speed_mms: number, flowMultiplier = 1): number {
  return beadArea_mm2(lineWidth, layerHeight) * speed_mms * flowMultiplier
}

/** τ_w = 4ηQ/(πR³); correção power-law (3n+1)/(4n). */
export function wallShearStress_Pa(viscosity_PaS: number, flow_uLs: number, nozzleDiameter_mm: number, powerLawN?: number): number {
  const R_m = (nozzleDiameter_mm / 2) / 1000
  const Q_m3s = flow_uLs * 1e-9
  let tau = (4 * viscosity_PaS * Q_m3s) / (Math.PI * R_m ** 3)
  if (powerLawN && powerLawN > 0 && powerLawN < 1) tau *= (3 * powerLawN + 1) / (4 * powerLawN)
  return tau
}

export function nozzleVelocity_mms(flow_uLs: number, nozzleDiameter_mm: number): number {
  return flow_uLs / (Math.PI * (nozzleDiameter_mm / 2) ** 2)
}

/** Blaeser 2016: <5 kPa ~96 % · 5–10 kPa ~91 % · >10 kPa ≤76 %. Penaliza >60 min. */
export function estimateViability_pct(shear_Pa: number, printTime_s: number, hasCells: boolean): number | null {
  if (!hasCells) return null
  const kPa = shear_Pa / 1000
  let v: number
  if (kPa <= 5) v = 97 - kPa * 0.3
  else if (kPa <= 10) v = 95.5 - (kPa - 5) * 1.0
  else if (kPa <= 20) v = 90 - (kPa - 10) * 1.5
  else v = Math.max(40, 75 - (kPa - 20) * 1.2)
  const minutes = printTime_s / 60
  if (minutes > 60) v -= Math.min(15, (minutes - 60) * 0.1)
  return Math.round(Math.max(0, Math.min(100, v)) * 10) / 10
}

export function estimatePressure_kPa(shear_Pa: number, nozzleLength_mm: number, nozzleDiameter_mm: number): number {
  return (4 * shear_Pa * (nozzleLength_mm / nozzleDiameter_mm)) / 1000
}

export function defaultLineWidth(nozzleDiameter_mm: number): number {
  return Math.round(nozzleDiameter_mm * 1.15 * 1000) / 1000
}

export function defaultLayerHeight(nozzleDiameter_mm: number): number {
  return Math.round(nozzleDiameter_mm * 0.8 * 100) / 100
}

export const DEFAULT_EXTRUSION_SYRINGE_10ML: ExtrusionModel = {
  kind: "syringe_stepper",
  syringe: { volume_mL: 10, innerDiameter_mm: 14.5 },
  flowMultiplier: 1.0,
  primeVolume_uL: 0.8,
  retractVolume_uL: 0.6,
  retractSpeed_mms: 2,
  primeDwell_ms: 150,
}
