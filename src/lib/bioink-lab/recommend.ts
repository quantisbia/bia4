/**
 * BIA v4 · R16 · Recomendador de receitas
 * ───────────────────────────────────────
 * Entrada: decisões do usuário (objetivo, células, equipamento, experiência).
 * Saída: receitas ordenadas, cada uma com motivos legíveis (por que sim / por que não).
 */
import type { CellTypeId, Equipment, Goal, Recipe } from "./types"
import { CELL_LABELS, RECIPES } from "./recipes"
import { evaluateRecipeWindow } from "./window"

export type Experience = "first" | "some" | "expert"

export interface Decisions {
  goal: Goal
  cell: CellTypeId
  equipment: Equipment
  experience: Experience
}

export interface Recommendation {
  recipe: Recipe
  score: number
  /** 0 = compatível, 1 = adaptação necessária, 2 = bloqueio (equipamento) */
  blockers: string[]
  warnings: string[]
  reasons: string[]
  fidelity: number
  viability: number
  inWindow: boolean
}

export const DEFAULT_EQUIPMENT: Equipment = { hasLight: false, hasTempHead: false, hasTempBed: false, nozzle_mm: 0.41 }

const NOZZLE_STEPS = [0.2, 0.26, 0.33, 0.41, 0.51, 0.6, 0.84, 1.2]
export function nearestNozzle(mm: number): number {
  return NOZZLE_STEPS.reduce((a, b) => (Math.abs(b - mm) < Math.abs(a - mm) ? b : a))
}

export function recommend(d: Decisions): Recommendation[] {
  const recs = RECIPES.map((recipe) => scoreRecipe(recipe, d))
  recs.sort((a, b) => b.score - a.score)
  return recs
}

export function scoreRecipe(recipe: Recipe, d: Decisions): Recommendation {
  let score = 0
  const reasons: string[] = []
  const warnings: string[] = []
  const blockers: string[] = []

  // ── Objetivo ─────────────────────────────────────────────────────────
  const goalIdx = recipe.goals.indexOf(d.goal)
  if (goalIdx === 0) { score += 40; reasons.push("Receita de referência para este objetivo.") }
  else if (goalIdx > 0) { score += 28; reasons.push("Usada com sucesso para este objetivo na literatura.") }
  else { score -= 25 }

  // ── Células ──────────────────────────────────────────────────────────
  if (d.cell === "none") {
    score += 15
    if (recipe.cellsOk.includes("none")) reasons.push("Funciona acelular — ideal para treinar e validar a geometria.")
  } else if (recipe.cellsOk.includes(d.cell)) {
    score += 25
    reasons.push(`Compatível com ${CELL_LABELS[d.cell]?.label ?? d.cell}.`)
  } else if (recipe.cellsOk.length === 1 && recipe.cellsOk[0] === "none") {
    blockers.push("Receita acelular (tinta de calibração/sacrificial) — não encapsula células.")
    score -= 40
  } else {
    score -= 10
    warnings.push(`Pouco relatada com ${CELL_LABELS[d.cell]?.label ?? d.cell}; valide viabilidade em piloto.`)
  }

  // ── Equipamento ──────────────────────────────────────────────────────
  const req = recipe.requires
  if (req.hasLight && !d.equipment.hasLight) {
    blockers.push("Precisa de fonte de luz 405 nm (fotorreticulação).")
    score -= 50
  }
  if (req.hasTempHead && !d.equipment.hasTempHead) {
    blockers.push("Precisa de cabeçote refrigerado (biotinta deve ficar a ~4–8 °C).")
    score -= 45
  }
  if (req.hasTempBed && !d.equipment.hasTempBed) {
    warnings.push("Mesa fria recomendada (gel firma mais rápido). Sem ela: resfrie a placa antes e imprima peças baixas.")
    score -= 8
  }
  const wantNozzle = recipe.startParams.nozzle_mm
  const have = d.equipment.nozzle_mm
  if (Math.abs(have - wantNozzle) > 0.12) {
    if (have < wantNozzle - 0.12) {
      warnings.push(`Agulha ${have} mm é fina para esta receita (recomendado ${wantNozzle} mm): shear e entupimento aumentam.`)
      score -= 10
    } else {
      warnings.push(`Agulha ${have} mm é mais larga que o recomendado (${wantNozzle} mm): resolução menor, mas células mais felizes.`)
      score -= 3
    }
  } else {
    reasons.push(`Agulha ${have} mm é a indicada.`)
  }

  // ── Experiência ──────────────────────────────────────────────────────
  if (d.experience === "first") {
    if (recipe.level === "starter") { score += 15; reasons.push("Nível iniciante: perdoa erros de preparo.") }
    else if (recipe.level === "advanced") { score -= 15; warnings.push("Receita avançada: comece pela versão starter e migre depois.") }
  } else if (d.experience === "some") {
    if (recipe.level === "advanced") score -= 5
    if (recipe.level === "intermediate") score += 5
  } else {
    if (recipe.level === "advanced") score += 5
  }

  // ── Janela de biofabricação ──────────────────────────────────────────
  const w = evaluateRecipeWindow(recipe, d.cell, { nozzle_mm: have })
  if (w.inWindow) { score += 10; if (w.zone === "sweet") reasons.push("Dentro da janela ideal fidelidade × viabilidade.") }
  else { score -= 10; warnings.push(...w.notes.slice(0, 1)) }

  return {
    recipe, score, blockers, warnings, reasons,
    fidelity: w.fidelity, viability: w.viability, inWindow: w.inWindow,
  }
}

/** Conjunto de receitas "alternativas" (as 2–3 seguintes sem bloqueios) */
export function pickAlternatives(recs: Recommendation[], max = 3): Recommendation[] {
  return recs.slice(1).filter((r) => r.blockers.length === 0).slice(0, max)
}
