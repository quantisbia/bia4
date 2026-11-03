"use client"

/**
 * BIA · Academy · RichLessonContent — R13.13 → R30
 *
 * Renderiza o `summary` markdown das aulas como um manual científico digital
 * interativo:
 *  - R30: seções H2 em Accordion acessível (button + aria-expanded/controls,
 *    teclado, foco visível), 1ª seção aberta por padrão, "Expandir/Recolher
 *    tudo", sumário "Neste material", estado persistido por aula
 *    (localStorage) e abertura por #hash.
 *  - R30: parser movido para src/lib/academy/lesson-markdown.ts (puro, testado)
 *    — corrige tabelas nunca reconhecidas, células vazias descartadas, listas
 *    numeradas fragmentadas, blocos de código ''' / ```.
 *  - R30: tabelas responsivas (rolagem horizontal própria em telas pequenas,
 *    indicador de rolagem, cabeçalho destacado, quebra de texto nas células).
 *  - Headings com ícone por tipo (Contexto, Conceitos, Erros, Artigos…)
 *  - Cards de artigos com DOI clicável; grid de congressos 🌍/🇧🇷;
 *    callout de erros comuns; blockquotes; bold/italic/code/links.
 *  - CONTRASTE CORRETO no tema escuro (text-white / gray-100 / gray-200).
 *
 * Uso:
 *   <RichLessonContent markdown={lesson.summary} lessonId={lesson.id} />
 *
 * A exportação em PDF NÃO usa este componente: ver ../print (R30), que
 * renderiza tudo expandido com CSS de página próprio.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  BookOpen, Layers, AlertTriangle, GitCompare, Cpu, GraduationCap,
  FileText, ExternalLink, Globe2, MapPin, Rocket, Users,
  Sparkles, Info, ChevronDown, ChevronsDownUp, ChevronsUpDown, ListTree, Printer,
} from "lucide-react"
import {
  parseInline, parseLessonMarkdown, isArticleItem, parseArticleItem,
  type InlineNode, type Block, type ListItem, type Section, type SectionKind, type TableAlign,
} from "@/lib/academy/lesson-markdown"

// ─────────────────────────────────────────────────────────────────────────
// Inline
// ─────────────────────────────────────────────────────────────────────────

function InlineRun({ nodes }: { nodes: InlineNode[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        if (n.type === "text") return <span key={i}>{n.value}</span>
        if (n.type === "bold") return <strong key={i} className="font-semibold text-white dark:text-white">{n.value}</strong>
        if (n.type === "italic") return <em key={i} className="italic text-fuchsia-200 dark:text-fuchsia-200">{n.value}</em>
        if (n.type === "code") return (
          <code
            key={i}
            className="px-1.5 py-0.5 mx-0.5 rounded font-mono text-[0.85em] bg-violet-500/15 text-fuchsia-200 border border-violet-500/25 break-words"
          >
            {n.value}
          </code>
        )
        if (n.type === "link") {
          const isDoi = /doi\.org|dx\.doi/.test(n.href)
          return (
            <a
              key={i}
              href={n.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-baseline gap-0.5 text-fuchsia-300 hover:text-fuchsia-200 underline underline-offset-2 decoration-fuchsia-500/40 hover:decoration-fuchsia-300 break-all"
            >
              {isDoi && <ExternalLink className="w-3 h-3 shrink-0 self-center" />}
              <span>{n.label}</span>
            </a>
          )
        }
        return null
      })}
    </>
  )
}

const Inline = ({ text }: { text: string }) => <InlineRun nodes={parseInline(text)} />

// ─────────────────────────────────────────────────────────────────────────
// Ícones / cores por tipo de seção
// ─────────────────────────────────────────────────────────────────────────

function iconForSection(kind: SectionKind) {
  switch (kind) {
    case "context":       return BookOpen
    case "concepts":      return Layers
    case "distinctions":  return GitCompare
    case "challenges":    return Cpu
    case "mistakes":      return AlertTriangle
    case "articles":      return FileText
    case "researchers":   return Users
    case "conferences":   return GraduationCap
    case "next-steps":    return Rocket
    default:              return Sparkles
  }
}

function colorForSection(kind: SectionKind): { bg: string; border: string; text: string } {
  switch (kind) {
    case "context":      return { bg: "bg-violet-500/10 dark:bg-violet-500/10", border: "border-violet-500/30", text: "text-violet-200 dark:text-violet-200" }
    case "distinctions": return { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-200" }
    case "mistakes":     return { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-200" }
    case "challenges":   return { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-200" }
    case "articles":     return { bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/30", text: "text-fuchsia-200" }
    case "researchers":  return { bg: "bg-sky-500/10", border: "border-sky-500/30", text: "text-sky-200" }
    case "conferences":  return { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-200" }
    case "next-steps":   return { bg: "bg-indigo-500/10", border: "border-indigo-500/30", text: "text-indigo-200" }
    default:             return { bg: "bg-white/[0.03]", border: "border-white/[0.10]", text: "text-gray-200" }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Blocos básicos
// ─────────────────────────────────────────────────────────────────────────

function SubHeader({ text, id, level }: { text: string; id?: string; level: 3 | 4 }) {
  const clean = text.replace(/^(🌍|🇧🇷|📄|🎓|🚀|⚠️|💡|🔀)\s*/, "")
  const emojiPrefix = text.match(/^(🌍|🇧🇷|📄|🎓|🚀|⚠️|💡|🔀)/)?.[0] ?? ""
  const Tag = level === 3 ? "h3" : "h4"
  return (
    <Tag
      id={id}
      className={`${level === 3 ? "text-base sm:text-lg pt-5" : "text-[15px] pt-3"} font-bold text-white pb-2 flex items-center gap-2 scroll-mt-24`}
    >
      {emojiPrefix && <span className="text-xl">{emojiPrefix}</span>}
      <span><Inline text={clean} /></span>
    </Tag>
  )
}

