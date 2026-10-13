/**
 * BIA · Academy · R13.14.3 · Lista de módulos (área do aluno)
 *
 * Rota: /academy/modules
 *
 * Grid responsivo dos 12 módulos publicados, com progresso individual,
 * contagem de aulas e badge de nível. Clicando num card → vai pra
 * /academy/modules/[moduleSlug] com a lista de aulas.
 *
 * Fix do bug reportado pela Janaina (2026-10-11): o sidebar da Academy
 * tem o item 'Módulos' apontando para /academy/modules, mas a rota
 * não existia (só havia a dinâmica [moduleSlug]), resultando em 404.
 */
import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { computeStudentJourney } from "@/lib/academy/journey"
import { getEnrollmentState } from "@/lib/academy/enrollment"
import {
  BookOpen, CheckCircle2, Play, Lock, Clock, ChevronRight,
  Trophy, Sparkles, GraduationCap,
} from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AcademyModulesListPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/academy/modules")

  const enrollment = await prisma.academyEnrollment.findUnique({
    where: { userId: session.user.id },
  })

  if (!enrollment) {
    redirect("/academy/welcome")
  }

  const state = getEnrollmentState(enrollment)
  if (state === "EXPIRED") {
    redirect("/academy?expired=1")
  }

  // Carrega todos os módulos + aulas + progresso para computar jornada
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

  // computeStudentJourney retorna um objeto StudentJourney com .modules
  // (não um array direto — bug corrigido em R13.14.3b)
  const journey = computeStudentJourney(modules, progress)
  const journeyModules = journey.modules
  const publishedModules = journeyModules.filter((m) => m.isPublished)

  // KPIs
  const totalModules = journeyModules.length
  const totalPublished = publishedModules.length
  const totalLessons = publishedModules.reduce((s, m) => s + m.lessons.length, 0)
  const totalCompleted = publishedModules.reduce(
    (s, m) => s + m.lessons.filter((l) => l.status === "COMPLETED").length,
    0,
  )
  const totalMinutes = publishedModules.reduce(
    (s, m) => s + m.lessons.reduce((ms, l) => ms + (l.durationMin ?? 0), 0),
    0,
  )
  const totalHours = Math.round(totalMinutes / 60)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-fuchsia-300/80">
          <BookOpen className="w-3.5 h-3.5" />
          Catálogo de módulos
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">Módulos do programa</h1>
        <p className="text-sm text-gray-400 max-w-2xl">
          Os 12 módulos da Formação em Biofabricação e Bioimpressão 3D.
          Clique em um módulo para abrir as aulas em vídeo + materiais complementares.
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          icon={BookOpen}
          label="Módulos publicados"
          value={`${totalPublished} / ${totalModules}`}
          tone="violet"
        />
        <KpiCard
          icon={Trophy}
          label="Aulas concluídas"
          value={`${totalCompleted} / ${totalLessons}`}
          tone="emerald"
        />
        <KpiCard
          icon={Clock}
          label="Carga horária"
          value={`${totalHours}h`}
          sub="estimadas"
          tone="fuchsia"
        />
        <KpiCard
          icon={Sparkles}
          label="Progresso"
          value={totalLessons > 0 ? `${Math.round((totalCompleted / totalLessons) * 100)}%` : "0%"}
          tone="amber"
        />
      </div>

      {/* Grid de módulos */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="academy-modules-grid">
        {journeyModules.map((mod) => {
          const totalLessonsMod = mod.lessons.length
          const completedMod = mod.lessons.filter((l) => l.status === "COMPLETED").length
          const inProgressMod = mod.lessons.filter((l) => l.status === "IN_PROGRESS").length
          const pct = totalLessonsMod === 0 ? 0 : Math.round((completedMod / totalLessonsMod) * 100)
          const isDone = pct === 100 && totalLessonsMod > 0
          const isActive = inProgressMod > 0 || (pct > 0 && pct < 100)

          // Módulo não publicado → mostra como "em breve", não navegável
          if (!mod.isPublished) {
            return (
              <div
                key={mod.id}
                data-testid={`module-card-${mod.order}`}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-5 opacity-60"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-mono text-gray-500">
                        M{mod.order.toString().padStart(2, "0")}
                      </span>
                      <h3 className="text-base font-bold text-white truncate">{mod.title}</h3>
                      <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-gray-500">
                        Em breve
                      </span>
                    </div>
                    {mod.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">{mod.description}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          }

          return (
            <Link
              key={mod.id}
              href={`/academy/modules/${mod.slug}`}
              data-testid={`module-card-${mod.order}`}
              className={`group rounded-2xl border p-5 transition-all ${
                isDone
                  ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.06] to-transparent hover:border-emerald-500/50"
                  : isActive
                    ? "border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/[0.06] to-transparent hover:border-fuchsia-500/50"
                    : "border-white/[0.08] bg-white/[0.02] hover:border-violet-500/40 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-start gap-4 mb-3">
                <div
                  className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold border ${
                    isDone
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                      : isActive
                        ? "bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-300"
                        : "bg-violet-500/10 border-violet-500/20 text-violet-300"
                  }`}
                >
                  {mod.order.toString().padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-base font-bold text-white truncate">{mod.title}</h3>
                    {isDone && (
                      <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Concluído
                      </span>
                    )}
                    {!isDone && isActive && (
                      <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-200 inline-flex items-center gap-1">
                        <Play className="w-2.5 h-2.5" />
                        Em andamento
                      </span>
                    )}
                  </div>
                  {mod.description && (
                    <p className="text-xs text-gray-400 line-clamp-2">{mod.description}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-fuchsia-300 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
              </div>

              {/* Progresso */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500">
                    {completedMod} de {totalLessonsMod} aula{totalLessonsMod === 1 ? "" : "s"}
                  </span>
                  <span className={`font-semibold ${
                    isDone ? "text-emerald-300" : isActive ? "text-fuchsia-300" : "text-gray-400"
                  }`}>
                    {pct}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isDone
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                        : "bg-gradient-to-r from-violet-500 to-fuchsia-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </Link>
          )
        })}
      </section>

      {/* Dica inferior */}
      <aside className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-4 flex items-start gap-3">
        <GraduationCap className="w-4 h-4 text-violet-300 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-gray-400 leading-relaxed">
          <p className="text-violet-200 font-medium">Dica: siga a ordem recomendada</p>
          <p>
            Os módulos foram sequenciados do fundamento ao projeto final. Em cada aula
            você vê um vídeo + materiais complementares + o <strong>biaHook</strong> — um
            botão que abre a ferramenta certa da BIA pra você aplicar na prática o que acabou de aprender.
          </p>
        </div>
      </aside>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────── */

function KpiCard({
  icon: Icon, label, value, sub, tone,
}: {
  icon: typeof BookOpen
  label: string
  value: string
  sub?: string
  tone: "violet" | "fuchsia" | "emerald" | "amber"
}) {
  const styles = {
    violet:  "from-violet-500/10 border-violet-500/30 text-violet-200",
    fuchsia: "from-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-200",
    emerald: "from-emerald-500/10 border-emerald-500/30 text-emerald-200",
    amber:   "from-amber-500/10 border-amber-500/30 text-amber-200",
  }[tone]

  return (
    <div className={`rounded-xl border bg-gradient-to-br to-transparent p-4 ${styles}`}>
      <Icon className="w-5 h-5 mb-2 opacity-80" />
      <p className="text-[11px] uppercase tracking-wider opacity-70 mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}
