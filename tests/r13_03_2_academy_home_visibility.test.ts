/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R13.03.2 — BIA Academy · Visibilidade na home / e planos legados
 *  ─────────────────────────────────────────────────────────────────────
 *  Hotfix comercial:
 *   - Banner Academy destacado abaixo do hero na home / (R$ 2.375 · 12m)
 *   - Item "Academy" no nav top da home
 *   - Card ACADEMY (R$ 4.970 · 6 meses · presencial) ESCONDIDO em 3 lugares
 *     (não é mais formato oferecido — mas o plano ACADEMY continua no
 *     enum para novos alunos do curso online)
 *   - Banner Academy no /dashboard/billing (2 estados: aluno vs prospect)
 *
 *  Cobre:
 *   A) Home /: item "Academy" no nav top (link para #academy)
 *   B) Home /: banner destacado com R$ 2.375 + CTAs (landing + Asaas)
 *   C) Home /: card ACADEMY R$ 4.970 REMOVIDO da seção Planos
 *   D) /auth/register: linha "Academy R$ 4.970" REMOVIDA do grid
 *   E) /dashboard/billing: card ACADEMY R$ 4.970 REMOVIDO do array PLANS
 *   F) /dashboard/billing: banner Academy com 2 estados (aluno vs prospect)
 *   G) layout.tsx: highPrice atualizado para 2375
 *   H) Consistência do link Asaas locked (iu7ym1dp93cei9zk)
 * ═══════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = resolve(__dirname, "..")
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8")

const ASAAS_LINK_LOCKED = "https://www.asaas.com/c/iu7ym1dp93cei9zk"

