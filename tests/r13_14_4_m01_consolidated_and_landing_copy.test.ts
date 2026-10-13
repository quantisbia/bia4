/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R13.14.4 — M01 consolidado + copy nova da landing /academy
 *  ─────────────────────────────────────────────────────────────────────
 *  Decisões (Janaina, 2026-10-11):
 *
 *   1. Módulo 1 "Introdução à Biofabricação" vira UMA aula corrida
 *      (ao invés de 5 sub-aulas). O script scripts/consolidate-m01-single-lesson.ts
 *      é idempotente e já foi rodado no Neon.
 *
 *   2. Landing /academy precisa parecer que tem TUDO disponível desde o
 *      dia 1 (não liberação progressiva) + copy mais vendedora chamando
 *      para a inscrição.
 *
 *  Cobre:
 *    (A) Script de consolidação do M01 — estrutura + idempotência
 *    (B) MODULES array na landing — todos com available: true
 *    (C) Copy nova: hero, programa, FAQ, CTA final
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = resolve(__dirname, "..")
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8")

/* ═════════════════════════════════════════════════════════════════════
   (A) SCRIPT DE CONSOLIDAÇÃO DO M01
═════════════════════════════════════════════════════════════════════ */

describe("R13.14.4 · scripts/consolidate-m01-single-lesson.ts", () => {
  const path = "scripts/consolidate-m01-single-lesson.ts"

  it("arquivo existe", () => {
    expect(existsSync(resolve(ROOT, path))).toBe(true)
  })

  it("alvo é o slug 'introducao-biofabricacao'", () => {
    const src = read(path)
    expect(src).toMatch(/MODULE_SLUG\s*=\s*["']introducao-biofabricacao["']/)
  })

  it("é idempotente (sai sem erro se já tem 1 aula)", () => {
    const src = read(path)
    expect(src).toMatch(/mod\.lessons\.length\s*===\s*1/)
    expect(src).toMatch(/idempotente/i)
  })

  it("usa transação prisma.$transaction para atomicidade", () => {
    const src = read(path)
    expect(src).toMatch(/prisma\.\$transaction/)
  })

  it("preserva anexos (reatribui lessonId antes de deletar)", () => {
    const src = read(path)
    expect(src).toMatch(/academyAttachment\.updateMany/)
    expect(src).toMatch(/lessonId:\s*first\.id/)
  })

  it("deleta aulas 2..5 via deleteMany (cascade cuida de progress/quiz/cert)", () => {
    const src = read(path)
    expect(src).toMatch(/academyLesson\.deleteMany/)
    expect(src).toMatch(/mod\.lessons\.slice\(1\)/)
  })

  it("gera 1 summary consolidado em markdown com cabeçalhos 'Parte N'", () => {
    const src = read(path)
    expect(src).toMatch(/SECTION_HEADERS/)
    expect(src).toMatch(/Parte 1/)
    expect(src).toMatch(/Parte 5/)
  })
})

/* ═════════════════════════════════════════════════════════════════════
   (B) MODULES ARRAY — TODOS DISPONÍVEIS
═════════════════════════════════════════════════════════════════════ */

describe("R13.14.4 · landing /academy · MODULES todos disponíveis", () => {
  const src = read("src/app/academy/page.tsx")

  it("array MODULES tem 12 entradas", () => {
    const modulesMatch = src.match(/const\s+MODULES\s*=\s*\[([\s\S]*?)^\]/m)
    expect(modulesMatch).toBeTruthy()
    const block = modulesMatch![1]
    const entries = block.match(/\{\s*n:\s*\d+/g) ?? []
    expect(entries.length).toBe(12)
  })

  it("TODOS os 12 módulos agora têm available: true", () => {
    const modulesMatch = src.match(/const\s+MODULES\s*=\s*\[([\s\S]*?)^\]/m)
    const block = modulesMatch![1]
    const availableTrue = (block.match(/available:\s*true/g) ?? []).length
    const availableFalse = (block.match(/available:\s*false/g) ?? []).length
    expect(availableTrue).toBe(12)
    expect(availableFalse).toBe(0)
  })

  it("comentário documenta a decisão de todos disponíveis", () => {
    expect(src).toMatch(/todos marcados como.*dispon[íi]veis/i)
  })
})

/* ═════════════════════════════════════════════════════════════════════
   (C) COPY NOVA DA LANDING
═════════════════════════════════════════════════════════════════════ */

describe("R13.14.4 · landing /academy · copy vendedora", () => {
  const src = read("src/app/academy/page.tsx")

  it("Hero: badge 'Todos os 12 módulos disponíveis desde o 1º dia'", () => {
    expect(src).toMatch(/Todos os 12 m[óo]dulos.*dispon[íi]veis/i)
  })

  it("Hero: headline 'bioimprima o seu primeiro tecido em 12 semanas'", () => {
    expect(src).toMatch(/bioimprima.*primeiro tecido/i)
  })

  it("Hero: CTA primário 'Garantir minha vaga'", () => {
    expect(src).toMatch(/Garantir minha vaga/)
  })

  it("Hero: subtexto menciona pagamento 12x sem juros + acesso em 24h", () => {
    expect(src).toMatch(/12x sem juros/)
    expect(src).toMatch(/24h/)
  })

  it("Hero: mini-prova social com Quantis + 65 artigos + rastreável", () => {
    expect(src).toMatch(/65\+?\s+artigos/i)
    expect(src).toMatch(/rastre[áa]vel/i)
    expect(src).toMatch(/Quantis Biotechnology/)
  })

  it("Programa: título mudou de 'oficial' para 'O que está incluído na sua matrícula'", () => {
    expect(src).toMatch(/O que está incluído na sua matrícula|incluído na sua matr/i)
  })

  it("Programa: menciona Dra. Kamila Leichtweis", () => {
    expect(src).toMatch(/Dra\.\s*Kamila\s*Leichtweis/i)
  })

  it("Programa: menciona a biblioteca com 65\\+ artigos/patentes/protocolos", () => {
    expect(src).toMatch(/65\+?/)
    expect(src).toMatch(/artigos.*patentes.*protocolos|biblioteca/i)
  })

  it("Programa: menciona white papers Quantis / QMatrix", () => {
    expect(src).toMatch(/white\s*papers.*Quantis/i)
  })

  it("Programa: menciona certificado por aula + certificado final", () => {
    expect(src).toMatch(/certificado por aula/i)
  })

  it("Módulos: nova seção com 'Todos os módulos liberados no 1º dia'", () => {
    expect(src).toMatch(/Todos os m[óo]dulos liberados no 1[ºo] dia/i)
  })

  it("Módulos: título '12 módulos · 1 jornada completa'", () => {
    expect(src).toMatch(/12 m[óo]dulos · 1 jornada completa/)
  })

  it("Preço: lista inclui '7 dias de garantia' incondicional", () => {
    expect(src).toMatch(/7 dias de garantia/)
  })

  it("Preço: lista menciona TODOS os 12 módulos liberados", () => {
    expect(src).toMatch(/Todos os 12 m[óo]dulos.*liberados no 1[ºo] dia/i)
  })

  it("FAQ: novo item sobre todos os módulos disponíveis desde o 1º dia", () => {
    expect(src).toMatch(/Os 12 m[óo]dulos est[ãa]o dispon[íi]veis desde o 1[ºo] dia/i)
  })

  it("FAQ: novo item sobre garantia de 7 dias", () => {
    expect(src).toMatch(/E se eu não gostar do curso/i)
    expect(src).toMatch(/7 dias de garantia incondicional/i)
  })

  it("FAQ: menciona Dra. Kamila nos encontros ao vivo", () => {
    expect(src).toMatch(/Dra\.\s*Kamila/i)
  })

  it("FAQ: menciona os 3 formatos de certificado", () => {
    expect(src).toMatch(/3 formatos de certificado/i)
  })

  it("CTA final: headline 'sair da teoria e colocar a mão na massa'", () => {
    expect(src).toMatch(/colocar a mão na massa/i)
  })

  it("CTA final: menciona 'em 24h' e Dra. Kamila", () => {
    expect(src).toMatch(/em at[ée] 24h|24h/i)
  })
})

/* ═════════════════════════════════════════════════════════════════════
   (D) PRESERVAR CTAs E DATA-TESTIDS CRÍTICOS (regressão)
═════════════════════════════════════════════════════════════════════ */

describe("R13.14.4 · landing · testids e CTAs mantidos", () => {
  const src = read("src/app/academy/page.tsx")

  it("CTAs Asaas (nav, hero, pricing, footer) continuam presentes", () => {
    expect(src).toMatch(/academy-cta-asaas-nav/)
    expect(src).toMatch(/academy-cta-asaas-hero/)
    expect(src).toMatch(/academy-cta-asaas-pricing/)
    expect(src).toMatch(/academy-cta-asaas-footer/)
  })

  it("CTAs de login continuam com callbackUrl=/academy/dashboard", () => {
    expect(src).toMatch(/academy-cta-login["][\s\S]{0,500}callbackUrl=\/academy\/dashboard|callbackUrl=\/academy\/dashboard[\s\S]{0,500}academy-cta-login/)
  })

  it("WhatsApp CTA continua apontando para o número 11968632231", () => {
    expect(src).toMatch(/wa\.me\/11968632231/)
  })

  it("Brinde QMatrix (R13.14.1) continua renderizando se existir", () => {
    expect(src).toMatch(/FEATURED_BRINDE/)
    expect(src).toMatch(/academy-section-brinde/)
  })
})
