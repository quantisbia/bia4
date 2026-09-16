/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R13.11 — Plano único "Guia Inteligente em Biofabricação 3D"
 *  ─────────────────────────────────────────────────────────────────────
 *  DECISÃO COMERCIAL (Janaina, 2026-09-15):
 *   Simplificar catálogo de planos da plataforma BIA para 1 ÚNICO plano
 *   em modelo de assinatura recorrente:
 *
 *     Nome:        Guia Inteligente em Biofabricação 3D
 *     Preço:       R$ 507/mês
 *     Créditos:    1.500 renovados TODO mês (reset, não acumula)
 *     Modelo:      Assinatura recorrente via Asaas
 *     Cancelamento: Livre, sem multa; acesso permanece até fim do ciclo pago
 *     Checkout:    https://www.asaas.com/c/qsnp08rvpuwlj8ip
 *
 *   BIA Academy (R$ 2.375 · 12 meses + curso online) permanece SEPARADA.
 *   Planos antigos (ADVANCED/ENTERPRISE/DISCOVERY/ORGANOID_LAB) foram
 *   removidos do CATÁLOGO PÚBLICO mas mantidos no enum + PLAN_CREDITS/PRICES
 *   para não quebrar assinantes existentes (opção 1a da Janaina).
 *
 *  ESTE ARQUIVO TRAVA:
 *   A) enum SubscriptionPlan contém "GUIDE"
 *   B) PLAN_CREDITS.GUIDE = 1500
 *   C) PLAN_PRICES.GUIDE = 507
 *   D) Home /: card GUIDE presente com preço R$ 507 e link Asaas correto
 *   E) Home /: NÃO exibe mais cards ADVANCED (R$ 190) nem ENTERPRISE (R$ 375)
 *   F) BillingClient: PLANS contém APENAS GUIDE
 *   G) BillingClient: texto "assinatura recorrente" + "cancele quando quiser"
 *   H) Admin PLAN_META inclui GUIDE
 *   I) DashboardSidebar PLAN_COLORS + PLAN_LABEL incluem GUIDE
 *   J) SEO layout.tsx offerCount=3 (Free + Guide + Academy)
 *   K) Nenhum lugar do código público lista créditos GUIDE ≠ 1500
 *   L) BIA Academy continua separada (link R$ 2.375 preservado)
 * ═══════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = resolve(__dirname, "..")
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8")

const GUIDE_ASAAS = "https://www.asaas.com/c/qsnp08rvpuwlj8ip"
const GUIDE_PRICE = 507
const GUIDE_CREDITS = 1500
const ACADEMY_PRICE = 2375
const ACADEMY_ASAAS = "https://www.asaas.com/c/iu7ym1dp93cei9zk"

describe("R13.11 · Plano único GUIDE — configuração base", () => {

  it("A) prisma/schema.prisma: enum SubscriptionPlan contém GUIDE", () => {
    const schema = read("prisma/schema.prisma")
    const enumMatch = schema.match(/enum SubscriptionPlan\s*\{([^}]+)\}/)
    expect(enumMatch, "enum SubscriptionPlan deve existir no schema.prisma").toBeTruthy()
    const enumBody = enumMatch![1]
    expect(enumBody).toMatch(/\bGUIDE\b/)
    // Legado deve continuar preservado
    expect(enumBody).toMatch(/\bFREE\b/)
    expect(enumBody).toMatch(/\bADVANCED\b/)
    expect(enumBody).toMatch(/\bENTERPRISE\b/)
    expect(enumBody).toMatch(/\bACADEMY\b/)
  })

  it("B) src/lib/db/queries.ts: PLAN_CREDITS.GUIDE = 1500", () => {
    const src = read("src/lib/db/queries.ts")
    const m = src.match(/GUIDE:\s*(\d+)/)
    expect(m, "GUIDE deve existir em PLAN_CREDITS").toBeTruthy()
    expect(Number(m![1])).toBe(GUIDE_CREDITS)
  })

  it("C) src/lib/db/queries.ts: PLAN_PRICES.GUIDE = 507", () => {
    const src = read("src/lib/db/queries.ts")
    // Precisa achar `GUIDE:        507` na seção PLAN_PRICES
    const pricesBlock = src.match(/PLAN_PRICES[\s\S]{0,500}?\}/)
    expect(pricesBlock).toBeTruthy()
    expect(pricesBlock![0]).toMatch(/GUIDE:\s*507/)
  })

  it("C.2) src/lib/db/queries.ts: PLAN_PRICES.ACADEMY corrigido para R$ 2.375 (era R$ 4.970 histórico do R13.03.1)", () => {
    const src = read("src/lib/db/queries.ts")
    const pricesBlock = src.match(/PLAN_PRICES[\s\S]{0,600}?\}/)
    expect(pricesBlock).toBeTruthy()
    expect(pricesBlock![0]).toMatch(/ACADEMY:\s*2375/)
  })
})

