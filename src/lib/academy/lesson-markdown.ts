/**
 * BIA · Academy · lesson-markdown — R30
 *
 * Parser puro (sem React, sem dependências) do markdown dos resumos de aula.
 * Substitui o parser embutido do RichLessonContent (R13.13), corrigindo:
 *  - tabelas nunca reconhecidas (regex do separador não casava o hífen);
 *  - células vazias descartadas (colunas deslocadas);
 *  - listas numeradas separadas por linha em branco viravam N listas "1.";
 *  - blocos de código com ''' (seed) e ``` não reconhecidos;
 *  - `\|` escapado dentro de células.
 *
 * Também expõe a estrutura de seções (H2) usada pelo Accordion, pelo
 * sumário ("Neste material") e pela rota de impressão/PDF.
 *
 * Garantia de preservação: todo texto do markdown aparece em algum nó
 * (texto, célula, item, código). Nada é descartado silenciosamente.
 */

// ─────────────────────────────────────────────────────────────────────────
// Inline
// ─────────────────────────────────────────────────────────────────────────

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "code"; value: string }
  | { type: "link"; label: string; href: string }

/**
 * Parser inline: **bold**, *italic*, `code`, 'code' (aspas simples usadas no
 * seed), [label](url). Aspas simples só viram código quando delimitam um
 * trecho curto sem espaços nas bordas e com fronteira de palavra fora.
 */
