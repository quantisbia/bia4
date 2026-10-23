/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R26 · Tabela de aprendizado de bioimpressão
 *  ─────────────────────────────────────────────────────────────────────
 *  Cada impressão avaliada vira uma LINHA: material × aplicação × geometria
 *  → parâmetros usados, se a biotinta fluiu, nota, sintomas, ajustes.
 *  A tabela é consultada ANTES de fatiar: a recomendação base (print-recommend)
 *  recebe por cima a correção aprendida — e fica cada vez mais certeira.
 *
 *  Persistência: localStorage (imediato) + espelho em /api/learning (Neon)
 *  quando autenticado; ao carregar, mescla as duas fontes por id.
 *
 *  Regras de aprendizado (explicáveis, sem caixa-preta):
 *   · flowed=false        → fator ×1,25 e pré-carga +20 µL (prioridade máxima)
 *   · rating ≥ 4          → "receita ouro": grava os parâmetros como referência
 *   · rating ≤ 3 + sintoma→ ajustes das regras de print-feedback (interpretFeedback)
 *   · mediana ponderada   → quando há ≥ 3 ouros, usa a mediana dos parâmetros
 * ═══════════════════════════════════════════════════════════════════════
 */

import { interpretFeedback, type LearnedAdjustment, type Rating } from "./print-feedback"
import type { Application } from "./print-recommend"

export const LEARNING_KEY = "bia.learning-table.v1"

export interface LearningRow {
  id: string
  createdAt: number
  /** chave */
  material: string
  materialKey: string           // normalizado (lowercase, sem %/espaços)
  application: Application
  geometryId: string | null
  /** o que foi usado */
  params: {
    nozzle_mm: number; layerHeight_mm: number; speed_mms: number; flowFactor: number; flowPercentM221: number
    infillPattern: string; infillDensity: number; wallCount: number; syringe_mL: number; startPrime_uL?: number
  }
  /** o que aconteceu */
  flowed: boolean               // saiu biotinta?
  rating: Rating
  text: string
  symptoms: string[]
  adjustments: LearnedAdjustment[]
  /** fator efetivo = flowFactor × M221/100 (o que de fato empurrou) */
  effectiveFactor: number
}

export const normalizeMaterial = (m: string) => m.toLowerCase().replace(/[%,]/g, "").replace(/\s+/g, " ").trim()

function load(): LearningRow[] {
  if (typeof window === "undefined") return []
  try { return JSON.parse(localStorage.getItem(LEARNING_KEY) ?? "[]") as LearningRow[] } catch { return [] }
}
function store(rows: LearningRow[]) {
  if (typeof window === "undefined") return
  try { localStorage.setItem(LEARNING_KEY, JSON.stringify(rows.slice(-500))) } catch { /* noop */ }
}

export function listLearning(): LearningRow[] { return load().sort((a, b) => b.createdAt - a.createdAt) }

