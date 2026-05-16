"use client"

/**
 * CollapsibleSection — seção colapsável "modo avançado" (R12.3)
 *
 * UX: mantém UI limpa escondendo parâmetros avançados atrás de um disclosure.
 * Usuário clica para expandir quando precisa, mas a página principal fica
 * profissional e sem ruído visual.
 */

import { useState, type ReactNode } from "react"
import { ChevronDown, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils/helpers"

interface CollapsibleSectionProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  /** badge no header (ex.: "AVANÇADO") */
  badge?: string
  badgeColor?: "purple" | "amber" | "cyan" | "emerald" | "rose"
  /** começa aberto? */
  defaultOpen?: boolean
  /** controles extras no header (à direita do título) */
  rightSlot?: ReactNode
  children: ReactNode
  className?: string
}

const BADGE_COLORS: Record<string, string> = {
  purple: "bg-violet-500/15 border-violet-500/30 text-violet-300",
  amber: "bg-amber-500/15 border-amber-500/30 text-amber-300",
  cyan: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
  emerald: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
  rose: "bg-rose-500/15 border-rose-500/30 text-rose-300",
}

export function CollapsibleSection({
  title,
  subtitle,
  icon: Icon,
  badge,
  badgeColor = "purple",
  defaultOpen = false,
  rightSlot,
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className={cn(
      "rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden transition-all",
      open ? "ring-1 ring-violet-500/10" : "",
      className
    )}>
      {/* Header clicável */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className={cn(
          "w-full flex items-center justify-between gap-3 p-5 text-left transition-colors",
          "hover:bg-white/[0.03]"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/25 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-violet-300" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              {badge && (
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                  BADGE_COLORS[badgeColor]
                )}>
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[11px] text-gray-400 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {rightSlot}
          <ChevronDown className={cn(
            "w-5 h-5 text-gray-400 transition-transform",
            open && "rotate-180"
          )} />
        </div>
      </button>

      {/* Conteúdo */}
      {open && (
        <div className="px-5 pb-5 pt-0 border-t border-white/5">
          <div className="pt-4 space-y-4">
            {children}
          </div>
        </div>
      )}
    </section>
  )
}
