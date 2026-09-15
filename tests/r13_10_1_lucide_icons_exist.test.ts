/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R13.10.1b — Guarda de regressão: todo ícone lucide-react importado EXISTE
 *  ─────────────────────────────────────────────────────────────────────
 *  BUG REPORTADO (Janaina, 2026-08-07):
 *   "Ao clicar na aula, dentro do dashboard não consigo adicionar vídeos e
 *    nem ver as aulas e as instruções — Error: Minified React error #130"
 *
 *  RAIZ DO BUG:
 *   NewLessonForm.tsx e LessonEditForm.tsx importavam `Youtube` de lucide-react,
 *   mas o `Youtube` (icon do YouTube brand) NÃO EXISTE no lucide-react atual
 *   (foi removido — brand icons foram retirados). O React tenta renderizar
 *   `<undefined />` e quebra com error #130 "Element type is invalid".
 *
 *   Outros ícones (AlertTriangle, CheckCircle2, Loader2, ImageIcon, LinkIcon)
 *   existem como ALIASES retrocompatíveis (TriangleAlert as AlertTriangle,
 *   etc), por isso o resto do app funciona. Youtube não tem alias porque
 *   foi removido por licença de marca registrada.
 *
 *  Este teste vasculha TODAS as importações de lucide-react em src/ e falha
 *  se qualquer ícone não estiver disponível no `lucide-react` instalado.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { resolve, join } from "node:path"
import { globSync } from "glob"

const ROOT = resolve(__dirname, "..")

/**
 * Carrega a lista de ícones disponíveis do lucide-react instalado.
 * Retorna Set<string> com todos os named exports (aliases incluídos).
 */
function loadAvailableLucideIcons(): Set<string> {
  const dtsPath = join(ROOT, "node_modules/lucide-react/dist/lucide-react.d.ts")
  if (!existsSync(dtsPath)) {
    throw new Error(`lucide-react.d.ts não encontrado em ${dtsPath} — rode npm install`)
  }
  const dts = readFileSync(dtsPath, "utf8")

  const icons = new Set<string>()

  // 1. Exports diretos: declare const IconName: LucideIcon
  const directRe = /declare const ([A-Z][A-Za-z0-9]*):\s*LucideIcon/g
  let m: RegExpExecArray | null
  while ((m = directRe.exec(dts)) !== null) {
    icons.add(m[1])
  }

  // 2. Aliases: "Original as Alias" na linha de export
  // Pattern conservador — só letras/números
  const aliasRe = /([A-Z][A-Za-z0-9]*) as ([A-Z][A-Za-z0-9]*)/g
  while ((m = aliasRe.exec(dts)) !== null) {
    icons.add(m[2])
  }

  return icons
}

/**
 * Extrai TODOS os identificadores importados de "lucide-react" num arquivo TS/TSX.
 * Cuida de imports multiline, com `as` alias local, com comentários.
 */
function extractLucideImports(src: string): string[] {
  const imports: string[] = []
  // Match: import { ... } from "lucide-react"
  const re = /import\s*(?:type\s*)?\{([^}]+)\}\s*from\s*["']lucide-react["']/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) {
    const inner = m[1]
    // Remove comentários
    const cleaned = inner
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "")
    // Divide por vírgula, extrai o nome ANTES de "as" (se existir)
    for (const part of cleaned.split(",")) {
      const trimmed = part.trim()
      if (!trimmed) continue
      // "Foo as Bar" → queremos "Foo" (o export original)
      const name = trimmed.split(/\s+as\s+/)[0].trim()
      if (/^[A-Z][A-Za-z0-9]*$/.test(name)) {
        imports.push(name)
      }
    }
  }
  return imports
}

describe("R13.10.1b · Guarda: todo ícone lucide-react importado existe no pacote", () => {
  const available = loadAvailableLucideIcons()

  it("lucide-react tem pelo menos 100 ícones (sanity check)", () => {
    expect(available.size).toBeGreaterThan(100)
  })

  it("Ícones críticos usados em vários lugares realmente existem", () => {
    // Se algum destes falhar, o app inteiro provavelmente quebra
    for (const critical of [
      "CheckCircle2", "Loader2", "AlertTriangle",
      "ArrowRight", "ArrowLeft", "ChevronRight", "ChevronLeft",
      "Zap", "Star", "X", "Plus", "Trash2",
    ]) {
      expect(available.has(critical), `Ícone crítico "${critical}" NÃO existe no lucide-react instalado`).toBe(true)
    }
  })

  // Descobre todos arquivos TS/TSX que importam lucide-react
  const files = globSync("src/**/*.{ts,tsx}", { cwd: ROOT })
    .filter(f => {
      const full = join(ROOT, f)
      const src = readFileSync(full, "utf8")
      return /from\s*["']lucide-react["']/.test(src)
    })

  it("Encontrou arquivos que importam lucide-react", () => {
    expect(files.length, "nenhum arquivo importa lucide-react — impossível").toBeGreaterThan(0)
  })

  // Um teste por arquivo (falha específica para debug rápido)
  for (const f of files) {
    it(`${f}: todos os ícones importados existem`, () => {
      const src = readFileSync(join(ROOT, f), "utf8")
      const imports = extractLucideImports(src)
      const missing: string[] = []
      for (const icon of imports) {
        if (!available.has(icon)) missing.push(icon)
      }
      expect(missing, `${f}: ícones inexistentes no lucide-react: ${missing.join(", ")}`).toEqual([])
    })
  }
})
