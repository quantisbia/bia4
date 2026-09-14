/**
 * BIA · Academy · API de progresso — R13.03
 *
 * PATCH /api/academy/progress
 *   Body: { lessonId, status?, watchedSeconds?, biaHookOpened?, quizScore? }
 *   → atualiza o progresso do aluno em uma aula
 *   → derivação automática de completedAt quando status vira COMPLETED
 *   → derivação automática de completedAt=null quando volta pra NOT_STARTED
 *
 * Nesta sprint (R13.03) o único caminho para status=COMPLETED é o botão
 * manual "Marcar como concluída" na página de aula (decisão #3).
 * O R13.04 vai adicionar tracking automático de watchedSeconds via YT IFrame API.
 *
 * Também atualiza AcademyEnrollment.completedAt automaticamente se o aluno
 * concluir a última aula publicada de todos os módulos (não emite certificado
 * ainda — isso fica para R13.09).
 *
 * Ownership: exige session.user.id + hasAccess=true + a aula existe.
 * Retorna 401/403/404 nos casos apropriados.
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { hasAccess, getEnrollmentState } from "@/lib/academy/enrollment"
import { computeStudentJourney } from "@/lib/academy/journey"
import { z } from "zod"

export const dynamic = "force-dynamic"

const PatchBody = z.object({
  lessonId: z.string().min(1),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]).optional(),
  watchedSeconds: z.number().int().min(0).optional(),
  biaHookOpened: z.boolean().optional(),
  quizScore: z.number().int().min(0).max(100).optional(),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 })
  }

  const parsed = PatchBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", issues: parsed.error.issues },
      { status: 400 },
    )
  }
  const { lessonId, status, watchedSeconds, biaHookOpened, quizScore } = parsed.data

  // Matrícula
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

  // Confere se a aula existe e está publicada
  const lesson = await prisma.academyLesson.findUnique({
    where: { id: lessonId },
    include: { module: true },
  })
  if (!lesson) {
    return NextResponse.json({ error: "LESSON_NOT_FOUND" }, { status: 404 })
  }
  if (!lesson.isPublished || !lesson.module.isPublished) {
    return NextResponse.json({ error: "LESSON_NOT_PUBLISHED" }, { status: 404 })
  }

  // Deriva completedAt automaticamente com base em status
  const now = new Date()
  const completedAt =
    status === "COMPLETED" ? now
    : status === "NOT_STARTED" ? null
    : undefined // se status não veio ou é IN_PROGRESS, deixa como está

  // Upsert do progresso
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
      status: status ?? "IN_PROGRESS",
      watchedSeconds: watchedSeconds ?? 0,
      biaHookOpened: biaHookOpened ?? false,
      quizScore: quizScore ?? null,
      completedAt: status === "COMPLETED" ? now : null,
    },
    update: {
      ...(status !== undefined ? { status } : {}),
      ...(watchedSeconds !== undefined ? { watchedSeconds } : {}),
      ...(biaHookOpened !== undefined ? { biaHookOpened } : {}),
      ...(quizScore !== undefined ? { quizScore } : {}),
      ...(completedAt !== undefined ? { completedAt } : {}),
    },
  })

  // Se marcou como COMPLETED, checa se o aluno acabou de completar TODAS as
  // aulas publicadas → atualiza enrollment.completedAt (marcador de conclusão)
  let enrollmentJustCompleted = false
  if (status === "COMPLETED" && !enrollment.completedAt) {
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
    if (journey.totalLessons > 0 && journey.completedLessons === journey.totalLessons) {
      await prisma.academyEnrollment.update({
        where: { id: enrollment.id },
        data: { completedAt: now },
      })
      enrollmentJustCompleted = true
    }
  }

  return NextResponse.json({
    progress: {
      status: progress.status,
      watchedSeconds: progress.watchedSeconds,
      biaHookOpened: progress.biaHookOpened,
      quizScore: progress.quizScore,
      completedAt: progress.completedAt,
      updatedAt: progress.updatedAt,
    },
    enrollmentJustCompleted,
  })
}
