/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R13.02 — BIA Academy · Landing pública /academy + onboarding
 *  ─────────────────────────────────────────────────────────────────────
 *  Segundo sprint do R13. Entrega:
 *   - Migration: onboarding Json? em AcademyEnrollment + model AcademyAnalytics
 *   - API GET/PATCH /api/academy/onboarding (grava 3 respostas)
 *   - API POST/GET /api/academy/analytics (tracking mínimo sem cookies)
 *   - Layout próprio /academy/layout.tsx (sem DashboardSidebar)
 *   - Landing pública /academy/page.tsx (8 seções + CTAs Asaas/WhatsApp)
 *   - Onboarding /academy/welcome/page.tsx (server component 4 branches)
 *   - WelcomeForm (3 perguntas + skip)
 *   - PendingEnrollment (Opção B — CTAs Asaas/WhatsApp para não-matriculados)
 *   - Link Academy no DashboardSidebar (para TODOS os usuários, badge "novo")
 *
 *  Decisões locked (confirmadas pela Janaina):
 *   1. onboarding = Json? (não colunas dedicadas)
 *   2. Skip permitido (onboarding opcional)
 *   3. Opção B para pending/expired (página dedicada com CTAs)
 *   4. Opção A: link Academy visível para TODOS no sidebar
 *   5. pt-BR only
 *   6. Analytics mínimo: 1 API leve + 1 tabela, sem cookies
 *
 *  Constantes comerciais LOCKED:
 *   - ASAAS_LINK = "https://www.asaas.com/c/iu7ym1dp93cei9zk"
 *   - WHATSAPP_LINK = "https://wa.me/11968632231"
 *
 *  Cobre (análise estática — não roda Next/Prisma real):
 *   A) Schema: onboarding Json? em AcademyEnrollment + model AcademyAnalytics
 *   B) Migration SQL R13.02 existe e tem ALTER TABLE + CREATE TABLE + índices
 *   C) API /api/academy/onboarding: GET + PATCH, Zod, hasAccess(), skip
 *   D) API /api/academy/analytics: POST fire-and-forget + GET restrito ADMIN/INSTRUCTOR
 *   E) Landing /academy: 8 seções, 12 módulos, FAQ 6 itens, CTAs Asaas + WhatsApp
 *   F) Layout /academy: minimalista, sem DashboardSidebar
 *   G) /academy/welcome: server component, 4 branches (anon/pending/answered/active)
 *   H) WelcomeForm: 3 perguntas (área/nível/objetivo) + skip button + testIds
 *   I) PendingEnrollment: Opção B com Asaas + WhatsApp
 *   J) DashboardSidebar: item Academy com GraduationCap + badge "novo"
 *   K) Analytics: eventos oficiais + fire-and-forget + sem cookies
 * ═══════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = resolve(__dirname, "..")

function readSrc(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8")
}

function fileExists(rel: string): boolean {
  return existsSync(resolve(ROOT, rel))
}

// Constantes comerciais LOCKED — nunca podem mudar sem aprovação
const ASAAS_LINK = "https://www.asaas.com/c/iu7ym1dp93cei9zk"
const WHATSAPP_LINK = "https://wa.me/11968632231"

