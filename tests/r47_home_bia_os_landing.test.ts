/**
 * R47 · Nova página inicial da BIA OS: cenas esquemáticas animadas, sem a seção de mercados.
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8")
const page = read("src/app/page.tsx")
const scenes = read("src/components/landing/BioScenes.tsx")
const cssAll = read("src/app/globals.css")
const css = cssAll.slice(cssAll.indexOf("R47 · Página inicial BIA OS"))

describe("R47 · página inicial BIA OS", () => {
  it("a seção de mercados e as seções antigas saíram", () => {
    for (const gone of ['id="markets"', 'href="#markets"', "6 Mercados", 'id="what-is"', 'id="features"', 'id="modules"', "US$"]) {
      expect(page, gone).not.toContain(gone)
    }
  })
  it("novas seções na ordem: topo → Academy → em ação → esquema → esferoides → planos (R48: a faixa de oferta saiu)", () => {
    const order = ['data-testid="home-hero"', 'data-testid="home-academy-banner"', 'id="takes"', 'id="plataforma"', 'id="esferoides"', 'id="pricing"'].map((m) => page.indexOf(m))
    expect(order.every((i) => i > -1)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })
  it("o menu do topo aponta para seções que existem", () => {
    for (const id of ["takes", "plataforma", "esferoides", "academy", "pricing"]) {
      expect(page).toContain(`href="#${id}"`)
      expect(page).toContain(`id="${id}"`)
    }
  })
  it("as três cenas de fundo e as ilustrações de ferramenta estão na página", () => {
    for (const c of ["<PrinterScene", "<StirrerScene", "<ScaffoldCellsScene", "<PrintTake", "<MaterialsTake", "<BiaOsDiagram", "<SpheroidStage"]) expect(page, c).toContain(c)
    expect(page).toContain('data-testid="home-ambient"')
    // a cena de fundo dos esferoides fica na margem (estreita), fora do título centralizado
    expect(page).toMatch(/lp-ambient left-3 2xl:left-10 top-12 w-\[110px\] 2xl:w-\[170px\]"><StirrerScene/)
    // a do esquema só aparece em telas bem largas
    expect(page).toMatch(/hidden 2xl:block">\s*<div className="lp-ambient right-6 top-16 w-\[180px\]"><ScaffoldCellsScene/)
    expect(page).toContain('data-testid="home-final-cta"')
    for (const fn of ["PrinterScene", "StirrerScene", "ScaffoldCellsScene", "PrintTake", "MaterialsTake", "BiaOsDiagram", "SpheroidStage"]) {
      expect(scenes).toContain(`export function ${fn}(`)
    }
  })
  it("as cenas rodam sem JavaScript no navegador", () => {
    expect(scenes).not.toMatch(/^\s*["']use client["']/m)
    expect(scenes).not.toMatch(/useState|useEffect|requestAnimationFrame/)
  })
  it("ilustrações são identificadas como ilustrações", () => {
    expect(page).toContain("Ilustração esquemática · não é gravação de tela")
    expect(page).toContain("Ilustração esquemática · valores de exemplo")
  })
  it("toda classe de animação usada nas cenas tem regra no CSS, e vice-versa para os keyframes", () => {
    const used = new Set<string>()
    for (const m of scenes.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) for (const c of (m[1] ?? m[2]).split(/\s+/)) if (/^lp-[a-z0-9-]+$/.test(c)) used.add(c)
    for (const dyn of ["lp-pl-1", "lp-pl-3", "lp-pl-5", "lp-pd-2-0", "lp-pd-2-5", "lp-pd-4-0", "lp-pd-4-5"]) used.add(dyn)
    expect(used.size).toBeGreaterThan(20)
    for (const c of used) expect(css, c).toMatch(new RegExp(`\\.${c}[{,.\\s]`))
    const names = [...css.matchAll(/animation(?:-name)?:(lp-[a-z0-9-]+)/g)].map((m) => m[1])
    for (const n of new Set(names)) expect(css, n).toContain(`@keyframes ${n}{`)
  })
  it("respeita quem pede menos movimento", () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion:reduce\)\{\s*\.lp-scene \*\{animation:none!important\}\s*\.lp-ambient\{display:none\}/)
  })
  it("blocos comerciais preservados", () => {
    for (const keep of ['data-testid="home-academy-price"', 'data-testid="home-plan-guide-card"', 'data-testid="home-plan-guide-cta"', 'data-testid="home-black-friday-banner"', "R$ 507"]) {
      expect(page, keep).toContain(keep)
    }
  })
})
