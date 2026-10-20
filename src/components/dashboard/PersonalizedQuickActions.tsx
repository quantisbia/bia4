/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R14.1 · PersonalizedQuickActions
 *  ─────────────────────────────────────────────────────────────────────
 *  Grid de QuickActions reordenado por perfil + traduzido conforme modo UI.
 *  Ações destacadas pro perfil aparecem com um ✨ e borda realçada.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — Out/2026
 * ═══════════════════════════════════════════════════════════════════════
 */
"use client"

import Link from "next/link"
import {
  GitBranch, Printer, FlaskConical, CircleDot, FileText, Microscope,
  MessageSquare, BookOpen, BookMarked, Map as MapIcon, Info, Wrench,
  Sparkles,
} from "lucide-react"
// R14.3 · Sparkles também é usado como ícone de QuickAction (BIA Studio)
import { useUIMode } from "@/lib/user/use-ui-mode"
import { resolveQuickActionsForUser } from "@/lib/user/quick-actions"
import { cn } from "@/lib/utils/helpers"

const ICON_MAP = {
  GitBranch, Printer, FlaskConical, CircleDot, FileText, Microscope,
  MessageSquare, BookOpen, BookMarked, Map: MapIcon, Info, Wrench,
  Sparkles,
} as const

export interface PersonalizedQuickActionsProps {
  researchArea: string | null | undefined
}

export function PersonalizedQuickActions({ researchArea }: PersonalizedQuickActionsProps) {
  const { mode, hydrated } = useUIMode()
  const actions = resolveQuickActionsForUser(researchArea, hydrated ? mode : "researcher")

  return (
    <div data-testid="personalized-quick-actions">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        Ações Rápidas
        <span className="text-[9px] font-medium normal-case text-violet-400/80 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-full">
          personalizadas pro seu perfil
        </span>
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 stagger-children">
        {actions.map((action) => {
          const Icon = ICON_MAP[action.iconName as keyof typeof ICON_MAP] ?? GitBranch
          return (
            <Link
              key={action.id}
              href={action.href}
              data-testid={`quick-action-${action.id}`}
              data-highlighted={action.isHighlighted ? "true" : "false"}
              className={cn(
                "flex items-center gap-3 p-3.5 sm:p-4 rounded-xl bg-white/[0.02] border transition-all group active:scale-[0.97]",
                action.isHighlighted
                  ? "border-violet-500/25 hover:border-violet-500/40 bg-gradient-to-br from-violet-500/[0.06] to-fuchsia-500/[0.03] shadow-sm shadow-violet-500/10"
                  : "border-white/[0.08] hover:border-violet-500/20 hover:bg-violet-500/[0.03]",
              )}
            >
              <div className={cn(
                "w-10 h-10 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center shrink-0",
                `bg-${action.color}-500/10 border-${action.color}-500/20`,
              )}>
                <Icon className={cn("w-4 h-4", `text-${action.color}-400`)} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-xs sm:text-sm font-medium text-white leading-tight truncate">
                    {action.title}
                  </p>
                  {action.isHighlighted && (
                    <Sparkles className="w-3 h-3 text-violet-400 shrink-0" aria-label="Destaque pro seu perfil" />
                  )}
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate">
                  {action.desc}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
