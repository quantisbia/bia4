import Link from "next/link"
import {
  ArrowRight, FlaskConical, Brain, Layers, Microscope, Zap,
  Shield, BarChart3, CheckCircle2, Star, ChevronRight,
  Pill, Heart, Leaf, Building2, GraduationCap, TestTube2,
  TrendingUp, Users, AlertCircle, BookOpen, Crown, Sparkles
} from "lucide-react"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { PLANS } from "@/types"

/* ─── Logo BIA SVG — monograma circular geométrico ───────────────────── */
function BiaLogoSvg({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="BIA Logo"
    >
      {/* Anel externo com abertura no topo e base */}
      <path
        d="M60 8 A52 52 0 1 1 59.99 8"
        stroke="white"
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
        opacity="0.95"
      />
      {/* Interrupção topo */}
      <rect x="53" y="4" width="14" height="11" fill="#2d0a6e" />
      {/* Interrupção base */}
      <rect x="53" y="105" width="14" height="11" fill="#2d0a6e" />

      {/* Barra central — I */}
      <rect x="57" y="28" width="6" height="64" rx="3" fill="white" />

      {/* B — lado esquerdo: haste vertical + 2 lobos */}
      <rect x="26" y="28" width="6" height="64" rx="3" fill="white" />
      {/* lobo superior B */}
      <path
        d="M32 28 Q52 28 52 42 Q52 56 32 56"
        stroke="white" strokeWidth="6" strokeLinecap="round" fill="none"
      />
      {/* lobo inferior B */}
      <path
        d="M32 56 Q54 56 54 70 Q54 84 32 84"
        stroke="white" strokeWidth="6" strokeLinecap="round" fill="none"
      />

      {/* A — lado direito: duas hastes diagonais + travessa */}
      <path
        d="M63 84 L75 28 L87 84"
        stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
      <line x1="67" y1="66" x2="83" y2="66" stroke="white" strokeWidth="5.5" strokeLinecap="round" />
    </svg>
  )
}

