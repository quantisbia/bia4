/**
 * BIA · Academy · R13.14 · Biblioteca educacional
 *
 * Rota: /academy/library  (área logada)
 *
 * Agrega 3 tipos de conteúdo para o aluno estudar fora da aula:
 *   1. Materiais das aulas  — AcademyAttachments de todas as aulas publicadas
 *   2. Papers & Patentes    — 65 itens do Knowledge Engine curado (R12)
 *   3. White Papers Quantis — PDFs institucionais open-access (QMatrix etc.)
 *
 * Design: mesma linguagem do RichLessonContent (R13.13) — cards com ícones
 * coloridos por tipo, contraste WCAG AA, sem placeholder.
 *
 * Filtros: por tipo + busca por título/autor/DOI.
 */
import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { hasAccess } from "@/lib/academy/enrollment"
import { KNOWLEDGE_ARTICLES, KNOWLEDGE_PATENTS, KNOWLEDGE_METHODS as KNOWLEDGE_METHODOLOGIES } from "@/lib/knowledge/dataset"
import {
  Library, FileText, Link as LinkIcon, Box, Cog, Image as ImageIcon,
  ArrowLeft, ChevronRight, ExternalLink, BookOpen, Microscope,
  Beaker, Download, Gift, FlaskConical,
  Award,
} from "lucide-react"
import { QUANTIS_WHITE_PAPERS } from "@/lib/academy/library-content"
import { LibraryTabs } from "./_components/LibraryTabs"

export const dynamic = "force-dynamic"
export const metadata = { title: "Biblioteca — BIA Academy" }