export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = []
  const pattern =
    /(\*\*([^*]+?)\*\*)|(\*([^*\s][^*]*?)\*)|(`([^`]+)`)|((?<![\p{L}\p{N}])'([^'\s][^'\n]{0,78}[^'\s]|[^'\s])'(?![\p{L}\p{N}]))|(\[([^\]]+)\]\(([^)\s]+)\))/gu
  let lastIdx = 0
  let m: RegExpExecArray | null
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > lastIdx) nodes.push({ type: "text", value: text.slice(lastIdx, m.index) })
    if (m[2] !== undefined) nodes.push({ type: "bold", value: m[2] })
    else if (m[4] !== undefined) nodes.push({ type: "italic", value: m[4] })
    else if (m[6] !== undefined) nodes.push({ type: "code", value: m[6] })
    else if (m[8] !== undefined) nodes.push({ type: "code", value: m[8] })
    else if (m[9] !== undefined) nodes.push({ type: "link", label: m[10], href: m[11] })
    lastIdx = m.index + m[0].length
  }
  if (lastIdx < text.length) nodes.push({ type: "text", value: text.slice(lastIdx) })
  return nodes
}

/** Texto plano de uma sequência inline (para sumário, aria-label, testes). */
export function inlineToText(nodes: InlineNode[]): string {
  return nodes.map(n => (n.type === "link" ? n.label : n.value)).join("")
}

export function stripInline(text: string): string {
  return inlineToText(parseInline(text))
}

// ─────────────────────────────────────────────────────────────────────────
// Blocos
// ─────────────────────────────────────────────────────────────────────────

export type TableAlign = "left" | "center" | "right" | null

export type ListItem = { text: string; children?: ListItem[] }

export type Block =
  | { type: "heading"; level: 2 | 3 | 4; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; start: number; items: ListItem[] }
  | { type: "table"; headers: string[]; align: TableAlign[]; rows: string[][] }
  | { type: "blockquote"; text: string }
  | { type: "code"; lang: string | null; text: string }
  | { type: "hr" }

const FENCE_RE = /^(```|''')\s*([\w+-]*)\s*$/
const HR_RE = /^(-{3,}|\*{3,}|_{3,})\s*$/
const UL_RE = /^(\s*)[-*•]\s+(.*)$/
const OL_RE = /^(\s*)(\d+)[.)]\s+(.*)$/
/** Linha separadora de tabela GitHub: |---|:---:|---| (pipes externos opcionais). */
const TABLE_SEP_RE = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/

function isTableSeparator(line: string): boolean {
  return TABLE_SEP_RE.test(line) && line.includes("-")
}

/** Divide uma linha de tabela em células, respeitando `\|` escapado e mantendo vazias. */
export function splitTableRow(line: string): string[] {
  let s = line.trim()
  if (s.startsWith("|")) s = s.slice(1)
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1)
  const cells: string[] = []
  let buf = ""
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch === "\\" && s[i + 1] === "|") { buf += "|"; i++; continue }
    if (ch === "|") { cells.push(buf.trim()); buf = ""; continue }
    buf += ch
  }
  cells.push(buf.trim())
  return cells
}

function parseAlign(sepLine: string, n: number): TableAlign[] {
  const cells = splitTableRow(sepLine)
  const out: TableAlign[] = []
  for (let i = 0; i < n; i++) {
    const c = (cells[i] ?? "").trim()
    const l = c.startsWith(":"), r = c.endsWith(":")
    out.push(l && r ? "center" : r ? "right" : l ? "left" : null)
  }
  return out
}

function normalizeRow(cells: string[], n: number): string[] {
  if (cells.length === n) return cells
  if (cells.length > n) {
    // Excesso: junta o que sobra na última coluna (não perde conteúdo)
    return [...cells.slice(0, n - 1), cells.slice(n - 1).join(" | ")]
  }
  return [...cells, ...Array(n - cells.length).fill("")]
}

function indentOf(line: string): number {
  const m = line.match(/^(\s*)/)
  return m ? m[1].replace(/\t/g, "  ").length : 0
}

/** Split o markdown em blocos estruturais. */
export function parseBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n?/g, "\n").split("\n")
  const blocks: Block[] = []
  let i = 0

  const isBlockStart = (t: string) =>
    /^#{2,4}\s/.test(t) || t.startsWith(">") || UL_RE.test(t) || OL_RE.test(t) || FENCE_RE.test(t) || HR_RE.test(t) || t.startsWith("|")

  while (i < lines.length) {
    const raw = lines[i]
    const trimmed = raw.trim()

    if (!trimmed) { i++; continue }

    // Código cercado (``` ou ''')
    const fence = trimmed.match(FENCE_RE)
    if (fence) {
      const marker = fence[1]
      const lang = fence[2] || null
      const buf: string[] = []
      i++
      while (i < lines.length && lines[i].trim() !== marker) { buf.push(lines[i]); i++ }
      i++ // fecha
      blocks.push({ type: "code", lang, text: buf.join("\n").replace(/\s+$/, "") })
      continue
    }

    // Headings (## ### ####). "# " nível 1 é tratado como H2 (resumos não usam H1).
    const h = trimmed.match(/^(#{1,4})\s+(.+?)\s*#*\s*$/)
    if (h) {
      const level = Math.min(4, Math.max(2, h[1].length)) as 2 | 3 | 4
      blocks.push({ type: "heading", level, text: h[2] })
      i++
      continue
    }

    // Régua horizontal (antes de lista para não confundir "---")
    if (HR_RE.test(trimmed)) { blocks.push({ type: "hr" }); i++; continue }

    // Blockquote
    if (trimmed.startsWith(">")) {
      const buf: string[] = []
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        buf.push(lines[i].trim().replace(/^>\s?/, ""))
        i++
      }
      blocks.push({ type: "blockquote", text: buf.join(" ").trim() })
      continue
    }

    // Tabela: linha com | seguida de separador
    if (trimmed.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = splitTableRow(trimmed)
      const n = headers.length
      const align = parseAlign(lines[i + 1], n)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim() && lines[i].includes("|")) {
        rows.push(normalizeRow(splitTableRow(lines[i]), n))
        i++
      }
      blocks.push({ type: "table", headers, align, rows })
      continue
    }

    // Listas (ordenadas / não-ordenadas), com itens separados por linha em
    // branco, linhas de continuação indentadas e um nível de aninhamento.
    const ulm = trimmed.match(UL_RE) ? raw.match(UL_RE) : null
    const olm = !ulm && OL_RE.test(trimmed) ? raw.match(OL_RE) : null
    if (ulm || olm) {
      const ordered = !!olm
      const baseIndent = indentOf(raw)
      const start = ordered ? parseInt(olm![2], 10) || 1 : 1
      const items: ListItem[] = []
      let cur: ListItem | null = null
      let lastWasBlank = false

      while (i < lines.length) {
        const l = lines[i]
        const t = l.trim()
        if (!t) {
          // linha em branco: continua apenas se a próxima não-vazia for item da mesma lista
          let j = i + 1
          while (j < lines.length && !lines[j].trim()) j++
          if (j >= lines.length) break
          const nxt = lines[j]
          const sameList = indentOf(nxt) <= baseIndent + 1 && (ordered ? OL_RE.test(nxt) : UL_RE.test(nxt)) && indentOf(nxt) === baseIndent
          const nestedItem = indentOf(nxt) > baseIndent && (UL_RE.test(nxt) || OL_RE.test(nxt))
          if (!sameList && !nestedItem) break
          lastWasBlank = true
          i = j
          continue
        }
        const ind = indentOf(l)
        const um = l.match(UL_RE), om = l.match(OL_RE)
        const isItem = ordered ? !!om && !um : !!um
        const anyItem = !!um || !!om

        if (anyItem && ind === baseIndent && isItem) {
          cur = { text: (ordered ? om![3] : um![2]).trim() }
          items.push(cur)
          i++; lastWasBlank = false
          continue
        }
        if (anyItem && ind === baseIndent && !isItem) break // lista de outro tipo no mesmo nível
        if (anyItem && ind > baseIndent && cur) {
          // aninhado (1 nível): coleta itens com indent > base
          const children: ListItem[] = []
          while (i < lines.length) {
            const cl = lines[i]; const ct = cl.trim()
            if (!ct) { // permite 1 linha em branco dentro do aninhado
              const j = i + 1
              if (j < lines.length && indentOf(lines[j]) > baseIndent && (UL_RE.test(lines[j]) || OL_RE.test(lines[j]))) { i++; continue }
              break
            }
            if (indentOf(cl) <= baseIndent) break
            const cum = cl.match(UL_RE), com = cl.match(OL_RE)
            if (cum || com) children.push({ text: (cum ? cum[2] : com![3]).trim() })
            else if (children.length) children[children.length - 1].text += " " + ct
            else cur.text += " " + ct
            i++
          }
          cur.children = [...(cur.children ?? []), ...children]
          continue
        }
        if (!anyItem && ind > baseIndent && cur && !lastWasBlank) {
          cur.text += " " + t // continuação indentada
          i++
          continue
        }
        if (!anyItem && ind > baseIndent && cur && lastWasBlank) {
          cur.text += " " + t // parágrafo de continuação indentado
          i++
          continue
        }
        break
      }
      blocks.push({ type: "list", ordered, start, items })
      continue
    }

    // Parágrafo: junta linhas contíguas até vazia ou início de outro bloco
    const buf: string[] = [trimmed]
    i++
    while (i < lines.length) {
      const t = lines[i].trim()
      if (!t || isBlockStart(t)) break
      if (t.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) break
      buf.push(t)
      i++
    }
    blocks.push({ type: "paragraph", text: buf.join(" ") })
  }
  return blocks
}

