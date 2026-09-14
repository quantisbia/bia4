/**
 * BIA · Academy · Admin — Editar aula (R13.10.1)
 */
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/db/prisma"
import { checkAcademyAdminOrRedirect } from "@/lib/academy/admin-auth"
import { buildYoutubeThumbnailUrl } from "@/lib/academy/youtube"
import { ChevronLeft, ExternalLink } from "lucide-react"
import { LessonEditForm } from "./_components/LessonEditForm"
import { AttachmentsManager } from "./_components/AttachmentsManager"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ moduleSlug: string; lessonSlug: string }> | { moduleSlug: string; lessonSlug: string }
}

export default async function AdminLessonPage({ params }: PageProps) {
  const redirectTo = await checkAcademyAdminOrRedirect()
  if (redirectTo) redirect(redirectTo)

  const resolved = params instanceof Promise ? await params : params
  const { moduleSlug, lessonSlug } = resolved

  const mod = await prisma.academyModule.findUnique({
    where: { slug: moduleSlug },
    include: {
      lessons: {
        where: { slug: lessonSlug },
        include: {
          attachments: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  })
  if (!mod || mod.lessons.length === 0) notFound()

  const lesson = mod.lessons[0]
  const thumb = buildYoutubeThumbnailUrl(lesson.youtubeId)

  const biaHookObj = (lesson.biaHook as { tool?: string; label?: string; params?: Record<string, unknown> } | null) ?? null

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8" data-testid="admin-lesson-edit-root">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
        <Link href="/dashboard/admin" className="hover:text-fuchsia-300">Admin</Link>
        <span className="text-gray-700">/</span>
        <Link href="/dashboard/admin/academy" className="hover:text-fuchsia-300">Academy</Link>
        <span className="text-gray-700">/</span>
        <Link href={`/dashboard/admin/academy/${mod.slug}`} className="hover:text-fuchsia-300 flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" />
          M{mod.order.toString().padStart(2, "0")}
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-400 truncate max-w-[200px]">{lesson.title}</span>
      </nav>

      {/* Header + preview */}
      <header className="grid md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-2 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-300/80">
            Aula {mod.order}.{lesson.order} · M{mod.order.toString().padStart(2, "0")} {mod.title}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{lesson.title}</h1>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
              lesson.isPublished
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : "bg-white/[0.06] text-gray-500 border-white/[0.08]"
            }`}>
              {lesson.isPublished ? "Publicada" : "Rascunho"}
            </span>
            <span>YouTube ID: <code className="text-gray-400">{lesson.youtubeId}</code></span>
            {lesson.isPublished && (
              <Link
                href={`/academy/modules/${mod.slug}/${lesson.slug}`}
                target="_blank"
                className="text-fuchsia-300 hover:text-fuchsia-200 flex items-center gap-1"
              >
                Ver como aluno <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>

        {/* Thumbnail YT */}
        {thumb && !lesson.youtubeId.startsWith("PLACEHOLDER") && (
          <a
            href={`https://youtu.be/${lesson.youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block aspect-video rounded-xl overflow-hidden border border-white/10 hover:border-fuchsia-500/40 transition-all group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumb}
              alt={`Thumbnail: ${lesson.title}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-semibold flex items-center gap-1">
                Abrir no YouTube <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          </a>
        )}
      </header>

      {/* Form de edição */}
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
        <h2 className="text-sm font-bold text-white mb-4">📝 Dados da aula</h2>
        <LessonEditForm
          lesson={{
            id: lesson.id,
            slug: lesson.slug,
            order: lesson.order,
            title: lesson.title,
            youtubeId: lesson.youtubeId,
            objective: lesson.objective,
            summary: lesson.summary,
            durationMin: lesson.durationMin,
            level: lesson.level,
            biaHook: biaHookObj,
            isPublished: lesson.isPublished,
          }}
          moduleSlug={mod.slug}
        />
      </section>

      {/* Anexos */}
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
        <h2 className="text-sm font-bold text-white mb-4">
          📎 Anexos ({lesson.attachments.length})
        </h2>
        <AttachmentsManager
          lessonId={lesson.id}
          attachments={lesson.attachments.map(a => ({
            id: a.id,
            kind: a.kind,
            title: a.title,
            url: a.url,
            sizeBytes: a.sizeBytes,
          }))}
        />
      </section>
    </div>
  )
}
