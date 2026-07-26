/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R12.55.2 — Guard: /dashboard/manual não pode ter imports undefined
 *  ─────────────────────────────────────────────────────────────────────
 *  React error #130 acontece quando um componente importado é `undefined`.
 *  Isso ocorreu na produção em 2026-07-26 porque page.tsx importava
 *  `{ GettingStarted }` mas o arquivo exportava `ChapterGettingStarted`.
 *
 *  Este teste garante que:
 *    - Todos os 15 capítulos modulares existem no filesystem
 *    - Cada arquivo exporta pelo menos um componente utilizável
 *    - Os símbolos importados no page.tsx batem com exports reais
 * ═══════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"

const CHAPTERS_DIR = path.resolve(__dirname, "../src/app/dashboard/manual/chapters")
const PAGE_TSX = path.resolve(__dirname, "../src/app/dashboard/manual/page.tsx")

describe("R12.55.2: /dashboard/manual imports guard", () => {
  it("todos os 15 arquivos de capítulo existem", () => {
    const expected = [
      "getting-started", "roadmap", "pipeline",
      "bioprint-model", "bioprint-bioink", "bioprint-slice", "bioprint-execute",
      "organoid-builder", "protocols", "knowledge", "notebook", "chat-ia",
      "analyses", "tools", "credits-settings",
    ]
    for (const name of expected) {
      const p = path.join(CHAPTERS_DIR, `${name}.tsx`)
      expect(fs.existsSync(p), `${name}.tsx não existe`).toBe(true)
    }
  })

  it("todos os imports de capítulos em page.tsx resolvem para exports reais", () => {
    const pageSrc = fs.readFileSync(PAGE_TSX, "utf8")

    // Extrai imports do bloco de capítulos: `import { X [as Y] } from "./chapters/foo"`
    const importRegex = /import\s*\{\s*([A-Za-z_][A-Za-z0-9_]*)(?:\s+as\s+[A-Za-z_][A-Za-z0-9_]*)?\s*\}\s*from\s*"\.\/chapters\/([a-z-]+)"/g

    const importedPairs: Array<{ symbol: string; file: string }> = []
    let m: RegExpExecArray | null
    while ((m = importRegex.exec(pageSrc)) !== null) {
      importedPairs.push({ symbol: m[1], file: m[2] })
    }

    expect(importedPairs.length, "nenhum import de ./chapters/* encontrado").toBeGreaterThanOrEqual(15)

    // Para cada import, checa que o arquivo exporta esse símbolo
    for (const { symbol, file } of importedPairs) {
      const src = fs.readFileSync(path.join(CHAPTERS_DIR, `${file}.tsx`), "utf8")
      const hasExport = new RegExp(`^export\\s+(function|const|class)\\s+${symbol}\\b`, "m").test(src)
      expect(hasExport,
        `page.tsx importa { ${symbol} } de ./chapters/${file} mas o arquivo não exporta esse símbolo. ` +
        `Isso causa React error #130 em produção. Ajuste o nome do import ou renomeie o export.`,
      ).toBe(true)
    }
  })

  it("nenhum capítulo tem export function anônimo (garantia de exports nomeados)", () => {
    const files = fs.readdirSync(CHAPTERS_DIR).filter(f => f.endsWith(".tsx") && !f.startsWith("_"))
    for (const f of files) {
      const src = fs.readFileSync(path.join(CHAPTERS_DIR, f), "utf8")
      // Se tem `export default function` sem nome, ou `export function ()` (arrow anônima), bad
      const hasAnonDefault = /export\s+default\s+function\s*\(/.test(src)
      const hasAnonExport = /export\s+function\s*\(/.test(src)
      expect(hasAnonDefault || hasAnonExport, `${f} tem export anônimo — dá React error #130 no Next.js server component render`).toBe(false)
    }
  })
})
