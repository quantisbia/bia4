"use client"

/**
 * BIA — Stepper visual das 6 fases de bioimpressão (R24)
 *   1 Modelo de tecido · 2 Biotinta · 3 Fatiamento · 4 Bioimpressão (Host)
 *   · 5 Análise da bioimpressão · 6 Maturação & caracterizações
 *
 * Mostra o progresso atual + permite navegar entre etapas que já estão
 * desbloqueadas. Etapas bloqueadas (sem etapa anterior pronta) ficam
 * desabilitadas com tooltip explicando o porquê.
 *
 * Visual: 6 círculos numerados conectados por linhas. Cada um tem:
 * - cor por status: empty (cinza) · draft (âmbar) · ready (esmeralda)
 * - destaque azul se for a etapa ativa
 * - badge minúsculo com nome do item escolhido (ex.: "esferoide.stl")
 */

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Box, Droplets, Layers, Gamepad2, ClipboardCheck, Beaker, Check, Lock } from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import {
  useBioprintProcess, isStepUnlocked, STEP_ROUTES,
  type BioprintProcessState, type StepStatus, type PhaseKey,
} from "@/lib/bioprint/process-context"
import { listFeedback } from "@/lib/bioprint/print-feedback"

type StepKey = PhaseKey

interface StepDef {
  key: StepKey
  label: string
  shortLabel: string
  number: number
  icon: React.ElementType
  route: string
}

const STEPS: StepDef[] = [
  { key: "model",   number: 1, label: "Modelo de tecido",   shortLabel: "Tecido",    icon: Box,            route: STEP_ROUTES.model   },
  { key: "bioink",  number: 2, label: "Biotinta",           shortLabel: "Biotinta",  icon: Droplets,       route: STEP_ROUTES.bioink  },
  { key: "slice",   number: 3, label: "Fatiamento",         shortLabel: "Fatiar",    icon: Layers,         route: STEP_ROUTES.slice   },
  { key: "control", number: 4, label: "Bioimpressão (Host)", shortLabel: "Host",     icon: Gamepad2,       route: STEP_ROUTES.control },
  { key: "review",  number: 5, label: "Análise",            shortLabel: "Análise",   icon: ClipboardCheck, route: STEP_ROUTES.review  },
  { key: "postBio", number: 6, label: "Maturação",          shortLabel: "Maturação", icon: Beaker,         route: STEP_ROUTES.postBio },
]

/** Rotas que também contam como "estou na Fase 3" (todas vivem no BioSlicer). */
const SLICE_ALIASES = ["/dashboard/bioprint/draw", "/dashboard/bioprint/printability"]

