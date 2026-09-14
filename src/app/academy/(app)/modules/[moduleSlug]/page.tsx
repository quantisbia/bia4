/**
 * BIA · Academy · Página do Módulo — R13.03
 *
 * Lista completa das aulas de UM módulo, com status individual.
 * Se o módulo não existe OU não está publicado, mostra 404.
 * (Aulas individuais com isPublished=false aparecem com cadeado — decisão #7.)
 */
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { computeStudentJourney } from "@/lib/academy/journey"
import {
  ArrowLeft, CheckCircle2, Play, Circle, Lock, ChevronRight, Clock,
  BookOpen, Trophy,
} from "lucide-react"

export const dynamic = "force-dynamic"

const STATUS_MAP: Record<string, {
  icon: typeof Circle
  label: string
  className: string
  bgClassName: string
}> = {
  COMPLETED:   {
    icon: CheckCircle2, label: "Concluída", className: "text-emerald-400",
    bgClassName: "bg-emerald-500/[0.06] border-emerald-500/20",
  },
  IN_PROGRESS: {
    icon: Play, label: "Em andamento", className: "text-fuchsia-400",
    bgClassName: "bg-fuchsia-500/[0.06] border-fuchsia-500/20",
  },
  NOT_STARTED: {
    icon: Circle, label: "Não iniciada", className: "text-gray-500",
    bgClassName: "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.15]",
  },
  LOCKED: {
    icon: Lock, label: "Em breve", className: "text-gray-600",
    bgClassName: "bg-white/[0.01] border-white/[0.04] opacity-60",
  },
}

type PageProps = {
  params: Promise<{ moduleSlug: string }> | { moduleSlug: string }
}

export default async function AcademyModulePage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const resolvedParams = params instanceof Promise ? await params : params
  const { moduleSlug } = resolvedParams

  const enrollment = await prisma.academyEnrollment.findUnique({
    where: { userId: session.user.id },
  })
  if (!enrollment) redirect("/academy/welcome")

  const [modules, progress] = await Promise.all([
    prisma.academyModule.findMany({
      orderBy: { order: "asc" },
      include: {
        lessons: {
          orderBy: { order: "asc" },
          select: {
            id: true, slug: true, order: true, title: true,
            durationMin: true, level: true, isPublished: true, moduleId: true,
          },
        },
      },
    }),
    prisma.academyProgress.findMany({
      where: { enrollmentId: enrollment.id },
      select: {
        lessonId: true, status: true, watchedSeconds: true,
        completedAt: true, biaHookOpened: true, updatedAt: true,
      },
    }),
  ])

  const journey = computeStudentJourney(modules, progress)
  const mod = journey.modules.find(m => m.slug === moduleSlug)

  // 404 se não existe OU não está publicado
  if (!mod || !mod.isPublished) notFound()

  const raw = modules.find(m => m.slug === moduleSlug)

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8" data-testid="academy-module-page-root">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/academy/journey" className="hover:text-fuchsia-300 flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" />
          Minha Jornada
        </Link>
        <ChevronRight className="w-3 h-3 text-gray-700" />
        <span className="text-gray-400">Módulo {mod.order}</span>
      </nav>

      {/* Header do módulo */}
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-300/80">
          Módulo {mod.order} · BIA Academy
        </p>
        <h1 className="text-3xl font-bold text-white">{mod.title}</h1>
        {raw?.description && (
          <p className="text-sm text-gray-400 max-w-2xl">{raw.description}</p>
        )}

        {/* Progresso do módulo */}
        <div className="pt-2 flex items-center gap-4 max-w-lg">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 font-medium">Progresso do módulo</span>
              <span className={`text-xs font-bold ${
                mod.isCompleted ? "text-emerald-300" : "text-fuchsia-300"
              }`}>
                {mod.percent}% · {mod.completedLessons}/{mod.totalLessons}
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  mod.isCompleted
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                    : "bg-gradient-to-r from-violet-500 to-fuchsia-500"
                }`}
                style={{ width: `${mod.percent}%` }}
              />
            </div>
          </div>
          {mod.isCompleted && (
            <span
              data-testid="module-completed-badge"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0"
            >
              <Trophy className="w-3 h-3" />
              Concluído
            </span>
          )}
        </div>
      </header>

      {/* Lista de aulas */}
      <div className="space-y-2" data-testid="module-lessons-list">
        {mod.lessons.length === 0 && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center">
            <BookOpen className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              Nenhuma aula publicada ainda neste módulo.
            </p>
          </div>
        )}

        {mod.lessons.map((lesson, idx) => {
          const map = STATUS_MAP[lesson.status]
          const StatusIcon = map.icon
          const canOpen = lesson.status !== "LOCKED"

          const content = (
            <div className={`group rounded-xl border p-4 flex items-center gap-4 transition-all ${map.bgClassName}`}>
              <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                <StatusIcon className={`w-4 h-4 ${map.className}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold text-gray-600">
                    Aula {mod.order}.{lesson.order}
                  </span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${map.className}`}>
                    · {map.label}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white truncate">{lesson.title}</h3>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {lesson.durationMin} min
                  </span>
                  <span className="capitalize">{lesson.level}</span>
                </div>
              </div>

              {canOpen && (
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-fuchsia-300 group-hover:translate-x-0.5 transition-all shrink-0" />
              )}
            </div>
          )

          return canOpen ? (
            <Link
              key={lesson.id}
              href={`/academy/modules/${mod.slug}/${lesson.slug}`}
              data-testid={`module-lesson-${idx + 1}`}
            >
              {content}
            </Link>
          ) : (
            <div
              key={lesson.id}
              data-testid={`module-lesson-${idx + 1}-locked`}
            >
              {content}
            </div>
          )
        })}
      </div>
    </div>
  )
}
