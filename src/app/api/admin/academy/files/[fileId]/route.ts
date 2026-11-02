/**
 * BIA · Academy · Admin · R28
 *   PATCH  /api/admin/academy/files/[fileId]  { title }
 *   DELETE /api/admin/academy/files/[fileId]
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAcademyAdmin } from "@/lib/academy/admin-auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Ctx = { params: { fileId: string } }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = await requireAcademyAdmin()
  if (!auth.ok) return auth.response
  const body = (await req.json().catch(() => ({}))) as { title?: string }
  const title = (body.title ?? "").trim()
  if (!title) return NextResponse.json({ error: "MISSING_TITLE" }, { status: 400 })
  const f = await prisma.academyFile.update({ where: { id: params.fileId }, data: { title }, select: { id: true, title: true } }).catch(() => null)
  if (!f) return NextResponse.json({ error: "FILE_NOT_FOUND" }, { status: 404 })
  return NextResponse.json({ file: f })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const auth = await requireAcademyAdmin()
  if (!auth.ok) return auth.response
  const existing = await prisma.academyFile.findUnique({ where: { id: params.fileId }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: "FILE_NOT_FOUND" }, { status: 404 })
  await prisma.academyFile.delete({ where: { id: params.fileId } })
  return NextResponse.json({ ok: true, deletedId: params.fileId })
}
