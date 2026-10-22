"use client"

/**
 * BIA — Hub do Processo de Bioimpressão
 *
 * Ponto de entrada do fluxo de 6 fases (R24). Mostra:
 *  - Visão geral do processo (cards das 6 fases com status)
 *  - Racional: 1 Modelo de tecido · 2 Biotinta · 3 Fatiamento (ÚNICO lugar de STL)
 *    · 4 Bioimpressão (Host) · 5 Análise da bioimpressão · 6 Maturação & caracterizações
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
  Box, Droplets, Layers, Gamepad2, Beaker, ClipboardCheck,
  ArrowRight, RotateCcw, Info, CheckCircle2, Circle,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import {
  useBioprintProcess, isStepUnlocked, STEP_LABELS, STEP_ROUTES,
  type BioprintProcessState, type StepStatus, type PhaseKey,
} from "@/lib/bioprint/process-context"
import { listFeedback } from "@/lib/bioprint/print-feedback"
import { useEffect, useState } from "react"

type StepKey = PhaseKey

interface StepCardDef {
  key: StepKey
  number: number
  title: string
  short: string
  description: string
  icon: React.ElementType
  route: string
  color: "emerald" | "cyan" | "violet" | "amber" | "rose" | "sky"
}

const STEP_CARDS: StepCardDef[] = [
  {
    key: "model",
    number: 1,
    title: "Modelo de tecido",
    short: STEP_LABELS.model,
    description:
      "Definição do construto: tecido-alvo (cartilagem, pele, osso, vaso, miocárdio, renal, hepático, neural ou teste de imprimibilidade), aplicação pretendida, dimensão e população celular. Esta fase não envolve geometria — a BIA traduz a intenção biológica em recomendações de modelo, perfil, biotinta e substrato para as fases seguintes.",
    icon: Box,
    route: STEP_ROUTES.model,
    color: "emerald",
  },
  {
    key: "bioink",
    number: 2,
    title: "Biotinta",
    short: STEP_LABELS.bioink,
    description:
      "Único local de formulação de biotintas, em quatro modos: formulações validadas (alginato-gelatina, GelMA, Pluronic, FRESH, CELLINK SKIN…) com parâmetros correspondentes; laboratório guiado; formulação livre (807 biomateriais, reologia, multimaterial); e Formulador Pro assistido por IA.",
    icon: Droplets,
    route: STEP_ROUTES.bioink,
    color: "cyan",
  },
  {
    key: "slice",
    number: 3,
    title: "Fatiamento — BioSlicer",
    short: STEP_LABELS.slice,
    description:
      "Único local de geometria 3D da BIA: modelo anatômico, primitiva, upload de STL, desenho ou teste de imprimibilidade → G-code com extrusão volumétrica por seringa, padrões de preenchimento (básicos e avançados: Schwarz P, Diamond, Voronoi, Perlin, gradiente), orientação na mesa, substrato Petri/placa e 1–4 cabeçotes. Ponto zero na agulha. Pré-visualização gratuita; 6 créditos por G-code.",
    icon: Layers,
    route: STEP_ROUTES.slice,
    color: "violet",
  },
  {
    key: "control",
    number: 4,
    title: "Bioimpressão",
    short: STEP_LABELS.control,
    description:
      "Execução na bioimpressora: conexão USB (Web Serial / Marlin), validação e pré-visualização 3D do G-code, movimentação manual, transmissão com handshake, pausa/retomada/cancelamento/M112 e viabilidade celular em tempo real. Ao término, a avaliação do construto alimenta a Fase 5.",
    icon: Gamepad2,
    route: STEP_ROUTES.control,
    color: "amber",
  },
  {
    key: "review",
    number: 5,
    title: "Análise da bioimpressão",
    short: STEP_LABELS.review,
    description:
      "Ciclo de retroalimentação: nota de 1 a 5, relato técnico, interpretação dos sintomas (filamentos, colapso, sub/sobre-extrusão, descolamento…) e ajustes aplicados pela BIA ao próximo G-code. Histórico de impressões e decisão: repetir a Fase 3 ou prosseguir para a maturação.",
    icon: ClipboardCheck,
    route: STEP_ROUTES.review,
    color: "sky",
  },
  {
    key: "postBio",
    number: 6,
    title: "Maturação & caracterizações",
    short: STEP_LABELS.postBio,
    description:
      "Do construto ao tecido: cultivo, reticulação, biorreator (perfusão/agitação) e caracterizações (Live/Dead, AlamarBlue, histologia, imunomarcação, ensaios mecânicos). Protocolos por tecido: cardíaco · ósseo · cartilaginoso · vascular · cutâneo · neural · hepático.",
    icon: Beaker,
    route: STEP_ROUTES.postBio,
    color: "rose",
  },
]

export default function BioprintHubPage() {
  const router = useRouter()
  const { state, nextStep, resetAll } = useBioprintProcess()

  // Fase 5 (análise) não tem estado no processo: considera "pronta" quando
  // existe ao menos um feedback salvo no laço fechado (localStorage).
  const [reviewCount, setReviewCount] = useState(0)
  useEffect(() => { setReviewCount(listFeedback().length) }, [])

  const statusOf = (k: StepKey): StepStatus =>
    k === "review" ? (reviewCount > 0 ? "ready" : "empty") : state[k].status

  // Quantas fases já estão prontas?
  const readyCount = STEP_CARDS.filter((c) => statusOf(c.key) === "ready").length
  const totalSteps = STEP_CARDS.length
  const progressPercent = Math.round((readyCount / totalSteps) * 100)

  // Ordem das 6 fases: a primeira que não está pronta é a próxima.
  const nextStepDef =
    STEP_CARDS.find((s) => statusOf(s.key) !== "ready") ??
    STEP_CARDS.find((s) => s.key === nextStep)
  const allReady = readyCount === totalSteps

  const handleReset = () => {
    if (confirm("Deseja realmente reiniciar o processo? As configurações das 6 fases serão apagadas (sem afetar arquivos salvos nem o histórico de análises).")) {
      resetAll()
    }
  }

  return (
    <div className="bia-hub-page space-y-6">
      {/* ─── Banner explicativo ────────────────────────────────────── */}
      <section className="rounded-2xl bg-gradient-to-br from-emerald-500/8 via-cyan-500/8 to-violet-500/8 border border-emerald-500/20 p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Beaker className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white mb-1">
              Bioimpressão de ponta a ponta — em 6 fases
            </h2>
            <p className="text-xs text-gray-300 leading-relaxed">
              Um racional só, do tecido ao tecido. Cada fase alimenta a próxima:
              o <strong className="text-emerald-200">modelo de tecido</strong> diz o que você quer construir (sem STL),
              a <strong className="text-cyan-200">biotinta</strong> define reologia e células,
              o <strong className="text-violet-200">fatiamento</strong> é o único lugar onde geometria 3D vira G-code,
              a <strong className="text-amber-200">bioimpressão</strong> envia ao Host com viabilidade live,
              a <strong className="text-sky-200">análise</strong> fecha o laço (nota + relato → próximo G-code melhor),
              e a <strong className="text-rose-200">maturação</strong> cuida do construto até virar tecido (cultura, biorreator, caracterizações).
            </p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1.5 uppercase tracking-wider">
            <span>Progresso do processo</span>
            <span>{readyCount} de {totalSteps} fases prontas</span>
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
              {readyCount === 0 ? "Comece pela Fase" : "Continue na Fase"} {nextStepDef.number} — {nextStepDef.title}
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
              As 6 fases estão concluídas. Você pode repetir a impressão ou iniciar um novo tecido.
            </div>
          </div>
          <button
            onClick={() => router.push("/dashboard/bioprint/execute")}
            className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400 hover:bg-emerald-500/30 text-emerald-100 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            Ir para a Fase 4 · Bioimpressão <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </section>
      )}

      {/*
        R24.6: testes de imprimibilidade são uma fonte de modelo DENTRO do
        BioSlicer (Fase 3 → "Ou um teste de imprimibilidade"). /printability
        redireciona para /slice?test=<id>.
      */}

      {/* ─── Cards das 6 fases ────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {STEP_CARDS.map((card) => {
          const unlocked = isStepUnlocked(card.key, state)
          return (
            <StepCard
              key={card.key}
              card={card}
              status={statusOf(card.key)}
              unlocked={unlocked}
              summary={card.key === "review"
                ? (reviewCount > 0 ? `${reviewCount} ${reviewCount === 1 ? "análise salva" : "análises salvas"}` : null)
                : summaryFor(card.key, state)}
            />
          )
        })}
      </section>

      {/* R24.6: os cards "Execução USB direta", "G-code Hub" e "BTIE" foram
          removidos — eram atalhos para ferramentas que já são as Fases 3 e 4.
          Uma ferramenta, um lugar: G-code na Fase 3, impressão na Fase 4. */}

      {/* ─── Ações secundárias ─────────────────────────────────────── */}
      <section className="rounded-2xl bg-white/[0.02] border border-white/5 p-4 flex flex-wrap items-center gap-3">
        <Info className="w-4 h-4 text-gray-400 shrink-0" />
        <p className="text-xs text-gray-400 flex-1 min-w-0">
          O estado das 6 fases é mantido na sua sessão (sessionStorage). Fechar a aba reinicia o processo — o histórico de análises (Fase 5) fica no navegador.
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
    sky:     { bg: "from-sky-500/8 to-sky-500/2",         border: "border-sky-500/20",      iconBg: "bg-sky-500/15 border-sky-500/30",          iconText: "text-sky-300",      title: "group-hover:text-sky-100",     num: "text-sky-200/70" },
  }[card.color]

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
            Fase {card.number} / 6
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
          🔒 Conclua a fase anterior para desbloquear
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
      if (m.brief?.targetSize_mm) parts.push(`${m.brief.targetSize_mm} mm`)
      else if (m.stats?.triangles) parts.push(`${m.stats.triangles.toLocaleString()} tri`)
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
    case "review": return null
    case "postBio": {
      const p = state.postBio
      return p.status === "ready" ? "Protocolo definido" : null
    }
  }
}
