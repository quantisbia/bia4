/**
 * R30 · Validação A1–A5 do parser contra TODAS as aulas do banco.
 *
 *   NODE_OPTIONS=--max-old-space-size=500 npx tsx --env-file=.env.local scripts/validate-lesson-markdown.ts
 *
 * Para cada aula com summary:
 *  A1  nº de <table> parseadas == nº de separadores markdown
 *  A2  todas as linhas de cada tabela têm o nº de colunas do cabeçalho
 *  A3  nenhum parágrafo contém "|" de tabela perdida (linha com ≥2 pipes)
 *  A4  nenhuma sequência de listas ordenadas consecutivas com 1 item (fragmentação)
 *  A5  round-trip textual: todo token (≥4 chars, sem pontuação markdown) do
 *      markdown aparece no texto dos blocos
 * Sai com código 1 se qualquer verificação falhar.
 */
import { prisma } from "../src/lib/db/prisma"
import { parseLessonMarkdown, countMarkdownTables, blockText } from "../src/lib/academy/lesson-markdown"

async function main() {
  const lessons = await prisma.academyLesson.findMany({
    where: { summary: { not: null } },
    select: { id: true, slug: true, title: true, summary: true, module: { select: { slug: true, order: true } } },
    orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
  })
  let fails = 0
  let totalTables = 0
  for (const l of lessons) {
    const md = l.summary ?? ""
    const p = parseLessonMarkdown(md)
    const blocks = p.sections.flatMap(s => s.blocks)
    const problems: string[] = []

    // A1
    const expected = countMarkdownTables(md)
    if (p.tableCount !== expected) problems.push(`A1 tabelas ${p.tableCount} ≠ ${expected}`)
    totalTables += p.tableCount

    // A2
    for (const b of blocks) if (b.type === "table") {
      const bad = b.rows.filter(r => r.length !== b.headers.length).length
      if (bad) problems.push(`A2 ${bad} linha(s) com nº de colunas ≠ ${b.headers.length}`)
    }

    // A3
    for (const b of blocks) if (b.type === "paragraph" && (b.text.match(/\|/g) || []).length >= 2 && /\|\s*[-:]{3,}/.test(b.text)) {
      problems.push(`A3 parágrafo com tabela perdida: "${b.text.slice(0, 60)}…"`)
    }

    // A4
    for (const s of p.sections) {
      let run = 0
      for (const b of s.blocks) {
        if (b.type === "list" && b.ordered && b.items.length === 1) run++
        else run = 0
        if (run >= 2) { problems.push(`A4 listas ordenadas fragmentadas em "${s.title}"`); break }
      }
    }

    // A5
    const all = blocks.map(blockText).join(" ") + " " + p.sections.map(s => s.title).join(" ")
    const toks = new Set(md.replace(/\[([^\]]+)\]\([^)]+\)/g, " $1 ").replace(/https?:\/\/\S+/g, " ").replace(/[*`'|#>\[\]()\\_~]/g, " ").split(/\s+/).filter(w => w.length >= 4))
    const missing = [...toks].filter(w => !all.includes(w))
    if (missing.length) problems.push(`A5 ${missing.length} token(s) ausentes: ${missing.slice(0, 5).join(", ")}`)

    const tag = `M${String(l.module.order).padStart(2, "0")} ${l.slug}`
    if (problems.length) { fails++; console.log(`✗ ${tag}\n   ${problems.join("\n   ")}`) }
    else console.log(`✓ ${tag} · ${p.sections.length} seções · ${p.tableCount} tabelas · ${p.wordCount} palavras`)
  }
  console.log(`\n${lessons.length} aulas · ${totalTables} tabelas · ${fails} com problemas`)
  process.exitCode = fails ? 1 : 0
}
main().finally(() => prisma.$disconnect())
