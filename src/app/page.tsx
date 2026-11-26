import Link from "next/link"
import { isBlackFridayActive, bfPrice, bfSavings, bfPercentLabel, brl, BF_ENDS_LABEL, BF_ACADEMY, bfAcademyAnchor, bfAcademyPercent } from "@/lib/promo/black-friday"
import {
  ArrowRight, Brain, Microscope, Zap, CheckCircle2, Star, GraduationCap, ChevronRight,
  Atom, Printer, PenTool, BookMarked, ShieldCheck, MessageSquare,
} from "lucide-react"
import { FloatingThemeLocale } from "@/components/ui/FloatingThemeLocale"
import {
  PrinterScene, StirrerScene, ScaffoldCellsScene, SpheroidsScene, PrintTake, MaterialsTake, BiaOsDiagram, SpheroidStage,
} from "@/components/landing/BioScenes"

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
  shadow = "shadow-lg shadow-violet-900/60", pulse = false, className = "" }:
  { sizeClass?: string; size?: number; rounded?: string; shadow?: string; pulse?: boolean; className?: string }) {
  return (
    <div className={`${sizeClass} ${rounded} ${shadow} ${pulse ? "bio-pulse" : ""} ${className} bg-[#2d0a6e] flex items-center justify-center shrink-0`}>
      <BiaLogoSvg size={size} />
    </div>
  )
}

