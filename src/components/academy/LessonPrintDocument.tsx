/**
 * BIA · Academy · LessonPrintDocument — R30
 *
 * Documento integral da aula para impressão / "Salvar como PDF".
 * Server component (sem interatividade): todas as seções expandidas,
 * capa, sumário, tabelas completas com <thead> repetido entre páginas,
 * títulos presos ao conteúdo seguinte, rodapé institucional.
 *
 * NÃO é a interface com accordions fechados: usa o mesmo parser
 * (lesson-markdown.ts) e uma camada de apresentação própria, clara,
 * com a paleta Quantis (violeta/roxo + cinzas).
 *
 * Estilos: src/app/academy/(print)/print.css (importado pela página).
 */
import {
  parseLessonMarkdown, parseInline, isArticleItem, parseArticleItem,
  type InlineNode, type Block, type ListItem, type Section,
} from "@/lib/academy/lesson-markdown"

export type LessonPrintData = {
  module: { order: number; title: string }
  lesson: {
    order: number
    title: string
    objective: string | null
    summary: string
    durationMin: number
    level: string
    youtubeId: string | null
  }
  student?: { name: string | null; email: string | null } | null
  generatedAt: Date
  siteUrl: string
}

const LEVEL_PT: Record<string, string> = { basic: "Básico", intermediate: "Intermediário", advanced: "Avançado" }

function Inline({ text }: { text: string }) {
  return <InlineNodes nodes={parseInline(text)} />
}

function InlineNodes({ nodes }: { nodes: InlineNode[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        if (n.type === "text") return <span key={i}>{n.value}</span>
        if (n.type === "bold") return <strong key={i}>{n.value}</strong>
        if (n.type === "italic") return <em key={i}>{n.value}</em>
        if (n.type === "code") return <code key={i}>{n.value}</code>
        if (n.type === "link") return <a key={i} href={n.href}>{n.label}</a>
        return null
      })}
    </>
  )
}

function List({ items, ordered, start = 1 }: { items: ListItem[]; ordered: boolean; start?: number }) {
  const Tag = ordered ? "ol" : "ul"
  return (
    <Tag start={ordered ? start : undefined}>
      {items.map((it, i) => (
        <li key={i}>
          <Inline text={it.text} />
          {it.children && it.children.length > 0 && <List items={it.children} ordered={false} />}
        </li>
      ))}
    </Tag>
  )
}

function Article({ text }: { text: string }) {
  const a = parseArticleItem(text)
  return (
    <li className="print-article">
      <span className="print-article-authors">{a.authors}{a.year ? ` (${a.year})` : ""}.</span>{" "}
      <span className="print-article-title">{a.title}</span>
      {a.journal && <> <em>{a.journal}</em>.</>}
      {a.extra && <> {a.extra}</>}
      {a.doiUrl && a.doiLabel && <> DOI: <a href={a.doiUrl} className="print-doi">{a.doiLabel}</a></>}
    </li>
  )
}