// ─────────────────────────────────────────────────────────────────────────
// Seções (H2) · tipos · ids
// ─────────────────────────────────────────────────────────────────────────

export type SectionKind =
  | "context" | "concepts" | "distinctions" | "challenges" | "mistakes"
  | "articles" | "researchers" | "conferences" | "next-steps" | "generic"

export function detectSectionKind(heading: string): SectionKind {
  if (/contexto/i.test(heading)) return "context"
  if (/conceitos.chave|conceitos chave/i.test(heading)) return "concepts"
  if (/distin[çc][ãa]o/i.test(heading)) return "distinctions"
  if (/desafios? t[eé]cnicos?|gargalos/i.test(heading)) return "challenges"
  if (/erros? comuns?/i.test(heading)) return "mistakes"
  if (/📄|artigos? recomendados?|refer[êe]ncias?/i.test(heading)) return "articles"
  if (/pesquisadores|grupos de pesquisa/i.test(heading)) return "researchers"
  if (/🎓|congressos?|sociedades|eventos/i.test(heading)) return "conferences"
  if (/🚀|pr[óo]ximos passos/i.test(heading)) return "next-steps"
  return "generic"
}

const LEADING_EMOJI_RE = /^(?:\p{Extended_Pictographic}\uFE0F?|\u{1F1E6}-\u{1F1FF})+\s*/u

