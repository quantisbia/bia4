/**
 * BIA · Academy · R28 — Download autenticado de PDF da aula
 *
 * GET /api/academy/files/[fileId]            → inline (abre no navegador)
 * GET /api/academy/files/[fileId]?download=1 → attachment
 *
 * Autorização (mesmo racional de /api/library/download):
 *   1. sessão NextAuth obrigatória
 *   2. admin (superadmin/ADMIN/INSTRUCTOR) sempre pode
 *   3. aluno: matrícula ativa (hasAccess) E aula publicada
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { hasAccess } from "@/lib/academy/enrollment"
import { isSuperAdmin } from "@/lib/auth/admin-shared"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest, { params }: { params: { fileId: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL(`/auth/login?callbackUrl=${encodeURIComponent(req.nextUrl.pathname)}`, req.url))
  }
  const role = (session.user as { role?: string }).role ?? "USER"
  const admin = isSuperAdmin(session.user.email) || role === "ADMIN" || role === "INSTRUCTOR"

  const meta = await prisma.academyFile.findUnique({
    where: { id: params.fileId },
    select: { id: true, title: true, fileName: true, mimeType: true, sizeBytes: true, ready: true, lesson: { select: { isPublished: true, module: { select: { isPublished: true } } } } },
  })
  if (!meta || !meta.ready) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })

  if (!admin) {
    const enrollment = await prisma.academyEnrollment.findUnique({ where: { userId: session.user.id }, select: { accessUntil: true, completedAt: true } })
    if (!enrollment || !hasAccess(enrollment)) return NextResponse.redirect(new URL("/academy/welcome", req.url))
    if (!meta.lesson.isPublished || !meta.lesson.module.isPublished) return NextResponse.json({ error: "NOT_PUBLISHED" }, { status: 403 })
  }

  const row = await prisma.academyFile.findUnique({ where: { id: params.fileId }, select: { data: true } })
  if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
  const body = new Uint8Array(row.data)
  const dl = req.nextUrl.searchParams.get("download") === "1"
  const safeName = meta.fileName.replace(/["\r\n]/g, "")
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": meta.mimeType || "application/pdf",
      "Content-Length": String(body.byteLength),
      "Content-Disposition": `${dl ? "attachment" : "inline"}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
