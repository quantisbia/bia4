/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R14.1 · ProfileWelcomeBanner — hero personalizado por perfil
 *  ─────────────────────────────────────────────────────────────────────
 *  Mostra, no topo do dashboard home, um banner específico para o perfil
 *  do usuário (ortopedista, dermatologista, pós-grad, etc.) com:
 *    • Saudação personalizada
 *    • CTA para a ferramenta mais relevante
 *    • Link para o e-book recomendado (se existir)
 *    • Trilha de módulos sugerida da Academy
 *
 *  Se o usuário ainda não escolheu um perfil (researchArea == null),
 *  renderiza um banner de ONBOARDING convidando a escolher.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — Out/2026
 * ═══════════════════════════════════════════════════════════════════════
 */
import Link from "next/link"
import { ArrowRight, BookOpen, GraduationCap, Sparkles } from "lucide-react"
import { resolveUserProfile, type UserProfile } from "@/lib/user/profile"
import { cn } from "@/lib/utils/helpers"

export interface ProfileWelcomeBannerProps {
  userName: string
  researchArea: string | null | undefined
}

/* ──────────────────────────────────────────────────────────────────────
 * Paleta de cores por accentColor
 * ──────────────────────────────────────────────────────────────────── */
const ACCENT_STYLES: Record<UserProfile["accentColor"], {
  bg: string; border: string; text: string; glow: string; btn: string
}> = {
  rose: {
    bg: "bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-transparent",
    border: "border-rose-500/20",
    text: "text-rose-300",
    glow: "shadow-rose-500/10",
    btn: "bg-rose-500 hover:bg-rose-400 text-white",
  },
  amber: {
    bg: "bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent",
    border: "border-amber-500/20",
    text: "text-amber-300",
    glow: "shadow-amber-500/10",
    btn: "bg-amber-500 hover:bg-amber-400 text-black",
  },
  sky: {
    bg: "bg-gradient-to-br from-sky-500/10 via-cyan-500/5 to-transparent",
    border: "border-sky-500/20",
    text: "text-sky-300",
    glow: "shadow-sky-500/10",
    btn: "bg-sky-500 hover:bg-sky-400 text-white",
  },
  violet: {
    bg: "bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent",
    border: "border-violet-500/20",
    text: "text-violet-300",
    glow: "shadow-violet-500/10",
    btn: "bg-violet-500 hover:bg-violet-400 text-white",
  },
  emerald: {
    bg: "bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent",
    border: "border-emerald-500/20",
    text: "text-emerald-300",
    glow: "shadow-emerald-500/10",
    btn: "bg-emerald-500 hover:bg-emerald-400 text-white",
  },
  fuchsia: {
    bg: "bg-gradient-to-br from-fuchsia-500/10 via-pink-500/5 to-transparent",
    border: "border-fuchsia-500/20",
    text: "text-fuchsia-300",
    glow: "shadow-fuchsia-500/10",
    btn: "bg-fuchsia-500 hover:bg-fuchsia-400 text-white",
  },
}

/* ──────────────────────────────────────────────────────────────────────
 * CTA principal por perfil — link + rótulo em português natural
 * ──────────────────────────────────────────────────────────────────── */
const PROFILE_PRIMARY_CTA: Record<string, { label: string; href: string }> = {
  orthopedist:    { label: "Imprimir scaffold ósseo",            href: "/dashboard/bioprint" },
  dermatologist:  { label: "Criar modelo de pele 3D",            href: "/dashboard/bioprint" },
  dentist:        { label: "Imprimir enxerto alveolar",          href: "/dashboard/bioprint" },
  postgrad:       { label: "Iniciar novo Pipeline",              href: "/dashboard/pipeline" },
  undergrad:      { label: "Começar pelo guia passo-a-passo",    href: "/dashboard/manual" },
  researcher:     { label: "Abrir Formulador Pro",               href: "/dashboard/formulator" },
}

/* ──────────────────────────────────────────────────────────────────────
 * Headlines personalizados
 * ──────────────────────────────────────────────────────────────────── */