/** Remove emoji inicial do título (vai para o ícone). */
export function cleanHeading(text: string): string {
  return stripInline(text).replace(LEADING_EMOJI_RE, "").trim()
}

export function slugify(text: string): string {
  return cleanHeading(text)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "secao"
}

export type Subsection = { id: string; title: string; level: 3 | 4 }

export type Section = {
  id: string
  heading: string       // cru (com emoji / markdown)
  title: string         // limpo
  kind: SectionKind
  blocks: Block[]
  subsections: Subsection[]
  wordCount: number
}

function countWords(s: string): number {
  return s.split(/\s+/).filter(Boolean).length
}

export function blockText(b: Block): string {
  switch (b.type) {
    case "heading": return stripInline(b.text)
    case "paragraph": return stripInline(b.text)
    case "blockquote": return stripInline(b.text)
    case "code": return b.text
    case "hr": return ""
    case "list": {
      const walk = (items: ListItem[]): string => items.map(it => stripInline(it.text) + (it.children ? " " + walk(it.children) : "")).join(" ")
      return walk(b.items)
    }
    case "table": return [b.headers, ...b.rows].map(r => r.map(stripInline).join(" ")).join(" ")
  }
}

/** Agrupa blocos por H2; conteúdo antes do primeiro H2 vira seção "Introdução". */
export function groupIntoSections(blocks: Block[], opts?: { introTitle?: string }): Section[] {
  const sections: Section[] = []
  const used = new Map<string, number>()
  const uniqueId = (base: string) => {
    const n = used.get(base) ?? 0
    used.set(base, n + 1)
    return n === 0 ? base : `${base}-${n + 1}`
  }
  let current: Section | null = null
  const flush = () => { if (current) { current.wordCount = current.blocks.reduce((a, b) => a + countWords(blockText(b)), 0); sections.push(current) } }

  for (const b of blocks) {
    if (b.type === "heading" && b.level === 2) {
      flush()
      current = { id: uniqueId(slugify(b.text)), heading: b.text, title: cleanHeading(b.text), kind: detectSectionKind(b.text), blocks: [], subsections: [], wordCount: 0 }
      continue
    }
    if (!current) {
      current = { id: uniqueId("introducao"), heading: "", title: opts?.introTitle ?? "Introdução", kind: "generic", blocks: [], subsections: [], wordCount: 0 }
    }
    if (b.type === "heading") {
      current.subsections.push({ id: uniqueId(`${current.id}--${slugify(b.text)}`), title: cleanHeading(b.text), level: b.level as 3 | 4 })
    }
    current.blocks.push(b)
  }
  flush()
  return sections
}

export type ParsedLesson = {
  sections: Section[]
  wordCount: number
  readMinutes: number
  tableCount: number
}