// ─────────────────────────────────────────────────────────────────────
describe("R13.02.A · Schema: onboarding Json? + model AcademyAnalytics", () => {
  const schema = readSrc("prisma/schema.prisma")

  it("AcademyEnrollment tem campo onboarding Json?", () => {
    const block = schema.match(/model\s+AcademyEnrollment\s*\{[\s\S]*?\n\}/)?.[0] ?? ""
    expect(block, "bloco AcademyEnrollment não encontrado").not.toBe("")
    expect(block).toMatch(/onboarding\s+Json\?/)
  })

  it("Model AcademyAnalytics está declarado", () => {
    expect(schema).toMatch(/model\s+AcademyAnalytics\b/)
  })

  it("AcademyAnalytics tem campos event, userId?, path?, metadata?, createdAt", () => {
    const block = schema.match(/model\s+AcademyAnalytics\s*\{[\s\S]*?\n\}/)?.[0] ?? ""
    expect(block).toMatch(/id\s+String\s+@id/)
    expect(block).toMatch(/event\s+String/)
    expect(block).toMatch(/userId\s+String\?/)
    expect(block).toMatch(/path\s+String\?/)
    expect(block).toMatch(/metadata\s+Json\?/)
    expect(block).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\)/)
  })

  it("AcademyAnalytics tem @@map para academy_analytics + índices", () => {
    const block = schema.match(/model\s+AcademyAnalytics\s*\{[\s\S]*?\n\}/)?.[0] ?? ""
    expect(block).toMatch(/@@map\(\s*["']academy_analytics["']/)
    expect(block).toMatch(/@@index\(\[event\]\)/)
    expect(block).toMatch(/@@index\(\[userId\]\)/)
    expect(block).toMatch(/@@index\(\[createdAt\]\)/)
  })

  it("Não há colunas dedicadas de onboarding (decisão #1: Json)", () => {
    const block = schema.match(/model\s+AcademyEnrollment\s*\{[\s\S]*?\n\}/)?.[0] ?? ""
    expect(block).not.toMatch(/preferredArea\s+String/)
    expect(block).not.toMatch(/experienceLevel\s+String/)
    expect(block).not.toMatch(/mainGoal\s+String/)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R13.02.B · Migration SQL R13.02", () => {
  const migrationPath = "prisma/migrations/20260807000001_r13_02_academy_onboarding_analytics/migration.sql"

  it("Arquivo de migration R13.02 existe", () => {
    expect(fileExists(migrationPath), `Migration não encontrada em ${migrationPath}`).toBe(true)
  })

  it("Migration tem ALTER TABLE para adicionar coluna onboarding", () => {
    const sql = readSrc(migrationPath)
    expect(sql).toMatch(/ALTER\s+TABLE\s+"academy_enrollments"/)
    expect(sql).toMatch(/ADD\s+COLUMN\s+"onboarding"\s+JSONB/i)
  })

  it("Migration tem CREATE TABLE academy_analytics com todas as colunas", () => {
    const sql = readSrc(migrationPath)
    expect(sql).toMatch(/CREATE\s+TABLE\s+"academy_analytics"/)
    expect(sql).toMatch(/"event"\s+TEXT\s+NOT NULL/)
    expect(sql).toMatch(/"userId"\s+TEXT/)
    expect(sql).toMatch(/"path"\s+TEXT/)
    expect(sql).toMatch(/"metadata"\s+JSONB/)
    expect(sql).toMatch(/"createdAt"\s+TIMESTAMP/)
  })

  it("Migration tem 3 índices para academy_analytics", () => {
    const sql = readSrc(migrationPath)
    expect(sql).toMatch(/CREATE\s+INDEX[^\n]+academy_analytics[^\n]+event/i)
    expect(sql).toMatch(/CREATE\s+INDEX[^\n]+academy_analytics[^\n]+userId/i)
    expect(sql).toMatch(/CREATE\s+INDEX[^\n]+academy_analytics[^\n]+createdAt/i)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R13.02.C · API /api/academy/onboarding (GET + PATCH)", () => {
  const routePath = "src/app/api/academy/onboarding/route.ts"

  it("Arquivo da rota existe", () => {
    expect(fileExists(routePath)).toBe(true)
  })

  it("Exporta GET e PATCH", () => {
    const src = readSrc(routePath)
    expect(src).toMatch(/export\s+async\s+function\s+GET/)
    expect(src).toMatch(/export\s+async\s+function\s+PATCH/)
  })

  it("Usa auth() do NextAuth e retorna 401 para anônimo", () => {
    const src = readSrc(routePath)
    expect(src).toMatch(/from\s+["']@\/lib\/auth\/config["']|from\s+["']@\/auth["']|import.*auth/)
    expect(src).toMatch(/401/)
  })

  it("PATCH valida com Zod (enums para os 3 campos)", () => {
    const src = readSrc(routePath)
    expect(src).toMatch(/from\s+["']zod["']/)
    expect(src).toMatch(/preferredArea/)
    expect(src).toMatch(/experienceLevel/)
    expect(src).toMatch(/mainGoal/)
    expect(src).toMatch(/z\.enum|z\.object/)
  })

  it("PATCH aceita skip:true (decisão #2: onboarding opcional)", () => {
    const src = readSrc(routePath)
    expect(src).toMatch(/skip/)
  })

  it("Usa hasAccess() de src/lib/academy/enrollment (helper R13.01)", () => {
    const src = readSrc(routePath)
    expect(src).toMatch(/hasAccess|getEnrollmentState/)
    expect(src).toMatch(/@\/lib\/academy\/enrollment/)
  })

  it("Retorna 403 quando não tem enrollment ativa (NO_ENROLLMENT ou EXPIRED)", () => {
    const src = readSrc(routePath)
    expect(src).toMatch(/403/)
  })

  it("PATCH grava onboarding no campo Json (não em colunas separadas)", () => {
    const src = readSrc(routePath)
    expect(src).toMatch(/onboarding\s*:/)
    // não deve ter update com preferredArea como coluna
    expect(src).not.toMatch(/data:\s*\{\s*preferredArea/)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R13.02.D · API /api/academy/analytics (POST + GET)", () => {
  const routePath = "src/app/api/academy/analytics/route.ts"

  it("Arquivo da rota existe", () => {
    expect(fileExists(routePath)).toBe(true)
  })

  it("Exporta POST e GET", () => {
    const src = readSrc(routePath)
    expect(src).toMatch(/export\s+async\s+function\s+POST/)
    expect(src).toMatch(/export\s+async\s+function\s+GET/)
  })

  it("POST não exige autenticação (funciona para visitantes anônimos)", () => {
    const src = readSrc(routePath)
    // deve capturar sessão opcionalmente (auth().catch ou similar), não bloquear anônimo
    expect(src).toMatch(/\.catch\s*\(|try\s*\{[\s\S]*auth/)
  })

  it("POST retorna 204 ou 202 (fire-and-forget, não bloqueia UX)", () => {
    const src = readSrc(routePath)
    expect(src).toMatch(/204|202/)
  })

  it("GET restrito a ADMIN ou INSTRUCTOR", () => {
    const src = readSrc(routePath)
    expect(src).toMatch(/ADMIN/)
    expect(src).toMatch(/INSTRUCTOR/)
    expect(src).toMatch(/403|401/)
  })

  it("GET usa groupBy para agregar contagens por evento", () => {
    const src = readSrc(routePath)
    expect(src).toMatch(/groupBy/)
  })

  it("Tem lista de eventos conhecidos (KNOWN_EVENTS)", () => {
    const src = readSrc(routePath)
    // deve ter pelo menos os eventos principais
    expect(src).toMatch(/landing_viewed/)
    expect(src).toMatch(/cta_asaas_clicked/)
    expect(src).toMatch(/cta_whatsapp_clicked/)
    expect(src).toMatch(/onboarding_completed/)
    expect(src).toMatch(/onboarding_skipped/)
  })

  it("Não usa cookies (decisão #6: analytics sem cookies)", () => {
    const src = readSrc(routePath)
    // não deve importar cookies() nem setar Set-Cookie
    expect(src).not.toMatch(/from\s+["']next\/headers["'][\s\S]*cookies/)
    expect(src).not.toMatch(/Set-Cookie/i)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R13.02.E · Landing /academy (página pública)", () => {
  const pagePath = "src/app/academy/page.tsx"

  it("Arquivo da landing existe", () => {
    expect(fileExists(pagePath)).toBe(true)
  })

  it("É Client Component (use client)", () => {
    const src = readSrc(pagePath)
    expect(src).toMatch(/["']use client["']/)
  })

  it("Contém link Asaas LOCKED (checkout de matrícula)", () => {
    const src = readSrc(pagePath)
    expect(src).toContain(ASAAS_LINK)
  })

  it("Contém link WhatsApp LOCKED (11 96863-2231)", () => {
    const src = readSrc(pagePath)
    expect(src).toContain(WHATSAPP_LINK)
  })

  it("Tem 8 seções principais (nav, hero, programa, como funciona, módulos, público, investimento, faq)", () => {
    const src = readSrc(pagePath)
    const sections = [
      "academy-nav",
      "academy-section-programa",
      "academy-section-como-funciona",
      "academy-section-modulos",
      "academy-section-publico",
      "academy-section-investimento",
      "academy-section-faq",
    ]
    for (const s of sections) {
      expect(src, `testId ${s} ausente`).toContain(s)
    }
  })

  it("Tem 12 módulos oficiais (template academy-module-card-${m.n} + array MODULES com 12 itens)", () => {
    const src = readSrc(pagePath)
    // template literal do testId
    expect(src).toMatch(/academy-module-card-\$\{[^}]+\}/)
    // conta itens do array MODULES: cada módulo tem "n:" (número)
    const modulesBlock = src.match(/(?:MODULES|Modules)\s*[:=]\s*\[[\s\S]*?\n\s*\]/)?.[0] ?? ""
    expect(modulesBlock, "array MODULES não encontrado").not.toBe("")
    const nCount = (modulesBlock.match(/\bn\s*:\s*\d+/g) ?? []).length
    expect(nCount, `esperado 12 módulos, achei ${nCount}`).toBe(12)
  })

  it("Tem FAQ com 6 itens (template academy-faq-toggle-${i} + array FAQ com 6 entradas)", () => {
    const src = readSrc(pagePath)
    expect(src).toMatch(/academy-faq-toggle-\$\{[^}]+\}/)
    const faqBlock = src.match(/(?:FAQ|Faq)\s*[:=]\s*\[[\s\S]*?\n\s*\]/)?.[0] ?? ""
    expect(faqBlock, "array FAQ não encontrado").not.toBe("")
    // cada entrada do FAQ tem uma propriedade "q:" (pergunta)
    const qCount = (faqBlock.match(/\bq\s*:\s*["'`]/g) ?? []).length
    expect(qCount, `esperado 6 perguntas no FAQ, achei ${qCount}`).toBe(6)
  })

  it("Tem CTAs Asaas em múltiplas posições (nav, hero, pricing, footer)", () => {
    const src = readSrc(pagePath)
    expect(src).toContain("academy-cta-asaas-hero")
    expect(src).toContain("academy-cta-asaas-nav")
    expect(src).toContain("academy-cta-asaas-pricing")
    expect(src).toContain("academy-cta-asaas-footer")
  })

  it("Tem CTAs WhatsApp (hero e pricing)", () => {
    const src = readSrc(pagePath)
    expect(src).toContain("academy-cta-whatsapp-hero")
    expect(src).toContain("academy-cta-whatsapp-pricing")
  })

  it("Tem CTA de login para quem já é aluno", () => {
    const src = readSrc(pagePath)
    expect(src).toContain("academy-cta-login")
  })

  it("Chama trackEvent para landing_viewed no mount", () => {
    const src = readSrc(pagePath)
    expect(src).toMatch(/trackEvent/)
    expect(src).toContain("landing_viewed")
  })

  it("Usa fire-and-forget para analytics (keepalive:true + catch)", () => {
    const src = readSrc(pagePath)
    expect(src).toMatch(/keepalive/)
    expect(src).toMatch(/\.catch\(/)
  })

  it("É pt-BR (decisão #5: sem i18n)", () => {
    const src = readSrc(pagePath)
    expect(src).toMatch(/programa|matrícula|conheça|módulos|investimento|encontros/i)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R13.02.F · Layout /academy (sem DashboardSidebar)", () => {
  const layoutPath = "src/app/academy/layout.tsx"

  it("Arquivo do layout existe", () => {
    expect(fileExists(layoutPath)).toBe(true)
  })

  it("NÃO importa DashboardSidebar (layout próprio)", () => {
    const src = readSrc(layoutPath)
    // pode citar no JSDoc explicando por que NÃO usa, mas nunca IMPORTAR
    // procura import no início de linha até o próximo newline
    expect(src).not.toMatch(/^\s*import[^\n]*DashboardSidebar/m)
    // nem renderizar no JSX
    expect(src).not.toMatch(/<DashboardSidebar/)
  })

  it("Exporta metadata (SEO)", () => {
    const src = readSrc(layoutPath)
    expect(src).toMatch(/export\s+const\s+metadata|export\s+function\s+generateMetadata/)
  })

  it("Metadata tem keywords relacionadas (biofabricação/bioimpressão)", () => {
    const src = readSrc(layoutPath)
    expect(src).toMatch(/biofabricação|bioimpressão|Academy|BIA/i)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R13.02.G · /academy/welcome (server component, 4 branches)", () => {
  const pagePath = "src/app/academy/welcome/page.tsx"

  it("Arquivo existe e é server component (sem 'use client')", () => {
    expect(fileExists(pagePath)).toBe(true)
    const src = readSrc(pagePath)
    expect(src).not.toMatch(/^["']use client["']/m)
  })

  it("Usa auth() do NextAuth", () => {
    const src = readSrc(pagePath)
    expect(src).toMatch(/auth\s*\(/)
  })

  it("Redireciona anônimo para /auth/login com callbackUrl", () => {
    const src = readSrc(pagePath)
    expect(src).toMatch(/redirect\(/)
    expect(src).toMatch(/\/auth\/login/)
    expect(src).toMatch(/callbackUrl/)
  })

  it("Renderiza PendingEnrollment para NO_ENROLLMENT / EXPIRED (Opção B)", () => {
    const src = readSrc(pagePath)
    expect(src).toMatch(/PendingEnrollment/)
    expect(src).toMatch(/NO_ENROLLMENT|EXPIRED|PENDING/)
  })

  it("Renderiza WelcomeForm para active + não respondido", () => {
    const src = readSrc(pagePath)
    expect(src).toMatch(/WelcomeForm/)
  })

  it("Redireciona para /academy/dashboard quando já respondeu (from=academy-welcome, atualizado no R13.03)", () => {
    const src = readSrc(pagePath)
    expect(src).toMatch(/\/academy\/dashboard/)
    expect(src).toMatch(/from=academy-welcome|academy-welcome/)
  })

  it("Usa hasAccess ou getEnrollmentState (helpers R13.01)", () => {
    const src = readSrc(pagePath)
    expect(src).toMatch(/getEnrollmentState|hasAccess/)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R13.02.H · WelcomeForm (3 perguntas + skip)", () => {
  const compPath = "src/app/academy/welcome/_components/WelcomeForm.tsx"

  it("Arquivo existe e é client component", () => {
    expect(fileExists(compPath)).toBe(true)
    const src = readSrc(compPath)
    expect(src).toMatch(/["']use client["']/)
  })

  it("Faz PATCH para /api/academy/onboarding", () => {
    const src = readSrc(compPath)
    expect(src).toMatch(/PATCH/)
    expect(src).toContain("/api/academy/onboarding")
  })

  it("Tem 3 perguntas: preferredArea, experienceLevel, mainGoal", () => {
    const src = readSrc(compPath)
    expect(src).toMatch(/preferredArea/)
    expect(src).toMatch(/experienceLevel/)
    expect(src).toMatch(/mainGoal/)
  })

  it("Tem botão skip (decisão #2: opcional)", () => {
    const src = readSrc(compPath)
    expect(src).toContain("welcome-skip")
    expect(src).toMatch(/skip\s*:\s*true|{\s*skip:/)
  })

  it("Tem botão submit (só habilita com 3 respostas)", () => {
    const src = readSrc(compPath)
    expect(src).toContain("welcome-submit")
  })

  it("Tracka onboarding_completed no submit", () => {
    const src = readSrc(compPath)
    expect(src).toContain("onboarding_completed")
  })

  it("Tracka onboarding_skipped no skip", () => {
    const src = readSrc(compPath)
    expect(src).toContain("onboarding_skipped")
  })

  it("Redireciona para /academy/dashboard após submit ou skip (atualizado no R13.03)", () => {
    const src = readSrc(compPath)
    expect(src).toContain("/academy/dashboard")
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R13.02.I · PendingEnrollment (Opção B — CTAs para não-matriculados)", () => {
  const compPath = "src/app/academy/welcome/_components/PendingEnrollment.tsx"

  it("Arquivo existe e é client component", () => {
    expect(fileExists(compPath)).toBe(true)
    const src = readSrc(compPath)
    expect(src).toMatch(/["']use client["']/)
  })

  it("Contém link Asaas LOCKED", () => {
    const src = readSrc(compPath)
    expect(src).toContain(ASAAS_LINK)
  })

  it("Contém link WhatsApp LOCKED", () => {
    const src = readSrc(compPath)
    expect(src).toContain(WHATSAPP_LINK)
  })

  it("Tem testIds pending-cta-asaas e pending-cta-whatsapp", () => {
    const src = readSrc(compPath)
    expect(src).toContain("pending-cta-asaas")
    expect(src).toContain("pending-cta-whatsapp")
  })

  it("Tracka pending_enrollment_viewed + cta_asaas_clicked + cta_whatsapp_clicked", () => {
    const src = readSrc(compPath)
    expect(src).toContain("pending_enrollment_viewed")
    expect(src).toContain("cta_asaas_clicked")
    expect(src).toContain("cta_whatsapp_clicked")
  })

  it("Tem link de retorno para /academy (landing) e fallback /dashboard", () => {
    const src = readSrc(compPath)
    expect(src).toContain("/academy")
    expect(src).toContain("/dashboard")
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R13.02.J · DashboardSidebar tem link Academy (para TODOS, com badge)", () => {
  const sidebarPath = "src/components/layout/DashboardSidebar.tsx"

  it("Arquivo existe", () => {
    expect(fileExists(sidebarPath)).toBe(true)
  })

  it("Importa GraduationCap do lucide-react", () => {
    const src = readSrc(sidebarPath)
    expect(src).toMatch(/GraduationCap[\s\S]*from\s+["']lucide-react["']|from\s+["']lucide-react["'][\s\S]*GraduationCap/)
  })

  it("NAV_ITEMS tem item com href /academy + label Academy + icon GraduationCap", () => {
    const src = readSrc(sidebarPath)
    const navBlock = src.match(/NAV_ITEMS\s*=\s*\[[\s\S]*?\n\]/)?.[0] ?? ""
    expect(navBlock, "NAV_ITEMS não encontrado").not.toBe("")
    expect(navBlock).toMatch(/href:\s*["']\/academy["']/)
    expect(navBlock).toMatch(/label:\s*["']Academy["']/)
    expect(navBlock).toMatch(/icon:\s*GraduationCap/)
  })

  it("Item Academy tem badge (indicador visual de novidade)", () => {
    const src = readSrc(sidebarPath)
    const navBlock = src.match(/NAV_ITEMS\s*=\s*\[[\s\S]*?\n\]/)?.[0] ?? ""
    // procura badge dentro do item /academy
    expect(navBlock).toMatch(/\/academy[\s\S]{0,600}badge:\s*["']/)
  })

  it("Item Academy tem info (tooltip explicativo)", () => {
    const src = readSrc(sidebarPath)
    const navBlock = src.match(/NAV_ITEMS\s*=\s*\[[\s\S]*?\n\]/)?.[0] ?? ""
    expect(navBlock).toMatch(/\/academy[\s\S]{0,600}info:\s*["']/)
  })

  it("Render loop suporta exibir badge quando presente", () => {
    const src = readSrc(sidebarPath)
    expect(src).toMatch(/badge/)
    // deve renderizar badge no JSX
    expect(src).toMatch(/\{badge/)
  })

  it("Não tem gate de role (visível para TODOS os usuários — decisão #4 Opção A)", () => {
    const src = readSrc(sidebarPath)
    const navBlock = src.match(/NAV_ITEMS\s*=\s*\[[\s\S]*?\n\]/)?.[0] ?? ""
    // dentro do item /academy não deve ter role STUDENT/INSTRUCTOR/ADMIN gating
    const academyItem = navBlock.match(/\{[^{}]*\/academy[^{}]*\}/s)?.[0] ?? ""
    expect(academyItem).not.toMatch(/role\s*:\s*["']STUDENT/)
    expect(academyItem).not.toMatch(/role\s*:\s*["']INSTRUCTOR/)
  })

  it("Item Academy tem data-testid sidebar-academy-link no Link", () => {
    const src = readSrc(sidebarPath)
    expect(src).toContain("sidebar-academy-link")
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R13.02.K · Analytics — eventos oficiais + política sem cookies", () => {
  const landingSrc = readSrc("src/app/academy/page.tsx")
  const analyticsSrc = readSrc("src/app/api/academy/analytics/route.ts")

  it("Landing tracka eventos comerciais principais", () => {
    const events = [
      "landing_viewed",
      "cta_asaas_clicked",
      "cta_whatsapp_clicked",
    ]
    for (const e of events) {
      expect(landingSrc, `evento ${e} não trackeado na landing`).toContain(e)
    }
  })

  it("API analytics conhece os eventos usados pela landing", () => {
    const events = [
      "landing_viewed",
      "cta_asaas_clicked",
      "cta_whatsapp_clicked",
      "cta_login_clicked",
      "faq_expanded",
      "module_preview_clicked",
      "onboarding_completed",
      "onboarding_skipped",
    ]
    for (const e of events) {
      expect(analyticsSrc, `evento ${e} ausente da KNOWN_EVENTS`).toContain(e)
    }
  })

  it("Analytics respeita política sem cookies (decisão #6)", () => {
    // nem a landing nem a API devem manipular document.cookie ou Set-Cookie
    expect(landingSrc).not.toMatch(/document\.cookie/)
    expect(analyticsSrc).not.toMatch(/document\.cookie/)
    expect(analyticsSrc).not.toMatch(/Set-Cookie/i)
  })

  it("Analytics não usa Google Analytics / gtag / GA4 (decisão #6)", () => {
    expect(landingSrc).not.toMatch(/gtag|google-analytics|GA_MEASUREMENT_ID/i)
    expect(analyticsSrc).not.toMatch(/gtag|google-analytics|GA_MEASUREMENT_ID/i)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R13.02.L · Consistência dos links comerciais (LOCKED)", () => {
  it("ASAAS_LINK e WHATSAPP_LINK são idênticos em todos os arquivos onde aparecem", () => {
    const files = [
      "src/app/academy/page.tsx",
      "src/app/academy/welcome/_components/PendingEnrollment.tsx",
    ]
    for (const f of files) {
      const src = readSrc(f)
      expect(src, `${f} não tem link Asaas correto`).toContain(ASAAS_LINK)
      expect(src, `${f} não tem link WhatsApp correto`).toContain(WHATSAPP_LINK)
    }
  })

  it("Nenhum arquivo tem link Asaas antigo ou variante", () => {
    const files = [
      "src/app/academy/page.tsx",
      "src/app/academy/welcome/_components/PendingEnrollment.tsx",
    ]
    for (const f of files) {
      const src = readSrc(f)
      // se aparece asaas.com, tem que ser exatamente o link locked
      const asaasLinks = src.match(/https?:\/\/[^\s"'<>]*asaas\.com[^\s"'<>]*/g) ?? []
      for (const link of asaasLinks) {
        expect(link, `${f}: link Asaas divergente ${link}`).toBe(ASAAS_LINK)
      }
    }
  })

  it("Número WhatsApp é sempre 11968632231 (Janaina)", () => {
    const files = [
      "src/app/academy/page.tsx",
      "src/app/academy/welcome/_components/PendingEnrollment.tsx",
    ]
    for (const f of files) {
      const src = readSrc(f)
      const waLinks = src.match(/https?:\/\/wa\.me\/[^\s"'<>]*/g) ?? []
      for (const link of waLinks) {
        expect(link, `${f}: WhatsApp diferente ${link}`).toBe(WHATSAPP_LINK)
      }
    }
  })
})
