"use client"

/**
 * BIA · Academy · RichLessonContent — R13.13
 *
 * Renderiza o `summary` markdown das aulas com formatação educativa:
 *  - Headings com ícone por tipo (Contexto, Conceitos, Erros, Artigos…)
 *  - Callouts coloridos (Distinção, Erro comum, Desafio, Definição)
 *  - Tabelas com cabeçalho violeta + linhas alternadas
 *  - Cards de artigos com DOI clicável
 *  - Grid de congressos com ícone + região (🌍 internacional, 🇧🇷 nacional)
 *  - Listas numeradas/bulled com marcadores próprios
 *  - Blockquotes destacados
 *  - Bold / italic / inline code / links
 *  - CONTRASTE CORRETO em ambos os temas (dark: e light: branches)
 *
 * Design: inspirado em Notion / Coursera / Nature Learning.
 * Todas as cores respeitam:
 *   - Fundo escuro (dark): texto branco/gray-100/200; callouts com overlays
 *   - Fundo claro (light): texto gray-900/700/600; callouts com backgrounds
 *
 * Uso:
 *   <RichLessonContent markdown={lesson.summary} />
 *
 * Estratégia de parsing:
 *  Fazemos um parser tolerante linha-por-linha (não usa lib externa para
 *  evitar bundle bloat). Reconhece:
 *   - # ## ### headings
 *   - **bold** *italic* `code` [link](url)
 *   - Tabelas GitHub-style com | e ---
 *   - Listas ordenadas (1. ) e não-ordenadas (- )
 *   - Blockquotes (> )
 *   - Parágrafos normais
 *   - "seções especiais" detectadas por emoji no heading
 *     (📄 Artigos, 🎓 Congressos, 🚀 Próximos passos, ⚠️ Erros)
 */
import { useMemo } from "react"
import {
  BookOpen, Layers, AlertTriangle, GitCompare, Cpu, GraduationCap,
  ArrowRight, FileText, ExternalLink, Globe2, MapPin, Rocket,
  Sparkles, Info, Lightbulb, Building2, Landmark, Award,
} from "lucide-react"

// ─────────────────────────────────────────────────────────────────────────
// Helpers de parsing inline (bold, italic, links, code)
// ─────────────────────────────────────────────────────────────────────────

/** Regex para o padrão DOI ISO (10.NNNN/xxxx). Case-insensitive. */
const DOI_REGEX = /10\.\d{4,9}\/[-._;()/:A-Z0-9]+/gi

type InlineNode =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "code"; value: string }
  | { type: "link"; label: string; href: string }

/** Parser inline: **bold**, *italic*, `code`, [label](url). */
function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = []
  const pattern = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g
  let lastIdx = 0
  let m: RegExpExecArray | null
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > lastIdx) {
      nodes.push({ type: "text", value: text.slice(lastIdx, m.index) })
    }
    if (m[2] !== undefined) nodes.push({ type: "bold", value: m[2] })
    else if (m[4] !== undefined) nodes.push({ type: "italic", value: m[4] })
    else if (m[6] !== undefined) nodes.push({ type: "code", value: m[6] })
    else if (m[7] !== undefined) nodes.push({ type: "link", label: m[8], href: m[9] })
    lastIdx = m.index + m[0].length
  }
  if (lastIdx < text.length) {
    nodes.push({ type: "text", value: text.slice(lastIdx) })
  }
  return nodes
}

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
            className="px-1.5 py-0.5 mx-0.5 rounded font-mono text-[0.85em] bg-violet-500/15 text-fuchsia-200 border border-violet-500/25"
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
              className="inline-flex items-baseline gap-0.5 text-fuchsia-300 hover:text-fuchsia-200 underline underline-offset-2 decoration-fuchsia-500/40 hover:decoration-fuchsia-300"
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

// ─────────────────────────────────────────────────────────────────────────
// Detecção de tipo de seção pelo heading
// ─────────────────────────────────────────────────────────────────────────

type SectionKind =
  | "context"          // ## Contexto
  | "concepts"         // ## Conceitos-chave
  | "distinctions"     // ## Distinções que geram confusão
  | "challenges"       // ## Desafios técnicos
  | "mistakes"         // ## Erros comuns
  | "articles"         // ## 📄 Artigos recomendados
  | "conferences"      // ## 🎓 Congressos
  | "next-steps"       // ## 🚀 Próximos passos
  | "generic"

