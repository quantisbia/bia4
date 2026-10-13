/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R13.14.6 — Botão "Academy" na sidebar da BIA vai pra área do aluno
 *  ─────────────────────────────────────────────────────────────────────
 *  BUG REPORTADO (Janaina, 2026-10-13):
 *   "Toda vez que dentro da plataforma BIA eu clico em Academy pra entrar,
 *    ele não vai pra Academy, vai pro dashboard da BIA. Quero que vá direto
 *    pra jornada do academy e eu consiga ver o conteúdo das aulas."
 *
 *  RAIZ:
 *   O item 'Academy' em NAV_ITEMS do DashboardSidebar.tsx apontava para
 *   /academy (a LANDING PÚBLICA de venda — cheia de CTAs e FAQ para
 *   prospects). Usuário já logado via "Academy" na sidebar e caía na
 *   landing de venda — se tentasse clicar nos CTAs, era redirecionado
 *   pro /dashboard da BIA (fluxo de login já concluído).
 *
 *  FIX:
 *   Trocar href de "/academy" para "/academy/dashboard" (área do aluno)
 *   no DashboardSidebar.tsx. A landing /academy continua funcionando
 *   para visitantes anônimos / não-matriculados — só a sidebar logada
 *   não cai mais lá.
 *
 *  Cobre:
 *   (A) Sidebar da BIA aponta para /academy/dashboard, não /academy
 *   (B) data-testid=sidebar-academy-link ainda existe (regressão r13.02)
 *   (C) Comentário documenta a decisão (future-proofing)
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const sidebarPath = "src/components/layout/DashboardSidebar.tsx"
const src = readFileSync(resolve(__dirname, "..", sidebarPath), "utf8")

describe("R13.14.6 · Sidebar da BIA · item Academy aponta pra área do aluno", () => {
  it("(A) Item 'Academy' tem href='/academy/dashboard' (NÃO '/academy')", () => {
    // Pega o bloco do item Academy em NAV_ITEMS
    const navBlock = src.match(/NAV_ITEMS\s*=\s*\[[\s\S]*?\n\]/)?.[0] ?? ""
    expect(navBlock, "NAV_ITEMS não encontrado").not.toBe("")

    // Encontra a entrada que tem label: "Academy"
    // Formato típico: { href: "...", label: "Academy", icon: ..., ... }
    const academyEntry = navBlock.match(/\{[^{}]*label:\s*["']Academy["'][^{}]*\}/s)?.[0] ?? ""
    expect(academyEntry, "item Academy não encontrado em NAV_ITEMS").not.toBe("")

    // href DEVE ser /academy/dashboard
    expect(academyEntry).toMatch(/href:\s*["']\/academy\/dashboard["']/)
    // E NÃO pode ser /academy puro
    expect(academyEntry).not.toMatch(/href:\s*["']\/academy["']/)
  })

  it("(B) regressão: data-testid=sidebar-academy-link ainda existe (test R13.02 depende)", () => {
    expect(src).toContain("sidebar-academy-link")
  })

  it("(C) comparador isAcademy do render usa o novo href", () => {
    // Antes era: item.href === "/academy"
    // Agora deve ser: item.href === "/academy/dashboard"
    expect(src).toMatch(/isAcademy\s*=\s*item\.href\s*===\s*["']\/academy\/dashboard["']/)
    // E não pode comparar com "/academy" puro
    expect(src).not.toMatch(/isAcademy\s*=\s*item\.href\s*===\s*["']\/academy["']/)
  })

  it("(D) info text foi atualizado para refletir 'direto no seu painel do aluno'", () => {
    const navBlock = src.match(/NAV_ITEMS\s*=\s*\[[\s\S]*?\n\]/)?.[0] ?? ""
    const academyEntry = navBlock.match(/\{[^{}]*label:\s*["']Academy["'][^{}]*\}/s)?.[0] ?? ""
    expect(academyEntry).toMatch(/painel do aluno/i)
  })

  it("(E) badge 'novo' continua presente (sinalização visual)", () => {
    const navBlock = src.match(/NAV_ITEMS\s*=\s*\[[\s\S]*?\n\]/)?.[0] ?? ""
    const academyEntry = navBlock.match(/\{[^{}]*label:\s*["']Academy["'][^{}]*\}/s)?.[0] ?? ""
    expect(academyEntry).toMatch(/badge:\s*["']novo["']/)
  })
})

/* ═════════════════════════════════════════════════════════════════════
   (F) Outros pontos: a landing /academy continua existindo e sendo
       apontada só por quem AINDA NÃO É aluno (billing banner "prospect",
       página pública /, página pública /verify/[code]).
═════════════════════════════════════════════════════════════════════ */

describe("R13.14.6 · landing /academy continua acessível para visitantes", () => {
  it("home pública / mantém link para landing /academy (não para /academy/dashboard)", () => {
    const home = readFileSync(resolve(__dirname, "..", "src/app/page.tsx"), "utf8")
    expect(home).toMatch(/href=["']\/academy["']/)
  })

  it("billing banner 'prospect' (quem NÃO é aluno) aponta para landing /academy", () => {
    const billing = readFileSync(
      resolve(__dirname, "..", "src/app/dashboard/billing/BillingClient.tsx"),
      "utf8",
    )
    const prospectBlock = billing.match(
      /billing-academy-banner-prospect[\s\S]{0,200}/,
    )?.[0] ?? billing.match(/data-testid="billing-academy-banner-prospect"[\s\S]{0,200}|href="\/academy"[\s\S]{0,200}billing-academy-banner-prospect/)?.[0] ?? ""
    // Confirma que o link /academy puro existe no arquivo (para prospects)
    expect(billing).toMatch(/href=["']\/academy["'][\s\S]{0,200}billing-academy-banner-prospect/)
  })
})
