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
  Microscope, GitBranch, Map, Wrench, FileText, Coffee,
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
// COMPONENTES AUXILIARES
// ═════════════════════════════════════════════════════════════════════════

function Box2({
  icon: Icon, title, tone, children,
}: {
  icon: React.ElementType; title: string
  tone: "info" | "default" | "warn" | "ok"
  children: React.ReactNode
}) {
  const palette = {
    info:    { bg: "from-blue-500/[0.04] to-blue-500/[0.02]",    border: "border-blue-500/15",    iconBg: "bg-blue-500/15 border-blue-500/30",    iconColor: "text-blue-300",    titleColor: "text-blue-100" },
    default: { bg: "from-white/[0.02] to-white/[0.01]",          border: "border-white/8",        iconBg: "bg-white/5 border-white/10",            iconColor: "text-gray-300",    titleColor: "text-white" },
    warn:    { bg: "from-amber-500/[0.04] to-amber-500/[0.02]",  border: "border-amber-500/15",   iconBg: "bg-amber-500/15 border-amber-500/30",   iconColor: "text-amber-300",   titleColor: "text-amber-100" },
    ok:      { bg: "from-emerald-500/[0.04] to-emerald-500/[0.02]", border: "border-emerald-500/15", iconBg: "bg-emerald-500/15 border-emerald-500/30", iconColor: "text-emerald-300", titleColor: "text-emerald-100" },
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