/** Registra uma impressão avaliada. Também espelha no servidor (best-effort). */
export function recordLearning(input: Omit<LearningRow, "id" | "createdAt" | "materialKey" | "symptoms" | "adjustments" | "effectiveFactor">): LearningRow {
  const { symptoms, adjustments } = interpretFeedback(input.rating, input.text)
  if (!input.flowed) {
    adjustments.unshift(
      { target: "flowMultiplier", op: "mul", value: 1.25, reason: "Você relatou que a biotinta NÃO fluiu — fator de extrusão +25 %.", symptom: "sem extrusão" },
      { target: "primeVolume_uL", op: "add", value: 1, reason: "Prime por trecho +1 µL para vencer o volume morto.", symptom: "sem extrusão" },
    )
    symptoms.unshift("biotinta não fluiu")
  }
  const row: LearningRow = {
    ...input,
    id: `lr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
    materialKey: normalizeMaterial(input.material),
    symptoms, adjustments,
    effectiveFactor: Math.round(input.params.flowFactor * (input.params.flowPercentM221 / 100) * 100) / 100,
  }
  const rows = load(); rows.push(row); store(rows)
  void mirror(row)
  return row
}

async function mirror(row: LearningRow) {
  if (typeof fetch === "undefined") return
  try { await fetch("/api/learning", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(row) }) } catch { /* offline ok */ }
}

/** Baixa do servidor e mescla (chamar ao abrir a Fase 3/5). */
export async function syncLearning(): Promise<LearningRow[]> {
  try {
    const res = await fetch("/api/learning", { cache: "no-store" })
    if (!res.ok) return load()
    const remote = (await res.json()) as { rows?: LearningRow[] }
    const local = load(); const byId = new Map(local.map((r) => [r.id, r]))
    for (const r of remote.rows ?? []) if (!byId.has(r.id)) byId.set(r.id, r)
    const merged = Array.from(byId.values()); store(merged); return merged
  } catch { return load() }
}

export interface LearnedSuggestion {
  /** quantas linhas sustentam a sugestão */
  samples: number
  gold: number
  /** parâmetros medianos das impressões boas (se gold ≥ 1) */
  params?: Partial<LearningRow["params"]>
  /** ajustes pendentes derivados da ÚLTIMA impressão ruim do mesmo material/geometria */
  adjustments: LearnedAdjustment[]
  /** fator efetivo que fez a biotinta fluir (máximo entre as que fluíram, mediana se ≥3) */
  flowFactorThatWorked?: number
  notes: string[]
}

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : undefined }

/** O que a tabela já sabe sobre este material (e, se possível, esta geometria/aplicação). */
export function suggestFromLearning(ctx: { material?: string | null; application?: Application; geometryId?: string | null }): LearnedSuggestion {
  const rows = load()
  const key = ctx.material ? normalizeMaterial(ctx.material) : null
  // escopo: mesmo material (obrigatório se informado), depois refina por aplicação/geometria
  let scope = key ? rows.filter((r) => r.materialKey === key || r.materialKey.includes(key) || key.includes(r.materialKey)) : rows
  const narrow = scope.filter((r) => (ctx.geometryId && r.geometryId === ctx.geometryId) || (ctx.application && r.application === ctx.application))
  if (narrow.length >= 2) scope = narrow
  const notes: string[] = []
  if (scope.length === 0) return { samples: 0, gold: 0, adjustments: [], notes: ["Sem histórico para esta biotinta — usando a recomendação da literatura."] }

  const gold = scope.filter((r) => r.rating >= 4 && r.flowed)
  const flowedRows = scope.filter((r) => r.flowed)
  const out: LearnedSuggestion = { samples: scope.length, gold: gold.length, adjustments: [], notes }

  if (gold.length) {
    const p = (k: keyof LearningRow["params"]) => median(gold.map((r) => r.params[k] as number).filter((v) => typeof v === "number"))
    out.params = { flowFactor: p("flowFactor"), speed_mms: p("speed_mms"), layerHeight_mm: p("layerHeight_mm"), infillDensity: p("infillDensity"), wallCount: p("wallCount"), nozzle_mm: p("nozzle_mm"), syringe_mL: p("syringe_mL") }
    notes.push(`${gold.length} impressão(ões) com nota ≥ 4 desta biotinta — parâmetros medianos aplicados como ponto de partida.`)
  }
  if (flowedRows.length) {
    const eff = flowedRows.map((r) => r.effectiveFactor)
    out.flowFactorThatWorked = eff.length >= 3 ? median(eff) : Math.max(...eff)
    notes.push(`Fator efetivo que fez a biotinta fluir: ${out.flowFactorThatWorked?.toFixed(2)}×.`)
  }
  const bad = scope.filter((r) => r.rating <= 3 || !r.flowed).sort((a, b) => b.createdAt - a.createdAt)[0]
  if (bad && (!gold.length || bad.createdAt > Math.max(...gold.map((g) => g.createdAt)))) {
    out.adjustments = bad.adjustments
    notes.push(`Última impressão (${new Date(bad.createdAt).toLocaleDateString("pt-BR")}) nota ${bad.rating}${bad.flowed ? "" : ", sem fluxo"} — ${bad.adjustments.length} ajuste(s) aplicado(s).`)
  }
  return out
}

/** Estatísticas para a tabela da Fase 5. */
export function learningStats(rows = load()) {
  const byMat = new Map<string, { material: string; n: number; flowRate: number; avgRating: number; bestFactor?: number }>()
  for (const r of rows) {
    const e = byMat.get(r.materialKey) ?? { material: r.material, n: 0, flowRate: 0, avgRating: 0 }
    e.n++; e.flowRate += r.flowed ? 1 : 0; e.avgRating += r.rating
    if (r.flowed && r.rating >= 4) e.bestFactor = e.bestFactor ? Math.min(e.bestFactor, r.effectiveFactor) : r.effectiveFactor
    byMat.set(r.materialKey, e)
  }
  return Array.from(byMat.values()).map((e) => ({ ...e, flowRate: Math.round((e.flowRate / e.n) * 100), avgRating: Math.round((e.avgRating / e.n) * 10) / 10 })).sort((a, b) => b.n - a.n)
}

export function clearLearning() { store([]) }
