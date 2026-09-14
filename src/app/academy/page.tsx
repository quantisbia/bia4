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
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

// ─── Constantes comerciais oficiais (LOCKED) ─────────────────────
// Link Asaas do checkout individual online (verbatim, não alterar sem OK da Janaina).
const ASAAS_LINK = "https://www.asaas.com/c/iu7ym1dp93cei9zk"
// WhatsApp comercial da Janaina para o card corporativo/in-company.
const WHATSAPP_LINK = "https://wa.me/11968632231"
// Valor do curso online individual (R$) — confirmado por Janaina em 2026-08-07.
// Curso online individual com plataforma BIA integrada + 12 meses de acesso.
const PRICE_BRL = 2375
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
const MODULES = [
  { n:  1, title: "Introdução à Biofabricação",   description: "Engenharia tecidual · Bioimpressão · Aplicações · Limitações",              available: true  },
  { n:  2, title: "Biomateriais",                 description: "Polímeros naturais/sintéticos · Hidrogéis · MEC · Biocompatibilidade",     available: false },
  { n:  3, title: "Biotintas",                    description: "Formulação · Viscosidade · Reologia · Reticulação · Printabilidade",       available: false },
  { n:  4, title: "Bioimpressão 3D",              description: "Extrusão · Pressão · Velocidade · Altura de camada · Bicos · Temperatura", available: false },
  { n:  5, title: "Arquitetura 3D",               description: "Scaffold · Porosidade · Infill · STL · G-code · Geometria",                available: false },
  { n:  6, title: "Células",                      description: "Tipos celulares · Densidade · Viabilidade · Cultura pós-impressão",         available: false },
  { n:  7, title: "Tecidos",                      description: "Pele · Osso · Cartilagem · Tecidos moles · Vasos",                          available: false },
  { n:  8, title: "Esferoides e organoides",      description: "Building blocks · Scaffold-free · Organoides · Modelos de doença",         available: false },
  { n:  9, title: "Avaliação pós-impressão",      description: "Viabilidade · Morfologia · Mecânica · Histologia · Marcadores",             available: false },
  { n: 10, title: "Translação",                   description: "Escalabilidade · Reprodutibilidade · Qualidade · Regulação",                available: false },
  { n: 11, title: "Desenvolvimento de projeto",   description: "Estruture o seu projeto de biofabricação próprio",                          available: false },
  { n: 12, title: "Projeto final",                description: "Da ideia ao protocolo experimental exportável em PDF/DOCX",                 available: false },
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
    a: "Não. O programa começa do zero (Módulo 1: Introdução) e avança até projeto final. Alunos iniciantes e pesquisadores experientes acompanham no seu ritmo — o acesso é de 12 meses.",
  },
  {
    q: "As aulas são ao vivo ou gravadas?",
    a: "As 12 aulas dos módulos são **gravadas** (você assiste no seu ritmo dentro dos 12 meses). Existem 3 encontros online ao vivo com a equipe científica Quantis ao longo do programa — datas divulgadas na plataforma.",
  },
  {
    q: "Como funciona a integração com a plataforma BIA?",
    a: "Dentro de cada aula, você tem um botão que abre a ferramenta correspondente da BIA (Formulador Pro, Bioimpressão, Organoid Builder, etc). O que você criar lá fica salvo no seu Notebook com versionamento automático — completamente rastreável.",
  },
  {
    q: "Existem práticas presenciais?",
    a: "Práticas presenciais são oferecidas apenas para cursos corporativos, institucionais ou grupos fechados. Para o curso online individual, não há prática presencial — mas você pode aplicar tudo na plataforma BIA.",
  },
  {
    q: "Recebo certificado?",
    a: "Sim. Ao concluir os 12 módulos + entregar o Projeto Final (protocolo próprio criado ao longo do curso), você recebe o certificado da BIA Academy com código de verificação único.",
  },
  {
    q: "O que acontece depois dos 12 meses?",
    a: "Você continua tendo acesso ao Notebook com todos os seus protocolos e formulações (permanente). O acesso a novas atualizações do Academy e à BIA precisa ser renovado — entre em contato com o time comercial.",
  },
  {
    q: "Quais são as formas de pagamento?",
    a: "R$ 2.375,00 à vista via Pix ou boleto, OU até 12x de R$ 197,92 no cartão de crédito (sem juros). Pagamento processado com segurança pela Asaas. A liberação do acesso à plataforma acontece em até 24 horas úteis após confirmação.",
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

          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              onClick={() => trackEvent("cta_login_clicked")}
              className="hidden sm:block text-sm text-gray-300 hover:text-white transition-colors px-3 py-2"
              data-testid="academy-cta-login"
            >
              Já sou aluno
            </Link>
            <a
              href={ASAAS_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("cta_asaas_clicked", { location: "nav" })}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-semibold px-4 py-2 shadow-lg shadow-violet-500/20"
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
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 mb-6 text-xs text-violet-200">
            <Sparkles className="w-3.5 h-3.5" />
            Formação profissional em biofabricação
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            A única formação em biofabricação onde a{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              ferramenta abre junto com a aula
            </span>
            .
          </h1>

          <p className="text-base sm:text-xl text-gray-300 max-w-2xl mx-auto mb-3 leading-relaxed">
            Aprenda biofabricação e bioimpressão 3D com uma plataforma de IA científica integrada.
            Cada aula tem 1 clique para aplicar o conteúdo direto na BIA.
          </p>

          <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto mb-10">
            <strong className="text-white">12 módulos</strong> · <strong className="text-white">12 meses de acesso</strong> ·
            {" "}<strong className="text-white">3 encontros ao vivo</strong> · certificado.
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
              Inscreva-se no curso online
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
              Curso corporativo
            </a>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Pagamento único via Asaas. Grupos fechados / in-company via time comercial.
          </p>
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
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">O programa oficial</h2>
            <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto">
              Um único programa. Sem letras miúdas. Verbatim do que a Quantis entrega.
            </p>
          </div>

          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6 sm:p-8">
            <ul className="space-y-3">
              {[
                "12 módulos de conteúdo (aulas gravadas, liberação progressiva)",
                "12 meses de acesso completo à plataforma e atualizações",
                "3 encontros online ao vivo com a equipe científica Quantis",
                "Acesso à BIA (Biofabrication Intelligent Assistant) durante os 12 meses",
                "Meu Projeto de Biofabricação — protocolo experimental próprio, exportável em PDF/DOCX",
                "Certificado ao completar os 12 módulos + projeto final",
                "Práticas presenciais disponíveis apenas para cursos corporativos, institucionais ou grupos fechados",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm sm:text-base text-gray-200">
                  <CheckCircle2 className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
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
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">12 módulos · 1 jornada</h2>
            <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto">
              Módulo 1 já disponível — demais módulos liberados progressivamente durante os 12 meses.
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
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0" />12 módulos + 12 meses de acesso</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0" />3 encontros online ao vivo</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0" />Acesso completo à plataforma BIA</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0" />Notebook eletrônico com versionamento</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0" />Certificado ao final</li>
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
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-sm sm:text-base text-gray-400 mb-6">
            Inscreva-se hoje e comece pelo Módulo 1 · Introdução à Biofabricação — já disponível.
          </p>
          <a
            href={ASAAS_LINK}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("cta_asaas_clicked", { location: "footer_cta" })}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-base font-semibold px-8 py-4 shadow-xl shadow-violet-500/25"
            data-testid="academy-cta-asaas-footer"
          >
            Inscreva-se no curso online
            <ExternalLink className="w-4 h-4" />
          </a>
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
