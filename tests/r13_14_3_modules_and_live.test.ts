/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R13.14.3 — Fix 404 do /academy/modules + criação do /academy/live
 *  ─────────────────────────────────────────────────────────────────────
 *  Bugs/pedidos reportados pela Janaina (2026-10-11):
 *
 *   1. "Quando clico no módulo ainda dá erro 404"
 *      → Causa: /academy/modules (lista geral) não tinha page.tsx,
 *        só existia /academy/modules/[moduleSlug]. Sidebar e navegação
 *        apontavam para a rota raiz, resultando em 404.
 *      → Fix: criada src/app/academy/(app)/modules/page.tsx com grid dos
 *        12 módulos + progresso.
 *
 *   2. "Encontros online ao vivo com atualizações da área, crie uma
 *       agenda possível (podendo sofrer alterações)"
 *      → Entrega: página /academy/live com próximo encontro em destaque,
 *        agenda completa, feed de atualizações + 3 encontros no DB
 *        (25/nov/2026, 15/dez/2026, 26/jan/2027, todos 19:00 BRT).
 *
 *  Cobre:
 *    A) Arquivos criados
 *    B) /academy/modules — estrutura e queries
 *    C) /academy/live — estrutura e queries
 *    D) Script de seed dos 3 encontros com datas corretas
 *    E) Sidebar atualizado (sem placeholders antigos para Encontros)
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = resolve(__dirname, "..")
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8")

/* ═════════════════════════════════════════════════════════════════════
   (A) ARQUIVOS CRIADOS
═════════════════════════════════════════════════════════════════════ */

describe("R13.14.3 · estrutura de arquivos", () => {
  const expected = [
    "src/app/academy/(app)/modules/page.tsx",
    "src/app/academy/(app)/live/page.tsx",
    "scripts/seed-live-events.ts",
  ]
  for (const f of expected) {
    it(`existe: ${f}`, () => {
      expect(existsSync(resolve(ROOT, f))).toBe(true)
    })
  }
})

/* ═════════════════════════════════════════════════════════════════════
   (B) /academy/modules — lista de módulos
═════════════════════════════════════════════════════════════════════ */

