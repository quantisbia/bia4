/**
 * BIA · Landing · Biofabricação e Bioimpressão 3D aplicadas à Odontologia — R31
 *
 * Página comercial direta para a proposta institucional (grupo de 5–8
 * profissionais): 1 aula online prévia + 2 práticas presenciais no laboratório
 * da Quantis (dentro da Bayer, São Paulo) + kit didático + 6 meses de BIA.
 *
 * Fotos: 10 registros REAIS de turmas e do laboratório Quantis
 * (public/odontologia/*.jpg) — nenhuma imagem gerada.
 *
 * Fonte dos dados: docs/Quantis — Proposta institucional em biofabricação
 * aplicada à odontologia (PDF em public/odontologia/).
 */
import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight, CheckCircle2, Clock3, MapPin, Users, Sparkles, Download,
  FlaskConical, Bone, Layers3, Printer, Cpu, Stethoscope, GraduationCap,
  MessageCircle, Building2, Globe2, ShieldCheck,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Biofabricação e Bioimpressão 3D aplicadas à Odontologia | Quantis",
  description:
    "Capacitação prática em biofabricação para odontologia regenerativa: regeneração óssea, scaffolds, biomateriais, planejamento digital e bioimpressão 3D. Grupo de 5 a 8 profissionais, práticas no laboratório Quantis (SP), kit didático e 6 meses de BIA.",
  openGraph: {
    type: "website",
    title: "Biofabricação e Bioimpressão 3D aplicadas à Odontologia",
    description: "Do desafio clínico ao projeto de biofabricação. Turma fechada de 5 a 8 profissionais · práticas presenciais · kit didático · plataforma BIA.",
    images: [{ url: "/odontologia/og.jpg", width: 1200, height: 630 }],
    locale: "pt_BR",
  },
  alternates: { canonical: "https://biaquantis.bio/odontologia" },
}

const WHATSAPP = "https://wa.me/11968632231?text=" + encodeURIComponent("Olá! Tenho interesse no curso de Biofabricação e Bioimpressão 3D aplicadas à Odontologia (grupo de 5 a 8 profissionais).")
const MAILTO = "mailto:suporte@quantis.bio?subject=" + encodeURIComponent("Interesse — Biofabricação aplicada à Odontologia (turma fechada)")
const PROPOSTA_PDF = "/odontologia/proposta-quantis-biofabricacao-odontologia.pdf"

const PRICE_GROUP = 34300
const PRICE_PER_PRO = 4287.5
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 })

const PHOTOS = [
  { src: "/odontologia/01-turma-bioimpressora.jpg", alt: "Turma de profissionais acompanhando a bioimpressora em operação no laboratório Quantis", w: 1600, h: 900 },
  { src: "/odontologia/02-scaffold-osseo.jpg", alt: "Scaffold ósseo impresso em 3D com arquitetura porosa, na palma da mão", w: 768, h: 1024 },
  { src: "/odontologia/03-construto-bioimpresso.jpg", alt: "Construto bioimpresso em placa de Petri logo após a deposição da biotinta", w: 900, h: 1600 },
  { src: "/odontologia/04-bioimpressora-operacao.jpg", alt: "Cabeçote da bioimpressora depositando biotinta sobre a mesa de impressão", w: 900, h: 1600 },
  { src: "/odontologia/05-pratica-bancada.jpg", alt: "Participantes preparando biotinta na bancada durante a prática", w: 768, h: 1024 },
  { src: "/odontologia/06-esferoides-analise.jpg", alt: "Profissionais analisando amostras na aula de esferoides celulares", w: 900, h: 1600 },
  { src: "/odontologia/07-profissional-pipetando.jpg", alt: "Profissional pipetando biomaterial durante a prática de biofabricação", w: 900, h: 1600 },
  { src: "/odontologia/08-instrutora-laboratorio.jpg", alt: "Instrutora preparando hidrogel no laboratório", w: 768, h: 1024 },
  { src: "/odontologia/09-aula-pratica-turma.jpg", alt: "Turma em aula prática de preparo de biotintas", w: 768, h: 1024 },
  { src: "/odontologia/10-foto-turma.jpg", alt: "Foto oficial de uma turma formada pela Quantis", w: 1600, h: 900 },
]

