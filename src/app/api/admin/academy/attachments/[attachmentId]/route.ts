/**
 * BIA · Academy · Admin API — Apagar anexo (R13.10.1)
 *
 * DELETE /api/admin/academy/attachments/[attachmentId]
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAcademyAdmin } from "@/lib/academy/admin-auth"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ attachmentId: string }> | { attachmentId: string }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const auth = await requireAcademyAdmin()
  if (!auth.ok) return auth.response

  const params = ctx.params instanceof Promise ? await ctx.params : ctx.params
  const { attachmentId } = params

  const existing = await prisma.academyAttachment.findUnique({
    where: { id: attachmentId },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })

  await prisma.academyAttachment.delete({ where: { id: attachmentId } })
  return NextResponse.json({ ok: true, deletedId: attachmentId })
}
