/**
 * BIA · Academy · API da Jornada do aluno — R13.03
 *
 * GET /api/academy/journey → agrega tudo o que o aluno precisa para
 * renderizar /academy/dashboard e /academy/journey em UMA chamada:
 *   - 12 módulos (com aulas + isPublished)
 *   - Progresso individual por aula (status + watchedSeconds)
 *   - % por módulo + % global
 *   - continueFrom + nextRecommendedLesson
 *   - Dias restantes de acesso (helper R13.01)
 *
 * Ownership: exige session.user.id + matrícula com hasAccess=true.
 * Retorna 401 se anônimo, 403 se sem matrícula ativa ou EXPIRED.
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import {
  hasAccess,
  getEnrollmentState,
  daysRemaining,
} from "@/lib/academy/enrollment"
import { computeStudentJourney } from "@/lib/academy/journey"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  // 1) Busca matrícula do aluno
  const enrollment = await prisma.academyEnrollment.findUnique({
    where: { userId: session.user.id },
  })

  if (!enrollment) {
    return NextResponse.json(
      { error: "NO_ENROLLMENT", state: "NO_ENROLLMENT" },
      { status: 403 },
    )
  }

  const state = getEnrollmentState(enrollment)
  if (!hasAccess(enrollment)) {
    return NextResponse.json(
      { error: "ACCESS_DENIED", state },
      { status: 403 },
    )
  }

  // 2) Busca módulos + aulas (todos, publicados e não — a journey marca como LOCKED)
  const modules = await prisma.academyModule.findMany({
    orderBy: { order: "asc" },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          slug: true,
          order: true,
          title: true,
          durationMin: true,
          level: true,
          isPublished: true,
          moduleId: true,
        },
      },
    },
  })

  // 3) Busca progresso do aluno
  const progress = await prisma.academyProgress.findMany({
    where: { enrollmentId: enrollment.id },
    select: {
      lessonId: true,
      status: true,
      watchedSeconds: true,
      completedAt: true,
      biaHookOpened: true,
      updatedAt: true,
    },
  })

  // 4) Agrega tudo com o helper puro
  const journey = computeStudentJourney(modules, progress)

  // 5) Metadados de matrícula
  return NextResponse.json({
    enrollment: {
      id: enrollment.id,
      state,
      enrolledAt: enrollment.enrolledAt,
      accessUntil: enrollment.accessUntil,
      completedAt: enrollment.completedAt,
      daysRemaining: daysRemaining(enrollment),
    },
    journey,
  })
}
