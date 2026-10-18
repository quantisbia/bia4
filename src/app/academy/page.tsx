"use client"

/**
 * BIA · Academy · Landing pública — R13.02
 *
 * Rota: /academy  (não exige login)
 *
 * Estrutura (6 seções + footer):
 *  1. Hero + 2 CTAs (Asaas curso online, WhatsApp corporativo)
 *  2. Programa oficial (verbatim da copy padronizada)
 *  3. Como funciona? (3 passos)
 *  4. Grade dos 12 módulos com destaque no Módulo 1 (já disponível)
 *  5. Para quem é? (público-alvo do doc R13)
 *  6. Investimento (2 cards)
 *  7. FAQ colapsável
 *  8. Footer
 *
 * Tracking mínimo: dispara POST /api/academy/analytics fire-and-forget
 * nos cliques dos CTAs principais. Sem cookies, sem GA, só dados
 * agregados para o time comercial.
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  GraduationCap, PlayCircle, Wrench, Save, CheckCircle2,
  Sparkles, ArrowRight, Users, Building2, Flag, Award,
  MessageCircle, ExternalLink, ChevronDown, ChevronUp,
  Zap, Gift, FileText,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import {
  getFeaturedWhitePaper,
  getOpenAccessEbooks,
  getStudentOnlyEbooks,
} from "@/lib/academy/library-content"
import { BrindeDownloadGate } from "./_components/BrindeDownloadGate"

// ─── Constantes comerciais oficiais (LOCKED) ─────────────────────
// Link Asaas do checkout individual online (verbatim, não alterar sem OK da Janaina).
const ASAAS_LINK = "https://www.asaas.com/c/iu7ym1dp93cei9zk"
// WhatsApp comercial da Janaina para o card corporativo/in-company.
const WHATSAPP_LINK = "https://wa.me/11968632231"
// Valor do curso online individual (R$) — confirmado por Janaina em 2026-08-07.
// Curso online individual com plataforma BIA integrada + 12 meses de acesso.
const PRICE_BRL = 2375
// Brinde público (open-access) — white paper em destaque na landing.
// Resolvido fora do render porque esta página é "use client".
const FEATURED_BRINDE = getFeaturedWhitePaper()
// R13.15.2 · E-books agora são EXCLUSIVOS para alunos matriculados — viram
// atrativo da matrícula. Também mantemos os open-access caso existam no futuro.
// R13.15.3 · Force rebuild — e-book continuava aparecendo como gratuito em prod.
const FEATURED_EBOOKS = getOpenAccessEbooks()
const STUDENT_ONLY_EBOOKS = getStudentOnlyEbooks()
const PRICE_BRL_FORMATTED = PRICE_BRL.toLocaleString("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
})
// Parcelamento sugerido (12x sem juros no cartão — Asaas oferece)
const PRICE_INSTALLMENTS = 12
const PRICE_PER_INSTALLMENT = (PRICE_BRL / PRICE_INSTALLMENTS).toLocaleString("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
})

// ─── Tracking helper (fire-and-forget) ──────────────────────────
function trackEvent(event: string, metadata?: Record<string, unknown>) {
  // Não bloqueia UX se der erro — usa keepalive para eventos de saída
  try {
    fetch("/api/academy/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        path: "/academy",
        metadata,
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* silencioso */
  }
}