export function BioprintStepper() {
  const router = useRouter()
  const pathname = usePathname()
  const { state } = useBioprintProcess()

  // Fase 5 não tem estado no processo: pronta quando há análise salva.
  const [hasReview, setHasReview] = useState(false)
  useEffect(() => { setHasReview(listFeedback().length > 0) }, [pathname])

  // Determinar fase ativa baseado na URL
  const activeStep: StepKey | null = useMemo(() => {
    for (const s of STEPS) {
      if (pathname?.startsWith(s.route)) return s.key
    }
    if (SLICE_ALIASES.some((r) => pathname?.startsWith(r))) return "slice"
    return null
  }, [pathname])

  return (
    <nav aria-label="Fases do processo de bioimpressão" className="w-full">
      <ol className="flex items-center gap-1 sm:gap-2">
        {STEPS.map((step, idx) => {
          const status: StepStatus = step.key === "review"
            ? (hasReview ? "ready" : "empty")
            : state[step.key].status
          const isActive = activeStep === step.key
          const unlocked = isStepUnlocked(step.key, state)
          const isLast = idx === STEPS.length - 1

          // Label curto do item escolhido na etapa
          const itemLabel = pickItemLabel(step.key, state)

          return (
            <li key={step.key} className="flex items-center flex-1 min-w-0">
              <button
                type="button"
                disabled={!unlocked}
                onClick={() => unlocked && router.push(step.route)}
                className={cn(
                  "group flex items-center gap-2 px-2 sm:px-3 py-2 rounded-xl border transition-all min-w-0",
                  isActive
                    ? "bg-violet-500/15 border-violet-400 ring-1 ring-violet-400/30"
                    : status === "ready"
                      ? "bg-emerald-500/8 border-emerald-500/30 hover:bg-emerald-500/15"
                      : status === "draft"
                        ? "bg-amber-500/8 border-amber-500/25 hover:bg-amber-500/15"
                        : unlocked
                          ? "bg-white/[0.02] border-white/10 hover:bg-white/[0.05]"
                          : "bg-white/[0.01] border-white/5 opacity-50 cursor-not-allowed",
                )}
                title={
                  !unlocked
                    ? `Conclua a fase ${step.number - 1} primeiro`
                    : isActive
                      ? `Você está em: ${step.label}`
                      : `Ir para: ${step.label}`
                }
              >
                {/* Círculo do número */}
                <StepCircle
                  number={step.number}
                  status={status}
                  active={isActive}
                  unlocked={unlocked}
                  icon={step.icon}
                />

                {/* Texto */}
                <div className="hidden lg:flex flex-col items-start min-w-0">
                  <span
                    className={cn(
                      "text-[11px] font-semibold leading-tight",
                      isActive
                        ? "text-violet-100"
                        : status === "ready"
                          ? "text-emerald-200"
                          : status === "draft"
                            ? "text-amber-200"
                            : unlocked
                              ? "text-gray-300"
                              : "text-gray-500"
                    )}
                  >
                    {step.label}
                  </span>
                  {itemLabel && (
                    <span className="text-[9px] text-gray-400 truncate max-w-[120px]">
                      {itemLabel}
                    </span>
                  )}
                </div>

                {/* Label mobile (só o curto) */}
                <span className="lg:hidden text-[10px] font-semibold text-gray-300">
                  {step.shortLabel}
                </span>
              </button>

              {/* Conector entre etapas */}
              {!isLast && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1",
                    status === "ready"
                      ? "bg-gradient-to-r from-emerald-400/60 to-emerald-400/20"
                      : "bg-white/5"
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// ─── Sub-componentes ────────────────────────────────────────────────────

function StepCircle({
  number, status, active, unlocked, icon: Icon,
}: {
  number: number
  status: StepStatus
  active: boolean
  unlocked: boolean
  icon: React.ElementType
}) {
  return (
    <div
      className={cn(
        "w-8 h-8 rounded-full border flex items-center justify-center shrink-0 relative",
        active
          ? "bg-violet-500/20 border-violet-400 text-violet-100"
          : status === "ready"
            ? "bg-emerald-500/20 border-emerald-400 text-emerald-100"
            : status === "draft"
              ? "bg-amber-500/15 border-amber-400/50 text-amber-200"
              : unlocked
                ? "bg-white/5 border-white/15 text-gray-400"
                : "bg-white/5 border-white/10 text-gray-600"
      )}
    >
      {status === "ready" ? (
        <Check className="w-4 h-4" />
      ) : !unlocked ? (
        <Lock className="w-3.5 h-3.5" />
      ) : active ? (
        <Icon className="w-4 h-4" />
      ) : (
        <span className="text-xs font-bold">{number}</span>
      )}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────

function pickItemLabel(key: StepKey, state: BioprintProcessState): string | null {
  switch (key) {
    case "model":   return state.model.name
    case "bioink":  return state.bioink.material
      ? `${state.bioink.material}${state.bioink.concentration != null ? ` ${state.bioink.concentration}%` : ""}`
      : null
    case "slice":   return state.slice.estimate?.totalLayers
      ? `${state.slice.estimate.totalLayers} camadas`
      : state.slice.gcode ? "G-code pronto" : null
    case "control": return state.control.tissueType
    case "review":  return null
    case "postBio": return state.postBio.status === "ready" ? "protocolo" : null
  }
}