const TOPICS = [
  { icon: Printer, t: "Impressão 3D e bioimpressão aplicadas à odontologia", d: "Técnicas, equipamentos e quando cada uma faz sentido na clínica e na pesquisa." },
  { icon: Bone, t: "Regeneração óssea alveolar e defeitos periodontais", d: "Do defeito ao desenho do enxerto: critérios biológicos e mecânicos." },
  { icon: Layers3, t: "Scaffolds, biomateriais, hidrogéis e PCL", d: "Seleção, preparo e caracterização dos materiais usados nas práticas." },
  { icon: Cpu, t: "Planejamento digital, modelagem e parâmetros de fabricação", d: "STL, fatiamento, G-code e parâmetros que preservam a viabilidade." },
  { icon: Stethoscope, t: "Implantodontia, periodontia e cirurgia bucomaxilofacial", d: "Aplicações reais e o que a literatura recente já sustenta." },
  { icon: FlaskConical, t: "Raciocínio translacional", d: "Do desafio clínico ao projeto de biofabricação — método para levar adiante." },
]

const INSTITUTIONS = [
  "Fiocruz", "Instituto Butantan", "USP", "Unicamp", "Unesp", "UFABC", "CTI Renato Archer",
  "UFRJ", "UERJ", "UFF", "Einstein", "UFSC", "UTFPR", "UFMG", "UFPE", "UFPA", "UFMA",
  "PUC", "Insper", "Mackenzie", "Unifeso", "Univap", "Universidade Tiradentes", "Unaerp",
]

const COUNTRIES = ["Brasil", "Peru", "Colômbia", "Inglaterra", "Portugal"]

