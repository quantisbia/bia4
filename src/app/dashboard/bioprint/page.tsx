"use client"

/**
 * BIA — Hub do Processo de Bioimpressão
 *
 * Ponto de entrada do fluxo de 4 etapas. Mostra:
 *  - Visão geral do processo (cards das 4 etapas com status)
 *  - Botão "Começar / Continuar" que leva à próxima etapa pendente
 *  - Resumo do que já foi configurado (se houver)
 *  - Opção de resetar tudo
 *
 * NÃO duplica conteúdo das etapas — apenas orquestra. Cada card é
 * um link para a sub-rota correspondente.
 */

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Box, Droplets, Layers, Gamepad2, Beaker,
  ArrowRight, RotateCcw, Sparkles, Info, CheckCircle2, Circle,
  Brain, BookOpen, Zap,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import {
  useBioprintProcess, isStepUnlocked, STEP_LABELS,
  type BioprintProcessState, type StepStatus,
} from "@/lib/bioprint/process-context"

type StepKey = keyof BioprintProcessState

interface StepCardDef {
  key: StepKey
  number: number
  title: string
  short: string
  description: string
  icon: React.ElementType
  route: string
  color: "emerald" | "cyan" | "violet" | "amber" | "rose"
}

const STEP_CARDS: StepCardDef[] = [
  {
    key: "model",
    number: 1,
    title: "Modelo 3D",
    short: STEP_LABELS.model,
    description:
      "Upload de STL/OBJ/PLY OU geração de geometria a partir de 5 categorias: tecidos moles, rígidos, biomiméticos (TPMS), testes de imprimibilidade e organoides/vascularização.",
    icon: Box,
    route: "/dashboard/bioprint/model",
    color: "emerald",
  },
  {
    key: "bioink",
    number: 2,
    title: "Biotinta",
    short: STEP_LABELS.bioink,
    description:
      "Formulação do hidrogel: material base (GelMA, alginato, colágeno...), concentração, crosslinker, células e aditivos. Sugestões do banco de literatura + simulação reológica.",
    icon: Droplets,
    route: "/dashboard/bioprint/bioink",
    color: "cyan",
  },
  {
    key: "slice",
    number: 3,
    title: "Fatiamento",
    short: STEP_LABELS.slice,
    description:
      "Motor de G-code: altura de camada, velocidade, pressão, padrão de infill BIO (parallel, gradient, vascular sacrificial, FRESH, esferoides). Estimativa de tempo e volume.",
    icon: Layers,
    route: "/dashboard/bioprint/slice",
    color: "violet",
  },
  {
    key: "control",
    number: 4,
    title: "Execução",
    short: STEP_LABELS.control,
    description:
      "Painel de controle da bioimpressora: joystick 3D em primeiro plano, conexão USB (Web Serial / Marlin), extrusão fluida (avançado), viabilidade celular live (Blaeser 2016).",
    icon: Gamepad2,
    route: "/dashboard/bioprint/control",
    color: "amber",
  },
  {
    key: "postBio",
    number: 5,
    title: "Pós-Bioimpressão",
    short: STEP_LABELS.postBio,
    description:
      "Tipo de tecido alvo + protocolos pós-impressão: cultura, crosslink, biorreator (perfusão/agitação) e validação (Live/Dead, AlamarBlue, immunostaining). Protocolos por tecido: cardíaco · ósseo · cartilagem · vaso · pele · nervo · hepático.",
    icon: Beaker,
    route: "/dashboard/bioprint/post",
    color: "rose",
  },
]

