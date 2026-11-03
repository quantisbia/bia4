/**
 * BIA · Academy · R29 · Quiz da aula
 *
 *   GET  /api/academy/quiz/[lessonId]  → { passingScore, questions: [{id, order, prompt, options}], lastScore, bestScore }
 *        (sem gabarito)
 *   POST /api/academy/quiz/[lessonId]  body { answers: { [questionId]: number } }
 *        → corrige no servidor, grava quizScore (mantém o MELHOR) em AcademyProgress,
 *          devolve { score, correct, total, passed, passingScore, items[] }
 *
 * Acesso: aluno com matrícula ativa (hasAccess) e aula/módulo publicados; admin/instrutor sempre.
 */
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { hasAccess } from "@/lib/academy/enrollment"
import { isSuperAdmin } from "@/lib/auth/admin-shared"
import { gradeQuiz, parseOptions, toPublic, type QuizQuestionFull } from "@/lib/academy/quiz"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type RouteParams = { params: { lessonId: string } }

async function loadContext(lessonId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }) }
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true, role: true } })
  if (!user) return { error: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }) }
  const admin = isSuperAdmin(user.email) || user.role === "ADMIN" || user.role === "INSTRUCTOR"

  const enrollment = await prisma.academyEnrollment.findUnique({ where: { userId: user.id } })
  if (!admin && (!enrollment || !hasAccess(enrollment))) {
    return { error: NextResponse.json({ error: "ACCESS_DENIED" }, { status: 403 }) }
  }

  const lesson = await prisma.academyLesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true, isPublished: true, module: { select: { isPublished: true } },
      quiz: { select: { id: true, passingScore: true, questions: { orderBy: { order: "asc" }, select: { id: true, order: true, prompt: true, options: true, correctIndex: true, explanation: true } } } },
    },
  })
  if (!lesson || !lesson.quiz) return { error: NextResponse.json({ error: "QUIZ_NOT_FOUND" }, { status: 404 }) }
  if (!admin && (!lesson.isPublished || !lesson.module.isPublished)) return { error: NextResponse.json({ error: "LESSON_NOT_PUBLISHED" }, { status: 404 }) }

  const questions: QuizQuestionFull[] = lesson.quiz.questions.map((q) => ({
    id: q.id, order: q.order, prompt: q.prompt, options: parseOptions(q.options), correctIndex: q.correctIndex, explanation: q.explanation,
  }))
  return { user, admin, enrollment, lessonId: lesson.id, passingScore: lesson.quiz.passingScore, questions }
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const ctx = await loadContext(params.lessonId)
  if ("error" in ctx) return ctx.error
  const progress = ctx.enrollment
    ? await prisma.academyProgress.findUnique({ where: { enrollmentId_lessonId: { enrollmentId: ctx.enrollment.id, lessonId: ctx.lessonId } }, select: { quizScore: true } })
    : null
  return NextResponse.json({
    passingScore: ctx.passingScore,
    total: ctx.questions.length,
    questions: ctx.questions.map(toPublic),
    bestScore: progress?.quizScore ?? null,
  })
}

const PostBody = z.object({
  answers: z.record(z.string(), z.number().int().min(0).max(10).nullable()),
})

export async function POST(req: NextRequest, { params }: RouteParams) {
  const ctx = await loadContext(params.lessonId)
  if ("error" in ctx) return ctx.error

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 }) }
  const parsed = PostBody.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION", issues: parsed.error.issues }, { status: 400 })

  const grade = gradeQuiz(ctx.questions, parsed.data.answers, ctx.passingScore)

  // grava o melhor resultado (admin sem matrícula: só corrige, não grava)
  let bestScore = grade.score
  if (ctx.enrollment) {
    const key = { enrollmentId: ctx.enrollment.id, lessonId: ctx.lessonId }
    const prev = await prisma.academyProgress.findUnique({ where: { enrollmentId_lessonId: key }, select: { quizScore: true, status: true } })
    bestScore = Math.max(prev?.quizScore ?? 0, grade.score)
    await prisma.academyProgress.upsert({
      where: { enrollmentId_lessonId: key },
      create: { ...key, status: "IN_PROGRESS", quizScore: grade.score },
      update: { quizScore: bestScore, ...(prev?.status === "NOT_STARTED" ? { status: "IN_PROGRESS" } : {}) },
    })
  }

  return NextResponse.json({ ...grade, bestScore })
}
