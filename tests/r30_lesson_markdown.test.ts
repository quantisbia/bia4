/**
 * R30 · Parser puro do markdown das aulas (tabelas, listas, código, seções).
 */
import { describe, it, expect } from "vitest"
import {
  parseBlocks, parseInline, parseLessonMarkdown, splitTableRow,
  countMarkdownTables, groupIntoSections, slugify, cleanHeading, blockText,
} from "@/lib/academy/lesson-markdown"

const table = (b: any) => { expect(b.type).toBe("table"); return b }

describe("R30 · tabelas", () => {
  it("A1 reconhece separador |---|---| (bug do parser antigo)", () => {
    const md = "| A | B |\n|---|---|\n| 1 | 2 |"
    const b = parseBlocks(md)
    expect(b).toHaveLength(1)
    const t = table(b[0])
    expect(t.headers).toEqual(["A", "B"])
    expect(t.rows).toEqual([["1", "2"]])
  })

  it("reconhece separador com espaços e sem pipes externos", () => {
    const md = "A | B | C\n--- | --- | ---\nx | y | z"
    const t = table(parseBlocks(md)[0])
    expect(t.headers).toEqual(["A", "B", "C"])
    expect(t.rows[0]).toEqual(["x", "y", "z"])
  })

  it("A2 preserva células vazias e nº de colunas", () => {
    const md = "| A | B | C |\n|---|---|---|\n| 1 |  | 3 |\n| only |\n| a | b | c | d |"
    const t = table(parseBlocks(md)[0])
    expect(t.rows[0]).toEqual(["1", "", "3"])
    expect(t.rows[1]).toEqual(["only", "", ""])
    expect(t.rows[2]).toEqual(["a", "b", "c | d"]) // excesso não é descartado
    for (const r of t.rows) expect(r).toHaveLength(3)
  })

  it("lê alinhamento :---: e respeita \\| escapado", () => {
    const md = "| N | Fórmula | Nota |\n|:---|:---:|---:|\n| 1 | a \\| b | x |"
    const t = table(parseBlocks(md)[0])
    expect(t.align).toEqual(["left", "center", "right"])
    expect(t.rows[0][1]).toBe("a | b")
    expect(splitTableRow("| a \\| b | c |")).toEqual(["a | b", "c"])
  })

  it("A3 tabela imediatamente após parágrafo não vira texto corrido", () => {
    const md = "Veja a tabela:\n| A | B |\n|---|---|\n| 1 | 2 |\nTexto depois."
    const b = parseBlocks(md)
    expect(b.map(x => x.type)).toEqual(["paragraph", "table", "paragraph"])
  })

  it("countMarkdownTables bate com tableCount", () => {
    const md = "| A |\n|---|\n| 1 |\n\ntexto\n\n| B | C |\n|---|---|\n| 2 | 3 |"
    expect(countMarkdownTables(md)).toBe(2)
    expect(parseLessonMarkdown(md).tableCount).toBe(2)
  })

  it("'---' sozinho é régua, não tabela", () => {
    expect(parseBlocks("a\n\n---\n\nb").map(x => x.type)).toEqual(["paragraph", "hr", "paragraph"])
  })
})

describe("R30 · listas", () => {
  it("A4 itens numerados separados por linha em branco formam uma lista 1..n", () => {
    const md = "1. **Um** — x\n\n2. **Dois** — y\n\n3. **Três** — z"
    const b = parseBlocks(md)
    expect(b).toHaveLength(1)
    expect(b[0]).toMatchObject({ type: "list", ordered: true, start: 1 })
    expect((b[0] as any).items).toHaveLength(3)
  })

  it("lista começando em 4 mantém start", () => {
    const b = parseBlocks("4. a\n5. b")[0] as any
    expect(b.start).toBe(4)
  })

  it("aninhamento de 1 nível e continuação indentada", () => {
    const md = "- Pai\n  - filho 1\n  - filho 2\n- Outro\n  continua aqui"
    const b = parseBlocks(md)[0] as any
    expect(b.items).toHaveLength(2)
    expect(b.items[0].children.map((c: any) => c.text)).toEqual(["filho 1", "filho 2"])
    expect(b.items[1].text).toBe("Outro continua aqui")
  })

  it("lista não-ordenada seguida de ordenada são blocos distintos", () => {
    const b = parseBlocks("- a\n- b\n1. c\n2. d")
    expect(b.map(x => x.type)).toEqual(["list", "list"])
    expect((b[0] as any).ordered).toBe(false)
    expect((b[1] as any).ordered).toBe(true)
  })
})