describe("R13.11 · Home / — card GUIDE presente, cards antigos removidos", () => {

  it("D) Home: card 'Guia Inteligente em Biofabricação 3D' presente", () => {
    const src = read("src/app/page.tsx")
    expect(src).toMatch(/Guia Inteligente em Biofabricação 3D/)
    expect(src).toContain(`data-testid="home-plan-guide-card"`)
    expect(src).toContain(`data-testid="home-plan-guide-cta"`)
  })

  it("D.2) Home: card GUIDE mostra preço R$ 507 e '1.500 créditos renovados todo mês'", () => {
    const src = read("src/app/page.tsx")
    expect(src).toMatch(/R\$ 507/)
    expect(src).toMatch(/1\.500 créditos renovados todo mês/)
  })

  it("D.3) Home: CTA GUIDE aponta para o link Asaas correto", () => {
    const src = read("src/app/page.tsx")
    expect(src).toContain(GUIDE_ASAAS)
  })

  it("D.4) Home: badge 'ASSINATURA MENSAL' presente", () => {
    const src = read("src/app/page.tsx")
    expect(src).toMatch(/ASSINATURA MENSAL/)
  })

  it("D.5) Home: card GUIDE menciona 'Cancele quando quiser'", () => {
    const src = read("src/app/page.tsx")
    expect(src).toMatch(/Cancele quando quiser/i)
  })

  it("E) Home: NÃO exibe mais o card antigo 'Biofabricação 3D · R$ 190' (ADVANCED)", () => {
    const src = read("src/app/page.tsx")
    // Extrair só o JSX renderizado (excluindo comentários de bloco /* ... */)
    // Simples: se aparecer "R$ 190" fora de comentário, quebra o teste.
    const withoutBlockComments = src.replace(/\/\*[\s\S]*?\*\//g, "")
    expect(withoutBlockComments).not.toMatch(/R\$ 190/)
    expect(withoutBlockComments).not.toMatch(/Comprar créditos Biofabricação 3D/)
  })

  it("E.2) Home: NÃO exibe mais o card antigo 'Biofabricação 3D Avançada · R$ 375' (ENTERPRISE)", () => {
    const src = read("src/app/page.tsx")
    const withoutBlockComments = src.replace(/\/\*[\s\S]*?\*\//g, "")
    expect(withoutBlockComments).not.toMatch(/R\$ 375/)
    expect(withoutBlockComments).not.toMatch(/Comprar créditos Biofab 3D Avançada/)
  })

  it("E.3) Home: NÃO usa mais link Asaas antigo kfvg9q66i3odmtsu (era ADVANCED) fora de comentários", () => {
    const src = read("src/app/page.tsx")
    const withoutBlockComments = src.replace(/\/\*[\s\S]*?\*\//g, "")
    expect(withoutBlockComments).not.toContain("kfvg9q66i3odmtsu")
    expect(withoutBlockComments).not.toContain("87510sceyl5as6n7")
  })

  it("L) Home: BIA Academy continua separada (link R$ 2.375 preservado)", () => {
    const src = read("src/app/page.tsx")
    // Banner Academy do hero deve continuar
    expect(src).toContain(ACADEMY_ASAAS)
    expect(src).toMatch(new RegExp(`R\\$ 2\\.375`))
  })
})

describe("R13.11 · BillingClient — PLANS contém apenas GUIDE", () => {

  it("F) BillingClient: array PLANS declarado com id GUIDE", () => {
    const src = read("src/app/dashboard/billing/BillingClient.tsx")
    // Localiza o bloco `const PLANS = [ ... ]` fora de comentários
    const plansBlock = src.match(/const PLANS = \[([\s\S]*?)\n\]/m)
    expect(plansBlock, "array PLANS deve existir").toBeTruthy()
    const body = plansBlock![1]
    expect(body).toMatch(/id:\s*"GUIDE"/)
  })

  it("F.2) BillingClient: PLANS NÃO contém mais entries ADVANCED nem ENTERPRISE como items ativos", () => {
    const src = read("src/app/dashboard/billing/BillingClient.tsx")
    const plansBlock = src.match(/const PLANS = \[([\s\S]*?)\n\]/m)
    const body = plansBlock![1]
    // Dentro do bloco PLANS ativo, não pode ter `id: "ADVANCED"` ou `id: "ENTERPRISE"` fora de comentário
    const noComments = body.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")
    expect(noComments).not.toMatch(/id:\s*"ADVANCED"/)
    expect(noComments).not.toMatch(/id:\s*"ENTERPRISE"/)
  })

  it("F.3) BillingClient: PLANS.GUIDE tem paymentUrl = Asaas correto", () => {
    const src = read("src/app/dashboard/billing/BillingClient.tsx")
    expect(src).toContain(GUIDE_ASAAS)
  })

  it("F.4) BillingClient: PLANS.GUIDE tem price 507 e credits 1500", () => {
    const src = read("src/app/dashboard/billing/BillingClient.tsx")
    // Bloco entre `id: "GUIDE"` e o fechamento
    const guideMatch = src.match(/id:\s*"GUIDE"[\s\S]{0,800}?\},/m)
    expect(guideMatch).toBeTruthy()
    const body = guideMatch![0]
    expect(body).toMatch(/price:\s*507/)
    expect(body).toMatch(/credits:\s*1500/)
  })

  it("G) BillingClient: texto explicativo menciona 'assinatura recorrente' + 'cancelar quando quiser'", () => {
    const src = read("src/app/dashboard/billing/BillingClient.tsx")
    expect(src).toMatch(/Assinatura recorrente/i)
    expect(src).toMatch(/cancelar quando quiser/i)
    expect(src).toMatch(/1\.500 créditos são\s*[\s\S]{0,100}?renovados/i)
  })

  it("G.2) BillingClient: CTA muda de 'Comprar' para 'Assinar' quando plano é GUIDE", () => {
    const src = read("src/app/dashboard/billing/BillingClient.tsx")
    // Nosso ternário: {plan.id === "GUIDE" ? "Assinar agora" : "Comprar agora"}
    expect(src).toMatch(/plan\.id === "GUIDE" \? "Assinar agora" : "Comprar agora"/)
    // Mobile: "Assinar" ou "Comprar"
    expect(src).toMatch(/plan\.id === "GUIDE" \? "Assinar" : "Comprar"/)
  })

  it("G.3) BillingClient: card GUIDE mostra '/mês' ao lado do preço", () => {
    const src = read("src/app/dashboard/billing/BillingClient.tsx")
    // O bloco condicional é `plan.id === "GUIDE"` seguido de `/mês`
    const idxGuide = src.indexOf('plan.id === "GUIDE"')
    expect(idxGuide).toBeGreaterThan(-1)
    const nearby = src.slice(idxGuide, idxGuide + 500)
    expect(nearby).toMatch(/\/mês/)
  })
})

describe("R13.11 · Admin — PLAN_META inclui GUIDE + seletor lista GUIDE", () => {

  it("H) admin/page.tsx: PLAN_META contém entry GUIDE", () => {
    const src = read("src/app/dashboard/admin/page.tsx")
    const metaBlock = src.match(/PLAN_META[^=]*=\s*\{([\s\S]*?)\n\}/m)
    expect(metaBlock).toBeTruthy()
    const body = metaBlock![1]
    expect(body).toMatch(/GUIDE:\s*\{[^}]*label:\s*"Guia Inteligente"/)
  })

  it("H.2) admin/page.tsx: seletor de filtro de planos inclui GUIDE", () => {
    const src = read("src/app/dashboard/admin/page.tsx")
    // O array de planos filtráveis
    expect(src).toMatch(/\["FREE","GUIDE","DISCOVERY"/)
  })

  it("H.3) admin/page.tsx: modal 'Upgrade Plan' inclui GUIDE nas opções", () => {
    const src = read("src/app/dashboard/admin/page.tsx")
    // Segundo array de planos (modal upgrade)
    const allArrays = [...src.matchAll(/\[\s*"FREE"\s*,\s*"GUIDE"[\s\S]{0,200}?\]/g)]
    // Deve ter pelo menos 2 (filtro + modal upgrade)
    expect(allArrays.length).toBeGreaterThanOrEqual(2)
  })
})

describe("R13.11 · DashboardSidebar — plan badge suporta GUIDE", () => {

  it("I) DashboardSidebar: PLAN_COLORS.GUIDE presente", () => {
    const src = read("src/components/layout/DashboardSidebar.tsx")
    expect(src).toMatch(/GUIDE:\s*"[^"]*violet-500[^"]*"/)
  })

  it("I.2) DashboardSidebar: PLAN_LABEL.GUIDE = 'Guia Inteligente'", () => {
    const src = read("src/components/layout/DashboardSidebar.tsx")
    expect(src).toMatch(/GUIDE:\s*"Guia Inteligente"/)
  })

  it("I.3) DashboardSidebar: usa PLAN_LABEL para renderizar (não mais só 'plan' cru)", () => {
    const src = read("src/components/layout/DashboardSidebar.tsx")
    expect(src).toContain("PLAN_LABEL[plan]")
  })
})

describe("R13.11 · SEO — offerCount atualizado para 3", () => {

  it("J) layout.tsx: AggregateOffer offerCount = 3", () => {
    const src = read("src/app/layout.tsx")
    const offerBlock = src.match(/AggregateOffer[\s\S]*?offerCount:\s*"(\d+)"/)
    expect(offerBlock).toBeTruthy()
    expect(offerBlock![1]).toBe("3")
  })

  it("J.2) layout.tsx: highPrice mantido em 2375 (BIA Academy é o mais caro visível)", () => {
    const src = read("src/app/layout.tsx")
    expect(src).toMatch(/highPrice:\s*"2375"/)
  })
})

describe("R13.11 · Script de renovação — helper existe e é idempotente", () => {

  it("K) scripts/renew-monthly-credits.ts existe e exporta renewUserCredits", () => {
    const src = read("scripts/renew-monthly-credits.ts")
    expect(src).toMatch(/export async function renewUserCredits/)
  })

  it("K.2) script: reseta para 1500 e NÃO acumula (política Janaina R13.11)", () => {
    const src = read("scripts/renew-monthly-credits.ts")
    // O upsert usa targetCredits como valor absoluto — não increment
    expect(src).toMatch(/balance:\s*targetCredits/)
    // Não deve ter `increment:` (operador Prisma) no upsert do balance.
    // Remove comentários para não pegar palavras portuguesas ("incremental")
    // que apenas explicam a intenção humana.
    const upsertBlock = src.match(/creditBalance\.upsert[\s\S]*?\}\s*\)/m)
    expect(upsertBlock).toBeTruthy()
    const noCommentsInBlock = upsertBlock![0]
      .replace(/\/\/.*$/gm, "")           // remove comentário de linha
      .replace(/\/\*[\s\S]*?\*\//g, "")   // remove comentário de bloco
    // Só quebra se o operador Prisma `increment:` estiver presente
    expect(noCommentsInBlock).not.toMatch(/\bincrement\s*:/)
  })

  it("K.3) script: filtra apenas plan=GUIDE + status=ACTIVE", () => {
    const src = read("scripts/renew-monthly-credits.ts")
    expect(src).toMatch(/plan:\s*"GUIDE"/)
    expect(src).toMatch(/status:\s*"ACTIVE"/)
  })
})

describe("R13.11.1 · Banner Plataforma BIA (Tecidos · Esferoides · Organoides)", () => {

  it("banner: seção #platform-launch presente na home", () => {
    const src = read("src/app/page.tsx")
    expect(src).toContain(`id="platform-launch"`)
    expect(src).toContain(`data-testid="home-platform-launch-section"`)
  })

  it("banner: imagem em public/marketing/plataforma-bia-launch.jpg referenciada com alt textual completo", () => {
    const src = read("src/app/page.tsx")
    expect(src).toContain("/marketing/plataforma-bia-launch.jpg")
    expect(src).toMatch(/alt="[^"]*tecidos[^"]*esferoides[^"]*organoides/i)
  })

  it("banner: título menciona os 3 pilares (tecidos + esferoides + organoides)", () => {
    const src = read("src/app/page.tsx")
    const idxSection = src.indexOf('id="platform-launch"')
    expect(idxSection).toBeGreaterThan(-1)
    const sectionBlock = src.slice(idxSection, idxSection + 6000)
    expect(sectionBlock).toMatch(/tecidos bioimpressos/i)
    expect(sectionBlock).toMatch(/esferoides/i)
    expect(sectionBlock).toMatch(/organoides/i)
  })

  it("banner: 3 pilares visuais renderizados (Tecidos · Esferoides · Organoides)", () => {
    const src = read("src/app/page.tsx")
    const sectionBlock = src.slice(src.indexOf('id="platform-launch"'))
    // Cada pilar deve aparecer como label distinto
    expect(sectionBlock).toMatch(/label:\s*"Tecidos"/)
    expect(sectionBlock).toMatch(/label:\s*"Esferoides"/)
    expect(sectionBlock).toMatch(/label:\s*"Organoides"/)
  })

  it("banner: preço R$ 507/mês e CTA para Asaas correto", () => {
    const src = read("src/app/page.tsx")
    const sectionBlock = src.slice(src.indexOf('id="platform-launch"'))
    expect(sectionBlock).toMatch(/R\$ 507/)
    expect(sectionBlock).toContain(GUIDE_ASAAS)
    expect(sectionBlock).toContain(`data-testid="home-platform-launch-cta"`)
  })

  it("banner: menciona 1.500 créditos renovados + cancele quando quiser", () => {
    const src = read("src/app/page.tsx")
    const sectionBlock = src.slice(src.indexOf('id="platform-launch"'))
    expect(sectionBlock).toMatch(/1\.500 créditos/)
    expect(sectionBlock).toMatch(/renovados todo mês/i)
    expect(sectionBlock).toMatch(/Cancele quando quiser/i)
  })

  it("banner: nota discreta sobre BIA Academy como produto separado", () => {
    const src = read("src/app/page.tsx")
    const sectionBlock = src.slice(src.indexOf('id="platform-launch"'))
    expect(sectionBlock).toMatch(/BIA Academy/i)
    expect(sectionBlock).toMatch(/2\.375/)
  })

  it("banner: imagem física existe em public/marketing/ (não é 404)", () => {
    // Verifica que o arquivo foi commitado no repo, não só referenciado
    const { statSync } = require("node:fs")
    const path = resolve(ROOT, "public/marketing/plataforma-bia-launch.jpg")
    const stat = statSync(path)
    expect(stat.isFile()).toBe(true)
    // Sanity check: imagem deve ter tamanho razoável (>100KB — JPEG 2K)
    expect(stat.size).toBeGreaterThan(100 * 1024)
  })
})

describe("R13.11 · Regressão — links legados só em comentários", () => {

  it("Link Asaas antigo (ADVANCED kfvg9q66i3odmtsu) só existe em BillingClient como comentário", () => {
    // Nós REMOVEMOS os planos antigos, mas eles podem estar em comentários históricos.
    // Se aparecer FORA de comentário, quebra o teste.
    const files = [
      "src/app/page.tsx",
      "src/app/dashboard/billing/BillingClient.tsx",
    ]
    for (const f of files) {
      const src = read(f)
      const noComments = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")
      expect(noComments, `${f} não deve usar link Asaas antigo fora de comentários`)
        .not.toContain("kfvg9q66i3odmtsu")
    }
  })
})