describe("R13.14.3 · /academy/modules (lista de módulos)", () => {
  const src = read("src/app/academy/(app)/modules/page.tsx")

  it("é server component (exporta default async function)", () => {
    expect(src).toMatch(/export\s+default\s+async\s+function/)
    expect(src).not.toMatch(/^["']use client["']/m)
  })

  it("checa autenticação (redirect para login se não logado)", () => {
    expect(src).toMatch(/\bauth\(\)/)
    expect(src).toMatch(/redirect\(\s*["']\/auth\/login\?callbackUrl=\/academy\/modules["']\s*\)/)
  })

  it("exige matrícula (redirect para /academy/welcome se sem AcademyEnrollment)", () => {
    expect(src).toMatch(/academyEnrollment\.findUnique/)
    expect(src).toMatch(/redirect\(["']\/academy\/welcome["']\)/)
  })

  it("verifica se matrícula expirou (redirect para /academy?expired=1)", () => {
    expect(src).toMatch(/getEnrollmentState/)
    expect(src).toMatch(/EXPIRED/)
    expect(src).toMatch(/\/academy\?expired=1/)
  })

  it("busca módulos ordenados por order com include de lessons", () => {
    expect(src).toMatch(/academyModule\.findMany/)
    expect(src).toMatch(/orderBy:\s*\{\s*order:\s*["']asc["']\s*\}/)
    expect(src).toMatch(/lessons:/)
  })

  it("usa computeStudentJourney para calcular progresso", () => {
    expect(src).toMatch(/computeStudentJourney/)
  })

  it("regressão (R13.14.3b): usa journey.modules (não trata o retorno como array)", () => {
    // Bug reportado por Janaina (2026-10-11): página crashava com
    // 'Application error' porque chamávamos journey.filter(...)
    // em vez de journey.modules.filter(...). computeStudentJourney
    // retorna um objeto StudentJourney, não um array.
    expect(src).toMatch(/journey\.modules/)
    // E NÃO pode ter chamadas inválidas como journey.filter/journey.map
    expect(src).not.toMatch(/\bjourney\.filter\b/)
    expect(src).not.toMatch(/\bjourney\.map\b/)
  })

  it("renderiza grid de cards de módulos com data-testid por módulo", () => {
    expect(src).toMatch(/data-testid="academy-modules-grid"/)
    expect(src).toMatch(/data-testid=\{?`module-card-\$\{mod\.order\}`\}?/)
  })

  it("mostra KPIs: módulos publicados, aulas concluídas, carga horária, progresso %", () => {
    expect(src).toMatch(/Módulos publicados|m[óo]dulos publicados/i)
    expect(src).toMatch(/Aulas concluídas|aulas conclu[íi]das/i)
    expect(src).toMatch(/Carga horária|carga hor[áa]ria/i)
    expect(src).toMatch(/Progresso|progresso/)
  })

  it("módulos não publicados aparecem como 'Em breve' (não quebra, não navega)", () => {
    expect(src).toMatch(/!mod\.isPublished/)
    expect(src).toMatch(/Em breve/)
  })
})

/* ═════════════════════════════════════════════════════════════════════
   (C) /academy/live — encontros ao vivo
═════════════════════════════════════════════════════════════════════ */

describe("R13.14.3 · /academy/live (encontros)", () => {
  const src = read("src/app/academy/(app)/live/page.tsx")

  it("é server component", () => {
    expect(src).toMatch(/export\s+default\s+async\s+function/)
    expect(src).not.toMatch(/^["']use client["']/m)
  })

  it("checa autenticação com callbackUrl=/academy/live", () => {
    expect(src).toMatch(/redirect\(\s*["']\/auth\/login\?callbackUrl=\/academy\/live["']\s*\)/)
  })

  it("busca eventos publicados ordenados por scheduledAt asc", () => {
    expect(src).toMatch(/academyLiveEvent\.findMany/)
    expect(src).toMatch(/isPublished:\s*true/)
    expect(src).toMatch(/orderBy:\s*\{\s*scheduledAt:\s*["']asc["']/)
  })

  it("busca feed de atualizações (AcademyUpdate) com take: 10", () => {
    expect(src).toMatch(/academyUpdate\.findMany/)
    expect(src).toMatch(/take:\s*10/)
  })

  it("separa eventos futuros e passados", () => {
    expect(src).toMatch(/scheduledAt\s*>=\s*now/)
    expect(src).toMatch(/scheduledAt\s*<\s*now/)
  })

  it("usa fuso horário America/Sao_Paulo nos formatters", () => {
    expect(src).toMatch(/timeZone:\s*["']America\/Sao_Paulo["']/)
  })

  it("destaca próximo encontro com countdown de dias", () => {
    expect(src).toMatch(/data-testid="academy-live-next"/)
    expect(src).toMatch(/daysUntil|dias/)
  })

  it("mostra link do Zoom quando meetingUrl existe + fallback 'será publicado 48h antes'", () => {
    expect(src).toMatch(/meetingUrl/)
    expect(src).toMatch(/48h antes/i)
  })

  it("renderiza feed de atualizações com 4 tipos (PROTOCOL, ARTICLE, LESSON_EXTRA, EVENT)", () => {
    expect(src).toMatch(/PROTOCOL/)
    expect(src).toMatch(/ARTICLE/)
    expect(src).toMatch(/LESSON_EXTRA/)
    expect(src).toMatch(/EVENT/)
  })

  it("mostra badge 'podendo sofrer alterações' na agenda", () => {
    expect(src).toMatch(/sofrer altera[cç][õo]es/i)
  })
})

/* ═════════════════════════════════════════════════════════════════════
   (D) SCRIPT DE SEED DOS ENCONTROS
═════════════════════════════════════════════════════════════════════ */

describe("R13.14.3 · scripts/seed-live-events.ts", () => {
  const src = read("scripts/seed-live-events.ts")

  it("define array EVENTS com 3 encontros", () => {
    expect(src).toMatch(/const\s+EVENTS[^=]*=\s*\[/)
    // 3 blocos "{ order: N, ..."
    const orderMatches = src.match(/order:\s*\d+/g) ?? []
    expect(orderMatches.length).toBeGreaterThanOrEqual(3)
  })

  it("agenda: 25/nov/2026 às 19:00 BRT = 22:00 UTC (encontro 1)", () => {
    expect(src).toMatch(/order:\s*1/)
    expect(src).toMatch(/2026-11-25T22:00:00/)
  })

  it("agenda: 15/dez/2026 às 19:00 BRT = 22:00 UTC (encontro 2)", () => {
    expect(src).toMatch(/order:\s*2/)
    expect(src).toMatch(/2026-12-15T22:00:00/)
  })

  it("agenda: 26/jan/2027 às 19:00 BRT = 22:00 UTC (encontro 3)", () => {
    expect(src).toMatch(/order:\s*3/)
    expect(src).toMatch(/2027-01-26T22:00:00/)
  })

  it("é idempotente (busca por order e usa update ou create)", () => {
    expect(src).toMatch(/findFirst/)
    expect(src).toMatch(/\.update\(/)
    expect(src).toMatch(/\.create\(/)
  })

  it("todos os encontros têm duração definida", () => {
    expect(src).toMatch(/durationMin:\s*\d+/)
  })

  it("menciona que podem sofrer alterações", () => {
    expect(src).toMatch(/altera[cç][õo]es/i)
  })
})

/* ═════════════════════════════════════════════════════════════════════
   (E) SIDEBAR ATUALIZADO
═════════════════════════════════════════════════════════════════════ */

describe("R13.14.3 · AcademySidebar · placeholders removidos", () => {
  const src = read("src/components/academy/AcademySidebar.tsx")

  it("item Encontros NÃO menciona mais 'Chega em R13.10'", () => {
    // Pega a linha do item /academy/live
    const liveItemMatch = src.match(
      /href:\s*["']\/academy\/live["'][\s\S]{0,400}info:\s*["']([^"']+)["']/,
    )
    expect(liveItemMatch).toBeTruthy()
    const info = liveItemMatch![1]
    expect(info).not.toMatch(/chega em R13/i)
  })

  it("item Encontros descreve a nova funcionalidade (Dra. Kamila, 3 encontros, feed)", () => {
    const liveItemMatch = src.match(
      /href:\s*["']\/academy\/live["'][\s\S]{0,400}info:\s*["']([^"']+)["']/,
    )
    const info = liveItemMatch![1]
    expect(info.toLowerCase()).toMatch(/kamila|encontro|zoom|gravaç|feed|atualiz/i)
  })

  it("item Módulos aponta para /academy/modules (rota agora existe)", () => {
    expect(src).toMatch(/href:\s*["']\/academy\/modules["']/)
  })
})
