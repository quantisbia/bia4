/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R13.03 — BIA Academy · Dashboard do aluno + Minha Jornada + Página de aula
 *  ─────────────────────────────────────────────────────────────────────
 *  Terceiro sprint da trilha R13. Entrega:
 *   - Sidebar próprio /academy (AcademySidebar) — decisão #1: Opção B
 *   - Helper computeStudentJourney (puro, agrega módulos+aulas+progresso)
 *   - 3 APIs: GET /journey, GET /lessons/[slug], PATCH /progress
 *   - Layout /academy/(app)/layout.tsx (route group protegido)
 *   - 4 páginas: /dashboard, /journey, /modules/[slug], /modules/[slug]/[slug]
 *   - Onboarding pós-completed passa a redirecionar para /academy/dashboard
 *
 *  Decisões locked (Janaina · 2026-08-07):
 *   1. Sidebar próprio Academy (Opção B)
 *   2. continueFrom = último IN_PROGRESS + fallback next lesson não concluída
 *   3. Página de aula: iframe YT + botão manual "Marcar concluída"
 *   4. Gate acesso: NO_ENROLLMENT/EXPIRED → redirect /academy/welcome (Opção B)
 *   5. biaHook abre BIA em NOVA aba com params na query + tracka bia_hook_opened
 *   6. Módulo ganha selo "Concluído ✓" quando 100% das aulas publicadas
 *   7. Aula com isPublished=false aparece com cadeado (não some) mas 404 se acessar
 *
 *  Cobre:
 *   A) Helper puro: agregação, %, continueFrom, next/prev, LOCKED, edge cases
 *   B) AcademySidebar tem 7 itens de nav + voltar para BIA + testIds
 *   C) API journey: auth, gates, response shape
 *   D) API lessons/[slug]: auth, gates, upsert idempotente
 *   E) API progress: Zod, deriva completedAt, propaga enrollmentJustCompleted
 *   F) Layout (app): gate de session + hasAccess redirects
 *   G) Página /academy/dashboard: 5 cards com testIds
 *   H) Página /academy/journey: timeline 12 módulos + badges + LOCKED
 *   I) Página /academy/modules/[slug]: lista aulas + 404 se não publicado
 *   J) Página lesson: iframe + biaHook + marcar concluída + prev/next
 *   K) Onboarding redireciona para /academy/dashboard (não mais notebook)
 * ═══════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import {
  computeStudentJourney,
  findLessonInJourney,
  findNextLesson,
  findPreviousLesson,
} from "../src/lib/academy/journey"

const ROOT = resolve(__dirname, "..")
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8")
const has = (rel: string) => existsSync(resolve(ROOT, rel))

// ══════════════════════════════════════════════════════════════════════
//   Fixture builder (evita tocar Prisma real — helper é puro)
// ══════════════════════════════════════════════════════════════════════

type L = {
  id: string; slug: string; order: number; title: string;
  durationMin: number; level: string; isPublished: boolean; moduleId: string;
}
type M = {
  id: string; slug: string; order: number; title: string;
  description: string | null; coverImage: string | null; isPublished: boolean;
  lessons: L[];
}
type P = {
  lessonId: string; status: string; watchedSeconds: number;
  completedAt: Date | null; biaHookOpened: boolean; updatedAt: Date | null;
}

function makeLesson(overrides: Partial<L> = {}): L {
  return {
    id: overrides.id ?? "l1",
    slug: overrides.slug ?? "aula-1",
    order: overrides.order ?? 1,
    title: overrides.title ?? "Aula piloto",
    durationMin: overrides.durationMin ?? 10,
    level: overrides.level ?? "basic",
    isPublished: overrides.isPublished ?? true,
    moduleId: overrides.moduleId ?? "m1",
  }
}

function makeModule(overrides: Partial<M> = {}): M {
  return {
    id: overrides.id ?? "m1",
    slug: overrides.slug ?? "mod-1",
    order: overrides.order ?? 1,
    title: overrides.title ?? "Módulo 1",
    description: overrides.description ?? null,
    coverImage: overrides.coverImage ?? null,
    isPublished: overrides.isPublished ?? true,
    lessons: overrides.lessons ?? [makeLesson()],
  }
}

