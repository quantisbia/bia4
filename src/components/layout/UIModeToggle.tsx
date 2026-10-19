/**
 * BIA v4 · R14.1 · Toggle "Modo Clínico" ↔ "Modo Pesquisador"
 *
 * Pílula compacta no header do dashboard. Usuário clica → troca modo
 * em toda a plataforma. Preferência persiste no localStorage.
 */
"use client"

import { Stethoscope, Microscope } from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { useUIMode } from "@/lib/user/use-ui-mode"

export function UIModeToggle({ compact = false }: { compact?: boolean }) {
  const { mode, toggle, hydrated } = useUIMode()

  // Antes de hidratar, renderiza placeholder neutro (evita hydration mismatch)
  if (!hydrated) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.02]",
          compact ? "p-0.5" : "p-1",
        )}
        aria-hidden
      >
        <div className={cn("rounded-full bg-white/5", compact ? "h-6 w-24" : "h-7 w-32")} />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Modo atual: ${mode === "clinical" ? "Clínico" : "Pesquisador"}. Clique para alternar.`}
      title={`Mudar para modo ${mode === "clinical" ? "Pesquisador" : "Clínico"}`}
      data-testid="ui-mode-toggle"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border bg-white/[0.03] backdrop-blur",
        "transition-colors hover:bg-white/[0.06]",
        compact ? "p-0.5 border-white/10" : "p-1 border-white/[0.08]",
      )}
    >
      {/* Opção CLINICAL */}
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full transition-all",
          compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
          "font-medium",
          mode === "clinical"
            ? "bg-gradient-to-r from-sky-500/25 to-cyan-500/20 text-sky-200 shadow-sm shadow-sky-500/20"
            : "text-gray-500 hover:text-gray-300",
        )}
      >
        <Stethoscope className={cn(compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
        {!compact && <span>Clínico</span>}
      </span>

      {/* Opção RESEARCHER */}
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full transition-all",
          compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
          "font-medium",
          mode === "researcher"
            ? "bg-gradient-to-r from-violet-500/25 to-fuchsia-500/20 text-violet-200 shadow-sm shadow-violet-500/20"
            : "text-gray-500 hover:text-gray-300",
        )}
      >
        <Microscope className={cn(compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
        {!compact && <span>Pesquisador</span>}
      </span>
    </button>
  )
}