describe("R30 · código e inline", () => {
  it("bloco cercado com ''' (seed) e ``` preserva linhas e setas", () => {
    const md = "'''\n1. CAD\n   ↓\n2. STL\n'''\n\n```bash\nG1 X10\n```"
    const b = parseBlocks(md)
    expect(b.map(x => x.type)).toEqual(["code", "code"])
    expect((b[0] as any).text).toBe("1. CAD\n   ↓\n2. STL")
    expect((b[1] as any).lang).toBe("bash")
  })

  it("inline: **bold**, *italic*, `code`, 'code', [link](url)", () => {
    const n = parseInline("Use **GelMA** com *cuidado*: `G92 E0` e 'M83' — ver [DOI](https://doi.org/10.1/x).")
    expect(n.filter(x => x.type === "bold").map((x: any) => x.value)).toEqual(["GelMA"])
    expect(n.filter(x => x.type === "italic").map((x: any) => x.value)).toEqual(["cuidado"])
    expect(n.filter(x => x.type === "code").map((x: any) => x.value)).toEqual(["G92 E0", "M83"])
    expect(n.find(x => x.type === "link")).toMatchObject({ label: "DOI", href: "https://doi.org/10.1/x" })
  })

  it("apóstrofos em palavras não viram código", () => {
    const n = parseInline("O'Brien et al. e d'água não são código")
    expect(n.some(x => x.type === "code")).toBe(false)
  })

  it("A5 fórmulas e unidades preservadas literalmente", () => {
    const md = "τ = (ΔP × r) / (2 × L); 25G (260 μm) → ~200 μm; 4-37°C; <±0,5 kPa; CaCl₂; 10⁻³"
    const b = parseBlocks(md)[0] as any
    expect(blockText(b)).toBe(md)
  })
})

describe("R30 · seções (accordion / sumário / print)", () => {
  const md = [
    "Intro sem título.",
    "## Contexto",
    "p1",
    "### Fluxo",
    "p2",
    "## 📄 Artigos recomendados",
    "- A **T.** *J*, 2020. DOI: [10.1/x](https://doi.org/10.1/x)",
    "## Contexto",
    "dup",
  ].join("\n")

  it("agrupa por H2, cria Introdução para conteúdo inicial e ids únicos", () => {
    const s = groupIntoSections(parseBlocks(md))
    expect(s.map(x => x.id)).toEqual(["introducao", "contexto", "artigos-recomendados", "contexto-2"])
    expect(s[1].kind).toBe("context")
    expect(s[2].kind).toBe("articles")
    expect(s[2].title).toBe("Artigos recomendados") // emoji removido
    expect(s[1].subsections).toEqual([{ id: "contexto--fluxo", title: "Fluxo", level: 3 }])
  })

  it("slugify/cleanHeading lidam com acentos, emoji e markdown", () => {
    expect(slugify("## Distinções que geram confusão (atenção!)".replace(/^## /, ""))).toBe("distincoes-que-geram-confusao-atencao")
    expect(cleanHeading("🚀 **Próximos** passos")).toBe("Próximos passos")
  })

  it("parseLessonMarkdown retorna contagens", () => {
    const p = parseLessonMarkdown(md)
    expect(p.sections).toHaveLength(4)
    expect(p.wordCount).toBeGreaterThan(5)
    expect(p.readMinutes).toBe(1)
    expect(p.sections[1].wordCount).toBe(3) // p1 Fluxo p2
  })

  it("markdown vazio não quebra", () => {
    expect(parseLessonMarkdown("").sections).toEqual([])
  })
})

describe("R30 · artigos em parágrafo (variante do seed)", () => {
  it("parseArticleItem extrai autores/ano/título/journal/DOI do formato **Autores · Ano**", async () => {
    const { parseArticleItem, isArticleItem } = await import("@/lib/academy/lesson-markdown")
    const t = "**Hinton TJ et al. · 2015** Three-dimensional printing of complex biological structures (FRESH). 📰 *Science Advances* DOI: [10.1126/sciadv.1500758](https://doi.org/10.1126/sciadv.1500758)"
    expect(isArticleItem(t)).toBe(true)
    const a = parseArticleItem(t)
    expect(a.authors).toBe("Hinton TJ et al.")
    expect(a.year).toBe("2015")
    expect(a.title).toBe("Three-dimensional printing of complex biological structures (FRESH)")
    expect(a.journal).toBe("Science Advances")
    expect(a.doiLabel).toBe("10.1126/sciadv.1500758")
    expect(a.doiUrl).toBe("https://doi.org/10.1126/sciadv.1500758")
  })
})
