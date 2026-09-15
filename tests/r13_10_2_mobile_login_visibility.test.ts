/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R13.10.2 — BIA Academy · Fix login visibility no mobile
 *  ─────────────────────────────────────────────────────────────────────
 *  BUG REPORTADO (Janaina, 2026-08-07):
 *   "No app pelo celular não achei em nenhum lugar 'já sou aluno' para entrar."
 *
 *  RAIZ DO BUG:
 *   Landing /academy e home / tinham o botão de login com className
 *   "hidden sm:block" (Tailwind), o que esconde em telas <640px.
 *
 *  FIX:
 *   1. Remove "hidden sm:block" dos botões de login (ambas as landings)
 *   2. Adiciona link "Já sou aluno" também no CTA final do /academy
 *   3. Adiciona link explícito "Já é aluno? Entrar" no banner Academy da home
 *   4. Este arquivo trava regressão (não pode voltar o hidden sm:block)
 *
 *  Cobre:
 *   A) Nav de /academy: "Já sou aluno" visível em TODAS resoluções
 *   B) Nav de /: "Entrar" visível em TODAS resoluções
 *   C) CTA final de /academy: link "Já sou aluno · Entrar" presente
 *   D) Banner Academy da home /: link "Já é aluno? Entrar" presente
 *   E) Regressão: nenhum botão de login pode ter "hidden sm:" na classe
 * ═══════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = resolve(__dirname, "..")
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8")

/**
 * Extrai o bloco JSX que contém uma testId específica (para checar classes
 * do próprio elemento — não pega classes de elementos filhos/pais).
 */
function extractElementByTestId(src: string, testId: string): string {
  // Padrão simples: pega da abertura do último "<" até "/>" ou ">…</>"
  // O parsing HTML é uma aproximação — como o teste é para classes do próprio
  // elemento, pegamos o bloco entre o "<" mais próximo (antes do testId) e o próximo ">".
  const idx = src.indexOf(`data-testid="${testId}"`)
  if (idx < 0) return ""
  // Volta até o "<" que abre esse elemento (ignora "<" em atributos)
  let start = idx
  while (start > 0 && src[start] !== "<") start--
  // Vai até o ">" que fecha a tag (ignora ">" em strings)
  let end = idx
  let inString: string | null = null
  while (end < src.length) {
    const ch = src[end]
    if (inString) {
      if (ch === inString) inString = null
    } else {
      if (ch === "\"" || ch === "'") inString = ch
      else if (ch === ">") break
    }
    end++
  }
  return src.substring(start, end + 1)
}

