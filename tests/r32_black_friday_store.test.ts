/**
 * R32 · Black Friday — 22% OFF em toda a loja, exceto cursos
 *
 * - config central em src/lib/promo/black-friday.ts (22%, cálculo correto)
 * - loja interna (/dashboard/billing): banner "A Black Friday já começou aqui",
 *   preço riscado + promocional em planos e pacotes; Academy marcada como fora
 * - home (/): banner + preço promocional no card Guia; nota "cursos não participam"
 * - landings de curso (/academy, /odontologia) NÃO importam o módulo BF
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { bfPrice, bfSavings, bfPercentLabel, BF_DISCOUNT, BF_EXCLUDED_IDS, isBlackFridayActive, bfPaymentLink, BF_ACADEMY, bfAcademyAnchor, bfAcademyPercent, bfAcademyAnnualPerMonth, bfAcademyCta, bfMsLeft } from "../src/lib/promo/black-friday"

const ROOT = resolve(__dirname, "..")
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8")

describe("R32 · config Black Friday", () => {
  it("desconto é 22% e o cálculo arredonda em centavos", () => {
    expect(BF_DISCOUNT).toBe(0.22)
    expect(bfPercentLabel()).toBe("22% OFF")
    expect(bfPrice(507)).toBe(395.46)
    expect(bfSavings(507)).toBe(111.54)
    expect(bfPrice(2375)).toBe(1852.5)
    expect(bfPrice(29)).toBe(22.62)
    expect(bfPrice(1799)).toBe(1403.22)
  })
  it("R42: turma presencial (ODONTOLOGIA) segue excluída; ACADEMY entrou com oferta própria", () => {
    expect(BF_EXCLUDED_IDS.has("ODONTOLOGIA")).toBe(true)
    expect(BF_EXCLUDED_IDS.has("ACADEMY")).toBe(false)
    expect(BF_EXCLUDED_IDS.has("CLINICO")).toBe(false)
  })
  it("R42: oferta Academy = R$ 395/mês ou R$ 4.325/ano; âncora 2.375 + 12×507 = 8.459 (−49%)", () => {
    expect(BF_ACADEMY.monthly).toBe(395)
    expect(BF_ACADEMY.annual).toBe(4325)
    expect(bfAcademyAnchor()).toBe(8459)
    expect(bfAcademyPercent()).toBe(49)
    expect(bfAcademyAnnualPerMonth()).toBe(360.42)
    expect(BF_ACADEMY.creditsPerMonth).toBe(1500)
  })
  it("R42: CTA cai no WhatsApp com mensagem pronta enquanto o link Asaas não for cadastrado", () => {
    const m = bfAcademyCta("monthly", "https://wa.me/11968632231")
    expect(m.viaAsaas).toBe(BF_ACADEMY.links.monthly !== "")
    if (!m.viaAsaas) { expect(m.href).toMatch(/^https:\/\/wa\.me\/11968632231\?text=/); expect(decodeURIComponent(m.href)).toContain("R$\u00a0395,00") }
    const a = bfAcademyCta("annual", "https://wa.me/11968632231")
    if (!a.viaAsaas) expect(decodeURIComponent(a.href)).toContain("4.325,00")
    expect(bfMsLeft(new Date("2026-11-30T23:59:58-03:00"))).toBeGreaterThan(0)
    expect(bfMsLeft(new Date("2026-12-02T00:00:00-03:00"))).toBe(0)
  })
  it("promoção ativa agora e expira após a data final", () => {
    expect(isBlackFridayActive(new Date("2026-11-20T12:00:00-03:00"))).toBe(true)
    expect(isBlackFridayActive(new Date("2026-12-01T00:00:01-03:00"))).toBe(false)
  })
  it("link promocional cai no original quando não cadastrado", () => {
    expect(bfPaymentLink("CLINICO", "https://www.asaas.com/c/qsnp08rvpuwlj8ip").href).toMatch(/^https:\/\/www\.asaas\.com\/c\//)
  })
})

describe("R32 · loja interna (/dashboard/billing)", () => {
  const src = read("src/app/dashboard/billing/BillingClient.tsx")
  it("banner 'A Black Friday já começou aqui' + 22% em toda a loja", () => {
    expect(src).toContain('data-testid="billing-black-friday-banner"')
    expect(src).toContain("A Black Friday já começou aqui!")
    expect(src).toContain("em toda a loja")
    // R42: chip da Academy + plataforma substitui "Cursos não participam"
    expect(src).toContain('data-testid="billing-bf-academy-chip"')
    expect(src).not.toContain("Cursos não participam")
  })
  it("planos e pacotes usam preço promocional (BfPrice) e link promocional quando houver", () => {
    expect(src).toContain("function BfPrice(")
    expect((src.match(/<BfPrice original=/g) ?? []).length).toBeGreaterThanOrEqual(2)
    expect(src).toContain("bfPaymentLink(pack.id, pack.paymentUrl)")
    expect(src).toContain("bfPaymentLink(plan.id, plan.paymentUrl)")
    expect(src).toContain("bfPaymentLink(planId, plan.paymentUrl)")
  })
  it("preços originais preservados nas definições (507 / 2375 / pacotes)", () => {
    expect(src).toMatch(/price:\s*507/)
    expect(src).toMatch(/price:\s*2375/)
    expect(src).toMatch(/price:\s*29,/)
  })
  it("R42: BIA Academy mostra a oferta curso + plataforma na BF e o preço normal fora dela (sem o BfPrice genérico de 22%)", () => {
    expect(src).toContain('data-testid="billing-academy-bf-offer"')
    expect(src).not.toContain('data-testid="billing-academy-bf-excluded"')
    const academy = src.slice(src.indexOf('data-testid="billing-academy-banner-prospect"'), src.indexOf("Payment info notice"))
    expect(academy).toContain("R$ 2.375,00")            // fallback fora da BF
    expect(academy).toContain("BF_ACADEMY.monthly")
    expect(academy).toContain("BF_ACADEMY.annual")
    expect(academy).toContain("bfAcademyAnchor()")
    expect(academy).not.toContain("BfPrice")
  })
})

describe("R32 · home (/)", () => {
  const src = read("src/app/page.tsx")
  it("banner Black Friday na seção de planos com link para a loja", () => {
    expect(src).toContain('data-testid="home-black-friday-banner"')
    expect(src).toContain("A Black Friday já começou aqui!")
    expect(src).toContain('href="/dashboard/billing"')
  })
  it("card Guia mostra preço promocional e mantém R$ 507 como referência", () => {
    expect(src).toContain('data-testid="home-plan-guide-bf-price"')
    expect(src).toContain("bfPrice(507)")
    expect(src).toMatch(/R\$ 507/)
  })
  it("R42: home anuncia Academy + plataforma na BF e deixa claro que só turmas presenciais ficam fora", () => {
    expect(src).not.toContain("Cursos não participam da Black Friday")
    expect(src).toContain("Turmas presenciais não participam")
    expect(src).toContain('data-testid="home-academy-bf-monthly"')
    expect(src).toContain('data-testid="home-academy-bf-annual"')
    expect(src).toContain("bfAcademyAnchor()")
  })
})

describe("R32/R42 · cursos", () => {
  it("/odontologia (turma presencial) continua sem Black Friday", () => {
    expect(read("src/app/odontologia/_components/OdontologiaLanding.tsx")).not.toContain("promo/black-friday")
    expect(read("src/app/odontologia/_components/copy.ts")).not.toMatch(/black friday/i)
  })
  it("R42: /academy usa a oferta própria (curso + plataforma), não o bfPrice genérico de 22%", () => {
    const src = read("src/app/academy/page.tsx")
    expect(src).toContain("promo/black-friday")
    expect(src).toContain("function AcademyBlackFridayPricing")
    expect(src).toContain('data-testid="academy-bf-pricing"')
    expect(src).toContain('data-testid="academy-bf-anchor"')
    expect(src).toContain('data-testid="academy-bf-cta-monthly"')
    expect(src).toContain('data-testid="academy-bf-cta-annual"')
    expect(src).toContain('data-testid="academy-bf-countdown"')
    expect(src).toContain('data-testid="academy-bf-hero-chip"')
    expect(src).not.toMatch(/bfPrice\(/)
    // preço normal (R$ 2.375) segue no código como fallback pós-BF
    expect(src).toMatch(/PRICE_BRL\s*=\s*2375\b/)
  })
})
