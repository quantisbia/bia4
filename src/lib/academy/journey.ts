/**
 * BIA · Academy · Journey helpers — R13.03
 *
 * Encapsula toda a lógica de agregação da "Minha Jornada" do aluno:
 *  - Junta AcademyModule + AcademyLesson + AcademyProgress
 *  - Calcula % por módulo e % global
 *  - Determina "continueFrom" (última aula IN_PROGRESS) com fallback determinístico
 *    para a próxima aula não concluída (ou primeira aula publicada se ninguém foi tocado)
 *  - Determina "nextRecommendedLesson" — próxima aula publicada não concluída
 *  - Marca módulos como completos quando 100% das aulas publicadas estão COMPLETED
 *
 * Funções puras (sem I/O) — recebem Prisma objects já carregados.
 * Isso torna todos os cálculos testáveis sem tocar no banco.
 *
 * Decisões travadas (R13.03):
 *  - #2: continueFrom = último IN_PROGRESS por updatedAt DESC, com fallback
 *        para a Aula 1 do Módulo 1 se o aluno nunca tocou em nada
 *  - #6: módulo ganha selo "Concluído" quando TODAS as suas aulas publicadas
 *        estão COMPLETED (não conta aulas não publicadas)
 *  - #7: aulas com isPublished=false aparecem na lista COM cadeado (não somem)
 */

import type {
  AcademyLesson,
  AcademyModule,
  AcademyProgress,
} from "@prisma/client"

// ─── Tipos derivados ──────────────────────────────────────────────

export type LessonStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "LOCKED"

export interface LessonWithStatus {
  id: string
  slug: string
  order: number
  title: string
  durationMin: number
  level: string
  isPublished: boolean
  moduleId: string
  moduleSlug: string
  moduleTitle: string
  moduleOrder: number
  status: LessonStatus
  watchedSeconds: number
  completedAt: Date | null
  biaHookOpened: boolean
  updatedAt: Date | null
}

export interface ModuleWithProgress {
  id: string
  slug: string
  order: number
  title: string
  description: string | null
  coverImage: string | null
  isPublished: boolean
  lessons: LessonWithStatus[]
  totalLessons: number     // total de aulas publicadas
  completedLessons: number // aulas publicadas em status COMPLETED
  percent: number          // 0..100 (só considera publicadas)
  isCompleted: boolean     // 100% das aulas publicadas concluídas (e tem >= 1 aula)
}

export interface StudentJourney {
  modules: ModuleWithProgress[]
  totalLessons: number      // total geral de aulas publicadas
  completedLessons: number  // total geral de aulas concluídas
  overallPercent: number    // 0..100
  continueFrom: LessonWithStatus | null    // próximo lugar natural (IN_PROGRESS ou fallback)
  nextRecommendedLesson: LessonWithStatus | null // próxima aula não concluída em ordem
}

// ─── Input types (Prisma include) ────────────────────────────────

type LessonInput = Pick<
  AcademyLesson,
  "id" | "slug" | "order" | "title" | "durationMin" | "level" | "isPublished" | "moduleId"
>

type ModuleInput = Pick<
  AcademyModule,
  "id" | "slug" | "order" | "title" | "description" | "coverImage" | "isPublished"
> & { lessons: LessonInput[] }

type ProgressInput = Pick<
  AcademyProgress,
  "lessonId" | "status" | "watchedSeconds" | "completedAt" | "biaHookOpened" | "updatedAt"
>

// ─── Helpers internos ────────────────────────────────────────────

function normalizeStatus(raw: string | undefined | null, isPublished: boolean): LessonStatus {
  if (!isPublished) return "LOCKED"
  if (raw === "COMPLETED") return "COMPLETED"
  if (raw === "IN_PROGRESS") return "IN_PROGRESS"
  return "NOT_STARTED"
}

// ─── Função principal ────────────────────────────────────────────

/**
 * Agrega módulos + aulas + progresso do aluno em uma estrutura pronta
 * para renderização das páginas /academy/dashboard, /academy/journey
 * e /academy/modules.
 *
 * Regras:
 *  - Ordena módulos por `order` ASC
 *  - Ordena aulas de cada módulo por `order` ASC
 *  - Aulas com `isPublished=false` recebem status="LOCKED" (não contam no %)
 *  - `overallPercent` só considera aulas publicadas
 *  - `continueFrom`: pega a última aula IN_PROGRESS (updatedAt DESC).
 *    Se não houver nenhuma, faz fallback para nextRecommendedLesson.
 *  - `nextRecommendedLesson`: primeira aula publicada em status
 *    NOT_STARTED ou IN_PROGRESS, seguindo a ordem
 *    módulo.order → aula.order. Se todas estão COMPLETED, retorna null.
 */
