import Link from "next/link"
import {
  ArrowRight, FlaskConical, Brain, Layers, Microscope, Zap,
  Shield, BarChart3, CheckCircle2, Star,
  Pill, Heart, Leaf, Building2, GraduationCap, TestTube2,
  TrendingUp, AlertCircle, Crown,
  ChevronRight
} from "lucide-react"

/* ─── Logo BIA SVG ──────────────────────────────────────────────────── */
function BiaLogoSvg({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-label="BIA Logo">
      <path d="M60 8 A52 52 0 1 1 59.99 8" stroke="white" strokeWidth="9"
        strokeLinecap="round" fill="none" opacity="0.95" />
      <rect x="53" y="4" width="14" height="11" fill="#2d0a6e" />
      <rect x="53" y="105" width="14" height="11" fill="#2d0a6e" />
      <rect x="57" y="28" width="6" height="64" rx="3" fill="white" />
      <rect x="26" y="28" width="6" height="64" rx="3" fill="white" />
      <path d="M32 28 Q52 28 52 42 Q52 56 32 56" stroke="white" strokeWidth="6"
        strokeLinecap="round" fill="none" />
      <path d="M32 56 Q54 56 54 70 Q54 84 32 84" stroke="white" strokeWidth="6"
        strokeLinecap="round" fill="none" />
      <path d="M63 84 L75 28 L87 84" stroke="white" strokeWidth="6"
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="67" y1="66" x2="83" y2="66" stroke="white" strokeWidth="5.5"
        strokeLinecap="round" />
    </svg>
  )
}

