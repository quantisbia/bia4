/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · Manual — Componentes auxiliares compartilhados (R12.41)
 *  ───────────────────────────────────────────────────────────────────────
 *  Box2, StepCard, MiniCard, KeyShortcut, FaqItem, ProTip, Pitfall,
 *  ScreenSpot — usados por todos os capítulos do manual para manter
 *  consistência visual.
 *
 *  Reutilizam exatamente o mesmo design do `manual/page.tsx` original.
 * ═══════════════════════════════════════════════════════════════════════
 */

"use client"

import React from "react"
import { ChevronRight, Lightbulb, AlertTriangle, Keyboard, HelpCircle, MousePointerClick } from "lucide-react"
import { cn } from "@/lib/utils/helpers"

// ─── Box principal (caixa com ícone + título + corpo) ──────────────────
export function Box2({
  icon: Icon, title, tone, children,
}: {
  icon: React.ElementType; title: string
  tone: "info" | "default" | "warn" | "ok" | "emerald" | "cyan" | "amber" | "purple" | "rose"
  children: React.ReactNode
}) {
  const palette = {
    info:    { bg: "from-blue-500/[0.04] to-blue-500/[0.02]",       border: "border-blue-500/15",    iconBg: "bg-blue-500/15 border-blue-500/30",       iconColor: "text-blue-300",    titleColor: "text-blue-100" },
    default: { bg: "from-white/[0.02] to-white/[0.01]",             border: "border-white/8",        iconBg: "bg-white/5 border-white/10",              iconColor: "text-gray-300",    titleColor: "text-white" },
    warn:    { bg: "from-amber-500/[0.04] to-amber-500/[0.02]",     border: "border-amber-500/15",   iconBg: "bg-amber-500/15 border-amber-500/30",     iconColor: "text-amber-300",   titleColor: "text-amber-100" },
    ok:      { bg: "from-emerald-500/[0.04] to-emerald-500/[0.02]", border: "border-emerald-500/15", iconBg: "bg-emerald-500/15 border-emerald-500/30", iconColor: "text-emerald-300", titleColor: "text-emerald-100" },
    emerald: { bg: "from-emerald-500/[0.04] to-emerald-500/[0.02]", border: "border-emerald-500/15", iconBg: "bg-emerald-500/15 border-emerald-500/30", iconColor: "text-emerald-300", titleColor: "text-emerald-100" },
    cyan:    { bg: "from-cyan-500/[0.04] to-cyan-500/[0.02]",       border: "border-cyan-500/15",    iconBg: "bg-cyan-500/15 border-cyan-500/30",       iconColor: "text-cyan-300",    titleColor: "text-cyan-100" },
    amber:   { bg: "from-amber-500/[0.04] to-amber-500/[0.02]",     border: "border-amber-500/15",   iconBg: "bg-amber-500/15 border-amber-500/30",     iconColor: "text-amber-300",   titleColor: "text-amber-100" },
    purple:  { bg: "from-purple-500/[0.04] to-purple-500/[0.02]",   border: "border-purple-500/15",  iconBg: "bg-purple-500/15 border-purple-500/30",   iconColor: "text-purple-300",  titleColor: "text-purple-100" },
    rose:    { bg: "from-rose-500/[0.04] to-rose-500/[0.02]",       border: "border-rose-500/15",    iconBg: "bg-rose-500/15 border-rose-500/30",       iconColor: "text-rose-300",    titleColor: "text-rose-100" },
  }[tone]

  return (
    <section className={cn("rounded-2xl bg-gradient-to-br p-5 sm:p-6 border", palette.bg, palette.border)}>
      <div className="flex items-start gap-3 mb-3">
        <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center shrink-0", palette.iconBg)}>
          <Icon className={cn("w-4 h-4", palette.iconColor)} />
        </div>
        <h3 className={cn("text-base font-bold pt-1.5", palette.titleColor)}>{title}</h3>
      </div>
      <div className="text-sm text-gray-300 leading-relaxed pl-12">{children}</div>
    </section>
  )
}

// ─── Card de passo numerado (1, 2, 3…) ─────────────────────────────────
export function StepCard({
  n, title, icon: Icon, accent, children,
}: {
  n: number; title: string; icon: React.ElementType
  accent: "blue" | "purple" | "amber" | "emerald" | "cyan" | "rose"
  children: React.ReactNode
}) {
  const palette = {
    blue:    { ring: "ring-blue-500/20",    bg: "bg-blue-500/[0.04] border-blue-500/15",       num: "bg-blue-500 text-white",    icon: "text-blue-300" },
    purple:  { ring: "ring-purple-500/20",  bg: "bg-purple-500/[0.04] border-purple-500/15",   num: "bg-purple-500 text-white",  icon: "text-purple-300" },
    amber:   { ring: "ring-amber-500/20",   bg: "bg-amber-500/[0.04] border-amber-500/15",     num: "bg-amber-500 text-black",   icon: "text-amber-300" },
    emerald: { ring: "ring-emerald-500/20", bg: "bg-emerald-500/[0.04] border-emerald-500/15", num: "bg-emerald-500 text-black", icon: "text-emerald-300" },
    cyan:    { ring: "ring-cyan-500/20",    bg: "bg-cyan-500/[0.04] border-cyan-500/15",       num: "bg-cyan-500 text-black",    icon: "text-cyan-300" },
    rose:    { ring: "ring-rose-500/20",    bg: "bg-rose-500/[0.04] border-rose-500/15",       num: "bg-rose-500 text-white",    icon: "text-rose-300" },
  }[accent]

  return (
    <div className={cn("rounded-2xl border p-5 sm:p-6 ring-1", palette.bg, palette.ring)}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0", palette.num)}>
          {n}
        </div>
        <Icon className={cn("w-5 h-5", palette.icon)} />
        <h4 className="text-base font-bold text-white">{title}</h4>
      </div>
      <div className="text-sm text-gray-300 leading-relaxed">{children}</div>
    </div>
  )
}

