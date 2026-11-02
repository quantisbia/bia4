/**
 * BIA · Academy · Admin · R28 — Avisos para os alunos
 *
 * GET  /api/admin/academy/notifications            → histórico (últimos 50) + nº de alunos ativos
 * POST /api/admin/academy/notifications
 *   { kind: NEW_MATERIAL|NEW_LESSON|ANNOUNCEMENT, title, body, lessonId?, url?,
 *     sendEmail?: boolean (default true), onlyEmails?: string[] (teste) }
 *   → grava o aviso (sininho de todos) e envia e-mail (Resend) a quem aceita.
 */
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db/prisma"
import { requireAcademyAdmin } from "@/lib/academy/admin-auth"
import { createNotification, listActiveStudents } from "@/lib/academy/notifications"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60

const Schema = z.object({
  kind: z.enum(["NEW_MATERIAL", "NEW_LESSON", "ANNOUNCEMENT"]),
  title: z.string().min(3).max(140),
  body: z.string().min(3).max(2000),
  lessonId: z.string().min(1).nullable().optional(),
  url: z.string().max(500).nullable().optional(),
  sendEmail: z.boolean().optional(),
  onlyEmails: z.array(z.string().email()).max(20).optional(),
})

export async function GET() {
  const auth = await requireAcademyAdmin()
  if (!auth.ok) return auth.response
  const [items, students] = await Promise.all([
    prisma.academyNotification.findMany({
      orderBy: { createdAt: "desc" }, take: 50,
      include: { lesson: { select: { title: true, module: { select: { title: true } } } }, _count: { select: { reads: true } } },
    }),
    listActiveStudents(),
  ])
  return NextResponse.json({
    notifications: items.map((n) => ({
      id: n.id, kind: n.kind, title: n.title, body: n.body, url: n.url, createdAt: n.createdAt,
      lesson: n.lesson ? `${n.lesson.module.title} · ${n.lesson.title}` : null,
      emailSent: n.emailSent, emailFailed: n.emailFailed, emailSkipped: n.emailSkipped, emailedAt: n.emailedAt, reads: n._count.reads,
    })),
    students: { total: students.length, withEmail: students.filter((s) => s.notifyEmail).length },
    emailConfigured: !!process.env.RESEND_API_KEY,
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAcademyAdmin()
  if (!auth.ok) return auth.response
  const parsed = Schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION", issues: parsed.error.issues }, { status: 400 })
  const r = await createNotification({ ...parsed.data, sentById: auth.userId })
  return NextResponse.json({ result: r }, { status: 201 })
}
