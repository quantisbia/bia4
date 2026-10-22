/**
 * BIA · Academy · R13.14.3 · Encontros ao vivo + atualizações da área
 *
 * Rota: /academy/live
 *
 * Mostra:
 *  1. Próximo encontro em destaque (com countdown de dias)
 *  2. Lista completa dos encontros agendados (passados riscados, com gravação)
 *  3. Feed de atualizações da área (AcademyUpdate — artigos, protocolos,
 *     aulas extras, eventos externos)
 *
 * Agenda inicial (R13.14.3 — podendo sofrer alterações):
 *   - 25 de novembro de 2026 às 19:00 (encontro 1 · abertura)
 *   - 15 de dezembro de 2026 às 19:00 (encontro 2 · meio do caminho)
 *   - 26 de janeiro de 2027 às 19:00 (encontro 3 · fechamento)
 *
 * Fuso horário: America/Sao_Paulo. Links do Zoom/Meet são adicionados
 * via painel admin próximo ao evento (podem ficar vazios inicialmente).
 */
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { getEnrollmentState } from "@/lib/academy/enrollment"
import {
  Video, Calendar, Clock, ExternalLink, PlayCircle, Sparkles,
  AlertTriangle, CheckCircle2, Rss, FileText, BookOpen, Zap,
} from "lucide-react"

export const dynamic = "force-dynamic"

// ─── Helpers ─────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(d)
}

function fmtTime(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(d)
}