// ─── 12 módulos oficiais (do doc R13) ───────────────────────────
// Todos marcados como "disponíveis" na landing — vão sendo abertos
// progressivamente ao longo dos 12 meses. Alunos têm acesso completo
// a partir do dia 1.
const MODULES = [
  { n:  1, title: "Introdução à Biofabricação",   description: "Engenharia tecidual · Bioimpressão · Aplicações · Limitações",              available: true },
  { n:  2, title: "Biomateriais",                 description: "Polímeros naturais/sintéticos · Hidrogéis · MEC · Biocompatibilidade",     available: true },
  { n:  3, title: "Biotintas",                    description: "Formulação · Viscosidade · Reologia · Reticulação · Printabilidade",       available: true },
  { n:  4, title: "Bioimpressão 3D",              description: "Extrusão · Pressão · Velocidade · Altura de camada · Bicos · Temperatura", available: true },
  { n:  5, title: "Arquitetura 3D",               description: "Scaffold · Porosidade · Infill · STL · G-code · Geometria",                available: true },
  { n:  6, title: "Células",                      description: "Tipos celulares · Densidade · Viabilidade · Cultura pós-impressão",         available: true },
  { n:  7, title: "Tecidos",                      description: "Pele · Osso · Cartilagem · Tecidos moles · Vasos",                          available: true },
  { n:  8, title: "Esferoides e organoides",      description: "Building blocks · Scaffold-free · Organoides · Modelos de doença",         available: true },
  { n:  9, title: "Avaliação pós-impressão",      description: "Viabilidade · Morfologia · Mecânica · Histologia · Marcadores",             available: true },
  { n: 10, title: "Translação",                   description: "Escalabilidade · Reprodutibilidade · Qualidade · Regulação",                available: true },
  { n: 11, title: "Desenvolvimento de projeto",   description: "Estruture o seu projeto de biofabricação próprio",                          available: true },
  { n: 12, title: "Projeto final",                description: "Da ideia ao protocolo experimental exportável em PDF/DOCX",                 available: true },
]

// ─── Público-alvo ────────────────────────────────────────────────
const AUDIENCES = [
  { icon: Sparkles,   label: "Biofabricação" },
  { icon: PlayCircle, label: "Bioimpressão 3D" },
  { icon: Zap,        label: "Engenharia tecidual" },
  { icon: Wrench,     label: "Biomateriais" },
  { icon: Award,      label: "Odontologia" },
  { icon: Flag,       label: "Medicina regenerativa" },
  { icon: Users,      label: "Cosméticos" },
  { icon: Building2,  label: "Farmacêutica" },
  { icon: GraduationCap, label: "Universidades" },
  { icon: Save,       label: "P&D empresarial" },
]

// ─── FAQ ────────────────────────────────────────────────────────
const FAQ = [
  {
    q: "Preciso ter experiência prévia em biofabricação?",
    a: "Não. O programa começa do zero (Módulo 1: Introdução) e avança até projeto final. Alunos iniciantes e pesquisadores experientes acompanham no seu ritmo — o acesso é de 12 meses e você pode voltar nos módulos quantas vezes quiser.",
  },
  {
    q: "Os 12 módulos estão disponíveis desde o 1º dia?",
    a: "Sim. **Você tem acesso completo aos 12 módulos** assim que a matrícula é confirmada, sem liberação progressiva. Assista na ordem recomendada ou pule direto para o módulo que mais precisa — a estrutura é feita para quem quer aprender e aplicar no seu ritmo.",
  },
  {
    q: "As aulas são ao vivo ou gravadas?",
    a: "O conteúdo dos 12 módulos é **100% gravado** (você assiste no seu ritmo dentro dos 12 meses de acesso). Além disso, existem **3 encontros online ao vivo** com a Dra. Kamila Leichtweis e o time Quantis — você vê as datas confirmadas no seu dashboard assim que entra na plataforma.",
  },
  {
    q: "Como funciona a integração com a plataforma BIA?",
    a: "Dentro de cada aula, você tem um botão que abre a ferramenta correspondente da BIA (Formulador Pro para biotintas, Bioimpressão 3D para fatiar modelos, Organoid Builder para design 3D, etc). Tudo o que você criar fica salvo no seu Notebook com versionamento automático V1/V2/V3 — totalmente rastreável para publicação acadêmica.",
  },
  {
    q: "Existem práticas presenciais?",
    a: "Práticas presenciais são oferecidas apenas para cursos corporativos, institucionais ou grupos fechados (fale com o time comercial pelo WhatsApp). Para o curso online individual, não há prática presencial — mas você aplica TUDO na plataforma BIA, que é a mesma ferramenta usada por laboratórios parceiros da Quantis.",
  },
  {
    q: "Recebo certificado?",
    a: "Sim — e são **3 formatos de certificado**: por aula (a cada aula concluída, perfeito para LinkedIn progressivo), declaração parcial de progresso (enquanto estiver no meio do caminho) e o certificado final de conclusão (ao completar 100% + entregar o Projeto Final). Todos em PDF com código único de verificação pública.",
  },
  {
    q: "O que acontece depois dos 12 meses?",
    a: "Você continua tendo acesso ao Notebook com todos os seus protocolos e formulações (permanente). O acesso a novas atualizações do Academy e à BIA precisa ser renovado — entre em contato com o time comercial via WhatsApp quando se aproximar do fim.",
  },
  {
    q: "Quais são as formas de pagamento?",
    a: "R$ 2.375,00 à vista via Pix ou boleto, OU **até 12x de R$ 197,92 no cartão de crédito** (sem juros). Pagamento processado com segurança pela Asaas. A liberação do acesso à plataforma acontece em até 24 horas úteis após confirmação.",
  },
  {
    q: "E se eu não gostar do curso?",
    a: "Oferecemos **7 dias de garantia incondicional**. Se nos primeiros 7 dias você sentir que o curso não é para você, basta nos avisar por e-mail que devolvemos 100% do valor pago, sem perguntas. Depois dos 7 dias, o acesso segue válido pelos 12 meses contratados.",
  },
]