function BiaLogoBox({
  sizeClass = "w-10 h-10",
  size = 32,
  rounded = "rounded-xl",
  shadow = "shadow-lg shadow-violet-900/60",
  pulse = false,
}: {
  sizeClass?: string
  size?: number
  rounded?: string
  shadow?: string
  pulse?: boolean
}) {
  return (
    <div className={`${sizeClass} ${rounded} ${shadow} ${pulse ? "bio-pulse" : ""} bg-[#2d0a6e] flex items-center justify-center shrink-0 overflow-hidden`}>
      <BiaLogoSvg size={size} />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════ */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0514] text-white overflow-hidden">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0514]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BiaLogoBox sizeClass="w-10 h-10" size={28} rounded="rounded-xl" />
            <div>
              <span className="text-xl font-bold tracking-tight leading-tight block">BIA</span>
              <span className="text-[10px] text-purple-400/80 tracking-widest uppercase leading-tight block">
                Biofabrication Intelligent Assistant
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <Link href="#what-is" className="hover:text-white transition-colors">O que é?</Link>
            <Link href="#markets" className="hover:text-white transition-colors">Mercados</Link>
            <Link href="#modules" className="hover:text-white transition-colors">Módulos</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Planos</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm text-gray-300 hover:text-white transition-colors px-4 py-2">
              Entrar
            </Link>
            <Link href="/auth/register" className="bia-button-primary text-sm px-5 py-2.5 rounded-xl">
              Começar grátis →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6 grid-bg">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-violet-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 text-sm text-violet-400 mb-8">
            <Zap className="w-3.5 h-3.5" />
            <span>Powered by Gemini 2.0 Flash • IA de última geração</span>
          </div>

          {/* Logo hero */}
          <div className="flex justify-center mb-8">
            <BiaLogoBox
              sizeClass="w-28 h-28"
              size={96}
              rounded="rounded-3xl"
              shadow="shadow-2xl shadow-violet-900/80"
              pulse
            />
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-4">
            <span className="bia-gradient-text glow-text">BIA</span>
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-white/80 tracking-tight mb-6">
            Biofabrication Intelligent Assistant
          </h2>

          {/* Descrição para leigos — 2 linhas claras */}
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-3 leading-relaxed font-medium">
            Imagina usar inteligência artificial para{" "}
            <em className="text-violet-300 not-italic font-semibold">criar tecidos humanos, órgãos e materiais biológicos</em>{" "}
            do zero — com precisão científica e em fração do tempo.
          </p>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            BIA é a plataforma que guia pesquisadores e empresas em cada etapa desse processo, do laboratório ao mercado.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link href="/auth/register" className="bia-button-primary flex items-center gap-2 text-base px-8 py-4 rounded-xl">
              <span>Começar agora</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/auth/login" className="flex items-center gap-2 text-base px-8 py-4 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white transition-all">
              <span>Ver demonstração</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-5 py-2.5 text-sm text-blue-300 mb-12">
            <Zap className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Demonstração gratuita com <strong className="text-blue-200">10 créditos</strong> de uso da plataforma</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-white/5">
            {[
              { value: "807+", label: "Formulações de biomateriais" },
              { value: "12",   label: "Etapas do pipeline" },
              { value: "100+", label: "Artigos científicos" },
              { value: "6",    label: "Módulos especializados" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-violet-400 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── O que é biofabricação? ────────────────────────────────────────── */}
      <section id="what-is" className="py-20 px-6 bg-gradient-to-b from-black/30 to-transparent">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl border border-violet-500/15 bg-violet-500/5 p-10 md:p-14 relative overflow-hidden">
            <div className="absolute inset-0 grid-bg opacity-30" />
            <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center">
              <div className="shrink-0">
                <BiaLogoBox sizeClass="w-20 h-20" size={64} rounded="rounded-2xl" shadow="shadow-xl shadow-violet-900/60" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-3 block">Entenda em 30 segundos</span>
                <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                  O que é <span className="bia-gradient-text">Biofabricação</span>?
                </h2>
                <p className="text-gray-300 text-lg leading-relaxed mb-4">
                  Biofabricação é a ciência de <strong className="text-white">construir estruturas biológicas vivas</strong> —
                  como pele, cartilagem, vasos sanguíneos e até mini-órgãos — usando células, biomateriais e tecnologias como a bioimpressão 3D.
                  É como a impressão 3D tradicional, mas com material vivo.
                </p>
                <p className="text-gray-400 text-base leading-relaxed">
                  Essa tecnologia está transformando medicina, farmácia, alimentação e cosméticos.
                  A BIA usa inteligência artificial para <strong className="text-violet-300">acelerar, organizar e guiar</strong> cada etapa desse processo — da bancada do laboratório até o produto final.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6 Mercados Aquecidos ─────────────────────────────────────────── */}
      <section id="markets" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-3 block">Oportunidade de mercado</span>
            <h2 className="text-4xl font-bold mb-4">
              6 Mercados em <span className="bia-gradient-text">Alta Demanda</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">
              A biofabricação não é uma tendência futura — já movimenta <strong className="text-white">bilhões de dólares</strong> em setores reais.
              Profissionais especializados estão entre os mais valorizados do planeta.
            </p>
          </div>

          <div className="max-w-3xl mx-auto mb-14">
            <div className="flex items-start gap-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-6 py-4">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-200 leading-relaxed">
                <strong className="text-amber-100">Nenhum especialista em biofabricação está fora do mercado.</strong>{" "}
                A escassez de profissionais qualificados nessa área é um dos maiores gargalos do setor —
                quem domina essa tecnologia hoje coloca seu currículo na frente de centenas de candidatos em qualquer país.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Heart,         color: "violet",  market: "Medicina Regenerativa",          size: "US$ 28 bi", growth: "+19% a.a.", desc: "Implantes, enxertos de pele, cartilagem articular e reparação de tecidos cardíacos. Hospitais e clínicas do mundo inteiro buscam soluções para reduzir listas de espera por órgãos.", tags: ["Implantes","Transplantes","Cirurgia"] },
              { icon: Pill,          color: "blue",    market: "Farmacêutica & Drug Discovery",  size: "US$ 62 bi", growth: "+15% a.a.", desc: "Organoides e modelos de tecido 3D substituem testes em animais e aceleram a validação de novos medicamentos. Reduz tempo de P&D em até 40%.", tags: ["Big Pharma","Biotech","P&D"] },
              { icon: Leaf,          color: "purple",  market: "Alimentos do Futuro",            size: "US$ 25 bi", growth: "+32% a.a.", desc: "Carne cultivada em laboratório, laticínios sem animais e proteínas de precisão. Empresas como Upside Foods e Good Meat já estão no mercado com produtos aprovados pela FDA.", tags: ["Carne Lab","Alt Protein","AgTech"] },
              { icon: TestTube2,     color: "indigo",  market: "Cosméticos & Dermatologia",      size: "US$ 9 bi",  growth: "+22% a.a.", desc: "Pele artificial para testes sem crueldade animal, colágeno biosintetizado e curativos inteligentes com células vivas para cicatrização avançada.", tags: ["Skincare","Cosméticos","Cicatrização"] },
              { icon: Building2,     color: "blue",    market: "Indústria & Materiais Bio",      size: "US$ 14 bi", growth: "+18% a.a.", desc: "Biomateriais para embalagens biodegradáveis, sensores biológicos e materiais de construção sustentáveis. A biofabricação está entrando na cadeia industrial pesada.", tags: ["Bioplásticos","Sensores","ESG"] },
              { icon: GraduationCap, color: "violet",  market: "Academia & Pesquisa",            size: "US$ 7 bi",  growth: "+24% a.a.", desc: "Universidades, institutos públicos e centros de pesquisa precisam de ferramentas de IA para publicar mais rápido, obter financiamento e treinar a próxima geração de cientistas.", tags: ["Universidades","CNPq","Grant"] },
            ].map((item) => (
              <div key={item.market} className="group relative rounded-2xl border border-white/8 bg-white/2 p-6 hover:border-violet-500/25 hover:bg-violet-500/3 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-${item.color}-500/10 border border-${item.color}-500/20 flex items-center justify-center`}>
                    <item.icon className={`w-6 h-6 text-${item.color}-400`} />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">{item.size}</div>
                    <div className="flex items-center gap-1 justify-end">
                      <TrendingUp className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-green-400 font-semibold">{item.growth}</span>
                    </div>
                  </div>
                </div>
                <h3 className={`text-base font-bold mb-2 text-${item.color}-300`}>{item.market}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">{item.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span key={tag} className={`text-xs bg-${item.color}-500/10 border border-${item.color}-500/15 text-${item.color}-400/80 px-2 py-0.5 rounded-full`}>{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-3 bg-violet-500/8 border border-violet-500/20 rounded-2xl px-8 py-4">
              <Users className="w-5 h-5 text-violet-400 shrink-0" />
              <p className="text-sm text-gray-300">
                <strong className="text-white">+2.400 empresas</strong> no mundo ativamente contratando especialistas em biofabricação.{" "}
                <Link href="/auth/register" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">Comece agora com BIA →</Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Por que escolher o BIA?</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Tecnologia de ponta para pesquisadores e empresas de biotecnologia</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Brain,       title: "IA Especializada",     desc: "Modelos treinados especificamente em literatura científica de biofabricação, engenharia de tecidos e biomateriais",           color: "violet" },
              { icon: Layers,      title: "Pipeline Estruturado", desc: "12 etapas metodológicas validadas por especialistas, desde a definição do tecido-alvo até a escalabilidade",                  color: "blue"   },
              { icon: FlaskConical,title: "807+ Formulações",     desc: "Base de dados abrangente de biomateriais com propriedades mecânicas, biocompatibilidade e aplicações mapeadas",               color: "purple" },
              { icon: Microscope,  title: "Organoid Builder",     desc: "Design assistido por IA de mini-órgãos funcionais para modelos de doenças e testes pré-clínicos",                             color: "indigo" },
              { icon: Shield,      title: "Base RAG Científica",  desc: "Recuperação aumentada de geração com mais de 100 artigos científicos indexados e atualizados",                                 color: "blue"   },
              { icon: BarChart3,   title: "Analytics & Reports",  desc: "Dashboard completo com métricas de projeto, consumo de créditos e relatórios exportáveis",                                    color: "violet" },
            ].map((f) => (
              <div key={f.title} className="group bia-card dark:bg-white/2 dark:border-white/8 hover:border-violet-500/20">
                <div className={`w-12 h-12 rounded-xl bg-${f.color}-500/10 border border-${f.color}-500/20 flex items-center justify-center mb-5`}>
                  <f.icon className={`w-6 h-6 text-${f.color}-400`} />
                </div>
                <h3 className="text-lg font-semibold mb-3">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modules ──────────────────────────────────────────────────────── */}
      <section id="modules" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">6 Módulos Especializados</h2>
            <p className="text-gray-400 text-lg">Cobrindo todo o ciclo de vida da biofabricação</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { num:"01", title:"Pipeline de Design",         desc:"12 etapas metodológicas para design completo de tecidos artificiais",              tags:["Scaffold","Células","Bioimpressão"], color:"violet" },
              { num:"02", title:"Formulador de Biomateriais", desc:"Database com 807+ formulações, propriedades e aplicações detalhadas",              tags:["Hidrogéis","Scaffolds","Biointas"],  color:"blue"   },
              { num:"03", title:"Organoid Builder",           desc:"Design assistido de mini-órgãos: cerebral, cardíaco, hepático e mais",             tags:["Brain","Heart","Liver"],             color:"purple" },
              { num:"04", title:"Gerador de Protocolos",      desc:"Protocolos laboratoriais personalizados com base nas suas especificações",         tags:["SOP","Reagentes","Steps"],           color:"indigo" },
              { num:"05", title:"Base de Conhecimento",       desc:"100+ artigos científicos indexados com busca semântica RAG",                      tags:["PubMed","Nature","Science"],        color:"blue"   },
              { num:"06", title:"Chat IA Especializado",      desc:"Assistente de IA com contexto científico profundo em biofabricação",               tags:["Gemini","RAG","Contexto"],          color:"violet" },
            ].map((m) => (
              <div key={m.num} className="relative group overflow-hidden rounded-2xl border border-white/8 bg-white/2 p-6 hover:border-violet-500/20 transition-all">
                <div className="text-5xl font-bold text-white/5 absolute top-4 right-4">{m.num}</div>
                <div className="relative z-10">
                  <div className={`text-${m.color}-400 text-sm font-mono mb-3`}>módulo {m.num}</div>
                  <h3 className="text-xl font-semibold mb-3">{m.title}</h3>
                  <p className="text-gray-400 text-sm mb-4 leading-relaxed">{m.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {m.tags.map((tag) => (
                      <span key={tag} className={`text-xs bg-${m.color}-500/10 border border-${m.color}-500/20 text-${m.color}-400 px-2.5 py-1 rounded-full`}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing — TODOS OS PLANOS ────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-3 block">Planos & Preços</span>
            <h2 className="text-4xl font-bold mb-4">Escolha seu plano</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Do pesquisador independente às maiores instituições de biotecnologia do Brasil
            </p>
          </div>

          {/* Demo notice */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-5 py-2.5 text-sm text-blue-300">
              <Zap className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Todos os planos desbloqueiam demonstração com <strong className="text-blue-200">10 créditos gratuitos</strong> antes de assinar</span>
            </div>
          </div>

          {/* Grade de planos */}
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">

            {/* ── DISCOVERY ── */}
            <div className="relative rounded-2xl border border-violet-500/30 bg-white/2 p-6 flex flex-col hover:border-violet-500/50 transition-all">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Star className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Discovery</h3>
                  <span className="text-[10px] text-violet-400 uppercase tracking-wider">Plano inicial</span>
                </div>
              </div>
              <div className="mb-5">
                <span className="text-3xl font-bold">R$ 270</span>
                <span className="text-gray-400 text-sm">/mês</span>
                <div className="credit-pill mt-2 w-fit"><Zap className="w-3 h-3" />500 créditos/mês</div>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1 text-sm text-gray-300">
                {["500 créditos/mês","Pipeline de 12 etapas","Formulador (50 formulações)","Chat IA limitado","Base de conhecimento (20 artigos)","Suporte por email"].map((f) => (
                  <li key={f} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" /><span>{f}</span></li>
                ))}
              </ul>
              <Link href="/auth/register" className="w-full text-center py-3 px-4 rounded-xl font-medium text-sm border border-violet-500/30 text-violet-300 hover:bg-violet-500/10 transition-all">
                Começar com Discovery
              </Link>
            </div>

            {/* ── ADVANCED ── */}
            <div className="relative rounded-2xl border border-blue-500/40 bg-blue-500/5 ring-1 ring-blue-500/20 p-6 flex flex-col">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                MAIS POPULAR
              </div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Advanced</h3>
                  <span className="text-[10px] text-blue-400 uppercase tracking-wider">Recomendado</span>
                </div>
              </div>
              <div className="mb-5">
                <span className="text-3xl font-bold">R$ 490</span>
                <span className="text-gray-400 text-sm">/mês</span>
                <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium px-3 py-1 rounded-full mt-2 w-fit"><Zap className="w-3 h-3" />1.500 créditos/mês</div>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1 text-sm text-gray-300">
                {["1.500 créditos/mês","Pipeline completo","Formulador avançado (400 formulações)","Organoid Builder","Chat IA ilimitado","Base de conhecimento completa","Gerador de protocolos","Suporte prioritário"].map((f) => (
                  <li key={f} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" /><span>{f}</span></li>
                ))}
              </ul>
              <Link href="/auth/register" className="w-full text-center py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all shadow-lg shadow-blue-500/20">
                Começar com Advanced
              </Link>
            </div>

            {/* ── ENTERPRISE ── */}
            <div className="relative rounded-2xl border border-purple-500/30 bg-white/2 p-6 flex flex-col hover:border-purple-500/50 transition-all">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Enterprise</h3>
                  <span className="text-[10px] text-purple-400 uppercase tracking-wider">Para equipes</span>
                </div>
              </div>
              <div className="mb-5">
                <span className="text-3xl font-bold">R$ 990</span>
                <span className="text-gray-400 text-sm">/mês</span>
                <div className="inline-flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium px-3 py-1 rounded-full mt-2 w-fit"><Zap className="w-3 h-3" />5.000 créditos/mês</div>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1 text-sm text-gray-300">
                {["5.000 créditos/mês","Tudo do Advanced","Formulador completo (807+ formulações)","RAG personalizado","API access","Relatórios avançados","Gerenciamento de equipe","Suporte dedicado"].map((f) => (
                  <li key={f} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" /><span>{f}</span></li>
                ))}
              </ul>
              <Link href="/auth/register" className="w-full text-center py-3 px-4 rounded-xl font-medium text-sm border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 transition-all">
                Começar com Enterprise
              </Link>
            </div>

            {/* ── ACADEMY ── destaque especial ── */}
            <div className="relative rounded-2xl border-2 border-amber-400/60 bg-gradient-to-b from-amber-500/10 to-orange-500/5 p-6 flex flex-col overflow-hidden">
              {/* Badge premium */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1.5 whitespace-nowrap shadow-lg shadow-amber-500/30">
                <Crown className="w-3 h-3" /> PLANO MAGNÍFICO
              </div>

              {/* Glow decorativo */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center gap-3 mb-5 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-amber-100">Academy</h3>
                  <span className="text-[10px] text-amber-400 uppercase tracking-wider">Formação completa</span>
                </div>
              </div>

              <div className="mb-5 relative z-10">
                <span className="text-3xl font-bold text-amber-100">R$ 4.970</span>
                <span className="text-gray-400 text-sm">/mês</span>
                <div className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium px-3 py-1 rounded-full mt-2 w-fit"><Zap className="w-3 h-3" />20.000 créditos/mês</div>
              </div>

              {/* Destaque do curso */}
              <div className="relative z-10 bg-amber-500/15 border border-amber-400/30 rounded-xl p-3 mb-4">
                <div className="flex items-start gap-2.5">
                  <BookOpen className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-200 text-xs font-bold uppercase tracking-wider mb-0.5">🎓 Curso Exclusivo Incluído</p>
                    <p className="text-amber-100/80 text-xs leading-relaxed">
                      Formação completa em Biofabricação com IA — do básico ao avançado, com certificação e mentoria dedicada.
                    </p>
                  </div>
                </div>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1 text-sm text-gray-300 relative z-10">
                {[
                  "20.000 créditos/mês",
                  "Tudo do Enterprise",
                  "🎓 Curso de Biofabricação com IA",
                  "Certificação profissional",
                  "Treinamento dedicado",
                  "Personalização de IA",
                  "Integração ERP/LIMS",
                  "SLA garantido 99.9%",
                  "Gerente de conta dedicado",
                  "Acesso beta features",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <span className={f.startsWith("🎓") ? "text-amber-200 font-semibold" : ""}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/auth/register"
                className="relative z-10 w-full text-center py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white transition-all shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4" />
                Quero o Academy
              </Link>
            </div>
          </div>

          {/* Comparação rápida */}
          <div className="mt-12 text-center">
            <p className="text-gray-500 text-sm">
              Todos os planos incluem acesso aos 6 módulos da plataforma, suporte técnico e atualizações contínuas.{" "}
              <Link href="/auth/register" className="text-violet-400 hover:text-violet-300">Crie uma conta gratuita e explore com 10 créditos →</Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative rounded-3xl border border-violet-500/20 bg-violet-500/5 p-12 overflow-hidden">
            <div className="absolute inset-0 grid-bg opacity-50" />
            <div className="relative z-10">
              <div className="flex justify-center mb-6">
                <BiaLogoBox sizeClass="w-16 h-16" size={52} rounded="rounded-2xl" shadow="shadow-2xl shadow-violet-900/70" pulse />
              </div>
              <h2 className="text-4xl font-bold mb-4">Pronto para acelerar sua pesquisa?</h2>
              <p className="text-gray-400 text-lg mb-8">
                Junte-se a pesquisadores e empresas que estão usando BIA para revolucionar a biofabricação.
              </p>
              <Link href="/auth/register" className="bia-button-primary inline-flex items-center gap-2 text-base px-8 py-4 rounded-xl">
                Criar conta — 10 créditos grátis <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BiaLogoBox sizeClass="w-8 h-8" size={22} rounded="rounded-lg" shadow="shadow-md shadow-violet-900/50" />
              <div>
                <span className="font-bold text-gray-200 text-sm">BIA</span>
                <span className="text-gray-600 text-xs ml-2">Biofabrication Intelligent Assistant</span>
              </div>
            </div>
            <p className="text-gray-500 text-sm">
              © 2025 BIA. Todos os direitos reservados. Plataforma de IA para biofabricação.
            </p>
            <div className="flex gap-6 text-sm text-gray-500">
              <Link href="#" className="hover:text-gray-300 transition-colors">Privacidade</Link>
              <Link href="#" className="hover:text-gray-300 transition-colors">Termos</Link>
              <Link href="#" className="hover:text-gray-300 transition-colors">Contato</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
