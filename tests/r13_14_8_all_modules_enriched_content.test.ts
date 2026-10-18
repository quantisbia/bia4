/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R13.14.8 — Conteúdo denso didático de TODOS os módulos (M02-M11)
 *  ─────────────────────────────────────────────────────────────────────
 *  DECISÃO (Janaina, 2026-10-18):
 *   O Módulo 1 virou template-ouro em R13.12. Essa release replica a
 *   mesma qualidade em TODOS os módulos publicados (M02 Biomateriais,
 *   M03 Biotintas, M04 Bioimpressão, M05 Arquitetura, M06 Células [2
 *   aulas], M07 Tecidos, M08 Organoides, M09 Avaliação, M11
 *   Desenvolvimento de Projeto).
 *
 *  ESTE ARQUIVO TRAVA o CÓDIGO-FONTE dos scripts enrich-m0X-*.ts para que
 *  qualquer PR futuro que reduza a densidade/qualidade quebre o CI.
 *
 *  Para cada script valida:
 *   A) summary ≥ 10.000 caracteres (conteúdo denso tipo "roteiro de aula")
 *   B) Pelo menos 3 DOIs reais citados (formato 10.xxxx/yyy)
 *   C) Pelo menos 1 congresso internacional (TERMIS / Biofabrication / ISBF /
 *      ORS / M&M / AACR / ISSCR) OU brasileiro (SBB / CBEB / SBPC)
 *   D) Seção "## Erros comuns" OU "## Distinções que geram confusão"
 *   E) Seção "## Congressos e sociedades científicas"
 *   F) Seção "## Artigos recomendados"
 *   G) Seção "## Contexto" (abertura obrigatória)
 *   H) Seção "## Próximos passos de estudo"
 *   I) Usa o helper upsertLessonBySlug (padrão R13.14.8)
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = resolve(__dirname, "..")

/** Scripts de enrichment criados em R13.14.8 */
const ENRICHMENT_SCRIPTS = [
  { file: "scripts/enrich-m02-biomateriais.ts",   module: "M02 Biomateriais" },
  { file: "scripts/enrich-m03-biotintas.ts",      module: "M03 Biotintas" },
  { file: "scripts/enrich-m04-bioimpressao.ts",   module: "M04 Bioimpressão" },
  { file: "scripts/enrich-m05-arquitetura.ts",    module: "M05 Arquitetura" },
  { file: "scripts/enrich-m06-celulas.ts",        module: "M06 Células (2 aulas)" },
  { file: "scripts/enrich-m07-tecidos.ts",        module: "M07 Tecidos" },
  { file: "scripts/enrich-m08-organoides.ts",     module: "M08 Organoides" },
  { file: "scripts/enrich-m09-avaliacao.ts",      module: "M09 Avaliação" },
  { file: "scripts/enrich-m11-desenvolvimento.ts", module: "M11 Desenvolvimento" },
]

/**
 * Extrai TODAS as strings `summary: \`...\`` de um script.
 * Retorna array porque M06 tem 2 aulas no mesmo arquivo.
 */
function extractSummaries(src: string): string[] {
  const summaries: string[] = []
  // Regex não-ganancioso: pega summary: ` até o próximo ` solitário no final de linha,
  // mas como templates aninham, usamos um parser manual que conta backticks fora de ${}
  let i = 0
  while (i < src.length) {
    const idx = src.indexOf("summary:", i)
    if (idx === -1) break
    const tickIdx = src.indexOf("`", idx)
    if (tickIdx === -1) break
    // encontra o backtick de fechamento considerando ${...} aninhados
    let j = tickIdx + 1
    let depth = 0
    while (j < src.length) {
      const ch = src[j]
      if (ch === "\\") { j += 2; continue }
      if (ch === "`" && depth === 0) break
      if (ch === "$" && src[j + 1] === "{") { depth++; j += 2; continue }
      if (ch === "}" && depth > 0) { depth--; j++; continue }
      j++
    }
    summaries.push(src.slice(tickIdx + 1, j))
    i = j + 1
  }
  return summaries
}

describe("R13.14.8 · Conteúdo denso de todos os módulos publicados", () => {
  describe.each(ENRICHMENT_SCRIPTS)("$module ($file)", ({ file }) => {
    const path = resolve(ROOT, file)
    const src = readFileSync(path, "utf8")
    const summaries = extractSummaries(src)

    it("usa o helper upsertLessonBySlug (padrão R13.14.8)", () => {
      expect(src).toContain("upsertLessonBySlug")
      expect(src).toContain("./_enrich-helper")
    })

    it("contém pelo menos 1 summary (template literal)", () => {
      expect(summaries.length).toBeGreaterThanOrEqual(1)
    })

    describe.each(summaries.map((s, idx) => ({ idx: idx + 1, body: s })))(
      "aula $idx",
      ({ body }) => {
        it("summary ≥ 10.000 caracteres (conteúdo denso)", () => {
          expect(body.length).toBeGreaterThanOrEqual(10_000)
        })

        it("abre com seção '## Contexto'", () => {
          expect(body).toMatch(/##\s+Contexto/)
        })

        it("tem seção '## Artigos recomendados'", () => {
          expect(body).toMatch(/##\s+Artigos recomendados/)
        })

        it("tem seção '## Congressos e sociedades científicas'", () => {
          expect(body).toMatch(/##\s+Congressos e sociedades científicas/)
        })

        it("tem seção '## Próximos passos de estudo'", () => {
          expect(body).toMatch(/##\s+Próximos passos de estudo/)
        })

        it("tem seção '## Erros comuns' OU '## Distinções que geram confusão'", () => {
          const temErros = /##\s+Erros comuns/.test(body)
          const temDistincoes = /##\s+Distinções que geram confusão/.test(body)
          expect(temErros || temDistincoes).toBe(true)
        })

        it("cita pelo menos 3 DOIs reais (formato 10.xxxx/yyy)", () => {
          const dois = body.match(/\b10\.\d{4,9}\/[^\s)]+/g) ?? []
          expect(dois.length).toBeGreaterThanOrEqual(3)
        })

        it("menciona pelo menos 1 congresso científico (nacional ou internacional)", () => {
          const congressos = [
            "TERMIS", "Biofabrication", "ISBF", "ORS", "M&M",
            "AACR", "ISSCR", "SBB", "CBEB", "SBPC", "SLABO",
            "CLABIO", "ESB", "SFB",
          ]
          const temCongresso = congressos.some((c) => body.includes(c))
          expect(temCongresso).toBe(true)
        })
      }
    )
  })

  it("todos os scripts rodam o main() e tratam erro com process.exit(1)", () => {
    for (const { file } of ENRICHMENT_SCRIPTS) {
      const src = readFileSync(resolve(ROOT, file), "utf8")
      expect(src, `${file} deve chamar main()`).toMatch(/main\(\)\.catch\(/)
      expect(src, `${file} deve usar process.exit(1) no catch`).toMatch(/process\.exit\(1\)/)
    }
  })
})
