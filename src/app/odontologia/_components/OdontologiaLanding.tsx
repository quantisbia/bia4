/**
 * BIA · Landing · Biofabricação e Bioimpressão 3D aplicadas à Odontologia — R31.1
 *
 * Componente compartilhado por /odontologia (PT) e /odontologia/en (EN).
 * Toda a copy vem de ./copy.ts; fotos são registros REAIS das turmas Quantis.
 *
 * R31.1: preço exibido apenas por profissional (R$ 4.287,50) com link Asaas;
 * seção "Kit didático" com o Guia Prático em mockup espiral; alternância PT/EN.
 */
import Link from "next/link"
import {
  ArrowRight, CheckCircle2, Clock3, MapPin, Users, Sparkles, Download,
  FlaskConical, Bone, Layers3, Printer, Cpu, Stethoscope, GraduationCap,
  MessageCircle, Building2, Globe2, ShieldCheck, Languages, BookOpen,
} from "lucide-react"
import {
  ASAAS_LINK, PROPOSTA_PDF, GUIDE_MOCKUP, PRICE_PER_PRO, PHONE_DISPLAY,
  COUNTRIES, INSTITUTIONS, PHOTO_ALTS, COPY, type Lang,
} from "./copy"

const PHOTO_FILES = [
  { src: "/odontologia/01-turma-bioimpressora.jpg", w: 1600, h: 900 },
  { src: "/odontologia/02-scaffold-osseo.jpg", w: 768, h: 1024 },
  { src: "/odontologia/03-construto-bioimpresso.jpg", w: 900, h: 1600 },
  { src: "/odontologia/04-bioimpressora-operacao.jpg", w: 900, h: 1600 },
  { src: "/odontologia/05-pratica-bancada.jpg", w: 768, h: 1024 },
  { src: "/odontologia/06-esferoides-analise.jpg", w: 900, h: 1600 },
  { src: "/odontologia/07-profissional-pipetando.jpg", w: 900, h: 1600 },
  { src: "/odontologia/08-instrutora-laboratorio.jpg", w: 768, h: 1024 },
  { src: "/odontologia/09-aula-pratica-turma.jpg", w: 768, h: 1024 },
  { src: "/odontologia/10-foto-turma.jpg", w: 1600, h: 900 },
]

const TOPIC_ICONS = [Printer, Bone, Layers3, Cpu, Stethoscope, FlaskConical]
const STAT_ICONS = [Users, Clock3, MapPin]
const CLOSING_ICONS = [ShieldCheck, Cpu, Users, MapPin]

type PhotoT = { src: string; alt: string; w: number; h: number }

function Photo({ p, className = "", priority = false }: { p: PhotoT; className?: string; priority?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={p.src}
      alt={p.alt}
      width={p.w}
      height={p.h}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`w-full h-full object-cover ${className}`}
    />
  )
}