function Photo({ p, className = "", priority = false }: { p: (typeof PHOTOS)[number]; className?: string; priority?: boolean }) {
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

export default function OdontologiaLandingPage() {
  const [hero, scaffold, construto, bioimpressora, bancada, esferoides, pipeta, instrutora, turmaPratica, turmaFoto] = PHOTOS

  return (
    <div className="min-h-screen bg-[#0a0514] text-white" data-testid="odonto-landing">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0514]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight leading-tight block">Quantis <span className="text-violet-300">Biotechnology</span></span>
              <span className="hidden sm:block text-[9px] text-violet-300/70 tracking-widest uppercase leading-tight">Biofabricação · Odontologia regenerativa</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-7 text-sm text-gray-400">
            <a href="#conteudo" className="hover:text-white transition-colors">Conteúdo</a>
            <a href="#formato" className="hover:text-white transition-colors">Formato</a>
            <a href="#galeria" className="hover:text-white transition-colors">Laboratório</a>
            <a href="#investimento" className="hover:text-white transition-colors">Investimento</a>
          </div>
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all">
            <MessageCircle className="w-4 h-4" /> <span className="hidden sm:inline">Falar com a Quantis</span><span className="sm:hidden">WhatsApp</span>
          </a>
        </div>
      </nav>

      {/* Hero */}
      <header className="pt-24 sm:pt-28 pb-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.05fr_1fr] gap-8 lg:gap-12 items-center">
          <div>
            <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-[11px] font-bold uppercase tracking-widest text-violet-200 mb-5">
              <Sparkles className="w-3.5 h-3.5" /> Proposta institucional · turma fechada
            </p>
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-[1.1] tracking-tight">
              Biofabricação e Bioimpressão 3D <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">aplicadas à Odontologia</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-gray-300 leading-relaxed max-w-xl">
              Regeneração óssea, biomateriais, scaffolds e planejamento digital — com a mão na bioimpressora, no laboratório da Quantis. Formação técnica e desenvolvimento translacional para grupos de <strong className="text-white">5 a 8 profissionais</strong>.
            </p>
            <ul className="mt-6 grid sm:grid-cols-2 gap-2.5 text-sm text-gray-200">
              {[
                "1 aula online prévia + 2 práticas presenciais sequenciais",
                "Kit didático: guia prático, scaffolds, biomateriais, seringas e modelos",
                "6 meses de acesso gratuito à BIA (IA para STL, G-code e protocolos)",
                "Aprofundamento online pela Quantis",
              ].map(t => (
                <li key={t} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />{t}</li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" data-testid="odonto-cta-whatsapp" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-fuchsia-900/30 transition-all">
                <MessageCircle className="w-5 h-5" /> Quero montar minha turma <ArrowRight className="w-4 h-4" />
              </a>
              <a href={PROPOSTA_PDF} target="_blank" rel="noopener noreferrer" data-testid="odonto-cta-pdf" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold border border-white/15 bg-white/[0.03] hover:bg-white/[0.07] transition-all">
                <Download className="w-5 h-5" /> Baixar a proposta (PDF)
              </a>
            </div>
            <p className="mt-4 text-xs text-gray-500">Datas em aberto — a agenda é definida junto com o grupo. Práticas em São Paulo/SP.</p>
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
              <p className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">+4.000</p>
              <p className="mt-1 text-sm text-gray-300">profissionais capacitados em nossos cursos de biofabricação e bioimpressão 3D</p>
            </div>
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-white"><Globe2 className="w-4 h-4 text-violet-300" /> 5 países</p>
              <p className="mt-1 text-sm text-gray-300">{COUNTRIES.join(" · ")}</p>
            </div>
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-white"><Building2 className="w-4 h-4 text-violet-300" /> Instituições que já formaram equipes conosco</p>
              <p className="mt-1 text-sm text-gray-300">Universidades, institutos de pesquisa, hospitais e empresas.</p>
            </div>
          </div>
          <ul className="mt-7 flex flex-wrap gap-2" aria-label="Instituições">
            {INSTITUTIONS.map(n => (
              <li key={n} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-xs sm:text-sm text-gray-200">{n}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Conteúdo */}
      <section id="conteudo" className="px-4 sm:px-6 py-16 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-300 mb-2">Conteúdo central</p>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">Do desafio clínico ao projeto de biofabricação</h2>
          <p className="mt-3 text-gray-300 max-w-2xl">Seis eixos que conectam odontologia regenerativa, biomateriais e bioimpressão 3D — com leitura translacional da literatura e prática guiada.</p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOPICS.map(({ icon: Icon, t, d }) => (
              <article key={t} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-violet-500/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center mb-3"><Icon className="w-5 h-5 text-violet-200" /></div>
                <h3 className="font-bold text-white leading-snug">{t}</h3>
                <p className="mt-1.5 text-sm text-gray-400 leading-relaxed">{d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Formato + fotos */}
      <section id="formato" className="px-4 sm:px-6 py-16 bg-white/[0.015] border-y border-white/5 scroll-mt-20">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-violet-300 mb-2">Formato da jornada</p>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">Prático, sequencial e no seu ritmo de grupo</h2>
            <ol className="mt-7 space-y-5">
              {[
                { n: "1", t: "Aula online prévia", d: "Período noturno ou sábado, alinhada com o grupo. Nivelamento conceitual e preparação para a bancada." },
                { n: "2", t: "Duas práticas presenciais sequenciais", d: "Laboratório da Quantis, dentro da Bayer — Rua Domingos Jorge, 1100, São Paulo/SP. Biomateriais, scaffolds, modelagem e bioimpressão 3D." },
                { n: "3", t: "Aprofundamento online", d: "Continuidade pela plataforma online da Quantis + 6 meses de BIA para gerar STL, G-code e protocolos conforme seu objetivo." },
              ].map(s => (
                <li key={s.n} className="flex gap-4">
                  <span className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center font-bold">{s.n}</span>
                  <div><h3 className="font-bold text-white">{s.t}</h3><p className="text-sm text-gray-400 mt-1 leading-relaxed">{s.d}</p></div>
                </li>
              ))}
            </ol>
            <div className="mt-7 grid grid-cols-3 gap-3 text-center">
              {[{ i: Users, v: "5–8", l: "profissionais" }, { i: Clock3, v: "1 + 2", l: "online + práticas" }, { i: MapPin, v: "SP", l: "lab Quantis · Bayer" }].map(({ i: I, v, l }) => (
                <div key={l} className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><I className="w-4 h-4 mx-auto text-violet-300" /><p className="mt-1 font-extrabold text-lg">{v}</p><p className="text-[11px] text-gray-400">{l}</p></div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl overflow-hidden border border-white/10 aspect-[3/4]"><Photo p={bioimpressora} /></div>
            <div className="rounded-2xl overflow-hidden border border-white/10 aspect-[3/4] mt-8"><Photo p={bancada} /></div>
          </div>
        </div>
      </section>

      {/* Galeria */}
      <section id="galeria" className="px-4 sm:px-6 py-16 scroll-mt-20" data-testid="odonto-gallery">
        <div className="max-w-7xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-300 mb-2">Nosso laboratório, nossas turmas</p>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">Registros reais das práticas</h2>
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
      <section id="investimento" className="px-4 sm:px-6 py-16 bg-white/[0.015] border-y border-white/5 scroll-mt-20" data-testid="odonto-pricing">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-[1fr_1.1fr] gap-8 items-stretch">
          <div className="rounded-3xl border border-violet-500/30 bg-gradient-to-b from-violet-500/[0.10] to-transparent p-7 sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-widest text-violet-300">Condição comercial · pagamento à vista</p>
            <p className="mt-4 text-4xl sm:text-5xl font-extrabold">{brl(PRICE_GROUP)}</p>
            <p className="mt-1 text-sm text-gray-300">por grupo de 5 a 8 profissionais</p>
            <p className="mt-4 text-gray-200"><strong className="text-white">{brl(PRICE_PER_PRO)}</strong> por profissional na composição máxima (8 participantes).</p>
            <p className="mt-2 text-sm text-gray-400">Também pode ser parcelado, com acréscimo de taxas.</p>
            <ul className="mt-6 space-y-2 text-sm text-gray-200">
              {["Kit didático completo para as práticas", "6 meses de acesso gratuito à plataforma BIA", "Aula online prévia + 2 práticas presenciais", "Aprofundamento online pela Quantis"].map(t => (
                <li key={t} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />{t}</li>
              ))}
            </ul>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="mt-7 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all">
              <MessageCircle className="w-5 h-5" /> Reservar datas para o meu grupo
            </a>
            <a href={MAILTO} className="mt-3 w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border border-white/15 hover:bg-white/[0.05] transition-all">Prefiro falar por e-mail · suporte@quantis.bio</a>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-7 sm:p-8 flex flex-col">
            <p className="text-[11px] font-bold uppercase tracking-widest text-violet-300">Fechamento institucional</p>
            <h2 className="mt-3 text-2xl font-extrabold">Formação técnica com visão de futuro</h2>
            <p className="mt-3 text-gray-300 leading-relaxed">Esta proposta foi desenhada para apoiar formação técnica, aplicação clínica, experimentação responsável e futuras agendas de inovação em odontologia regenerativa — conectando capacitação, prática aplicada e desenvolvimento translacional.</p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              {[
                { i: ShieldCheck, t: "Equipe científica Quantis", d: "Pesquisadores com publicações e protocolos próprios (QMatrix®, QMicroNiche®)." },
                { i: Cpu, t: "BIA incluída", d: "IA especializada em biofabricação: formulação, fatiamento, G-code e protocolos." },
                { i: Users, t: "Turma fechada", d: "Agenda, nível e exemplos ajustados ao grupo." },
                { i: MapPin, t: "Laboratório real", d: "Bioimpressoras, biomateriais e cultivo 3D na bancada." },
              ].map(({ i: I, t, d }) => (
                <div key={t} className="rounded-xl border border-white/10 p-3.5"><I className="w-4 h-4 text-violet-300" /><p className="mt-1.5 font-bold text-white">{t}</p><p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{d}</p></div>
              ))}
            </div>
            <div className="mt-auto pt-6 flex flex-wrap gap-3">
              <a href={PROPOSTA_PDF} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-200 hover:text-white"><Download className="w-4 h-4" /> Proposta completa em PDF</a>
              <Link href="/academy" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-200 hover:text-white"><GraduationCap className="w-4 h-4" /> Conheça também a BIA Academy Online</Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-4 sm:px-6 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">Monte sua turma e traga a biofabricação para a sua prática</h2>
          <p className="mt-3 text-gray-300">Responda em poucas linhas: tamanho do grupo, cidade e disponibilidade. Nós organizamos a agenda com você.</p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all"><MessageCircle className="w-5 h-5" /> WhatsApp (11) 96863-2231</a>
            <a href={MAILTO} className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold border border-white/15 hover:bg-white/[0.05] transition-all">suporte@quantis.bio</a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div>© 2026 Quantis Biotechnology · CNPJ 38.213.361/0001-99 · Rua Domingos Jorge, 1100, São Paulo/SP (dentro da Bayer) · <a href="https://www.quantis.bio" className="hover:text-white">quantis.bio</a></div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-white">Privacidade</Link>
            <Link href="/terms" className="hover:text-white">Termos</Link>
            <Link href="/" className="hover:text-white">BIA (plataforma)</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
