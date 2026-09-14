/**
 * BIA · Academy · Admin API — Módulo individual (R13.10.1)
 *
 * PATCH  /api/admin/academy/modules/[moduleId]   → atualiza campos
 * DELETE /api/admin/academy/modules/[moduleId]   → apaga (só se sem aulas)
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAcademyAdmin } from "@/lib/academy/admin-auth"
import { z } from "zod"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ moduleId: string }> | { moduleId: string }
}

// ─── PATCH ───────────────────────────────────────────────────────
const UpdateModuleSchema = z.object({
  slug: z.string().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  order: z.number().int().min(1).max(99).optional(),
  title: z.string().min(3).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  coverImage: z.string().url().nullable().optional(),
  isPublished: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const auth = await requireAcademyAdmin()
  if (!auth.ok) return auth.response

  const params = ctx.params instanceof Promise ? await ctx.params : ctx.params
  const { moduleId } = params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 })
  }

  const parsed = UpdateModuleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", issues: parsed.error.issues },
      { status: 400 },
    )
  }

  // Confirma que módulo existe
  const existing = await prisma.academyModule.findUnique({
    where: { id: moduleId },
    select: { id: true, slug: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
  }

  // Se está mudando slug, checa conflito
  if (parsed.data.slug && parsed.data.slug !== existing.slug) {
    const conflict = await prisma.academyModule.findUnique({
      where: { slug: parsed.data.slug },
      select: { id: true },
    })
    if (conflict) {
      return NextResponse.json(
        { error: "SLUG_EXISTS", message: `Já existe um módulo com slug "${parsed.data.slug}".` },
        { status: 409 },
      )
    }
  }

  const updated = await prisma.academyModule.update({
    where: { id: moduleId },
    data: parsed.data,
  })

  return NextResponse.json({ module: updated })
}

// ─── DELETE ──────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const auth = await requireAcademyAdmin()
  if (!auth.ok) return auth.response

  const params = ctx.params instanceof Promise ? await ctx.params : ctx.params
  const { moduleId } = params

  // Confirma existência e conta aulas
  const mod = await prisma.academyModule.findUnique({
    where: { id: moduleId },
    include: { _count: { select: { lessons: true } } },
  })
  if (!mod) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })

  if (mod._count.lessons > 0) {
    return NextResponse.json(
      {
        error: "HAS_LESSONS",
        message: `Não é possível apagar: o módulo ainda tem ${mod._count.lessons} aula(s). Delete as aulas primeiro OU despublique o módulo (isPublished=false).`,
      },
      { status: 409 },
    )
  }

  await prisma.academyModule.delete({ where: { id: moduleId } })
  return NextResponse.json({ ok: true, deletedId: moduleId })
}
