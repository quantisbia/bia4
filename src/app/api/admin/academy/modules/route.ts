/**
 * BIA · Academy · Admin API — CRUD de módulos (R13.10.1)
 *
 * Endpoints:
 *   GET    /api/admin/academy/modules       → lista todos (publicados + drafts)
 *   POST   /api/admin/academy/modules       → cria módulo novo (draft por padrão)
 *
 * Autorização: SUPERADMIN + role ADMIN + role INSTRUCTOR (opção B do R13.10.1).
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAcademyAdmin } from "@/lib/academy/admin-auth"
import { z } from "zod"

export const dynamic = "force-dynamic"

// ─── GET ─────────────────────────────────────────────────────────
export async function GET() {
  const auth = await requireAcademyAdmin()
  if (!auth.ok) return auth.response

  const modules = await prisma.academyModule.findMany({
    orderBy: { order: "asc" },
    include: {
      _count: {
        select: { lessons: true },
      },
      lessons: {
        select: {
          id: true,
          slug: true,
          order: true,
          title: true,
          isPublished: true,
        },
        orderBy: { order: "asc" },
      },
    },
  })

  // Conta publicadas vs total para cada módulo
  const enriched = modules.map(m => {
    const published = m.lessons.filter(l => l.isPublished).length
    return {
      id: m.id,
      slug: m.slug,
      order: m.order,
      title: m.title,
      description: m.description,
      coverImage: m.coverImage,
      isPublished: m.isPublished,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      lessons: m.lessons,
      lessonCounts: {
        total: m._count.lessons,
        published,
        draft: m._count.lessons - published,
      },
    }
  })

  return NextResponse.json({ modules: enriched })
}

// ─── POST ────────────────────────────────────────────────────────
const CreateModuleSchema = z.object({
  slug: z.string()
    .min(2, "Slug muito curto")
    .max(80, "Slug muito longo")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug deve ser kebab-case (letras minúsculas, números e hífens)"),
  order: z.number().int().min(1).max(99),
  title: z.string().min(3).max(120),
  description: z.string().max(2000).optional(),
  coverImage: z.string().url().optional().nullable(),
  isPublished: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  const auth = await requireAcademyAdmin()
  if (!auth.ok) return auth.response

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 })
  }

  const parsed = CreateModuleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const { slug, order, title, description, coverImage, isPublished } = parsed.data

  // Verifica se slug já existe
  const existing = await prisma.academyModule.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json(
      { error: "SLUG_EXISTS", message: `Já existe um módulo com slug "${slug}".` },
      { status: 409 },
    )
  }

  const created = await prisma.academyModule.create({
    data: {
      slug,
      order,
      title,
      description: description ?? null,
      coverImage: coverImage ?? null,
      isPublished,
    },
  })

  return NextResponse.json({ module: created }, { status: 201 })
}