/* ─── R47 · Ambientes da BIA OS e estágios do esferoide (página inicial) ─── */
const AMBIENTES = [
  { icon: PenTool, name: "BIA Design", desc: "Modelo de tecido, geometrias e desenho de trajetórias.", tone: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20" },
  { icon: Atom, name: "BIA Materials", desc: "Biotintas, formulações e comparação de biomateriais.", tone: "text-teal-300 bg-teal-500/10 border-teal-500/20" },
  { icon: Printer, name: "BIA Print", desc: "BioSlicer, G-code e controle da bioimpressora, em dois caminhos.", tone: "text-violet-300 bg-violet-500/10 border-violet-500/20" },
  { icon: Microscope, name: "BIA Biology", desc: "Esferoides, organoides e maturação do construto.", tone: "text-amber-300 bg-amber-500/10 border-amber-500/20" },
  { icon: BookMarked, name: "BIA Lab", desc: "Notebook de experimentos, análises e relatórios.", tone: "text-rose-300 bg-rose-500/10 border-rose-500/20" },
  { icon: ShieldCheck, name: "BIA Regulatory", desc: "Protocolos GLP/GMP e dossiês regulatórios.", tone: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" },
  { icon: MessageSquare, name: "BIA Copilot", desc: "Chat de IA especializado em biofabricação.", tone: "text-indigo-300 bg-indigo-500/10 border-indigo-500/20" },
  { icon: GraduationCap, name: "BIA Academy", desc: "Formação em 12 módulos, com a ferramenta aberta ao lado.", tone: "text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-500/20" },
]

const SPHEROID_STAGES: Array<{ n: 1 | 2 | 3 | 4; title: string; text: string }> = [
  { n: 1, title: "1 · Semeadura", text: "Células em suspensão entram em um micropoço não aderente." },
  { n: 2, title: "2 · Agregação", text: "Sem onde aderir, elas sedimentam e se aproximam." },
  { n: 3, title: "3 · Compactação", text: "Os contatos entre células adensam o agregado." },
  { n: 4, title: "4 · Esferoide", text: "Microtecido compacto; nos maiores, o núcleo recebe menos oxigênio." },
]

const PRINT_POINTS = [
  "Caminho básico: superfície, objetos simples e até 3 cabeçotes, com G-code em poucos passos",
  "Caminho avançado: do modelo de tecido à maturação, em 6 fases",
  "BioSlicer com validação do G-code e envio à bioimpressora por USB",
]

const MATERIALS_POINTS = [
  "18 formulações validadas na literatura, com parâmetros de impressão",
  "Formulação livre com reologia recalculada a cada ajuste",
  "Formulador Pro: até 8 componentes com análise assistida por IA",
]

/* ══════════════════════════════════════════════════════════════════════ */
export default function HomePage() {
  return (
    <div className="bia-landing-page min-h-screen bg-[#0a0514] text-white overflow-x-hidden">

      {/* ── Controles flutuantes (tema + idioma) ─────────────────────────── */}
      <FloatingThemeLocale position="top-right" className="mt-16" />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0514]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <BiaLogoBox sizeClass="w-9 h-9" size={26} rounded="rounded-xl" />
            <div>
              <span className="text-lg font-bold tracking-tight leading-tight block">BIA <span className="text-violet-300">OS</span></span>
              <span className="hidden sm:block md:hidden lg:block text-[9px] text-violet-300 leading-tight whitespace-nowrap">
                Biofabrication Operating System
              </span>
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-7 text-sm text-gray-400">
            <Link href="#takes" className="hover:text-white transition-colors">Em ação</Link>
            <Link href="#plataforma" className="hover:text-white transition-colors">Plataforma</Link>
            <Link href="#esferoides" className="hover:text-white transition-colors">Esferoides</Link>
            <Link href="#academy" className="hover:text-fuchsia-300 transition-colors font-medium">
              Academy
            </Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Planos</Link>
          </div>

          {/* CTA */}
          {/* R13.10.2 fix: "Entrar" DEVE aparecer também no mobile
              (bug reportado pela Janaina — só aparecia sm:block). */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/auth/login"
              className="text-xs sm:text-sm text-violet-200 hover:text-white transition-colors px-2.5 sm:px-3 py-2 rounded-lg border border-violet-500/30 sm:border-transparent hover:border-violet-500/50 whitespace-nowrap"
              data-testid="home-nav-login"
            >
              Entrar
            </Link>
            <Link
              href="/auth/register"
              className="bia-button-primary text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-xl font-semibold whitespace-nowrap"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-24 sm:pt-32 pb-14 sm:pb-20 px-4 sm:px-6 grid-bg" data-testid="home-hero">
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[320px] sm:w-[680px] h-[320px] sm:h-[680px] bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* R47 · Fundo animado (telas largas): impressão de um scaffold, células migrando e hidrogel no agitador magnético.
            R48 · Esferoides embaixo do béquer. */}
        <div aria-hidden="true" data-testid="home-ambient" className="hidden xl:block">
          <div className="lp-ambient left-6 2xl:left-24 top-28 w-[200px] 2xl:w-[230px]"><PrinterScene /></div>
          <div className="lp-ambient left-10 2xl:left-28 top-[23rem] w-[210px] 2xl:w-[240px]"><ScaffoldCellsScene /></div>
          <div className="lp-ambient right-8 2xl:right-28 top-44 w-[190px] 2xl:w-[220px]"><StirrerScene /></div>
          <div className="lp-ambient right-6 2xl:right-24 top-[26.5rem] w-[200px] 2xl:w-[230px]" data-testid="home-ambient-spheroids"><SpheroidsScene /></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 sm:px-4 py-1.5 text-xs sm:text-sm text-violet-400 mb-6 sm:mb-8">
            <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span>Powered by Quantis Biotechnology</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-tight mb-3">
            <span className="bia-gradient-text glow-text">BIA OS</span>
          </h1>
          <h2 className="text-lg sm:text-2xl md:text-3xl font-semibold text-white/80 tracking-tight mb-5">
            Biofabrication Operating System
          </h2>

          <p className="text-base sm:text-xl text-gray-300 max-w-2xl mx-auto mb-3 leading-relaxed font-medium px-2">
            Formule biomateriais, modele estruturas, bioimprima e cultive{" "}
            <em className="text-violet-300 not-italic font-semibold">em um só sistema</em>.
          </p>
          <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto mb-8 leading-relaxed px-2">
            Do objetivo científico ao tecido fabricado, com ferramentas científicas e IA especializada em biofabricação.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 px-4">
            <Link href="/auth/register"
              className="bia-button-primary flex items-center justify-center gap-2 text-base w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold">
              <span>Começar agora</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/register?callbackUrl=%2Fdashboard%2Froadmap"
              className="flex items-center justify-center gap-2 text-base w-full sm:w-auto px-8 py-3.5 rounded-xl border border-violet-500/30 bg-violet-500/5 text-violet-200 hover:bg-violet-500/10 hover:border-violet-500/50 hover:text-white transition-all"
              title="Cadastre-se e siga o Roteiro Profissional passo-a-passo com seus 30 créditos grátis">
              <span>Ver demonstração guiada</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-blue-300">
            <Zap className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Comece com <strong className="text-blue-200">30 créditos grátis</strong> para testar</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 pt-8 mt-8 border-t border-white/5">
            {[
              { value: "807+", label: "Formulações bio" },
              { value: "120+", label: "Artigos científicos" },
              { value: "12",   label: "Etapas pipeline" },
              { value: "8",    label: "Ambientes de trabalho" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-violet-400 mb-1">{stat.value}</div>
                <div className="text-xs sm:text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Em telas menores as quatro cenas entram como faixa decorativa */}
          <div aria-hidden="true" data-testid="home-ambient-strip" className="lp-strip xl:hidden mt-10 grid grid-cols-4 gap-3 items-end max-w-lg mx-auto opacity-70">
            <PrinterScene /><StirrerScene /><SpheroidsScene /><ScaffoldCellsScene />
          </div>
        </div>
      </section>

      {/* ── BIA Academy · Banner destacado (R13.03.2) ──────────────────── */}
      <section
        id="academy"
        className="relative py-14 sm:py-20 px-4 sm:px-6"
        data-testid="home-academy-banner"
      >
        {/* Glow de fundo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="rounded-2xl sm:rounded-3xl border border-fuchsia-500/25 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-purple-500/5 overflow-hidden">

            <div className="grid md:grid-cols-2 gap-0">
              {/* Coluna esquerda · conteúdo */}
              <div className="p-6 sm:p-10 md:p-12 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 bg-fuchsia-500/15 border border-fuchsia-500/30 rounded-full px-3 py-1 text-xs text-fuchsia-300 mb-5 self-start">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span className="font-semibold uppercase tracking-wider">Novo · BIA Academy</span>
                </div>

                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
                  Aprenda biofabricação com a{" "}
                  <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                    ferramenta ao lado
                  </span>
                </h2>

                <p className="text-sm sm:text-base text-gray-300 mb-6 leading-relaxed">
                  12 módulos + 12 meses de acesso à plataforma BIA. Cada aula abre a
                  ferramenta correspondente (Formulador Pro, Bioimpressão, Organoid Builder)
                  para você aplicar o que aprendeu na hora. 3 encontros online ao vivo com
                  a equipe científica Quantis + certificado.
                </p>

                {/* Bloco de preço destacado */}
                {isBlackFridayActive() ? (
                  <div
                    data-testid="home-academy-price"
                    className="rounded-xl bg-black/40 border border-amber-400/40 px-4 py-3 mb-6"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300 mb-1">🔥 Black Friday · curso + acesso integral à BIA · até {BF_ENDS_LABEL}</p>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight" data-testid="home-academy-bf-monthly">{brl(BF_ACADEMY.monthly)}</span>
                      <span className="text-xs text-gray-400">/mês</span>
                      <span className="text-xs text-gray-500 mx-1">ou</span>
                      <span className="text-xl font-bold text-amber-200" data-testid="home-academy-bf-annual">{brl(BF_ACADEMY.annual)}</span>
                      <span className="text-xs text-gray-400">/ano</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      anual: de <span className="line-through">{brl(bfAcademyAnchor())}</span> → <span className="font-semibold text-amber-200">{bfAcademyPercent()}% OFF</span> · inclui a plataforma BIA completa
                    </p>
                  </div>
                ) : (
                  <div
                    data-testid="home-academy-price"
                    className="rounded-xl bg-black/30 border border-fuchsia-500/25 px-4 py-3 mb-6"
                  >
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                        R$ 2.375,00
                      </span>
                      <span className="text-xs text-gray-400">à vista</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      ou até <span className="font-semibold text-fuchsia-300">12x de R$ 197,92</span> no cartão sem juros
                    </p>
                  </div>
                )}

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/academy"
                    data-testid="home-academy-cta-primary"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm sm:text-base font-semibold px-5 py-3 shadow-lg shadow-fuchsia-500/20 transition-all"
                  >
                    Conhecer o programa
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <a
                    href={isBlackFridayActive() ? "/academy#investimento" : "https://www.asaas.com/c/iu7ym1dp93cei9zk"}
                    target={isBlackFridayActive() ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    data-testid="home-academy-cta-asaas"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-fuchsia-500/30 text-fuchsia-200 hover:bg-fuchsia-500/10 hover:border-fuchsia-500/50 hover:text-white text-sm sm:text-base font-semibold px-5 py-3 transition-all"
                  >
                    Inscrever-se agora
                    <ChevronRight className="w-4 h-4" />
                  </a>
                </div>

                <p className="text-[11px] text-gray-500 mt-4">
                  Pagamento seguro via Asaas · Boleto, Pix ou cartão · Liberação em 24h úteis
                </p>

                {/* R13.10.2: link explícito para quem já é aluno (bug reportado — não achavam login pelo mobile). */}
                <p className="text-[11px] text-gray-400 mt-3 pt-3 border-t border-white/[0.06]">
                  Já é aluno?{" "}
                  <Link
                    href="/auth/login"
                    className="text-fuchsia-300 hover:text-fuchsia-200 font-semibold underline underline-offset-2"
                    data-testid="home-academy-banner-login"
                  >
                    Entrar na plataforma →
                  </Link>
                </p>
              </div>

              {/* Coluna direita · mockup visual (grid dos 12 módulos) */}
              <div className="relative bg-gradient-to-br from-violet-900/20 to-fuchsia-900/10 p-6 sm:p-10 md:p-12 hidden md:flex items-center justify-center">
                <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                  {[
                    "Introdução", "Biomateriais", "Biotintas",
                    "Bioimpressão", "Arquitetura", "Células",
                    "Tecidos", "Organoides", "Avaliação",
                    "Translação", "Projeto", "Final",
                  ].map((label, i) => (
                    <div
                      key={label}
                      className={`aspect-square rounded-lg border p-2 flex flex-col items-center justify-center text-center transition-all ${
                        i === 0
                          ? "bg-gradient-to-br from-violet-500/25 to-fuchsia-500/25 border-fuchsia-500/40"
                          : "bg-white/[0.03] border-white/[0.06]"
                      }`}
                    >
                      <span className={`text-[10px] font-bold mb-0.5 ${i === 0 ? "text-fuchsia-200" : "text-gray-500"}`}>
                        M{String(i + 1).padStart(2, "0")}
                      </span>
                      <span className={`text-[8px] leading-tight ${i === 0 ? "text-fuchsia-300" : "text-gray-600"}`}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Badge "disponível agora" */}
                <div className="absolute top-6 right-6 inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2.5 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">
                    Módulo 1 aberto
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── R47 · A plataforma em movimento (BIA Print e BIA Materials) ───── */}
      <section id="takes" data-testid="home-takes" className="relative scroll-mt-20 py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-2 block">A plataforma em movimento</span>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              Do béquer à bioimpressora, <span className="bia-gradient-text">no mesmo fluxo</span>
            </h2>
            <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto">
              Formule a biotinta, gere o G-code e imprima. Cada fase alimenta a próxima.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-14 sm:mb-20">
            <figure className="lp-stage p-2 sm:p-3" data-testid="home-take-print">
              <PrintTake />
              <figcaption className="lp-caption px-2 pt-2 pb-1">Ilustração esquemática · não é gravação de tela</figcaption>
            </figure>
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-violet-300 mb-3">
                <Printer className="w-3.5 h-3.5" /> BIA Print
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold leading-tight mb-3">Do modelo ao G-code, camada por camada</h3>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-4">
                Dois caminhos para a mesma bioimpressora: um rápido, para quem já domina os parâmetros essenciais, e um completo, em 6 fases.
              </p>
              <ul className="space-y-2.5 text-sm text-gray-300 mb-5">
                {PRINT_POINTS.map((t) => (
                  <li key={t} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" /><span>{t}</span></li>
                ))}
              </ul>
              <Link href="/auth/register" className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-300 hover:text-violet-200 underline-offset-4 hover:underline">
                Experimentar o BIA Print <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-teal-300 mb-3">
                <Atom className="w-3.5 h-3.5" /> BIA Materials
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold leading-tight mb-3">Formule a biotinta e veja a reologia responder</h3>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-4">
                Parta de uma formulação validada, monte a sua do zero ou peça a análise do Formulador Pro.
              </p>
              <ul className="space-y-2.5 text-sm text-gray-300 mb-5">
                {MATERIALS_POINTS.map((t) => (
                  <li key={t} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" /><span>{t}</span></li>
                ))}
              </ul>
              <Link href="/auth/register" className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-300 hover:text-teal-200 underline-offset-4 hover:underline">
                Experimentar o BIA Materials <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <figure className="lp-stage p-2 sm:p-3 order-1 lg:order-2" data-testid="home-take-materials">
              <MaterialsTake />
              <figcaption className="lp-caption px-2 pt-2 pb-1">Ilustração esquemática · valores de exemplo</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ── R47 · Esquema da BIA OS: um núcleo, oito ambientes ─────────────── */}
      <section id="plataforma" data-testid="home-bia-os" className="relative overflow-hidden scroll-mt-20 py-16 sm:py-24 px-4 sm:px-6">
        {/* Só em telas bem largas: abaixo disso a cena ficaria atrás do esquema */}
        <div aria-hidden="true" className="hidden 2xl:block">
          <div className="lp-ambient right-6 top-16 w-[180px]"><ScaffoldCellsScene /></div>
        </div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center mb-12">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-2 block">Como a BIA OS se organiza</span>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
                Um sistema, <span className="bia-gradient-text">oito ambientes</span>
              </h2>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-3">
                Em vez de uma lista de ferramentas soltas, a BIA OS agrupa o trabalho de biofabricação em ambientes.
                Você entra pelo que precisa fazer: formular, modelar, imprimir, cultivar, registrar ou validar.
              </p>
              <p className="text-gray-400 text-sm leading-relaxed">
                O Copilot responde dúvidas técnicas e a Academy ensina cada etapa com a ferramenta aberta ao lado.
              </p>
            </div>
            <div className="lp-stage p-4 sm:p-6 w-full max-w-md mx-auto" data-testid="home-bia-os-diagram">
              <BiaOsDiagram />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AMBIENTES.map((a) => (
              <div key={a.name} className="lp-card p-5">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 ${a.tone}`}>
                  <a.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1.5">{a.name}</h3>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── R47 · Esferoides: de células dispersas a microtecidos ──────────── */}
      <section id="esferoides" data-testid="home-spheroids" className="relative overflow-hidden scroll-mt-20 py-16 sm:py-24 px-4 sm:px-6">
        {/* Cabe na margem lateral: não encosta no título centralizado */}
        <div aria-hidden="true" className="hidden xl:block">
          <div className="lp-ambient left-3 2xl:left-10 top-12 w-[110px] 2xl:w-[170px]"><StirrerScene /></div>
        </div>
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-300 mb-2 block">BIA Biology</span>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 leading-tight">
              Esferoides: de células dispersas a <span className="bia-gradient-text">microtecidos 3D</span>
            </h2>
            <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Esferoides se formam sem scaffold. No Organoid Builder você planeja o tipo celular, o método de agregação e o cronograma de cultivo.
            </p>
          </div>

          <div className="lp-stage p-4 sm:p-6" data-testid="home-spheroid-stages">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {SPHEROID_STAGES.map((s) => (
                <div key={s.n}>
                  <SpheroidStage stage={s.n} />
                  <p className="lp-stage-title mt-2">{s.title}</p>
                  <p className="lp-stage-text">{s.text}</p>
                </div>
              ))}
            </div>
            <p className="lp-caption mt-5">Ilustração esquemática · tempos e tamanhos variam com o tipo celular</p>
          </div>

          <div className="text-center mt-8">
            <Link href="/auth/register" className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-300 hover:text-amber-200 underline-offset-4 hover:underline">
              Planejar esferoides no Organoid Builder <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────── */}
      <section id="pricing" className="py-16 sm:py-24 px-4 sm:px-6 bg-black/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            {/* R32 · Black Friday — 22% OFF em planos e pacotes (cursos não participam) */}
            {isBlackFridayActive() && (
              <div
                data-testid="home-black-friday-banner"
                className="relative overflow-hidden mx-auto max-w-3xl mb-8 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-[#1a0b00] via-[#2a0f05] to-[#1a0633] px-5 py-4 text-left"
              >
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
                <div className="relative flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-900/50 text-xl">🔥</div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Black Friday · até {BF_ENDS_LABEL}</p>
                    <p className="text-base sm:text-lg font-extrabold text-white leading-tight">
                      A Black Friday já começou aqui! <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">{bfPercentLabel()}</span> em toda a loja BIA
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Planos e pacotes de créditos com desconto. <Link href="/academy#investimento" className="text-amber-200 underline underline-offset-2">BIA Academy + plataforma</Link> por {brl(BF_ACADEMY.monthly)}/mês ou {brl(BF_ACADEMY.annual)}/ano ({bfAcademyPercent()}% OFF). Turmas presenciais não participam.</p>
                  </div>
                  <Link href="/dashboard/billing" className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-600 text-white shadow-lg shadow-orange-900/40 hover:opacity-90 transition-opacity">
                    Ver ofertas na loja <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
            <span className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-2 block">Planos & Preços</span>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">Escolha seu plano</h2>
            <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto">
              Do pesquisador independente às maiores instituições
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2 text-xs sm:text-sm text-blue-300">
                <Zap className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span><strong className="text-blue-200">30 créditos grátis</strong> para começar</span>
              </div>
              {isBlackFridayActive() ? (
                <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2 text-xs sm:text-sm text-amber-300">
                  <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span><strong className="text-amber-200">{bfPercentLabel()}</strong> Black Friday · planos e créditos</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2 text-xs sm:text-sm text-emerald-300">
                  <Star className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span><strong className="text-emerald-200">20% OFF</strong> plano anual</span>
                </div>
              )}
            </div>
          </div>

          {/* Free plan highlight */}
          <div className="max-w-sm mx-auto mb-6 sm:mb-8">
            <div className="rounded-xl border border-white/10 bg-white/2 p-5 text-center">
              <div className="w-10 h-10 rounded-xl bg-gray-500/10 border border-gray-500/20 flex items-center justify-center mx-auto mb-3">
                <Zap className="w-5 h-5 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold mb-1">Experimente grátis</h3>
              <div className="text-2xl font-bold mb-3">R$ 0</div>
              <p className="text-xs text-gray-400 mb-4">10 créditos iniciais · Explore os módulos</p>
              <Link href="/auth/register"
                className="block w-full text-center py-2.5 px-4 rounded-xl font-medium text-sm border border-white/10 text-gray-300 hover:bg-white/5 transition-all">
                Criar conta grátis
              </Link>
            </div>
          </div>

          {/* R13.11 · PLANO ÚNICO: "Guia Inteligente em Biofabricação 3D"
              R$ 507/mês em modelo de ASSINATURA. 1.500 créditos que RESETAM
              todo mês (não acumulam). Cancele quando quiser.
              Planos antigos (ADVANCED/ENTERPRISE) removidos do catálogo público;
              assinantes existentes mantêm acesso via BillingClient legado.
              A BIA Academy (R$ 2.375 · 12 meses + curso) continua separada
              — vendida no banner do hero + landing /academy. */}

          {/* Guia Inteligente — 1 card centralizado (assinatura) */}
          <div className="max-w-lg mx-auto">
            <div
              data-testid="home-plan-guide-card"
              className="relative rounded-2xl sm:rounded-3xl border-2 border-violet-500/50 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 p-6 sm:p-8 flex flex-col shadow-2xl shadow-violet-900/20"
            >
              <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap shadow-lg ${isBlackFridayActive() ? "bg-gradient-to-r from-amber-400 to-orange-600" : "bg-gradient-to-r from-violet-600 to-fuchsia-600"}`}>
                {isBlackFridayActive() ? `🔥 BLACK FRIDAY · ${bfPercentLabel()}` : "ASSINATURA MENSAL"}
              </div>

              <div className="flex items-center gap-3 mb-5 mt-2">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-violet-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">
                    Guia Inteligente em Biofabricação 3D
                  </h3>
                  <span className="text-[10px] text-violet-300 uppercase tracking-wider">
                    Plataforma BIA · Acesso completo
                  </span>
                </div>
              </div>

              <div className="mb-5">
                {isBlackFridayActive() ? (
                  <div data-testid="home-plan-guide-bf-price">
                    <p className="text-sm text-gray-500 line-through">R$ 507/mês</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-bold text-white">{brl(bfPrice(507))}</span>
                      <span className="text-sm text-gray-400 font-medium">/mês</span>
                    </div>
                    <p className="text-[11px] font-bold text-amber-300 mt-1">Black Friday · {bfPercentLabel()} · economize {brl(bfSavings(507))}/mês</p>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-bold text-white">R$ 507</span>
                    <span className="text-sm text-gray-400 font-medium">/mês</span>
                  </div>
                )}
                <div className="credit-pill mt-3 w-fit text-xs bg-violet-500/10 border-violet-500/20 text-violet-300">
                  <Zap className="w-3 h-3" />1.500 créditos renovados todo mês
                </div>
                <p className="text-[11px] text-violet-400/80 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Cancele quando quiser · Sem multa
                </p>
              </div>

              <ul className="space-y-2.5 mb-6 flex-1 text-xs sm:text-sm text-gray-300">
                {[
                  "1.500 créditos renovados todo mês",
                  "Acesso completo à plataforma BIA",
                  "Pipeline · Formulator Pro · Bioprinting",
                  "Organoid Builder · GLP/GMP · Chat IA",
                  "Knowledge Engine · Notebook do Pesquisador",
                  "807+ biomateriais catalogados",
                  "Slicer 3D com 11 algoritmos biomédicos",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="https://www.asaas.com/c/qsnp08rvpuwlj8ip"
                target="_blank"
                data-testid="home-plan-guide-cta"
                className="w-full text-center py-3 px-4 rounded-xl font-semibold text-sm sm:text-base bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-90 transition-opacity shadow-lg shadow-violet-500/30"
              >
                {isBlackFridayActive() ? `Assinar na Black Friday — ${brl(bfPrice(507))}/mês →` : "Assinar agora — R$ 507/mês →"}
              </Link>

              <p className="text-[11px] text-gray-500 mt-3 text-center">
                Pagamento recorrente seguro via Asaas · Boleto, Pix ou cartão
                {isBlackFridayActive() && <> · desconto de {bfPercentLabel()} aplicado no checkout promocional</>}
              </p>
            </div>

            {/* Nota: BIA Academy é produto separado */}
            <p className="text-center text-xs text-gray-500 mt-6">
              💡 <Link href="/academy" className="text-fuchsia-300 hover:text-fuchsia-200 underline underline-offset-2">BIA Academy</Link> é um produto separado — curso online de 12 meses com plataforma integrada{isBlackFridayActive() ? <> — <strong className="text-amber-200">na Black Friday com acesso integral à BIA: {brl(BF_ACADEMY.monthly)}/mês ou {brl(BF_ACADEMY.annual)}/ano</strong>. Turmas presenciais não participam da Black Friday.</> : <> (R$ 2.375 · pagamento único).</>}
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer CTA ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-16 sm:py-20 px-4 sm:px-6" data-testid="home-final-cta">
        <div aria-hidden="true" className="hidden xl:block">
          <div className="lp-ambient left-[6%] top-12 w-[180px]"><PrinterScene /></div>
          <div className="lp-ambient right-[6%] top-16 w-[190px]"><ScaffoldCellsScene /></div>
        </div>
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <BiaLogoBox sizeClass="w-16 h-16 sm:w-20 sm:h-20" size={52} rounded="rounded-2xl sm:rounded-3xl"
            shadow="shadow-2xl shadow-violet-900/80" pulse className="mx-auto mb-6" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Comece hoje mesmo
          </h2>
          <p className="text-gray-400 text-sm sm:text-base mb-8">
            Crie sua conta grátis e explore todos os módulos BIA — assine o Guia Inteligente quando quiser mais créditos
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
            <span className="text-sm text-gray-500">BIA OS — Quantis Biotechnology © 2026</span>
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
