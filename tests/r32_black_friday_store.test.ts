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
import { bfPrice, bfSavings, bfPercentLabel, BF_DISCOUNT, BF_EXCLUDED_IDS, isBlackFridayActive, bfPaymentLink } from "../src/lib/promo/black-friday"

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
  it("cursos (ACADEMY, ODONTOLOGIA) estão excluídos", () => {
    expect(BF_EXCLUDED_IDS.has("ACADEMY")).toBe(true)
    expect(BF_EXCLUDED_IDS.has("ODONTOLOGIA")).toBe(true)
    expect(BF_EXCLUDED_IDS.has("CLINICO")).toBe(false)
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
    expect(src).toContain("Cursos não participam")
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
  it("BIA Academy marcada como curso fora da Black Friday e sem BfPrice", () => {
    expect(src).toContain('data-testid="billing-academy-bf-excluded"')
    const academy = src.slice(src.indexOf('data-testid="billing-academy-banner-prospect"'), src.indexOf("Payment info notice"))
    expect(academy).toContain("R$ 2.375,00")
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
  it("deixa claro que cursos não participam", () => {
    expect(src).toContain("Cursos não participam da Black Friday")
  })
})

describe("R32 · cursos sem desconto", () => {
  it("/academy e /odontologia não importam o módulo de Black Friday", () => {
    expect(read("src/app/academy/page.tsx")).not.toContain("promo/black-friday")
    expect(read("src/app/odontologia/_components/OdontologiaLanding.tsx")).not.toContain("promo/black-friday")
    expect(read("src/app/odontologia/_components/copy.ts")).not.toMatch(/black friday/i)
  })
})
