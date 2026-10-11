/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R13.14.2 — Fix: "Já sou aluno" na landing /academy devia levar à
 *              /academy/dashboard, não à /dashboard da plataforma BIA
 *  ─────────────────────────────────────────────────────────────────────
 *  BUG REPORTADO (Janaina, 2026-10-11):
 *   "Quando entro na página BIA Academy e clico 'Já sou aluno', ele
 *    abre uma página que não tem nada a ver com a plataforma de cursos
 *    — abre a plataforma BIA de biofabricação."
 *
 *  RAIZ DO BUG:
 *   Os 2 links "Já sou aluno" da landing /academy (nav superior + CTA
 *   do footer) iam para /auth/login sem callbackUrl. O NextAuth então
 *   usava o default do login (/dashboard = BIA geral).
 *
 *  FIX:
 *   Ambos os links agora apontam para
 *     /auth/login?callbackUrl=/academy/dashboard
 *   O /auth/login/page.tsx já respeita callbackUrl (verificado).
 *
 *  Cobre:
 *   A) Nav superior: href aponta para /academy/dashboard via callbackUrl
 *   B) CTA footer: href aponta para /academy/dashboard via callbackUrl
 *   C) Regressão: nenhum link "Já sou aluno" da /academy pode ir
 *      para /auth/login sem callbackUrl
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const landingSrc = readFileSync(
  resolve(__dirname, "..", "src/app/academy/page.tsx"),
  "utf8",
)
const loginSrc = readFileSync(
  resolve(__dirname, "..", "src/app/auth/login/page.tsx"),
  "utf8",
)

/**
 * Pega o href do elemento que termina com um data-testid específico.
 * Varre o JSX pegando a última ocorrência de href="..." ANTES do testId.
 */
function hrefOfTestId(src: string, testId: string): string | null {
  const idx = src.indexOf(`data-testid="${testId}"`)
  if (idx === -1) return null
  // Pega até 2KB antes do testId e procura o href="..." mais próximo
  const before = src.slice(Math.max(0, idx - 2000), idx)
  const hrefs = [...before.matchAll(/href="([^"]+)"/g)]
  if (hrefs.length === 0) return null
  return hrefs[hrefs.length - 1][1]
}

describe("R13.14.2 · landing /academy · 'Já sou aluno' leva pra Academy", () => {
  it("A) Nav superior ('academy-cta-login') usa callbackUrl=/academy/dashboard", () => {
    const href = hrefOfTestId(landingSrc, "academy-cta-login")
    expect(href, "não achou o link do nav com data-testid=academy-cta-login").toBeTruthy()
    expect(href).toBe("/auth/login?callbackUrl=/academy/dashboard")
  })

  it("B) CTA footer ('academy-cta-login-footer') usa callbackUrl=/academy/dashboard", () => {
    const href = hrefOfTestId(landingSrc, "academy-cta-login-footer")
    expect(href, "não achou o link do footer").toBeTruthy()
    expect(href).toBe("/auth/login?callbackUrl=/academy/dashboard")
  })

  it("C) regressão: NENHUM link 'Já sou aluno' da landing /academy pode ir para /auth/login SEM callbackUrl", () => {
    // Varre todas as ocorrências de href="/auth/login..." e verifica
    // que cada uma tem callbackUrl=/academy/dashboard
    const matches = [...landingSrc.matchAll(/href="(\/auth\/login[^"]*)"/g)]
    expect(matches.length, "landing /academy deveria ter ao menos 1 link de login").toBeGreaterThan(0)
    for (const m of matches) {
      expect(m[1], `link ${m[1]} está sem callbackUrl correto`).toContain(
        "callbackUrl=/academy/dashboard",
      )
    }
  })

  it("D) /auth/login respeita callbackUrl da query string", () => {
    // Sanity: garante que o endpoint de login ainda lê e redireciona
    // conforme ?callbackUrl=... (se mudar isso aqui, o fix se perde)
    expect(loginSrc).toMatch(/searchParams\.get\(\s*["']callbackUrl["']\s*\)/)
    expect(loginSrc).toMatch(/router\.push\s*\(/)
  })
})