export function parseLessonMarkdown(md: string): ParsedLesson {
  const blocks = parseBlocks(md ?? "")
  const sections = groupIntoSections(blocks)
  const wordCount = countWords(md ?? "")
  const tableCount = blocks.filter(b => b.type === "table").length
  return { sections, wordCount, readMinutes: Math.max(1, Math.round(wordCount / 200)), tableCount }
}

/** Nº de separadores de tabela no markdown cru — usado na validação A1. */
export function countMarkdownTables(md: string): number {
  const lines = md.replace(/\r\n?/g, "\n").split("\n")
  let n = 0
  for (let i = 1; i < lines.length; i++) {
    // separador precedido por linha de cabeçalho com "|" (senão é régua "---")
    if (isTableSeparator(lines[i]) && lines[i - 1].includes("|") && lines[i - 1].trim()) n++
  }
  return n
}

// ─────────────────────────────────────────────────────────────────────────
// Itens especiais (artigos) — usados pelo ArticleCard e pela impressão
// ─────────────────────────────────────────────────────────────────────────

/** Se o item é um artigo (formato: "Autor et al. **Título.** *Journal*, Ano. DOI: [...]") */
export function isArticleItem(text: string): boolean {
  return /DOI:?\s*(\[|10\.)/i.test(text) || /doi\.org/i.test(text)
}

export type ParsedArticle = {
  authors: string; title: string; journal: string; year: string
  doiLabel: string | null; doiUrl: string | null; extra: string
}

/** Extrai partes de um bullet de artigo. */
export function parseArticleItem(text: string): ParsedArticle {
  const boldMatch = text.match(/\*\*([^*]+)\*\*/)
  // Variante B (seed das aulas): "**Autores · 2015** Título. 📰 *Journal* DOI: [..](..)"
  const authorYear = boldMatch?.[1].match(/^(.*?)\s*[·•]\s*(\d{4})\s*$/)
  if (boldMatch && authorYear) {
    const after = text.slice(boldMatch.index! + boldMatch[0].length).trim()
    const journalMatch = after.match(/\*([^*]+)\*/)
    const doiLinkMatch = after.match(/\[(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)\]\(([^)]+)\)/i)
    const cut = [after.indexOf("📰"), journalMatch?.index ?? -1, after.search(/DOI:?/i)].filter(n => n >= 0)
    const title = (cut.length ? after.slice(0, Math.min(...cut)) : after).trim().replace(/\.\s*$/, "")
    return {
      authors: authorYear[1].trim(), year: authorYear[2], title,
      journal: journalMatch ? journalMatch[1] : "",
      doiLabel: doiLinkMatch ? doiLinkMatch[1] : null, doiUrl: doiLinkMatch ? doiLinkMatch[2] : null, extra: "",
    }
  }
  const titleMatch = boldMatch
  const title = titleMatch ? titleMatch[1] : text
  const beforeTitle = titleMatch ? text.slice(0, titleMatch.index) : ""
  const afterTitle = titleMatch ? text.slice(titleMatch.index! + titleMatch[0].length) : ""
  const authors = beforeTitle.trim().replace(/\.\s*$/, "")
  const journalMatch = afterTitle.match(/\*([^*]+)\*/)
  const journal = journalMatch ? journalMatch[1] : ""
  const yearMatch = afterTitle.match(/(\d{4})/)
  const year = yearMatch ? yearMatch[1] : ""
  const doiLinkMatch = afterTitle.match(/\[(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)\]\(([^)]+)\)/i)
  const doiLabel = doiLinkMatch ? doiLinkMatch[1] : null
  const doiUrl = doiLinkMatch ? doiLinkMatch[2] : null
  const extra = afterTitle.replace(/^\.\s*/, "").replace(/\*[^*]+\*/, "").replace(/\d{4}/, "").replace(/\[[^\]]+\]\([^)]+\)/, "").replace(/DOI:?/i, "").replace(/[.,\s]+/g, " ").trim()
  return { authors, title, journal, year, doiLabel, doiUrl, extra }
}