const PROFILE_HEADLINES: Record<string, string> = {
  orthopedist:
    "Scaffolds ósseos e cartilaginosos sob medida — do planejamento cirúrgico ao G-code pronto para impressão.",
  dermatologist:
    "Pele bioimpressa multicamada, modelos cicatrização e substitutos a animais para testes dermatocosméticos.",
  dentist:
    "Enxertos alveolares, membranas PRF e scaffolds periodontais com protocolos clínicos validados.",
  postgrad:
    "Pipeline completo em 12 etapas, Notebook versionado e exportação pronta para dissertação ou tese.",
  undergrad:
    "Trilha guiada passo-a-passo, templates prontos e tutoriais pensados para quem está começando.",
  researcher:
    "Formulação avançada de biotintas, reologia completa, dECM customizado e dossiês regulatórios.",
}

/* ══════════════════════════════════════════════════════════════════════
 *  Componente principal
 * ══════════════════════════════════════════════════════════════════════ */

export function ProfileWelcomeBanner({ userName, researchArea }: ProfileWelcomeBannerProps) {
  const profile = resolveUserProfile(researchArea)
  const style = ACCENT_STYLES[profile.accentColor]
  const cta = PROFILE_PRIMARY_CTA[profile.id] ?? PROFILE_PRIMARY_CTA.postgrad
  const headline = PROFILE_HEADLINES[profile.id] ?? profile.description

  // Mostra banner de onboarding se o perfil ainda não foi escolhido
  const needsOnboarding = !researchArea
  const greeting = userName ? `Olá, ${userName}!` : "Bem-vindo(a)!"

  return (
    <section
      data-testid={`profile-welcome-${profile.id}`}
      data-profile-id={profile.id}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 sm:p-6 shadow-lg",
        style.bg, style.border, style.glow,
      )}
    >
      {/* Decoração geométrica sutil */}
      <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-5">
        {/* Lado esquerdo — Avatar emoji + saudação + descrição */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className={cn(
            "flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border shrink-0",
            style.border, style.bg,
          )}>
            <span className="text-3xl sm:text-4xl" aria-hidden>{profile.emoji}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {greeting}
              </h2>
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                style.border, style.text, "bg-white/[0.03]",
              )}>
                <Sparkles className="w-3 h-3" />
                {profile.shortLabel}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-xl">
              {headline}
            </p>
          </div>
        </div>

        {/* Lado direito — CTAs */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:min-w-[220px]">
          <Link
            href={cta.href}
            data-testid={`profile-cta-primary-${profile.id}`}
            className={cn(
              "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-md",
              style.btn,
            )}
          >
            {cta.label}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {profile.recommendedEbookId && (
            <Link
              href="/academy/library"
              data-testid={`profile-cta-ebook-${profile.id}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium bg-white/[0.04] border border-white/[0.08] text-gray-200 hover:bg-white/[0.08] transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              E-book recomendado
            </Link>
          )}

          {profile.recommendedModuleSlugs.length > 0 && (
            <Link
              href="/academy/dashboard"
              data-testid={`profile-cta-academy-${profile.id}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium bg-white/[0.04] border border-white/[0.08] text-gray-200 hover:bg-white/[0.08] transition-colors"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Minha trilha Academy
            </Link>
          )}
        </div>
      </div>

      {/* Banner de onboarding — perfil ainda não escolhido */}
      {needsOnboarding && (
        <div
          data-testid="profile-onboarding-prompt"
          className="relative z-10 mt-4 pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3"
        >
          <p className="text-[11px] sm:text-xs text-amber-300/90">
            👆 Esse é um perfil sugerido. <strong>Personalize</strong> para a BIA destacar as ferramentas certas pra você.
          </p>
          <Link
            href="/dashboard/settings"
            data-testid="profile-onboarding-cta"
            className="text-[11px] sm:text-xs font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-2 shrink-0"
          >
            Escolher perfil →
          </Link>
        </div>
      )}
    </section>
  )
}