export default function BioprintHubPage() {
  const router = useRouter()
  const { state, nextStep, resetAll } = useBioprintProcess()

  // Quantas etapas já estão prontas?
  const readyCount = (Object.keys(state) as StepKey[]).filter(
    (k) => state[k].status === "ready"
  ).length
  const totalSteps = STEP_CARDS.length
  const progressPercent = Math.round((readyCount / totalSteps) * 100)

  const nextStepDef = STEP_CARDS.find((s) => s.key === nextStep)
  const allReady = readyCount === totalSteps

  const handleReset = () => {
    if (confirm("Deseja realmente reiniciar o processo? Todas as configurações das 5 etapas serão apagadas (sem afetar arquivos salvos).")) {
      resetAll()
    }
  }

  return (
    <div className="bia-hub-page space-y-6">
      {/* ─── Banner explicativo ────────────────────────────────────── */}
      <section className="rounded-2xl bg-gradient-to-br from-emerald-500/8 via-cyan-500/8 to-violet-500/8 border border-emerald-500/20 p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white mb-1">
              Bioimpressão de ponta a ponta — em 5 etapas
            </h2>
            <p className="text-xs text-gray-300 leading-relaxed">
              Este é o processo unificado de bioimpressão da BIA. Cada etapa alimenta a próxima:
              o <strong className="text-emerald-200">modelo 3D</strong> define a geometria,
              a <strong className="text-cyan-200">biotinta</strong> define propriedades reológicas e celulares,
              o <strong className="text-violet-200">fatiamento</strong> gera o G-code respeitando ambos,
              a <strong className="text-amber-200">execução</strong> controla a impressora com viabilidade live,
              e a <strong className="text-rose-200">pós-bioimpressão</strong> cuida do tecido até maturar (cultura, biorreator, assays).
            </p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1.5 uppercase tracking-wider">
            <span>Progresso do processo</span>
            <span>{readyCount} de {totalSteps} etapas prontas</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </section>

      {/* ─── Próxima ação sugerida ─────────────────────────────────── */}
      {nextStepDef && !allReady && (
        <section className="rounded-2xl bg-violet-500/10 border border-violet-500/30 p-4 flex items-center gap-4 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center shrink-0">
            <nextStepDef.icon className="w-5 h-5 text-violet-200" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-violet-300 uppercase tracking-wider">
              Próximo passo sugerido
            </div>
            <div className="text-sm font-semibold text-white">
              {readyCount === 0 ? "Comece pela Etapa" : "Continue na Etapa"} {nextStepDef.number} — {nextStepDef.title}
            </div>
          </div>
          <button
            onClick={() => router.push(nextStepDef.route)}
            className="px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-400 hover:bg-violet-500/30 text-violet-100 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            {readyCount === 0 ? "Começar" : "Continuar"} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </section>
      )}

      {allReady && (
        <section className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-center gap-4 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-emerald-300 uppercase tracking-wider">
              Tudo pronto
            </div>
            <div className="text-sm font-semibold text-white">
              Todas as 5 etapas estão configuradas. Você pode imprimir agora.
            </div>
          </div>
          <button
            onClick={() => router.push("/dashboard/bioprint/control")}
            className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400 hover:bg-emerald-500/30 text-emerald-100 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            Ir para Execução <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </section>
      )}

      {/* ─── Cards das 4 etapas ────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {STEP_CARDS.map((card) => {
          const stepState = state[card.key]
          const unlocked = isStepUnlocked(card.key, state)
          return (
            <StepCard
              key={card.key}
              card={card}
              status={stepState.status}
              unlocked={unlocked}
              summary={summaryFor(card.key, state)}
            />
          )
        })}
      </section>

      {/* ─── Atalho rápido · Quick G-Code (R12.12) ────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-fuchsia-500/30 to-transparent" />
          <span className="text-[10px] uppercase tracking-[0.25em] text-fuchsia-300/70 font-semibold flex items-center gap-1.5">
            <Zap className="w-3 h-3" />
            Atalho rápido · Quick G-Code
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-fuchsia-500/30 via-transparent to-transparent" />
        </div>

        <Link
          href="/dashboard/bioprint/quick-gcode"
          className="group block rounded-2xl bg-gradient-to-br from-fuchsia-500/[0.08] via-violet-500/[0.05] to-cyan-500/[0.04] border border-fuchsia-500/25 hover:border-fuchsia-400/50 p-5 transition-all hover:scale-[1.005]"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Zap className="w-6 h-6 text-fuchsia-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-fuchsia-300/80 font-semibold">
                  Engine síncrono · R12.12
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 font-semibold uppercase tracking-wider">
                  &lt; 100 ms
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-semibold uppercase tracking-wider">
                  Sem timeout
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5 group-hover:text-fuchsia-100 transition-colors">
                Quick G-Code · biotinta + modelo simples → código pronto
              </h3>
              <p className="text-[11.5px] text-gray-300 mt-1.5 leading-relaxed">
                Fluxo simplificado de 3 passos para gerar G-code em menos de 100 ms.
                Escolha a biotinta (preset ou vinda do <strong className="text-blue-300">Formulator Pro</strong>),
                pegue uma das 5 geometrias paramétricas (cubo, disco, grid, patch, esfera oca)
                e ajuste o infill — o código sai instantâneo, sem LLM, sem timeout de 45 s. Ideal
                para validar parâmetros, treinar a impressora e imprimir formas básicas.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-200">
                  ⚡ Síncrono &lt; 100 ms
                </span>
                <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-200">
                  🧪 Vem do Formulator Pro
                </span>
                <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
                  🧱 5 geometrias básicas
                </span>
                <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-200">
                  👁 Viewer 3D embutido
                </span>
                <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-200">
                  📖 Racional em PT
                </span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-fuchsia-300/60 group-hover:text-fuchsia-200 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
          </div>
        </Link>
      </section>

      {/* ─── Ferramentas auxiliares · BTIE ────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
          <span className="text-[10px] uppercase tracking-[0.25em] text-violet-300/70 font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Ferramentas Auxiliares · BTIE
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-violet-500/30 via-transparent to-transparent" />
        </div>

        <Link
          href="/dashboard/bioprint/toolpath"
          className="group block rounded-2xl bg-gradient-to-br from-violet-500/[0.08] via-cyan-500/[0.04] to-violet-500/[0.02] border border-violet-500/25 hover:border-violet-400/50 p-5 transition-all hover:scale-[1.005]"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Brain className="w-6 h-6 text-violet-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-violet-300/80 font-semibold">
                  Engine proprietário · R12.8
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <BookOpen className="w-2.5 h-2.5" /> 5 papers
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5 group-hover:text-violet-100 transition-colors">
                Biofabrication Toolpath Intelligence Engine
              </h3>
              <p className="text-[11.5px] text-gray-300 mt-1.5 leading-relaxed">
                Visualizador 3D científico · análise de shear (Hagen-Poiseuille) · predição de falhas · geração
                de scaffolds biomiméticos (Gyroid TPMS, Voronoi, Concentric perfusable, Vector-field NAATIV3).
                Engine fundamentado em 5 papers canônicos de bioimpressão.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-200">
                  📊 Viewer 3D Canvas2D
                </span>
                <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-200">
                  🧬 Shear · Viabilidade
                </span>
                <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
                  🎯 Predição de falhas
                </span>
                <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-200">
                  🔬 Infill biomimético
                </span>
                <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-200">
                  📚 Base científica
                </span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-violet-300/60 group-hover:text-violet-200 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
          </div>
        </Link>
      </section>

      {/* ─── Ações secundárias ─────────────────────────────────────── */}
      <section className="rounded-2xl bg-white/[0.02] border border-white/5 p-4 flex flex-wrap items-center gap-3">
        <Info className="w-4 h-4 text-gray-400 shrink-0" />
        <p className="text-xs text-gray-400 flex-1 min-w-0">
          O estado das 5 etapas é mantido na sua sessão (sessionStorage). Fechar a aba reinicia tudo.
        </p>
        {readyCount > 0 && (
          <button
            onClick={handleReset}
            className="text-[11px] px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-rose-300 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3 h-3" /> Reiniciar processo
          </button>
        )}
      </section>
    </div>
  )
}

