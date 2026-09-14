"use client"

/**
 * BIA · Academy · WelcomeForm (onboarding 3 perguntas) — R13.02
 *
 * Contrato:
 *  - PATCH /api/academy/onboarding com { preferredArea, experienceLevel, mainGoal }
 *  - Aluno pode pular (botão secundário → PATCH { skip: true })
 *  - Após sucesso, redireciona para /dashboard/notebook?from=academy-welcome
 *    (dashboard do aluno propriamente dito virá no R13.03)
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  GraduationCap, ArrowRight, Loader2, AlertTriangle, SkipForward,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

const AREAS = [
  { value: "biofabricacao",         label: "Biofabricação" },
  { value: "bioimpressao",          label: "Bioimpressão 3D" },
  { value: "engenharia-tecidual",   label: "Engenharia tecidual" },
  { value: "biomateriais",          label: "Biomateriais" },
  { value: "odontologia",           label: "Odontologia" },
  { value: "medicina-regenerativa", label: "Medicina regenerativa" },
  { value: "cosmeticos",            label: "Cosméticos" },
  { value: "farmaceutica",          label: "Farmacêutica" },
  { value: "biotecnologia",         label: "Biotecnologia" },
  { value: "saude-animal",          label: "Saúde animal" },
  { value: "universidade",          label: "Universidade" },
  { value: "pd-empresarial",        label: "P&D empresarial" },
  { value: "outra",                 label: "Outra" },
]

const LEVELS = [
  { value: "iniciante",     label: "Iniciante",     hint: "Estou começando na área" },
  { value: "intermediario", label: "Intermediário", hint: "Tenho alguma experiência" },
  { value: "avancado",      label: "Avançado",      hint: "Trabalho na área há tempo" },
]

const GOALS = [
  { value: "formacao-academica",     label: "Formação acadêmica" },
  { value: "aplicacao-clinica",      label: "Aplicação clínica" },
  { value: "pesquisa",               label: "Pesquisa em bioimpressão" },
  { value: "empreender",             label: "Empreender / P&D empresarial" },
  { value: "atualizacao-profissional", label: "Atualização profissional" },
  { value: "outro",                  label: "Outro" },
]

interface OnboardingPayload {
  preferredArea?: string | null
  experienceLevel?: string | null
  mainGoal?: string | null
  skipped?: boolean
  answeredAt?: string
}

export function WelcomeForm({
  userName,
  initial,
}: {
  userName: string | null
  initial: OnboardingPayload | null
}) {
  const router = useRouter()
  const [preferredArea, setPreferredArea]     = useState<string>(initial?.preferredArea ?? "")
  const [experienceLevel, setExperienceLevel] = useState<string>(initial?.experienceLevel ?? "")
  const [mainGoal, setMainGoal]               = useState<string>(initial?.mainGoal ?? "")
  const [busy, setBusy] = useState<null | "save" | "skip">(null)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = preferredArea && experienceLevel && mainGoal

  const track = (event: string, metadata?: Record<string, unknown>) => {
    fetch("/api/academy/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, path: "/academy/welcome", metadata }),
      keepalive: true,
    }).catch(() => {})
  }

  const submit = async (mode: "save" | "skip") => {
    setBusy(mode)
    setError(null)
    try {
      const body =
        mode === "skip"
          ? { skip: true }
          : {
              preferredArea: preferredArea || null,
              experienceLevel: experienceLevel || null,
              mainGoal: mainGoal || null,
            }
      const res = await fetch("/api/academy/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error ?? `Falha (${res.status})`)
      }
      track(mode === "skip" ? "onboarding_skipped" : "onboarding_completed", {
        preferredArea,
        experienceLevel,
        mainGoal,
      })
      router.push("/dashboard/notebook?from=academy-welcome")
    } catch (e) {
      setError((e as Error).message)
      setBusy(null)
    }
  }

  const firstName = userName?.split(" ")[0] ?? ""

  return (
    <div className="min-h-screen bg-[#0a0514] text-white flex items-start sm:items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        {/* Logo + saudação */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">
              BIA <span className="text-violet-300">Academy</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            {firstName ? `Bem-vindo(a), ${firstName}! 🎓` : "Bem-vindo(a) à BIA Academy 🎓"}
          </h1>
          <p className="text-sm sm:text-base text-gray-400 max-w-lg mx-auto">
            3 perguntas rápidas (opcionais) para personalizar sua jornada.
            Você pode pular por agora e responder depois.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-8 space-y-6">
          {/* Q1 — Área */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              1. Qual sua área principal?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AREAS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setPreferredArea(a.value)}
                  className={cn(
                    "text-left px-3 py-2 rounded-lg border text-xs sm:text-sm transition-all",
                    preferredArea === a.value
                      ? "border-violet-500/50 bg-violet-500/15 text-white"
                      : "border-white/10 bg-white/[0.02] text-gray-300 hover:bg-white/5",
                  )}
                  data-testid={`welcome-area-${a.value}`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Q2 — Nível */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              2. Seu nível de experiência?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setExperienceLevel(l.value)}
                  className={cn(
                    "text-left p-3 rounded-lg border transition-all",
                    experienceLevel === l.value
                      ? "border-violet-500/50 bg-violet-500/15"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/5",
                  )}
                  data-testid={`welcome-level-${l.value}`}
                >
                  <div className="text-sm font-medium text-white">{l.label}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{l.hint}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Q3 — Meta */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              3. Qual sua meta principal?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {GOALS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setMainGoal(g.value)}
                  className={cn(
                    "text-left px-3 py-2.5 rounded-lg border text-sm transition-all",
                    mainGoal === g.value
                      ? "border-violet-500/50 bg-violet-500/15 text-white"
                      : "border-white/10 bg-white/[0.02] text-gray-300 hover:bg-white/5",
                  )}
                  data-testid={`welcome-goal-${g.value}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-300">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Ações */}
          <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-2">
            <button
              onClick={() => submit("skip")}
              disabled={busy !== null}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/5 text-gray-300 hover:text-white text-sm font-medium px-4 py-2.5 disabled:opacity-50"
              data-testid="welcome-skip"
            >
              {busy === "skip" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <SkipForward className="w-4 h-4" />
              )}
              Pular por agora
            </button>
            <button
              onClick={() => submit("save")}
              disabled={!canSubmit || busy !== null}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-semibold px-6 py-2.5 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="welcome-submit"
            >
              {busy === "save" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              Começar minha jornada
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
