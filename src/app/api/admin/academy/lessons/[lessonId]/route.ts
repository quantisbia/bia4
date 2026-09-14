/**
 * BIA · Academy · Admin API — Aula individual (R13.10.1)
 *
 * PATCH  /api/admin/academy/lessons/[lessonId]  → atualiza campos
 * DELETE /api/admin/academy/lessons/[lessonId]  → apaga aula (+ anexos/quiz por cascade)
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAcademyAdmin } from "@/lib/academy/admin-auth"
import { extractYoutubeId } from "@/lib/academy/youtube"
import { z } from "zod"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ lessonId: string }> | { lessonId: string }
}

const BiaHookSchema = z.object({
  tool: z.string().min(1).max(80),
  label: z.string().min(1).max(200),
  params: z.record(z.unknown()).optional(),
}).nullable().optional()

const UpdateLessonSchema = z.object({
  slug: z.string().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  order: z.number().int().min(1).max(99).optional(),
  title: z.string().min(3).max(200).optional(),
  youtubeInput: z.string().min(1).optional(),
  objective: z.string().max(5000).nullable().optional(),
  summary: z.string().max(20000).nullable().optional(),
  durationMin: z.number().int().min(0).max(600).optional(),
  level: z.enum(["basic", "intermediate", "advanced"]).optional(),
  biaHook: BiaHookSchema,
  isPublished: z.boolean().optional(),
})

// ─── PATCH ───────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const auth = await requireAcademyAdmin()
  if (!auth.ok) return auth.response

  const params = ctx.params instanceof Promise ? await ctx.params : ctx.params
  const { lessonId } = params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 })
  }

  const parsed = UpdateLessonSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const existing = await prisma.academyLesson.findUnique({
    where: { id: lessonId },
    select: { id: true, moduleId: true, slug: true, isPublished: true, publishedAt: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
  }

  // Build data object
  const data: Record<string, unknown> = {}

  // Slug: se está mudando, checar conflito no mesmo módulo
  if (parsed.data.slug && parsed.data.slug !== existing.slug) {
    const conflict = await prisma.academyLesson.findFirst({
      where: { moduleId: existing.moduleId, slug: parsed.data.slug },
      select: { id: true },
    })
    if (conflict) {
      return NextResponse.json(
        { error: "SLUG_EXISTS_IN_MODULE" },
        { status: 409 },
      )
    }
    data.slug = parsed.data.slug
  }

  // YouTube: extract se veio
  if (parsed.data.youtubeInput !== undefined) {
    const extracted = extractYoutubeId(parsed.data.youtubeInput)
    if (!extracted) {
      return NextResponse.json(
        { error: "INVALID_YOUTUBE", message: "URL/ID do YouTube inválido." },
        { status: 400 },
      )
    }
    data.youtubeId = extracted
  }

  // Passthrough simples
  const passthroughKeys = ["order", "title", "objective", "summary", "durationMin", "level"] as const
  for (const k of passthroughKeys) {
    if (parsed.data[k] !== undefined) data[k] = parsed.data[k]
  }

  // biaHook (nullable → aceitar limpar)
  if (parsed.data.biaHook !== undefined) {
    data.biaHook = parsed.data.biaHook ?? null
  }

  // isPublished: gerenciar publishedAt automaticamente
  if (parsed.data.isPublished !== undefined) {
    data.isPublished = parsed.data.isPublished
    if (parsed.data.isPublished && !existing.isPublished) {
      // Publicando pela primeira vez
      data.publishedAt = new Date()
    } else if (!parsed.data.isPublished && existing.isPublished) {
      // Despublicando — mantém publishedAt histórico (não zera)
      // (caso quisesse zerar: data.publishedAt = null)
    }
  }

  const updated = await prisma.academyLesson.update({
    where: { id: lessonId },
    data,
  })

  return NextResponse.json({ lesson: updated })
}

// ─── DELETE ──────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const auth = await requireAcademyAdmin()
  if (!auth.ok) return auth.response

  const params = ctx.params instanceof Promise ? await ctx.params : ctx.params
  const { lessonId } = params

  const lesson = await prisma.academyLesson.findUnique({
    where: { id: lessonId },
    select: { id: true, isPublished: true, title: true },
  })
  if (!lesson) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })

  // Regra de segurança: não deixa apagar aula publicada acidentalmente
  // (aluno pode ter progresso vinculado). Precisa despublicar primeiro.
  if (lesson.isPublished) {
    return NextResponse.json(
      {
        error: "PUBLISHED_LESSON",
        message: `A aula "${lesson.title}" está publicada. Despublique (isPublished=false) antes de apagar — evita quebrar progresso de alunos.`,
      },
      { status: 409 },
    )
  }

  // Cascade delete via schema (attachments, quiz, progress)
  await prisma.academyLesson.delete({ where: { id: lessonId } })

  return NextResponse.json({ ok: true, deletedId: lessonId })
}
