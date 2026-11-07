/**
 * R31.1 · Landing /odontologia — preço individual, PT/EN e Guia Prático (espiral)
 *
 * Garante que:
 *  - não há mais preço "por grupo" (R$ 34.300) em nenhuma versão;
 *  - o preço exibido é o individual (R$ 4.287,50) e o link Asaas está presente;
 *  - existe a versão em inglês (/odontologia/en) com alternância PT ⇄ EN;
 *  - a seção Kit didático exibe o mockup espiral do Guia Prático.
 */
import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = resolve(__dirname, "..")
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8")

const copySrc = read("src/app/odontologia/_components/copy.ts")
const landingSrc = read("src/app/odontologia/_components/OdontologiaLanding.tsx")
const ptPage = read("src/app/odontologia/page.tsx")
const enPage = read("src/app/odontologia/en/page.tsx")

describe("R31.1 · /odontologia — preço individual + link Asaas", () => {
  it("não exibe mais o preço por grupo (34.300)", () => {
    for (const s of [copySrc, landingSrc, ptPage, enPage]) {
      expect(s).not.toMatch(/34[.,]?300/)
      expect(s).not.toMatch(/PRICE_GROUP/)
    }
  })
  it("usa o preço individual R$ 4.287,50 e o link de pagamento Asaas", () => {
    expect(copySrc).toContain("PRICE_PER_PRO = 4287.5")
    expect(copySrc).toContain("https://www.asaas.com/000/c/o2jlmlwo6rxd5y1d")
    expect(landingSrc).toContain('data-testid="odonto-price"')
    expect(landingSrc).toContain("c.priceFmt(PRICE_PER_PRO)")
    expect(landingSrc).toContain('data-testid="odonto-pricing-asaas"')
    expect(landingSrc).toContain('data-testid="odonto-cta-asaas"')
  })
  it("formata o preço em pt-BR e en-US", () => {
    const fmtPt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 })
    const fmtEn = (v: number) => "R$ " + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    expect(fmtPt(4287.5).replace(/\u00a0/g, " ")).toBe("R$ 4.287,50")
    expect(fmtEn(4287.5)).toBe("R$ 4,287.50")
  })
})

describe("R31.1 · versão em inglês + alternância PT/EN", () => {
  it("existe /odontologia/en usando o mesmo componente com lang=\"en\"", () => {
    expect(existsSync(resolve(ROOT, "src/app/odontologia/en/page.tsx"))).toBe(true)
    expect(enPage).toContain('<OdontologiaLanding lang="en" />')
    expect(ptPage).toContain('<OdontologiaLanding lang="pt" />')
  })
  it("dicionário tem toggles cruzados e metadata alternates", () => {
    expect(copySrc).toContain('langToggleHref: "/odontologia/en"')
    expect(copySrc).toContain('langToggleHref: "/odontologia"')
    expect(landingSrc).toContain('data-testid="odonto-lang-toggle"')
    expect(ptPage).toContain('en: "https://biaquantis.bio/odontologia/en"')
    expect(enPage).toContain('"pt-BR": "https://biaquantis.bio/odontologia"')
  })
  it("copy PT não contém textos-chave em inglês", () => {
    const ptBlock = copySrc.slice(copySrc.indexOf("const pt = {"), copySrc.indexOf("export type Copy"))
    for (const en of ["I want to get trained", "Learning kit", "per professional", "Investment"]) {
      expect(ptBlock).not.toContain(en)
    }
    expect(ptBlock).toContain("Eu quero me capacitar")
    expect(ptBlock).toContain("por profissional")
  })
})

describe("R31.1 · Kit didático · Guia Prático em espiral", () => {
  it("mockup existe em public/ (webp + png) e é referenciado na seção #kit", () => {
    expect(existsSync(resolve(ROOT, "public/odontologia/guia-pratico-espiral.webp"))).toBe(true)
    expect(existsSync(resolve(ROOT, "public/odontologia/guia-pratico-espiral.png"))).toBe(true)
    expect(copySrc).toContain("/odontologia/guia-pratico-espiral.webp")
    expect(landingSrc).toContain('id="kit"')
    expect(landingSrc).toContain('data-testid="odonto-guide-mockup"')
    expect(copySrc).toContain("Guia Prático de Biofabricação e Bioimpressão")
    expect(copySrc).toContain("Fundamentos, Tecnologia e Protocolos")
    expect(copySrc).toContain("Practical Guide to Biofabrication and Bioprinting")
  })
})
