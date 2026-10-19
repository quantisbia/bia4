/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R14.2 · AcademyWelcomeBanner — hero do dashboard da Academy
 *  ─────────────────────────────────────────────────────────────────────
 *  Equivalente ao ProfileWelcomeBanner (que fica no dashboard da BIA),
 *  mas pro contexto educacional da Academy. Mesmo "visual claro" que a
 *  plataforma BIA ganhou no R14.1: emoji+saudação+descrição+CTAs
 *  destacados. SEM mudar conteúdo da Academy — só a camada visual.
 *
 *  Props:
 *    - userName: primeiro nome do aluno
 *    - completedLessons / totalLessons: para o resumo de progresso
 *    - daysLeft: dias restantes de acesso (ou null)
 *    - primaryCta: {label, href} — "Continuar de onde parou" ou "Começar"
 *
 *  Janaina Dernowsek / Quantis Biotechnology — Out/2026
 * ═══════════════════════════════════════════════════════════════════════
 */
import Link from "next/link"
import { ArrowRight, Trophy, Calendar, GraduationCap, Library } from "lucide-react"
import { cn } from "@/lib/utils/helpers"

export interface AcademyWelcomeBannerProps {
  userName: string
  completedLessons: number
  totalLessons: number
  daysLeft: number | null
  primaryCta: { label: string; href: string }
}

export function AcademyWelcomeBanner({
  userName,
  completedLessons,
  totalLessons,
  daysLeft,
  primaryCta,
}: AcademyWelcomeBannerProps) {
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  const greeting = userName ? `Olá, ${userName}!` : "Bem-vindo(a)!"

  // Mensagem motivacional em função do progresso
  const subtitle = (() => {
    if (completedLessons === 0) return "Vamos começar? A primeira aula do Módulo 1 te espera."
    if (progressPct < 25) return `Você já começou — bora manter o ritmo? Já são ${completedLessons} aulas concluídas.`
    if (progressPct < 60) return `Você tá firme. ${completedLessons} de ${totalLessons} aulas prontas, falta pouco pra metade.`
    if (progressPct < 100) return `Reta final! ${completedLessons} de ${totalLessons} aulas — você tá a ${totalLessons - completedLessons} aulas do certificado.`
    return "🏆 Você completou TODAS as aulas! Baixe seu certificado e compartilhe sua jornada."
  })()

  return (
    <section
      data-testid="academy-welcome-banner"
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 sm:p-6 shadow-lg",
        "bg-gradient-to-br from-fuchsia-500/10 via-violet-500/5 to-transparent",
        "border-fuchsia-500/20 shadow-fuchsia-500/10",
      )}
    >
      {/* Decoração geométrica sutil */}
      <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-5">
        {/* ─── Lado esquerdo: avatar + saudação ─── */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className={cn(
            "flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border shrink-0",
            "bg-fuchsia-500/[0.08] border-fuchsia-500/25",
          )}>
            <GraduationCap className="w-7 h-7 sm:w-8 sm:h-8 text-fuchsia-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {greeting}
              </h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-fuchsia-500/30 text-fuchsia-300 bg-white/[0.03]">
                <Trophy className="w-3 h-3" />
                BIA Academy
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-xl">
              {subtitle}
            </p>

            {/* Progress bar enxuta */}
            {totalLessons > 0 && (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden max-w-xs">
                  <div
                    className="h-full bg-gradient-to-r from-fuchsia-500 to-violet-500 transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-fuchsia-300 tabular-nums">
                  {progressPct}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ─── Lado direito: CTAs ─── */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:min-w-[220px]">
          <Link
            href={primaryCta.href}
            data-testid="academy-welcome-primary-cta"
            className={cn(
              "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-md",
              "bg-fuchsia-500 hover:bg-fuchsia-400 text-white shadow-fuchsia-900/40",
            )}
          >
            {primaryCta.label}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <Link
            href="/academy/library"
            data-testid="academy-welcome-library-cta"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium bg-white/[0.04] border border-white/[0.08] text-gray-200 hover:bg-white/[0.08] transition-colors"
          >
            <Library className="w-3.5 h-3.5" />
            Minha biblioteca
          </Link>

          {daysLeft !== null && daysLeft > 0 && (
            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-medium bg-amber-500/5 border border-amber-500/15 text-amber-300">
              <Calendar className="w-3 h-3" />
              {daysLeft === 1 ? "1 dia restante" : `${daysLeft} dias restantes`}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
