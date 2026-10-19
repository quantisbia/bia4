/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R14.1 · Plan Quotas — Opção A "Clean & Clareza"
 *  ─────────────────────────────────────────────────────────────────────
 *  Define, por plano, QUAIS recursos exclusivos (não contados em créditos)
 *  o usuário pode usar — e QUANTAS vezes.
 *
 *  Regra de ouro (R14.1):
 *    • FREE    → 1 STL + 1 G-code (teaser, prova de conceito)
 *    • CLINICO → ilimitado (R$ 507/mês · médicos, dentistas)
 *    • LAB_PRO → ilimitado + ferramentas de pesquisa
 *    • GUIDE / ADVANCED / ENTERPRISE / etc. (legados) → ilimitado
 *
 *  O rastreamento de uso usa o CreditTransaction existente filtrado por
 *  reason — mantém o schema compatível sem precisar de migração nova.
 *  Veja hasUsedQuota() abaixo pra lógica de contagem.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — Out/2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import type { SubscriptionPlan } from "@prisma/client"

/* ═══════════════════════════════════════════════════════════════════════
 *  Features cobertas por quota explícita (fora do sistema de créditos)
 * ═══════════════════════════════════════════════════════════════════════ */

export type QuotaFeature =
  | "stl_upload"       // upload de arquivo .stl pro slicer / viewer
  | "gcode_generation" // geração de arquivo .gcode no slicer

/** Quota: número máximo permitido no ciclo de vida da conta.
 *  Infinity = ilimitado. */
export type FeatureQuota = number

export interface PlanQuotas {
  stl_upload: FeatureQuota
  gcode_generation: FeatureQuota
}

/* ═══════════════════════════════════════════════════════════════════════
 *  Tabela principal — Ordem lógica de upgrade
 * ═══════════════════════════════════════════════════════════════════════ */

export const PLAN_QUOTAS: Record<SubscriptionPlan, PlanQuotas> = {
  // 🆓 FREE — Teaser: 1 STL + 1 G-code
  FREE:         { stl_upload: 1,        gcode_generation: 1 },

  // 💎 CLINICO (novo R14.1) — primeiro tier pago (R$ 507/mês)
  CLINICO:      { stl_upload: Infinity, gcode_generation: Infinity },

  // 🚀 LAB_PRO (novo R14.1) — pesquisa (R$ 2.375/ano)
  LAB_PRO:      { stl_upload: Infinity, gcode_generation: Infinity },

  // Planos legados — todos ilimitados pros assinantes existentes
  GUIDE:        { stl_upload: Infinity, gcode_generation: Infinity },
  ORGANOID_LAB: { stl_upload: Infinity, gcode_generation: Infinity },
  DISCOVERY:    { stl_upload: Infinity, gcode_generation: Infinity },
  ADVANCED:     { stl_upload: Infinity, gcode_generation: Infinity },
  ENTERPRISE:   { stl_upload: Infinity, gcode_generation: Infinity },
  ACADEMY:      { stl_upload: Infinity, gcode_generation: Infinity },
}

/* ═══════════════════════════════════════════════════════════════════════
 *  Helpers
 * ═══════════════════════════════════════════════════════════════════════ */

/** Retorna o limite máximo pra uma feature no plano dado. */
export function getQuotaLimit(
  plan: SubscriptionPlan | string | null | undefined,
  feature: QuotaFeature,
): FeatureQuota {
  if (!plan) return PLAN_QUOTAS.FREE[feature]
  const p = PLAN_QUOTAS[plan as SubscriptionPlan]
  if (!p) return PLAN_QUOTAS.FREE[feature] // fallback seguro
  return p[feature]
}

/** True se o plano tem uso ilimitado dessa feature. */
export function isUnlimited(
  plan: SubscriptionPlan | string | null | undefined,
  feature: QuotaFeature,
): boolean {
  return getQuotaLimit(plan, feature) === Infinity
}

/** Checa se o usuário AINDA pode usar a feature dado o quanto já usou. */
export function canUseFeature(
  plan: SubscriptionPlan | string | null | undefined,
  feature: QuotaFeature,
  alreadyUsed: number,
): boolean {
  const limit = getQuotaLimit(plan, feature)
  if (limit === Infinity) return true
  return alreadyUsed < limit
}

/** Retorna quantos usos restam (Infinity se ilimitado). */
export function remainingQuota(
  plan: SubscriptionPlan | string | null | undefined,
  feature: QuotaFeature,
  alreadyUsed: number,
): number {
  const limit = getQuotaLimit(plan, feature)
  if (limit === Infinity) return Infinity
  return Math.max(0, limit - alreadyUsed)
}

/* ═══════════════════════════════════════════════════════════════════════
 *  Rotulagem amigável (pt-BR)
 * ═══════════════════════════════════════════════════════════════════════ */

export const FEATURE_LABELS: Record<QuotaFeature, { label: string; cta: string; description: string }> = {
  stl_upload: {
    label: "Upload de Modelo 3D (STL)",
    cta: "Enviar modelo STL",
    description:
      "Suba um arquivo .stl do seu scaffold ou tecido para o visualizador 3D e o slicer.",
  },
  gcode_generation: {
    label: "Geração de G-code",
    cta: "Gerar instruções de impressão",
    description:
      "Fatie o modelo 3D e gere o G-code pronto para enviar à bioimpressora.",
  },
}

/** Mensagem padrão quando o usuário atinge o limite. */
export function buildQuotaExhaustedMessage(
  feature: QuotaFeature,
  plan: SubscriptionPlan | string = "FREE",
): string {
  const limit = getQuotaLimit(plan, feature)
  const label = FEATURE_LABELS[feature].label
  if (limit === Infinity) return "" // nunca acontece
  if (limit === 1) {
    return `Você já usou seu ${label.toLowerCase()} gratuito. Faça upgrade pro plano Clínico (R$ 507/mês) para usos ilimitados.`
  }
  return `Você atingiu o limite de ${limit} ${label.toLowerCase()}(s) do plano gratuito. Faça upgrade pro plano Clínico (R$ 507/mês) para usos ilimitados.`
}

/** Resumo pra exibir no card de plano (ex: "Grátis · 1 STL + 1 G-code"). */
export function describePlanQuotas(plan: SubscriptionPlan | string): string {
  const stl = getQuotaLimit(plan, "stl_upload")
  const gcode = getQuotaLimit(plan, "gcode_generation")
  if (stl === Infinity && gcode === Infinity) return "Uso ilimitado"
  const parts: string[] = []
  if (stl !== Infinity) parts.push(`${stl} STL`)
  if (gcode !== Infinity) parts.push(`${gcode} G-code`)
  return parts.join(" + ")
}
