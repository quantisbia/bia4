/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R14.2 · ProfilePicker — escolha visual do perfil clínico
 *  ─────────────────────────────────────────────────────────────────────
 *  Grid de 6 cards (um por UserProfile) com emoji + label + descrição.
 *  Usuário clica → PATCH /api/user/profile → salva researchArea no banco.
 *  Depois o dashboard home passa a personalizar baseado nessa escolha.
 *
 *  Design: cards grandes, click-area ampla, feedback visual (ring +
 *  check icon no card selecionado). Mobile-first.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — Out/2026
 * ═══════════════════════════════════════════════════════════════════════
 */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Save } from "lucide-react"
import { USER_PROFILES, type UserProfile } from "@/lib/user/profile"
import { storeMode } from "@/lib/user/ui-mode"
import { cn } from "@/lib/utils/helpers"

/* ──────────────────────────────────────────────────────────────────────
 * Paleta por accentColor (coerente com ProfileWelcomeBanner)
 * ──────────────────────────────────────────────────────────────────── */
const ACCENT: Record<UserProfile["accentColor"], {
  border: string; borderActive: string; bg: string; text: string; ring: string
}> = {
  rose: {
    border: "border-rose-500/15", borderActive: "border-rose-500/60",
    bg: "bg-rose-500/[0.04]", text: "text-rose-300", ring: "ring-rose-500/30",
  },
  amber: {
    border: "border-amber-500/15", borderActive: "border-amber-500/60",
    bg: "bg-amber-500/[0.04]", text: "text-amber-300", ring: "ring-amber-500/30",
  },
  sky: {
    border: "border-sky-500/15", borderActive: "border-sky-500/60",
    bg: "bg-sky-500/[0.04]", text: "text-sky-300", ring: "ring-sky-500/30",
  },
  violet: {
    border: "border-violet-500/15", borderActive: "border-violet-500/60",
    bg: "bg-violet-500/[0.04]", text: "text-violet-300", ring: "ring-violet-500/30",
  },
  emerald: {
    border: "border-emerald-500/15", borderActive: "border-emerald-500/60",
    bg: "bg-emerald-500/[0.04]", text: "text-emerald-300", ring: "ring-emerald-500/30",
  },
  fuchsia: {
    border: "border-fuchsia-500/15", borderActive: "border-fuchsia-500/60",
    bg: "bg-fuchsia-500/[0.04]", text: "text-fuchsia-300", ring: "ring-fuchsia-500/30",
  },
}

export interface ProfilePickerProps {
  initialProfile?: string | null
  onSaved?: (profile: UserProfile) => void
}

export function ProfilePicker({ initialProfile, onSaved }: ProfilePickerProps) {
  const [selected, setSelected] = useState<string | null>(initialProfile ?? null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<"idle" | "saved" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const router = useRouter()

  // Reset do feedback após 3s
  useEffect(() => {
    if (feedback === "saved" || feedback === "error") {
      const t = setTimeout(() => setFeedback("idle"), 3000)
      return () => clearTimeout(t)
    }
  }, [feedback])

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    setFeedback("idle")
    setErrorMsg("")
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ researchArea: selected }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message ?? `HTTP ${res.status}`)
      }

      // Também atualiza o modo UI pro default do perfil (opcional, mas útil)
      const profile = USER_PROFILES.find(p => p.id === selected)
      if (profile) {
        storeMode(profile.defaultMode)
        onSaved?.(profile)
      }

      setFeedback("saved")
      // refresh pra o server component ProfileWelcomeBanner recarregar
      router.refresh()
    } catch (err) {
      setFeedback("error")
      setErrorMsg(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setSaving(false)
    }
  }

  const hasChanged = selected !== (initialProfile ?? null)

  return (
    <div className="space-y-5" data-testid="profile-picker">
      <div>
        <h3 className="text-base sm:text-lg font-bold text-white">Qual é o seu perfil?</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          A BIA destaca as ferramentas, materiais e módulos certos pra sua área.
          Você pode mudar a qualquer momento.
        </p>
      </div>

      {/* Grid de 6 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {USER_PROFILES.map((profile) => {
          const isActive = selected === profile.id
          const style = ACCENT[profile.accentColor]
          return (
            <button
              key={profile.id}
              type="button"
              onClick={() => setSelected(profile.id)}
              data-testid={`profile-option-${profile.id}`}
              data-selected={isActive ? "true" : "false"}
              className={cn(
                "group relative text-left p-4 rounded-2xl border transition-all",
                "active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-0",
                "focus:ring-offset-transparent",
                isActive
                  ? cn(style.bg, style.borderActive, "ring-2", style.ring, "shadow-lg")
                  : cn("bg-white/[0.02]", style.border, "hover:bg-white/[0.04]"),
              )}
            >
              {/* Check indicator quando selecionado */}
              {isActive && (
                <div className={cn(
                  "absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center",
                  "bg-white/90 shadow-sm",
                )}>
                  <Check className="w-3.5 h-3.5 text-black" strokeWidth={3} />
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-xl shrink-0",
                  "border", style.border, style.bg,
                )}>
                  <span className="text-2xl" aria-hidden>{profile.emoji}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    "text-sm font-semibold leading-snug mb-0.5",
                    isActive ? "text-white" : "text-gray-200",
                  )}>
                    {profile.label}
                  </p>
                  <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-3">
                    {profile.description}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className={cn(
                      "inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border",
                      style.border, style.text, "bg-black/20",
                    )}>
                      modo {profile.defaultMode === "clinical" ? "clínico" : "pesquisador"}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Feedback de erro */}
      {feedback === "error" && (
        <div
          data-testid="profile-picker-error"
          className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300"
        >
          ❌ Erro ao salvar: {errorMsg || "Tente novamente em alguns segundos."}
        </div>
      )}

      {/* Botão de salvar */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!selected || !hasChanged || saving}
          data-testid="profile-picker-save"
          className={cn(
            "flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]",
            !selected || !hasChanged
              ? "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
              : feedback === "saved"
                ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
                : "bg-violet-500 text-white hover:bg-violet-400 shadow-md shadow-violet-900/40",
          )}
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {!saving && feedback === "saved" && <Check className="w-4 h-4" />}
          {!saving && feedback !== "saved" && <Save className="w-4 h-4" />}
          {feedback === "saved"
            ? "Perfil salvo!"
            : saving
              ? "Salvando..."
              : hasChanged
                ? "Salvar perfil"
                : "Nada para salvar"}
        </button>

        {feedback === "saved" && (
          <span className="text-xs text-emerald-400">
            Sua Home foi personalizada ✨
          </span>
        )}
      </div>
    </div>
  )
}