function BiaLogoBox({ sizeClass = "w-10 h-10", size = 32, rounded = "rounded-xl",
  shadow = "shadow-lg shadow-violet-900/60", pulse = false }:
  { sizeClass?: string; size?: number; rounded?: string; shadow?: string; pulse?: boolean }) {
  return (
    <div className={`${sizeClass} ${rounded} ${shadow} ${pulse ? "bio-pulse" : ""} bg-[#2d0a6e] flex items-center justify-center shrink-0`}>
      <BiaLogoSvg size={size} />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════ */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0514] text-white overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0514]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <BiaLogoBox sizeClass="w-9 h-9" size={26} rounded="rounded-xl" />
            <div>
              <span className="text-lg font-bold tracking-tight leading-tight block">BIA</span>
              <span className="hidden sm:block text-[9px] text-purple-400/80 tracking-widest uppercase leading-tight">
                Biofabrication AI
              </span>
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-7 text-sm text-gray-400">
            <Link href="#what-is" className="hover:text-white transition-colors">O que é?</Link>
            <Link href="#markets" className="hover:text-white transition-colors">Mercados</Link>
            <Link href="#modules" className="hover:text-white transition-colors">Módulos</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Planos</Link>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-2">
            <Link href="/auth/login"
              className="hidden sm:block text-sm text-gray-300 hover:text-white transition-colors px-3 py-2">
              Entrar
            </Link>
            <Link href="/auth/register"
              className="bia-button-primary text-sm px-4 py-2 rounded-xl font-semibold">
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6 grid-bg">
        {/* Glows */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 sm:px-4 py-1.5 text-xs sm:text-sm text-violet-400 mb-6 sm:mb-8">
            <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span>Powered by Gemini 2.0 Flash</span>
          </div>

          {/* Logo */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <BiaLogoBox
              sizeClass="w-20 h-20 sm:w-28 sm:h-28"
              size={72}
              rounded="rounded-3xl"
              shadow="shadow-2xl shadow-violet-900/80"
              pulse
            />
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-tight mb-3">
            <span className="bia-gradient-text glow-text">BIA</span>
          </h1>
          <h2 className="text-lg sm:text-2xl md:text-3xl font-semibold text-white/80 tracking-tight mb-5">
            Biofabrication Intelligent Assistant
          </h2>

          <p className="text-base sm:text-xl text-gray-300 max-w-2xl mx-auto mb-3 leading-relaxed font-medium px-2">
            IA para{" "}
            <em className="text-violet-300 not-italic font-semibold">criar tecidos humanos, órgãos e biomateriais</em>{" "}
            com precisão científica.
          </p>
          <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto mb-8 leading-relaxed px-2">
            BIA guia pesquisadores e empresas em cada etapa — do laboratório ao mercado.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 px-4">
            <Link href="/auth/register"
              className="bia-button-primary flex items-center justify-center gap-2 text-base w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold">
              <span>Começar agora</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/login"
              className="flex items-center justify-center gap-2 text-base w-full sm:w-auto px-8 py-3.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white transition-all">
              <span>Ver demonstração</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Free credits banner */}
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-blue-300">
            <Zap className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Demonstração com <strong className="text-blue-200">10 créditos gratuitos</strong></span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 pt-8 mt-8 border-t border-white/5">
            {[
              { value: "807+", label: "Formulações bio" },
              { value: "12",   label: "Etapas pipeline" },
              { value: "100+", label: "Artigos científicos" },
              { value: "6",    label: "Módulos IA" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-violet-400 mb-1">{stat.value}</div>
                <div className="text-xs sm:text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── O que é biofabricação ─────────────────────────────────────── */}
      <section id="what-is" className="py-16 sm:py-20 px-4 sm:px-6 bg-gradient-to-b from-black/30 to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl sm:rounded-3xl border border-violet-500/15 bg-violet-500/5 p-6 sm:p-10 md:p-14 relative overflow-hidden">
            <div className="absolute inset-0 grid-bg opacity-30" />
            <div className="relative z-10 flex flex-col md:flex-row gap-6 sm:gap-10 items-start md:items-center">
              <div className="shrink-0">
                <BiaLogoBox sizeClass="w-14 h-14 sm:w-20 sm:h-20" size={48} rounded="rounded-2xl" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-2 block">
                  Entenda em 30 segundos
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 leading-tight">
                  O que é <span className="bia-gradient-text">Biofabricação</span>?
                </h2>
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-3">
                  Biofabricação é a ciência de{" "}
                  <strong className="text-white">construir estruturas biológicas vivas</strong> —
                  como pele, cartilagem, vasos e mini-órgãos — usando células e bioimpressão 3D.
                </p>
                <p className="text-gray-400 text-sm leading-relaxed">
                  A BIA usa IA para{" "}
                  <strong className="text-violet-300">acelerar, organizar e guiar</strong>{" "}
                  cada etapa desse processo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6 Mercados ──────────────────────────────────────────────────── */}
      <section id="markets" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-2 block">
              Oportunidade de mercado
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              6 Mercados em <span className="bia-gradient-text">Alta Demanda</span>
            </h2>
            <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto">
              A biofabricação movimenta <strong className="text-white">bilhões de dólares</strong> em setores reais.
            </p>
          </div>

          {/* Warning box */}
          <div className="max-w-2xl mx-auto mb-8 sm:mb-12">
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-4">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-amber-200 leading-relaxed">
                <strong className="text-amber-100">Nenhum especialista está fora do mercado.</strong>{" "}
                A escassez de profissionais qualificados em biofabricação é um dos maiores gargalos do setor.
              </p>
            </div>
          </div>

          {/* Markets grid — 1 col mobile, 2 col md, 3 col lg */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              { icon: Heart,         color: "violet",  market: "Medicina Regenerativa",         size: "US$ 28 bi", growth: "+19% a.a.", desc: "Implantes, enxertos de pele e reparação de tecidos. Hospitais buscam soluções para reduzir listas de espera por órgãos.", tags: ["Implantes","Transplantes"] },
              { icon: Pill,          color: "blue",    market: "Farmacêutica & Drug Discovery",  size: "US$ 62 bi", growth: "+15% a.a.", desc: "Organoides e tecido 3D substituem testes em animais e aceleram validação de medicamentos. Reduz P&D em até 40%.", tags: ["Big Pharma","Biotech"] },
              { icon: Leaf,          color: "purple",  market: "Alimentos do Futuro",           size: "US$ 25 bi", growth: "+32% a.a.", desc: "Carne cultivada, laticínios sem animais e proteínas de precisão. Empresas como Upside Foods já estão no mercado.", tags: ["Carne Lab","AgTech"] },
              { icon: TestTube2,     color: "indigo",  market: "Cosméticos & Dermatologia",     size: "US$ 9 bi",  growth: "+22% a.a.", desc: "Pele artificial para testes sem crueldade animal, colágeno biosintetizado e curativos inteligentes.", tags: ["Skincare","Cicatrização"] },
              { icon: Building2,     color: "blue",    market: "Indústria & Materiais Bio",     size: "US$ 14 bi", growth: "+18% a.a.", desc: "Biomateriais para embalagens biodegradáveis, sensores biológicos e materiais de construção sustentáveis.", tags: ["Bioplásticos","ESG"] },
              { icon: GraduationCap, color: "violet",  market: "Academia & Pesquisa",           size: "US$ 7 bi",  growth: "+24% a.a.", desc: "Universidades precisam de IA para publicar mais rápido, obter financiamento e treinar novos cientistas.", tags: ["Universidades","Grant"] },
            ].map((item) => (
              <div key={item.market}
                className="rounded-xl sm:rounded-2xl border border-white/8 bg-white/2 p-5 hover:border-violet-500/25 hover:bg-violet-500/3 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-${item.color}-500/10 border border-${item.color}-500/20 flex items-center justify-center shrink-0`}>
                    <item.icon className={`w-5 h-5 text-${item.color}-400`} />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">{item.size}</div>
                    <div className="flex items-center gap-1 justify-end">
                      <TrendingUp className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-green-400 font-semibold">{item.growth}</span>
                    </div>
                  </div>
                </div>
                <h3 className={`text-sm sm:text-base font-bold mb-2 text-${item.color}-300`}>{item.market}</h3>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed mb-3">{item.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span key={tag}
                      className={`text-xs bg-${item.color}-500/10 border border-${item.color}-500/15 text-${item.color}-400/80 px-2 py-0.5 rounded-full`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 sm:mt-12 text-center">
            <Link href="/auth/register"
              className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 underline underline-offset-2">
              Começar agora com BIA →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 bg-black/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">Por que escolher BIA?</h2>
            <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto">
              Tecnologia de ponta para pesquisadores e empresas de biotecnologia
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              { icon: Brain,        title: "IA Especializada",     desc: "Modelos treinados em literatura científica de biofabricação, engenharia de tecidos e biomateriais",    color: "violet" },
              { icon: Layers,       title: "Pipeline Estruturado", desc: "12 etapas metodológicas validadas por especialistas, desde o tecido-alvo até a escalabilidade",           color: "blue"   },
              { icon: FlaskConical, title: "807+ Formulações",     desc: "Base de biomateriais com propriedades mecânicas, biocompatibilidade e aplicações mapeadas",                color: "purple" },
              { icon: Microscope,   title: "Organoid Builder",     desc: "Design assistido por IA de mini-órgãos funcionais para modelos de doenças e testes pré-clínicos",          color: "indigo" },
              { icon: Shield,       title: "Base RAG Científica",  desc: "Recuperação aumentada com mais de 100 artigos científicos indexados e atualizados",                         color: "blue"   },
              { icon: BarChart3,    title: "Analytics & Reports",  desc: "Dashboard com métricas de projeto, consumo de créditos e relatórios exportáveis",                           color: "violet" },
            ].map((f) => (
              <div key={f.title}
                className="bia-card bg-white/2 border-white/8 hover:border-violet-500/20 p-5">
                <div className={`w-10 h-10 rounded-xl bg-${f.color}-500/10 border border-${f.color}-500/20 flex items-center justify-center mb-4`}>
                  <f.icon className={`w-5 h-5 text-${f.color}-400`} />
                </div>
                <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modules ──────────────────────────────────────────────────── */}
      <section id="modules" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">6 Módulos Especializados</h2>
            <p className="text-gray-400 text-sm sm:text-base">Cobrindo todo o ciclo da biofabricação</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              { num:"01", title:"Pipeline de Design",         desc:"12 etapas para design completo de tecidos artificiais",                  tags:["Scaffold","Bioimpressão"], color:"violet" },
              { num:"02", title:"Formulador de Biomateriais", desc:"Database com 807+ formulações e propriedades detalhadas",                tags:["Hidrogéis","Bioinks"],     color:"blue"   },
              { num:"03", title:"Organoid Builder",           desc:"Design de mini-órgãos: cerebral, cardíaco, hepático e mais",             tags:["Brain","Heart","Liver"],   color:"purple" },
              { num:"04", title:"Gerador de Protocolos",      desc:"Protocolos laboratoriais personalizados com base nas suas specs",        tags:["SOP","Reagentes"],         color:"indigo" },
              { num:"05", title:"Base de Conhecimento",       desc:"100+ artigos científicos com busca semântica RAG",                      tags:["PubMed","Nature"],         color:"blue"   },
              { num:"06", title:"Chat IA Especializado",      desc:"Assistente com contexto científico profundo em biofabricação",           tags:["Gemini","RAG"],            color:"violet" },
            ].map((m) => (
              <div key={m.num}
                className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/8 bg-white/2 p-5 hover:border-violet-500/20 transition-all">
                <div className="text-5xl font-bold text-white/4 absolute top-3 right-4 select-none">{m.num}</div>
                <div className="relative z-10">
                  <div className={`text-${m.color}-400 text-xs font-mono mb-2`}>módulo {m.num}</div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2">{m.title}</h3>
                  <p className="text-gray-400 text-xs sm:text-sm mb-3 leading-relaxed">{m.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {m.tags.map((tag) => (
                      <span key={tag}
                        className={`text-xs bg-${m.color}-500/10 border border-${m.color}-500/20 text-${m.color}-400 px-2 py-0.5 rounded-full`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────── */}
      <section id="pricing" className="py-16 sm:py-24 px-4 sm:px-6 bg-black/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-2 block">Planos & Preços</span>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">Escolha seu plano</h2>
            <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto">
              Do pesquisador independente às maiores instituições
            </p>
            <div className="mt-4 inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2 text-xs sm:text-sm text-blue-300">
              <Zap className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span><strong className="text-blue-200">10 créditos gratuitos</strong> antes de assinar</span>
            </div>
          </div>

          {/* Free plan highlight */}
          <div className="max-w-sm mx-auto mb-6 sm:mb-8">
            <div className="rounded-xl border border-white/10 bg-white/2 p-5 text-center">
              <div className="w-10 h-10 rounded-xl bg-gray-500/10 border border-gray-500/20 flex items-center justify-center mx-auto mb-3">
                <Zap className="w-5 h-5 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold mb-1">Grátis</h3>
              <div className="text-2xl font-bold mb-3">R$ 0</div>
              <p className="text-xs text-gray-400 mb-4">10 créditos de demonstração — sem cartão</p>
              <Link href="/auth/register"
                className="block w-full text-center py-2.5 px-4 rounded-xl font-medium text-sm border border-white/10 text-gray-300 hover:bg-white/5 transition-all">
                Criar conta grátis
              </Link>
            </div>
          </div>

          {/* Paid plans — scroll horizontal on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">

            {/* DISCOVERY */}
            <div className="rounded-xl sm:rounded-2xl border border-violet-500/30 bg-white/2 p-5 sm:p-6 flex flex-col hover:border-violet-500/50 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Star className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Discovery</h3>
                  <span className="text-[10px] text-violet-400 uppercase tracking-wider">Plano inicial</span>
                </div>
              </div>
              <div className="mb-4">
                <span className="text-2xl sm:text-3xl font-bold">R$ 270</span>
                <span className="text-gray-400 text-sm">/mês</span>
                <div className="credit-pill mt-2 w-fit text-xs"><Zap className="w-3 h-3" />500 créditos/mês</div>
              </div>
              <ul className="space-y-2 mb-6 flex-1 text-xs sm:text-sm text-gray-300">
                {["500 créditos/mês","Pipeline 12 etapas","Formulador (50 formulações)","Chat IA limitado","Base de conhecimento","Suporte email"].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/register"
                className="w-full text-center py-2.5 px-4 rounded-xl font-medium text-sm border border-violet-500/30 text-violet-300 hover:bg-violet-500/10 transition-all">
                Começar Discovery
              </Link>
            </div>

            {/* ADVANCED — most popular */}
            <div className="relative rounded-xl sm:rounded-2xl border-2 border-blue-500/50 bg-blue-500/5 p-5 sm:p-6 flex flex-col">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                MAIS POPULAR
              </div>
              <div className="flex items-center gap-3 mb-4 mt-2">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Advanced</h3>
                  <span className="text-[10px] text-blue-400 uppercase tracking-wider">Profissional</span>
                </div>
              </div>
              <div className="mb-4">
                <span className="text-2xl sm:text-3xl font-bold">R$ 490</span>
                <span className="text-gray-400 text-sm">/mês</span>
                <div className="credit-pill mt-2 w-fit text-xs bg-blue-500/10 border-blue-500/20 text-blue-400"><Zap className="w-3 h-3" />1.500 créditos/mês</div>
              </div>
              <ul className="space-y-2 mb-6 flex-1 text-xs sm:text-sm text-gray-300">
                {["1.500 créditos/mês","Pipeline completo","Formulador (807 formulações)","Organoid Builder","Chat IA ilimitado","Base completa (100+ artigos)","Suporte prioritário"].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/register"
                className="w-full text-center py-2.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 transition-opacity">
                Começar Advanced
              </Link>
            </div>

            {/* ENTERPRISE */}
            <div className="rounded-xl sm:rounded-2xl border border-purple-500/30 bg-white/2 p-5 sm:p-6 flex flex-col hover:border-purple-500/50 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Enterprise</h3>
                  <span className="text-[10px] text-purple-400 uppercase tracking-wider">Corporativo</span>
                </div>
              </div>
              <div className="mb-4">
                <span className="text-2xl sm:text-3xl font-bold">R$ 990</span>
                <span className="text-gray-400 text-sm">/mês</span>
                <div className="credit-pill mt-2 w-fit text-xs bg-purple-500/10 border-purple-500/20 text-purple-400"><Zap className="w-3 h-3" />5.000 créditos/mês</div>
              </div>
              <ul className="space-y-2 mb-6 flex-1 text-xs sm:text-sm text-gray-300">
                {["5.000 créditos/mês","Todos os módulos","API access","Relatórios avançados","SLA garantido","Suporte dedicado","Multi-usuário"].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/register"
                className="w-full text-center py-2.5 px-4 rounded-xl font-medium text-sm border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 transition-all">
                Começar Enterprise
              </Link>
            </div>

            {/* ACADEMY */}
            <div className="rounded-xl sm:rounded-2xl border border-indigo-500/40 bg-gradient-to-b from-indigo-500/8 to-violet-500/5 p-5 sm:p-6 flex flex-col hover:border-indigo-500/60 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Academy</h3>
                  <span className="text-[10px] text-indigo-400 uppercase tracking-wider">Educacional</span>
                </div>
              </div>
              <div className="mb-4">
                <span className="text-2xl sm:text-3xl font-bold">R$ 4.970</span>
                <span className="text-gray-400 text-sm">/mês</span>
                <div className="credit-pill mt-2 w-fit text-xs bg-indigo-500/10 border-indigo-500/20 text-indigo-400"><Zap className="w-3 h-3" />20.000 créditos/mês</div>
              </div>
              <ul className="space-y-2 mb-6 flex-1 text-xs sm:text-sm text-gray-300">
                {["20.000 créditos/mês","Turmas de até 50 alunos","LMS integrado","Avaliações automáticas","Certificados","Relatórios pedagógicos","Suporte institucional"].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/register"
                className="w-full text-center py-2.5 px-4 rounded-xl font-medium text-sm border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 transition-all">
                Começar Academy
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer CTA ──────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <BiaLogoBox sizeClass="w-16 h-16 sm:w-20 sm:h-20" size={52} rounded="rounded-2xl sm:rounded-3xl"
            shadow="shadow-2xl shadow-violet-900/80" pulse className="mx-auto mb-6" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Comece hoje mesmo
          </h2>
          <p className="text-gray-400 text-sm sm:text-base mb-8">
            10 créditos gratuitos para explorar todos os módulos BIA
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 px-4">
            <Link href="/auth/register"
              className="bia-button-primary flex items-center justify-center gap-2 text-base w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold">
              Criar conta grátis <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/login"
              className="flex items-center justify-center gap-2 text-sm w-full sm:w-auto px-6 py-3.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all">
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <BiaLogoBox sizeClass="w-8 h-8" size={22} rounded="rounded-lg" />
            <span className="text-sm text-gray-500">BIA — Quantis Biotechnology © 2026</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-600">
            <Link href="/auth/login" className="hover:text-gray-400 transition-colors">Login</Link>
            <Link href="/auth/register" className="hover:text-gray-400 transition-colors">Cadastro</Link>
            <span className="text-gray-700">v4.0</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