function Paragraph({ text }: { text: string }) {
  return (
    <p className="text-[15px] leading-[1.75] text-gray-200 dark:text-gray-200 mb-4">
      <Inline text={text} />
    </p>
  )
}

function Blockquote({ text }: { text: string }) {
  return (
    <blockquote className="my-5 pl-5 pr-4 py-3 border-l-4 border-fuchsia-500 bg-fuchsia-500/[0.06] rounded-r-lg">
      <p className="text-[15px] leading-[1.75] text-fuchsia-100 italic">
        <Inline text={text} />
      </p>
    </blockquote>
  )
}

function CodeBlock({ text, lang }: { text: string; lang: string | null }) {
  return (
    <figure className="my-5 rounded-xl border border-violet-500/25 bg-[#120a24] overflow-hidden" data-testid="lesson-code-block">
      {lang && (
        <figcaption className="px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest text-violet-300/80 border-b border-violet-500/20">
          {lang}
        </figcaption>
      )}
      <pre className="overflow-x-auto px-4 py-3 text-[13px] leading-[1.65] font-mono text-fuchsia-100 whitespace-pre">
        <code>{text}</code>
      </pre>
    </figure>
  )
}

function BulletList({ items, ordered, start = 1, nested = false }: { items: ListItem[]; ordered: boolean; start?: number; nested?: boolean }) {
  const Tag = ordered ? "ol" : "ul"
  return (
    <Tag className={`${nested ? "mt-2 space-y-1.5" : "space-y-2 mb-5"} list-none pl-1`} start={ordered ? start : undefined}>
      {items.map((item, i) => (
        <li key={i} className={`flex items-start gap-3 ${nested ? "text-[14px]" : "text-[15px]"} leading-[1.7] text-gray-200`}>
          {ordered ? (
            <span className="shrink-0 mt-0.5 inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-[11px] font-bold text-violet-200">
              {start + i}
            </span>
          ) : (
            <span className={`shrink-0 mt-2.5 w-1.5 h-1.5 rounded-full ${nested ? "bg-violet-300/70" : "bg-fuchsia-400"}`} />
          )}
          <div className="flex-1 min-w-0">
            <Inline text={item.text} />
            {item.children && item.children.length > 0 && (
              <BulletList items={item.children} ordered={false} nested />
            )}
          </div>
        </li>
      ))}
    </Tag>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Tabela responsiva (R30)
// ─────────────────────────────────────────────────────────────────────────

const ALIGN_CLASS: Record<string, string> = { left: "text-left", center: "text-center", right: "text-right" }

function Table({ headers, rows, align }: { headers: string[]; rows: string[][]; align?: TableAlign[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scroll, setScroll] = useState({ canLeft: false, canRight: false })

  const measure = useCallback(() => {
    const el = wrapRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setScroll({ canLeft: el.scrollLeft > 4, canRight: max > 4 && el.scrollLeft < max - 4 })
  }, [])

  useEffect(() => {
    measure()
    const el = wrapRef.current
    if (!el) return
    el.addEventListener("scroll", measure, { passive: true })
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null
    ro?.observe(el)
    return () => { el.removeEventListener("scroll", measure); ro?.disconnect() }
  }, [measure])

  const cols = headers.length
  // Largura mínima proporcional ao nº de colunas: garante legibilidade e
  // delega o excedente à rolagem horizontal do próprio container.
  const minWidth = cols >= 3 ? Math.min(cols * 150, 960) : undefined

  return (
    <figure className="my-5" data-testid="lesson-table">
      <div className="relative rounded-xl border border-white/[0.08]">
        {scroll.canLeft && <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-8 rounded-l-xl bg-gradient-to-r from-[#0b0714] to-transparent z-10" />}
        {scroll.canRight && <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-xl bg-gradient-to-l from-[#0b0714] to-transparent z-10" />}
        <div ref={wrapRef} className="overflow-x-auto rounded-xl" tabIndex={0} role="region" aria-label="Tabela com rolagem horizontal">
          <table className="w-full text-sm border-collapse" style={minWidth ? { minWidth } : undefined}>
            <thead>
              <tr className="bg-gradient-to-r from-violet-600/40 to-fuchsia-600/40 border-b border-white/[0.08]">
                {headers.map((h, i) => (
                  <th
                    key={i}
                    scope="col"
                    className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-white align-bottom ${ALIGN_CLASS[align?.[i] ?? ""] ?? "text-left"}`}
                  >
                    <Inline text={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={`${ri % 2 === 0 ? "bg-white/[0.02]" : "bg-white/[0.005]"} border-b border-white/[0.04] last:border-b-0`}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`px-4 py-3 text-gray-200 align-top break-words [overflow-wrap:anywhere] ${ALIGN_CLASS[align?.[ci] ?? ""] ?? "text-left"} ${ci === 0 ? "font-medium text-white" : ""}`}
                    >
                      {cell ? <Inline text={cell} /> : <span className="text-gray-600">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {scroll.canRight && (
        <figcaption className="mt-1.5 text-[11px] text-gray-500 sm:hidden">Deslize horizontalmente para ver todas as colunas →</figcaption>
      )}
    </figure>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Cards especiais
// ─────────────────────────────────────────────────────────────────────────

function ArticleCard({ item }: { item: string }) {
  const parsed = parseArticleItem(item)
  return (
    <article className="group rounded-xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/[0.06] to-violet-500/[0.03] hover:border-fuchsia-500/40 transition-all p-4 mb-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center shrink-0 mt-0.5">
          <FileText className="w-5 h-5 text-fuchsia-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-fuchsia-300/80 font-medium mb-0.5">
            {parsed.authors || "Autores"}{parsed.year ? ` · ${parsed.year}` : ""}
          </p>
          <h4 className="text-[15px] font-semibold text-white leading-snug mb-1">{parsed.title}</h4>
          {parsed.journal && <p className="text-xs italic text-gray-400 mb-2">📰 {parsed.journal}</p>}
          {parsed.extra && <p className="text-xs text-gray-400 mb-2">{parsed.extra}</p>}
          {parsed.doiUrl && parsed.doiLabel && (
            <a
              href={parsed.doiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-fuchsia-300 hover:text-fuchsia-200 border border-fuchsia-500/30 hover:border-fuchsia-500/50 hover:bg-fuchsia-500/10 rounded-lg px-2.5 py-1.5 transition-all break-all"
            >
              <ExternalLink className="w-3 h-3 shrink-0" />
              DOI: {parsed.doiLabel}
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

function ConferenceCard({ item, region }: { item: string; region: "int" | "nat" }) {
  const parts = item.split(/\s*[—–-]\s+/)
  const nameRaw = parts[0]
  const desc = parts.slice(1).join(" — ")
  const nameMatch = nameRaw.match(/\*\*([^*]+)\*\*/)
  const name = nameMatch ? nameMatch[1] : nameRaw
  const Icon = region === "int" ? Globe2 : MapPin
  const bgClass = region === "int"
    ? "from-emerald-500/[0.08] to-teal-500/[0.03] border-emerald-500/25 hover:border-emerald-500/45"
    : "from-yellow-500/[0.08] to-orange-500/[0.03] border-yellow-500/25 hover:border-yellow-500/45"
  const iconBgClass = region === "int"
    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
    : "bg-yellow-500/15 border-yellow-500/30 text-yellow-300"
  return (
    <div className={`rounded-xl border bg-gradient-to-br ${bgClass} p-3.5 transition-all`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg border ${iconBgClass} flex items-center justify-center shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-tight mb-1"><Inline text={name} /></p>
          {desc && <p className="text-[11px] text-gray-400 leading-relaxed"><Inline text={desc} /></p>}
        </div>
      </div>
    </div>
  )
}

function MistakeCallout({ items }: { items: ListItem[] }) {
  return (
    <div className="my-4 rounded-xl border-2 border-rose-500/30 bg-gradient-to-br from-rose-500/[0.08] to-red-500/[0.02]">
      <div className="px-4 py-2.5 border-b border-rose-500/25 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-rose-300" />
        <p className="text-xs font-bold uppercase tracking-widest text-rose-200">Atenção · Erros que geram problemas reais</p>
      </div>
      <ol className="p-4 space-y-2 list-none">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-[14px] leading-[1.6] text-rose-50">
            <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500/20 border border-rose-500/40 text-[10px] font-bold text-rose-200">{i + 1}</span>
            <div className="flex-1"><Inline text={item.text} /></div>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Renderização de blocos / seções
// ─────────────────────────────────────────────────────────────────────────

function renderBlock(block: Block, idx: number, section: Section, subIdx: { n: number }): ReactNode {
  switch (block.type) {
    case "heading": {
      const sub = section.subsections[subIdx.n++]
      return <SubHeader key={idx} text={block.text} id={sub?.id} level={block.level === 2 ? 3 : block.level} />
    }
    case "paragraph": return <Paragraph key={idx} text={block.text} />
    case "blockquote": return <Blockquote key={idx} text={block.text} />
    case "list": return <BulletList key={idx} items={block.items} ordered={block.ordered} start={block.start} />
    case "table": return <Table key={idx} headers={block.headers} rows={block.rows} align={block.align} />
    case "code": return <CodeBlock key={idx} text={block.text} lang={block.lang} />
    case "hr": return <hr key={idx} className="my-6 border-white/[0.08]" />
  }
}

function renderArticlesSection(section: Section): ReactNode {
  const subIdx = { n: 0 }
  return section.blocks.map((b, i) => {
    if (b.type === "list") {
      return (
        <div key={i} className="mt-2">
          {b.items.map((item, j) =>
            isArticleItem(item.text)
              ? <ArticleCard key={j} item={item.text} />
              : <BulletList key={j} items={[item]} ordered={false} />,
          )}
        </div>
      )
    }
    if (b.type === "paragraph" && isArticleItem(b.text)) return <ArticleCard key={i} item={b.text} />
    return renderBlock(b, i, section, subIdx)
  })
}

function renderConferencesSection(section: Section): ReactNode {
  type Group = { title: string; region: "int" | "nat"; items: ListItem[] }
  const groups: Group[] = []
  let cur: Group | null = null
  const others: ReactNode[] = []
  const subIdx = { n: 0 }

  for (let i = 0; i < section.blocks.length; i++) {
    const b = section.blocks[i]
    if (b.type === "heading") {
      const region: "int" | "nat" = /internacio|🌍/i.test(b.text) ? "int" : "nat"
      if (cur) groups.push(cur)
      cur = { title: b.text, region, items: [] }
      subIdx.n++
    } else if (b.type === "list") {
      if (!cur) cur = { title: "", region: "int", items: [] }
      cur.items.push(...b.items)
    } else if (b.type === "paragraph" && /\bnacional|🇧🇷|latam/i.test(b.text)) {
      if (cur) groups.push(cur)
      cur = { title: b.text.replace(/\*/g, ""), region: "nat", items: [] }
    } else if (b.type === "paragraph" && /\binternacio|🌍/i.test(b.text)) {
      if (cur) groups.push(cur)
      cur = { title: b.text.replace(/\*/g, ""), region: "int", items: [] }
    } else {
      others.push(renderBlock(b, i, section, subIdx))
    }
  }
  if (cur) groups.push(cur)

  return (
    <div className="space-y-5">
      {others}
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.title && <SubHeader text={g.title} level={3} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {g.items.map((item, i) => <ConferenceCard key={i} item={item.text} region={g.region} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

function renderMistakesSection(section: Section): ReactNode {
  const items: ListItem[] = []
  const others: ReactNode[] = []
  const subIdx = { n: 0 }
  for (let i = 0; i < section.blocks.length; i++) {
    const b = section.blocks[i]
    if (b.type === "list") items.push(...b.items)
    else others.push(renderBlock(b, i, section, subIdx))
  }
  return <>{others}{items.length > 0 && <MistakeCallout items={items} />}</>
}

function SectionBody({ section }: { section: Section }) {
  if (section.kind === "articles") return <>{renderArticlesSection(section)}</>
  if (section.kind === "conferences") return <>{renderConferencesSection(section)}</>
  if (section.kind === "mistakes") return <>{renderMistakesSection(section)}</>
  const subIdx = { n: 0 }
  return <>{section.blocks.map((b, i) => renderBlock(b, i, section, subIdx))}</>
}

// ─────────────────────────────────────────────────────────────────────────
// Accordion (R30)
// ─────────────────────────────────────────────────────────────────────────

function AccordionSection({ section, open, onToggle }: { section: Section; open: boolean; onToggle: () => void }) {
  const Icon = iconForSection(section.kind)
  const colors = colorForSection(section.kind)
  const headerId = `acc-h-${section.id}`
  const panelId = `acc-p-${section.id}`
  const minutes = Math.max(1, Math.round(section.wordCount / 200))

  return (
    <section
      id={section.id}
      data-section-kind={section.kind}
      data-testid="lesson-accordion-section"
      data-open={open ? "true" : "false"}
      className={`rounded-2xl border transition-colors scroll-mt-24 ${open ? "border-white/[0.12] bg-white/[0.02]" : "border-white/[0.06] bg-transparent hover:border-white/[0.12]"}`}
    >
      <h2 className="m-0">
        <button
          type="button"
          id={headerId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="w-full flex items-center gap-3 px-3 sm:px-4 py-3.5 text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0714]"
        >
          <span className={`w-10 h-10 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${colors.text}`} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-lg sm:text-xl font-bold text-white leading-tight">{section.title}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
              <span>~{minutes} min</span>
              {section.subsections.length > 0 && <span>{section.subsections.length} {section.subsections.length === 1 ? "subtópico" : "subtópicos"}</span>}
              {!open && section.subsections.length > 0 && (
                <span className="hidden sm:inline truncate text-gray-600">· {section.subsections.map(s => s.title).join(" · ")}</span>
              )}
            </span>
          </span>
          <ChevronDown className={`w-5 h-5 shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180 text-fuchsia-300" : ""}`} aria-hidden />
        </button>
      </h2>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        hidden={!open}
        className="px-3 sm:px-4 pb-5 sm:pl-[68px]"
      >
        {open && (
          <>
            <div className="h-0.5 w-16 mb-4 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-transparent" />
            <SectionBody section={section} />
          </>
        )}
      </div>
    </section>
  )
}

function Toc({ sections, open, onGo }: { sections: Section[]; open: Record<string, boolean>; onGo: (id: string) => void }) {
  return (
    <nav aria-label="Neste material" className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4 mb-5" data-testid="lesson-toc">
      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-fuchsia-300/80 mb-2">
        <ListTree className="w-3.5 h-3.5" /> Neste material
      </p>
      <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 list-none">
        {sections.map((s, i) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              onClick={(e) => { e.preventDefault(); onGo(s.id) }}
              className={`group flex items-baseline gap-2 py-1 text-sm rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 ${open[s.id] ? "text-white" : "text-gray-300 hover:text-white"}`}
            >
              <span className="text-[11px] font-mono text-gray-500 w-5 shrink-0">{String(i + 1).padStart(2, "0")}</span>
              <span className="underline-offset-2 group-hover:underline decoration-fuchsia-500/40">{s.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Componente público
// ─────────────────────────────────────────────────────────────────────────

export type RichLessonContentProps = {
  markdown: string
  /** Persistência do estado do accordion por aula (localStorage). */
  lessonId?: string
  /** URL da versão para impressão/PDF (mostra botão "Baixar PDF"). */
  printHref?: string
  /** Comportamento inicial: "first" (padrão) abre só a 1ª seção. */
  initialOpen?: "first" | "all" | "none"
}

const STORAGE_PREFIX = "academy:acc:"

export function RichLessonContent({ markdown, lessonId, printHref, initialOpen = "first" }: RichLessonContentProps) {
  const parsed = useMemo(() => parseLessonMarkdown(markdown), [markdown])
  const { sections } = parsed

  const wordCount = useMemo(
    () => markdown.split(/\s+/).filter(Boolean).length,
    [markdown],
  )
  const readMinutes = Math.max(1, Math.round(wordCount / 200))

  const computeInitial = useCallback((): Record<string, boolean> => {
    const o: Record<string, boolean> = {}
    sections.forEach((s, i) => { o[s.id] = initialOpen === "all" ? true : initialOpen === "none" ? false : i === 0 })
    return o
  }, [sections, initialOpen])

  const [open, setOpen] = useState<Record<string, boolean>>(computeInitial)
  const storageKey = lessonId ? `${STORAGE_PREFIX}${lessonId}` : null
  const hydrated = useRef(false)

  // Restaura estado salvo + abre seção do #hash (apenas no cliente)
  useEffect(() => {
    let next = computeInitial()
    if (storageKey) {
      try {
        const raw = window.localStorage.getItem(storageKey)
        if (raw) {
          const saved = JSON.parse(raw) as Record<string, boolean>
          next = { ...next, ...Object.fromEntries(Object.entries(saved).filter(([k]) => k in next)) }
        }
      } catch { /* ignore */ }
    }
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""))
    if (hash) {
      const target = sections.find(s => s.id === hash || s.subsections.some(ss => ss.id === hash))
      if (target) next[target.id] = true
    }
    setOpen(next)
    hydrated.current = true
    if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: "start" }))
  }, [computeInitial, sections, storageKey])

  useEffect(() => {
    if (!hydrated.current || !storageKey) return
    try { window.localStorage.setItem(storageKey, JSON.stringify(open)) } catch { /* ignore */ }
  }, [open, storageKey])

  // Navegação por #hash sem recarregar (links internos, histórico)
  useEffect(() => {
    const onHash = () => {
      const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""))
      if (!hash) return
      const target = sections.find(s => s.id === hash || s.subsections.some(ss => ss.id === hash))
      if (!target) return
      setOpen(o => (o[target.id] ? o : { ...o, [target.id]: true }))
      requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: "start" }))
    }
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [sections])

  const toggle = useCallback((id: string) => setOpen(o => ({ ...o, [id]: !o[id] })), [])
  const setAll = useCallback((v: boolean) => setOpen(Object.fromEntries(sections.map(s => [s.id, v]))), [sections])
  const goTo = useCallback((id: string) => {
    setOpen(o => ({ ...o, [id]: true }))
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
      history.replaceState(null, "", `#${id}`)
    })
  }, [])

  const allOpen = sections.length > 0 && sections.every(s => open[s.id])
  const noneOpen = sections.every(s => !open[s.id])

  return (
    <article data-testid="rich-lesson-content" className="rich-lesson-content">
      {/* Metadata + controles */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" />
          {wordCount.toLocaleString("pt-BR")} palavras
        </span>
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          ~{readMinutes} min de leitura
        </span>
        <span className="flex items-center gap-1.5">
          <ListTree className="w-3.5 h-3.5" />
          {sections.length} {sections.length === 1 ? "seção" : "seções"}
          {parsed.tableCount > 0 && ` · ${parsed.tableCount} ${parsed.tableCount === 1 ? "tabela" : "tabelas"}`}
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => setAll(true)}
          disabled={allOpen}
          data-testid="lesson-expand-all"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.08] text-gray-300 hover:text-white hover:border-white/[0.2] disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
        >
          <ChevronsUpDown className="w-3.5 h-3.5" /> Expandir tudo
        </button>
        <button
          type="button"
          onClick={() => setAll(false)}
          disabled={noneOpen}
          data-testid="lesson-collapse-all"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.08] text-gray-300 hover:text-white hover:border-white/[0.2] disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
        >
          <ChevronsDownUp className="w-3.5 h-3.5" /> Recolher tudo
        </button>
        {printHref && (
          <a
            href={printHref}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="lesson-print-link"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/[0.06] text-fuchsia-200 hover:text-white hover:border-fuchsia-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
          >
            <Printer className="w-3.5 h-3.5" /> Baixar PDF
          </a>
        )}
      </div>

      {sections.length > 1 && <Toc sections={sections} open={open} onGo={goTo} />}

      <div className="space-y-3">
        {sections.map(s => (
          <AccordionSection key={s.id} section={s} open={!!open[s.id]} onToggle={() => toggle(s.id)} />
        ))}
      </div>
    </article>
  )
}
