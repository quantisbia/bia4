"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA — G-code Hub (R12.14)
 *  ───────────────────────────────────────────────────────────────────────
 *  Hub central de 3 níveis de geração de G-code:
 *
 *    1. BÁSICO  — /quick-gcode      (5 geometrias paramétricas, < 100 ms)
 *    2. MÉDICO  — /gcode/medical    (tecido-alvo + preview conceitual)
 *    3. AVANÇADO — /gcode/advanced  (NAATIV3 — campo vetorial, multi-material)
 *
 *  Objetivo: o usuário ENXERGA claramente qual nível usar e por quê,
 *  e chega até o final com G-code real, imprimível, fácil de entender.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import Link from "next/link"
import {
  Zap, Microscope, Brain, ArrowRight, Sparkles, CheckCircle2,
  Clock, Layers as LayersIcon, ShieldCheck, GitBranch, Network,
  FlaskConical, Workflow, BookOpen, AlertTriangle, Info,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

interface LevelCard {
  id: "basic" | "medical" | "advanced"
  href: string
  icon: React.ElementType
  emoji: string
  number: string
  badge: string
  badgeColor: string
  title: string
  subtitle: string
  description: string
  whenToUse: string[]
  features: string[]
  speed: string
  complexity: "Baixa" | "Média" | "Alta" | "Muito Alta"
  audience: string
  cta: string
  color: "fuchsia" | "cyan" | "violet"
}

const LEVELS: LevelCard[] = [
  {
    id: "basic",
    href: "/dashboard/bioprint/quick-gcode",
    icon: Zap,
    emoji: "⚡",
    number: "Nível 1",
    badge: "Básico",
    badgeColor: "bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-200",
    title: "Quick G-Code",
    subtitle: "Biotinta + geometria simples → código em < 100 ms",
    description:
      "Para quando você só precisa de um G-code rápido para validar parâmetros, treinar a impressora, ou imprimir formas básicas. Engine síncrono, sem LLM, sem timeout.",
    whenToUse: [
      "Validar reologia de uma biotinta nova",
      "Treinar/calibrar a bioimpressora",
      "Imprimir uma forma simples (cubo, disco, grid, patch, esfera oca)",
      "Quando você JÁ sabe os parâmetros e quer um G-code rápido",
    ],
    features: [
      "5 geometrias paramétricas",
      "3 padrões de infill (rectilinear, concêntrico, oco)",
      "Presets de biotinta Nelson 2021",
      "Análise de imprimibilidade (Score/100)",
      "Viewer 3D embutido",
    ],
    speed: "< 100 ms",
    complexity: "Baixa",
    audience: "Iniciante · Calibração · QC rápido",
    cta: "Gerar G-code rápido",
    color: "fuchsia",
  },
  {
    id: "medical",
    href: "/dashboard/bioprint/gcode/medical",
    icon: Microscope,
    emoji: "🧬",
    number: "Nível 2",
    badge: "Médico",
    badgeColor: "bg-cyan-500/20 border-cyan-500/40 text-cyan-200",
    title: "G-code por Tecido-Alvo",
    subtitle: "Escolha o tecido → BIA decide o toolpath biologicamente correto",
    description:
      "Para quando o que importa é o TECIDO, não a geometria. A BIA mapeia 16 tecidos (pele, miocárdio, osso, cartilagem, nervo, hepático, organoide…) em estratégias de toolpath fiéis à biologia: anisotropia, perfusão, alinhamento, niche.",
    whenToUse: [
      "Você quer um construto miocárdico (não um cubo)",
      "Você quer um array de organoides em placa 96",
      "Você sabe o tecido mas não sabe qual padrão usar",
      "Você precisa de um preview ANTES de gerar o G-code todo",
    ],
    features: [
      "16 tecidos com lógica biológica dominante",
      "3 propostas por tecido (safe · advanced · experimental)",
      "Suporte a placas SBS (6/12/24/96 wells)",
      "Preview conceitual em ~10 ms (camadas, zonas críticas, células totais)",
      "Anisotropia, helicoidal, organoid-niche-array, shell-core, lattice",
      "Score Nelson 2021 + risk briefing por tecido",
    ],
    speed: "Preview ~10 ms · G-code ~50–500 ms",
    complexity: "Média",
    audience: "Pesquisador · Engenheiro tecidual · Médico",
    cta: "Escolher tecido-alvo",
    color: "cyan",
  },
  {
    id: "advanced",
    href: "/dashboard/bioprint/gcode/advanced",
    icon: Brain,
    emoji: "🌐",
    number: "Nível 3",
    badge: "Avançado · NAATIV3",
    badgeColor: "bg-violet-500/20 border-violet-500/40 text-violet-200",
    title: "NAATIV3 Vector Field",
    subtitle: "Toolpath segue o campo direcional do tecido (anisotropia real)",
    description:
      "Framework Nonplanar Architecture-Aligned Toolpathing for In Vitro 3D Bioprinting. Cada filamento integra um campo vetorial f(x,y,z) — axial, radial, helicoidal miocárdico, axonal — e a impressão respeita a anisotropia REAL do tecido. Suporta multi-material, canais sacrificiais, vascularização Murray.",
    whenToUse: [
      "Miocárdio com helicoidal +60°→−60° transmural fiel",
      "Vascularização com Pluronic seguindo lei de Murray (r³ = r₁³+r₂³)",
      "Canais paralelos de perfusão dentro de matriz hidrogel",
      "Tecido com gradiente de propriedades em Z (multi-material stack)",
      "Lattice 3D para máxima difusão de O₂",
    ],
    features: [
      "Pipeline NAATIV3: vector field → streamlines → ordering → G-code",
      "8 presets de campo vetorial + campo customizado",
      "Helicoidal transmural com ângulo interpolado camada-a-camada",
      "Multi-material com até 4 biotintas (T0/T1/T2/T3)",
      "Bifurcação fractal Murray para vascularização",
      "Canais sacrificiais (Pluronic) com pitch configurável",
    ],
    speed: "G-code ~100 ms–2 s · streamlines computadas in-browser",
    complexity: "Muito Alta",
    audience: "Especialista · Lab P&D · Publicação científica",
    cta: "Abrir NAATIV3",
    color: "violet",
  },
]

export default function GcodeHubPage() {
  return (
    <div className="space-y-6">
      {/* ─── Header explicativo ────────────────────────────────────────── */}
      <header className="rounded-2xl bg-gradient-to-br from-fuchsia-500/[0.08] via-cyan-500/[0.06] to-violet-500/[0.08] border border-fuchsia-500/25 p-5">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="w-11 h-11 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center shrink-0">
            <GitBranch className="w-5 h-5 text-fuchsia-300" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-fuchsia-300/80 font-semibold">
              G-code Hub · R12.14
            </span>
            <h1 className="text-lg font-bold text-white mt-0.5">
              Geração de G-code em 3 níveis
            </h1>
            <p className="text-xs text-gray-300 mt-1.5 leading-relaxed max-w-3xl">
              A BIA não gera apenas G-code. Ela <strong className="text-fuchsia-200">transforma biologia em
              trajetória imprimível</strong>. Escolha o nível conforme o que você precisa: forma simples e rápida
              (Básico), construto biologicamente correto por tecido (Médico), ou arquitetura anisotrópica fiel
              ao tecido nativo (Avançado / NAATIV3).
            </p>
          </div>
        </div>

        {/* Princípios */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
          <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-2.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0 mt-0.5" />
            <p className="text-[10.5px] text-emerald-100 leading-snug">
              <strong>G-code real e imprimível</strong> — não apenas demo. Cada um dos 3 níveis chega até o arquivo .gcode pronto para a bioimpressora.
            </p>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.05] p-2.5">
            <BookOpen className="w-3.5 h-3.5 text-cyan-300 shrink-0 mt-0.5" />
            <p className="text-[10.5px] text-cyan-100 leading-snug">
              <strong>Racional biológico</strong> — toda escolha de toolpath, espaçamento e ângulo tem justificativa em literatura (Nelson 2021, Murray, NAATIV3).
            </p>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-violet-500/20 bg-violet-500/[0.05] p-2.5">
            <Sparkles className="w-3.5 h-3.5 text-violet-300 shrink-0 mt-0.5" />
            <p className="text-[10.5px] text-violet-100 leading-snug">
              <strong>Preview antes do G-code</strong> — você verifica se "é aquilo mesmo" em ~10 ms antes de comitir a geração completa.
            </p>
          </div>
        </div>
      </header>

      {/* ─── Cards dos 3 níveis ────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {LEVELS.map((lvl) => (
          <LevelCardEl key={lvl.id} lvl={lvl} />
        ))}
      </section>

      {/* ─── Comparativo rápido ────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Workflow className="w-3.5 h-3.5" /> Comparativo dos 3 níveis
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-2 font-semibold text-gray-400 uppercase text-[9.5px] tracking-wider">Critério</th>
                <th className="text-left py-2 px-2 font-semibold text-fuchsia-300 uppercase text-[9.5px] tracking-wider">⚡ Básico</th>
                <th className="text-left py-2 px-2 font-semibold text-cyan-300 uppercase text-[9.5px] tracking-wider">🧬 Médico</th>
                <th className="text-left py-2 px-2 font-semibold text-violet-300 uppercase text-[9.5px] tracking-wider">🌐 Avançado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                ["Entrada", "Geometria 3D simples", "Tipo de tecido + dimensões", "Tecido + campo vetorial + materiais"],
                ["Velocidade", "< 100 ms", "Preview 10 ms · G-code 50–500 ms", "100 ms – 2 s (streamlines)"],
                ["Biologia", "Ignorada", "16 tecidos com lógica dominante", "Anisotropia real, multi-material"],
                ["Preview antes do G-code", "Direto", "✅ Preview conceitual", "✅ Profile angular + zonas"],
                ["Suporte a placas SBS", "❌", "✅ 6/12/24/96 wells", "❌ (foco em construtos)"],
                ["Multi-material", "❌", "❌", "✅ até 4 biotintas (T0-T3)"],
                ["Canais sacrificiais", "❌", "❌", "✅ Pluronic + Murray"],
                ["Helicoidal transmural", "❌", "Simplificado", "✅ Ângulo interpolado por Z"],
                ["Complexidade do usuário", "Baixa", "Média", "Especialista"],
              ].map((row, i) => (
                <tr key={i} className="hover:bg-white/[0.02]">
                  <td className="py-2 px-2 text-gray-300 font-medium">{row[0]}</td>
                  <td className="py-2 px-2 text-fuchsia-100">{row[1]}</td>
                  <td className="py-2 px-2 text-cyan-100">{row[2]}</td>
                  <td className="py-2 px-2 text-violet-100">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Volta para o hub principal ────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] p-3">
        <Link
          href="/dashboard/bioprint"
          className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowRight className="w-3 h-3 rotate-180" /> Voltar para o hub de Bioimpressão
        </Link>
        <p className="text-[10px] text-gray-500 hidden sm:block">
          Os 3 níveis compartilham o mesmo viewer 3D · download .gcode · análise Nelson 2021
        </p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//   Sub-componentes
// ═══════════════════════════════════════════════════════════════════════

function LevelCardEl({ lvl }: { lvl: LevelCard }) {
  const colorMap = {
    fuchsia: {
      bgGrad: "from-fuchsia-500/[0.08] via-fuchsia-500/[0.04] to-pink-500/[0.04]",
      border: "border-fuchsia-500/25 hover:border-fuchsia-400/60",
      iconBg: "bg-fuchsia-500/15 border-fuchsia-500/30",
      iconText: "text-fuchsia-300",
      title: "group-hover:text-fuchsia-100",
      ctaBg: "bg-fuchsia-500/20 border-fuchsia-400 hover:bg-fuchsia-500/30 text-fuchsia-100",
    },
    cyan: {
      bgGrad: "from-cyan-500/[0.08] via-cyan-500/[0.04] to-blue-500/[0.04]",
      border: "border-cyan-500/25 hover:border-cyan-400/60",
      iconBg: "bg-cyan-500/15 border-cyan-500/30",
      iconText: "text-cyan-300",
      title: "group-hover:text-cyan-100",
      ctaBg: "bg-cyan-500/20 border-cyan-400 hover:bg-cyan-500/30 text-cyan-100",
    },
    violet: {
      bgGrad: "from-violet-500/[0.08] via-violet-500/[0.04] to-fuchsia-500/[0.04]",
      border: "border-violet-500/25 hover:border-violet-400/60",
      iconBg: "bg-violet-500/15 border-violet-500/30",
      iconText: "text-violet-300",
      title: "group-hover:text-violet-100",
      ctaBg: "bg-violet-500/20 border-violet-400 hover:bg-violet-500/30 text-violet-100",
    },
  }[lvl.color]

  return (
    <Link
      href={lvl.href}
      className={cn(
        "group rounded-2xl bg-gradient-to-br border p-5 transition-all hover:scale-[1.01] flex flex-col",
        colorMap.bgGrad, colorMap.border,
      )}
    >
      <header className="flex items-start gap-3 mb-3">
        <div className={cn("w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform", colorMap.iconBg)}>
          <lvl.icon className={cn("w-6 h-6", colorMap.iconText)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9.5px] uppercase tracking-wider text-gray-400 font-semibold">
              {lvl.number}
            </span>
            <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-semibold uppercase tracking-wider", lvl.badgeColor)}>
              {lvl.badge}
            </span>
          </div>
          <h3 className={cn("text-base font-bold text-white mt-0.5 transition-colors", colorMap.title)}>
            {lvl.emoji} {lvl.title}
          </h3>
          <p className="text-[11px] text-gray-300 mt-0.5 leading-snug">
            {lvl.subtitle}
          </p>
        </div>
      </header>

      <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
        {lvl.description}
      </p>

      {/* When to use */}
      <div className="rounded-xl bg-black/20 border border-white/8 p-2.5 mb-3">
        <div className="text-[9.5px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5 flex items-center gap-1">
          <Info className="w-3 h-3" /> Use quando…
        </div>
        <ul className="space-y-1">
          {lvl.whenToUse.map((w, i) => (
            <li key={i} className="text-[10.5px] text-gray-300 flex gap-1.5 leading-snug">
              <span className="text-gray-500">·</span>
              <span className="flex-1">{w}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Features */}
      <div className="mb-3">
        <div className="text-[9.5px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Recursos
        </div>
        <ul className="space-y-0.5">
          {lvl.features.map((f, i) => (
            <li key={i} className="text-[10.5px] text-gray-300 flex gap-1.5 leading-snug">
              <span className="text-emerald-400/60">✓</span>
              <span className="flex-1">{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-1.5 text-[9.5px] mb-3">
        <div className="rounded-lg bg-black/20 border border-white/8 px-2 py-1.5">
          <div className="text-gray-500 uppercase tracking-wide flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> Velocidade
          </div>
          <div className="text-white font-mono mt-0.5">{lvl.speed}</div>
        </div>
        <div className="rounded-lg bg-black/20 border border-white/8 px-2 py-1.5">
          <div className="text-gray-500 uppercase tracking-wide flex items-center gap-1">
            <LayersIcon className="w-2.5 h-2.5" /> Complexidade
          </div>
          <div className="text-white font-mono mt-0.5">{lvl.complexity}</div>
        </div>
      </div>

      <div className="rounded-lg bg-white/[0.03] border border-white/10 px-2.5 py-1.5 mb-3">
        <div className="text-[9px] text-gray-500 uppercase tracking-wide">Para quem</div>
        <div className="text-[10.5px] text-gray-200 mt-0.5">{lvl.audience}</div>
      </div>

      {/* CTA */}
      <div className={cn(
        "mt-auto rounded-xl border text-xs font-semibold px-4 py-2.5 transition-colors flex items-center justify-center gap-1.5",
        colorMap.ctaBg,
      )}>
        {lvl.cta}
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  )
}
