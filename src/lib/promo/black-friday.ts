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

/** Itens que NÃO recebem desconto (cursos). */
export const BF_EXCLUDED_IDS = new Set(["ACADEMY", "ODONTOLOGIA"])

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