function renderBlock(b: Block, i: number, section: Section, subIdx: { n: number }) {
  switch (b.type) {
    case "heading": {
      const sub = section.subsections[subIdx.n++]
      const Tag = b.level === 4 ? "h4" : "h3"
      return <Tag key={i} id={sub?.id}><Inline text={b.text.replace(/^(🌍|🇧🇷|📄|🎓|🚀|⚠️|💡|🔀)\s*/, "")} /></Tag>
    }
    case "paragraph":
      if (section.kind === "articles" && isArticleItem(b.text)) {
        const a = parseArticleItem(b.text)
        return (
          <p key={i} className="print-article">
            <span className="print-article-authors">{a.authors}{a.year ? ` (${a.year})` : ""}.</span>{" "}
            <span className="print-article-title">{a.title}.</span>
            {a.journal && <> <em>{a.journal}</em>.</>}
            {a.doiUrl && a.doiLabel && <> DOI: <a href={a.doiUrl} className="print-doi">{a.doiLabel}</a></>}
          </p>
        )
      }
      // Rótulo curto em negrito terminado em ":" (ex.: "**Internacionais:**") → subtítulo preso ao conteúdo seguinte
      if (/^\*\*[^*]{1,60}:\*\*$/.test(b.text.trim())) return <h4 key={i} className="print-label"><Inline text={b.text} /></h4>
      return <p key={i}><Inline text={b.text} /></p>
    case "blockquote": return <blockquote key={i}><Inline text={b.text} /></blockquote>
    case "code": return <pre key={i} data-lang={b.lang ?? undefined}><code>{b.text}</code></pre>
    case "hr": return <hr key={i} />
    case "list": {
      if (section.kind === "articles" && b.items.some(it => isArticleItem(it.text))) {
        return (
          <ol key={i} className="print-articles">
            {b.items.map((it, j) => isArticleItem(it.text)
              ? <Article key={j} text={it.text} />
              : <li key={j}><Inline text={it.text} /></li>)}
          </ol>
        )
      }
      return <List key={i} items={b.items} ordered={b.ordered} start={b.start} />
    }
    case "table": {
      const cols = b.headers.length
      return (
        <div key={i} className="print-table-wrap" data-cols={cols}>
          <table>
            <thead>
              <tr>{b.headers.map((h, j) => <th key={j} style={b.align[j] ? { textAlign: b.align[j]! } : undefined}><Inline text={h} /></th>)}</tr>
            </thead>
            <tbody>
              {b.rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => <td key={ci} style={b.align[ci] ? { textAlign: b.align[ci]! } : undefined}>{c ? <Inline text={c} /> : "—"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
  }
}

export function LessonPrintDocument({ data }: { data: LessonPrintData }) {
  const parsed = parseLessonMarkdown(data.lesson.summary)
  const { sections } = parsed
  const dateStr = data.generatedAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
  const code = `M${String(data.module.order).padStart(2, "0")} · Aula ${data.module.order}.${data.lesson.order}`

  return (
    <div className="print-doc" data-testid="lesson-print-document">
      {/* Capa */}
      <header className="print-cover">
        <div className="print-brand">
          <span className="print-brand-mark">B</span>
          <span>
            <strong>BIA Academy</strong>
            <small>Quantis Biotechnology · biaquantis.bio</small>
          </span>
        </div>
        <p className="print-kicker">Material complementar · {code}</p>
        <h1>{data.lesson.title}</h1>
        <p className="print-module">Módulo {data.module.order} · {data.module.title}</p>
        <dl className="print-meta">
          <div><dt>Duração da aula</dt><dd>{data.lesson.durationMin} min</dd></div>
          <div><dt>Nível</dt><dd>{LEVEL_PT[data.lesson.level] ?? data.lesson.level}</dd></div>
          <div><dt>Leitura</dt><dd>~{parsed.readMinutes} min · {parsed.wordCount.toLocaleString("pt-BR")} palavras</dd></div>
          <div><dt>Seções</dt><dd>{sections.length}{parsed.tableCount ? ` · ${parsed.tableCount} tabelas` : ""}</dd></div>
        </dl>
        {data.lesson.objective && (
          <div className="print-objective">
            <p className="print-objective-label">Objetivo desta aula</p>
            <p>{data.lesson.objective}</p>
          </div>
        )}
        <p className="print-cover-foot">
          Gerado em {dateStr}{data.student?.name ? ` para ${data.student.name}` : ""}. Material exclusivo para alunos matriculados — não redistribuir.
        </p>
      </header>

      {/* Sumário */}
      {sections.length > 1 && (
        <nav className="print-toc" aria-label="Sumário">
          <h2>Sumário</h2>
          <ol>
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`}><span className="print-toc-n">{i + 1}</span> {s.title}</a>
                {s.subsections.length > 0 && (
                  <ol>
                    {s.subsections.filter(ss => ss.level === 3).map(ss => (
                      <li key={ss.id}><a href={`#${ss.id}`}>{ss.title}</a></li>
                    ))}
                  </ol>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Conteúdo integral */}
      <main className="print-body">
        {sections.map((s, si) => {
          const subIdx = { n: 0 }
          return (
            <section key={s.id} id={s.id} className="print-section" data-kind={s.kind}>
              <h2><span className="print-h2-n">{si + 1}</span>{s.title}</h2>
              {s.blocks.map((b, i) => renderBlock(b, i, s, subIdx))}
            </section>
          )
        })}
      </main>

      <footer className="print-end">
        <p><strong>BIA Academy</strong> · Quantis Biotechnology · {data.siteUrl.replace(/^https?:\/\//, "")}</p>
        <p>{code} · {data.lesson.title}</p>
      </footer>
    </div>
  )
}