function daysUntil(d: Date): number {
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const KIND_META: Record<string, { icon: typeof FileText; label: string; tone: string }> = {
  PROTOCOL:     { icon: FileText,   label: "Protocolo",       tone: "text-emerald-300 border-emerald-500/30 bg-emerald-500/[0.06]" },
  ARTICLE:      { icon: BookOpen,   label: "Artigo comentado", tone: "text-violet-300 border-violet-500/30 bg-violet-500/[0.06]" },
  LESSON_EXTRA: { icon: PlayCircle, label: "Aula extra",       tone: "text-fuchsia-300 border-fuchsia-500/30 bg-fuchsia-500/[0.06]" },
  EVENT:        { icon: Zap,        label: "Evento externo",   tone: "text-amber-300 border-amber-500/30 bg-amber-500/[0.06]" },
}

// ─── Página ───────────────────────────────────────────────────────────

export default async function AcademyLivePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/academy/live")

  const enrollment = await prisma.academyEnrollment.findUnique({
    where: { userId: session.user.id },
  })
  if (!enrollment) redirect("/academy/welcome")
  if (getEnrollmentState(enrollment) === "EXPIRED") redirect("/academy?expired=1")

  const now = new Date()
  const [liveEvents, updates] = await Promise.all([
    prisma.academyLiveEvent.findMany({
      where: { isPublished: true },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.academyUpdate.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: "desc" },
      take: 10,
    }),
  ])

  const upcoming = liveEvents.filter((e) => e.scheduledAt >= now)
  const nextEvent = upcoming[0]

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Header */}
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-fuchsia-300/80">
          <Video className="w-3.5 h-3.5" />
          Ao vivo com a Quantis
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">Encontros online & atualizações</h1>
        <p className="text-sm text-gray-400 max-w-2xl">
          Encontros ao vivo com a equipe científica da Quantis + feed curado
          das novidades da área (protocolos, artigos comentados, aulas extras).
          Agenda confirmada — datas podem sofrer alterações, sempre comunicadas por e-mail.
        </p>
      </header>

      {/* Próximo encontro em destaque */}
      {nextEvent ? (
        <section
          data-testid="academy-live-next"
          className="rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/[0.08] via-violet-500/[0.05] to-transparent p-6 sm:p-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            {/* Data em destaque */}
            <div className="shrink-0 text-center sm:text-left">
              <div className="inline-flex sm:flex flex-col items-center justify-center w-24 h-24 rounded-2xl border border-fuchsia-500/40 bg-fuchsia-500/15">
                <span className="text-[10px] uppercase tracking-wider text-fuchsia-200 font-semibold">
                  {new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "America/Sao_Paulo" })
                    .format(nextEvent.scheduledAt)
                    .replace(".", "")
                    .toUpperCase()}
                </span>
                <span className="text-3xl font-bold text-white leading-none">
                  {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", timeZone: "America/Sao_Paulo" }).format(nextEvent.scheduledAt)}
                </span>
                <span className="text-[10px] text-fuchsia-200/80 mt-1">
                  {fmtTime(nextEvent.scheduledAt)}
                </span>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-200 text-[10px] font-semibold uppercase tracking-wider mb-3">
                <Sparkles className="w-3 h-3" />
                Próximo encontro · em {daysUntil(nextEvent.scheduledAt)} dia{daysUntil(nextEvent.scheduledAt) === 1 ? "" : "s"}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">{nextEvent.title}</h2>
              <p className="text-xs text-gray-400 mb-4 capitalize">
                {fmtDate(nextEvent.scheduledAt)} às {fmtTime(nextEvent.scheduledAt)} (horário de Brasília) · {nextEvent.durationMin} min
              </p>
              {nextEvent.description && (
                <p className="text-sm text-gray-300 leading-relaxed mb-5">
                  {nextEvent.description}
                </p>
              )}

              {/* CTA do link do Zoom */}
              {nextEvent.meetingUrl ? (
                <a
                  href={nextEvent.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="academy-live-next-join"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:from-fuchsia-400 hover:to-violet-400 text-white font-semibold text-sm transition-all shadow-lg shadow-fuchsia-500/20"
                >
                  <Video className="w-4 h-4" />
                  Entrar no encontro
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <div className="inline-flex items-start gap-2 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] text-amber-100 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    O link do Zoom será publicado aqui 48h antes do encontro
                    e enviado por e-mail para o endereço do seu cadastro.
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : liveEvents.length === 0 ? (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <Video className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-1">
            Nenhum encontro ao vivo agendado no momento.
          </p>
          <p className="text-xs text-gray-600">
            Vamos avisar por e-mail assim que a próxima data for publicada.
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm text-emerald-200">
            Todos os encontros programados já aconteceram.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            As gravações estão disponíveis mais abaixo nesta página.
          </p>
        </section>
      )}

      {/* Lista completa de encontros */}
      {liveEvents.length > 0 && (
        <section className="space-y-4" data-testid="academy-live-list">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-violet-300" />
            Agenda completa
            <span className="text-[10px] font-normal uppercase tracking-wider text-gray-500 ml-2">
              podendo sofrer alterações
            </span>
          </h2>

          <ul className="space-y-3">
            {liveEvents.map((ev) => {
              const isPast = ev.scheduledAt < now
              const isNext = ev.id === nextEvent?.id
              return (
                <li
                  key={ev.id}
                  data-testid={`academy-live-event-${ev.order}`}
                  className={`rounded-xl border p-4 ${
                    isNext
                      ? "border-fuchsia-500/30 bg-fuchsia-500/[0.04]"
                      : isPast
                        ? "border-white/[0.06] bg-white/[0.01] opacity-70"
                        : "border-white/[0.08] bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-sm ${
                      isPast
                        ? "border-white/10 bg-white/[0.03] text-gray-500"
                        : isNext
                          ? "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-200"
                          : "border-violet-500/30 bg-violet-500/10 text-violet-200"
                    }`}>
                      {ev.order}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-sm font-bold ${isPast ? "text-gray-400 line-through" : "text-white"}`}>
                          {ev.title}
                        </h3>
                        {isNext && (
                          <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-200">
                            Próximo
                          </span>
                        )}
                        {isPast && ev.recordingUrl && (
                          <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-200">
                            Gravação disponível
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 capitalize">
                        {fmtDate(ev.scheduledAt)} às {fmtTime(ev.scheduledAt)} · {ev.durationMin} min
                      </p>
                      {ev.description && !isPast && (
                        <p className="text-xs text-gray-400 mt-2 leading-relaxed line-clamp-2">
                          {ev.description}
                        </p>
                      )}
                    </div>
                    {isPast && ev.recordingUrl && (
                      <a
                        href={ev.recordingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/[0.08] hover:bg-emerald-500/[0.15] text-emerald-200 text-xs font-medium transition-all"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        Assistir
                      </a>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Feed de atualizações */}
      <section id="academy-updates-feed" className="space-y-4" data-testid="academy-updates-feed">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Rss className="w-4 h-4 text-amber-300" />
          Atualizações da área
          <span className="text-[10px] font-normal uppercase tracking-wider text-gray-500 ml-2">
            curadoria quantis
          </span>
        </h2>

        {updates.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center">
            <Rss className="w-6 h-6 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">
              Nenhuma atualização publicada ainda. A equipe científica da Quantis publicará aqui
              novos protocolos, artigos comentados, aulas extras e eventos relevantes da área.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {updates.map((u) => {
              const meta = KIND_META[u.kind] ?? KIND_META.ARTICLE
              const Icon = meta.icon
              return (
                <li
                  key={u.id}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center ${meta.tone}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.tone}`}>
                          {meta.label}
                        </span>
                        <time className="text-[10px] text-gray-500">
                          {fmtDate(u.publishedAt)}
                        </time>
                      </div>
                      <h3 className="text-sm font-bold text-white mb-1">{u.title}</h3>
                      <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-line">
                        {u.body.length > 300 ? u.body.slice(0, 300) + "…" : u.body}
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Rodapé informativo */}
      <aside className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-4 flex items-start gap-3">
        <Clock className="w-4 h-4 text-violet-300 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-gray-400 leading-relaxed">
          <p className="text-violet-200 font-medium">Como funciona?</p>
          <p>
            Os encontros são opcionais mas <strong className="text-white">altamente recomendados</strong> —
            é onde você tira dúvidas direto com a Dra. Kamila e o time, vê demos exclusivas da BIA
            e conhece quem está na mesma jornada. Todas as sessões são gravadas e ficam
            disponíveis aqui depois.
          </p>
        </div>
      </aside>
    </div>
  )
}
