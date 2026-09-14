/**
 * BIA · Academy · Minha Jornada — R13.03
 *
 * Timeline dos 12 módulos do programa com progresso individual.
 * Cada card mostra: ordem, título, descrição, % concluído, badge
 * (Concluído / Em andamento / Em breve) e as N aulas com status
 * individual (COMPLETED / IN_PROGRESS / NOT_STARTED / LOCKED).
 *
 * Decisões travadas:
 *  - #6: módulo ganha selo "Concluído ✓" quando 100% (helper journey.ts já calcula)
 *  - #7: aulas com isPublished=false aparecem com cadeado (não somem)
 */
import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { computeStudentJourney } from "@/lib/academy/journey"
import { getEnrollmentState, daysRemaining } from "@/lib/academy/enrollment"
import {
  CheckCircle2, Lock, Play, Circle, Trophy, Clock, ChevronRight,
  Sparkles, BookOpen,
} from "lucide-react"

export const dynamic = "force-dynamic"

const STATUS_MAP: Record<string, {
  icon: typeof Circle
  label: string
  className: string
}> = {
  COMPLETED:   { icon: CheckCircle2, label: "Concluída",    className: "text-emerald-400" },
  IN_PROGRESS: { icon: Play,         label: "Em andamento", className: "text-fuchsia-400" },
  NOT_STARTED: { icon: Circle,       label: "Não iniciada", className: "text-gray-500" },
  LOCKED:      { icon: Lock,         label: "Em breve",     className: "text-gray-600" },
}

export default async function AcademyJourneyPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/academy/journey")

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
  const state = getEnrollmentState(enrollment)
  const days = daysRemaining(enrollment)

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8" data-testid="academy-journey-root">

      {/* ── Header ── */}
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-300/80">
          BIA Academy · Minha Jornada
        </p>
        <h1 className="text-3xl font-bold text-white">
          Sua trilha completa em biofabricação
        </h1>
        <p className="text-sm text-gray-400 max-w-2xl">
          {journey.modules.length} módulos publicados no programa. Cada módulo tem aulas em
          vídeo, quiz opcional e um botão para abrir a BIA e aplicar imediatamente o que
          você aprendeu.
        </p>

        {/* Progresso global + dias restantes */}
        <div className="flex items-center gap-4 pt-2">
          <div className="flex-1 max-w-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 font-medium">Progresso do programa</span>
              <span className="text-xs font-bold text-fuchsia-300">
                {journey.overallPercent}% · {journey.completedLessons}/{journey.totalLessons}
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-700"
                style={{ width: `${journey.overallPercent}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            {days !== null && days > 0
              ? <span><strong className="text-gray-300">{days}</strong> dias restantes</span>
              : state === "COMPLETED" ? "Programa concluído 🎓" : "Acesso expirado"}
          </div>
        </div>
      </header>

      {/* ── Timeline de módulos ── */}
      <div className="space-y-4">
        {journey.modules.length === 0 && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center">
            <BookOpen className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              Nenhum módulo publicado ainda. Os 12 módulos do programa serão liberados progressivamente.
            </p>
          </div>
        )}

        {journey.modules.map(mod => {
          const isPub = mod.isPublished
          const inProgress = mod.completedLessons > 0 && !mod.isCompleted

          return (
            <article
              key={mod.id}
              data-testid={`journey-module-${mod.order}`}
              className={`relative rounded-2xl border transition-all ${
                mod.isCompleted
                  ? "border-emerald-500/25 bg-emerald-500/[0.03]"
                  : inProgress
                    ? "border-fuchsia-500/25 bg-fuchsia-500/[0.03]"
                    : isPub
                      ? "border-white/[0.08] bg-white/[0.02]"
                      : "border-white/[0.05] bg-white/[0.01] opacity-70"
              }`}
            >
              {/* Cabeçalho do módulo */}
              <div className="p-5 flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                  mod.isCompleted
                    ? "bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border-emerald-500/30"
                    : inProgress
                      ? "bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border-fuchsia-500/30"
                      : isPub
                        ? "bg-white/[0.06] border-white/10"
                        : "bg-white/[0.03] border-white/[0.06]"
                }`}>
                  <span className={`text-lg font-bold ${
                    mod.isCompleted ? "text-emerald-300"
                    : inProgress ? "text-fuchsia-300"
                    : isPub ? "text-gray-300"
                    : "text-gray-600"
                  }`}>
                    {mod.order.toString().padStart(2, "0")}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-base font-bold text-white">{mod.title}</h2>
                    {mod.isCompleted && (
                      <span
                        data-testid={`journey-module-${mod.order}-completed-badge`}
                        className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      >
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Concluído
                      </span>
                    )}
                    {inProgress && (
                      <span
                        data-testid={`journey-module-${mod.order}-inprogress-badge`}
                        className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        Em andamento
                      </span>
                    )}
                    {!isPub && (
                      <span
                        data-testid={`journey-module-${mod.order}-locked-badge`}
                        className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/[0.06] text-gray-500 border border-white/[0.08]"
                      >
                        <Lock className="w-2.5 h-2.5" />
                        Em breve
                      </span>
                    )}
                  </div>
                  {mod.description && (
                    <p className="text-sm text-gray-400 line-clamp-2">{mod.description}</p>
                  )}

                  {/* Barra de progresso do módulo */}
                  {mod.totalLessons > 0 && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 max-w-xs h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            mod.isCompleted
                              ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                              : "bg-gradient-to-r from-violet-500 to-fuchsia-500"
                          }`}
                          style={{ width: `${mod.percent}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-gray-500 font-medium">
                        {mod.percent}% · {mod.completedLessons}/{mod.totalLessons}
                      </span>
                    </div>
                  )}
                </div>

                {isPub && (
                  <Link
                    href={`/academy/modules/${mod.slug}`}
                    className="shrink-0 self-start text-xs font-medium text-fuchsia-300 hover:text-fuchsia-200 flex items-center gap-1"
                    data-testid={`journey-module-${mod.order}-open`}
                  >
                    Abrir <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              {/* Lista de aulas do módulo */}
              {mod.lessons.length > 0 && (
                <div className="px-5 pb-5 pt-1 space-y-1 border-t border-white/[0.04]">
                  {mod.lessons.map(lesson => {
                    const StatusIcon = STATUS_MAP[lesson.status].icon
                    const canOpen = lesson.status !== "LOCKED"
                    const content = (
                      <div className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                        canOpen ? "hover:bg-white/[0.04]" : "opacity-60 cursor-not-allowed"
                      }`}>
                        <StatusIcon className={`w-4 h-4 shrink-0 ${STATUS_MAP[lesson.status].className}`} />
                        <span className="text-gray-300 flex-1 truncate">
                          <span className="text-gray-500 text-xs mr-2">
                            {mod.order}.{lesson.order}
                          </span>
                          {lesson.title}
                        </span>
                        <span className="text-[11px] text-gray-600 shrink-0">
                          {lesson.durationMin} min
                        </span>
                        {canOpen && <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />}
                      </div>
                    )
                    return canOpen ? (
                      <Link
                        key={lesson.id}
                        href={`/academy/modules/${mod.slug}/${lesson.slug}`}
                        data-testid={`journey-lesson-${mod.order}-${lesson.order}`}
                      >
                        {content}
                      </Link>
                    ) : (
                      <div
                        key={lesson.id}
                        data-testid={`journey-lesson-${mod.order}-${lesson.order}-locked`}
                      >
                        {content}
                      </div>
                    )
                  })}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