// ─── Mini card (lista compacta com ChevronRight) ───────────────────────
export function MiniCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/8 p-3">
      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">{title}</div>
      <ul className="space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="text-[11px] text-gray-300 flex items-start gap-1.5">
            <ChevronRight className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Atalho de teclado ─────────────────────────────────────────────────
export function KeyShortcut({ keys, action }: { keys: string[]; action: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1">
        {keys.map((k, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-gray-500 text-[10px]">+</span>}
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-gray-200 font-mono text-[10px] shadow-[inset_0_-1px_0_rgba(0,0,0,0.3)]">
              {k}
            </kbd>
          </React.Fragment>
        ))}
      </div>
      <span className="text-gray-400">{action}</span>
    </div>
  )
}

// ─── Dica pro (estilo destaque amarelo) ────────────────────────────────
export function ProTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-amber-500/[0.05] border border-amber-500/20 px-3 py-2.5 mt-3">
      <Lightbulb className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
      <div className="text-xs text-amber-100/90 leading-relaxed">
        <strong className="text-amber-200">Dica Pro:</strong> {children}
      </div>
    </div>
  )
}

// ─── Armadilha (erro comum a evitar) ───────────────────────────────────
export function Pitfall({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-rose-500/[0.05] border border-rose-500/20 px-3 py-2.5 mt-3">
      <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
      <div className="text-xs text-rose-100/90 leading-relaxed">
        <strong className="text-rose-200">Cuidado:</strong> {children}
      </div>
    </div>
  )
}

// ─── FAQ item (pergunta + resposta) ────────────────────────────────────
export function FaqItem({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/8 p-3">
      <div className="flex items-start gap-2 mb-1.5">
        <HelpCircle className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
        <strong className="text-[12px] text-white">{q}</strong>
      </div>
      <div className="text-[11px] text-gray-300 leading-relaxed pl-5">{children}</div>
    </div>
  )
}

// ─── Indicação de onde clicar na tela ──────────────────────────────────
export function ScreenSpot({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-cyan-500/[0.05] border border-cyan-500/15 px-2.5 py-2 my-2">
      <MousePointerClick className="w-3.5 h-3.5 text-cyan-300 shrink-0 mt-0.5" />
      <span className="text-[11px] text-cyan-100/90 leading-relaxed">{children}</span>
    </div>
  )
}

// ─── Capa de capítulo (cabeçalho padronizado) ──────────────────────────
export function ChapterCover({
  number, badge, title, icon: Icon, gradient, lead, href, hrefLabel, readMin, cost,
}: {
  number: number
  badge?: string
  title: string
  icon: React.ElementType
  gradient: string // ex: "from-blue-500/15 to-purple-500/15 border-blue-500/20"
  lead: React.ReactNode
  href?: string
  hrefLabel?: string
  readMin: number
  cost?: string
}) {
  return (
    <div className={cn("rounded-2xl bg-gradient-to-br p-6 sm:p-8 border", gradient)}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[10px] px-2 py-0.5 bg-emerald-500/15 text-emerald-300 rounded font-mono uppercase">
          Capítulo {number}
        </span>
        {badge && (
          <span className="text-[10px] px-2 py-0.5 bg-blue-500/15 text-blue-300 rounded font-mono uppercase">
            {badge}
          </span>
        )}
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-3">
        <Icon className="w-7 h-7 text-blue-300" />
        {title}
      </h2>
      <div className="text-sm sm:text-base text-blue-100/80 leading-relaxed">{lead}</div>
      <div className="flex flex-wrap gap-2 mt-4">
        {href && hrefLabel && (
          <a
            href={href}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" /> {hrefLabel}
          </a>
        )}
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400">
          ☕ {readMin} min de leitura
        </span>
        {cost && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
            💎 {cost}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Indicador de "Onde fica" — para navegação ────────────────────────
export function WhereIs({ path }: { path: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/10 border border-violet-500/25 px-2.5 py-1 text-[11px] font-mono text-violet-200">
      <span className="text-violet-400">📍</span>
      {path}
    </div>
  )
}
