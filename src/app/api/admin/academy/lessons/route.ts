/**
 * BIA · Academy · Admin API — Criar aula (R13.10.1)
 *
 * POST /api/admin/academy/lessons  → cria aula nova em um módulo
 *
 * Body:
 *   {
 *     moduleId: string,
 *     slug: string (kebab-case),
 *     order: number,
 *     title: string,
 *     youtubeInput: string  (URL completa OU ID puro OU placeholder),
 *     objective?: string (markdown),
 *     summary?: string (markdown),
 *     durationMin?: number,
 *     level?: "basic" | "intermediate" | "advanced",
 *     biaHook?: { tool: string, label: string, params?: object },
 *     isPublished?: boolean
 *   }
 *
 * O `youtubeInput` aceita várias formas (extractYoutubeId cuida).
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAcademyAdmin } from "@/lib/academy/admin-auth"
import { extractYoutubeId } from "@/lib/academy/youtube"
import { z } from "zod"

export const dynamic = "force-dynamic"

const BiaHookSchema = z.object({
  tool: z.string().min(1).max(80),
  label: z.string().min(1).max(200),
  params: z.record(z.unknown()).optional(),
}).nullable().optional()

const CreateLessonSchema = z.object({
  moduleId: z.string().min(1),
  slug: z.string()
    .min(2, "Slug muito curto")
    .max(80, "Slug muito longo")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug deve ser kebab-case"),
  order: z.number().int().min(1).max(99),
  title: z.string().min(3).max(200),
  youtubeInput: z.string().min(1, "Cole a URL do YouTube ou o ID do vídeo"),
  objective: z.string().max(5000).optional().nullable(),
  summary: z.string().max(20000).optional().nullable(),
  durationMin: z.number().int().min(0).max(600).default(0),
  level: z.enum(["basic", "intermediate", "advanced"]).default("intermediate"),
  biaHook: BiaHookSchema,
  isPublished: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  const auth = await requireAcademyAdmin()
  if (!auth.ok) return auth.response

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 })
  }

  const parsed = CreateLessonSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const {
    moduleId, slug, order, title, youtubeInput,
    objective, summary, durationMin, level, biaHook, isPublished,
  } = parsed.data

  // Extrai video ID
  const youtubeId = extractYoutubeId(youtubeInput)
  if (!youtubeId) {
    return NextResponse.json(
      {
        error: "INVALID_YOUTUBE",
        message: "Não consegui extrair o ID do vídeo do YouTube. Cole a URL completa (ex: https://youtu.be/dQw4w9WgXcQ) ou o ID de 11 caracteres.",
      },
      { status: 400 },
    )
  }

  // Confirma que módulo existe
  const mod = await prisma.academyModule.findUnique({
    where: { id: moduleId },
    select: { id: true, slug: true },
  })
  if (!mod) {
    return NextResponse.json({ error: "MODULE_NOT_FOUND" }, { status: 404 })
  }

  // Confere unicidade de slug DENTRO do módulo
  const conflict = await prisma.academyLesson.findFirst({
    where: { moduleId, slug },
    select: { id: true },
  })
  if (conflict) {
    return NextResponse.json(
      { error: "SLUG_EXISTS_IN_MODULE", message: `Já existe uma aula com slug "${slug}" neste módulo.` },
      { status: 409 },
    )
  }

  // Persiste (biaHook como Json)
  const created = await prisma.academyLesson.create({
    data: {
      moduleId,
      slug,
      order,
      title,
      youtubeId,
      objective: objective ?? null,
      summary: summary ?? null,
      durationMin,
      level,
      biaHook: biaHook ?? undefined,
      isPublished,
      publishedAt: isPublished ? new Date() : null,
    },
  })

  return NextResponse.json({ lesson: created }, { status: 201 })
}
