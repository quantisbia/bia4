import Link from "next/link"
import { ArrowRight, Dna, FlaskConical, Brain, Layers, Microscope, Zap, Shield, BarChart3, CheckCircle2, Star, ChevronRight } from "lucide-react"
import { PLANS } from "@/types"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#030a04] text-white overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#030a04]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Dna className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              BIA <span className="text-emerald-400">v3</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <Link href="#features" className="hover:text-white transition-colors">Funcionalidades</Link>
            <Link href="#modules" className="hover:text-white transition-colors">Módulos</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Planos</Link>
            <Link href="#about" className="hover:text-white transition-colors">Sobre</Link>
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

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6 grid-bg">
        {/* Glow effects */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-[300px] h-[300px] bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 text-sm text-emerald-400 mb-8">
            <Zap className="w-3.5 h-3.5" />
            <span>Powered by Gemini 2.0 Flash • IA de última geração</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6">
            Design de Tecidos
            <br />
            <span className="bia-gradient-text glow-text">com Inteligência Artificial</span>
          </h1>

          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            A primeira plataforma de IA especializada em biofabricação do Brasil.
            Acelere o design de tecidos artificiais, organoides e biomateriais com
            um pipeline inteligente de 12 etapas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/auth/register"
              className="bia-button-primary flex items-center gap-2 text-base px-8 py-4 rounded-xl"
            >
              <span>Começar agora</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/auth/login"
              className="flex items-center gap-2 text-base px-8 py-4 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white transition-all"
            >
              <span>Ver demonstração</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-white/5">
            {[
              { value: "807+", label: "Formulações de biomateriais" },
              { value: "12", label: "Etapas do pipeline" },
              { value: "100+", label: "Artigos científicos" },
              { value: "4", label: "Módulos principais" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-emerald-400 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Por que escolher o BIA v3?</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Tecnologia de ponta para pesquisadores e empresas de biotecnologia
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: "IA Especializada",
                desc: "Modelos treinados especificamente em literatura científica de biofabricação, engenharia de tecidos e biomateriais",
                color: "emerald",
              },
              {
                icon: Layers,
                title: "Pipeline Estruturado",
                desc: "12 etapas metodológicas validadas por especialistas, desde a definição do tecido-alvo até a escalabilidade",
                color: "blue",
              },
              {
                icon: FlaskConical,
                title: "807+ Formulações",
                desc: "Base de dados abrangente de biomateriais com propriedades mecânicas, biocompatibilidade e aplicações mapeadas",
                color: "purple",
              },
              {
                icon: Microscope,
                title: "Organoid Builder",
                desc: "Design assistido por IA de mini-órgãos funcionais para modelos de doenças e testes pré-clínicos",
                color: "teal",
              },
              {
                icon: Shield,
                title: "Base RAG Científica",
                desc: "Recuperação aumentada de geração com mais de 100 artigos científicos indexados e atualizados",
                color: "amber",
              },
              {
                icon: BarChart3,
                title: "Analytics & Reports",
                desc: "Dashboard completo com métricas de projeto, consumo de créditos e relatórios exportáveis",
                color: "pink",
              },
            ].map((feature) => (
              <div key={feature.title} className="group bia-card dark:bg-white/2 dark:border-white/8 hover:border-emerald-500/20">
                <div className={`w-12 h-12 rounded-xl bg-${feature.color}-500/10 border border-${feature.color}-500/20 flex items-center justify-center mb-5`}>
                  <feature.icon className={`w-6 h-6 text-${feature.color}-400`} />
                </div>
                <h3 className="text-lg font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">6 Módulos Especializados</h2>
            <p className="text-gray-400 text-lg">Cobrindo todo o ciclo de vida da biofabricação</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                title: "Pipeline de Design",
                desc: "12 etapas metodológicas para design completo de tecidos artificiais",
                tags: ["Scaffold", "Células", "Bioimpressão"],
                color: "emerald",
              },
              {
                num: "02",
                title: "Formulador de Biomateriais",
                desc: "Database com 807+ formulações, propriedades e aplicações detalhadas",
                tags: ["Hidrogéis", "Scaffolds", "Biointas"],
                color: "blue",
              },
              {
                num: "03",
                title: "Organoid Builder",
                desc: "Design assistido de mini-órgãos: cerebral, cardíaco, hepático e mais",
                tags: ["Brain", "Heart", "Liver"],
                color: "purple",
              },
              {
                num: "04",
                title: "Gerador de Protocolos",
                desc: "Protocolos laboratoriais personalizados com base nas suas especificações",
                tags: ["SOP", "Reagentes", "Steps"],
                color: "teal",
              },
              {
                num: "05",
                title: "Base de Conhecimento",
                desc: "100+ artigos científicos indexados com busca semântica RAG",
                tags: ["PubMed", "Nature", "Science"],
                color: "amber",
              },
              {
                num: "06",
                title: "Chat IA Especializado",
                desc: "Assistente de IA com contexto científico profundo em biofabricação",
                tags: ["Gemini", "RAG", "Contexto"],
                color: "pink",
              },
            ].map((module) => (
              <div key={module.num} className="relative group overflow-hidden rounded-2xl border border-white/8 bg-white/2 p-6 hover:border-emerald-500/20 transition-all">
                <div className="text-5xl font-bold text-white/5 absolute top-4 right-4">{module.num}</div>
                <div className="relative z-10">
                  <div className={`text-${module.color}-400 text-sm font-mono mb-3`}>módulo {module.num}</div>
                  <h3 className="text-xl font-semibold mb-3">{module.title}</h3>
                  <p className="text-gray-400 text-sm mb-4 leading-relaxed">{module.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {module.tags.map((tag) => (
                      <span key={tag} className={`text-xs bg-${module.color}-500/10 border border-${module.color}-500/20 text-${module.color}-400 px-2.5 py-1 rounded-full`}>
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

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Planos e Preços</h2>
            <p className="text-gray-400 text-lg">Escolha o plano ideal para sua pesquisa ou equipe</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  plan.popular
                    ? "border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                    : "border-white/8 bg-white/2"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                    MAIS POPULAR
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className={`w-4 h-4 text-${plan.color}-400`} />
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                  </div>
                  <div className="mt-3">
                    <span className="text-3xl font-bold">R$ {plan.price.toLocaleString("pt-BR")}</span>
                    <span className="text-gray-400 text-sm">/mês</span>
                  </div>
                  <div className="credit-pill mt-3">
                    <Zap className="w-3 h-3" />
                    {plan.credits.toLocaleString("pt-BR")} créditos/mês
                  </div>
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/auth/register"
                  className={`w-full text-center py-3 px-4 rounded-xl font-medium text-sm transition-all ${
                    plan.popular
                      ? "bia-button-primary"
                      : "border border-white/15 text-gray-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  Começar com {plan.name}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-500 text-sm mt-8">
            Todos os planos incluem 7 dias de teste gratuito. Sem necessidade de cartão de crédito.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-12 overflow-hidden">
            <div className="absolute inset-0 grid-bg opacity-50" />
            <div className="relative z-10">
              <Dna className="w-12 h-12 text-emerald-400 mx-auto mb-6 bio-pulse" />
              <h2 className="text-4xl font-bold mb-4">
                Pronto para acelerar sua pesquisa?
              </h2>
              <p className="text-gray-400 text-lg mb-8">
                Junte-se a pesquisadores e empresas que estão usando BIA v3
                para revolucionar a biofabricação.
              </p>
              <Link href="/auth/register" className="bia-button-primary inline-flex items-center gap-2 text-base px-8 py-4 rounded-xl">
                Criar conta gratuita <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                <Dna className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-300">BIA v3</span>
            </div>
            <p className="text-gray-500 text-sm">
              © 2024 BIA v3. Todos os direitos reservados. Plataforma de IA para biofabricação.
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
