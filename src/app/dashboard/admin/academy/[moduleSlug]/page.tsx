/**
 * BIA · Academy · Admin — Editar módulo + lista de aulas (R13.10.1)
 */
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/db/prisma"
import { checkAcademyAdminOrRedirect } from "@/lib/academy/admin-auth"
import { ChevronLeft, ArrowRight, Video, CheckCircle2, Circle, Plus } from "lucide-react"
import { ModuleEditForm } from "./_components/ModuleEditForm"
import { NewLessonForm } from "./_components/NewLessonForm"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ moduleSlug: string }> | { moduleSlug: string }
}

const LEVEL_LABEL: Record<string, string> = {
  basic: "Básico",
  intermediate: "Intermediário",
  advanced: "Avançado",
}

export default async function AdminModulePage({ params }: PageProps) {
  const redirectTo = await checkAcademyAdminOrRedirect()
  if (redirectTo) redirect(redirectTo)

  const resolved = params instanceof Promise ? await params : params
  const { moduleSlug } = resolved

  const mod = await prisma.academyModule.findUnique({
    where: { slug: moduleSlug },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        include: {
          _count: { select: { attachments: true } },
          quiz: { select: { id: true } },
        },
      },
    },
  })

  if (!mod) notFound()

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8" data-testid="admin-module-edit-root">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
        <Link href="/dashboard/admin" className="hover:text-fuchsia-300">Admin</Link>
        <span className="text-gray-700">/</span>
        <Link href="/dashboard/admin/academy" className="hover:text-fuchsia-300 flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" />
          Academy
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-400">M{mod.order.toString().padStart(2, "0")} · {mod.title}</span>
      </nav>

      {/* Header */}
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-300/80">
          Módulo {mod.order}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">{mod.title}</h1>
      </header>

      {/* Form de edição do módulo */}
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
        <h2 className="text-sm font-bold text-white mb-4">📝 Editar módulo</h2>
        <ModuleEditForm
          moduleData={{
            id: mod.id,
            slug: mod.slug,
            order: mod.order,
            title: mod.title,
            description: mod.description,
            isPublished: mod.isPublished,
            coverImage: mod.coverImage,
          }}
        />
      </section>

      {/* Lista de aulas */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">
            📼 Aulas ({mod.lessons.length})
          </h2>
        </div>

        {mod.lessons.length === 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-8 text-center">
            <Video className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-1">Nenhuma aula neste módulo ainda.</p>
            <p className="text-xs text-gray-600">Use o formulário abaixo para criar a primeira.</p>
          </div>
        )}

        {mod.lessons.length > 0 && (
          <ul className="space-y-2" data-testid="admin-module-lessons-list">
            {mod.lessons.map(lesson => (
              <li key={lesson.id}>
                <Link
                  href={`/dashboard/admin/academy/${mod.slug}/${lesson.slug}`}
                  data-testid={`admin-lesson-${lesson.order}`}
                  className={`group flex items-center gap-3 rounded-xl border p-3 transition-all ${
                    lesson.isPublished
                      ? "border-emerald-500/20 bg-emerald-500/[0.03] hover:border-emerald-500/40"
                      : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    lesson.isPublished
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : "bg-white/[0.06] text-gray-500 border border-white/[0.08]"
                  }`}>
                    {lesson.order}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white truncate">{lesson.title}</p>
                      {lesson.isPublished ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 shrink-0">
                          ● publicada
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 shrink-0">
                          ● rascunho
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-500">
                      <span>{lesson.durationMin} min</span>
                      <span>·</span>
                      <span>{LEVEL_LABEL[lesson.level] ?? lesson.level}</span>
                      <span>·</span>
                      <span>YT: <code className="text-gray-600">{lesson.youtubeId.substring(0, 11)}</code></span>
                      {lesson._count.attachments > 0 && (
                        <>
                          <span>·</span>
                          <span>{lesson._count.attachments} anexo(s)</span>
                        </>
                      )}
                      {lesson.quiz && (
                        <>
                          <span>·</span>
                          <span className="text-fuchsia-400">quiz ✓</span>
                        </>
                      )}
                    </div>
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-fuchsia-300 group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Form de nova aula */}
      <section className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/[0.03] p-6">
        <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-fuchsia-300" />
          Nova aula neste módulo
        </h2>
        <NewLessonForm
          moduleId={mod.id}
          moduleSlug={mod.slug}
          nextOrder={mod.lessons.length + 1}
        />
      </section>
    </div>
  )
}
