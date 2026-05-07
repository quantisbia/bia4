/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 — Roteiro Profissional
 *  "Do problema clínico ao tecido funcional impresso"
 *  ───────────────────────────────────────────────────────────────────────
 *  Roteiro de 10 fases que guia o pesquisador desde a definição do
 *  problema até a impressão validada do construto. Inspirado em workflows
 *  ASTM F2150 / ISO 10993 / FDA Regulatory Science.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import {
  Map, Target, BookOpen, FlaskConical, GitBranch, Printer, Box,
  Zap, ClipboardCheck, Microscope, FileText, Sparkles, ArrowRight,
  CheckCircle2, Info, Lightbulb, Rocket, ChevronRight, X, PartyPopper,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

interface Phase {
  number: number
  title: string
  goal: string
  duration: string
  module: { name: string; href: string; icon: React.ElementType }
  steps: string[]
  output: string
  tip?: string
  color: string
}

const PHASES: Phase[] = [
  {
    number: 1,
    title: "Definir o Problema Clínico",
    goal: "Articular com clareza o problema biomédico que o seu tecido vai resolver — qual paciente, qual lesão, qual função perdida.",
    duration: "1–2 dias",
    module: { name: "Chat IA", href: "/dashboard/chat", icon: Sparkles },
    color: "from-rose-500 to-pink-500",
    steps: [
      "Abra o Chat IA e descreva em 3-5 frases o problema clínico (ex: regeneração de cartilagem em osteoartrite de joelho).",
      "Peça à BIA: \"Qual a unmet medical need? Quais as soluções atuais e suas limitações?\".",
      "Documente: indicação, idade-alvo, prevalência, alternativas existentes e gap clínico.",
      "Use a Base de Conhecimento para buscar artigos recentes (2023–2026) sobre o tema.",
    ],
    output: "Documento de 1 página: Statement of Need + Critérios de Sucesso.",
    tip: "Quanto mais específico o problema, melhor a IA recomenda materiais e protocolos. Evite \"queremos imprimir cartilagem\" — prefira \"defeito condral focal de 2 cm² em platô tibial\".",
  },
  {
    number: 2,
    title: "Revisão de Literatura & Patentes",
    goal: "Mapear estado-da-arte: o que outros já fizeram, o que funcionou, o que falhou — e onde está sua oportunidade de inovação.",
    duration: "3–7 dias",
    module: { name: "Base de Conhecimento", href: "/dashboard/knowledge", icon: BookOpen },
    color: "from-amber-500 to-orange-500",
    steps: [
      "Busque por termos-chave do seu problema (tecido + tecnologia + biomaterial).",
      "Filtre por: artigos peer-reviewed dos últimos 5 anos + patentes ativas.",
      "Identifique 5-10 papers seminais e exporte para o Notebook Científico.",
      "Mapeie 3 patentes próximas para evitar infringement.",
      "Liste 12 casos regulatórios (FDA 510k / ANVISA RDC) já aprovados.",
    ],
    output: "Mini-revisão sistemática (5–10 páginas) + landscape de patentes.",
    tip: "Se algo já tem 510(k) aprovado, sua via regulatória será muito mais rápida (substancial equivalência).",
  },
  {
    number: 3,
    title: "Definir Especificações do Tecido",
    goal: "Traduzir o problema clínico em requisitos quantitativos: dimensões, módulo elástico, porosidade, densidade celular, vascularização.",
    duration: "2–3 dias",
    module: { name: "Pipeline (Etapa 1)", href: "/dashboard/pipeline", icon: GitBranch },
    color: "from-violet-500 to-purple-600",
    steps: [
      "Abra o Pipeline e selecione a Etapa 1: Definição de Requisitos.",
      "Insira: tipo de tecido alvo, dimensões anatômicas, função mecânica, expectativa de vida do construto.",
      "A BIA gera automaticamente: módulo elástico target, porosidade %, faixa de densidade celular, requisitos de degradação.",
      "Revise e ajuste com base na sua revisão de literatura.",
      "Salve o briefing técnico no Notebook.",
    ],
    output: "Spec sheet: dimensões + propriedades mecânicas + biológicas + degradação.",
    tip: "Tecidos moles (E < 100 kPa) e duros (E > 1 MPa) exigem estratégias diferentes. Defina cedo para não trocar de biomaterial no meio do projeto.",
  },
  {
    number: 4,
    title: "Selecionar e Formular o Biomaterial",
    goal: "Escolher a bioink que melhor atende suas specs — equilibrando imprimibilidade, biocompatibilidade, propriedades mecânicas e custo. Use o Formulador Bio para screening rápido (catálogo) ou o Formulador Pro para combinações multi-componente customizadas com análise científica completa.",
    duration: "5–10 dias (com testes)",
    module: { name: "Formulador Pro", href: "/dashboard/formulator-pro", icon: FlaskConical },
    color: "from-emerald-500 to-teal-500",
    steps: [
      "📚 Antes de começar, leia o capítulo \"Formulador Pro\" no Manual do Usuário (5 min) para entender o racional.",
      "🚀 Screening rápido: abra Formulador Bio → digite aplicação + tecido → receba 1 recomendação do catálogo BIA.",
      "🧪 Análise profissional: abra Formulador Pro → defina objetivo clínico (10 categorias: cicatrização, osso, gengiva, mama, vaso…) → adicione até 8 biomateriais (catálogo OU customizados) → especifique módulo, porosidade, biodegradabilidade, injetabilidade.",
      "⚗️ Em 15-35s a IA gera: score 0-100 multidimensional, protocolo passo-a-passo com CCPs, alertas de incompatibilidade química, parâmetros de bioimpressão, ISO 10993/14607, ANVISA RDC 751/2022 + 3 DOIs reais.",
      "✅ Compare alternativas: marque \"Modo alternativas\" para receber 2 formulações alternativas com trade-offs explícitos.",
      "💾 Exporte JSON (integração) ou Markdown (artigo/proposta) para o Notebook Científico.",
    ],
    output: "Dossiê de bioink: composição final, % w/v exato, crosslinker validado, score científico justificado, protocolo de bancada, classe regulatória estimada.",
    tip: "Use o Formulador Bio (clássico) para 1 material conhecido. Use o Pro quando combinar 3+ componentes, biomateriais novos/customizados, ou quando precisa de documentação para artigo/regulatório. O Pro tem auto-save: nunca perde seu trabalho.",
  },
  {
    number: 5,
    title: "Modelar a Geometria 3D (STL)",
    goal: "Criar o modelo digital do construto: anatomia paciente-específica ou geometria padrão (scaffold poroso, organoide, vaso).",
    duration: "2–5 dias",
    module: { name: "Gerador STL", href: "/dashboard/stl", icon: Box },
    color: "from-blue-500 to-cyan-500",
    steps: [
      "Para anatomia: importe DICOM (CT/MRI) ou use STLs pré-prontos (orelha, coração, rim, fígado, mão).",
      "Para scaffolds: use o gerador paramétrico (cubo poroso, cilindro Voronoi, hexágono organoide).",
      "Para organoides: vá em Organoid Builder → escolha tipo + diâmetro + número de wells.",
      "Valide a geometria: dimensões corretas, paredes mínimas (≥ 2× nozzle), suporte para overhangs > 45°.",
      "Exporte STL/OBJ pronto para fatiar.",
    ],
    output: "Arquivo STL validado, dimensões certificadas, sem self-intersections.",
    tip: "Scaffold poroso com Voronoi 3D ou Gyroid tem melhor permeabilidade → vascularização superior. Evite paredes finas demais (sub-mm) que colapsam.",
  },
  {
    number: 6,
    title: "Gerar G-code & Otimizar Parâmetros",
    goal: "Converter o STL em instruções de máquina: caminho da agulha, velocidade, pressão, temperatura, infill — tudo otimizado para sua bioink.",
    duration: "1–3 dias",
    module: { name: "Motor GCODE", href: "/dashboard/bioprinting/engine", icon: Zap },
    color: "from-amber-500 to-yellow-500",
    steps: [
      "Importe o STL no Motor GCODE BIA v4.2.",
      "Selecione: bioimpressora (BioEnder, EnvisionTEC, custom), bioink formulada na fase 4, tamanho da mesa.",
      "Escolha infill: Grid (rápido), Gyroid (vascularização), Voronoi 3D (anatômico), Dual-porosity (osso/fígado).",
      "A BIA otimiza: layer height (50–400 μm), velocidade (5–30 mm/s), pressão (10–600 kPa), temperatura.",
      "Visualize no preview 2D camada-a-camada antes de exportar.",
      "Para multi-material, configure cada nozzle separadamente.",
    ],
    output: "Arquivo .gcode validado, simulação 2D OK, tempo estimado < 2 h.",
    tip: "Tempo de impressão > 2 h compromete viabilidade celular. Se passar, divida em sub-construtos ou reduza densidade.",
  },
  {
    number: 7,
    title: "Imprimir o Construto (Bioimpressão 3D)",
    goal: "Executar a impressão real com células e biomaterial — em ambiente estéril, monitorando parâmetros críticos.",
    duration: "1–4 horas",
    module: { name: "Bioimpressão 3D", href: "/dashboard/bioprinting", icon: Printer },
    color: "from-purple-500 to-fuchsia-500",
    steps: [
      "Conecte a impressora via USB Web Serial (Marlin/Klipper) — ou opere offline.",
      "Faça nivelamento da mesa (Z-offset crítico para primeira camada).",
      "Carregue a bioink na seringa/cartucho (4°C, sem bolhas).",
      "Adicione células (1×10⁶ – 10×10⁶ células/mL) imediatamente antes da impressão.",
      "Pré-aqueça câmara (37°C para hidrogéis termo-sensíveis).",
      "Inicie impressão e monitore: temperatura, pressão, retração, primeira camada.",
      "Após impressão: crosslink (UV 365 nm 30-60s para GelMA, CaCl₂ para alginato).",
    ],
    output: "Construto físico impresso, crosslinkado, transferido para incubadora 37°C/5% CO₂.",
    tip: "Sempre rode 1 impressão TESTE sem células antes de gastar bioink celular cara. Valide geometria e tempo.",
  },
  {
    number: 8,
    title: "Cultura & Maturação",
    goal: "Manter o construto viável e maturar a função tecidual: proliferação celular, deposição de ECM, organização espacial.",
    duration: "7–28 dias",
    module: { name: "Protocolos GLP/GMP", href: "/dashboard/protocols", icon: FileText },
    color: "from-green-500 to-emerald-500",
    steps: [
      "Gere POP (Procedimento Operacional Padrão) de cultura no módulo Protocolos.",
      "Meio de cultura específico do tecido (DMEM, condrogênico, osteogênico, hepatogênico).",
      "Trocas: 50% a cada 48h nos primeiros 7 dias; 100% após.",
      "Estímulos físicos quando aplicável: bioreator de perfusão (3D vascular), strain mecânico (cartilagem, osso).",
      "Documente diariamente: pH, turbidez, contaminação, formação de membrana.",
    ],
    output: "Construto maturado, células viáveis ≥ 80% (Live/Dead AO/PI), ECM depositada.",
    tip: "Construtos > 200 μm de espessura SEM vascularização sofrem necrose central. Considere bioreator ou canais perfundíveis desde o design.",
  },
  {
    number: 9,
    title: "Caracterizar & Validar",
    goal: "Provar cientificamente que seu construto faz o que deveria fazer — mecanicamente, biologicamente e funcionalmente.",
    duration: "14–60 dias",
    module: { name: "Análises & Dossiês", href: "/dashboard/analyses", icon: Microscope },
    color: "from-indigo-500 to-blue-600",
    steps: [
      "Análise mecânica: ensaio de compressão/tração (módulo de Young, tensão máxima).",
      "Análise celular: viabilidade (AO/PI), proliferação (MTT/Alamar Blue), apoptose (Annexin V).",
      "Análise molecular: qPCR (genes específicos do tecido), Western blot, imunofluorescência.",
      "Análise histológica: H&E, Masson trichrome, marcadores específicos (Col II para cartilagem, ALP para osso).",
      "Análise funcional in vitro: produção de proteínas, resposta a estímulos, contratilidade (cardíaco).",
      "Quando aplicável: in vivo em modelo animal (rato/coelho/porco) — necessário plano CEUA/CEP.",
    ],
    output: "Dossiê de caracterização completo: dados mecânicos + celulares + moleculares + funcionais.",
    tip: "Use o Notebook Científico para registrar TODOS os experimentos com timestamps — é base para sua publicação E para auditoria regulatória.",
  },
  {
    number: 10,
    title: "Documentar & Publicar / Submeter",
    goal: "Consolidar todo o projeto em UM dossiê profissional pronto para publicação científica OU submissão regulatória (FDA/ANVISA/EMA).",
    duration: "30–90 dias",
    module: { name: "Protocolo Total", href: "/dashboard/protocol-total", icon: ClipboardCheck },
    color: "from-violet-600 to-purple-700",
    steps: [
      "Abra o Protocolo Total — a BIA consolida todas as 12 etapas do pipeline em um único dossiê.",
      "Para publicação: use o Notebook → \"Gerar Paper\" — estrutura IMRAD com referências.",
      "Para regulatório: use o módulo Análises → \"Dossiê 510(k)\" ou \"Dossiê ANVISA RDC\".",
      "Adicione: SOPs, dados brutos, imagens histológicas, certificados de calibração.",
      "Revisão final: Quality Control checklist (QC), peer review interno.",
      "Submissão: journal (Nature Biomed Eng, Acta Biomaterialia, Biofabrication) ou agência regulatória.",
    ],
    output: "Manuscrito submetido OU dossiê regulatório protocolado. Tecido pronto para o mundo.",
    tip: "Para publicação Q1 em biofabricação, garanta: (1) novidade clara, (2) caracterização completa, (3) pelo menos 1 experimento in vivo. A BIA pode ajudar em todas as 3.",
  },
]

/* ─────────────────────────────────────────────────────────────────────── */

export default function RoadmapPage() {
  const searchParams = useSearchParams()
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    // Mostra banner de boas-vindas APENAS quando vem do botão "Ver demonstração guiada"
    // (URL: /dashboard/roadmap?welcome=tour). Usa localStorage para não repetir.
    const wantsTour = searchParams.get("welcome") === "tour"
    const seen = typeof window !== "undefined" ? localStorage.getItem("bia_tour_seen") : "1"
    if (wantsTour && !seen) {
      setShowWelcome(true)
    }
  }, [searchParams])

  const dismissWelcome = () => {
    setShowWelcome(false)
    if (typeof window !== "undefined") {
      localStorage.setItem("bia_tour_seen", "1")
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">

      {/* Welcome banner — aparece após cadastro/primeiro acesso */}
      {showWelcome && (
        <div className="relative rounded-2xl border-2 border-violet-500/40 bg-gradient-to-br from-violet-600/20 via-fuchsia-600/15 to-blue-600/15 p-5 sm:p-6 shadow-xl shadow-violet-900/30">
          <button
            onClick={dismissWelcome}
            className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            aria-label="Fechar boas-vindas"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-start gap-3 sm:gap-4 pr-8">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 shadow-lg shadow-violet-900/50">
              <PartyPopper className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Bem-vinda(o) à BIA! 🎉
                </h2>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-full font-semibold">
                  TOUR GUIADO
                </span>
              </div>
              <p className="text-sm text-violet-100/90 leading-relaxed mb-3">
                Você caiu no <strong className="text-white">Roteiro Profissional</strong> — o melhor jeito de
                conhecer a BIA. Siga as <strong className="text-white">10 fases abaixo</strong> e use seus
                <strong className="text-white"> 30 créditos grátis</strong> para testar cada módulo.
                Não precisa fazer tudo agora: o roteiro fica salvo e você volta quando quiser. ✨
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                  <div className="text-[10px] text-violet-300 uppercase tracking-wider mb-0.5">1️⃣ Comece em</div>
                  <div className="text-xs text-white font-semibold">Fase 1 — Definir Problema</div>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                  <div className="text-[10px] text-violet-300 uppercase tracking-wider mb-0.5">⏱️ Tempo do tour</div>
                  <div className="text-xs text-white font-semibold">~15 min para ver tudo</div>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                  <div className="text-[10px] text-violet-300 uppercase tracking-wider mb-0.5">💎 Custo</div>
                  <div className="text-xs text-white font-semibold">Grátis (30 créditos)</div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Link
                  href="/dashboard/manual"
                  onClick={dismissWelcome}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Ler o Manual primeiro (5 min)
                </Link>
                <button
                  onClick={dismissWelcome}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-semibold transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  Começar pelo Roteiro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-900/40">
          <Map className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            Roteiro Profissional BIA
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300">
              v4.2
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Do problema clínico ao tecido funcional impresso · 10 fases · ~3-6 meses
          </p>
        </div>
      </div>

      {/* Hero card */}
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-900/20 via-purple-900/10 to-transparent p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
            <Lightbulb className="w-5 h-5 text-violet-300" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white mb-1">
              Por que seguir um roteiro?
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Engenharia de tecidos é uma corrida de longa distância — não um sprint. Pesquisadores que pulam etapas
              gastam meses re-trabalhando porque escolheram o biomaterial errado, geometria inviável ou
              esqueceram regulatório. Este roteiro foi destilado de <strong className="text-violet-300">12 anos de
              experiência da Quantis Biotechnology</strong> em projetos reais com FDA, ANVISA e EMA.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4">
          {[
            { label: "Fases", value: "10" },
            { label: "Módulos BIA", value: "12" },
            { label: "Duração", value: "3–6 meses" },
            { label: "Sucesso", value: "+82%" },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
              <div className="text-lg sm:text-xl font-bold text-violet-300">{stat.value}</div>
              <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick start */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Rocket className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-amber-200">Quick Start — 3 passos para começar HOJE</h3>
        </div>
        <ol className="space-y-2 text-xs sm:text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <span>Abra o <Link href="/dashboard/chat" className="text-violet-300 hover:underline">Chat IA</Link> e descreva seu problema clínico em 3 frases. A BIA vai sugerir o caminho ideal pra você.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <span>Inicie um projeto no <Link href="/dashboard/pipeline" className="text-violet-300 hover:underline">Pipeline</Link> — ele estrutura sua jornada nas 12 etapas.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            <span>Siga as 10 fases abaixo na ordem. Cada uma tem um módulo BIA dedicado. Use o <Link href="/dashboard/notebook" className="text-violet-300 hover:underline">Notebook</Link> pra registrar tudo.</span>
          </li>
        </ol>
      </div>

      {/* Manual CTA — destaque para Formulador Pro */}
      <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/[0.06] to-purple-500/[0.06] p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-blue-300" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <h3 className="text-sm font-bold text-white">Manual do Usuário com tutoriais práticos</h3>
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded font-mono uppercase">Novo</span>
            </div>
            <p className="text-xs text-blue-100/80 mb-3 leading-relaxed">
              Cada módulo tem agora um <strong className="text-white">capítulo no Manual</strong> com racional fácil de entender, walkthrough passo-a-passo
              e troubleshooting. Especialmente útil para o novo <strong className="text-blue-300">Formulador Pro</strong> (formulações
              multi-componente com IA + análise científica completa).
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/manual" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold transition-colors">
                <BookOpen className="w-3.5 h-3.5" /> Abrir Manual
              </Link>
              <Link href="/dashboard/formulator-pro" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition-colors">
                <Sparkles className="w-3.5 h-3.5" /> Tentar Formulador Pro →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Phases timeline */}
      <div className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 px-1">
          <Target className="w-5 h-5 text-violet-400" />
          As 10 Fases Profissionais
        </h2>

        {PHASES.map(phase => {
          const ModuleIcon = phase.module.icon
          return (
            <div
              key={phase.number}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-colors overflow-hidden"
            >
              {/* Header da fase */}
              <div className="flex items-start gap-4 p-4 sm:p-5 border-b border-white/[0.06]">
                <div className={cn(
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-lg",
                  phase.color
                )}>
                  <span className="text-lg sm:text-xl font-black text-white">{phase.number.toString().padStart(2, "0")}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-white">{phase.title}</h3>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-gray-400">
                      ⏱ {phase.duration}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{phase.goal}</p>

                  <Link
                    href={phase.module.href}
                    className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-violet-300 hover:text-violet-200 group"
                  >
                    <ModuleIcon className="w-3.5 h-3.5" />
                    Abrir {phase.module.name}
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>

              {/* Steps */}
              <div className="p-4 sm:p-5 grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Passo a passo</p>
                  <ol className="space-y-1.5">
                    {phase.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-gray-300 leading-relaxed">
                        <CheckCircle2 className="w-3.5 h-3.5 text-violet-400/70 shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Resultado esperado</p>
                    <p className="text-xs text-emerald-200/90 bg-emerald-500/[0.05] border border-emerald-500/15 rounded-lg p-2.5 leading-relaxed">
                      ✓ {phase.output}
                    </p>
                  </div>

                  {phase.tip && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" /> Dica de elite
                      </p>
                      <p className="text-xs text-amber-200/90 bg-amber-500/[0.05] border border-amber-500/15 rounded-lg p-2.5 leading-relaxed">
                        {phase.tip}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Final CTA */}
      <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-900/30 to-fuchsia-900/20 p-5 sm:p-6 text-center">
        <Sparkles className="w-8 h-8 text-violet-300 mx-auto mb-3" />
        <h3 className="text-base sm:text-lg font-bold text-white mb-2">Pronto para começar?</h3>
        <p className="text-xs sm:text-sm text-gray-300 mb-4 max-w-2xl mx-auto leading-relaxed">
          Lembre-se: nenhum tecido foi impresso da noite pro dia. Mas com o roteiro certo + a BIA + sua expertise científica,
          você reduz <strong className="text-violet-300">~70% do tempo</strong> de iteração comparado a um workflow tradicional.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href="/dashboard/chat"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-200 text-sm font-semibold transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Conversar com a BIA
          </Link>
          <Link
            href="/dashboard/pipeline"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-semibold shadow-lg shadow-violet-900/40 transition-all"
          >
            Iniciar Pipeline
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Footer note */}
      <div className="text-center text-[11px] text-gray-600 leading-relaxed pt-2 pb-4">
        <Info className="w-3 h-3 inline-block mr-1 -mt-0.5" />
        Roteiro destilado de projetos reais com aprovação FDA 510(k), ANVISA RDC e EMA · Quantis Biotechnology · 2026
      </div>
    </div>
  )
}