// ══════════════════════════════════════════════════════════════════════
//   R13.03.2.A — Home /: item Academy no nav top
// ══════════════════════════════════════════════════════════════════════
describe("R13.03.2.A · Home /: item Academy no nav top", () => {
  const src = read("src/app/page.tsx")

  it("Nav top da home tem link para #academy", () => {
    // Nav declarado com <Link href="#academy">
    expect(src).toMatch(/href=["']#academy["']/)
  })

  it("Link do nav tem texto \"Academy\"", () => {
    const navMatch = src.match(/href=["']#academy["'][^>]*>[\s\S]{0,200}Academy[\s\S]{0,50}<\/Link>/)
    expect(navMatch, "não encontrei o link Academy no nav").not.toBeNull()
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.03.2.B — Home /: banner destacado com R$ 2.375
// ══════════════════════════════════════════════════════════════════════
describe("R13.03.2.B · Home /: banner Academy destacado", () => {
  const src = read("src/app/page.tsx")

  it("Existe section com id=academy e testId home-academy-banner", () => {
    expect(src).toMatch(/id=["']academy["']/)
    expect(src).toContain("home-academy-banner")
  })

  it("Banner mostra preço R$ 2.375,00 destacado (testId home-academy-price)", () => {
    expect(src).toContain("home-academy-price")
    expect(src).toMatch(/R\$\s*2\.375,00/)
  })

  it("Banner menciona parcelamento em 12x de R$ 197,92", () => {
    expect(src).toMatch(/12x de R\$\s*197,92/)
  })

  it("Banner tem CTA primário para /academy (landing detalhada)", () => {
    expect(src).toContain("home-academy-cta-primary")
    expect(src).toMatch(/href=["']\/academy["']/)
  })

  it("Banner tem CTA secundário para Asaas (link LOCKED)", () => {
    expect(src).toContain("home-academy-cta-asaas")
    expect(src).toContain(ASAAS_LINK_LOCKED)
  })

  it("Banner descreve o programa (12 módulos + 12 meses + 3 encontros)", () => {
    expect(src).toMatch(/12 módulos/)
    expect(src).toMatch(/12 meses/)
    expect(src).toMatch(/3 encontros/)
  })

  it("Banner usa gradient violet→fuchsia (identidade Academy)", () => {
    // Procura pelo trecho do banner especificamente
    const bannerMatch = src.match(/home-academy-banner[\s\S]{0,3000}/)?.[0] ?? ""
    expect(bannerMatch).toMatch(/from-violet-\d+.*to-fuchsia-\d+|from-fuchsia-\d+.*to-violet-\d+|violet.*fuchsia|fuchsia.*violet/)
  })

  it("Menciona liberação em 24h úteis", () => {
    expect(src).toMatch(/24h úteis|24 horas úteis/)
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.03.2.C — Home /: card ACADEMY R$ 4.970 removido
// ══════════════════════════════════════════════════════════════════════
describe("R13.03.2.C · Home /: card R$ 4.970 removido da seção Planos", () => {
  const src = read("src/app/page.tsx")

  it("NÃO existe menção a \"R$ 4.970\" no arquivo (fora de comentário)", () => {
    // Remove tudo entre /* ... */ (comentários de bloco) e reavalia
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, "")
    expect(stripped).not.toMatch(/R\$\s*4\.970/)
  })

  it("NÃO existe menção a \"Curso presencial incluso\" (fora de comentário)", () => {
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, "")
    expect(stripped).not.toMatch(/Curso presencial incluso/)
  })

  it("Grid de planos foi reduzido de 3 colunas para 2 (Academy fora)", () => {
    // Antes: grid-cols-1 sm:grid-cols-2 xl:grid-cols-3
    // Agora: grid-cols-1 sm:grid-cols-2 (sem xl:grid-cols-3)
    expect(src).not.toMatch(/grid-cols-1 sm:grid-cols-2 xl:grid-cols-3/)
    expect(src).toMatch(/grid-cols-1 sm:grid-cols-2/)
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.03.2.D — /auth/register: linha Academy removida
// ══════════════════════════════════════════════════════════════════════
describe("R13.03.2.D · /auth/register: linha Academy R$ 4.970 removida", () => {
  const src = read("src/app/auth/register/page.tsx")

  it("NÃO tem linha ativa com \"Academy · R$ 4.970 · 6 meses\"", () => {
    // Procura por entrada ativa (não comentada) do array de planos
    // A entrada foi comentada, então a busca por padrão ativo tem que falhar
    const activePlanEntries = src.match(/\{\s*name:\s*["']Academy["'][^}]*price:\s*["']R\$\s*4\.970[^}]*\}/g) ?? []
    // Filtra os que estão dentro de comentário
    const truly = activePlanEntries.filter(entry => {
      // Se antes desse trecho no arquivo tiver // ou /* sem fechar, está comentado
      const idx = src.indexOf(entry)
      const before = src.substring(Math.max(0, idx - 200), idx)
      // Comentário de linha imediatamente antes?
      if (/\/\/\s*[^\n]*$/.test(before)) return false
      return true
    })
    expect(truly.length).toBe(0)
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.03.2.E — /dashboard/billing: card ACADEMY removido do PLANS
// ══════════════════════════════════════════════════════════════════════
describe("R13.03.2.E · /dashboard/billing: card ACADEMY R$ 4.970 removido", () => {
  const src = read("src/app/dashboard/billing/BillingClient.tsx")

  it("Array PLANS não tem entrada ATIVA com id: \"ACADEMY\" price: 4970", () => {
    // Remove comentários de bloco antes de testar
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, "")
    // Procura padrão { id: "ACADEMY" ... price: 4970 ... } ativo
    const activeAcademy = stripped.match(/\{\s*id:\s*["']ACADEMY["'][\s\S]{0,500}price:\s*4970/g) ?? []
    expect(activeAcademy.length).toBe(0)
  })

  it("Enum PLAN_CREDITS mantém ACADEMY (não removido do backend)", () => {
    // Alunos que compram o curso online continuam recebendo plan=ACADEMY
    expect(src).toMatch(/ACADEMY:\s*20000/)
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.03.2.F — /dashboard/billing: banner Academy com 2 estados
// ══════════════════════════════════════════════════════════════════════
describe("R13.03.2.F · /dashboard/billing: banner Academy (aluno vs prospect)", () => {
  const src = read("src/app/dashboard/billing/BillingClient.tsx")

  it("Banner tem 2 testIds: aluno ativo e prospect", () => {
    expect(src).toContain("billing-academy-banner-active")
    expect(src).toContain("billing-academy-banner-prospect")
  })

  it("Banner aluno linka para /academy/dashboard", () => {
    expect(src).toMatch(/href=["']\/academy\/dashboard["']/)
  })

  it("Banner prospect linka para /academy (landing)", () => {
    // Deve aparecer href="/academy" (landing) fora do /academy/dashboard
    const matches = src.match(/href=["']\/academy["']/g) ?? []
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it("Banner prospect mostra preço R$ 2.375,00 + parcelamento 12x", () => {
    // Busca região ampla do banner prospect (até a próxima chave que fecha a JSX)
    const promptBanner = src.match(/billing-academy-banner-prospect[\s\S]{0,3000}/)?.[0] ?? ""
    expect(promptBanner).toMatch(/R\$\s*2\.375,00/)
    expect(promptBanner).toMatch(/12x de R\$\s*197,92/)
  })

  it("Banner prospect renderiza quando currentPlan !== ACADEMY", () => {
    expect(src).toMatch(/currentPlan\s*===\s*["']ACADEMY["']/)
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.03.2.G — SEO structured data
// ══════════════════════════════════════════════════════════════════════
describe("R13.03.2.G · layout.tsx: SEO highPrice atualizado", () => {
  const src = read("src/app/layout.tsx")

  it("highPrice do AggregateOffer é 2375 (não mais 4970)", () => {
    expect(src).toMatch(/highPrice:\s*["']2375["']/)
    expect(src).not.toMatch(/highPrice:\s*["']4970["']/)
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.03.2.H — Link Asaas continua LOCKED em todos os lugares
// ══════════════════════════════════════════════════════════════════════
describe("R13.03.2.H · Consistência: link Asaas iu7ym1dp93cei9zk", () => {
  it("Link Asaas na landing /academy usa iu7ym1dp93cei9zk (não outro)", () => {
    const src = read("src/app/academy/page.tsx")
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, "")
    const asaasActive = stripped.match(/https?:\/\/[^\s"'<>]*asaas\.com\/c\/[^\s"'<>]+/g) ?? []
    for (const link of asaasActive) {
      expect(link, `landing /academy: link Asaas fora do padrão: ${link}`).toBe(ASAAS_LINK_LOCKED)
    }
  })

  it("Link Asaas no PendingEnrollment usa iu7ym1dp93cei9zk", () => {
    const src = read("src/app/academy/welcome/_components/PendingEnrollment.tsx")
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, "")
    const asaasActive = stripped.match(/https?:\/\/[^\s"'<>]*asaas\.com\/c\/[^\s"'<>]+/g) ?? []
    for (const link of asaasActive) {
      expect(link, `PendingEnrollment: link Asaas fora do padrão: ${link}`).toBe(ASAAS_LINK_LOCKED)
    }
  })

  it("Banner Academy na home / usa iu7ym1dp93cei9zk (o outros links Asaas dos planos BIA são distintos e OK)", () => {
    const src = read("src/app/page.tsx")
    // Isola apenas a região do banner Academy
    const bannerRegion = src.match(/home-academy-banner[\s\S]{0,3500}/)?.[0] ?? ""
    expect(bannerRegion, "banner Academy não encontrado na home").not.toBe("")
    const asaasInBanner = bannerRegion.match(/https?:\/\/[^\s"'<>]*asaas\.com\/c\/[^\s"'<>]+/g) ?? []
    expect(asaasInBanner.length, "banner Academy deve ter pelo menos 1 link Asaas").toBeGreaterThanOrEqual(1)
    for (const link of asaasInBanner) {
      expect(link, `banner home: link Asaas fora do padrão: ${link}`).toBe(ASAAS_LINK_LOCKED)
    }
  })

  it("Link Asaas antigo (9nvzkrlezi7ht2u5 · R$ 4.970) só existe em comentários", () => {
    const files = [
      "src/app/dashboard/billing/BillingClient.tsx",
      "src/app/page.tsx",
      "src/app/academy/page.tsx",
    ]
    for (const f of files) {
      const src = read(f)
      const stripped = src.replace(/\/\*[\s\S]*?\*\//g, "")
      expect(stripped, `${f}: link antigo Asaas ainda ativo`).not.toMatch(/9nvzkrlezi7ht2u5/)
    }
  })
})
