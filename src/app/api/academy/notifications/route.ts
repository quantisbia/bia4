/**
 * BIA · Academy · R28 — Notificações do aluno (sininho)
 *
 * GET   /api/academy/notifications           → { items, unread, notifyEmail }
 * PATCH /api/academy/notifications
 *   { markRead: string[] | "all" }           → marca como lidas
 *   { notifyEmail: boolean }                 → liga/desliga e-mail de material novo
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { hasAccess } from "@/lib/academy/enrollment"
import { listForStudent, markRead } from "@/lib/academy/notifications"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

async function enrollmentOf(userId: string) {
  const e = await prisma.academyEnrollment.findUnique({ where: { userId }, select: { id: true, accessUntil: true, completedAt: true, notifyEmail: true } })
  return e && hasAccess(e) ? e : null
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  const e = await enrollmentOf(session.user.id)
  if (!e) return NextResponse.json({ items: [], unread: 0, notifyEmail: true, enrolled: false })
  const r = await listForStudent(e.id, 30)
  return NextResponse.json({ ...r, notifyEmail: e.notifyEmail, enrolled: true })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  const e = await enrollmentOf(session.user.id)
  if (!e) return NextResponse.json({ error: "NO_ENROLLMENT" }, { status: 403 })
  const body = (await req.json().catch(() => ({}))) as { markRead?: string[] | "all"; notifyEmail?: boolean }
  const out: Record<string, unknown> = {}
  if (body.markRead) out.marked = await markRead(e.id, body.markRead)
  if (typeof body.notifyEmail === "boolean") {
    await prisma.academyEnrollment.update({ where: { id: e.id }, data: { notifyEmail: body.notifyEmail } })
    out.notifyEmail = body.notifyEmail
  }
  return NextResponse.json({ ok: true, ...out })
}