function makeProgress(overrides: Partial<P>): P {
  return {
    lessonId: overrides.lessonId ?? "l1",
    status: overrides.status ?? "NOT_STARTED",
    watchedSeconds: overrides.watchedSeconds ?? 0,
    completedAt: overrides.completedAt ?? null,
    biaHookOpened: overrides.biaHookOpened ?? false,
    updatedAt: overrides.updatedAt ?? null,
  }
}

// ══════════════════════════════════════════════════════════════════════
//   R13.03.A — Helper computeStudentJourney (funções puras)
// ══════════════════════════════════════════════════════════════════════

describe("R13.03.A · Helper computeStudentJourney", () => {
  it("Retorna estrutura vazia coerente para 0 módulos", () => {
    const j = computeStudentJourney([], [])
    expect(j.modules).toEqual([])
    expect(j.totalLessons).toBe(0)
    expect(j.completedLessons).toBe(0)
    expect(j.overallPercent).toBe(0)
    expect(j.continueFrom).toBeNull()
    expect(j.nextRecommendedLesson).toBeNull()
  })

  it("Módulo com 1 aula NOT_STARTED: percent=0, next=aula1 (fallback do continueFrom)", () => {
    const modules = [makeModule({ lessons: [makeLesson()] })]
    const j = computeStudentJourney(modules, [])
    expect(j.overallPercent).toBe(0)
    expect(j.modules[0].percent).toBe(0)
    expect(j.nextRecommendedLesson?.id).toBe("l1")
    expect(j.continueFrom?.id).toBe("l1") // fallback = next
  })

  it("Módulo com 1 aula IN_PROGRESS: continueFrom pega IN_PROGRESS, não fallback", () => {
    const modules = [makeModule({ lessons: [
      makeLesson({ id: "l1" }),
      makeLesson({ id: "l2", slug: "aula-2", order: 2 }),
    ]})]
    const progress = [
      makeProgress({ lessonId: "l2", status: "IN_PROGRESS", updatedAt: new Date("2026-01-15") }),
    ]
    const j = computeStudentJourney(modules, progress)
    expect(j.continueFrom?.id).toBe("l2")
    // nextRecommendedLesson pega a primeira não concluída em ordem = l1 (que ainda é NOT_STARTED)
    expect(j.nextRecommendedLesson?.id).toBe("l1")
  })

  it("Múltiplas aulas IN_PROGRESS: continueFrom pega a mais recente por updatedAt", () => {
    const modules = [makeModule({ lessons: [
      makeLesson({ id: "l1" }),
      makeLesson({ id: "l2", slug: "aula-2", order: 2 }),
      makeLesson({ id: "l3", slug: "aula-3", order: 3 }),
    ]})]
    const progress = [
      makeProgress({ lessonId: "l1", status: "IN_PROGRESS", updatedAt: new Date("2026-01-10") }),
      makeProgress({ lessonId: "l3", status: "IN_PROGRESS", updatedAt: new Date("2026-01-20") }),
      makeProgress({ lessonId: "l2", status: "IN_PROGRESS", updatedAt: new Date("2026-01-15") }),
    ]
    const j = computeStudentJourney(modules, progress)
    expect(j.continueFrom?.id).toBe("l3") // mais recente
  })

  it("Módulo com 2 aulas, 1 COMPLETED: percent=50, completed=1", () => {
    const modules = [makeModule({ lessons: [
      makeLesson({ id: "l1" }),
      makeLesson({ id: "l2", slug: "aula-2", order: 2 }),
    ]})]
    const progress = [
      makeProgress({ lessonId: "l1", status: "COMPLETED", completedAt: new Date() }),
    ]
    const j = computeStudentJourney(modules, progress)
    expect(j.modules[0].percent).toBe(50)
    expect(j.modules[0].completedLessons).toBe(1)
    expect(j.modules[0].isCompleted).toBe(false)
    expect(j.nextRecommendedLesson?.id).toBe("l2") // pula a completed
  })

  it("Todas as aulas publicadas COMPLETED: isCompleted=true, next=null", () => {
    const modules = [makeModule({ lessons: [
      makeLesson({ id: "l1" }),
      makeLesson({ id: "l2", slug: "aula-2", order: 2 }),
    ]})]
    const progress = [
      makeProgress({ lessonId: "l1", status: "COMPLETED" }),
      makeProgress({ lessonId: "l2", status: "COMPLETED" }),
    ]
    const j = computeStudentJourney(modules, progress)
    expect(j.modules[0].isCompleted).toBe(true)
    expect(j.modules[0].percent).toBe(100)
    expect(j.nextRecommendedLesson).toBeNull()
    expect(j.continueFrom).toBeNull()
  })

  it("Aula com isPublished=false vira LOCKED e não conta no percent (decisão #7)", () => {
    const modules = [makeModule({ lessons: [
      makeLesson({ id: "l1", isPublished: true }),
      makeLesson({ id: "l2", slug: "aula-2", order: 2, isPublished: false }),
    ]})]
    const progress = [
      makeProgress({ lessonId: "l1", status: "COMPLETED" }),
    ]
    const j = computeStudentJourney(modules, progress)
    // Só 1 aula publicada, e ela está COMPLETED → 100% + isCompleted
    expect(j.modules[0].totalLessons).toBe(1)
    expect(j.modules[0].completedLessons).toBe(1)
    expect(j.modules[0].percent).toBe(100)
    expect(j.modules[0].isCompleted).toBe(true)
    // A aula não publicada aparece na lista com status LOCKED
    const l2 = j.modules[0].lessons.find(l => l.id === "l2")
    expect(l2?.status).toBe("LOCKED")
  })

  it("Percent global agrega só aulas publicadas de todos os módulos", () => {
    const m1 = makeModule({ id: "m1", slug: "m1", order: 1, lessons: [
      makeLesson({ id: "l1", moduleId: "m1" }),
      makeLesson({ id: "l2", slug: "l2", order: 2, moduleId: "m1" }),
    ]})
    const m2 = makeModule({ id: "m2", slug: "m2", order: 2, lessons: [
      makeLesson({ id: "l3", moduleId: "m2" }),
      makeLesson({ id: "l4", slug: "l4", order: 2, moduleId: "m2", isPublished: false }),
    ]})
    const j = computeStudentJourney([m1, m2], [
      makeProgress({ lessonId: "l1", status: "COMPLETED" }),
      makeProgress({ lessonId: "l3", status: "COMPLETED" }),
    ])
    // 3 publicadas (l1,l2,l3), 2 completed → 66,67% arred → 67
    expect(j.totalLessons).toBe(3)
    expect(j.completedLessons).toBe(2)
    expect(j.overallPercent).toBe(67)
  })

  it("Ordena módulos por order ASC mesmo com input embaralhado", () => {
    const j = computeStudentJourney([
      makeModule({ id: "m3", slug: "m3", order: 3 }),
      makeModule({ id: "m1", slug: "m1", order: 1 }),
      makeModule({ id: "m2", slug: "m2", order: 2 }),
    ], [])
    expect(j.modules.map(m => m.order)).toEqual([1, 2, 3])
  })

  it("Ordena aulas de cada módulo por order ASC", () => {
    const j = computeStudentJourney([makeModule({ lessons: [
      makeLesson({ id: "l3", slug: "l3", order: 3 }),
      makeLesson({ id: "l1", slug: "l1", order: 1 }),
      makeLesson({ id: "l2", slug: "l2", order: 2 }),
    ]})], [])
    expect(j.modules[0].lessons.map(l => l.order)).toEqual([1, 2, 3])
  })

  it("Módulo com isPublished=false não contribui para nextRecommendedLesson", () => {
    const j = computeStudentJourney([
      makeModule({ id: "m1", slug: "m1", order: 1, isPublished: false, lessons: [
        makeLesson({ id: "l1", moduleId: "m1" }),
      ]}),
      makeModule({ id: "m2", slug: "m2", order: 2, isPublished: true, lessons: [
        makeLesson({ id: "l2", moduleId: "m2" }),
      ]}),
    ], [])
    expect(j.nextRecommendedLesson?.id).toBe("l2")
  })

  it("findLessonInJourney: retorna aula publicada, null se não existe ou não publicada", () => {
    const j = computeStudentJourney([makeModule({ slug: "m1", lessons: [
      makeLesson({ id: "l1", slug: "l1" }),
      makeLesson({ id: "l2", slug: "l2", order: 2, isPublished: false }),
    ]})], [])
    expect(findLessonInJourney(j, "m1", "l1")?.id).toBe("l1")
    expect(findLessonInJourney(j, "m1", "l2")).toBeNull() // não publicada
    expect(findLessonInJourney(j, "m1", "inexistente")).toBeNull()
    expect(findLessonInJourney(j, "outro-mod", "l1")).toBeNull()
  })

  it("findNextLesson e findPreviousLesson: navegam pela sequência global publicada", () => {
    const j = computeStudentJourney([
      makeModule({ id: "m1", slug: "m1", order: 1, lessons: [
        makeLesson({ id: "l1", moduleId: "m1", slug: "l1" }),
        makeLesson({ id: "l2", moduleId: "m1", slug: "l2", order: 2 }),
      ]}),
      makeModule({ id: "m2", slug: "m2", order: 2, lessons: [
        makeLesson({ id: "l3", moduleId: "m2", slug: "l3" }),
      ]}),
    ], [])
    expect(findNextLesson(j, "l1")?.id).toBe("l2")
    expect(findNextLesson(j, "l2")?.id).toBe("l3") // atravessa fronteira de módulo
    expect(findNextLesson(j, "l3")).toBeNull() // última
    expect(findPreviousLesson(j, "l1")).toBeNull() // primeira
    expect(findPreviousLesson(j, "l3")?.id).toBe("l2")
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.03.B — AcademySidebar (decisão #1: sidebar próprio)
// ══════════════════════════════════════════════════════════════════════

describe("R13.03.B · AcademySidebar", () => {
  const path = "src/components/academy/AcademySidebar.tsx"
  const src = read(path)

  it("Arquivo existe e é client component", () => {
    expect(has(path)).toBe(true)
    expect(src).toMatch(/^["']use client["']/m)
  })

  it("Tem 7 itens de nav em ACADEMY_NAV_ITEMS", () => {
    const arr = src.match(/ACADEMY_NAV_ITEMS\s*=\s*\[[\s\S]*?\n\]/)?.[0] ?? ""
    expect(arr).not.toBe("")
    const items = arr.match(/href:\s*["']\/academy\/[^"']+["']/g) ?? []
    expect(items.length).toBeGreaterThanOrEqual(7)
  })

  it("Nav inclui Dashboard, Jornada, Módulos, Biblioteca, Projeto, Encontros, Certificado", () => {
    expect(src).toMatch(/\/academy\/dashboard["']/)
    expect(src).toMatch(/\/academy\/journey["']/)
    expect(src).toMatch(/\/academy\/modules["']/)
    expect(src).toMatch(/\/academy\/library["']/)
    expect(src).toMatch(/\/academy\/project["']/)
    expect(src).toMatch(/\/academy\/live["']/)
    expect(src).toMatch(/\/academy\/certificate["']/)
  })

  it("Tem botão \"Voltar para a BIA\" apontando para /dashboard", () => {
    expect(src).toContain("academy-sidebar-back-to-bia")
    expect(src).toMatch(/href=["']\/dashboard["']/)
  })

  it("Usa gradient violet→fuchsia (identidade Academy)", () => {
    expect(src).toMatch(/from-violet-\d+\s+to-fuchsia-\d+/)
  })

  it("Exporta AcademySidebar (component + sub-components)", () => {
    expect(src).toMatch(/export\s+function\s+AcademySidebar\b/)
    expect(src).toMatch(/export\s+const\s+ACADEMY_NAV_ITEMS/)
  })

  it("Tem InfoTooltip com hover desktop + click mobile", () => {
    expect(src).toMatch(/function\s+InfoTooltip/)
    expect(src).toMatch(/group-hover\/info/)
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.03.C — API GET /api/academy/journey
// ══════════════════════════════════════════════════════════════════════

describe("R13.03.C · API /api/academy/journey", () => {
  const path = "src/app/api/academy/journey/route.ts"
  const src = read(path)

  it("Arquivo existe e exporta GET", () => {
    expect(has(path)).toBe(true)
    expect(src).toMatch(/export\s+async\s+function\s+GET/)
  })

  it("Usa auth() do NextAuth e retorna 401 para anônimo", () => {
    expect(src).toMatch(/@\/lib\/auth\/config/)
    expect(src).toMatch(/401/)
  })

  it("Usa hasAccess() e getEnrollmentState() do helper R13.01", () => {
    expect(src).toMatch(/hasAccess/)
    expect(src).toMatch(/getEnrollmentState/)
    expect(src).toMatch(/@\/lib\/academy\/enrollment/)
  })

  it("Retorna 403 quando NO_ENROLLMENT ou sem hasAccess", () => {
    expect(src).toMatch(/403/)
    expect(src).toMatch(/NO_ENROLLMENT/)
    expect(src).toMatch(/ACCESS_DENIED/)
  })

  it("Usa computeStudentJourney para agregar", () => {
    expect(src).toMatch(/computeStudentJourney/)
    expect(src).toMatch(/@\/lib\/academy\/journey/)
  })

  it("dynamic = force-dynamic (dados por usuário)", () => {
    expect(src).toMatch(/dynamic\s*=\s*["']force-dynamic["']/)
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.03.D — API GET /api/academy/lessons/[lessonSlug]
// ══════════════════════════════════════════════════════════════════════

describe("R13.03.D · API /api/academy/lessons/[lessonSlug]", () => {
  const path = "src/app/api/academy/lessons/[lessonSlug]/route.ts"
  const src = read(path)

  it("Arquivo existe e exporta GET", () => {
    expect(has(path)).toBe(true)
    expect(src).toMatch(/export\s+async\s+function\s+GET/)
  })

  it("Exige moduleSlug via query string (400 se ausente)", () => {
    expect(src).toMatch(/moduleSlug/)
    expect(src).toMatch(/MISSING_MODULE_SLUG|400/)
  })

  it("Retorna 404 se aula não existe OU não publicada (decisão #7)", () => {
    expect(src).toMatch(/404/)
    expect(src).toMatch(/NOT_PUBLISHED|isPublished/)
  })

  it("Upsert idempotente do progresso (cria NOT_STARTED no primeiro acesso)", () => {
    expect(src).toMatch(/upsert/)
    expect(src).toMatch(/NOT_STARTED/)
  })

  it("Retorna navigation.previous e navigation.next", () => {
    expect(src).toMatch(/findPreviousLesson/)
    expect(src).toMatch(/findNextLesson/)
    expect(src).toMatch(/navigation/)
  })

  it("Compatível Next.js 15 (params pode ser Promise)", () => {
    expect(src).toMatch(/params\s+instanceof\s+Promise/)
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.03.E — API PATCH /api/academy/progress
// ══════════════════════════════════════════════════════════════════════

describe("R13.03.E · API /api/academy/progress", () => {
  const path = "src/app/api/academy/progress/route.ts"
  const src = read(path)

  it("Arquivo existe e exporta PATCH", () => {
    expect(has(path)).toBe(true)
    expect(src).toMatch(/export\s+async\s+function\s+PATCH/)
  })

  it("Valida body com Zod (lessonId obrigatório)", () => {
    expect(src).toMatch(/from\s+["']zod["']/)
    expect(src).toMatch(/lessonId/)
    expect(src).toMatch(/safeParse/)
  })

  it("Aceita status COMPLETED / IN_PROGRESS / NOT_STARTED (enum Zod)", () => {
    expect(src).toMatch(/COMPLETED[\s\S]{0,80}IN_PROGRESS|IN_PROGRESS[\s\S]{0,80}COMPLETED/)
  })

  it("Deriva completedAt=now quando status=COMPLETED", () => {
    expect(src).toMatch(/completedAt/)
    expect(src).toMatch(/COMPLETED[\s\S]{0,100}new\s+Date|new\s+Date[\s\S]{0,100}COMPLETED/)
  })

  it("Deriva completedAt=null quando status=NOT_STARTED", () => {
    expect(src).toMatch(/NOT_STARTED[\s\S]{0,80}null/)
  })

  it("Retorna 404 se aula não existe OU não publicada", () => {
    expect(src).toMatch(/LESSON_NOT_FOUND|LESSON_NOT_PUBLISHED|404/)
  })

  it("Marca enrollment.completedAt quando todas aulas ficam COMPLETED", () => {
    expect(src).toMatch(/enrollmentJustCompleted/)
    expect(src).toMatch(/completedLessons\s*===\s*[a-zA-Z_.]+totalLessons|totalLessons/)
  })

  it("Usa hasAccess() do R13.01", () => {
    expect(src).toMatch(/hasAccess/)
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.03.F — Layout /academy/(app)/layout.tsx (route group protegido)
// ══════════════════════════════════════════════════════════════════════

describe("R13.03.F · Layout /academy/(app)", () => {
  const path = "src/app/academy/(app)/layout.tsx"
  const src = read(path)

  it("Arquivo existe e é server component (sem 'use client')", () => {
    expect(has(path)).toBe(true)
    expect(src).not.toMatch(/^["']use client["']/m)
  })

  it("Anônimo → redirect /auth/login com callbackUrl=/academy/dashboard", () => {
    expect(src).toMatch(/redirect\(["']\/auth\/login\?callbackUrl=\/academy\/dashboard["']\)/)
  })

  it("Sem matrícula OU EXPIRED → redirect /academy/welcome (decisão #4: Opção B)", () => {
    expect(src).toMatch(/hasAccess/)
    expect(src).toMatch(/redirect\(["']\/academy\/welcome["']\)/)
  })

  it("Usa AcademySidebar (decisão #1: sidebar próprio)", () => {
    expect(src).toMatch(/AcademySidebar/)
    expect(src).toMatch(/@\/components\/academy\/AcademySidebar/)
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.03.G — Página /academy/dashboard (5 cards)
// ══════════════════════════════════════════════════════════════════════

describe("R13.03.G · Página /academy/dashboard", () => {
  const path = "src/app/academy/(app)/dashboard/page.tsx"
  const src = read(path)

  it("Arquivo existe e é server component", () => {
    expect(has(path)).toBe(true)
    expect(src).not.toMatch(/^["']use client["']/m)
  })

  it("Tem 5 cards com testIds", () => {
    expect(src).toContain("dashboard-card-continue")
    expect(src).toContain("dashboard-card-progress")
    expect(src).toContain("dashboard-card-live")
    expect(src).toContain("dashboard-card-updates")
    expect(src).toContain("dashboard-card-journey")
  })

  it("Card \"Continue de onde parou\" linka para módulo/aula do continueFrom", () => {
    expect(src).toMatch(/continueFrom/)
    expect(src).toMatch(/\/academy\/modules\/\$\{[^}]+\}\/\$\{[^}]+\}/)
  })

  it("Card de progresso mostra %, aulas completadas/total e dias restantes", () => {
    expect(src).toMatch(/overallPercent/)
    expect(src).toMatch(/daysRemaining/)
    expect(src).toMatch(/completedLessons/)
    expect(src).toMatch(/totalLessons/)
  })

  it("Card de encontro busca AcademyLiveEvent futuro mais próximo", () => {
    expect(src).toMatch(/academyLiveEvent/)
    expect(src).toMatch(/scheduledAt/)
    expect(src).toMatch(/gte:\s*new\s+Date/)
  })

  it("Card de feed busca últimas 3 AcademyUpdates publicadas", () => {
    expect(src).toMatch(/academyUpdate/)
    expect(src).toMatch(/take:\s*3/)
    expect(src).toMatch(/isPublished:\s*true/)
  })

  it("Chama computeStudentJourney para agregar", () => {
    expect(src).toMatch(/computeStudentJourney/)
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.03.H — Página /academy/journey (12 módulos + selos)
// ══════════════════════════════════════════════════════════════════════

describe("R13.03.H · Página /academy/journey", () => {
  const path = "src/app/academy/(app)/journey/page.tsx"
  const src = read(path)

  it("Arquivo existe e é server component", () => {
    expect(has(path)).toBe(true)
    expect(src).not.toMatch(/^["']use client["']/m)
  })

  it("Mostra badge \"Concluído\" quando módulo isCompleted (decisão #6)", () => {
    expect(src).toMatch(/isCompleted/)
    expect(src).toMatch(/completed-badge|Concluído/)
  })

  it("Mostra badge \"Em breve\" para módulos não publicados (decisão #7)", () => {
    expect(src).toMatch(/locked-badge|Em breve/)
  })

  it("Aulas LOCKED aparecem na lista mas sem link (não somem)", () => {
    expect(src).toMatch(/status\s*!==?\s*["']LOCKED["']/)
    expect(src).toMatch(/-locked/)
  })

  it("Renderiza barra de progresso por módulo", () => {
    expect(src).toMatch(/percent/)
    expect(src).toMatch(/width:\s*`\$\{[^}]*percent[^}]*\}%`/)
  })

  it("Links de aula usam formato /academy/modules/[modSlug]/[lessonSlug]", () => {
    expect(src).toMatch(/\/academy\/modules\/\$\{[^}]+\}\/\$\{[^}]+\}/)
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.03.I — Página /academy/modules/[moduleSlug]
// ══════════════════════════════════════════════════════════════════════

describe("R13.03.I · Página /academy/modules/[moduleSlug]", () => {
  const path = "src/app/academy/(app)/modules/[moduleSlug]/page.tsx"
  const src = read(path)

  it("Arquivo existe e é server component", () => {
    expect(has(path)).toBe(true)
    expect(src).not.toMatch(/^["']use client["']/m)
  })

  it("Chama notFound() se módulo não existe ou não publicado (decisão #7)", () => {
    expect(src).toMatch(/notFound\(\)/)
    expect(src).toMatch(/isPublished/)
  })

  it("Compatível Next.js 15 (params pode ser Promise)", () => {
    expect(src).toMatch(/params\s+instanceof\s+Promise/)
  })

  it("Lista aulas com testId module-lesson-N", () => {
    expect(src).toMatch(/module-lesson-\$\{[^}]+\}/)
  })

  it("Aulas LOCKED têm testId com sufixo -locked", () => {
    expect(src).toMatch(/-locked/)
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.03.J — Página /academy/modules/[moduleSlug]/[lessonSlug]
// ══════════════════════════════════════════════════════════════════════

describe("R13.03.J · Página de aula (server + LessonView client)", () => {
  const pagePath = "src/app/academy/(app)/modules/[moduleSlug]/[lessonSlug]/page.tsx"
  const viewPath = "src/app/academy/(app)/modules/[moduleSlug]/[lessonSlug]/_components/LessonView.tsx"
  const pageSrc = read(pagePath)
  const viewSrc = read(viewPath)

  it("Ambos os arquivos existem", () => {
    expect(has(pagePath)).toBe(true)
    expect(has(viewPath)).toBe(true)
  })

  it("Page é server component, LessonView é client component", () => {
    expect(pageSrc).not.toMatch(/^["']use client["']/m)
    expect(viewSrc).toMatch(/^["']use client["']/m)
  })

  it("Page chama notFound() se aula OU módulo não publicado", () => {
    expect(pageSrc).toMatch(/notFound\(\)/)
    expect(pageSrc).toMatch(/isPublished/)
  })

  it("LessonView renderiza iframe YouTube (decisão #3)", () => {
    expect(viewSrc).toMatch(/<iframe/)
    expect(viewSrc).toMatch(/youtube\.com\/embed/)
  })

  it("LessonView tem botão \"Marcar como concluída\" (decisão #3)", () => {
    expect(viewSrc).toContain("lesson-mark-complete")
    expect(viewSrc).toMatch(/Marcar como concluída/)
  })

  it("LessonView faz PATCH /api/academy/progress com status=COMPLETED", () => {
    expect(viewSrc).toContain("/api/academy/progress")
    expect(viewSrc).toMatch(/status:\s*["']COMPLETED["']|status:\s*newStatus/)
  })

  it("LessonView tem botão biaHook que abre BIA em NOVA aba (decisão #5)", () => {
    expect(viewSrc).toContain("lesson-bia-hook-button")
    expect(viewSrc).toMatch(/target=["']_blank["']/)
    expect(viewSrc).toMatch(/rel=["']noopener\s+noreferrer["']/)
  })

  it("biaHook constrói URL /dashboard/{tool}?params...&from=academy", () => {
    expect(viewSrc).toMatch(/\/dashboard\/\$\{[^}]*tool[^}]*\}/)
    expect(viewSrc).toMatch(/from=academy|["']from["']/)
  })

  it("LessonView tracka lesson_opened, lesson_completed e bia_hook_opened", () => {
    expect(viewSrc).toContain("lesson_opened")
    expect(viewSrc).toContain("lesson_completed")
    expect(viewSrc).toContain("bia_hook_opened")
  })

  it("LessonView renderiza attachments com ícones por tipo (PDF/LINK/STL/GCODE/IMAGE)", () => {
    expect(viewSrc).toMatch(/PDF/)
    expect(viewSrc).toMatch(/LINK/)
    expect(viewSrc).toMatch(/STL/)
    expect(viewSrc).toMatch(/GCODE/)
    expect(viewSrc).toMatch(/IMAGE/)
    expect(viewSrc).toContain("lesson-attachment-")
  })

  it("LessonView tem prev/next navigation com testIds", () => {
    expect(viewSrc).toContain("lesson-nav-previous")
    expect(viewSrc).toContain("lesson-nav-next")
  })

  it("LessonView renderiza card de quiz \"em breve\" quando hasQuiz=true", () => {
    expect(viewSrc).toContain("lesson-quiz-card")
    expect(viewSrc).toMatch(/hasQuiz/)
  })

  it("Analytics usa keepalive: true + .catch fire-and-forget", () => {
    expect(viewSrc).toMatch(/keepalive:\s*true/)
    expect(viewSrc).toMatch(/\.catch\(/)
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.03.K — Onboarding pós-completed → /academy/dashboard
// ══════════════════════════════════════════════════════════════════════

describe("R13.03.K · Redirect onboarding para /academy/dashboard", () => {
  it("WelcomeForm redireciona para /academy/dashboard após sucesso", () => {
    const src = read("src/app/academy/welcome/_components/WelcomeForm.tsx")
    expect(src).toContain("/academy/dashboard")
    expect(src).not.toMatch(/\/dashboard\/notebook\?from=academy-welcome/)
  })

  it("welcome/page.tsx redireciona already-answered para /academy/dashboard", () => {
    const src = read("src/app/academy/welcome/page.tsx")
    expect(src).toContain("/academy/dashboard")
    expect(src).not.toMatch(/redirect\(["']\/dashboard\/notebook/)
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.03.L — Sanidade geral (integração entre camadas)
// ══════════════════════════════════════════════════════════════════════

describe("R13.03.L · Sanidade global", () => {
  it("Helper journey.ts existe e exporta todas as funções", () => {
    const src = read("src/lib/academy/journey.ts")
    expect(src).toMatch(/export\s+function\s+computeStudentJourney/)
    expect(src).toMatch(/export\s+function\s+findLessonInJourney/)
    expect(src).toMatch(/export\s+function\s+findNextLesson/)
    expect(src).toMatch(/export\s+function\s+findPreviousLesson/)
  })

  it("Route group (app) isola rotas logadas da landing pública /academy", () => {
    // landing pública fica em /academy/page.tsx (fora do (app))
    expect(has("src/app/academy/page.tsx")).toBe(true)
    // dashboard fica DENTRO de (app)
    expect(has("src/app/academy/(app)/dashboard/page.tsx")).toBe(true)
    // layout da area logada é distinto
    expect(has("src/app/academy/(app)/layout.tsx")).toBe(true)
  })

  it("APIs seguem padrão dynamic=force-dynamic (dados por usuário)", () => {
    const files = [
      "src/app/api/academy/journey/route.ts",
      "src/app/api/academy/lessons/[lessonSlug]/route.ts",
      "src/app/api/academy/progress/route.ts",
    ]
    for (const f of files) {
      const src = read(f)
      expect(src, `${f}`).toMatch(/dynamic\s*=\s*["']force-dynamic["']/)
    }
  })

  it("Todos os arquivos R13.03 têm cabeçalho JSDoc com R13.03", () => {
    const files = [
      "src/lib/academy/journey.ts",
      "src/components/academy/AcademySidebar.tsx",
      "src/app/api/academy/journey/route.ts",
      "src/app/api/academy/lessons/[lessonSlug]/route.ts",
      "src/app/api/academy/progress/route.ts",
      "src/app/academy/(app)/layout.tsx",
      "src/app/academy/(app)/dashboard/page.tsx",
      "src/app/academy/(app)/journey/page.tsx",
      "src/app/academy/(app)/modules/[moduleSlug]/page.tsx",
      "src/app/academy/(app)/modules/[moduleSlug]/[lessonSlug]/page.tsx",
      "src/app/academy/(app)/modules/[moduleSlug]/[lessonSlug]/_components/LessonView.tsx",
    ]
    for (const f of files) {
      const src = read(f)
      expect(src, `${f} sem tag R13.03`).toMatch(/R13\.03/)
    }
  })
})