// ══════════════════════════════════════════════════════════════════════
//   R13.10.2.A · /academy nav — "Já sou aluno" visível no mobile
// ══════════════════════════════════════════════════════════════════════
describe("R13.10.2.A · Nav de /academy: 'Já sou aluno' visível no mobile", () => {
  const src = read("src/app/academy/page.tsx")

  it("Link 'Já sou aluno' existe (testId academy-cta-login)", () => {
    expect(src).toContain("academy-cta-login")
    expect(src).toMatch(/J[áa]\s+sou\s+aluno/)
  })

  it("Link 'Já sou aluno' NÃO tem 'hidden' no className (crítico para mobile)", () => {
    const el = extractElementByTestId(src, "academy-cta-login")
    expect(el, "elemento academy-cta-login não encontrado").not.toBe("")
    // Não pode ter "hidden" no className (esconderia no mobile)
    expect(el).not.toMatch(/className=["'][^"']*\bhidden\b/)
    // Não pode ter "hidden sm:" nem "hidden md:" (variantes)
    expect(el).not.toMatch(/hidden\s+sm:/)
    expect(el).not.toMatch(/hidden\s+md:/)
  })

  it("Link 'Já sou aluno' aponta para /auth/login", () => {
    const el = extractElementByTestId(src, "academy-cta-login")
    expect(el).toMatch(/href=["']\/auth\/login["']/)
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.10.2.B · home / nav — "Entrar" visível no mobile
// ══════════════════════════════════════════════════════════════════════
describe("R13.10.2.B · Nav de /: 'Entrar' visível no mobile", () => {
  const src = read("src/app/page.tsx")

  it("Link 'Entrar' existe (testId home-nav-login)", () => {
    expect(src).toContain("home-nav-login")
    expect(src).toMatch(/>\s*Entrar\s*</)
  })

  it("Link 'Entrar' NÃO tem 'hidden' no className (crítico para mobile)", () => {
    const el = extractElementByTestId(src, "home-nav-login")
    expect(el, "elemento home-nav-login não encontrado").not.toBe("")
    expect(el).not.toMatch(/className=["'][^"']*\bhidden\b/)
    expect(el).not.toMatch(/hidden\s+sm:/)
    expect(el).not.toMatch(/hidden\s+md:/)
  })

  it("Link 'Entrar' aponta para /auth/login", () => {
    const el = extractElementByTestId(src, "home-nav-login")
    expect(el).toMatch(/href=["']\/auth\/login["']/)
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.10.2.C · CTA final de /academy — fallback de login
// ══════════════════════════════════════════════════════════════════════
describe("R13.10.2.C · CTA final de /academy tem link de login (fallback)", () => {
  const src = read("src/app/academy/page.tsx")

  it("Link 'Já sou aluno · Entrar' aparece no CTA final (testId academy-cta-login-footer)", () => {
    expect(src).toContain("academy-cta-login-footer")
    expect(src).toMatch(/J[áa]\s+sou\s+aluno.*Entrar|Entrar.*aluno/i)
  })

  it("Link do rodapé NÃO tem 'hidden' no className", () => {
    const el = extractElementByTestId(src, "academy-cta-login-footer")
    expect(el).not.toMatch(/hidden\s+sm:/)
    expect(el).not.toMatch(/hidden\s+md:/)
  })

  it("Link do rodapé aponta para /auth/login", () => {
    const el = extractElementByTestId(src, "academy-cta-login-footer")
    expect(el).toMatch(/href=["']\/auth\/login["']/)
  })

  it("Tem mensagem explicativa mencionando \"pagou pelo Asaas\"", () => {
    // Ajuda o aluno que acabou de comprar a saber que é aqui que ele entra
    expect(src).toMatch(/pagou\s+pelo\s+Asaas|email\s+que\s+usou/i)
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.10.2.D · Banner Academy da home / — link explícito de login
// ══════════════════════════════════════════════════════════════════════
describe("R13.10.2.D · Banner Academy da home / tem link explícito de login", () => {
  const src = read("src/app/page.tsx")

  it("Link 'Entrar na plataforma' aparece no banner (testId home-academy-banner-login)", () => {
    expect(src).toContain("home-academy-banner-login")
    expect(src).toMatch(/Entrar\s+na\s+plataforma/i)
  })

  it("Link do banner aponta para /auth/login", () => {
    const el = extractElementByTestId(src, "home-academy-banner-login")
    expect(el).toMatch(/href=["']\/auth\/login["']/)
  })

  it("Link do banner NÃO tem 'hidden' no className", () => {
    const el = extractElementByTestId(src, "home-academy-banner-login")
    expect(el).not.toMatch(/hidden\s+sm:/)
    expect(el).not.toMatch(/hidden\s+md:/)
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.10.2.E · Guarda de regressão — sem 'hidden sm:' em login
// ══════════════════════════════════════════════════════════════════════
describe("R13.10.2.E · Guarda de regressão: sem 'hidden sm:' em links de /auth/login", () => {
  const files = [
    "src/app/page.tsx",
    "src/app/academy/page.tsx",
  ]

  for (const f of files) {
    it(`${f}: nenhum link para /auth/login tem 'hidden sm:' ou 'hidden md:'`, () => {
      const src = read(f)
      // Extrai todos os elementos <Link> ou <a> que apontam para /auth/login
      // Match não-greedy do "<Link" ou "<a" até o próximo ">"
      const linkPattern = /<(?:Link|a)\b[^>]*href=["']\/auth\/login[^"']*["'][^>]*>/g
      const matches = src.match(linkPattern) ?? []
      expect(matches.length, `${f}: nenhum link para /auth/login encontrado`).toBeGreaterThan(0)
      for (const m of matches) {
        expect(m, `${f}: link para login escondido no mobile: ${m}`).not.toMatch(/hidden\s+sm:/)
        expect(m, `${f}: link para login escondido no mobile: ${m}`).not.toMatch(/hidden\s+md:/)
      }
    })
  }
})