function detectSectionKind(heading: string): SectionKind {
  const lower = heading.toLowerCase()
  if (/contexto/i.test(heading)) return "context"
  if (/conceitos.chave|conceitos chave/i.test(heading)) return "concepts"
  if (/distin[çc][ãa]o/i.test(heading)) return "distinctions"
  if (/desafios? t[eé]cnicos?|gargalos/i.test(heading)) return "challenges"
  if (/erros? comuns?/i.test(heading)) return "mistakes"
  if (/📄|artigos? recomendados?|refer[êe]ncias?/i.test(heading)) return "articles"
  if (/🎓|congressos?|sociedades|eventos/i.test(heading)) return "conferences"
  if (/🚀|pr[óo]ximos passos/i.test(heading)) return "next-steps"
  return "generic"
}

function iconForSection(kind: SectionKind) {
  switch (kind) {
    case "context":       return BookOpen
    case "concepts":      return Layers
    case "distinctions":  return GitCompare
    case "challenges":    return Cpu
    case "mistakes":      return AlertTriangle
    case "articles":      return FileText
    case "conferences":   return GraduationCap
    case "next-steps":    return Rocket
    default:              return Sparkles
  }
}

function colorForSection(kind: SectionKind): {
  bg: string; border: string; ring: string; text: string
} {
  switch (kind) {
    case "context":
      return {
        bg: "bg-violet-500/10 dark:bg-violet-500/10",
        border: "border-violet-500/30",
        ring: "ring-violet-500/20",
        text: "text-violet-200 dark:text-violet-200",
      }
    case "distinctions":
      return {
        bg: "bg-cyan-500/10",
        border: "border-cyan-500/30",
        ring: "ring-cyan-500/20",
        text: "text-cyan-200",
      }
    case "mistakes":
      return {
        bg: "bg-rose-500/10",
        border: "border-rose-500/30",
        ring: "ring-rose-500/20",
        text: "text-rose-200",
      }
    case "challenges":
      return {
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        ring: "ring-amber-500/20",
        text: "text-amber-200",
      }
    case "articles":
      return {
        bg: "bg-fuchsia-500/10",
        border: "border-fuchsia-500/30",
        ring: "ring-fuchsia-500/20",
        text: "text-fuchsia-200",
      }
    case "conferences":
      return {
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        ring: "ring-emerald-500/20",
        text: "text-emerald-200",
      }
    case "next-steps":
      return {
        bg: "bg-indigo-500/10",
        border: "border-indigo-500/30",
        ring: "ring-indigo-500/20",
        text: "text-indigo-200",
      }
    default:
      return {
        bg: "bg-white/[0.03]",
        border: "border-white/[0.10]",
        ring: "ring-white/[0.08]",
        text: "text-gray-200",
      }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Tipos de blocos do parser
// ─────────────────────────────────────────────────────────────────────────

type Block =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet"; items: string[]; ordered: boolean }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "blockquote"; text: string }

/** Split o markdown em blocos estruturais. */
function parseBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n")
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip linhas vazias
    if (!trimmed) {
      i++
      continue
    }

    // Heading ##
    const h2 = trimmed.match(/^##\s+(.+)$/)
    if (h2) {
      blocks.push({ type: "heading", level: 2, text: h2[1] })
      i++
      continue
    }
    // Heading ###
    const h3 = trimmed.match(/^###\s+(.+)$/)
    if (h3) {
      blocks.push({ type: "heading", level: 3, text: h3[1] })
      i++
      continue
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      const buf: string[] = []
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        buf.push(lines[i].trim().replace(/^>\s+/, ""))
        i++
      }
      blocks.push({ type: "blockquote", text: buf.join(" ") })
      continue
    }

    // Tabela: linha com | e próxima linha com --- |
    if (trimmed.includes("|") && i + 1 < lines.length && /^\s*\|?[\s:-|]+\|/.test(lines[i + 1])) {
      const headerCells = trimmed.split("|").map(s => s.trim()).filter(Boolean)
      i += 2 // pula header + separador
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().includes("|")) {
        const cells = lines[i].trim().split("|").map(s => s.trim()).filter(Boolean)
        if (cells.length > 0) rows.push(cells)
        i++
      }
      blocks.push({ type: "table", headers: headerCells, rows })
      continue
    }

    // Lista não-ordenada
    if (/^-\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^-\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^-\s+/, ""))
        i++
      }
      blocks.push({ type: "bullet", items, ordered: false })
      continue
    }

    // Lista ordenada
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""))
        i++
      }
      blocks.push({ type: "bullet", items, ordered: true })
      continue
    }

    // Parágrafo (junta linhas contíguas até vazia ou próximo bloco)
    const buf: string[] = [trimmed]
    i++
    while (i < lines.length && lines[i].trim() && !/^(#{2,3}\s|>|-\s|\d+\.\s|\|)/.test(lines[i].trim())) {
      buf.push(lines[i].trim())
      i++
    }
    blocks.push({ type: "paragraph", text: buf.join(" ") })
  }
  return blocks
}

