/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ScientificRefsPanel — Base de Conhecimento BIA (R12.8)
 *
 *  Exibe os 5 papers canônicos que fundamentam o Toolpath Intelligence Engine,
 *  com:
 *    - Filtros por categoria
 *    - Lista de contribuições/fórmulas
 *    - Link para PDF (genspark file wrapper)
 *    - Citação compacta (autor, ano)
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

"use client"

import { useState } from "react"
import {
  BookOpen, ExternalLink, Quote, FileText, Sparkles,
  Activity, GitBranch, Network, Cpu, FlaskConical,
} from "lucide-react"
import { SCIENTIFIC_REFS, type ScientificRef } from "@/lib/bioprint/scientific-refs"
import { cn } from "@/lib/utils/helpers"

type Category = ScientificRef["category"] | "all"
type ColorKey = "violet" | "cyan" | "emerald" | "amber" | "rose"

// ─── Mapa ESTÁTICO de classes Tailwind (necessário p/ JIT funcionar) ──────
// Tailwind JIT escaneia arquivos por strings literais — `bg-${x}-500/15`
// não é detectado e a classe é purgada. Mantenha tudo expandido aqui.
const COLOR_CLASSES: Record<ColorKey, {
  iconBg: string
  iconText: string
  borderActive: string
  conceptChip: string
  bullet: string
  chipActive: string
}> = {
  violet: {
    iconBg: "bg-violet-500/15 border-violet-500/30",
    iconText: "text-violet-300",
    borderActive: "border-violet-500/40",
    conceptChip: "bg-violet-500/10 border border-violet-500/20 text-violet-200",
    bullet: "text-violet-300",
    chipActive: "bg-violet-500/25 border border-violet-500/50 text-white",
  },
  cyan: {
    iconBg: "bg-cyan-500/15 border-cyan-500/30",
    iconText: "text-cyan-300",
    borderActive: "border-cyan-500/40",
    conceptChip: "bg-cyan-500/10 border border-cyan-500/20 text-cyan-200",
    bullet: "text-cyan-300",
    chipActive: "bg-cyan-500/25 border border-cyan-500/50 text-white",
  },
  emerald: {
    iconBg: "bg-emerald-500/15 border-emerald-500/30",
    iconText: "text-emerald-300",
    borderActive: "border-emerald-500/40",
    conceptChip: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-200",
    bullet: "text-emerald-300",
    chipActive: "bg-emerald-500/25 border border-emerald-500/50 text-white",
  },
  amber: {
    iconBg: "bg-amber-500/15 border-amber-500/30",
    iconText: "text-amber-300",
    borderActive: "border-amber-500/40",
    conceptChip: "bg-amber-500/10 border border-amber-500/20 text-amber-200",
    bullet: "text-amber-300",
    chipActive: "bg-amber-500/25 border border-amber-500/50 text-white",
  },
  rose: {
    iconBg: "bg-rose-500/15 border-rose-500/30",
    iconText: "text-rose-300",
    borderActive: "border-rose-500/40",
    conceptChip: "bg-rose-500/10 border border-rose-500/20 text-rose-200",
    bullet: "text-rose-300",
    chipActive: "bg-rose-500/25 border border-rose-500/50 text-white",
  },
}

const CATEGORY_META: Record<ScientificRef["category"], {
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: ColorKey
}> = {
  toolpath:              { label: "Toolpath & Flow",     icon: GitBranch,    color: "violet"  },
  "ml-bioprinting":      { label: "ML Bioprinting",      icon: Cpu,          color: "cyan"    },
  "vector-field":        { label: "Vector-field",        icon: Network,      color: "emerald" },
  "low-cost-printer":    { label: "Open-source HW",      icon: FlaskConical, color: "amber"   },
  "perfusable-scaffold": { label: "FRESH / Perfusable",  icon: Activity,     color: "rose"    },
}

