/**
 * BIA · Academy · R28 — Notificações do aluno (lista completa + preferência de e-mail)
 */
import { Bell } from "lucide-react"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { listForStudent } from "@/lib/academy/notifications"
import { NotificationsList } from "./_components/NotificationsList"

export const dynamic = "force-dynamic"

export default async function AcademyNotificationsPage() {
  const session = await auth()
  const enrollment = session?.user?.id
    ? await prisma.academyEnrollment.findUnique({ where: { userId: session.user.id }, select: { id: true, notifyEmail: true } })
    : null
  const data = enrollment ? await listForStudent(enrollment.id, 100) : { items: [], unread: 0 }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300/80">BIA Academy</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2"><Bell className="w-6 h-6 text-cyan-300" /> Notificações</h1>
        <p className="text-sm text-gray-400 mt-1">Material novo, aulas publicadas e avisos da equipe. Você escolhe se quer receber também por e-mail.</p>
      </header>
      <NotificationsList initialItems={data.items} initialUnread={data.unread} initialNotifyEmail={enrollment?.notifyEmail ?? true} />
    </div>
  )
}
