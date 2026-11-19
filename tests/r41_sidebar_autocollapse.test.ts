/**
 * R41 · Barra lateral do dashboard recolhe sozinha quando não está em uso.
 * Recolhida = trilho com os ícones dos tópicos da BIA; hover/foco expande por cima; alfinete fixa.
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"

const src = readFileSync(resolve(process.cwd(), "src/components/layout/DashboardSidebar.tsx"), "utf-8")

describe("R41 · sidebar auto-recolhível", () => {
  it("tem trilho compacto com um ícone por grupo de tópicos", () => {
    expect(src).toContain("function SidebarRail")
    expect(src).toContain('data-testid="sidebar-rail"')
    expect(src).toContain("data-testid={`sidebar-rail-${g.id}`}")
    expect(src).toMatch(/NAV_GROUPS\.map\(\(g\) =>/)
  })
  it("expande ao passar o mouse / focar e recolhe ao sair, com atraso anti-piscada", () => {
    expect(src).toContain("onMouseEnter={open}")
    expect(src).toMatch(/onMouseLeave=\{\(\) => \{ if \(!pinned\) closeSoon\(\)/)
    expect(src).toContain("onFocusCapture={open}")
    expect(src).toMatch(/const closeSoon = \(ms = \d+\)/)
    expect(src).toContain('e.key === "Escape"')
  })
  it("expandida por hover fica SOBRE o conteúdo (absolute) — não empurra a página; fixada fica em fluxo", () => {
    expect(src).toContain("absolute inset-y-0 left-0 z-40")
    expect(src).toMatch(/style=\{\{ width: pinned \? SIDEBAR_FULL_W : SIDEBAR_RAIL_W \}\}/)
  })
  it("recolhe após navegar (pathname muda), salvo se fixada", () => {
    expect(src).toMatch(/useEffect\(\(\) => \{ if \(!pinned\) setHover\(false\) \}, \[pathname, pinned\]\)/)
  })
  it("alfinete persiste em localStorage", () => {
    expect(src).toContain('data-testid="sidebar-pin"')
    expect(src).toMatch(/SIDEBAR_PIN_KEY = "bia:sidebar-pinned-v41"/)
    expect(src).toContain("localStorage.setItem(SIDEBAR_PIN_KEY")
  })
  it("mobile continua com drawer (header + menu) intacto", () => {
    expect(src).toContain("function MobileHeader")
    expect(src).toContain("md:hidden fixed top-0 inset-x-0")
  })
})
