/**
 * BIA · Academy · API de aula individual — R13.03
 *
 * GET /api/academy/lessons/[lessonSlug]?moduleSlug=xxx
 *   → retorna dados da aula (title, youtubeId, objective, summary,
 *     attachments, quiz? , biaHook?) + progresso do aluno + pointers
 *     de aula anterior/próxima
 *
 * Ownership: exige session.user.id + hasAccess=true.
 *   - 401 anônimo
 *   - 403 sem matrícula ou expirada
 *   - 404 se aula não existe OU não está publicada
 *
 * Cria automaticamente um registro AcademyProgress em NOT_STARTED se
 * o aluno abre a aula pela primeira vez (upsert idempotente).
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { hasAccess, getEnrollmentState } from "@/lib/academy/enrollment"
import {
  computeStudentJourney,
  findNextLesson,
  findPreviousLesson,
} from "@/lib/academy/journey"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ lessonSlug: string }> | { lessonSlug: string }
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  const params = ctx.params instanceof Promise ? await ctx.params : ctx.params
  const { lessonSlug } = params
  const moduleSlug = req.nextUrl.searchParams.get("moduleSlug")

  if (!moduleSlug) {
    return NextResponse.json(
      { error: "MISSING_MODULE_SLUG", message: "Query string 'moduleSlug' é obrigatória." },
      { status: 400 },
    )
  }

  // 1) Matrícula
  const enrollment = await prisma.academyEnrollment.findUnique({
    where: { userId: session.user.id },
  })
  if (!enrollment) {
    return NextResponse.json(
      { error: "NO_ENROLLMENT", state: "NO_ENROLLMENT" },
      { status: 403 },
    )
  }
  if (!hasAccess(enrollment)) {
    return NextResponse.json(
      { error: "ACCESS_DENIED", state: getEnrollmentState(enrollment) },
      { status: 403 },
    )
  }

  // 2) Busca a aula (via módulo + slug)
  const mod = await prisma.academyModule.findUnique({
    where: { slug: moduleSlug },
    include: {
      lessons: {
        where: { slug: lessonSlug },
        include: {
          attachments: {
            orderBy: { createdAt: "asc" },
          },
          quiz: {
            include: {
              questions: {
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
    },
  })

  if (!mod || mod.lessons.length === 0) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Aula não encontrada." },
      { status: 404 },
    )
  }

  const lesson = mod.lessons[0]

  // 3) Gate de publicação (decisão #7: aula não publicada = 404 se acessar direto)
  if (!lesson.isPublished || !mod.isPublished) {
    return NextResponse.json(
      { error: "NOT_PUBLISHED", message: "Esta aula ainda não foi publicada." },
      { status: 404 },
    )
  }

  // 4) Upsert idempotente do progresso — cria em NOT_STARTED no primeiro acesso
  //    (sem sobrescrever status/watchedSeconds já existentes)
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
    update: {}, // idempotente — não mexe se já existe
  })

  // 5) Calcula prev/next dentro da journey completa
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

  // 6) Response
  return NextResponse.json({
    lesson: {
      id: lesson.id,
      slug: lesson.slug,
      order: lesson.order,
      title: lesson.title,
      objective: lesson.objective,
      summary: lesson.summary,
      youtubeId: lesson.youtubeId,
      durationMin: lesson.durationMin,
      level: lesson.level,
      biaHook: lesson.biaHook,
      attachments: lesson.attachments,
      quiz: lesson.quiz,
    },
    module: {
      id: mod.id,
      slug: mod.slug,
      order: mod.order,
      title: mod.title,
      description: mod.description,
    },
    progress: {
      status: progress.status,
      watchedSeconds: progress.watchedSeconds,
      quizScore: progress.quizScore,
      biaHookOpened: progress.biaHookOpened,
      completedAt: progress.completedAt,
      updatedAt: progress.updatedAt,
    },
    navigation: {
      previous: previousLesson
        ? { moduleSlug: previousLesson.moduleSlug, lessonSlug: previousLesson.slug, title: previousLesson.title }
        : null,
      next: nextLesson
        ? { moduleSlug: nextLesson.moduleSlug, lessonSlug: nextLesson.slug, title: nextLesson.title }
        : null,
    },
  })
}
