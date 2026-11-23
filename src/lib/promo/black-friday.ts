/**
 * BIA · Promoção Black Friday 2026 — configuração central (R32)
 *
 * 22% OFF em TODA a loja (planos BIA Clínico / Lab Pro e pacotes de créditos),
 * EXCETO cursos (BIA Academy e cursos presenciais/turmas fechadas como
 * /odontologia). Usado por:
 *   - src/app/dashboard/billing/BillingClient.tsx  (loja interna)
 *   - src/app/page.tsx                              (seção de planos da home)
 *
 * Para encerrar a promoção: BF_ACTIVE = false (ou deixe a data expirar).
 *
 * ⚠️ Os links de pagamento Asaas são de valor fixo. Para que o checkout
 * cobre o valor com desconto, crie no painel Asaas links novos com os
 * valores promocionais e preencha BF_PAYMENT_LINKS abaixo. Enquanto uma
 * chave estiver vazia, o CTA usa o link original (valor cheio) e a loja
 * exibe o aviso "desconto aplicado no checkout promocional".
 */

export const BF_ACTIVE = true
export const BF_DISCOUNT = 0.22
export const BF_LABEL = "Black Friday"
/** Último dia da promoção (inclusive), fuso America/Sao_Paulo */
export const BF_ENDS_AT = "2026-11-30T23:59:59-03:00"
export const BF_ENDS_LABEL = "30/11"
export const BF_COUPON = "BLACKFRIDAY22"

/** Links Asaas promocionais (valor com desconto). Vazio = usa o link original. */
export const BF_PAYMENT_LINKS: Record<string, string> = {
  CLINICO: "",
  LAB_PRO: "",
  pack_50: "",
  pack_150: "",
  pack_500: "",
  pack_1500: "",
  pack_5000: "",
}

/** Itens que NÃO recebem desconto (turmas presenciais/fechadas). A BIA Academy ENTROU na
 *  Black Friday em R42 com oferta própria (curso + plataforma) — ver BF_ACADEMY. */
export const BF_EXCLUDED_IDS = new Set(["ODONTOLOGIA"])

/* ─────────────────────────────────────────────────────────────────────────
   R42 · BIA Academy na Black Friday — curso + ACESSO INTEGRAL à plataforma BIA
   Valores confirmados por Janaina (2026-11-19):
     mensal  R$ 395/mês   · anual R$ 4.325/ano
   Ancoragem (aprovada): Academy avulsa R$ 2.375 + 12 × BIA Clínico R$ 507 = R$ 8.459
   → por R$ 4.325 (−49 %). A plataforma inclusa equivale ao plano BIA Clínico.
   Fora do período (isBlackFridayActive() = false) as telas voltam ao preço normal.
───────────────────────────────────────────────────────────────────────── */
export const BF_ACADEMY = {
  /** preço avulso do curso (referência "de") */
  courseList: 2375,
  /** mensalidade do plano BIA Clínico (referência "de") */
  clinicoMonthly: 507,
  /** oferta Black Friday */
  monthly: 395,
  annual: 4325,
  /** créditos mensais do acesso integral (= BIA Clínico) */
  creditsPerMonth: 1500,
  /** Links Asaas da oferta (valor fixo). Vazio = CTA cai no WhatsApp comercial com mensagem pronta. */
  links: { monthly: "", annual: "" } as Record<"monthly" | "annual", string>,
} as const

/** "De" da oferta anual: curso avulso + 12 meses de BIA Clínico (= 8.459). */
export function bfAcademyAnchor(): number {
  return BF_ACADEMY.courseList + 12 * BF_ACADEMY.clinicoMonthly
}
/** Percentual de economia da oferta anual contra a âncora (= 49). */
export function bfAcademyPercent(): number {
  return Math.round((1 - BF_ACADEMY.annual / bfAcademyAnchor()) * 100)
}
/** Equivalente mensal do anual (= 360,42). */
export function bfAcademyAnnualPerMonth(): number {
  return Math.round((BF_ACADEMY.annual / 12) * 100) / 100
}
/** Mensagem pronta para o WhatsApp comercial quando o link Asaas ainda não foi cadastrado. */
export function bfAcademyWhatsAppText(kind: "monthly" | "annual"): string {
  return kind === "monthly"
    ? `Olá! Quero a BIA Academy na Black Friday — plano MENSAL (${brl(BF_ACADEMY.monthly)}/mês) com acesso integral à plataforma BIA.`
    : `Olá! Quero a BIA Academy na Black Friday — plano ANUAL (${brl(BF_ACADEMY.annual)}) com acesso integral à plataforma BIA.`
}
/** Resolve o CTA da oferta: link Asaas se cadastrado, senão WhatsApp com a mensagem pronta. */
export function bfAcademyCta(kind: "monthly" | "annual", whatsappBase: string): { href: string; viaAsaas: boolean } {
  const link = BF_ACADEMY.links[kind]
  if (link) return { href: link, viaAsaas: true }
  return { href: `${whatsappBase}?text=${encodeURIComponent(bfAcademyWhatsAppText(kind))}`, viaAsaas: false }
}
/** Milissegundos até o fim da promoção (≥ 0). */
export function bfMsLeft(now: Date = new Date()): number {
  return Math.max(0, new Date(BF_ENDS_AT).getTime() - now.getTime())
}

export function isBlackFridayActive(now: Date = new Date()): boolean {
  if (!BF_ACTIVE) return false
  return now.getTime() <= new Date(BF_ENDS_AT).getTime()
}

/** Preço com desconto, arredondado para 2 casas (ex.: 507 → 395.46). */
export function bfPrice(original: number): number {
  return Math.round(original * (1 - BF_DISCOUNT) * 100) / 100
}

export function bfSavings(original: number): number {
  return Math.round((original - bfPrice(original)) * 100) / 100
}

export function bfPercentLabel(): string {
  return `${Math.round(BF_DISCOUNT * 100)}% OFF`
}

/** Formata em BRL (pt-BR). */
export function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 })
}

/**
 * Resolve o link de pagamento: promocional se cadastrado, senão o original.
 * Retorna também se o link já é o promocional (para a UI avisar).
 */
export function bfPaymentLink(id: string, original: string): { href: string; promoLink: boolean } {
  const promo = BF_PAYMENT_LINKS[id]
  return promo ? { href: promo, promoLink: true } : { href: original, promoLink: false }
}
