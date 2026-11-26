/**
 * R46 · BIA Print com dois caminhos: básico (Impressão Básica) e avançado (6 fases).
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8")
const sb = read("src/components/layout/DashboardSidebar.tsx")
const hub = read("src/app/dashboard/bioprint/page.tsx")
const a = sb.indexOf('    id: "bioprint",')
const grp = sb.slice(a, sb.indexOf("\n  },", a))

describe("R46 · BIA Print — dois caminhos", () => {
  it("menu: básico e avançado são os dois primeiros itens, seguidos dos atalhos do avançado", () => {
    const items = [...grp.matchAll(/\{ href: "([^"]+)", label: "([^"]+)"/g)].map((m) => [m[1], m[2]])
    expect(items).toEqual([
      ["/dashboard/print-basic", "Caminho básico"],
      ["/dashboard/bioprint", "Caminho avançado"],
      ["/dashboard/bioprint/slice", "BioSlicer · G-code"],
      ["/dashboard/bioprint/execute", "Imprimir (USB)"],
      ["/dashboard/bioprint/review", "Análise da impressão"],
    ])
    expect(grp).not.toContain("badge:")
  })
  it("barra recolhida: o ícone de BIA Print abre a página de entrada com os dois caminhos", () => {
    expect(grp).toContain('entry: "/dashboard/bioprint"')
    expect(sb).toContain("const entry = g.entry ?? g.items[0].href")
    expect(sb).toContain("href={entry}")
  })
  it("todo ícone usado no menu está importado (um ícone sem import quebraria a barra em produção)", () => {
    const imported = /import \{([^}]*)\} from "lucide-react"/.exec(sb)![1].split(",").map((x) => x.trim()).filter(Boolean)
    const used = [...new Set([...sb.matchAll(/\bicon: ([A-Z][A-Za-z0-9]+),/g)].map((m) => m[1]))]
    expect(used.length).toBeGreaterThan(10)
    for (const icon of used) expect(imported, icon).toContain(icon)
  })
  it("página de entrada: um cartão por caminho, sem cartão duplicado", () => {
    expect(hub).toContain('data-testid="bioprint-paths"')
    expect(hub.match(/data-testid="bioprint-basic-card"/g)).toHaveLength(1)
    expect(hub).toMatch(/<Link href="\/dashboard\/print-basic" data-testid="bioprint-basic-card"/)
    expect(hub).toMatch(/<a href="#bioprint-fases" data-testid="bioprint-advanced-card"/)
    expect(hub).toContain('<section id="bioprint-fases"')
    expect(hub).toContain("Para quem já domina os parâmetros essenciais da bioimpressão.")
  })
  it("Impressão Básica aponta para o caminho avançado", () => {
    const pb = read("src/app/dashboard/print-basic/PrintBasicClient.tsx")
    expect(pb).toMatch(/<Link href="\/dashboard\/bioprint" data-testid="pb-advanced-path"[^>]*>Caminho avançado \(6 fases\) →<\/Link>/)
  })
})
