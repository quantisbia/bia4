/**
 * BIA · Academy · Página de aula — R13.03
 *
 * Server component que carrega toda a data da aula (título, objetivo,
 * resumo, youtubeId, anexos, quiz?, biaHook?, progress do aluno, prev/next
 * pointers) e delega para o LessonView (client component) que renderiza
 * o iframe + botões interativos.
 *
 * Regras (decisões travadas R13.03):
 *  - #3: <iframe> YouTube simples + botão manual "Marcar como concluída"
 *  - #4: sem enrollment/expirada → redirect /academy/welcome (Opção B)
 *  - #5: biaHook abre BIA em NOVA aba com params na query string
 *  - #7: aula com isPublished=false → 404
 *
 * Faz upsert idempotente do AcademyProgress em NOT_STARTED no primeiro acesso.
 */
import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { computeStudentJourney, findNextLesson, findPreviousLesson } from "@/lib/academy/journey"
import { LessonView } from "./_components/LessonView"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ moduleSlug: string; lessonSlug: string }> | { moduleSlug: string; lessonSlug: string }
}

export default async function AcademyLessonPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const resolved = params instanceof Promise ? await params : params
  const { moduleSlug, lessonSlug } = resolved

  const enrollment = await prisma.academyEnrollment.findUnique({
    where: { userId: session.user.id },
  })
  if (!enrollment) redirect("/academy/welcome")

  // Módulo + aula com todos os includes que a UI precisa
  const mod = await prisma.academyModule.findUnique({
    where: { slug: moduleSlug },
    include: {
      lessons: {
        where: { slug: lessonSlug },
        include: {
          attachments: { orderBy: { createdAt: "asc" } },
          quiz: { select: { id: true, passingScore: true } },
        },
      },
    },
  })

  if (!mod || mod.lessons.length === 0) notFound()

  const lesson = mod.lessons[0]

  // Gate de publicação — decisão #7
  if (!lesson.isPublished || !mod.isPublished) notFound()

  // Upsert idempotente do progresso (cria em NOT_STARTED no primeiro acesso)
  const progress = await prisma.academyProgress.upsert({
    where: {
      enrollmentId_lessonId: {
        enrollmentId: enrollment.id,
        lessonId: lesson.id,
      },
    },
    create: {
      enrollmentId: enrollment.id,
      lessonId: lesson.id,
      status: "NOT_STARTED",
    },
    update: {},
  })

  // Prev/next pointers (usa journey completa pra saber próximo módulo se acabar)
  const [modules, allProgress] = await Promise.all([
    prisma.academyModule.findMany({
      orderBy: { order: "asc" },
      include: {
        lessons: {
          orderBy: { order: "asc" },
          select: {
            id: true, slug: true, order: true, title: true,
            durationMin: true, level: true, isPublished: true, moduleId: true,
          },
        },
      },
    }),
    prisma.academyProgress.findMany({
      where: { enrollmentId: enrollment.id },
      select: {
        lessonId: true, status: true, watchedSeconds: true,
        completedAt: true, biaHookOpened: true, updatedAt: true,
      },
    }),
  ])
  const journey = computeStudentJourney(modules, allProgress)
  const previousLesson = findPreviousLesson(journey, lesson.id)
  const nextLesson = findNextLesson(journey, lesson.id)

  return (
    <LessonView
      lesson={{
        id: lesson.id,
        slug: lesson.slug,
        order: lesson.order,
        title: lesson.title,
        objective: lesson.objective,
        summary: lesson.summary,
        youtubeId: lesson.youtubeId,
        durationMin: lesson.durationMin,
        level: lesson.level,
        biaHook: lesson.biaHook as { tool: string; label: string; params?: Record<string, unknown> } | null,
        attachments: lesson.attachments.map(a => ({
          id: a.id,
          kind: a.kind,
          title: a.title,
          url: a.url,
        })),
        hasQuiz: !!lesson.quiz,
        quizPassingScore: lesson.quiz?.passingScore ?? null,
      }}
      module={{
        id: mod.id,
        slug: mod.slug,
        order: mod.order,
        title: mod.title,
      }}
      progress={{
        status: progress.status,
        watchedSeconds: progress.watchedSeconds,
        biaHookOpened: progress.biaHookOpened,
        completedAt: progress.completedAt?.toISOString() ?? null,
      }}
      navigation={{
        previous: previousLesson
          ? { moduleSlug: previousLesson.moduleSlug, lessonSlug: previousLesson.slug, title: previousLesson.title }
          : null,
        next: nextLesson
          ? { moduleSlug: nextLesson.moduleSlug, lessonSlug: nextLesson.slug, title: nextLesson.title }
          : null,
      }}
    />
  )
}
