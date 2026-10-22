/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 — Manual do Usuário
 *  ───────────────────────────────────────────────────────────────────────
 *  Capítulos passo-a-passo com racional fácil para cada módulo da BIA.
 *  Foco em: "o que faz, como usar, para quê serve" sem jargão excessivo.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

"use client"

import { useState } from "react"
import Link from "next/link"
import {
  BookOpen, FlaskConical, Box, MessageSquare, Target, Beaker, Settings, CheckCircle2, Lightbulb, ShieldCheck, Microscope, GitBranch, Map, Wrench, FileText, Coffee, Compass, Layers, Notebook as NotebookIcon, BarChart3, CreditCard, PlayCircle, ClipboardCheck,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

// ─── Capítulos modulares (R12.41 — manual de usuário final) ──────────
// R12.55.2 FIX: alinhar imports com os nomes reais exportados nos arquivos.
// Antes os imports GettingStarted/BioprintModel/BioprintBioink/BioprintSlice/BioprintExecute
// vinham como undefined (não existiam com esses nomes) e disparavam React error #130
// ("Element type is invalid: undefined") ao clicar nesses capítulos.
import { ChapterGettingStarted as GettingStarted } from "./chapters/getting-started"
import { ChapterRoadmap } from "./chapters/roadmap"
import { ChapterPipeline } from "./chapters/pipeline"
import { ChapterBioprintModel as BioprintModel } from "./chapters/bioprint-model"
import { ChapterBioprintBioink as BioprintBioink } from "./chapters/bioprint-bioink"
import { ChapterBioprintSlice as BioprintSlice } from "./chapters/bioprint-slice"
import { ChapterBioprintExecute as BioprintExecute } from "./chapters/bioprint-execute"
import { ChapterBioprintReviewPost as BioprintReviewPost } from "./chapters/bioprint-review-post"
import { OrganoidBuilder } from "./chapters/organoid-builder"
import { Protocols as ChapterProtocols } from "./chapters/protocols"
import { Knowledge as ChapterKnowledge } from "./chapters/knowledge"
import { Notebook as ChapterNotebook } from "./chapters/notebook"
import { ChatIA as ChapterChatIA } from "./chapters/chat-ia"
import { Analyses as ChapterAnalyses } from "./chapters/analyses"
import { Tools as ChapterTools } from "./chapters/tools"
import { CreditsSettings as ChapterCreditsSettings } from "./chapters/credits-settings"

// ─────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────

interface Chapter {
  id: string
  title: string
  subtitle: string
  icon: React.ElementType
  color: string                  // gradient
  badge: string                  // "NOVO", "PRO", etc.
  estReadMin: number
}

// ─────────────────────────────────────────────────────────────────────────
// CAPÍTULOS DISPONÍVEIS
// ─────────────────────────────────────────────────────────────────────────

const CHAPTERS: Chapter[] = [
  // ─── R12.41 — Manual de usuário final (ordem por fluxo de uso) ───
  {
    id: "getting-started",
    title: "Primeiros Passos",
    subtitle: "Login, dashboard, navegação, créditos e fluxo típico de uso",
    icon: Compass,
    color: "from-cyan-500 to-blue-600",
    badge: "NOVO",
    estReadMin: 7,
  },
  {
    id: "roadmap-pro",
    title: "Roteiro Profissional",
    subtitle: "As 10 fases para levar uma ideia de conceito até produto clínico",
    icon: Map,
    color: "from-emerald-500 to-cyan-600",
    badge: "NOVO",
    estReadMin: 6,
  },
  {
    id: "pipeline",
    title: "Pipeline — Projetos",
    subtitle: "Como organizar seus projetos, abas, filtros e integrações",
    icon: GitBranch,
    color: "from-blue-500 to-indigo-600",
    badge: "NOVO",
    estReadMin: 6,
  },
  {
    id: "bioprint-model",
    title: "Bioimpressão — Fase 1: Modelo de tecido (sem STL)",
    subtitle: "O racional das 6 fases; tecido-alvo, aplicação, tamanho, células → sugestões para as Fases 2 e 3",
    icon: Box,
    color: "from-blue-500 to-purple-600",
    badge: "NOVO",
    estReadMin: 8,
  },
  {
    id: "bioprint-bioink",
    title: "Bioimpressão — Fase 2: Biotinta",
    subtitle: "807 biomateriais, reologia em tempo real, células e score",
    icon: FlaskConical,
    color: "from-emerald-500 to-teal-600",
    badge: "NOVO",
    estReadMin: 8,
  },
  {
    id: "bioprint-slice",
    title: "Bioimpressão — Fase 3: Fatiamento (único lugar de STL → G-code)",
    subtitle: "11 algoritmos, parâmetros-chave e modo Apenas Contorno",
    icon: Layers,
    color: "from-amber-500 to-orange-600",
    badge: "NOVO",
    estReadMin: 9,
  },
  {
    id: "bioprint-execute",
    title: "Bioimpressão — Fase 4: Bioimpressão (Host)",
    subtitle: "USB, joystick, extrusão, Speed/Flow, pausa, retomada",
    icon: PlayCircle,
    color: "from-rose-500 to-red-600",
    badge: "ATUALIZADO",
    estReadMin: 12,
  },
  {
    id: "bioprint-review-post",
    title: "Bioimpressão — Fases 5 e 6: Análise da bioimpressão · Maturação & caracterizações",
    subtitle: "Laço fechado (nota + relato → próximo G-code), crosslink, cultura, biorreator, ensaios",
    icon: ClipboardCheck,
    color: "from-sky-500 to-rose-600",
    badge: "NOVO",
    estReadMin: 8,
  },
  {
    id: "organoid-builder",
    title: "Organoid Builder",
    subtitle: "Projete mini-órgãos (organoides) a partir de células-tronco",
    icon: Beaker,
    color: "from-purple-500 to-pink-600",
    badge: "NOVO",
    estReadMin: 8,
  },
  {
    id: "protocols",
    title: "Protocolos GLP / GMP",
    subtitle: "Documentos oficiais de pesquisa e clínica + Protocolo Total",
    icon: ShieldCheck,
    color: "from-emerald-500 to-cyan-600",
    badge: "NOVO",
    estReadMin: 9,
  },
  {
    id: "knowledge",
    title: "Motor de Conhecimento",
    subtitle: "PubMed, arXiv, patentes e dossiês temáticos prontos",
    icon: BookOpen,
    color: "from-amber-500 to-yellow-600",
    badge: "NOVO",
    estReadMin: 6,
  },
  {
    id: "notebook",
    title: "Notebook (ELN)",
    subtitle: "Caderno eletrônico de laboratório com timestamp imutável",
    icon: NotebookIcon,
    color: "from-rose-500 to-orange-600",
    badge: "NOVO",
    estReadMin: 6,
  },
  {
    id: "chat-ia",
    title: "Chat IA — Copiloto",
    subtitle: "Conversa com a assistente especializada em bioimpressão",
    icon: MessageSquare,
    color: "from-blue-500 to-cyan-600",
    badge: "NOVO",
    estReadMin: 5,
  },
  {
    id: "analyses",
    title: "Análises & Dossiês",
    subtitle: "Microscopia, fotos da impressão, reologia, mecânica e estatística",
    icon: BarChart3,
    color: "from-cyan-500 to-blue-600",
    badge: "NOVO",
    estReadMin: 7,
  },
  {
    id: "tools",
    title: "Ferramentas",
    subtitle: "Calculadoras de diluição, molaridade, plaqueamento, conversões",
    icon: Wrench,
    color: "from-amber-500 to-orange-600",
    badge: "NOVO",
    estReadMin: 5,
  },
  {
    id: "credits-settings",
    title: "Créditos & Configurações",
    subtitle: "Planos, recargas, billing, segurança, 2FA e preferências",
    icon: CreditCard,
    color: "from-emerald-500 to-teal-600",
    badge: "NOVO",
    estReadMin: 6,
  },
  // ─── Protocolos de laboratório ───
  {
    id: "print-analysis",
    title: "Análise dos construtos impressos",
    subtitle: "Protocolo de validação de biotinta, imprimibilidade e arquitetura por fotografia e ImageJ (complementa a Fase 5)",
    icon: Microscope,
    color: "from-amber-500 to-rose-600",
    badge: "PROTOCOLO",
    estReadMin: 8,
  },
]

// ─────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────

export default function ManualPage() {
  const [activeId, setActiveId] = useState<string>("getting-started")

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-white/5 shrink-0 bg-gradient-to-r from-blue-500/[0.04] to-purple-500/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Manual do Usuário
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/15 border border-blue-500/30 text-blue-300 rounded font-mono uppercase">v4.4</span>
            </h1>
            <p className="text-[11px] text-gray-400">
              Tutoriais práticos com racional científico — atualizado em 2026
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Lateral: lista de capítulos ── */}
        <aside className="hidden lg:block w-72 xl:w-80 shrink-0 border-r border-white/5 overflow-y-auto bg-white/[0.01]">
          <div className="p-3">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 py-1.5">
              Capítulos
            </div>
            <div className="space-y-1.5">
              {CHAPTERS.map(ch => {
                const Icon = ch.icon
                const active = activeId === ch.id
                return (
                  <button
                    key={ch.id}
                    onClick={() => setActiveId(ch.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-all",
                      active
                        ? "bg-blue-500/10 border-blue-500/30 ring-1 ring-blue-500/20"
                        : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={cn(
                        "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0",
                        ch.color
                      )}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={cn("text-xs font-semibold", active ? "text-white" : "text-gray-200")}>
                            {ch.title}
                          </span>
                          {ch.badge === "NOVO" && (
                            <span className="text-[9px] px-1 py-0.5 bg-emerald-500/15 text-emerald-300 rounded font-mono">{ch.badge}</span>
                          )}
                          {ch.badge === "PRO" && (
                            <span className="text-[9px] px-1 py-0.5 bg-purple-500/15 text-purple-300 rounded font-mono">{ch.badge}</span>
                          )}
                          {ch.badge === "ATUALIZADO" && (
                            <span className="text-[9px] px-1 py-0.5 bg-amber-500/15 text-amber-300 rounded font-mono">{ch.badge}</span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 leading-snug line-clamp-2">{ch.subtitle}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <Coffee className="w-2.5 h-2.5 text-gray-600" />
                          <span className="text-[9px] text-gray-600">{ch.estReadMin} min de leitura</span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-6 mx-2 p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-purple-300" />
                <span className="text-[11px] font-semibold text-purple-200">Filosofia BIA</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Cada módulo segue o princípio: <strong className="text-purple-200">descreva o que você quer</strong> →
                a IA <strong className="text-purple-200">propõe a solução fundamentada</strong> →
                você <strong className="text-purple-200">valida e refina</strong>.
              </p>
              <p className="text-[10px] text-gray-500 leading-relaxed mt-2 pt-2 border-t border-white/5">
                Nascida dos desafios reais da Quantis no desenvolvimento da matriz de colágeno humano,
                a BIA conecta design 3D, biomateriais, biofabricação e jornada regulatória —
                do conceito à clínica.
              </p>
            </div>
          </div>
        </aside>

        {/* ── Conteúdo principal ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-10">

            {/* Mobile chapter selector */}
            <div className="lg:hidden mb-4">
              <select
                value={activeId}
                onChange={e => setActiveId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              >
                {CHAPTERS.map(ch => (
                  <option key={ch.id} value={ch.id}>{ch.title} — {ch.subtitle}</option>
                ))}
              </select>
            </div>

            {/* ─── R12.41 — Capítulos modulares de usuário final ─── */}
            {activeId === "getting-started"  && <GettingStarted />}
            {activeId === "roadmap-pro"      && <ChapterRoadmap />}
            {activeId === "pipeline"         && <ChapterPipeline />}
            {activeId === "bioprint-model"   && <BioprintModel />}
            {activeId === "bioprint-bioink"  && <BioprintBioink />}
            {activeId === "bioprint-slice"   && <BioprintSlice />}
            {activeId === "bioprint-execute" && <BioprintExecute />}
            {activeId === "bioprint-review-post" && <BioprintReviewPost />}
            {activeId === "organoid-builder" && <OrganoidBuilder />}
            {activeId === "protocols"        && <ChapterProtocols />}
            {activeId === "knowledge"        && <ChapterKnowledge />}
            {activeId === "notebook"         && <ChapterNotebook />}
            {activeId === "chat-ia"          && <ChapterChatIA />}
            {activeId === "analyses"         && <ChapterAnalyses />}
            {activeId === "tools"            && <ChapterTools />}
            {activeId === "credits-settings" && <ChapterCreditsSettings />}

            {/* ─── Protocolos de laboratório ─── */}
            {activeId === "print-analysis"    && <ChapterPrintAnalysis />}

          </div>
        </main>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════
// PROTOCOLO — ANÁLISE DOS CONSTRUTOS IMPRESSOS (fotografia + ImageJ)
// ═════════════════════════════════════════════════════════════════════════


// ═════════════════════════════════════════════════════════════════════════
//  CAPÍTULO 7 — ANÁLISE DOS CONSTRUCTOS IMPRESSOS
// ═════════════════════════════════════════════════════════════════════════

function ChapterPrintAnalysis() {
  return (
    <article className="space-y-6">
      <header className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Microscope className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Análise dos construtos impressos</h1>
          <p className="text-sm text-gray-400 mt-1">
            Avaliação objetiva do construto bioimpresso por <strong className="text-amber-300">fotografia e ImageJ</strong>.
            Protocolo reprodutível, complementar à Fase 5 · Análise da bioimpressão.
          </p>
        </div>
      </header>

      <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-rose-500/10 border border-amber-500/20 p-5">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-amber-300 mt-0.5 shrink-0" />
          <div className="space-y-2 text-sm text-gray-200">
            <p>
              <strong className="text-amber-200">Princípio fundamental:</strong> imprimir não é suficiente — é necessário
              <strong> quantificar</strong> a correspondência entre o construto e a geometria projetada.
              Sem métricas, não há reprodutibilidade científica.
            </p>
            <p className="text-xs text-gray-400">
              Este protocolo requer apenas <strong className="text-amber-200">smartphone, régua milimetrada e ImageJ (gratuito)</strong> —
              acessível a qualquer laboratório. Análises avançadas (µ-CT, AFM, reometria) são tratadas nos protocolos GLP/GMP.
            </p>
          </div>
        </div>
      </div>

      {/* SETUP FOTOGRÁFICO */}
      <Box2 icon={Settings} title="📸 Setup fotográfico padrão (5 min)" tone="info">
        <ol className="space-y-2 text-xs text-gray-300 list-decimal pl-4">
          <li><strong className="text-white">Fundo:</strong> papel preto fosco (alto contraste com hidrogéis claros).</li>
          <li><strong className="text-white">Iluminação:</strong> 2 fontes laterais a 45°, evitando reflexos. LED branco difuso.</li>
          <li><strong className="text-white">Escala obrigatória:</strong> régua milimetrada paralela ao constructo na mesma foto.</li>
          <li><strong className="text-white">Distância fixa:</strong> celular a 20 cm, perpendicular (top-down) ou paralelo (lateral).</li>
          <li><strong className="text-white">Foco macro:</strong> usar modo macro do celular ou clipe lupa de 10×.</li>
          <li><strong className="text-white">Resolução:</strong> mínimo 1920×1080, sem zoom digital.</li>
        </ol>
        <p className="text-xs text-amber-300 mt-3">
          <strong>Recomendação:</strong> registre sempre 3 imagens da mesma amostra (superior e 2 laterais) e salve com nomenclatura
          padronizada: <code className="px-1 rounded bg-black/40">YYYYMMDD_amostra-ID_view.jpg</code>
        </p>
      </Box2>

      {/* TIPOS DE ANÁLISE */}
      <h2 className="text-lg font-semibold text-white flex items-center gap-2 mt-6">
        <Target className="w-5 h-5 text-amber-400" />
        Métricas principais por tipo de teste
      </h2>

      <AnalysisCard
        title="1. Line Test — Largura real do filamento"
        target="Calibrar bico + pressão de extrusão"
        steps={[
          "Foto top-down com escala (régua de 10 mm).",
          "Abrir ImageJ → File → Open → escolher foto.",
          "Definir escala: Analyze → Set Scale → desenhar linha sobre régua → ‟Known distance = 10 mm‟.",
          "Para cada linha: usar Straight Line tool perpendicular → ‟Plot Profile‟ → medir FWHM (largura à meia altura).",
          "Repetir em 5 pontos da mesma linha → calcular CV = desvio/média.",
        ]}
        criteria={[
          "✅ CV < 10% = filamento estável (bom bioink)",
          "⚠️ CV 10-20% = aceitável, ajustar pressão",
          "❌ CV > 20% = bioink inadequado, refazer formulação",
          "✅ Largura real ±20% da nominal = OK",
        ]}
      />

      <AnalysisCard
        title="2. Grid Test (Pf) — Printability Factor"
        target="Quantificar viscosidade/gelificação do bioink (Ouyang 2016)"
        steps={[
          "Foto top-down, foco no centro da grade.",
          "ImageJ: definir escala como acima.",
          "Image → Adjust → Threshold → preto/branco automático.",
          "Analyze → Analyze Particles → marcar ‟Show Outlines‟ → exclude on edges.",
          "Para cada poro central, anotar perímetro (P) e área (A).",
          "Calcular Pf = P² ÷ (16 × A) para cada poro. Reportar a média de pelo menos 16 poros.",
        ]}
        criteria={[
          "🎯 Pf ≈ 1.00 → bioink ideal (poros quadrados)",
          "⚠️ Pf < 0.90 → sub-gel (filamento espalha, poros arredondados)",
          "⚠️ Pf > 1.10 → over-gel (filamentos irregulares, poros disformes)",
          "Reportar: média ± DP, n ≥ 16 poros",
        ]}
      />

      <AnalysisCard
        title="3. Collapse Bridge — Self-supporting"
        target="Vão máximo sem colapso (proxy do módulo G' do gel)"
        steps={[
          "Foto LATERAL paralela ao vão.",
          "ImageJ: escala via régua.",
          "Para cada ponte, traçar linha reta entre os topos das torres.",
          "Medir a maior distância vertical da ponte abaixo dessa linha (= flecha/sag).",
          "Calcular: sag_relativo = sag / vão (em %).",
          "Identificar maior vão onde sag_relativo < 10%.",
        ]}
        criteria={[
          "✅ Sag < 10% do vão → bioink self-supporting OK",
          "⚠️ Sag 10-20% → suporte sacrificial recomendado (FRESH/Pluronic)",
          "❌ Sag > 20% → bioink muito mole, aumentar % polímero ou crosslinker",
          "Bioinks robustos (GelMA+LAP, alginato+CaCl₂): vão útil ≥ 10 mm",
        ]}
      />

      <AnalysisCard
        title="4. Star Overhang — Anisotropia direcional"
        target="Detectar problemas direcionais (gravidade lateral, vibração do print head)"
        steps={[
          "Foto top-down centrada no pino.",
          "ImageJ: escala definida.",
          "Para cada braço (6 braços): medir comprimento real com Straight Line.",
          "Comparar com comprimento nominal (default 8 mm).",
          "Calcular: desvio padrão dos 6 comprimentos ÷ média.",
        ]}
        criteria={[
          "✅ Desvio < 8% = comportamento isotrópico (bom)",
          "⚠️ Desvio 8-15% = checar nivelamento da mesa",
          "❌ Desvio > 15% = problema mecânico ou anisotropia do bioink",
        ]}
      />

      <AnalysisCard
        title="5. Stacking Tower — Acúmulo vertical"
        target="Determinar altura máxima imprimível com este bioink"
        steps={[
          "Foto LATERAL com régua vertical.",
          "ImageJ: escala definida.",
          "Medir altura real do topo (h_real) e altura nominal (h_nominal = n × layer_height).",
          "Medir diâmetro na base (D_base) e no topo (D_topo).",
          "Calcular: razão de altura = h_real / h_nominal; afunilamento = (D_base − D_topo) / D_base.",
        ]}
        criteria={[
          "✅ h_real / h_nominal > 0.90 → empilhamento OK",
          "✅ Afunilamento < 10% → bioink mantém forma",
          "⚠️ Afunilamento 10-25% → considerar crosslinking durante impressão (UV in-situ)",
          "❌ Afunilamento > 25% ou colapso parcial → bioink inadequado para esta altura",
        ]}
      />

      <AnalysisCard
        title="6. Angle Fan — Ângulo crítico de overhang"
        target="Maior ângulo sem suporte que o bioink aguenta"
        steps={[
          "Foto LATERAL paralela ao leque.",
          "ImageJ: escala definida.",
          "Para cada braço (0°, 15°, 30°…, 90°), inspecionar visualmente: deformou ou caiu?",
          "O ângulo crítico = maior ângulo em que o braço se mantém reto (sag < 1 mm).",
        ]}
        criteria={[
          "Reportar como: ‟overhang_critical = X°‟",
          "Bioinks de extrusão típicos: 30-60° (sem suporte)",
          "Com suporte FRESH/Pluronic: pode chegar a 90° (qualquer ângulo)",
          "Use este valor para projetar peças sem precisar de suporte",
        ]}
      />

      {/* RELATÓRIO E NOTEBOOK */}
      <Box2 icon={FileText} title="📋 Estrutura de relatório por amostra" tone="default">
        <p className="text-xs text-gray-300 mb-2">
          Para cada experimento, registre no <Link href="/dashboard/notebook" className="text-amber-300 hover:underline">Notebook eletrônico</Link>:
        </p>
        <ul className="space-y-1.5 text-xs text-gray-300">
          <li>📅 Data + ID da amostra (ex: <code className="px-1 rounded bg-black/40">2026-05-13_GelMA-8pc_001</code>)</li>
          <li>🧪 Formulação completa (componentes + concentrações + crosslinker)</li>
          <li>🖨️ Parâmetros de impressão (pressão, velocidade, bico Ø, temperatura, layer height)</li>
          <li>📐 Geometria usada (qual teste/constructo)</li>
          <li>🖼️ 3 fotos (top, lateral 1, lateral 2) com escala</li>
          <li>📊 Métricas calculadas (Pf, CV, sag, etc) — colar valores no notebook</li>
          <li>💬 Observações qualitativas (cor, transparência, aderência à plataforma, integridade)</li>
          <li>✅ Veredicto: aprovado / repetir / refazer formulação</li>
        </ul>
      </Box2>

      <Box2 icon={Beaker} title="🔬 Métricas avançadas (laboratórios equipados)" tone="info">
        <ul className="space-y-1.5 text-xs text-gray-300">
          <li>• <strong>µ-CT (8-20 µm/voxel):</strong> porosidade real, conectividade dos poros (Euler), distribuição 3D.</li>
          <li>• <strong>AFM:</strong> módulo elástico local em escala micrométrica (compare zonas em cartilagem).</li>
          <li>• <strong>Reometria oscilatória:</strong> G′ / G″ do bioink antes e depois de crosslinking.</li>
          <li>• <strong>Live/Dead (Calcein-AM + EthD-1):</strong> viabilidade celular pós-impressão (24h, 7d, 14d).</li>
          <li>• <strong>HE / Picrosirius / Alizarin:</strong> histologia para deposição de matriz extracelular.</li>
          <li>• <strong>SEM:</strong> arquitetura porosa e morfologia de superfície (necessita liofilização ou secagem crítica).</li>
        </ul>
      </Box2>

      <Box2 icon={CheckCircle2} title="🎯 Fluxo recomendado de validação de bioink" tone="ok">
        <ol className="space-y-1.5 text-xs text-gray-300 list-decimal pl-4">
          <li><strong>Antes de imprimir constructo final</strong>, valide o bioink com 3 testes mínimos:</li>
          <li><strong>Line Test</strong> → calibra largura real e CV.</li>
          <li><strong>Grid Test (Pf)</strong> → quantifica printabilidade (alvo Pf ≈ 1).</li>
          <li><strong>Collapse Bridge</strong> → vão máximo (proxy de G′).</li>
          <li>Se 3 testes ✅ → imprimir constructo biomimético com confiança.</li>
          <li>Em caso de critério ❌, retorne à <Link href="/dashboard/bioprint/bioink" className="text-emerald-300 hover:underline">Fase 2 · Biotinta</Link> e ajuste a formulação.</li>
        </ol>
        <p className="text-xs text-emerald-300 mt-3">
          ⏱️ <strong>Tempo total:</strong> 3 testes × 20 min impressão + 10 min foto/análise = ~90 min para validar um bioink antes de usar em experimento real.
        </p>
      </Box2>

      <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-rose-500/10 border border-amber-500/20 p-4 mt-6">
        <p className="text-xs text-gray-300 leading-relaxed">
          🔗 <strong className="text-amber-300">Próximo passo:</strong> abrir o {" "}
          <Link href="/dashboard/bioprint/slice" className="text-amber-200 hover:underline font-semibold">Bioimpressão · Fase 3 (Fatiamento)</Link> {" "}
          e escolher o modelo de teste de fidelidade (ou a grade de imprimibilidade). Imprima primeiro,
          fotografe, analise no ImageJ seguindo este protocolo. Anote tudo no {" "}
          <Link href="/dashboard/notebook" className="text-amber-200 hover:underline font-semibold">Notebook</Link>.
        </p>
      </div>
    </article>
  )
}

function AnalysisCard({
  title, target, steps, criteria,
}: {
  title: string
  target: string
  steps: string[]
  criteria: string[]
}) {
  return (
    <div className="rounded-xl bg-white/3 border border-white/8 p-4">
      <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
      <p className="text-xs text-amber-300 mb-3">🎯 {target}</p>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Passos</div>
          <ol className="space-y-1 text-xs text-gray-300 list-decimal pl-4">
            {steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
        <div>
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Critérios</div>
          <ul className="space-y-1 text-xs text-gray-300">
            {criteria.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═════════════════════════════════════════════════════════════════════════

function Box2({
  icon: Icon, title, tone, children,
}: {
  icon: React.ElementType; title: string
  tone: "info" | "default" | "warn" | "ok" | "emerald" | "cyan" | "amber" | "purple" | "rose"
  children: React.ReactNode
}) {
  const palette = {
    info:    { bg: "from-blue-500/[0.04] to-blue-500/[0.02]",    border: "border-blue-500/15",    iconBg: "bg-blue-500/15 border-blue-500/30",    iconColor: "text-blue-300",    titleColor: "text-blue-100" },
    default: { bg: "from-white/[0.02] to-white/[0.01]",          border: "border-white/8",        iconBg: "bg-white/5 border-white/10",            iconColor: "text-gray-300",    titleColor: "text-white" },
    warn:    { bg: "from-amber-500/[0.04] to-amber-500/[0.02]",  border: "border-amber-500/15",   iconBg: "bg-amber-500/15 border-amber-500/30",   iconColor: "text-amber-300",   titleColor: "text-amber-100" },
    ok:      { bg: "from-emerald-500/[0.04] to-emerald-500/[0.02]", border: "border-emerald-500/15", iconBg: "bg-emerald-500/15 border-emerald-500/30", iconColor: "text-emerald-300", titleColor: "text-emerald-100" },
    emerald: { bg: "from-emerald-500/[0.04] to-emerald-500/[0.02]", border: "border-emerald-500/15", iconBg: "bg-emerald-500/15 border-emerald-500/30", iconColor: "text-emerald-300", titleColor: "text-emerald-100" },
    cyan:    { bg: "from-cyan-500/[0.04] to-cyan-500/[0.02]",    border: "border-cyan-500/15",    iconBg: "bg-cyan-500/15 border-cyan-500/30",    iconColor: "text-cyan-300",    titleColor: "text-cyan-100" },
    amber:   { bg: "from-amber-500/[0.04] to-amber-500/[0.02]",  border: "border-amber-500/15",   iconBg: "bg-amber-500/15 border-amber-500/30",   iconColor: "text-amber-300",   titleColor: "text-amber-100" },
    purple:  { bg: "from-purple-500/[0.04] to-purple-500/[0.02]", border: "border-purple-500/15", iconBg: "bg-purple-500/15 border-purple-500/30", iconColor: "text-purple-300", titleColor: "text-purple-100" },
    rose:    { bg: "from-rose-500/[0.04] to-rose-500/[0.02]",    border: "border-rose-500/15",    iconBg: "bg-rose-500/15 border-rose-500/30",    iconColor: "text-rose-300",    titleColor: "text-rose-100" },
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