// ─── Componente ──────────────────────────────────────────────────

export default function AcademyLandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    trackEvent("landing_viewed")
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0514] text-white">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0514]/90 backdrop-blur-xl"
        data-testid="academy-nav"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/academy" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight leading-tight block">
                BIA <span className="text-violet-300">Academy</span>
              </span>
              <span className="hidden sm:block text-[9px] text-violet-300/70 tracking-widest uppercase leading-tight">
                Biofabricação · Bioimpressão 3D
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-sm text-gray-400">
            <a href="#programa"   className="hover:text-white transition-colors">Programa</a>
            <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona?</a>
            <a href="#modulos"    className="hover:text-white transition-colors">Módulos</a>
            <a href="#investimento" className="hover:text-white transition-colors">Investimento</a>
            <a href="#faq"        className="hover:text-white transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* R13.10.2 fix: "Já sou aluno" DEVE aparecer também no mobile
                (bug reportado pela Janaina — só aparecia com sm:block). */}
            <Link
              href="/auth/login?callbackUrl=/academy/dashboard"
              onClick={() => trackEvent("cta_login_clicked")}
              className="text-xs sm:text-sm text-violet-200 hover:text-white transition-colors px-2.5 sm:px-3 py-2 rounded-lg border border-violet-500/30 sm:border-transparent hover:border-violet-500/50 whitespace-nowrap"
              data-testid="academy-cta-login"
            >
              Já sou aluno
            </Link>
            <a
              href={ASAAS_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("cta_asaas_clicked", { location: "nav" })}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 shadow-lg shadow-violet-500/20 whitespace-nowrap"
              data-testid="academy-cta-asaas-nav"
            >
              Inscreva-se
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 mb-6 text-xs text-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Turma aberta · Todos os 12 módulos disponíveis desde o 1º dia
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Saia do papel e{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              bioimprima o seu primeiro tecido
            </span>{" "}
            em 12 semanas.
          </h1>

          <p className="text-base sm:text-xl text-gray-300 max-w-2xl mx-auto mb-3 leading-relaxed">
            A única formação em biofabricação onde a <strong className="text-white">plataforma de IA científica</strong> abre junto com a aula.
            Formule biotintas, fatie modelos 3D e gere protocolos de bancada no mesmo clique.
          </p>

          <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto mb-10">
            <strong className="text-white">12 módulos</strong> · <strong className="text-white">12 meses de acesso</strong> ·
            {" "}<strong className="text-white">3 encontros ao vivo</strong> · <strong className="text-white">certificado reconhecido</strong>
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch max-w-xl mx-auto">
            <a
              href={ASAAS_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("cta_asaas_clicked", { location: "hero" })}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-base font-semibold px-6 py-4 shadow-xl shadow-violet-500/25"
              data-testid="academy-cta-asaas-hero"
            >
              Garantir minha vaga
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("cta_whatsapp_clicked", { location: "hero" })}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-base font-semibold px-6 py-4"
              data-testid="academy-cta-whatsapp-hero"
            >
              <MessageCircle className="w-4 h-4" />
              Falar sobre curso corporativo
            </a>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Pagamento à vista ou em até 12x sem juros · acesso liberado em 24h · certificado ao concluir
          </p>

          {/* Mini-prova social / destaques */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Curadoria científica <strong className="text-white">Quantis Biotechnology</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <strong className="text-white">65+ artigos</strong> curados e citáveis
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Projeto final <strong className="text-white">rastreável e versionado</strong>
            </span>
          </div>
        </div>
      </section>

      {/* ── Programa oficial ─────────────────────────────────── */}
      <section
        id="programa"
        className="py-16 sm:py-20 px-4 sm:px-6 bg-gradient-to-b from-black/30 to-transparent"
        data-testid="academy-section-programa"
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">O que está incluído na sua matrícula</h2>
            <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto">
              Um pacote completo. Sem letras miúdas. Tudo o que a Quantis entrega para você sair do curso aplicando.
            </p>
          </div>

          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6 sm:p-8">
            <ul className="space-y-3">
              {[
                "12 módulos completos de conteúdo técnico (aulas gravadas, assista no seu ritmo)",
                "12 meses de acesso completo à plataforma — mesmo depois do fim do curso",
                "3 encontros online ao vivo com a Dra. Kamila Leichtweis e o time científico Quantis",
                "Acesso ilimitado à BIA — a mesma IA científica usada por laboratórios parceiros",
                "Biblioteca com 65+ artigos, 20 patentes e 15 protocolos curados pela nossa equipe",
                "Meu Projeto de Biofabricação — seu protocolo próprio, versionado automaticamente e exportável em PDF/DOCX",
                "Certificado por aula + certificado final de conclusão com código único de verificação pública",
                "White papers institucionais da Quantis (QMatrix, biotintas, etc) incluídos como material de apoio",
                "Práticas presenciais disponíveis apenas para cursos corporativos, institucionais ou grupos fechados",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm sm:text-base text-gray-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Como funciona? ───────────────────────────────────── */}
      <section
        id="como-funciona"
        className="py-16 sm:py-20 px-4 sm:px-6"
        data-testid="academy-section-como-funciona"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Como funciona?</h2>
            <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto">
              Aprender + aplicar no mesmo ambiente. Sem sair da BIA.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                n: 1, icon: PlayCircle,
                title: "Assista à aula",
                desc: "Vídeos com resumo, objetivos claros e material complementar (PDFs, artigos, protocolos).",
              },
              {
                n: 2, icon: Wrench,
                title: "Abra a ferramenta na BIA",
                desc: "Cada aula tem 1 botão que abre a ferramenta certa: Formulador, Bioimpressão, Organoid Builder…",
              },
              {
                n: 3, icon: Save,
                title: "Salve no seu Notebook",
                desc: "Tudo o que você criar fica salvo com versionamento automático (V1/V2/V3) e é exportável em PDF/DOCX.",
              },
            ].map((step) => (
              <div
                key={step.n}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/30 to-fuchsia-600/20 border border-violet-500/30 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-violet-300" />
                  </div>
                  <span className="text-xs font-mono text-violet-400">Passo {step.n}</span>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-1.5">{step.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Módulos ─────────────────────────────────────────── */}
      <section
        id="modulos"
        className="py-16 sm:py-20 px-4 sm:px-6 bg-black/20"
        data-testid="academy-section-modulos"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 mb-4 text-xs text-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Todos os módulos liberados no 1º dia
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">12 módulos · 1 jornada completa</h2>
            <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto">
              Do fundamento ao projeto final. Assista no seu ritmo, revise quando quiser — o acesso é seu por 12 meses.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {MODULES.map((m) => (
              <button
                key={m.n}
                onClick={() =>
                  trackEvent("module_preview_clicked", { moduleNumber: m.n, available: m.available })
                }
                className={cn(
                  "text-left rounded-xl border p-4 transition-all",
                  m.available
                    ? "border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 hover:border-violet-500/50"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]",
                )}
                data-testid={`academy-module-card-${m.n}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-gray-500">Módulo {m.n}</span>
                  {m.available ? (
                    <span className="text-[10px] font-medium text-violet-300 bg-violet-500/20 px-1.5 py-0.5 rounded">
                      Disponível
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-500">Em breve</span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-white mb-1 leading-tight">{m.title}</h3>
                <p className="text-xs text-gray-400 leading-snug">{m.description}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Brinde: White Paper QMatrix (open access) ───────── */}
      {FEATURED_BRINDE && (
          <section
            id="brinde"
            className="py-16 sm:py-20 px-4 sm:px-6"
            data-testid="academy-section-brinde"
          >
            <div className="max-w-5xl mx-auto">
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] via-fuchsia-500/[0.04] to-violet-500/[0.08] p-6 sm:p-10">
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
                  {/* Badge + ícone */}
                  <div className="shrink-0">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-semibold mb-4">
                      <Gift className="w-3.5 h-3.5" />
                      BRINDE · Acesso aberto, sem cadastro
                    </div>
                    <div className="w-28 h-36 sm:w-32 sm:h-40 rounded-xl bg-gradient-to-br from-fuchsia-600/40 to-violet-700/40 border border-white/10 flex items-center justify-center shadow-xl">
                      <FileText className="w-14 h-14 text-white/80" />
                    </div>
                  </div>

                  {/* Texto + CTA */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight mb-2">
                      {FEATURED_BRINDE.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-400 mb-4">
                      {FEATURED_BRINDE.authors.join(" · ")} · {FEATURED_BRINDE.year} · {FEATURED_BRINDE.pages} páginas · {FEATURED_BRINDE.sizeMb} MB
                    </p>
                    <p className="text-sm sm:text-base text-gray-300 leading-relaxed mb-5">
                      {FEATURED_BRINDE.abstract.slice(0, 420)}{FEATURED_BRINDE.abstract.length > 420 ? "…" : ""}
                    </p>

                    {/* Keywords */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {FEATURED_BRINDE.keywords.slice(0, 6).map((kw) => (
                        <span
                          key={kw}
                          className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/10 text-xs text-gray-300"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>

                    {/* CTA download */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <BrindeDownloadGate
                        resourceId={FEATURED_BRINDE.id}
                        resourceTitle={FEATURED_BRINDE.title}
                        pdfUrl={FEATURED_BRINDE.pdfUrl}
                        pages={FEATURED_BRINDE.pages}
                        sizeMb={FEATURED_BRINDE.sizeMb}
                        buttonLabel="Baixar PDF gratuito"
                        testIdPrefix="academy-brinde"
                        onDownloaded={() =>
                          trackEvent("brinde_download_clicked", { id: FEATURED_BRINDE.id })
                        }
                      />
                      <Link
                        href={ASAAS_LINK}
                        onClick={() => trackEvent("cta_asaas_clicked", { location: "brinde_section" })}
                        data-testid="academy-brinde-cta-asaas"
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/[0.08] hover:bg-fuchsia-500/[0.15] text-fuchsia-100 font-semibold text-sm transition-all"
                      >
                        <GraduationCap className="w-4 h-4" />
                        Quero me inscrever no curso completo
                      </Link>
                    </div>

                    <p className="mt-4 text-[11px] text-gray-500 italic leading-relaxed">
                      Este white paper é um dos materiais que você estuda na biblioteca da Academy.
                      Material técnico produzido por {FEATURED_BRINDE.authors.join(" & ")}, publicado pela Quantis Biotechnology.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
      )}

      {/* ── E-books exclusivos para alunos BIA Academy (R13.15.2) ── */}
      {STUDENT_ONLY_EBOOKS.length > 0 && (
        <section
          id="ebooks"
          className="py-16 sm:py-20 px-4 sm:px-6 bg-gradient-to-b from-transparent via-violet-950/20 to-transparent"
          data-testid="academy-section-ebooks"
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-semibold mb-4">
                <Award className="w-3.5 h-3.5" /> Brindes exclusivos da matrícula
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                E-books técnicos — exclusivos para alunos
              </h2>
              <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto">
                Guias ricamente ilustrados por aplicação clínica, com conteúdo denso de 50+ páginas, imagens originais da Quantis e figuras reais da literatura CC-BY. <strong className="text-violet-300">Liberados automaticamente para quem se matricula na BIA Academy.</strong>
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {STUDENT_ONLY_EBOOKS.map((eb) => (
                <article
                  key={eb.id}
                  className="group relative rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/40 to-slate-950/40 overflow-hidden hover:border-violet-400/50 transition-colors"
                  data-testid={`ebook-card-${eb.id}`}
                >
                  {eb.coverUrl && (
                    <div className="relative aspect-[3/4] overflow-hidden bg-slate-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={eb.coverUrl}
                        alt={`Capa — ${eb.title}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      {/* Badge "Exclusivo alunos" sobreposto */}
                      <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/90 text-black text-xs font-bold uppercase tracking-wide shadow-lg backdrop-blur-sm">
                        <span>🔒</span> Exclusivo alunos
                      </div>
                    </div>
                  )}
                  <div className="p-6 sm:p-7">
                    <div className="flex items-center gap-2 mb-3 text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 font-semibold uppercase tracking-wide">
                        E-book
                      </span>
                      <span className="text-gray-500">·</span>
                      <span className="text-violet-300">{eb.category}</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold mb-1 leading-tight">
                      {eb.title}
                    </h3>
                    {eb.subtitle && (
                      <p className="text-sm text-gray-400 italic mb-3">{eb.subtitle}</p>
                    )}
                    <p className="text-xs text-gray-500 mb-4">
                      {eb.year} · {eb.pages} páginas · {eb.sizeMb} MB · PDF A4
                    </p>
                    {eb.audience && (
                      <div className="rounded-lg bg-violet-500/5 border border-violet-500/20 p-3 mb-4">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-400 mb-1">
                          Para quem é
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed">
                          {eb.audience}
                        </p>
                      </div>
                    )}
                    <p className="text-sm text-gray-300 leading-relaxed mb-4">
                      {eb.abstract.slice(0, 280)}
                      {eb.abstract.length > 280 ? "…" : ""}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {eb.keywords.slice(0, 6).map((kw) => (
                        <span
                          key={kw}
                          className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-gray-400"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>

                    {/* ── Gate: 2 CTAs — matricular OU já sou aluno ── */}
                    <div
                      className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-violet-500/5 p-4 space-y-3"
                      data-testid={`ebook-gate-${eb.id}`}
                    >
                      <p className="text-sm text-amber-200/90 leading-snug">
                        <span className="font-semibold text-amber-200">
                          Este e-book é um brinde da matrícula.
                        </span>{" "}
                        Faça parte da BIA Academy e desbloqueie este e os próximos lançamentos.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Link
                          href={ASAAS_LINK}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() =>
                            trackEvent("ebook_gate_enroll_clicked", { id: eb.id })
                          }
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-semibold text-sm transition-all shadow-lg shadow-amber-500/20"
                          data-testid={`ebook-cta-enroll-${eb.id}`}
                        >
                          Matricular e desbloquear <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/login?callbackUrl=${encodeURIComponent(eb.pdfUrl)}&intent=download-ebook`}
                          onClick={() =>
                            trackEvent("ebook_gate_login_clicked", { id: eb.id })
                          }
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-violet-400/40 text-violet-200 hover:bg-violet-500/10 font-medium text-sm transition-colors"
                          data-testid={`ebook-cta-login-${eb.id}`}
                        >
                          Já sou aluno · Baixar
                        </Link>
                      </div>
                    </div>

                    <p className="text-[10px] text-gray-500 mt-4 italic leading-relaxed">
                      {eb.citation}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <p className="text-xs text-gray-500 text-center mt-8 italic">
              Mais e-books em produção · Próximos: Biofabricação em Odontologia, em Dermatologia, em Oncologia.
            </p>
          </div>
        </section>
      )}

      {/* ── E-books open-access (se houver no futuro) ──────────── */}
      {FEATURED_EBOOKS.length > 0 && (
        <section
          id="ebooks-open"
          className="py-10 px-4 sm:px-6"
          data-testid="academy-section-ebooks-open"
        >
          <div className="max-w-5xl mx-auto">
            <h3 className="text-lg font-semibold text-center text-gray-300 mb-6">
              Materiais gratuitos
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {FEATURED_EBOOKS.map((eb) => (
                <div
                  key={eb.id}
                  className="rounded-xl border border-white/10 p-4 bg-white/[0.02]"
                >
                  <h4 className="font-semibold mb-2">{eb.title}</h4>
                  <BrindeDownloadGate
                    resourceId={eb.id}
                    resourceTitle={eb.title}
                    pdfUrl={eb.pdfUrl}
                    pages={eb.pages}
                    sizeMb={eb.sizeMb}
                    buttonLabel="Baixar grátis"
                    testIdPrefix={`ebook-${eb.id}`}
                    onDownloaded={() =>
                      trackEvent("ebook_download_clicked", { id: eb.id })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Para quem é? ────────────────────────────────────── */}
      <section
        id="publico"
        className="py-16 sm:py-20 px-4 sm:px-6"
        data-testid="academy-section-publico"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Para quem é?</h2>
            <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto">
              Profissionais e pesquisadores das áreas de:
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {AUDIENCES.map((a) => (
              <div
                key={a.label}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center"
              >
                <a.icon className="w-6 h-6 text-violet-300 mx-auto mb-2" />
                <span className="text-xs sm:text-sm text-gray-200">{a.label}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500 text-center mt-6">
            Do iniciante ao pesquisador experiente — o acesso é individual e o ritmo é seu.
          </p>
        </div>
      </section>

      {/* ── Investimento ────────────────────────────────────── */}
      <section
        id="investimento"
        className="py-16 sm:py-20 px-4 sm:px-6 bg-black/30"
        data-testid="academy-section-investimento"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Investimento</h2>
            <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto">
              Duas modalidades. Escolha a que faz sentido para você.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            {/* Card Online */}
            <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 p-6 sm:p-8 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-violet-300" />
                </div>
                <span className="text-xs font-medium text-violet-300 uppercase tracking-wide">
                  Curso online individual
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">BIA Academy · Online</h3>
              <p className="text-xs text-gray-500 mb-4">Com plataforma BIA integrada</p>

              {/* Bloco de preço destacado */}
              <div
                data-testid="academy-price-block"
                className="rounded-xl bg-black/30 border border-violet-500/20 px-4 py-3 mb-5"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                    {PRICE_BRL_FORMATTED}
                  </span>
                  <span className="text-xs text-gray-400">à vista</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  ou até <span className="font-semibold text-violet-300">{PRICE_INSTALLMENTS}x de {PRICE_PER_INSTALLMENT}</span> no cartão
                </p>
              </div>

              <ul className="space-y-2 mb-6 text-sm text-gray-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span><strong className="text-white">Todos os 12 módulos</strong> liberados no 1º dia</span></li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span><strong className="text-white">12 meses</strong> de acesso completo</span></li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span>3 encontros ao vivo com a Dra. Kamila</span></li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span>Plataforma BIA integrada em todas as aulas</span></li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span>Biblioteca com 65+ artigos e white papers</span></li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span>Certificado por aula + certificado final</span></li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span><strong className="text-white">7 dias de garantia</strong> incondicional</span></li>
              </ul>
              <a
                href={ASAAS_LINK}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("cta_asaas_clicked", { location: "pricing" })}
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-base font-semibold px-6 py-3.5 shadow-lg shadow-violet-500/20"
                data-testid="academy-cta-asaas-pricing"
              >
                Inscreva-se agora
                <ArrowRight className="w-4 h-4" />
              </a>
              <p className="text-[11px] text-gray-500 mt-3 text-center">
                Pagamento seguro via Asaas · Boleto, Pix ou cartão
              </p>
            </div>

            {/* Card Corporativo */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-emerald-300" />
                </div>
                <span className="text-xs font-medium text-emerald-300 uppercase tracking-wide">
                  Corporativo / institucional
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
                Turma fechada / in-company
              </h3>
              <ul className="space-y-2 mb-6 text-sm text-gray-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />Formação in-company</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />Turma no laboratório Quantis</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />Práticas presenciais incluídas</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />Parceria com universidade / centro</li>
              </ul>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("cta_whatsapp_clicked", { location: "pricing" })}
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-base font-semibold px-6 py-3.5"
                data-testid="academy-cta-whatsapp-pricing"
              >
                <MessageCircle className="w-4 h-4" />
                Falar com o time comercial
              </a>
              <p className="text-[11px] text-gray-500 mt-3 text-center">
                Resposta pelo WhatsApp em até 1 dia útil
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section
        id="faq"
        className="py-16 sm:py-20 px-4 sm:px-6"
        data-testid="academy-section-faq"
      >
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Perguntas frequentes</h2>
          </div>

          <div className="space-y-2">
            {FAQ.map((item, i) => {
              const isOpen = openFaq === i
              return (
                <div
                  key={i}
                  className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden"
                >
                  <button
                    onClick={() => {
                      const next = isOpen ? null : i
                      setOpenFaq(next)
                      if (next !== null) trackEvent("faq_expanded", { question: item.q })
                    }}
                    className="w-full flex items-center justify-between text-left px-4 sm:px-5 py-3.5 hover:bg-white/[0.03] transition-colors"
                    data-testid={`academy-faq-toggle-${i}`}
                  >
                    <span className="text-sm sm:text-base font-medium text-white pr-3">
                      {item.q}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-4 text-sm text-gray-300 leading-relaxed border-t border-white/5 pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────────── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Pronto para sair da teoria e <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">colocar a mão na massa</span>?
          </h2>
          <p className="text-sm sm:text-base text-gray-300 mb-6 leading-relaxed">
            Inscreva-se agora e, em até 24h, você já estará dentro da plataforma com
            os <strong className="text-white">12 módulos liberados</strong>, a BIA pronta para formular
            sua primeira biotinta e o calendário dos encontros ao vivo com a Dra. Kamila.
          </p>

          {/* CTAs — inscrição + login lado-a-lado (R13.10.2: adicionado login também aqui). */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={ASAAS_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("cta_asaas_clicked", { location: "footer_cta" })}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-base font-semibold px-8 py-4 shadow-xl shadow-violet-500/25 w-full sm:w-auto"
              data-testid="academy-cta-asaas-footer"
            >
              Inscreva-se no curso online
              <ExternalLink className="w-4 h-4" />
            </a>
            <Link
              href="/auth/login?callbackUrl=/academy/dashboard"
              onClick={() => trackEvent("cta_login_clicked", { location: "footer_cta" })}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-500/30 hover:border-violet-500/60 hover:bg-violet-500/10 text-violet-200 hover:text-white text-base font-semibold px-8 py-4 w-full sm:w-auto"
              data-testid="academy-cta-login-footer"
            >
              Já sou aluno · Entrar
            </Link>
          </div>

          <p className="text-[11px] text-gray-500 mt-4">
            Já pagou pelo Asaas? Faça login com o email que usou na inscrição.
          </p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-gray-500">
            © 2026 Quantis Biotechnology · BIA Academy
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <Link href="/privacy" className="hover:text-white">Privacidade</Link>
            <Link href="/terms" className="hover:text-white">Termos</Link>
            <Link href="/" className="hover:text-white">BIA (plataforma)</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