// ─── Sub-componentes ────────────────────────────────────────────────────

function StepCard({
  card, status, unlocked, summary,
}: {
  card: StepCardDef
  status: StepStatus
  unlocked: boolean
  summary: string | null
}) {
  const colorMap = {
    emerald: { bg: "from-emerald-500/8 to-emerald-500/2", border: "border-emerald-500/20",  iconBg: "bg-emerald-500/15 border-emerald-500/30",  iconText: "text-emerald-300",  title: "group-hover:text-emerald-100", num: "text-emerald-200/70" },
    cyan:    { bg: "from-cyan-500/8 to-cyan-500/2",       border: "border-cyan-500/20",     iconBg: "bg-cyan-500/15 border-cyan-500/30",        iconText: "text-cyan-300",     title: "group-hover:text-cyan-100",    num: "text-cyan-200/70" },
    violet:  { bg: "from-violet-500/8 to-violet-500/2",   border: "border-violet-500/20",   iconBg: "bg-violet-500/15 border-violet-500/30",    iconText: "text-violet-300",   title: "group-hover:text-violet-100",  num: "text-violet-200/70" },
    amber:   { bg: "from-amber-500/8 to-amber-500/2",     border: "border-amber-500/20",    iconBg: "bg-amber-500/15 border-amber-500/30",      iconText: "text-amber-300",    title: "group-hover:text-amber-100",   num: "text-amber-200/70" },
    rose:    { bg: "from-rose-500/8 to-rose-500/2",       border: "border-rose-500/20",     iconBg: "bg-rose-500/15 border-rose-500/30",        iconText: "text-rose-300",     title: "group-hover:text-rose-100",    num: "text-rose-200/70" },
  }[card.color]

  const wrapper = unlocked ? (
    <Link href={card.route} className="block" />
  ) : null

  const inner = (
    <div className={cn(
      "group h-full rounded-2xl bg-gradient-to-br border p-5 transition-all relative overflow-hidden",
      colorMap.bg, colorMap.border,
      unlocked
        ? "hover:scale-[1.01] hover:border-opacity-50"
        : "opacity-60 cursor-not-allowed"
    )}>
      {/* Status badge no canto */}
      <div className="absolute top-3 right-3">
        <StatusBadge status={status} unlocked={unlocked} />
      </div>

      <div className="flex items-start gap-3 mb-3">
        <div className={cn("w-11 h-11 rounded-xl border flex items-center justify-center shrink-0", colorMap.iconBg)}>
          <card.icon className={cn("w-5 h-5", colorMap.iconText)} />
        </div>
        <div className="flex-1 min-w-0 pr-12">
          <div className={cn("text-[10px] uppercase tracking-wider font-semibold", colorMap.num)}>
            Etapa {card.number}
          </div>
          <h3 className={cn("text-base font-bold text-white transition-colors", colorMap.title)}>
            {card.title}
          </h3>
        </div>
      </div>

      <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
        {card.description}
      </p>

      {summary && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">Selecionado</div>
          <div className="text-xs text-white truncate">{summary}</div>
        </div>
      )}

      {!unlocked && (
        <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-gray-500">
          🔒 Conclua a etapa anterior para desbloquear
        </div>
      )}
    </div>
  )

  return unlocked ? (
    <Link href={card.route} className="block">
      {inner}
    </Link>
  ) : (
    <div>{inner}</div>
  )
}

