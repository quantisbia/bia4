/**
 * BIA · Academy · Versão para impressão / PDF da aula — R30
 *
 * GET /academy/modules/[moduleSlug]/[lessonSlug]/print
 *
 * Regras de acesso (iguais à aula):
 *  - anônimo → /auth/login
 *  - sem matrícula ou sem acesso (PENDING/EXPIRED) → /academy/welcome,
 *    exceto admin (role ADMIN ou SUPERADMIN_EMAILS)
 *  - aula/módulo não publicados → 404
 *
 * Renderiza LessonPrintDocument (tudo expandido, capa, sumário) em layout
 * próprio sem sidebar; `?auto=1` dispara window.print() ao carregar.
 */
import { notFound, redirect } from "next/navigation"
import type { Metadata } from "next"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { hasAccess } from "@/lib/academy/enrollment"
import { isSuperAdmin } from "@/lib/auth/admin"
import { LessonPrintDocument } from "@/components/academy/LessonPrintDocument"
import { PrintActions } from "./PrintActions"
import "../../../../print.css"

export const dynamic = "force-dynamic"

type Params = { moduleSlug: string; lessonSlug: string }
type PageProps = {
  params: Promise<Params> | Params
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function AcademyLessonPrintPage({ params, searchParams }: PageProps) {
  const session = await auth()
  const { moduleSlug, lessonSlug } = params instanceof Promise ? await params : params
  const sp = searchParams ? (searchParams instanceof Promise ? await searchParams : searchParams) : {}
  const backHref = `/academy/modules/${moduleSlug}/${lessonSlug}`

  if (!session?.user?.id) redirect(`/auth/login?callbackUrl=${encodeURIComponent(`${backHref}/print`)}`)

  const [user, enrollment] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, email: true, name: true } }),
    prisma.academyEnrollment.findUnique({ where: { userId: session.user.id } }),
  ])
  const isAdmin = user?.role === "ADMIN" || isSuperAdmin(user?.email)
  if (!isAdmin && (!enrollment || !hasAccess(enrollment))) redirect("/academy/welcome")

  const mod = await prisma.academyModule.findUnique({
    where: { slug: moduleSlug },
    select: {
      order: true, title: true, isPublished: true,
      lessons: {
        where: { slug: lessonSlug },
        select: { order: true, title: true, objective: true, summary: true, durationMin: true, level: true, youtubeId: true, isPublished: true },
      },
    },
  })
  if (!mod || mod.lessons.length === 0) notFound()
  const lesson = mod.lessons[0]
  if ((!lesson.isPublished || !mod.isPublished) && !isAdmin) notFound()
  if (!lesson.summary) notFound()

  const auto = sp.auto === "1" || sp.auto === "true"
  const siteUrl = process.env.NEXTAUTH_URL ?? "https://biaquantis.bio"

  return (
    <>
      <PrintActions backHref={backHref} auto={auto} />
      <LessonPrintDocument
        data={{
          module: { order: mod.order, title: mod.title },
          lesson: {
            order: lesson.order, title: lesson.title, objective: lesson.objective,
            summary: lesson.summary, durationMin: lesson.durationMin, level: lesson.level, youtubeId: lesson.youtubeId,
          },
          student: user ? { name: user.name, email: user.email } : null,
          generatedAt: new Date(),
          siteUrl,
        }}
      />
    </>
  )
}