const ATTACHMENT_ICONS: Record<string, { icon: typeof FileText; color: string; bg: string; border: string; label: string }> = {
  PDF:   { icon: FileText,  color: "text-rose-300",    bg: "bg-rose-500/10",    border: "border-rose-500/25",    label: "PDF" },
  LINK:  { icon: LinkIcon,  color: "text-blue-300",    bg: "bg-blue-500/10",    border: "border-blue-500/25",    label: "LINK" },
  STL:   { icon: Box,       color: "text-purple-300",  bg: "bg-purple-500/10",  border: "border-purple-500/25",  label: "STL 3D" },
  GCODE: { icon: Cog,       color: "text-amber-300",   bg: "bg-amber-500/10",   border: "border-amber-500/25",   label: "G-CODE" },
  IMAGE: { icon: ImageIcon, color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/25", label: "IMAGE" },
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; q?: string; type?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/academy/library")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { academyEnrollment: true },
  })
  if (!user?.academyEnrollment || !hasAccess(user.academyEnrollment)) {
    redirect("/academy/welcome")
  }

  const resolved = (await searchParams) ?? {}
  const activeTab = (resolved.tab as "materials" | "papers" | "whitepapers") ?? "materials"
  const search = (resolved.q ?? "").toLowerCase().trim()
  const typeFilter = resolved.type ?? ""

  // ─── TAB 1: Materiais das aulas (AcademyAttachment agregados) ───
  const modulesWithAttachments = await prisma.academyModule.findMany({
    where: { isPublished: true },
    include: {
      lessons: {
        where: { isPublished: true },
        include: { attachments: { orderBy: { createdAt: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { order: "asc" },
  })

  const allAttachments = modulesWithAttachments.flatMap((m) =>
    m.lessons.flatMap((l) =>
      l.attachments.map((a) => ({
        ...a,
        moduleOrder: m.order,
        moduleTitle: m.title,
        moduleSlug: m.slug,
        lessonTitle: l.title,
        lessonSlug: l.slug,
      })),
    ),
  )

  const filteredAttachments = allAttachments.filter((a) => {
    if (typeFilter && a.kind !== typeFilter) return false
    if (search) {
      const haystack = `${a.title} ${a.lessonTitle} ${a.moduleTitle}`.toLowerCase()
      if (!haystack.includes(search)) return false
    }
    return true
  })

  // ─── TAB 2: Papers & patentes & metodologias (Knowledge Engine) ───
  const allPapers = [
    ...KNOWLEDGE_ARTICLES.map((p) => ({ ...p, kindLabel: "Artigo" })),
    ...KNOWLEDGE_PATENTS.map((p) => ({ ...p, kindLabel: "Patente" })),
    ...KNOWLEDGE_METHODOLOGIES.map((p) => ({ ...p, kindLabel: "Metodologia" })),
  ]
  const filteredPapers = allPapers.filter((p) => {
    if (search) {
      const haystack = `${p.title} ${p.authors ?? ""} ${p.category} ${p.tags.join(" ")} ${p.doi ?? ""}`.toLowerCase()
      return haystack.includes(search)
    }
    return true
  })

  // ─── TAB 3: White papers Quantis (open access) ───
  const filteredWhitepapers = QUANTIS_WHITE_PAPERS.filter((wp) => {
    if (search) {
      const haystack = `${wp.title} ${wp.authors.join(" ")} ${wp.keywords.join(" ")} ${wp.abstract}`.toLowerCase()
      return haystack.includes(search)
    }
    return true
  })

  return (
    <div
      className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8"
      data-testid="academy-library-root"
    >
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/academy/dashboard" className="hover:text-fuchsia-300 flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" />
          Dashboard
        </Link>
        <ChevronRight className="w-3 h-3 text-gray-700" />
        <span className="text-gray-400">Biblioteca</span>
      </nav>

      {/* Header */}
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-200">
          <Library className="w-3.5 h-3.5" />
          Biblioteca Educacional
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
          Material complementar de estudo
        </h1>
        <p className="text-[15px] text-gray-300 leading-relaxed max-w-3xl">
          Reúne todos os anexos das aulas, 65 referências científicas curadas pelo Knowledge Engine
          da BIA (artigos, patentes, metodologias) e os white papers técnicos da Quantis em
          acesso aberto. Use a busca e os filtros para encontrar o que precisa.
        </p>
      </header>

      {/* Tabs + busca (client) */}
      <LibraryTabs
        activeTab={activeTab}
        search={search}
        typeFilter={typeFilter}
        counts={{
          materials: allAttachments.length,
          papers: allPapers.length,
          whitepapers: QUANTIS_WHITE_PAPERS.length,
        }}
      />

      {/* TAB 1: Materiais das aulas */}
      {activeTab === "materials" && (
        <section data-testid="library-materials-tab">
          {filteredAttachments.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhum material encontrado"
              description={
                search
                  ? "Tente outra busca ou limpe o filtro de tipo."
                  : "Ainda não há anexos nas aulas publicadas. Volte em breve — a Quantis atualiza o conteúdo a cada módulo liberado."
              }
            />
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                {filteredAttachments.length} material{filteredAttachments.length === 1 ? "" : "is"} encontrado{filteredAttachments.length === 1 ? "" : "s"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredAttachments.map((a) => {
                  const meta = ATTACHMENT_ICONS[a.kind] ?? ATTACHMENT_ICONS.LINK
                  const Icon = meta.icon
                  return (
                    <a
                      key={a.id}
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`library-attachment-${a.id}`}
                      className="group rounded-xl border border-white/[0.08] bg-white/[0.02] hover:border-fuchsia-500/30 hover:bg-fuchsia-500/[0.04] transition-all p-4 flex gap-3"
                    >
                      <div className={`w-10 h-10 rounded-xl ${meta.bg} border ${meta.border} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 ${meta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${meta.bg} ${meta.color} border ${meta.border}`}>
                            {meta.label}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            M{String(a.moduleOrder).padStart(2, "0")} · {a.moduleTitle}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-white truncate">{a.title}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                          Aula: {a.lessonTitle}
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-fuchsia-300 shrink-0 self-center" />
                    </a>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: Papers & patentes */}
      {activeTab === "papers" && (
        <section data-testid="library-papers-tab">
          {filteredPapers.length === 0 ? (
            <EmptyState
              icon={Microscope}
              title="Nenhum paper encontrado"
              description="Tente outra busca ou veja todas as referências."
            />
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                {filteredPapers.length} referência{filteredPapers.length === 1 ? "" : "s"} do Knowledge Engine Quantis
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredPapers.map((p) => {
                  const Icon = p.kind === "article" ? FileText : p.kind === "patent" ? Award : Beaker
                  const color = p.kind === "article"
                    ? { bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/25", text: "text-fuchsia-300" }
                    : p.kind === "patent"
                      ? { bg: "bg-amber-500/10", border: "border-amber-500/25", text: "text-amber-300" }
                      : { bg: "bg-emerald-500/10", border: "border-emerald-500/25", text: "text-emerald-300" }
                  return (
                    <a
                      key={p.id}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`library-paper-${p.id}`}
                      className="group rounded-xl border border-white/[0.08] bg-white/[0.02] hover:border-fuchsia-500/30 transition-all p-4 block"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl ${color.bg} border ${color.border} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-5 h-5 ${color.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${color.bg} ${color.text} border ${color.border}`}>
                              {p.kindLabel}
                            </span>
                            <span className="text-[10px] text-gray-500">{p.category}</span>
                            {p.year && (
                              <span className="text-[10px] text-gray-500">· {p.year}</span>
                            )}
                          </div>
                          <p className="text-[13px] font-semibold text-white leading-snug mb-1">
                            {p.title}
                          </p>
                          {p.authors && (
                            <p className="text-[11px] text-gray-400 italic mb-1">
                              {p.authors}
                            </p>
                          )}
                          <p className="text-[11px] text-gray-500 line-clamp-2">
                            {p.summary}
                          </p>
                          {p.doi && (
                            <code className="inline-block mt-2 text-[10px] font-mono text-fuchsia-300 bg-violet-500/10 border border-violet-500/25 px-1.5 py-0.5 rounded">
                              DOI: {p.doi}
                            </code>
                          )}
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-fuchsia-300 shrink-0" />
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: White Papers Quantis */}
      {activeTab === "whitepapers" && (
        <section data-testid="library-whitepapers-tab">
          <div className="rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.08] to-teal-500/[0.03] p-4 mb-5 flex items-start gap-3">
            <Gift className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-100">
                Open Access — para você e para quem quiser
              </p>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Os white papers técnicos da Quantis são publicados em acesso aberto.
                Baixe, cite, compartilhe à vontade — basta manter a referência correta.
                Links diretos abaixo (não exigem login).
              </p>
            </div>
          </div>

          {filteredWhitepapers.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Nenhum white paper encontrado"
              description="Tente outra busca."
            />
          ) : (
            <div className="space-y-4">
              {filteredWhitepapers.map((wp) => (
                <article
                  key={wp.id}
                  data-testid={`library-whitepaper-${wp.id}`}
                  className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/[0.05] to-violet-500/[0.02] hover:border-fuchsia-500/40 transition-all p-5 sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0 shadow-lg shadow-fuchsia-900/30">
                      <FlaskConical className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-500/30">
                          {wp.category}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {wp.year}
                        </span>
                        {wp.openAccess && (
                          <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Open Access
                          </span>
                        )}
                        {wp.restrictedToStudents && (
                          <span
                            className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            data-testid={`library-badge-student-only-${wp.id}`}
                          >
                            🎁 Brinde da matrícula
                          </span>
                        )}
                        {wp.kind === "ebook" && (
                          <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">
                            E-book
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                        {wp.title}
                      </h3>
                      <p className="text-xs text-fuchsia-300 italic">
                        {wp.authors.join(" · ")}
                      </p>
                      <p className="text-[14px] text-gray-300 leading-relaxed">
                        {wp.abstract}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {wp.keywords.map((k) => (
                          <span
                            key={k}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-gray-400"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 pt-3 flex-wrap">
                        <a
                          href={wp.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          data-testid={`library-whitepaper-download-${wp.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all shadow-lg shadow-fuchsia-900/30"
                        >
                          <Download className="w-4 h-4" />
                          Baixar PDF
                        </a>
                        <span className="text-[11px] text-gray-500">
                          {wp.pages} páginas · {wp.sizeMb} MB · {wp.language}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 pt-1">
                        <strong>Como citar:</strong> <span className="font-mono">{wp.citation}</span>
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FileText
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-10 text-center">
      <div className="w-16 h-16 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-fuchsia-300" />
      </div>
      <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-400 max-w-md mx-auto">{description}</p>
    </div>
  )
}
