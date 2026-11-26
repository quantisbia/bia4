/**
 * R45 · Menu do dashboard agrupado pelos ambientes do BIA OS — mesmas rotas, novos grupos e rótulos.
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = readFileSync(resolve(process.cwd(), "src/components/layout/DashboardSidebar.tsx"), "utf8")
const start = src.indexOf("export const NAV_GROUPS: NavGroup[] = [")
const block = src.slice(start, src.indexOf("\n]\n", start))
const hrefs = [...block.matchAll(/\{ href: "([^"]+)"/g)].map((m) => m[1])
const groups = [...block.matchAll(/\n  \{\n    id: "([^"]+)",\n    label: "([^"]+)",[\s\S]*?\n  \},/g)].map((m) => ({
  id: m[1], label: m[2], section: /\n    section: "([^"]+)"/.exec(m[0])?.[1] ?? null,
  hrefs: [...m[0].matchAll(/\{ href: "([^"]+)"/g)].map((x) => x[1]),
}))

// As 23 rotas que o menu tinha antes do R45 — nenhuma pode sumir, nenhuma nova pode entrar.
const ROTAS_ANTES_DO_R45 = [
  "/dashboard/pipeline", "/dashboard/bioprint", "/dashboard/print-basic", "/dashboard/bioprint/model",
  "/dashboard/bioprint/bioink", "/dashboard/bioprint/slice", "/dashboard/bioprint/draw", "/dashboard/bioprint/execute",
  "/dashboard/bioprint/review", "/dashboard/bioprint/post", "/dashboard/organoids", "/dashboard/protocols",
  "/dashboard/protocol-total", "/dashboard/analyses", "/dashboard/tools", "/academy/dashboard", "/dashboard/chat",
  "/dashboard/knowledge", "/dashboard/manual", "/dashboard/roadmap", "/dashboard/notebook", "/dashboard/billing",
  "/dashboard/settings",
]

describe("R45 · menu BIA OS", () => {
  it("mantém exatamente as mesmas rotas, sem duplicar", () => {
    expect([...hrefs].sort()).toEqual([...ROTAS_ANTES_DO_R45].sort())
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })
  it("grupos na ordem aprovada", () => {
    expect(groups.map((g) => g.label)).toEqual([
      "Meus projetos", "BIA Design", "BIA Materials", "BIA Print", "BIA Biology", "BIA Lab", "BIA Regulatory",
      "BIA Copilot", "Biblioteca científica", "BIA Academy", "Conta",
    ])
  })
  it("os sete ambientes científicos ficam sob a seção Ferramentas; os demais, fora", () => {
    expect(groups.filter((g) => g.section === "Ferramentas").map((g) => g.id)).toEqual(
      ["design", "materials", "bioprint", "organoids", "lab", "validate", "copilot"])
    expect(groups.filter((g) => g.section === null).map((g) => g.id)).toEqual(["project", "library", "learn", "account"])
  })
  it("BIA Print ficou com 5 itens e as antigas fases foram para os ambientes certos", () => {
    const by = Object.fromEntries(groups.map((g) => [g.id, g.hrefs]))
    expect(by.bioprint).toHaveLength(5)
    expect(by.design).toContain("/dashboard/bioprint/model")
    expect(by.materials).toContain("/dashboard/bioprint/bioink")
    expect(by.organoids).toContain("/dashboard/bioprint/post")
  })
  it("hub de bioimpressão é exact e o destaque de grupo respeita isso", () => {
    expect(block).toMatch(/\{ href: "\/dashboard\/bioprint", label: "[^"]+", icon: Printer, exact: true,/)
    expect(src).toContain("function navItemMatches(pathname: string, it: NavItem)")
    expect(src).not.toContain("g.items.some((it) => pathname.startsWith(it.href))")
  })
  it("não promete ferramentas que ainda não existem", () => {
    expect(block).not.toMatch(/Dental|SmartFlow|Equipe/)
  })
  it("trilho recolhido: a lista de grupos rola em telas baixas em vez de achatar os ícones", () => {
    expect(src).toMatch(/data-testid="sidebar-rail-groups" className="[^"]*min-h-0[^"]*overflow-y-auto/)
    expect(src).toContain('"relative w-10 h-10 shrink-0 rounded-xl')
  })
})
