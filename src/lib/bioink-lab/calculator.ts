/**
 * BIA v4 · R16 · Calculadora de bancada
 * ─────────────────────────────────────
 * Dado o volume a imprimir e a receita, calcula:
 *  · volume total a preparar (impressão + volume morto + margem)
 *  · massa/volume de cada componente (g, mg, µL)
 *  · divisão biotinta × suspensão celular (ex. 10:1) e número de células
 *  · seringas necessárias
 *
 * Volume morto típico: cartucho 3 mL + agulha 0,41 mm ≈ 0,25 mL (CELLINK/Allevi).
 */
import type { BenchPlan, Component, Recipe } from "./types"

export interface BenchInput {
  recipe: Recipe
  /** volume estimado do construto (mL) — vem do slicer (volume extrudado) ou do usuário */
  printVolume_mL: number
  /** densidade celular alvo (10⁶ cel/mL) — null se acelular */
  cellDensity_Mml: number | null
  /** volume útil da seringa/cartucho (mL) */
  syringe_mL?: number
  /** margem de segurança (fração): 0.3 = +30 % */
  safety?: number
}

const DEAD_VOLUME_PER_SYRINGE_mL = 0.25

/** parse "10 partes : 1 parte" → razão biotinta/células (10) */
export function parseMixRatio(s: string): number {
  const m = s.match(/(\d+(?:[.,]\d+)?)\s*(?:partes?)?\s*(?:biotinta)?\s*:\s*(\d+(?:[.,]\d+)?)/i)
  if (!m) return 10
  const a = parseFloat(m[1].replace(",", "."))
  const b = parseFloat(m[2].replace(",", "."))
  return b > 0 ? a / b : 10
}

function fmt(v: number, digits?: number): string {
  if (!isFinite(v)) return "—"
  if (digits != null) return v.toFixed(digits)
  if (Math.abs(v) >= 100) return v.toFixed(0)
  if (Math.abs(v) >= 10) return v.toFixed(1)
  return v.toFixed(2)
}

/** Massa (g) ou volume (µL/mL) de um componente para volume V (mL) */
export function componentAmount(c: Component, volume_mL: number): { value: string; note?: string } {
  switch (c.unit) {
    case "%w/v": {
      const g = (c.amount / 100) * volume_mL
      return g < 0.1
        ? { value: `${fmt(g * 1000, 1)} mg`, note: "balança analítica (0,1 mg)" }
        : { value: `${fmt(g, 3)} g` }
    }
    case "mg/mL": {
      const mg = c.amount * volume_mL
      return { value: `${fmt(mg, 1)} mg` }
    }
    case "%v/v": {
      const mL = (c.amount / 100) * volume_mL
      return c.amount >= 100
        ? { value: `q.s.p. ${fmt(volume_mL)} mL`, note: "completar o volume" }
        : { value: `${fmt(mL)} mL` }
    }
    case "mM": {
      // reagente de reticulação — volume do banho ≈ 10× o volume do construto
      const bath_mL = Math.max(5, volume_mL * 10)
      // massa de CaCl₂·2H₂O (147 g/mol) para o banho
      const g = (c.amount / 1000) * (bath_mL / 1000) * 147
      return { value: `${fmt(g, 3)} g em ${fmt(bath_mL, 0)} mL`, note: "banho (CaCl₂·2H₂O, 147 g/mol)" }
    }
    case "U/mL": {
      const bath_mL = Math.max(2, volume_mL * 3)
      return { value: `${fmt(c.amount * bath_mL, 0)} U em ${fmt(bath_mL, 0)} mL`, note: "solução de reticulação" }
    }
  }
}

export function planBench(input: BenchInput): BenchPlan {
  const { recipe, printVolume_mL, cellDensity_Mml } = input
  const syringe_mL = input.syringe_mL ?? 3
  const safety = input.safety ?? 0.3

  const syringes = Math.max(1, Math.ceil(printVolume_mL / Math.max(syringe_mL - DEAD_VOLUME_PER_SYRINGE_mL, 0.5)))
  const deadVolume_mL = syringes * DEAD_VOLUME_PER_SYRINGE_mL
  const rawTotal = (printVolume_mL + deadVolume_mL) * (1 + safety)
  // arredonda para cima em 0,5 mL (pesagens práticas)
  const totalVolume_mL = Math.max(1, Math.ceil(rawTotal * 2) / 2)

  const hasCells = cellDensity_Mml != null && cellDensity_Mml > 0 && recipe.cellDensity_Mml[1] > 0
  const ratio = parseMixRatio(recipe.cellMixRatio)
  const cellSuspension_mL = hasCells ? totalVolume_mL / (ratio + 1) : 0
  const bioinkVolume_mL = totalVolume_mL - cellSuspension_mL
  const cellsNeeded_M = hasCells ? cellDensity_Mml! * totalVolume_mL : null

  const lines: BenchPlan["lines"] = []
  for (const c of recipe.components) {
    if (c.role === "crosslinker" && (c.unit === "mM" || c.unit === "U/mL")) {
      const a = componentAmount(c, printVolume_mL)
      lines.push({ name: c.name, value: a.value, note: a.note })
      continue
    }
    if (c.role === "crosslinker" && c.unit === "%w/v") {
      // banho de suporte (FRESH) — volume ~ 10× construto
      const bath = Math.max(10, printVolume_mL * 10)
      const a = componentAmount(c, bath)
      lines.push({ name: c.name, value: a.value, note: `banho de ${fmt(bath, 0)} mL` })
      continue
    }
    // componentes da biotinta: calculados para o volume DE BIOTINTA (sem células),
    // mas a concentração final após mistura cai por (ratio/(ratio+1)) — avisamos.
    const a = componentAmount(c, bioinkVolume_mL)
    const dilNote = hasCells && c.role === "polymer"
      ? `conc. final após células: ${fmt(c.amount * (ratio / (ratio + 1)), 2)} ${c.unit}`
      : a.note
    lines.push({ name: c.name, value: a.value, note: dilNote })
  }

  if (hasCells) {
    lines.push({
      name: "Suspensão celular",
      value: `${fmt(cellSuspension_mL)} mL com ${fmt(cellsNeeded_M!, 1)} × 10⁶ células`,
      note: `concentrar a ${fmt(cellsNeeded_M! / cellSuspension_mL, 0)} × 10⁶ cel/mL antes de misturar (${recipe.cellMixRatio.split("(")[0].trim()})`,
    })
  }

  return {
    totalVolume_mL,
    bioinkVolume_mL: round2(bioinkVolume_mL),
    cellSuspension_mL: round2(cellSuspension_mL),
    cellsNeeded_M: cellsNeeded_M == null ? null : round2(cellsNeeded_M),
    lines,
    deadVolume_mL: round2(deadVolume_mL),
    perSyringe_mL: round2(Math.min(syringe_mL, totalVolume_mL / syringes)),
    syringes,
  }
}

const round2 = (v: number) => Math.round(v * 100) / 100

/** Estimativa de volume (mL) a partir de dimensões — para quem não passou pelo slicer */
export function estimateVolume_mL(x_mm: number, y_mm: number, z_mm: number, infillPercent: number, shape: "box" | "cylinder" = "box"): number {
  const area = shape === "cylinder" ? Math.PI * (x_mm / 2) * (y_mm / 2) : x_mm * y_mm
  const mm3 = area * z_mm
  // perímetros + infill: aproxima fração sólida = infill + 15 % de casca
  const frac = Math.min(1, infillPercent / 100 + 0.15)
  return round2((mm3 * frac) / 1000)
}
