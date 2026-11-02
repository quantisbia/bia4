/**
 * BIA · Academy · Admin · R28 — Avisos para a turma
 * /dashboard/admin/academy/notifications?lessonId=…&kind=NEW_MATERIAL
 */
import Link from "next/link"
import { redirect } from "next/navigation"
import { Bell, ChevronLeft } from "lucide-react"
import { prisma } from "@/lib/db/prisma"
import { checkAcademyAdminOrRedirect } from "@/lib/academy/admin-auth"
import { NotificationsAdmin } from "./_components/NotificationsAdmin"

export const dynamic = "force-dynamic"

type Kind = "NEW_MATERIAL" | "NEW_LESSON" | "ANNOUNCEMENT"

export default async function AcademyNotificationsAdminPage({ searchParams }: { searchParams: { lessonId?: string; kind?: string } }) {
  const redirectTo = await checkAcademyAdminOrRedirect()
  if (redirectTo) redirect(redirectTo)

  const modules = await prisma.academyModule.findMany({
    orderBy: { order: "asc" },
    include: { lessons: { orderBy: { order: "asc" }, select: { id: true, title: true, slug: true, order: true } } },
  })
  const lessons = modules.flatMap((m) => m.lessons.map((l) => ({ id: l.id, label: `M${m.order} ${m.title} · ${l.title}`, moduleSlug: m.slug, slug: l.slug })))
  const kind = (["NEW_MATERIAL", "NEW_LESSON", "ANNOUNCEMENT"] as Kind[]).includes(searchParams.kind as Kind) ? (searchParams.kind as Kind) : undefined

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <nav className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/dashboard/admin" className="hover:text-fuchsia-300">Admin</Link><span className="text-gray-700">/</span>
        <Link href="/dashboard/admin/academy" className="hover:text-fuchsia-300 flex items-center gap-1"><ChevronLeft className="w-3 h-3" /> Academy</Link><span className="text-gray-700">/</span>
        <span className="text-gray-400">Avisos</span>
      </nav>
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300/80">BIA Academy · Admin</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2"><Bell className="w-6 h-6 text-cyan-300" /> Avisos para a turma</h1>
        <p className="text-sm text-gray-400 mt-1 max-w-2xl">Publique um aviso de material novo, aula publicada ou comunicado. Vai para o sininho de todos os alunos ativos e, se marcado, por e-mail (Resend) com descadastro de 1 clique.</p>
      </header>
      <NotificationsAdmin lessons={lessons} initialLessonId={searchParams.lessonId} initialKind={kind} />
    </div>
  )
}