export function computeStudentJourney(
  modules: ModuleInput[],
  progress: ProgressInput[],
  now: Date = new Date(),
): StudentJourney {
  // Index de progresso por lessonId
  const progressByLesson = new Map<string, ProgressInput>()
  for (const p of progress) progressByLesson.set(p.lessonId, p)

  // Ordena módulos e aulas
  const sortedModules = [...modules].sort((a, b) => a.order - b.order)

  const modulesWithProgress: ModuleWithProgress[] = sortedModules.map(m => {
    const sortedLessons = [...m.lessons].sort((a, b) => a.order - b.order)

    const lessons: LessonWithStatus[] = sortedLessons.map(l => {
      const p = progressByLesson.get(l.id)
      const status = normalizeStatus(p?.status, l.isPublished)
      return {
        id: l.id,
        slug: l.slug,
        order: l.order,
        title: l.title,
        durationMin: l.durationMin,
        level: l.level,
        isPublished: l.isPublished,
        moduleId: m.id,
        moduleSlug: m.slug,
        moduleTitle: m.title,
        moduleOrder: m.order,
        status,
        watchedSeconds: p?.watchedSeconds ?? 0,
        completedAt: p?.completedAt ?? null,
        biaHookOpened: p?.biaHookOpened ?? false,
        updatedAt: p?.updatedAt ?? null,
      }
    })

    const published = lessons.filter(l => l.isPublished)
    const completed = published.filter(l => l.status === "COMPLETED").length
    const total = published.length
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100)
    const isCompleted = total > 0 && completed === total

    return {
      id: m.id,
      slug: m.slug,
      order: m.order,
      title: m.title,
      description: m.description,
      coverImage: m.coverImage,
      isPublished: m.isPublished,
      lessons,
      totalLessons: total,
      completedLessons: completed,
      percent,
      isCompleted,
    }
  })

  // Totais globais (só publicadas)
  let totalLessons = 0
  let completedLessons = 0
  for (const m of modulesWithProgress) {
    totalLessons += m.totalLessons
    completedLessons += m.completedLessons
  }
  const overallPercent = totalLessons === 0
    ? 0
    : Math.round((completedLessons / totalLessons) * 100)

  // Flatten para achar continueFrom + nextRecommendedLesson
  const allPublishedLessons: LessonWithStatus[] = []
  for (const m of modulesWithProgress) {
    if (!m.isPublished) continue
    for (const l of m.lessons) {
      if (l.isPublished) allPublishedLessons.push(l)
    }
  }

  // nextRecommendedLesson = primeira aula publicada em NOT_STARTED ou IN_PROGRESS
  // seguindo a ordem módulo→aula
  const nextRecommendedLesson =
    allPublishedLessons.find(l => l.status !== "COMPLETED") ?? null

  // continueFrom:
  //  1. Se tem aula IN_PROGRESS: pega a mais recente (updatedAt DESC)
  //  2. Fallback: usa nextRecommendedLesson (que pode ser aula 1 do módulo 1 em primeiro acesso)
  const inProgressLessons = allPublishedLessons
    .filter(l => l.status === "IN_PROGRESS" && l.updatedAt)
    .sort((a, b) => (b.updatedAt!.getTime()) - (a.updatedAt!.getTime()))

  const continueFrom = inProgressLessons[0] ?? nextRecommendedLesson

  // now não é usado hoje mas fica reservado para features de "última visita há X dias"
  void now

  return {
    modules: modulesWithProgress,
    totalLessons,
    completedLessons,
    overallPercent,
    continueFrom,
    nextRecommendedLesson,
  }
}

// ─── Sub-helpers de conveniência ─────────────────────────────────

/**
 * Encontra uma aula pela combinação (moduleSlug, lessonSlug) dentro da journey.
 * Retorna null se não encontrar OU se a aula não estiver publicada.
 * (Aulas não publicadas devem retornar 404 quando acessadas diretamente.)
 */
export function findLessonInJourney(
  journey: StudentJourney,
  moduleSlug: string,
  lessonSlug: string,
): LessonWithStatus | null {
  const mod = journey.modules.find(m => m.slug === moduleSlug)
  if (!mod) return null
  const lesson = mod.lessons.find(l => l.slug === lessonSlug)
  if (!lesson) return null
  if (!lesson.isPublished) return null
  return lesson
}

/**
 * Retorna a próxima aula publicada dentro de um módulo (ou da journey inteira
 * se acabar o módulo) — útil para o botão "Próxima aula" na página de aula.
 */
export function findNextLesson(
  journey: StudentJourney,
  currentLessonId: string,
): LessonWithStatus | null {
  const flat: LessonWithStatus[] = []
  for (const m of journey.modules) {
    if (!m.isPublished) continue
    for (const l of m.lessons) if (l.isPublished) flat.push(l)
  }
  const idx = flat.findIndex(l => l.id === currentLessonId)
  if (idx < 0 || idx >= flat.length - 1) return null
  return flat[idx + 1]
}

/**
 * Retorna a aula anterior publicada — útil para o botão "Aula anterior".
 */
export function findPreviousLesson(
  journey: StudentJourney,
  currentLessonId: string,
): LessonWithStatus | null {
  const flat: LessonWithStatus[] = []
  for (const m of journey.modules) {
    if (!m.isPublished) continue
    for (const l of m.lessons) if (l.isPublished) flat.push(l)
  }
  const idx = flat.findIndex(l => l.id === currentLessonId)
  if (idx <= 0) return null
  return flat[idx - 1]
}