export function ScientificRefsPanel() {
  const [filter, setFilter] = useState<Category>("all")
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = filter === "all" ? SCIENTIFIC_REFS : SCIENTIFIC_REFS.filter(r => r.category === filter)

  return (
    <div className="space-y-3">
      {/* HEADER */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-amber-300" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            Base Científica BIA
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-semibold uppercase tracking-wider">
              5 papers · curados
            </span>
          </h3>
          <p className="text-[10px] text-gray-500">
            Fundamentação científica do Toolpath Intelligence Engine
          </p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} color="violet">
          Todos · {SCIENTIFIC_REFS.length}
        </FilterChip>
        {(Object.keys(CATEGORY_META) as Array<ScientificRef["category"]>).map((c) => {
          const meta = CATEGORY_META[c]
          const count = SCIENTIFIC_REFS.filter(r => r.category === c).length
          const Icon = meta.icon
          return (
            <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)} color={meta.color}>
              <Icon className="w-3 h-3" />
              {meta.label} · {count}
            </FilterChip>
          )
        })}
      </div>

      {/* LISTA */}
      <div className="space-y-2">
        {filtered.map((r) => {
          const meta = CATEGORY_META[r.category]
          const colors = COLOR_CLASSES[meta.color]
          const Icon = meta.icon
          const isOpen = expanded === r.id
          return (
            <div
              key={r.id}
              className={cn(
                "rounded-xl border bg-black/30 overflow-hidden transition-all",
                isOpen ? colors.borderActive : "border-white/10 hover:border-white/20",
              )}
            >
              <button
                onClick={() => setExpanded(isOpen ? null : r.id)}
                className="w-full text-left p-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0",
                  colors.iconBg,
                )}>
                  <Icon className={cn("w-4 h-4", colors.iconText)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-[12px] font-semibold text-white leading-tight">
                      {r.title}
                    </h4>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-gray-400 font-mono shrink-0">
                      {r.year}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-gray-400 mt-0.5">
                    {r.authors} · <em>{r.journal}</em>
                  </p>
                  <p className="text-[10.5px] text-gray-300 mt-1.5 leading-relaxed">
                    {r.shortAbstract}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {r.keyConcepts.slice(0, isOpen ? 999 : 3).map((c) => (
                      <span
                        key={c}
                        className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                          colors.conceptChip,
                        )}
                      >
                        {c}
                      </span>
                    ))}
                    {!isOpen && r.keyConcepts.length > 3 && (
                      <span className="text-[9px] text-gray-500">+{r.keyConcepts.length - 3}</span>
                    )}
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-3">
                  {/* Contribuições técnicas */}
                  <div>
                    <h5 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> Contribuições técnicas incorporadas na BIA
                    </h5>
                    <ul className="text-[10.5px] text-gray-300 space-y-1">
                      {r.contributions.map((c, i) => (
                        <li key={i} className="flex gap-2">
                          <span className={cn("font-mono", colors.bullet)}>•</span>
                          <code className="font-mono text-[10px] text-white/90">{c}</code>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Citação compacta */}
                  <div className="rounded-lg bg-white/[0.03] border border-white/10 p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Quote className="w-3 h-3 text-gray-500" />
                      <span className="text-[9.5px] uppercase tracking-wider text-gray-500 font-semibold">
                        Como citar
                      </span>
                    </div>
                    <code className="text-[10px] text-cyan-200 font-mono leading-relaxed block break-all">
                      {r.authors} ({r.year}). {r.title}. <em>{r.journal}</em>. doi: <a href={`https://doi.org/${r.doi}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-cyan-100">{r.doi}</a>
                    </code>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2">
                    <a
                      href={r.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-100 text-[11px] font-semibold transition-colors"
                    >
                      <FileText className="w-3 h-3" />
                      Ver PDF completo
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                    <a
                      href={`https://doi.org/${r.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-gray-300 text-[11px] font-medium transition-colors"
                    >
                      DOI
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* FOOTER */}
      <div className="rounded-xl bg-gradient-to-br from-violet-500/[0.06] to-amber-500/[0.03] border border-violet-500/20 p-3">
        <p className="text-[10.5px] text-gray-400 leading-relaxed">
          <strong className="text-violet-200">Filosofia BIA:</strong> toda métrica e algoritmo do Toolpath Intelligence Engine
          é citável e baseado em literatura científica. Os 5 papers acima
          fundamentam respectivamente: T-code/Eulerian (van der Valk),
          ML/optim. (Shin), vector-field (Griffin/NAATIV3), open-source HW (Gusmão),
          FRESH/perfusion (Shiwarski/CHIPS).
        </p>
      </div>
    </div>
  )
}

function FilterChip({
  children, active, onClick, color = "violet",
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  color?: ColorKey
}) {
  const colors = COLOR_CLASSES[color]
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-medium transition-all",
        active
          ? colors.chipActive
          : "bg-white/[0.03] border border-white/10 text-gray-400 hover:text-white hover:border-white/20",
      )}
    >
      {children}
    </button>
  )
}