// ─────────────────────────────────────────────────────────────────────────
// Detecção de conteúdo especial dentro de bullets
// ─────────────────────────────────────────────────────────────────────────

/** Se o item é um artigo (formato: "Autor et al. **Título.** Journal, Ano. DOI: [...]") */
function isArticleItem(text: string): boolean {
  return /DOI:?\s*(\[|10\.)/i.test(text) || /doi\.org/i.test(text)
}

/** Extrai partes de um bullet de artigo. */
function parseArticleItem(text: string): {
  authors: string
  title: string
  journal: string
  year: string
  doiLabel: string | null
  doiUrl: string | null
  extra: string
} {
  // Título vem em **bold**
  const titleMatch = text.match(/\*\*([^*]+)\*\*/)
  const title = titleMatch ? titleMatch[1] : text
  const beforeTitle = titleMatch ? text.slice(0, titleMatch.index) : ""
  const afterTitle = titleMatch ? text.slice(titleMatch.index! + titleMatch[0].length) : ""

  const authors = beforeTitle.trim().replace(/\.\s*$/, "")

  // Journal em *italic* após o título
  const journalMatch = afterTitle.match(/\*([^*]+)\*/)
  const journal = journalMatch ? journalMatch[1] : ""

  // Ano (4 dígitos após vírgula)
  const yearMatch = afterTitle.match(/(\d{4})/)
  const year = yearMatch ? yearMatch[1] : ""

  // DOI link [10.xxx](url)
  const doiLinkMatch = afterTitle.match(/\[(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)\]\(([^)]+)\)/i)
  const doiLabel = doiLinkMatch ? doiLinkMatch[1] : null
  const doiUrl = doiLinkMatch ? doiLinkMatch[2] : null

  // "extra" é o que sobra depois de tudo (— explicação curta)
  const extra = afterTitle.replace(/^\.\s*/, "").replace(/\*[^*]+\*/, "").replace(/\d{4}/, "").replace(/\[[^\]]+\]\([^)]+\)/, "").replace(/DOI:?/i, "").replace(/[.,\s]+/g, " ").trim()

  return { authors, title, journal, year, doiLabel, doiUrl, extra }
}

// ─────────────────────────────────────────────────────────────────────────
// Componentes visuais
// ─────────────────────────────────────────────────────────────────────────

function SectionHeader({ kind, text }: { kind: SectionKind; text: string }) {
  const Icon = iconForSection(kind)
  const colors = colorForSection(kind)

  // Remove emoji prefixo se houver (fica no ícone)
  const cleanText = text.replace(/^(📄|🎓|🚀|⚠️|💡|🔀|🧭|📘|🧪)\s*/, "")

  return (
    <div className="flex items-center gap-3 pt-8 pb-3">
      <div className={`w-10 h-10 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${colors.text}`} />
      </div>
      <div className="flex-1">
        <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
          {cleanText}
        </h2>
        <div className={`h-0.5 w-16 mt-2 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-transparent`} />
      </div>
    </div>
  )
}

function SubHeader({ text }: { text: string }) {
  const cleanText = text.replace(/^(🌍|🇧🇷|📄|🎓|🚀|⚠️|💡|🔀)\s*/, "")
  const emojiPrefix = text.match(/^(🌍|🇧🇷|📄|🎓|🚀|⚠️|💡|🔀)/)?.[0] ?? ""
  return (
    <h3 className="text-base sm:text-lg font-bold text-white pt-4 pb-2 flex items-center gap-2">
      {emojiPrefix && <span className="text-xl">{emojiPrefix}</span>}
      <span>{cleanText}</span>
    </h3>
  )
}

function Paragraph({ text }: { text: string }) {
  return (
    <p className="text-[15px] leading-[1.75] text-gray-200 dark:text-gray-200 mb-4">
      <InlineRun nodes={parseInline(text)} />
    </p>
  )
}

function Blockquote({ text }: { text: string }) {
  return (
    <blockquote className="my-5 pl-5 pr-4 py-3 border-l-4 border-fuchsia-500 bg-fuchsia-500/[0.06] rounded-r-lg">
      <p className="text-[15px] leading-[1.75] text-fuchsia-100 italic">
        <InlineRun nodes={parseInline(text)} />
      </p>
    </blockquote>
  )
}