export default function OdontologiaLanding({ lang }: { lang: Lang }) {
  const c = COPY[lang]
  const photos: PhotoT[] = PHOTO_FILES.map((f, i) => ({ ...f, alt: PHOTO_ALTS[lang][i] }))
  const [hero, scaffold, construto, bioimpressora, bancada, esferoides, pipeta, instrutora, turmaPratica, turmaFoto] = photos
  const whatsapp = "https://wa.me/11968632231?text=" + encodeURIComponent(c.whatsappMsg)
  const mailto = "mailto:suporte@quantis.bio?subject=" + encodeURIComponent(c.mailSubject)

  const ctaPrimary = "inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-fuchsia-900/30 transition-all"
  const ctaWhats = "inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold border border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-100 transition-all"
  const ctaGhost = "inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold border border-white/15 bg-white/[0.03] hover:bg-white/[0.07] transition-all"

  return (
    <div className="min-h-screen bg-[#0a0514] text-white" data-testid="odonto-landing" data-lang={lang} lang={c.htmlLang}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0514]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-lg font-bold tracking-tight leading-tight block truncate">Quantis <span className="text-violet-300">Biotechnology</span></span>
              <span className="hidden sm:block text-[9px] text-violet-300/70 tracking-widest uppercase leading-tight">{c.navTagline}</span>
            </div>
          </Link>
          <div className="hidden lg:flex items-center gap-6 text-sm text-gray-400">
            <a href="#conteudo" className="hover:text-white transition-colors">{c.nav.content}</a>
            <a href="#formato" className="hover:text-white transition-colors">{c.nav.format}</a>
            <a href="#kit" className="hover:text-white transition-colors">{c.nav.kit}</a>
            <a href="#galeria" className="hover:text-white transition-colors">{c.nav.gallery}</a>
            <a href="#investimento" className="hover:text-white transition-colors">{c.nav.pricing}</a>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={c.langToggleHref}
              hrefLang={lang === "pt" ? "en" : "pt-BR"}
              aria-label={c.langToggleLabel}
              title={c.langToggleLabel}
              data-testid="odonto-lang-toggle"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] transition-all"
            >
              <Languages className="w-4 h-4 text-violet-300" /> {c.langToggleShort}
            </Link>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all">
              <MessageCircle className="w-4 h-4" /> <span className="hidden sm:inline">{c.navCta}</span><span className="sm:hidden">{c.navCtaShort}</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="pt-24 sm:pt-28 pb-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.05fr_1fr] gap-8 lg:gap-12 items-center">
          <div>
            <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-[11px] font-bold uppercase tracking-widest text-violet-200 mb-5">
              <Sparkles className="w-3.5 h-3.5" /> {c.heroBadge}
            </p>
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-[1.1] tracking-tight">
              {c.heroTitle1} <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">{c.heroTitle2}</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-gray-300 leading-relaxed max-w-xl">
              {c.heroLead1}<strong className="text-white">{c.heroLeadStrong}</strong>{c.heroLead2}
            </p>
            <ul className="mt-6 grid sm:grid-cols-2 gap-2.5 text-sm text-gray-200">
              {c.heroBullets.map(t => (
                <li key={t} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />{t}</li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3">
              <a href={ASAAS_LINK} target="_blank" rel="noopener noreferrer" data-testid="odonto-cta-asaas" className={ctaPrimary}>
                <GraduationCap className="w-5 h-5" /> {c.ctaAsaas} <ArrowRight className="w-4 h-4" />
              </a>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" data-testid="odonto-cta-whatsapp" className={ctaWhats}>
                <MessageCircle className="w-5 h-5" /> {c.ctaWhatsGroup}
              </a>
              <a href={PROPOSTA_PDF} target="_blank" rel="noopener noreferrer" data-testid="odonto-cta-pdf" className={ctaGhost}>
                <Download className="w-5 h-5" /> {c.ctaPdf}
              </a>
            </div>
            <p className="mt-3 text-xs text-gray-500">{c.heroNote}</p>
            <p className="mt-4 text-xs text-gray-500">{c.heroDates}</p>
          </div>

          <div className="grid grid-cols-3 grid-rows-2 gap-2.5 h-[420px] sm:h-[520px]">
            <div className="col-span-2 row-span-2 rounded-2xl overflow-hidden border border-white/10"><Photo p={hero} priority /></div>
            <div className="rounded-2xl overflow-hidden border border-white/10"><Photo p={scaffold} priority /></div>
            <div className="rounded-2xl overflow-hidden border border-white/10"><Photo p={construto} priority /></div>
          </div>
        </div>
      </header>

      {/* Prova social */}
      <section className="px-4 sm:px-6 py-10 border-y border-white/5 bg-white/[0.015]" data-testid="odonto-social-proof">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-6 items-start">
            <div>
              <p className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">{c.proofN}</p>
              <p className="mt-1 text-sm text-gray-300">{c.proofNDesc}</p>
            </div>
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-white"><Globe2 className="w-4 h-4 text-violet-300" /> {c.proofCountries}</p>
              <p className="mt-1 text-sm text-gray-300">{COUNTRIES[lang].join(" · ")}</p>
            </div>
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-white"><Building2 className="w-4 h-4 text-violet-300" /> {c.proofInst}</p>
              <p className="mt-1 text-sm text-gray-300">{c.proofInstDesc}</p>
            </div>
          </div>
          <ul className="mt-7 flex flex-wrap gap-2" aria-label={c.proofInstAria}>
            {INSTITUTIONS.map(n => (
              <li key={n} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-xs sm:text-sm text-gray-200">{n}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Conteúdo */}
      <section id="conteudo" className="px-4 sm:px-6 py-16 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-300 mb-2">{c.contentKicker}</p>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{c.contentTitle}</h2>
          <p className="mt-3 text-gray-300 max-w-2xl">{c.contentLead}</p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {c.topics.map(({ t, d }, i) => {
              const Icon = TOPIC_ICONS[i]
              return (
                <article key={t} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-violet-500/40 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center mb-3"><Icon className="w-5 h-5 text-violet-200" /></div>
                  <h3 className="font-bold text-white leading-snug">{t}</h3>
                  <p className="mt-1.5 text-sm text-gray-400 leading-relaxed">{d}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* Formato + fotos */}
      <section id="formato" className="px-4 sm:px-6 py-16 bg-white/[0.015] border-y border-white/5 scroll-mt-20">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-violet-300 mb-2">{c.formatKicker}</p>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{c.formatTitle}</h2>
            <ol className="mt-7 space-y-5">
              {c.steps.map((s, i) => (
                <li key={s.t} className="flex gap-4">
                  <span className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center font-bold">{i + 1}</span>
                  <div><h3 className="font-bold text-white">{s.t}</h3><p className="text-sm text-gray-400 mt-1 leading-relaxed">{s.d}</p></div>
                </li>
              ))}
            </ol>
            <div className="mt-7 grid grid-cols-3 gap-3 text-center">
              {c.stats.map(({ v, l }, i) => {
                const I = STAT_ICONS[i]
                return (
                  <div key={l} className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><I className="w-4 h-4 mx-auto text-violet-300" /><p className="mt-1 font-extrabold text-lg">{v}</p><p className="text-[11px] text-gray-400">{l}</p></div>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl overflow-hidden border border-white/10 aspect-[3/4]"><Photo p={bioimpressora} /></div>
            <div className="rounded-2xl overflow-hidden border border-white/10 aspect-[3/4] mt-8"><Photo p={bancada} /></div>
          </div>
        </div>
      </section>

      {/* Kit didático · Guia Prático (mockup espiral) */}
      <section id="kit" className="px-4 sm:px-6 py-16 scroll-mt-20" data-testid="odonto-kit">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-14 items-center">
          <figure className="relative mx-auto w-full max-w-[380px] sm:max-w-[440px]">
            <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-violet-600/25 via-fuchsia-600/10 to-transparent blur-2xl" aria-hidden="true" />
            <picture className="relative block">
              <source srcSet={GUIDE_MOCKUP.webp} type="image/webp" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={GUIDE_MOCKUP.png}
                alt={c.kitImgAlt}
                width={GUIDE_MOCKUP.w}
                height={GUIDE_MOCKUP.h}
                loading="lazy"
                decoding="async"
                className="relative w-full h-auto drop-shadow-[0_30px_40px_rgba(0,0,0,0.6)]"
                data-testid="odonto-guide-mockup"
              />
            </picture>
            <figcaption className="relative mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-[11px] font-bold uppercase tracking-widest text-violet-200">
              <BookOpen className="w-3.5 h-3.5" /> {c.kitBadge}
            </figcaption>
          </figure>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-violet-300 mb-2">{c.kitKicker}</p>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{c.kitTitle}</h2>
            <p className="mt-2 text-lg sm:text-xl font-semibold bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">{c.kitSubtitle}</p>
            <p className="mt-4 text-gray-300 leading-relaxed">{c.kitLead}</p>
            <ul className="mt-6 space-y-2.5 text-sm text-gray-200">
              {c.kitBullets.map(t => (
                <li key={t} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />{t}</li>
              ))}
            </ul>
            <div className="mt-7 flex flex-col sm:flex-row flex-wrap gap-3">
              <a href={ASAAS_LINK} target="_blank" rel="noopener noreferrer" className={ctaPrimary}>
                <GraduationCap className="w-5 h-5" /> {c.ctaAsaas} <ArrowRight className="w-4 h-4" />
              </a>
              <a href="#investimento" className={ctaGhost}>{c.nav.pricing} <ArrowRight className="w-4 h-4" /></a>
            </div>
          </div>
        </div>
      </section>

      {/* Galeria */}
      <section id="galeria" className="px-4 sm:px-6 py-16 bg-white/[0.015] border-y border-white/5 scroll-mt-20" data-testid="odonto-gallery">
        <div className="max-w-7xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-300 mb-2">{c.galleryKicker}</p>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{c.galleryTitle}</h2>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl overflow-hidden border border-white/10 aspect-[3/4]"><Photo p={esferoides} /></div>
            <div className="rounded-2xl overflow-hidden border border-white/10 aspect-[3/4]"><Photo p={pipeta} /></div>
            <div className="rounded-2xl overflow-hidden border border-white/10 aspect-[3/4]"><Photo p={instrutora} /></div>
            <div className="rounded-2xl overflow-hidden border border-white/10 aspect-[3/4]"><Photo p={turmaPratica} /></div>
            <div className="col-span-2 md:col-span-4 rounded-2xl overflow-hidden border border-white/10 aspect-[16/7]"><Photo p={turmaFoto} /></div>
          </div>
        </div>
      </section>

      {/* Investimento */}
      <section id="investimento" className="px-4 sm:px-6 py-16 scroll-mt-20" data-testid="odonto-pricing">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-[1fr_1.1fr] gap-8 items-stretch">
          <div className="rounded-3xl border border-violet-500/30 bg-gradient-to-b from-violet-500/[0.10] to-transparent p-7 sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-widest text-violet-300">{c.pricingKicker}</p>
            <p className="mt-4 text-4xl sm:text-5xl font-extrabold" data-testid="odonto-price">{c.priceFmt(PRICE_PER_PRO)}</p>
            <p className="mt-1 text-sm text-gray-300">{c.pricePer}</p>
            <p className="mt-4 text-gray-200">{c.priceNote1}</p>
            <p className="mt-2 text-sm text-gray-400">{c.priceNote2}</p>
            <ul className="mt-6 space-y-2 text-sm text-gray-200">
              {c.priceBullets.map(t => (
                <li key={t} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />{t}</li>
              ))}
            </ul>
            <a href={ASAAS_LINK} target="_blank" rel="noopener noreferrer" data-testid="odonto-pricing-asaas" className={`${ctaPrimary} mt-7 w-full`}>
              <GraduationCap className="w-5 h-5" /> {c.pricingAsaas} <ArrowRight className="w-4 h-4" />
            </a>
            <p className="mt-2 text-center text-[11px] text-gray-500">{c.pricingAsaasHint}</p>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={`${ctaWhats} mt-3 w-full !py-3 text-sm`}>
              <MessageCircle className="w-4 h-4" /> {c.pricingWhats}
            </a>
            <a href={mailto} className="mt-3 w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border border-white/15 hover:bg-white/[0.05] transition-all">{c.pricingMail}</a>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-7 sm:p-8 flex flex-col">
            <p className="text-[11px] font-bold uppercase tracking-widest text-violet-300">{c.closingKicker}</p>
            <h2 className="mt-3 text-2xl font-extrabold">{c.closingTitle}</h2>
            <p className="mt-3 text-gray-300 leading-relaxed">{c.closingLead}</p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              {c.closingCards.map(({ t, d }, i) => {
                const I = CLOSING_ICONS[i]
                return (
                  <div key={t} className="rounded-xl border border-white/10 p-3.5"><I className="w-4 h-4 text-violet-300" /><p className="mt-1.5 font-bold text-white">{t}</p><p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{d}</p></div>
                )
              })}
            </div>
            <div className="mt-auto pt-6 flex flex-wrap gap-3">
              <a href={PROPOSTA_PDF} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-200 hover:text-white"><Download className="w-4 h-4" /> {c.closingPdf}</a>
              <Link href="/academy" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-200 hover:text-white"><GraduationCap className="w-4 h-4" /> {c.closingAcademy}</Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-4 sm:px-6 py-16 bg-white/[0.015] border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{c.finalTitle}</h2>
          <p className="mt-3 text-gray-300">{c.finalLead}</p>
          <div className="mt-7 flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
            <a href={ASAAS_LINK} target="_blank" rel="noopener noreferrer" className={`${ctaPrimary} px-7`}><GraduationCap className="w-5 h-5" /> {c.finalAsaas}</a>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={`${ctaWhats} px-7`}><MessageCircle className="w-5 h-5" /> {c.finalWhats}</a>
            <a href={mailto} className={`${ctaGhost} px-7`}>suporte@quantis.bio</a>
          </div>
          <p className="mt-5 text-xs text-gray-500">
            <Link href={c.langToggleHref} className="inline-flex items-center gap-1.5 hover:text-white"><Languages className="w-3.5 h-3.5" /> {c.langToggleLabel}</Link>
          </p>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div>© 2026 Quantis Biotechnology · CNPJ 38.213.361/0001-99 · {c.footerAddr} · <a href="https://www.quantis.bio" className="hover:text-white">quantis.bio</a> · {PHONE_DISPLAY}</div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-white">{c.footerPrivacy}</Link>
            <Link href="/terms" className="hover:text-white">{c.footerTerms}</Link>
            <Link href="/" className="hover:text-white">{c.footerBia}</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
