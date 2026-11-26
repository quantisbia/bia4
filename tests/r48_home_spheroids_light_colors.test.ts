/**
 * R48 · Página inicial — três ajustes pedidos:
 *  1) a faixa "Avance em tecidos bioimpressos, esferoides e organoides — com IA científica ao
 *     seu lado" sai inteira;
 *  2) uma cena animada de esferoides entra no topo, embaixo do béquer do hidrogel;
 *  3) no tema claro, as cenas que ficam sobre o fundo da página usam cores mais intensas.
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = resolve(__dirname, "..")
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8")
const page = read("src/app/page.tsx")
const scenes = read("src/components/landing/BioScenes.tsx")
const css = read("src/app/globals.css")

describe("R48 · faixa 'Avance em tecidos bioimpressos…' retirada", () => {
  it("nada da faixa ficou na página", () => {
    for (const gone of ['id="platform-launch"', "home-platform-launch", "Avance em", "IA científica", "plataforma-bia-launch", "Plataforma completa BIA", "Assinar Guia Inteligente", "QMicroNiche"]) {
      expect(page, gone).not.toContain(gone)
    }
  })
  it("depois dos esferoides vêm direto os planos", () => {
    const between = page.slice(page.indexOf('id="esferoides"'), page.indexOf('id="pricing"'))
    expect(between.match(/<section/g)?.length ?? 0).toBe(1) // só a abertura da seção de planos
  })
})

describe("R48 · cena de esferoides embaixo do béquer", () => {
  it("a cena existe e roda sem JavaScript no navegador", () => {
    expect(scenes).toContain("export function SpheroidsScene(")
    expect(scenes).not.toMatch(/useState|useEffect|requestAnimationFrame/)
  })
  it("no topo, entra logo depois do béquer, no mesmo lado e mais abaixo", () => {
    const ambient = page.slice(page.indexOf('data-testid="home-ambient"'), page.indexOf("max-w-4xl mx-auto text-center"))
    const stirrer = ambient.indexOf("<StirrerScene"), spheroids = ambient.indexOf("<SpheroidsScene")
    expect(stirrer).toBeGreaterThan(-1)
    expect(spheroids).toBeGreaterThan(stirrer)
    expect(ambient).toMatch(/lp-ambient right-8 2xl:right-28 top-44 [^"]*"><StirrerScene/)
    expect(ambient).toMatch(/lp-ambient right-6 2xl:right-24 top-\[26\.5rem\] [^"]*" data-testid="home-ambient-spheroids"><SpheroidsScene/)
  })
  it("no celular, entra na faixa de cenas ao lado do béquer", () => {
    expect(page).toMatch(/data-testid="home-ambient-strip" className="lp-strip xl:hidden [^"]*grid-cols-4[^"]*">\s*<PrinterScene \/><StirrerScene \/><SpheroidsScene \/><ScaffoldCellsScene \/>/)
  })
  it("a animação nova tem regra e keyframes no CSS", () => {
    expect(scenes).toContain('className="lp-float"')
    expect(css).toMatch(/\.lp-float\{animation:lp-float /)
    expect(css).toContain("@keyframes lp-float{")
  })
})

describe("R48 · cores mais intensas das cenas no tema claro", () => {
  it("as cores das cenas são variáveis com a cor do tema escuro como padrão", () => {
    for (const [name, dark] of [["v", "#a78bfa"], ["l", "#c4b5fd"], ["c", "#67e8f9"], ["e", "#6ee7b7"], ["f", "#f0abfc"], ["a", "#fcd34d"], ["w", "#fff"]]) {
      expect(scenes, name).toContain(`"var(--lp-${name},${dark})"`)
    }
  })
  it("as cenas de fundo não têm mais branco ou roxo-escuro fixos", () => {
    const ambient = scenes.slice(scenes.indexOf("/* ── 1 · Células migrando"), scenes.indexOf("/* ── Moldura de janela"))
    expect(ambient).toContain("export function SpheroidsScene(")
    for (const fixed of ['"#fff"', '"#f5f3ff"', '"#e9e3ff"', '"#150d2b"', '"#1a1033"']) expect(ambient, fixed).not.toContain(fixed)
  })
  it("o tema claro troca as variáveis por tons escuros e reduz a transparência", () => {
    const rule = /html\.light \.lp-ambient,html\.light \.lp-strip\{([^}]*)\}/.exec(css)
    expect(rule).not.toBeNull()
    const vars = Object.fromEntries([...rule![1].matchAll(/--lp-([a-z]):(#[0-9a-f]{6})/g)].map((m) => [m[1], m[2]]))
    expect(Object.keys(vars).sort()).toEqual(["a", "c", "d", "e", "f", "l", "v", "w"])
    // luminância relativa (WCAG): cores de traço bem escuras para contrastar com fundo claro
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    for (const k of ["v", "l", "c", "e", "f", "a", "w"]) {
      const contrastOnWhite = 1.05 / (lum(vars[k]) + 0.05)
      expect(contrastOnWhite, `--lp-${k} ${vars[k]}`).toBeGreaterThan(4.5)
    }
    expect(css).toMatch(/html\.light \.lp-ambient,html\.light \.lp-strip\{opacity:1\}/)
  })
  it("traços estruturais quase transparentes ganham opacidade no tema claro", () => {
    expect(scenes.match(/className="lp-line"/g)?.length).toBe(9)
    expect(css).toMatch(/html\.light \.lp-ambient \.lp-line,html\.light \.lp-strip \.lp-line\{stroke-opacity:\.72\}/)
    // só nas cenas de fundo: os painéis escuros e o tema escuro não recebem a regra
    expect(css).not.toMatch(/(^|\n|\})\.lp-line\{/)
  })
  it("o tema escuro não muda: a regra só vale para html.light", () => {
    expect(css).toContain(".lp-ambient{position:absolute;pointer-events:none;opacity:.44}")
    expect(css).not.toMatch(/(^|\n)\.lp-ambient[^{]*\{[^}]*--lp-/)
  })
})