function BulletList({ items, ordered }: { items: string[]; ordered: boolean }) {
  const Tag = ordered ? "ol" : "ul"
  return (
    <Tag className={`space-y-2 mb-5 ${ordered ? "list-decimal" : "list-none"} pl-1`}>
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-[15px] leading-[1.7] text-gray-200">
          {ordered ? (
            <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/40 text-[11px] font-bold text-violet-200">
              {i + 1}
            </span>
          ) : (
            <span className="shrink-0 mt-2.5 w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
          )}
          <div className="flex-1">
            <InlineRun nodes={parseInline(item)} />
          </div>
        </li>
      ))}
    </Tag>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-white/[0.08]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-violet-600/40 to-fuchsia-600/40 border-b border-white/[0.08]">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white">
                <InlineRun nodes={parseInline(h)} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-white/[0.02]" : "bg-white/[0.005]"}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-3 text-gray-200 align-top">
                  <InlineRun nodes={parseInline(cell)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

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
          <h4 className="text-[15px] font-semibold text-white leading-snug mb-1">
            {parsed.title}
          </h4>
          {parsed.journal && (
            <p className="text-xs italic text-gray-400 mb-2">
              📰 {parsed.journal}
            </p>
          )}
          {parsed.extra && (
            <p className="text-xs text-gray-400 mb-2">{parsed.extra}</p>
          )}
          {parsed.doiUrl && parsed.doiLabel && (
            <a
              href={parsed.doiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-fuchsia-300 hover:text-fuchsia-200 border border-fuchsia-500/30 hover:border-fuchsia-500/50 hover:bg-fuchsia-500/10 rounded-lg px-2.5 py-1.5 transition-all"
            >
              <ExternalLink className="w-3 h-3" />
              DOI: {parsed.doiLabel}
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

function ConferenceCard({ item, region }: { item: string; region: "int" | "nat" }) {
  // Extrai o nome antes do "—"
  const parts = item.split(/\s*[—–-]\s+/)
  const nameRaw = parts[0]
  const desc = parts.slice(1).join(" — ")

  // Nome geralmente em **bold**
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
          <p className="text-sm font-bold text-white leading-tight mb-1">
            <InlineRun nodes={parseInline(name)} />
          </p>
          {desc && (
            <p className="text-[11px] text-gray-400 leading-relaxed">
              <InlineRun nodes={parseInline(desc)} />
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function MistakeCallout({ items }: { items: string[] }) {
  return (
    <div className="my-4 rounded-xl border-2 border-rose-500/30 bg-gradient-to-br from-rose-500/[0.08] to-red-500/[0.02]">
      <div className="px-4 py-2.5 border-b border-rose-500/25 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-rose-300" />
        <p className="text-xs font-bold uppercase tracking-widest text-rose-200">
          Atenção · Erros que geram problemas reais
        </p>
      </div>
      <ul className="p-4 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-[14px] leading-[1.6] text-rose-50">
            <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500/20 border border-rose-500/40 text-[10px] font-bold text-rose-200">
              {i + 1}
            </span>
            <div className="flex-1">
              <InlineRun nodes={parseInline(item)} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Renderizador de seção especial
// ─────────────────────────────────────────────────────────────────────────

/** Agrupa blocos por seção (heading H2 até próximo H2). */
type Section = { kind: SectionKind; heading: string; blocks: Block[] }

function groupIntoSections(blocks: Block[]): Section[] {
  const sections: Section[] = []
  let current: Section | null = null

  for (const b of blocks) {
    if (b.type === "heading" && b.level === 2) {
      if (current) sections.push(current)
      current = { kind: detectSectionKind(b.text), heading: b.text, blocks: [] }
    } else {
      if (!current) {
        // Conteúdo antes do primeiro H2 (raro) — vira uma seção "intro"
        current = { kind: "generic", heading: "", blocks: [] }
      }
      current.blocks.push(b)
    }
  }
  if (current) sections.push(current)
  return sections
}

function renderGenericBlock(block: Block, idx: number, sectionKind: SectionKind): React.ReactNode {
  if (block.type === "heading") {
    return block.level === 3 ? <SubHeader key={idx} text={block.text} /> : null
  }
  if (block.type === "paragraph") return <Paragraph key={idx} text={block.text} />
  if (block.type === "blockquote") return <Blockquote key={idx} text={block.text} />
  if (block.type === "bullet") return <BulletList key={idx} items={block.items} ordered={block.ordered} />
  if (block.type === "table") return <Table key={idx} headers={block.headers} rows={block.rows} />
  return null
}

function renderArticlesSection(section: Section): React.ReactNode {
  return section.blocks.map((b, i) => {
    if (b.type === "bullet") {
      return (
        <div key={i} className="mt-2">
          {b.items.map((item, j) => (
            isArticleItem(item)
              ? <ArticleCard key={j} item={item} />
              : <BulletList key={j} items={[item]} ordered={false} />
          ))}
        </div>
      )
    }
    if (b.type === "heading" && b.level === 3) return <SubHeader key={i} text={b.text} />
    return renderGenericBlock(b, i, section.kind)
  })
}

function renderConferencesSection(section: Section): React.ReactNode {
  // Detecta subheaders "Internacionais" / "Nacionais" para agrupar
  const groups: { title: string; region: "int" | "nat"; items: string[] }[] = []
  let currentGroup: { title: string; region: "int" | "nat"; items: string[] } | null = null

  for (const b of section.blocks) {
    if (b.type === "heading" && b.level === 3) {
      const region: "int" | "nat" = /internacio|🌍/i.test(b.text) ? "int" : "nat"
      if (currentGroup) groups.push(currentGroup)
      currentGroup = { title: b.text, region, items: [] }
    } else if (b.type === "bullet") {
      if (!currentGroup) currentGroup = { title: "", region: "int", items: [] }
      currentGroup.items.push(...b.items)
    } else if (b.type === "paragraph") {
      // Alguns têm "**Internacionais:**" como parágrafo
      if (/\bnacional|🇧🇷|latam|LatAm/i.test(b.text)) {
        if (currentGroup) groups.push(currentGroup)
        currentGroup = { title: b.text.replace(/\*/g, ""), region: "nat", items: [] }
      } else if (/\binternacio|🌍/i.test(b.text)) {
        if (currentGroup) groups.push(currentGroup)
        currentGroup = { title: b.text.replace(/\*/g, ""), region: "int", items: [] }
      }
    }
  }
  if (currentGroup) groups.push(currentGroup)

  // Se não conseguiu agrupar (fallback), joga tudo como internacional
  if (groups.length === 0) {
    const allItems: string[] = []
    for (const b of section.blocks) {
      if (b.type === "bullet") allItems.push(...b.items)
    }
    groups.push({ title: "Congressos e sociedades", region: "int", items: allItems })
  }

  return (
    <div className="space-y-5">
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.title && <SubHeader text={g.title} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {g.items.map((item, i) => (
              <ConferenceCard key={i} item={item} region={g.region} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function renderMistakesSection(section: Section): React.ReactNode {
  const items: string[] = []
  const others: Block[] = []
  for (const b of section.blocks) {
    if (b.type === "bullet") items.push(...b.items)
    else others.push(b)
  }
  return (
    <>
      {others.map((b, i) => renderGenericBlock(b, i, section.kind))}
      {items.length > 0 && <MistakeCallout items={items} />}
    </>
  )
}

function renderSection(section: Section, key: number): React.ReactNode {
  const showHeader = section.heading.length > 0
  return (
    <section key={key} data-section-kind={section.kind}>
      {showHeader && <SectionHeader kind={section.kind} text={section.heading} />}
      <div className="pl-0 sm:pl-[52px]">
        {section.kind === "articles" && renderArticlesSection(section)}
        {section.kind === "conferences" && renderConferencesSection(section)}
        {section.kind === "mistakes" && renderMistakesSection(section)}
        {section.kind !== "articles" &&
          section.kind !== "conferences" &&
          section.kind !== "mistakes" &&
          section.blocks.map((b, i) => renderGenericBlock(b, i, section.kind))}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Componente público
// ─────────────────────────────────────────────────────────────────────────

export function RichLessonContent({ markdown }: { markdown: string }) {
  const sections = useMemo(() => {
    const blocks = parseBlocks(markdown)
    return groupIntoSections(blocks)
  }, [markdown])

  const wordCount = useMemo(
    () => markdown.split(/\s+/).filter(Boolean).length,
    [markdown],
  )
  const readMinutes = Math.max(1, Math.round(wordCount / 200))

  return (
    <article
      data-testid="rich-lesson-content"
      className="rich-lesson-content"
    >
      {/* Metadata do conteúdo (palavras + tempo de leitura) */}
      <div className="flex items-center gap-4 mb-6 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" />
          {wordCount.toLocaleString("pt-BR")} palavras
        </span>
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          ~{readMinutes} min de leitura
        </span>
      </div>

      {sections.map((s, i) => renderSection(s, i))}
    </article>
  )
}