function StatusBadge({ status, unlocked }: { status: StepStatus; unlocked: boolean }) {
  if (!unlocked) {
    return (
      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-500 font-semibold uppercase tracking-wider">
        Bloqueada
      </span>
    )
  }
  if (status === "ready") {
    return (
      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold uppercase tracking-wider flex items-center gap-1">
        <CheckCircle2 className="w-2.5 h-2.5" /> Pronta
      </span>
    )
  }
  if (status === "draft") {
    return (
      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold uppercase tracking-wider">
        Rascunho
      </span>
    )
  }
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1">
      <Circle className="w-2.5 h-2.5" /> Vazia
    </span>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────

function summaryFor(key: StepKey, state: BioprintProcessState): string | null {
  switch (key) {
    case "model": {
      const m = state.model
      if (!m.name) return null
      const parts = [m.name]
      if (m.stats?.triangles) parts.push(`${m.stats.triangles.toLocaleString()} tri`)
      return parts.join(" · ")
    }
    case "bioink": {
      const b = state.bioink
      if (!b.material) return null
      const parts = [b.material]
      if (b.concentration != null) parts.push(`${b.concentration}%`)
      if (b.cellType) parts.push(b.cellType.split(" ")[0])
      return parts.join(" · ")
    }
    case "slice": {
      const s = state.slice
      if (!s.gcode && !s.estimate?.totalLayers) return null
      const parts: string[] = []
      if (s.estimate?.totalLayers) parts.push(`${s.estimate.totalLayers} camadas`)
      if (s.estimate?.estimatedTimeMin) parts.push(`~${s.estimate.estimatedTimeMin} min`)
      if (s.gcode) parts.push("G-code OK")
      return parts.length > 0 ? parts.join(" · ") : null
    }
    case "control": {
      const c = state.control
      if (!c.tissueType) return null
      return c.tissueType + (c.connected ? " · 🟢 conectada" : " · 🔘 simulação")
    }
  }
}
