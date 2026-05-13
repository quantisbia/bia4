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
  BookOpen, Atom, FlaskConical, Box, Printer, Sparkles, MessageSquare,
  Target, Beaker, Settings, CheckCircle2, AlertTriangle, ChevronRight,
  ChevronDown, Lightbulb, Rocket, Save, ShieldCheck, ArrowRight,
  Microscope, GitBranch, Map, Wrench, FileText, Coffee, Download,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

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

interface Section {
  title: string
  body: React.ReactNode
}

// ─────────────────────────────────────────────────────────────────────────
// CAPÍTULOS DISPONÍVEIS
// ─────────────────────────────────────────────────────────────────────────

const CHAPTERS: Chapter[] = [
  {
    id: "formulator-pro",
    title: "Formulador Pro",
    subtitle: "Como criar uma formulação de hidrogel/scaffold profissional do zero",
    icon: Atom,
    color: "from-blue-500 to-purple-600",
    badge: "NOVO",
    estReadMin: 8,
  },
  {
    id: "formulator-bio",
    title: "Formulador Bio (Clássico)",
    subtitle: "Recomendação rápida usando o catálogo BIA de 31 biomateriais",
    icon: FlaskConical,
    color: "from-emerald-500 to-teal-600",
    badge: "BÁSICO",
    estReadMin: 4,
  },
  {
    id: "stl-generator",
    title: "Gerador STL",
    subtitle: "Criar arquivos 3D para bioimpressão (membrana, osso, vaso, organoide…)",
    icon: Box,
    color: "from-violet-500 to-fuchsia-600",
    badge: "ATUALIZADO",
    estReadMin: 6,
  },
  {
    id: "bioprinting",
    title: "Bioimpressão 3D",
    subtitle: "Parâmetros otimizados de extrusão, DLP, FRESH para sua bioink",
    icon: Printer,
    color: "from-amber-500 to-orange-600",
    badge: "AVANÇADO",
    estReadMin: 7,
  },
  {
    id: "roadmap-future",
    title: "Roadmap Futuro",
    subtitle: "Próximas melhorias planejadas para a BIA — versões v4.4, v4.5 e v5.0",
    icon: Rocket,
    color: "from-pink-500 to-rose-600",
    badge: "FUTURO",
    estReadMin: 5,
  },
  {
    id: "vision-formulator",
    title: "Visão Estratégica — Formulador Pro",
    subtitle: "12 melhorias priorizadas para tornar o módulo classe mundial",
    icon: Sparkles,
    color: "from-cyan-500 to-blue-600",
    badge: "ESTRATÉGIA",
    estReadMin: 10,
  },
  {
    id: "print-analysis",
    title: "Análise dos Constructos Impressos",
    subtitle: "Metodologia para validar bioink, printabilidade e arquitetura via fotografia + ImageJ",
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
  const [activeId, setActiveId] = useState<string>("formulator-pro")

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
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/15 border border-blue-500/30 text-blue-300 rounded font-mono uppercase">v4.3</span>
            </h1>
            <p className="text-[11px] text-gray-400">
              Tutoriais práticos com racional científico fácil de entender
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
                a IA <strong className="text-purple-200">propõe a solução cientificamente fundamentada</strong> →
                você <strong className="text-purple-200">valida e refina</strong>.
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

            {activeId === "formulator-pro"  && <ChapterFormulatorPro />}
            {activeId === "formulator-bio"  && <ChapterFormulatorBio />}
            {activeId === "stl-generator"   && <ChapterSTLGenerator />}
            {activeId === "bioprinting"     && <ChapterBioprinting />}
            {activeId === "roadmap-future"  && <ChapterRoadmapFuture />}
            {activeId === "vision-formulator" && <ChapterVisionFormulator />}
            {activeId === "print-analysis"    && <ChapterPrintAnalysis />}

          </div>
        </main>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════
// CAPÍTULO 1 — FORMULADOR PRO
// ═════════════════════════════════════════════════════════════════════════

function ChapterFormulatorPro() {
  return (
    <article className="space-y-6">

      {/* Capa do capítulo */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-500/15 to-purple-500/15 border border-blue-500/20 p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] px-2 py-0.5 bg-emerald-500/15 text-emerald-300 rounded font-mono uppercase">Capítulo 1</span>
          <span className="text-[10px] px-2 py-0.5 bg-blue-500/15 text-blue-300 rounded font-mono uppercase">NOVO em v4.3</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Atom className="w-7 h-7 text-blue-300" />
          Formulador Pro
        </h2>
        <p className="text-sm sm:text-base text-blue-100/80 leading-relaxed">
          Crie formulações <strong className="text-white">profissionais e personalizadas</strong> de hidrogéis, scaffolds e bioinks com
          até <strong className="text-white">8 biomateriais</strong> escolhidos livremente — do catálogo BIA <em>ou</em> qualquer biomaterial customizado.
          A IA analisa compatibilidade química, calcula propriedades, gera protocolo passo-a-passo e cita referências reais.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link href="/dashboard/formulator-pro"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold">
            <Rocket className="w-3.5 h-3.5" /> Abrir Formulador Pro
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400">
            <Coffee className="w-3.5 h-3.5" /> 8 min de leitura
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
            💎 10 créditos por análise
          </span>
        </div>
      </div>

      {/* O QUE É */}
      <Box2 icon={Lightbulb} title="O que é o Formulador Pro?" tone="info">
        <p className="mb-3">
          Imagine que você é um chef científico. Você sabe <strong className="text-white">o prato que quer fazer</strong> (o objetivo
          clínico — ex: regenerar gengiva), <strong className="text-white">os ingredientes que quer usar</strong> (os biomateriais — ex:
          GelMA, quitosana, PRF) e <strong className="text-white">os critérios do prato</strong> (firmeza, biodegradabilidade,
          injetabilidade…).
        </p>
        <p className="mb-3">
          O <strong className="text-blue-300">Formulador Pro</strong> é a IA que age como o seu cientista sênior consultor: ela <em>analisa</em>{" "}
          se os ingredientes são compatíveis, <em>ajusta</em> as concentrações, <em>escolhe</em> o método de reticulação ideal,
          <em> calcula</em> as propriedades preditas e <em>monta</em> o protocolo de bancada — em ~20 segundos.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
          <MiniCard title="Você fornece" items={["Objetivo clínico", "1 a 8 biomateriais", "Especificações desejadas"]} />
          <MiniCard title="A IA gera" items={["Score 0-100 multidimensional", "Protocolo passo-a-passo", "Alertas de incompatibilidade"]} />
          <MiniCard title="Você recebe" items={["JSON técnico exportável", "Markdown para artigo", "DOIs reais 2020-2025"]} />
        </div>
      </Box2>

      {/* QUANDO USAR */}
      <Box2 icon={Target} title="Quando usar o Pro vs. o Clássico?" tone="default">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
            <h4 className="text-sm font-bold text-emerald-300 mb-2 flex items-center gap-1.5">
              <FlaskConical className="w-4 h-4" /> Use o Formulador Bio (Clássico) quando…
            </h4>
            <ul className="text-xs text-gray-300 space-y-1.5 list-disc list-inside">
              <li>Quer uma <strong>recomendação rápida</strong> baseada no catálogo BIA</li>
              <li>Vai usar <strong>1 biomaterial</strong> conhecido</li>
              <li>É um <strong>screening inicial</strong> de viabilidade</li>
              <li>Quer comparar <strong>opções pré-validadas</strong></li>
            </ul>
          </div>
          <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-4">
            <h4 className="text-sm font-bold text-blue-300 mb-2 flex items-center gap-1.5">
              <Atom className="w-4 h-4" /> Use o Formulador Pro quando…
            </h4>
            <ul className="text-xs text-gray-300 space-y-1.5 list-disc list-inside">
              <li>Está fazendo uma <strong>combinação multi-componente</strong> (3+)</li>
              <li>Inclui <strong>biomateriais customizados</strong> ou novos</li>
              <li>Precisa de <strong>análise de incompatibilidade</strong> química</li>
              <li>Vai documentar para <strong>artigo, projeto ou regulatório</strong></li>
            </ul>
          </div>
        </div>
      </Box2>

      {/* WALKTHROUGH 4 ETAPAS */}
      <div>
        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-blue-300" />
          Tutorial passo-a-passo (4 etapas)
        </h3>
        <p className="text-xs text-gray-500 mb-5">
          Vamos formular juntos um <strong className="text-blue-300">hidrogel injetável para regeneração gengival pós-extração de molar</strong>.
        </p>

        <div className="space-y-4">
          {/* ETAPA 1 */}
          <StepCard n={1} title="Defina o objetivo clínico" icon={Target} accent="blue">
            <p className="mb-3">
              Esta é a <strong className="text-blue-300">decisão mais importante</strong> da formulação. A IA usa templates
              científicos por categoria — então a categoria certa muda toda a análise.
            </p>
            <div className="rounded-lg bg-black/30 border border-white/10 p-3 mb-3 text-xs">
              <p className="text-gray-400 mb-1">📋 No exemplo:</p>
              <ul className="space-y-1 text-gray-300">
                <li>• <strong className="text-white">Categoria:</strong> Regeneração gengival / periodontal 🦷</li>
                <li>• <strong className="text-white">Descrição livre:</strong> "Hidrogel injetável biodegradável para regeneração gengival pós-extração de molar, com efeito antimicrobiano e hemostático."</li>
                <li>• <strong className="text-white">Tecido alvo:</strong> "gengiva queratinizada"</li>
              </ul>
            </div>
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/15 p-3 text-xs flex items-start gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
              <p className="text-amber-200/90">
                <strong>Dica:</strong> Quanto mais específico você for (anatomia, tempo de degradação esperado,
                aplicação clínica), mais precisa será a recomendação. Evite "hidrogel para boca" — prefira
                "hidrogel injetável para alvéolo dentário pós-extração com selamento gengival em 14 dias".
              </p>
            </div>
          </StepCard>

          {/* ETAPA 2 */}
          <StepCard n={2} title="Adicione os biomateriais (1 a 8)" icon={Beaker} accent="purple">
            <p className="mb-3">
              Aqui está a <strong className="text-purple-300">grande diferença do Pro</strong>: você adiciona o que quiser.
              Pode ser do catálogo BIA, pode ser um polímero comercial, pode ser uma molécula que <em>você sintetizou no
              seu laboratório</em>. Para cada componente, indique:
            </p>
            <ul className="text-xs text-gray-300 space-y-1.5 list-disc list-inside mb-3 ml-2">
              <li><strong className="text-white">Nome:</strong> texto livre (ex: "GelMA", "Meu polímero X-12")</li>
              <li><strong className="text-white">Concentração:</strong> com unidade (5% w/v, 10 mg/mL, 1:1, qsp 100 mL)</li>
              <li><strong className="text-white">Papel funcional:</strong> ESTRUTURAL / BIOATIVO / REOLÓGICO / RETICULANTE / POROGENO / ADITIVO / SOLVENTE</li>
              <li><strong className="text-white">Propriedades conhecidas (opcional, p/ custom):</strong> família química, módulo, carga em pH 7, notas</li>
            </ul>
            <div className="rounded-lg bg-black/30 border border-white/10 p-3 mb-3 text-xs">
              <p className="text-gray-400 mb-1.5">📋 No exemplo (4 componentes):</p>
              <table className="w-full text-[11px]">
                <thead className="text-gray-500">
                  <tr><th className="text-left pb-1">Material</th><th className="text-left">Conc.</th><th className="text-left">Papel</th></tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr><td className="py-0.5">GelMA</td><td>5% w/v</td><td className="text-blue-300">Estrutural</td></tr>
                  <tr><td>Quitosana (médio MW)</td><td>2% w/v</td><td className="text-emerald-300">Bioativa (antimicrobiana)</td></tr>
                  <tr><td>PRF autólogo</td><td>10% v/v</td><td className="text-emerald-300">Bioativa (fatores de crescimento)</td></tr>
                  <tr><td>LAP</td><td>0.25% w/v</td><td className="text-amber-300">Reticulante (fotoiniciador)</td></tr>
                </tbody>
              </table>
            </div>
            <div className="rounded-lg bg-purple-500/5 border border-purple-500/15 p-3 text-xs flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-300 shrink-0 mt-0.5" />
              <p className="text-purple-200/90">
                <strong>Por que importa o "papel"?</strong> Toda formulação profissional é como uma orquestra: alguém
                segura a estrutura (o backbone polimérico), alguém faz o sinal biológico (RGD, fator de crescimento),
                alguém ajusta a viscosidade para imprimir. A IA equilibra esses papéis e <strong className="text-white">avisa se
                falta algum</strong> (ex: "GelMA precisa de fotoiniciador, sugiro 0.25% LAP").
              </p>
            </div>
          </StepCard>

          {/* ETAPA 3 */}
          <StepCard n={3} title="Especifique o que precisa funcionar" icon={Settings} accent="amber">
            <p className="mb-3">
              Aqui você diz à IA <strong className="text-amber-300">os critérios objetivos</strong> que a formulação precisa atender.
              Quanto mais critérios, mais precisa fica a análise (e os scores).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <div className="rounded-lg bg-white/[0.02] border border-white/5 p-3">
                <h5 className="text-[11px] font-semibold text-gray-300 uppercase tracking-wide mb-1.5">Faixas físicas</h5>
                <ul className="text-[11px] text-gray-400 space-y-0.5">
                  <li>• Módulo de Young (kPa) — firmeza</li>
                  <li>• Porosidade (%) — espaço para células</li>
                  <li>• Tamanho de poro (µm) — vascularização</li>
                  <li>• Degradação (dias) — tempo de remodelação</li>
                  <li>• Swelling (%) — absorção de água</li>
                  <li>• pH alvo (7.0-7.4 fisiológico)</li>
                </ul>
              </div>
              <div className="rounded-lg bg-white/[0.02] border border-white/5 p-3">
                <h5 className="text-[11px] font-semibold text-gray-300 uppercase tracking-wide mb-1.5">Comportamentos</h5>
                <ul className="text-[11px] text-gray-400 space-y-0.5">
                  <li>✅ Biodegradável</li>
                  <li>✅ Bioimprimível (extrusão / DLP)</li>
                  <li>✅ Cell-laden (com células)</li>
                  <li>✅ Injetável (shear-thinning)</li>
                  <li>✅ Esterilizável (autoclave/filtro)</li>
                  <li>✅ Transparente (necessário p/ ocular)</li>
                </ul>
              </div>
            </div>
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/15 p-3 text-xs flex items-start gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
              <p className="text-amber-200/90">
                <strong>Racional:</strong> O módulo de Young da gengiva saudável fica entre 5-30 kPa. Se você pedir 100
                kPa, a IA vai <em>avisar</em> que isso é mais próximo de cartilagem. Ela <strong className="text-white">não obriga</strong>,
                mas mostra o que a literatura espera para o seu tecido.
              </p>
            </div>
            <h5 className="text-[11px] font-semibold text-gray-300 uppercase tracking-wide mt-4 mb-1.5">Restrições éticas/regulatórias (opcional)</h5>
            <ul className="text-[11px] text-gray-400 space-y-0.5 ml-3">
              <li>🚫 Sem ingredientes de origem animal (ex: paciente vegano, halal/kosher)</li>
              <li>🚫 Sem fotoiniciadores (sensibilidade ocular)</li>
              <li>✅ Apenas FDA-cleared (regulatório fast-track)</li>
              <li>💰 Custo-sensível (academia, baixa renda)</li>
            </ul>
          </StepCard>

          {/* ETAPA 4 */}
          <StepCard n={4} title="Resultado: leia, valide, exporte" icon={CheckCircle2} accent="emerald">
            <p className="mb-3">
              Em 15-35 segundos a IA devolve um <strong className="text-emerald-300">dossiê profissional</strong> com 10 seções:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {[
                { t: "1. Score multidimensional 0-100", d: "Mecânico / Biológico / Manufatura / Regulatório" },
                { t: "2. Racional científico", d: "Por que essa combinação funciona (3-5 frases)" },
                { t: "3. Tabela de componentes ajustada", d: "Concentrações otimizadas + classe de segurança ISO" },
                { t: "4. Crosslinking final", d: "Método + parâmetros (UV nm, mM CaCl₂, tempo)" },
                { t: "5. Propriedades preditas", d: "Módulo, porosidade, swelling, viabilidade celular" },
                { t: "6. Protocolo de preparação", d: "Passos com tempo, temperatura, pontos críticos (CCPs)" },
                { t: "7. Alertas e incompatibilidades", d: "Crítico / Aviso / Info — com sugestões de mitigação" },
                { t: "8. Parâmetros de bioimpressão", d: "Pressão, velocidade, bico, infill, temperatura" },
                { t: "9. Caracterização recomendada", d: "Métodos para validar a formulação no banco" },
                { t: "10. Classe regulatória + DOIs reais", d: "FDA/ANVISA/EMA + 3 referências peer-reviewed" },
              ].map((item, i) => (
                <div key={i} className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-2.5">
                  <div className="text-[11px] font-semibold text-emerald-300">{item.t}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{item.d}</div>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-3 text-xs flex items-start gap-2">
              <Save className="w-3.5 h-3.5 text-emerald-300 shrink-0 mt-0.5" />
              <p className="text-emerald-200/90">
                <strong>Exportação:</strong> Botão <code className="text-white bg-white/10 px-1 rounded">Baixar JSON</code> para integrar
                com pipelines automáticos. Botão <code className="text-white bg-white/10 px-1 rounded">Baixar Markdown</code> para colar
                direto em artigos, propostas FAPESP/CNPq, ou no Notebook Científico da BIA.
              </p>
            </div>
          </StepCard>
        </div>
      </div>

      {/* RACIONAL CIENTÍFICO */}
      <Box2 icon={Microscope} title="Como a IA pensa por dentro?" tone="info">
        <p className="mb-3">
          A IA do Formulador Pro combina <strong className="text-white">3 camadas</strong> de raciocínio para gerar formulações sólidas:
        </p>
        <div className="space-y-3">
          <div className="rounded-xl bg-blue-500/5 border border-blue-500/15 p-4">
            <h5 className="text-sm font-bold text-blue-200 mb-1 flex items-center gap-1.5">
              <span className="text-xs px-1.5 py-0.5 bg-blue-500/30 text-blue-100 rounded font-mono">CAMADA 1</span>
              Regras determinísticas (não-IA)
            </h5>
            <p className="text-xs text-gray-300">
              Antes de chamar a IA, o sistema roda <strong>6 verificações químicas duras</strong>: alginato + colágeno
              precipita? Quitosana + ânion forma PEC desbalanceado? GelMA sem fotoiniciador? Fibrina + trombina geliza
              em segundos? CaCl₂ + fosfato precipita? EDC hidrolisa em água sem NHS? <strong className="text-white">Esses alertas
              entram primeiro no resultado</strong> — a IA não pode "esquecer" deles.
            </p>
          </div>
          <div className="rounded-xl bg-purple-500/5 border border-purple-500/15 p-4">
            <h5 className="text-sm font-bold text-purple-200 mb-1 flex items-center gap-1.5">
              <span className="text-xs px-1.5 py-0.5 bg-purple-500/30 text-purple-100 rounded font-mono">CAMADA 2</span>
              Templates clínicos por objetivo
            </h5>
            <p className="text-xs text-gray-300">
              Para cada um dos <strong>10 objetivos clínicos</strong> (cicatrização, osso, gengiva, cartilagem, implante mamário,
              vascular, neural, drug delivery, organoide, genérico) há um <em>template científico</em> com módulo alvo, famílias
              de polímeros recomendadas, considerações regulatórias (ISO 10993, ISO 14607, ANVISA RDC 751/2022) e métodos
              de caracterização específicos.
            </p>
          </div>
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-4">
            <h5 className="text-sm font-bold text-emerald-200 mb-1 flex items-center gap-1.5">
              <span className="text-xs px-1.5 py-0.5 bg-emerald-500/30 text-emerald-100 rounded font-mono">CAMADA 3</span>
              IA Gemini 2.5 com prompt especializado
            </h5>
            <p className="text-xs text-gray-300">
              A IA recebe um <em>prompt sistêmico</em> de "biomaterial expert" treinado em 807+ formulações validadas, com
              instruções para retornar apenas JSON estruturado, citar DOIs reais (2020-2025), usar concentrações com unidade
              correta, e aplicar score 0-100 em 4 dimensões. Schema é <strong className="text-white">forçado</strong> — a IA não pode
              inventar campos novos.
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Resultado: você recebe uma análise que combina <strong className="text-white">rigor químico determinístico</strong> + 
          <strong className="text-white"> contexto clínico estruturado</strong> + <strong className="text-white">criatividade contextualizada da IA</strong>.
          Não é só um "ChatGPT genérico" — é um sistema híbrido com salvaguardas.
        </p>
      </Box2>

      {/* TROUBLESHOOTING */}
      <Box2 icon={ShieldCheck} title="Resolução de problemas" tone="warn">
        <div className="space-y-2.5 text-xs">
          {[
            {
              prob: "❌ \"Sessão expirada\" (erro 401)",
              sol: "Sua sessão de login terminou. Clique em \"Fazer login →\" — seus dados ficam salvos automaticamente em rascunho local."
            },
            {
              prob: "❌ \"Créditos insuficientes\" (erro 402)",
              sol: "Cada análise custa 10 créditos. Veja seu plano em Configurações → Assinatura. Plano Free recebe 30 créditos/mês."
            },
            {
              prob: "❌ \"Tempo limite excedido\" (>90s)",
              sol: "A IA pode demorar mais com formulações muito complexas (8 componentes + muitas specs). Clique em \"Tentar novamente\" — os dados estão preservados. Se persistir, simplifique a entrada."
            },
            {
              prob: "❌ \"Dados inválidos\" (erro 400)",
              sol: "Algum campo está fora do esperado: nome de componente vazio, max < min em alguma faixa, mais de 8 componentes. A mensagem mostra qual campo corrigir."
            },
            {
              prob: "⚠️ Resultado tem score baixo (<50)",
              sol: "A IA está te avisando que essa combinação não atende bem o objetivo. Leia os warnings — geralmente é incompatibilidade química ou ausência de componente crítico (ex: GelMA sem fotoiniciador)."
            },
            {
              prob: "⚠️ Recarreguei a página e perdi o trabalho",
              sol: "Não perdeu! O Formulador Pro tem auto-save em localStorage. Ao reabrir, seus dados aparecem automaticamente. Use \"Nova formulação\" só quando quiser zerar de propósito."
            },
          ].map((item, i) => (
            <div key={i} className="rounded-lg bg-amber-500/5 border border-amber-500/15 p-3">
              <p className="font-semibold text-amber-200">{item.prob}</p>
              <p className="text-amber-100/70 mt-0.5">{item.sol}</p>
            </div>
          ))}
        </div>
      </Box2>

      {/* CHEAT SHEET */}
      <Box2 icon={FileText} title="Cheat-sheet: 5 minutos para uma formulação Pro" tone="info">
        <ol className="space-y-2 text-xs text-gray-300 list-decimal list-inside">
          <li><strong className="text-white">1 min</strong> — Escolha categoria + escreva 1 parágrafo de objetivo claro</li>
          <li><strong className="text-white">2 min</strong> — Adicione 3-5 componentes com nome, concentração e papel</li>
          <li><strong className="text-white">1 min</strong> — Marque 2-3 specs críticas (módulo, biodegradável, injetável…)</li>
          <li><strong className="text-white">~30 s</strong> — Clique em "Gerar formulação" — aguarde a IA terminar</li>
          <li><strong className="text-white">~30 s</strong> — Leia score, warnings, exporte JSON+MD para sua pasta</li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/dashboard/formulator-pro" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold">
            <Atom className="w-3.5 h-3.5" /> Começar agora
          </Link>
          <Link href="/dashboard/roadmap" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10">
            <Map className="w-3.5 h-3.5" /> Ver no Roteiro completo
          </Link>
        </div>
      </Box2>
    </article>
  )
}

// ═════════════════════════════════════════════════════════════════════════
// CAPÍTULO 2 — FORMULADOR BIO (clássico) — referência rápida
// ═════════════════════════════════════════════════════════════════════════

function ChapterFormulatorBio() {
  return (
    <article className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 border border-emerald-500/20 p-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-emerald-300" /> Formulador Bio (Clássico)
        </h2>
        <p className="text-sm text-emerald-100/80">
          Recomendação <strong>rápida</strong> baseada no catálogo BIA de 31 biomateriais validados (GelMA, Alginato, PCL,
          dECM…). Ideal para screening inicial e quando você quer apenas <em>uma</em> sugestão pronta.
        </p>
        <Link href="/dashboard/biomaterials" className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold">
          <Rocket className="w-3.5 h-3.5" /> Abrir Formulador Bio
        </Link>
      </div>
      <Box2 icon={ArrowRight} title="Fluxo em 3 passos" tone="default">
        <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
          <li>Digite a <strong>aplicação</strong> (ex: "regeneração óssea")</li>
          <li>Escolha o <strong>tipo de tecido</strong> e marque biodegradável/imprimível/com células</li>
          <li>Receba 1 recomendação principal com referência DOI</li>
        </ol>
        <p className="text-xs text-gray-400 mt-3">
          Para combinações multi-componente customizadas, use o <Link href="/dashboard/manual" className="text-blue-300 hover:underline">Formulador Pro →</Link>
        </p>
      </Box2>
    </article>
  )
}

// ═════════════════════════════════════════════════════════════════════════
// CAPÍTULO 3 — STL GENERATOR
// ═════════════════════════════════════════════════════════════════════════

function ChapterSTLGenerator() {
  return (
    <article className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 border border-violet-500/20 p-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Box className="w-6 h-6 text-violet-300" /> Gerador STL — Geometrias 3D para bioimpressão
        </h2>
        <p className="text-sm text-violet-100/80">
          Crie modelos 3D paramétricos prontos para fatiar (slicing): membrana, disco, bloco ósseo com gyroid, vaso,
          fêmur, nariz, menisco, córnea, esfera, orelha, coração, rim, fígado, mão. <strong className="text-white">Saída em STL
          binário/ASCII e OBJ Wavefront</strong>, unidades em mm.
        </p>
        <Link href="/dashboard/stl" className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-lg bg-violet-500 hover:bg-violet-400 text-white text-xs font-semibold">
          <Rocket className="w-3.5 h-3.5" /> Abrir Gerador STL
        </Link>
      </div>

      <Box2 icon={Lightbulb} title="O racional simples" tone="info">
        <p className="mb-3">
          Bioimpressora não entende "quero um vaso sanguíneo" — ela precisa de um arquivo <strong className="text-violet-300">STL</strong> com a forma
          exata. O Gerador STL transforma sua ideia clínica em um arquivo 3D que entra direto no slicer (Cura, Slic3r,
          Simplify3D) ou no Motor GCODE da BIA.
        </p>
        <p className="text-xs text-gray-400">
          Cada geometria tem <strong>parâmetros editáveis</strong> (raio, comprimento, espessura, infill, segmentos…)
          para você ajustar à anatomia do paciente ou ao seu experimento.
        </p>
      </Box2>

      <Box2 icon={Sparkles} title="Novo em v4.3 — Scaffolds TPMS + Validador de Mesh" tone="info">
        <p className="mb-3">
          Foram adicionadas <strong className="text-violet-300">3 geometrias TPMS</strong> (Triply Periodic Minimal
          Surfaces) usadas em pesquisa de regeneração óssea avançada:
        </p>
        <ul className="space-y-1.5 text-xs text-gray-300 list-disc list-inside mb-3">
          <li><strong className="text-white">Gyroid 🌀</strong> — padrão-ouro: alta razão superfície/volume, isotrópico, vascularizável.</li>
          <li><strong className="text-white">Schwarz P 🟦</strong> — canais retos, mais simples de imprimir, ideal para iniciantes em TPMS.</li>
          <li><strong className="text-white">Diamond 💎</strong> — máxima razão S/V, para projetos avançados de pesquisa.</li>
        </ul>
        <p className="mb-3">
          Cada geometria gerada agora passa por um <strong className="text-emerald-300">Validador de Mesh</strong> que
          confere automaticamente:
        </p>
        <ul className="space-y-1 text-xs text-gray-300 list-disc list-inside mb-3">
          <li><strong>Manifold</strong> — toda aresta pertence a exatamente 2 triângulos? (slicers exigem)</li>
          <li><strong>Watertight</strong> — não há buracos no mesh? (extrusão correta)</li>
          <li><strong>Normais consistentes</strong> — faces apontam para fora? (não inverte impressão)</li>
          <li><strong>Volume e área</strong> — em mm³ e mm² para validar contra DICOM/TC do paciente.</li>
          <li><strong>Paredes finas</strong> — detecta arestas &lt; ½ × Ø do bico (que vão colapsar).</li>
        </ul>
        <p className="text-xs text-emerald-300/80">
          ✓ <strong>Quality Score 0-100</strong> aparece no canto direito após gerar. Score ≥ 90 = pronto para impressão.
        </p>
      </Box2>

      <Box2 icon={Download} title="Novo formato: PLY (Polygon File Format)" tone="default">
        <p className="text-xs text-gray-400">
          Além de STL e OBJ, agora exportamos em <strong className="text-cyan-300">PLY</strong> — formato preferido por
          ferramentas de pesquisa (CloudCompare, MeshLab, Open3D). Útil quando seu workflow envolve análise de mesh,
          comparação com escaneamento de TC, ou pipeline de visão computacional.
        </p>
      </Box2>

      <Box2 icon={CheckCircle2} title="Workflow recomendado (3 minutos)" tone="default">
        <ol className="space-y-2.5 text-sm text-gray-300 list-decimal list-inside">
          <li>
            <strong className="text-white">Escolha a geometria</strong> que mais se aproxima do tecido (ex: bloco ósseo para defeito ósseo).
            Cada uma tem ícone, descrição e tecido alvo no painel esquerdo.
          </li>
          <li>
            <strong className="text-white">Ajuste os parâmetros</strong> — dimensões em mm, infill em %, segmentos para resolução.
            Mais segmentos = curvas mais lisas mas arquivo maior.
          </li>
          <li>
            <strong className="text-white">Clique em "Gerar"</strong> — leva ~80ms. Veja: nº triângulos, tamanho do arquivo, métricas
            de qualidade (manifold, watertightness, BBox).
          </li>
          <li>
            <strong className="text-white">Baixe</strong> — STL binário (mais leve) para slicers; STL ASCII (legível) para auditoria; OBJ
            para Blender/MeshLab.
          </li>
          <li>
            <strong className="text-white">Importe no Motor GCODE</strong> da BIA para fatiar com infill avançado (Voronoi, Gyroid,
            dual-porosity) e gerar G-code direto para a impressora.
          </li>
        </ol>
      </Box2>

      <Box2 icon={AlertTriangle} title="Boas práticas de bioimpressão" tone="warn">
        <ul className="space-y-2 text-xs text-gray-300 list-disc list-inside">
          <li><strong className="text-white">Espessura mínima:</strong> ≥ 1× diâmetro do bico (200-400 µm) — paredes mais finas falham.</li>
          <li><strong className="text-white">Overhangs:</strong> ângulos &gt;45° precisam de suporte ou hidrogel sacrificial (FRESH).</li>
          <li><strong className="text-white">Resolução XY:</strong> use segmentos = perímetro_alvo / (resolução_bico × 2) — ex: 48-64 segs para vasos.</li>
          <li><strong className="text-white">Camadas:</strong> altura padrão 150-200 µm; abaixo de 100 µm requer impressora alta-resolução.</li>
          <li><strong className="text-white">Validação clínica:</strong> dimensões anatômicas devem vir de imagem médica (DICOM-CT/MRI), não estimativa.</li>
        </ul>
      </Box2>
    </article>
  )
}

// ═════════════════════════════════════════════════════════════════════════
// CAPÍTULO 4 — BIOPRINTING
// ═════════════════════════════════════════════════════════════════════════

function ChapterBioprinting() {
  return (
    <article className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 border border-amber-500/20 p-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Printer className="w-6 h-6 text-amber-300" /> Bioimpressão 3D — Parâmetros otimizados
        </h2>
        <p className="text-sm text-amber-100/80">
          Para qualquer bioink + tecido alvo, a BIA gera <strong>pressão de extrusão, velocidade, temperatura, layer
          height, infill</strong> otimizados. Suporta extrusão (EBB), inkjet, DLP/SLA, FRESH, laser e coaxial.
        </p>
        <Link href="/dashboard/bioprinting" className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-xs font-semibold">
          <Rocket className="w-3.5 h-3.5" /> Abrir Bioimpressão 3D
        </Link>
      </div>
      <Box2 icon={Lightbulb} title="Racional rápido" tone="info">
        <p>
          A IA usa a <strong>equação de Hagen-Poiseuille</strong> para calcular a pressão ótima a partir da viscosidade
          da bioink, do diâmetro do bico e da taxa de extrusão desejada. Para hidrogéis fotopolimerizáveis (DLP), usa a
          <strong> dose de UV crítica</strong> para curar com mínima citotoxicidade. Cada combo bioink+impressora
          devolve uma janela operacional segura.
        </p>
      </Box2>
    </article>
  )
}

// ═════════════════════════════════════════════════════════════════════════
// CAPÍTULO 5 — ROADMAP FUTURO
// ═════════════════════════════════════════════════════════════════════════

function ChapterRoadmapFuture() {
  return (
    <article className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-pink-500/15 to-rose-500/15 border border-pink-500/20 p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] px-2 py-0.5 bg-pink-500/15 text-pink-300 rounded font-mono uppercase">Capítulo 5</span>
          <span className="text-[10px] px-2 py-0.5 bg-rose-500/15 text-rose-300 rounded font-mono uppercase">FUTURO</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Rocket className="w-7 h-7 text-pink-300" />
          Roadmap Futuro — O que vem por aí
        </h2>
        <p className="text-sm sm:text-base text-pink-100/80 leading-relaxed">
          A BIA evolui continuamente. Aqui está o que já está planejado para as próximas versões — a maioria
          baseada em feedback do uso real. Quer pedir uma feature? Me chame no chat. 💬
        </p>
      </div>

      {/* v4.4 — Próxima */}
      <Box2 icon={Sparkles} title="v4.4 (próximo mês) — Visualização & Persistência" tone="info">
        <ul className="space-y-3 text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-pink-300 mt-0.5">▸</span>
            <div>
              <strong className="text-white">Preview 3D real (Three.js)</strong> no Gerador STL.
              Em vez do desenho SVG isométrico, você vai poder <em>orbitar, fazer zoom e medir</em> a peça antes
              de baixar. Acelera muito a iteração de parâmetros.
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-pink-300 mt-0.5">▸</span>
            <div>
              <strong className="text-white">Histórico de formulações</strong> no Formulador Pro.
              Toda formulação gerada vai ficar salva no seu painel — você poderá comparar versões, marcar
              favoritas e exportar relatório consolidado.
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-pink-300 mt-0.5">▸</span>
            <div>
              <strong className="text-white">PDF científico</strong> do resultado do Formulador Pro
              (capa, racional, protocolo, referências formatadas ABNT/Vancouver).
            </div>
          </li>
        </ul>
      </Box2>

      {/* v4.5 */}
      <Box2 icon={Lightbulb} title="v4.5 (Q3 2026) — IA Multi-modelo & DICOM" tone="default">
        <ul className="space-y-3 text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-rose-300 mt-0.5">▸</span>
            <div>
              <strong className="text-white">Importação DICOM-CT/MRI</strong> direto no Gerador STL.
              Você sobe a imagem médica do paciente e a BIA segmenta o tecido alvo (osso, pele, vaso) e
              gera o STL personalizado. Hoje o caminho é externo (3D Slicer → STL → BIA).
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-rose-300 mt-0.5">▸</span>
            <div>
              <strong className="text-white">Múltiplos LLMs</strong> no Formulador Pro — escolher entre
              Gemini 2.5 (atual), GPT-4o ou Claude 3.5 conforme o tipo de análise. Comparação A/B/C entre
              respostas para casos críticos.
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-rose-300 mt-0.5">▸</span>
            <div>
              <strong className="text-white">Reparo automático de mesh</strong> — quando o validador
              detecta NON_MANIFOLD ou NOT_WATERTIGHT, um botão "Reparar" tenta consertar usando algoritmos
              clássicos de mesh repair (sem precisar abrir Meshmixer).
            </div>
          </li>
        </ul>
      </Box2>

      {/* v5.0 */}
      <Box2 icon={Wrench} title="v5.0 (2027) — Plataforma Colaborativa" tone="warn">
        <ul className="space-y-3 text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-amber-300 mt-0.5">▸</span>
            <div>
              <strong className="text-white">Workspaces multi-usuário</strong> — laboratórios poderão ter
              equipes compartilhando catálogos, formulações e protocolos com permissões granulares.
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-300 mt-0.5">▸</span>
            <div>
              <strong className="text-white">Integração com bioimpressoras reais</strong> via WebUSB/Serial —
              já temos guia de conexão; v5.0 vai permitir <em>imprimir direto da BIA</em>, sem exportar
              G-code intermediário.
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-300 mt-0.5">▸</span>
            <div>
              <strong className="text-white">Caderno de laboratório eletrônico (ELN) certificado</strong>
              — assinatura digital, trilha de auditoria 21 CFR Part 11, exportação para repositórios
              regulatórios (FDA eCTD, ANVISA Datavisa).
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-300 mt-0.5">▸</span>
            <div>
              <strong className="text-white">Marketplace de protocolos</strong> validados — pesquisadores
              podem publicar formulações e receber royalties por uso (modelo similar a Protocols.io + Apple Store).
            </div>
          </li>
        </ul>
      </Box2>

      {/* Pesquisa em aberto */}
      <Box2 icon={Microscope} title="Pesquisa em aberto — ideias que estamos validando" tone="default">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
            <div className="text-xs font-bold text-cyan-300 mb-1">🧬 Predição de citotoxicidade</div>
            <div className="text-xs text-gray-400">
              Modelo ML treinado em ~12.000 ensaios MTT/LDH para prever IC50 antes da síntese.
              Reduz custos experimentais em ~40%.
            </div>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
            <div className="text-xs font-bold text-cyan-300 mb-1">🔬 Otimização Bayesiana de bioink</div>
            <div className="text-xs text-gray-400">
              Sugerir os próximos 3-5 experimentos que mais reduzem incerteza no espaço de
              parâmetros (concentração × pH × temperatura × UV).
            </div>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
            <div className="text-xs font-bold text-cyan-300 mb-1">🧪 Digital Twin de tecidos</div>
            <div className="text-xs text-gray-400">
              Simular degradação in vivo de scaffolds (PCL/PLGA/GelMA) ao longo de 6 meses
              usando FEM acoplado com cinética química.
            </div>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
            <div className="text-xs font-bold text-cyan-300 mb-1">📊 Comparador de literatura</div>
            <div className="text-xs text-gray-400">
              Buscar artigos no PubMed/PMC e fazer meta-análise automática das propriedades
              relatadas para a sua formulação específica.
            </div>
          </div>
        </div>
      </Box2>

      {/* Como contribuir */}
      <Box2 icon={GitBranch} title="Como contribuir" tone="info">
        <p className="text-xs text-gray-400 mb-3">
          A BIA é desenvolvida pela <strong className="text-white">Quantis Biotechnology</strong> com colaboração
          aberta da comunidade científica brasileira:
        </p>
        <ul className="space-y-1.5 text-xs text-gray-300">
          <li>📝 <strong>Reportar bugs ou pedir features:</strong> use o chat da BIA — sua mensagem vai direto para o time.</li>
          <li>🧪 <strong>Compartilhar dados:</strong> formulações, protocolos e referências validadas ajudam a treinar a IA.</li>
          <li>📚 <strong>Validar publicações:</strong> tem artigo publicado? Adicione DOI ao Knowledge Base e ganhe créditos.</li>
          <li>👨‍🔬 <strong>Beta-testar versões novas:</strong> usuários ativos têm acesso antecipado a v4.4+.</li>
        </ul>
      </Box2>
    </article>
  )
}

// ═════════════════════════════════════════════════════════════════════════
//  CAPÍTULO 6 — VISÃO ESTRATÉGICA DO FORMULADOR PRO
// ═════════════════════════════════════════════════════════════════════════

function ChapterVisionFormulator() {
  return (
    <article className="space-y-6">
      <header className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Visão Estratégica — Formulador Pro</h1>
          <p className="text-sm text-gray-400 mt-1">
            12 melhorias priorizadas para tornar o módulo um <strong className="text-cyan-300">co-piloto científico de classe mundial</strong>.
          </p>
        </div>
      </header>

      <div className="rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 p-5">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-cyan-300 mt-0.5 shrink-0" />
          <div className="space-y-2 text-sm text-gray-200">
            <p>
              <strong className="text-cyan-200">Para a Janaina e a equipe:</strong> esta análise foi feita
              sob a ótica de um <em>cientista sênior de biomateriais + product strategist</em>, identificando
              o que falta para o Formulador Pro ser <strong>auditável, reprodutível e aprendiz</strong>.
            </p>
            <p>
              O documento técnico completo está em <code className="px-1.5 py-0.5 rounded bg-black/40 text-cyan-300">docs/FORMULATOR_PRO_ROADMAP.md</code>.
              Aqui apresentamos um resumo amigável.
            </p>
          </div>
        </div>
      </div>

      <Box2 icon={CheckCircle2} title="Onde já estamos fortes (diagnóstico atual)" tone="emerald">
        <ul className="space-y-1.5 text-xs text-gray-300">
          <li>✅ Aceita até 8 biomateriais (catálogo + custom) com 7 papéis funcionais</li>
          <li>✅ Templates científicos para 10 objetivos clínicos (osso, gengiva, mama, vaso…)</li>
          <li>✅ 6 regras determinísticas de incompatibilidade química pré-checadas</li>
          <li>✅ JSON estruturado: score 0-100, protocolo, propriedades, regulatório, DOIs</li>
          <li>✅ Normalização defensiva — nunca quebra a UI mesmo se a IA falhar</li>
        </ul>
        <p className="text-xs text-emerald-300 mt-3">
          📊 Conclusão: <strong>base sólida</strong>. Próximo salto = rigor científico verificável e aprendizado contínuo.
        </p>
      </Box2>

      <h2 className="text-lg font-semibold text-white flex items-center gap-2 mt-6">
        <Rocket className="w-5 h-5 text-cyan-400" />
        Plano em 3 sprints
      </h2>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold">SPRINT 1 · 2 SEMANAS</span>
          <h3 className="text-base font-semibold text-white">Confiança & Transparência</h3>
        </div>
        <p className="text-xs text-gray-400 mb-3">Quick wins de máximo ROI. Tornam cada formulação <strong>auditável + reproduzível + visualizável</strong>.</p>
        <div className="space-y-2.5">
          <VisionItem number={4} title="Verificação automática de DOIs (CrossRef API)" value={5} effort={1} quick
            desc="Toda referência citada pela IA é validada em real-time. Inválidas viram alerta vermelho. Nunca mais cite um DOI alucinado em um artigo. ROI máximo: 3-5 dias de implementação." />
          <VisionItem number={8} title="Snapshot e versionamento (reprodutibilidade)" value={4} effort={2} quick
            desc="Cada formulação salva: hash do input, versão do prompt, modelo, temperatura, seed. Botão 'Citar BIA' gera frase pronta para metodologia de papers (PLOS, Biomaterials, ACS aceitam)." />
          <VisionItem number={11} title="Preview 3D do scaffold sugerido" value={4} effort={3} quick
            desc="Conecta Formulador Pro ↔ Gerador STL. Resultado deixa de ser 'só texto' — usuário vê a peça 3D. 'Wow factor' que fecha venda." />
          <VisionItem number={12} title="Feedback 👍/👎 + Aprendizado contínuo" value={4} effort={3} quick
            desc="Cada formulação pode ser avaliada. A cada 100 feedbacks, padrões viram 'patches' do system prompt. Network effect real: BIA fica mais inteligente com o uso da comunidade." />
        </div>
      </div>

      <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-semibold">SPRINT 2 · 4 SEMANAS</span>
          <h3 className="text-base font-semibold text-white">Inteligência Verificável</h3>
        </div>
        <p className="text-xs text-gray-400 mb-3">A IA passa de <strong>estimadora</strong> → <strong>calculadora científica auditável</strong>.</p>
        <div className="space-y-2.5">
          <VisionItem number={2} title="Banco de dados de propriedades curado (BIA Property DB)" value={5} effort={4}
            desc="100+ biomateriais × 12 propriedades × faixas de concentração com DOIs. Lookup antes da IA: ela não inventa mais — interpola e contextualiza." />
          <VisionItem number={1} title="Modelos físico-químicos quantitativos" value={5} effort={3}
            desc="Flory-Rehner (swelling), Hagen-Poiseuille (extrusão), Mooney-Rivlin (elastômeros), Higuchi (release). A IA revisa números calculados — não chuta." />
          <VisionItem number={5} title="Modo iteração (chat refinamento)" value={5} effort={3}
            desc="Após 1ª fórmula, abre painel de chat com chips: 'aumentar módulo 2×', 'sem origem animal', 'reduzir custo 30%'. Cada iteração custa 3 créditos (vs 10 inicial). Timeline + comparação v1/v2/v3." />
        </div>
      </div>

      <div className="rounded-xl border border-pink-500/20 bg-pink-500/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 text-[10px] font-semibold">SPRINT 3 · 6-8 SEMANAS</span>
          <h3 className="text-base font-semibold text-white">Diferenciação Competitiva</h3>
        </div>
        <p className="text-xs text-gray-400 mb-3">Posicionamento como <strong>único agente científico de classe mundial em biofabricação</strong>.</p>
        <div className="space-y-2.5">
          <VisionItem number={3} title="Cross-check multi-LLM (Gemini + GPT-4o + Claude 3.5)" value={5} effort={4}
            desc="Modo 'Consenso Científico' (30 créditos): 3 LLMs em paralelo, score de consenso 0-100, divergências destacadas. Nenhum concorrente faz isso para biomateriais." />
          <VisionItem number={9} title="RAG sobre 120+ artigos científicos" value={5} effort={4}
            desc="Embeddings + Vector Store. Cada afirmação da IA acompanhada do trecho citado e DOI. Posicionamento: 'Perplexity para biomateriais'." />
          <VisionItem number={7} title="Compliance regulatório auditável (FDA/ANVISA/EMA)" value={5} effort={4}
            desc="Árvore de regras MDR 2017/745, FDA 21 CFR 860.7, RDC 751/2022. Sugere predicate device 510(k) por similaridade. Exporta PDF para submissão real. Único no mundo." />
          <VisionItem number={10} title="Workspace de comparação de fórmulas" value={4} effort={3}
            desc="Página /workspace: grid de cards, filtros, comparação 2-4 fórmulas lado-a-lado, radar chart de scores, tags ('Tese MS', 'Projeto X'), export consolidado." />
          <VisionItem number={6} title="Otimização Bayesiana de concentrações" value={4} effort={5}
            desc="Modo exploração (50 créditos): GP + Expected Improvement em 8-12 iterações. Heatmap do design space + 3 candidatos Pareto-ótimos. Categoria nova de produto." />
        </div>
      </div>

      <Box2 icon={Target} title="🎯 O próximo passo concreto desta semana" tone="cyan">
        <p className="text-sm text-gray-200 leading-relaxed">
          Implementar <strong className="text-cyan-300">#4 (DOI verifier) + #8 (snapshot)</strong> — total ~7 dias.
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Esses dois eliminam o <strong>maior risco de credibilidade científica</strong> com mínimo esforço,
          e são pré-requisito para todos os demais avanços. Após implementados, a equipe pode anunciar oficialmente
          que <strong className="text-cyan-300">"toda formulação BIA é cientificamente auditável e reproduzível"</strong> —
          uma claim que nenhum concorrente pode fazer hoje.
        </p>
      </Box2>

      <Box2 icon={Beaker} title="💰 Modelo de monetização sugerido" tone="amber">
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-xs">
            <thead className="text-amber-300 border-b border-amber-500/30">
              <tr>
                <th className="text-left py-2 px-2">Funcionalidade</th>
                <th className="text-left py-2 px-2">Plano</th>
                <th className="text-right py-2 px-2">Créditos</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-white/5"><td className="py-1.5 px-2">Formulação Pro básica</td><td className="px-2">Discovery (free 30)</td><td className="text-right px-2">10</td></tr>
              <tr className="border-b border-white/5"><td className="py-1.5 px-2">Verificação DOI + Reproduzível</td><td className="px-2">Incluído</td><td className="text-right px-2">0</td></tr>
              <tr className="border-b border-white/5"><td className="py-1.5 px-2">Preview 3D</td><td className="px-2">Discovery+</td><td className="text-right px-2">2</td></tr>
              <tr className="border-b border-white/5"><td className="py-1.5 px-2">Modo iteração (chat)</td><td className="px-2">Discovery+</td><td className="text-right px-2">3</td></tr>
              <tr className="border-b border-white/5"><td className="py-1.5 px-2">Consenso multi-LLM</td><td className="px-2">Pro</td><td className="text-right px-2">30</td></tr>
              <tr className="border-b border-white/5"><td className="py-1.5 px-2">Otimização Bayesiana</td><td className="px-2">Pro / Lab</td><td className="text-right px-2">50</td></tr>
              <tr className="border-b border-white/5"><td className="py-1.5 px-2">Compliance regulatório PDF</td><td className="px-2">Lab / Enterprise</td><td className="text-right px-2">20</td></tr>
              <tr><td className="py-1.5 px-2">Workspace ilimitado</td><td className="px-2">Lab / Enterprise</td><td className="text-right px-2">—</td></tr>
            </tbody>
          </table>
        </div>
      </Box2>

      <Box2 icon={GitBranch} title="🎯 KPIs propostos" tone="purple">
        <ul className="space-y-1.5 text-xs text-gray-300">
          <li>• <strong>Retenção D7</strong> ≥ 40% — usuários voltam em 7 dias após 1ª fórmula</li>
          <li>• <strong>Score de feedback</strong> ≥ 85% (👍 / total)</li>
          <li>• <strong>DOIs válidos</strong> ≥ 95% (verificados no CrossRef)</li>
          <li>• <strong>Time to first useful formula</strong> ≤ 8 minutos do signup</li>
          <li>• <strong>NPS Formulador Pro</strong> ≥ 60 (survey trimestral)</li>
          <li>• <strong>Reprodutibilidade</strong> = 100% das execuções com snapshot completo</li>
          <li>• <strong>Conversão demo → pago</strong> ≥ 12% após uso do Formulador Pro</li>
        </ul>
      </Box2>

      <Box2 icon={ShieldCheck} title="🛡️ Riscos & mitigações" tone="rose">
        <ul className="space-y-1.5 text-xs text-gray-300">
          <li>• <strong>Custo LLM explode</strong> com multi-LLM → cache 90 dias por inputHash; modo single como default.</li>
          <li>• <strong>Rate-limit CrossRef</strong> → cache 30 dias + retry exponencial.</li>
          <li>• <strong>Property DB desatualizado</strong> → job mensal de scraping PubMed; flag 'última atualização'.</li>
          <li>• <strong>Feedback enviesado</strong> → gamification leve (selo "Contribuiu para 10 melhorias").</li>
        </ul>
      </Box2>

      <div className="rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 p-4 mt-6">
        <p className="text-xs text-gray-300 leading-relaxed">
          📄 <strong className="text-cyan-300">Documento completo:</strong> {" "}
          <code className="px-1.5 py-0.5 rounded bg-black/40 text-cyan-200">docs/FORMULATOR_PRO_ROADMAP.md</code> {" "}
          (no GitHub) — contém a justificativa técnica detalhada de cada uma das 12 melhorias,
          entregáveis de código por item, e referências de literatura.
        </p>
      </div>
    </article>
  )
}

function VisionItem({
  number, title, desc, value, effort, quick,
}: {
  number: number
  title: string
  desc: string
  value: number
  effort: number
  quick?: boolean
}) {
  return (
    <div className="rounded-lg bg-black/30 border border-white/5 p-3 hover:border-white/10 transition">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-xs font-bold text-cyan-300 shrink-0">
          {number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-white">{title}</h4>
            {quick && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[9px] font-semibold">
                QUICK WIN
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
          <div className="flex items-center gap-3 mt-2 text-[10px]">
            <span className="text-cyan-300">💎 Valor {"⭐".repeat(value)}</span>
            <span className="text-gray-500">⚙️ Esforço {"●".repeat(effort)}{"○".repeat(5 - effort)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

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
          <h1 className="text-2xl font-bold text-white">Análise dos Constructos Impressos</h1>
          <p className="text-sm text-gray-400 mt-1">
            Como avaliar objetivamente sua bioimpressão usando <strong className="text-amber-300">fotografia + ImageJ</strong>.
            Protocolos reproduzíveis para qualquer laboratório.
          </p>
        </div>
      </header>

      <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-rose-500/10 border border-amber-500/20 p-5">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-amber-300 mt-0.5 shrink-0" />
          <div className="space-y-2 text-sm text-gray-200">
            <p>
              <strong className="text-amber-200">Princípio fundamental:</strong> não basta imprimir — você precisa
              <strong> medir objetivamente</strong> se a impressão correspondeu ao desenho.
              Sem números, não há ciência reprodutível.
            </p>
            <p className="text-xs text-gray-400">
              Este capítulo usa apenas <strong className="text-amber-200">um celular + régua + ImageJ (grátis)</strong> —
              acessível para qualquer laboratório. Para análises avançadas, usar µ-CT, AFM, reometria (capítulos futuros).
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
          💡 <strong>Dica de ouro:</strong> sempre tire 3 fotos da mesma amostra (top, 2 laterais). Salve com nome
          padronizado: <code className="px-1 rounded bg-black/40">YYYYMMDD_amostra-ID_view.jpg</code>
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
          <li>• <strong>Reometria oscilatória:</strong> G' / G'' do bioink antes e depois de crosslinking.</li>
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
          <li><strong>Collapse Bridge</strong> → vão máximo (proxy de G').</li>
          <li>Se 3 testes ✅ → imprimir constructo biomimético com confiança.</li>
          <li>Se algum ❌ → voltar ao <Link href="/dashboard/formulator-pro" className="text-emerald-300 hover:underline">Formulador Pro</Link> e ajustar formulação.</li>
        </ol>
        <p className="text-xs text-emerald-300 mt-3">
          ⏱️ <strong>Tempo total:</strong> 3 testes × 20 min impressão + 10 min foto/análise = ~90 min para validar um bioink antes de usar em experimento real.
        </p>
      </Box2>

      <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-rose-500/10 border border-amber-500/20 p-4 mt-6">
        <p className="text-xs text-gray-300 leading-relaxed">
          🔗 <strong className="text-amber-300">Próximo passo:</strong> abrir o {" "}
          <Link href="/dashboard/stl" className="text-amber-200 hover:underline font-semibold">Gerador STL</Link> {" "}
          e baixar os testes de printabilidade na seção "Testes Printabilidade" (badge amarelo). Imprima primeiro,
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

function StepCard({
  n, title, icon: Icon, accent, children,
}: {
  n: number; title: string; icon: React.ElementType
  accent: "blue" | "purple" | "amber" | "emerald"
  children: React.ReactNode
}) {
  const palette = {
    blue:    { ring: "ring-blue-500/20",    bg: "bg-blue-500/[0.04] border-blue-500/15",       num: "bg-blue-500 text-white",       icon: "text-blue-300" },
    purple:  { ring: "ring-purple-500/20",  bg: "bg-purple-500/[0.04] border-purple-500/15",   num: "bg-purple-500 text-white",     icon: "text-purple-300" },
    amber:   { ring: "ring-amber-500/20",   bg: "bg-amber-500/[0.04] border-amber-500/15",     num: "bg-amber-500 text-black",      icon: "text-amber-300" },
    emerald: { ring: "ring-emerald-500/20", bg: "bg-emerald-500/[0.04] border-emerald-500/15", num: "bg-emerald-500 text-black",    icon: "text-emerald-300" },
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

function MiniCard({ title, items }: { title: string; items: string[] }) {
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
