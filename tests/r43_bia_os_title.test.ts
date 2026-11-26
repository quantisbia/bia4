/**
 * R43 · Título da plataforma: BIA OS — Biofabrication Operating System · Powered by Quantis Biotechnology.
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8")
const SUBTITLE = "Biofabrication Operating System"
const SIGNATURE = "Powered by Quantis Biotechnology"

describe("R43 · título BIA OS", () => {
  it.each([
    "src/components/layout/DashboardSidebar.tsx",
    "src/app/auth/login/page.tsx",
    "src/app/auth/register/page.tsx",
  ])("%s mostra o título completo (3 linhas)", (file) => {
    const src = read(file)
    expect(src).toMatch(/BIA <span className="text-violet-[34]00">OS<\/span>/)
    expect(src).toContain(SUBTITLE)
    expect(src).toContain(SIGNATURE)
    expect(src).not.toContain("Biofabrication AI")
  })

  it("home: nav, selo, H1 e H2 usam o novo título", () => {
    const src = read("src/app/page.tsx")
    expect(src).toContain('<span className="bia-gradient-text glow-text">BIA OS</span>')
    expect(src).toContain(SUBTITLE)
    expect(src).toContain(`<span>${SIGNATURE}</span>`)
    expect(src).not.toContain("Biofabrication AI")
    expect(src).not.toContain("Biofabrication Intelligent Assistant")
  })

  it("títulos de aba e metadados", () => {
    const root = read("src/app/layout.tsx")
    expect(root).toContain('default: "BIA OS — Biofabrication Operating System"')
    expect(root).toContain('template: "%s | BIA OS"')
    expect(read("src/app/dashboard/layout.tsx")).toContain('template: "%s | BIA OS"')
  })

  it("barra lateral: alfinete sobreposto não rouba largura do título", () => {
    expect(read("src/components/layout/DashboardSidebar.tsx")).toContain("hidden md:inline-flex absolute top-3 right-3")
  })
})
