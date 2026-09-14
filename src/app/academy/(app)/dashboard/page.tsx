/**
 * BIA · Academy · Dashboard do aluno — R13.03
 *
 * Página "home" pós-login. Server component que agrega tudo em uma única
 * consulta (via helper computeStudentJourney) e mostra 5 cards:
 *
 *  1. Continue de onde parou     → última aula IN_PROGRESS (ou próxima recomendada)
 *  2. Próxima aula recomendada   → primeira aula não concluída em ordem
 *  3. Progresso geral            → % concluído + aulas completas / total + dias restantes
 *  4. Próximo encontro ao vivo   → LiveEvent futuro mais próximo (ou placeholder)
 *  5. Feed compacto              → últimas 3 AcademyUpdates publicadas
 *
 * O layout /academy/(app)/layout.tsx já garantiu sessão + matrícula ativa,
 * então aqui podemos assumir que os dois existem.
 */
import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { daysRemaining, getEnrollmentState } from "@/lib/academy/enrollment"
import { computeStudentJourney } from "@/lib/academy/journey"
import {
  Play, ArrowRight, Trophy, Clock, Video, BookOpen,
  Sparkles, ChevronRight, Calendar, Rss,
} from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AcademyDashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/academy/dashboard")

  const enrollment = await prisma.academyEnrollment.findUnique({
    where: { userId: session.user.id },
  })
  if (!enrollment) redirect("/academy/welcome")

  const [modules, progress, nextLive, updates] = await Promise.all([
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
    prisma.academyLiveEvent.findFirst({
      where: { scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.academyUpdate.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
  ])

  const journey = computeStudentJourney(modules, progress)
  const state = getEnrollmentState(enrollment)
  const days = daysRemaining(enrollment)

  const userName = session.user.name?.split(" ")[0] ?? "Aluno"

  // Se o "continueFrom" e o "nextRecommendedLesson" são a mesma aula,
  // mostramos só 1 card grande em vez de 2 iguais.
  const showBothCards =
    journey.continueFrom && journey.nextRecommendedLesson &&
    journey.continueFrom.id !== journey.nextRecommendedLesson.id

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8" data-testid="academy-dashboard-root">

      {/* ── Header ── */}
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-300/80">
          BIA Academy · Dashboard do aluno
        </p>
        <h1 className="text-3xl font-bold text-white">
          Bem-vindo(a), {userName} 👋
        </h1>
        <p className="text-sm text-gray-400">
          {journey.completedLessons === 0
            ? "Comece pela primeira aula do Módulo 1 — a jornada é sua."
            : `Você já concluiu ${journey.completedLessons} de ${journey.totalLessons} aulas publicadas.`}
        </p>
      </header>

      {/* ── Cards principais ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Card 1: Continue de onde parou */}
        {journey.continueFrom && (
          <Link
            href={`/academy/modules/${journey.continueFrom.moduleSlug}/${journey.continueFrom.slug}`}
            data-testid="dashboard-card-continue"
            className="lg:col-span-2 group relative overflow-hidden rounded-2xl border border-fuchsia-500/25 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-purple-500/5 p-6 hover:border-fuchsia-500/40 transition-all"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-fuchsia-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-fuchsia-500/20 transition-all" />

            <div className="relative flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0 shadow-lg shadow-fuchsia-900/40">
                <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-fuchsia-300 mb-1">
                  {journey.continueFrom.status === "IN_PROGRESS" ? "Continue de onde parou" : "Comece por aqui"}
                </p>
                <h2 className="text-lg font-bold text-white truncate">
                  {journey.continueFrom.title}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Módulo {journey.continueFrom.moduleOrder} — {journey.continueFrom.moduleTitle}
                  <span className="mx-1.5 text-gray-600">•</span>
                  {journey.continueFrom.durationMin} min
                  <span className="mx-1.5 text-gray-600">•</span>
                  <span className="capitalize">{journey.continueFrom.level}</span>
                </p>
              </div>

              <ArrowRight className="w-5 h-5 text-fuchsia-300 shrink-0 mt-1.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        )}

        {/* Card 3: Progresso geral (sempre visível) */}
        <div
          data-testid="dashboard-card-progress"
          className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-fuchsia-300/80 mb-1">
                Progresso geral
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">{journey.overallPercent}%</span>
                <span className="text-xs text-gray-500">
                  {journey.completedLessons}/{journey.totalLessons} aulas
                </span>
              </div>
            </div>
            <Trophy className="w-6 h-6 text-fuchsia-400/60" />
          </div>

          <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-700"
              style={{ width: `${journey.overallPercent}%` }}
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            {days !== null && days > 0
              ? <span><strong className="text-gray-300">{days}</strong> dias restantes de acesso</span>
              : state === "COMPLETED"
                ? <span className="text-emerald-400">Programa concluído 🎓</span>
                : <span>Acesso expirado</span>}
          </div>
        </div>

        {/* Card 2: Próxima aula recomendada (só quando é diferente do continue) */}
        {showBothCards && journey.nextRecommendedLesson && (
          <Link
            href={`/academy/modules/${journey.nextRecommendedLesson.moduleSlug}/${journey.nextRecommendedLesson.slug}`}
            data-testid="dashboard-card-next"
            className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 hover:border-fuchsia-500/25 hover:bg-white/[0.03] transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-fuchsia-300" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-fuchsia-300 group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-fuchsia-300/80 mb-1">
              Próxima aula
            </p>
            <h3 className="text-sm font-bold text-white line-clamp-2">
              {journey.nextRecommendedLesson.title}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Módulo {journey.nextRecommendedLesson.moduleOrder} · {journey.nextRecommendedLesson.durationMin} min
            </p>
          </Link>
        )}

        {/* Card 4: Próximo encontro ao vivo */}
        <div
          data-testid="dashboard-card-live"
          className={`rounded-2xl border p-6 ${nextLive ? "border-violet-500/25 bg-violet-500/[0.05]" : "border-white/[0.08] bg-white/[0.02]"}`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Video className="w-4 h-4 text-violet-300" />
            </div>
            {nextLive?.meetingUrl && (
              <Link
                href={nextLive.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-semibold uppercase tracking-wider text-violet-300 hover:text-violet-200"
                data-testid="dashboard-live-link"
              >
                Entrar →
              </Link>
            )}
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-300/80 mb-1">
            Próximo encontro ao vivo
          </p>
          {nextLive ? (
            <>
              <h3 className="text-sm font-bold text-white line-clamp-2">{nextLive.title}</h3>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                {new Date(nextLive.scheduledAt).toLocaleString("pt-BR", {
                  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </>
          ) : (
            <>
              <h3 className="text-sm font-bold text-gray-400">
                Nenhum encontro agendado
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Os 3 encontros do programa serão publicados aqui.
              </p>
            </>
          )}
        </div>

        {/* Card 5: Feed de atualizações (compacto) */}
        <div
          data-testid="dashboard-card-updates"
          className="lg:col-span-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
                <Rss className="w-3.5 h-3.5 text-fuchsia-300" />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-fuchsia-300/80">
                Últimas atualizações
              </p>
            </div>
            <Link
              href="/academy/updates"
              className="text-[10px] font-semibold uppercase tracking-wider text-fuchsia-300 hover:text-fuchsia-200"
            >
              Ver todas →
            </Link>
          </div>

          {updates.length > 0 ? (
            <ul className="space-y-3">
              {updates.map(u => (
                <li key={u.id} className="flex items-start gap-3 text-sm">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-400 mt-0.5">
                    {u.kind}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-200 line-clamp-1">{u.title}</p>
                    <p className="text-[10px] text-gray-600">
                      {new Date(u.publishedAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 py-4 text-center">
              Nenhuma atualização ainda. O feed será populado ao longo do programa.
            </p>
          )}
        </div>

        {/* CTA Ver todos os módulos */}
        <Link
          href="/academy/journey"
          data-testid="dashboard-card-journey"
          className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 hover:border-fuchsia-500/25 hover:bg-white/[0.03] transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center mb-3">
              <BookOpen className="w-4 h-4 text-fuchsia-300" />
            </div>
            <h3 className="text-sm font-bold text-white">Ver minha jornada completa</h3>
            <p className="text-xs text-gray-500 mt-1">
              Todos os 12 módulos do programa, com progresso individual
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-medium text-fuchsia-300 group-hover:gap-2 transition-all">
            Abrir jornada
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>
    </div>
  )
}
