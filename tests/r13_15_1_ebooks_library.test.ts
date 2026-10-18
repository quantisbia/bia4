/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R13.15.1 — E-books educacionais na biblioteca BIA Academy
 *  ─────────────────────────────────────────────────────────────────────
 *  DECISÃO (Janaina, 2026-10-18):
 *   Além dos white papers técnicos (QMatrix), a Academy agora oferece
 *   e-books educacionais ricamente ilustrados por aplicação clínica
 *   (ortopedia, odontologia, dermatologia, oncologia...). O primeiro
 *   lançado é "Biofabricação em Ortopedia" (53 páginas, 3.9 MB, 1ª ed).
 *
 *  ESTE ARQUIVO TRAVA:
 *   A) library-content.ts tem helpers getOpenAccessEbooks + getAllOpenAccessMaterials
 *   B) O e-book de Ortopedia está cadastrado com kind="ebook", openAccess=true,
 *      PDF existe em public/library/, coverUrl existe em public/library/ebook-assets/
 *   C) getFeaturedWhitePaper NÃO retorna o e-book (ele tem seção própria)
 *   D) O PDF tem tamanho razoável (<=10 MB) para distribuição por e-mail
 *   E) A landing /academy expõe o <section data-testid="academy-section-ebooks">
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from "vitest"
import { statSync, readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import {
  QUANTIS_WHITE_PAPERS,
  getFeaturedWhitePaper,
  getOpenAccessEbooks,
  getAllOpenAccessMaterials,
} from "../src/lib/academy/library-content"

const ROOT = resolve(__dirname, "..")

describe("R13.15.1 · E-books na biblioteca BIA Academy", () => {
  describe("library-content.ts · helpers e dados", () => {
    it("exporta getOpenAccessEbooks helper", () => {
      expect(typeof getOpenAccessEbooks).toBe("function")
    })

    it("exporta getAllOpenAccessMaterials helper", () => {
      expect(typeof getAllOpenAccessMaterials).toBe("function")
    })

    it("tem ao menos 1 e-book cadastrado", () => {
      const ebooks = getOpenAccessEbooks()
      expect(ebooks.length).toBeGreaterThanOrEqual(1)
    })

    it("todos os e-books têm kind='ebook'", () => {
      const ebooks = getOpenAccessEbooks()
      for (const eb of ebooks) {
        expect(eb.kind).toBe("ebook")
      }
    })

    it("todos os e-books são openAccess=true", () => {
      const ebooks = getOpenAccessEbooks()
      for (const eb of ebooks) {
        expect(eb.openAccess).toBe(true)
      }
    })

    it("getFeaturedWhitePaper prioriza white-paper (QMatrix), não e-book", () => {
      const featured = getFeaturedWhitePaper()
      expect(featured).toBeDefined()
      expect(featured!.kind).toBe("white-paper")
    })

    it("getAllOpenAccessMaterials retorna white papers + e-books combinados", () => {
      const all = getAllOpenAccessMaterials()
      const ebooks = getOpenAccessEbooks()
      // Deve ter pelo menos: 1 white-paper (QMatrix) + N ebooks
      expect(all.length).toBeGreaterThanOrEqual(1 + ebooks.length - (ebooks.length > 0 ? 0 : 0))
      // Todos openAccess
      expect(all.every((m) => m.openAccess)).toBe(true)
    })
  })

  describe("E-book Vol.1 · Biofabricação em Ortopedia", () => {
    const ebook = QUANTIS_WHITE_PAPERS.find(
      (wp) => wp.id === "ebook-biofabricacao-ortopedia-2026",
    )

    it("está cadastrado em QUANTIS_WHITE_PAPERS", () => {
      expect(ebook).toBeDefined()
    })

    it("tem metadados editoriais completos", () => {
      expect(ebook!.kind).toBe("ebook")
      expect(ebook!.subtitle).toBeTruthy()
      expect(ebook!.audience).toBeTruthy()
      expect(ebook!.coverUrl).toBeTruthy()
      expect(ebook!.pages).toBeGreaterThanOrEqual(40)
      expect(ebook!.language).toBe("pt-BR")
      expect(ebook!.citation).toContain("Quantis Biotechnology")
    })

    it("tem keywords relevantes ao domínio ortopédico", () => {
      const kw = ebook!.keywords.map((k) => k.toLowerCase())
      expect(kw).toContain("ortopedia")
      // Pelo menos um conceito-chave técnico
      const temConceitoTecnico = ["pcl", "hidroxiapatita", "scaffold ósseo", "tpms gyroid"].some(
        (c) => kw.includes(c),
      )
      expect(temConceitoTecnico).toBe(true)
    })

    it("audience menciona ortopedistas ou cirurgiões", () => {
      const aud = (ebook!.audience ?? "").toLowerCase()
      expect(aud).toMatch(/ortopedista|cirurgi/i)
    })
  })

  describe("Assets físicos no filesystem", () => {
    const ebook = QUANTIS_WHITE_PAPERS.find(
      (wp) => wp.id === "ebook-biofabricacao-ortopedia-2026",
    )

    it("o PDF existe em public/library/", () => {
      const pdfPath = resolve(ROOT, "public", ebook!.pdfUrl.replace(/^\//, ""))
      expect(existsSync(pdfPath)).toBe(true)
    })

    it("o PDF tem tamanho razoável (<=10 MB) para e-mail/download", () => {
      const pdfPath = resolve(ROOT, "public", ebook!.pdfUrl.replace(/^\//, ""))
      const stat = statSync(pdfPath)
      const sizeMb = stat.size / 1024 / 1024
      expect(sizeMb).toBeLessThanOrEqual(10)
      expect(sizeMb).toBeGreaterThan(0.5) // sanity: não é vazio
    })

    it("o PDF é um arquivo PDF válido (header %PDF-)", () => {
      const pdfPath = resolve(ROOT, "public", ebook!.pdfUrl.replace(/^\//, ""))
      const buf = readFileSync(pdfPath).slice(0, 8)
      expect(buf.toString("ascii")).toMatch(/^%PDF-/)
    })

    it("a capa (coverUrl) existe em public/", () => {
      const coverPath = resolve(ROOT, "public", ebook!.coverUrl!.replace(/^\//, ""))
      expect(existsSync(coverPath)).toBe(true)
    })

    it("as logos da marca Quantis estão em public/brand/", () => {
      expect(existsSync(resolve(ROOT, "public/brand/quantis-logo-horizontal.png"))).toBe(true)
      expect(existsSync(resolve(ROOT, "public/brand/quantis-logo-symbol.png"))).toBe(true)
    })

    it("CITATIONS.md documenta créditos CC-BY das imagens da literatura", () => {
      const citPath = resolve(ROOT, "public/library/ebook-assets/CITATIONS.md")
      expect(existsSync(citPath)).toBe(true)
      const cit = readFileSync(citPath, "utf8")
      expect(cit).toContain("CC-BY 4.0")
      // Pelo menos 5 fontes documentadas (DOIs em markdown)
      const dois = cit.match(/\b10\.\d{4,9}\/[^\s)*]+/g) ?? []
      expect(dois.length).toBeGreaterThanOrEqual(5)
    })
  })

  describe("Landing /academy · seção de e-books", () => {
    const landingSrc = readFileSync(
      resolve(ROOT, "src/app/academy/page.tsx"),
      "utf8",
    )

    it("importa getOpenAccessEbooks", () => {
      expect(landingSrc).toMatch(/getOpenAccessEbooks/)
    })

    it("renderiza <section data-testid='academy-section-ebooks'>", () => {
      expect(landingSrc).toContain('data-testid="academy-section-ebooks"')
    })

    it("tem card por e-book com testid dinâmico", () => {
      expect(landingSrc).toContain('data-testid={`ebook-card-${eb.id}`}')
    })

    it("dispara evento 'ebook_download_clicked' no tracking", () => {
      expect(landingSrc).toContain("ebook_download_clicked")
    })
  })

  describe("Script de build do e-book (reprodutibilidade)", () => {
    it("existe scripts/ebooks/build-ebook-ortopedia.ts", () => {
      expect(existsSync(resolve(ROOT, "scripts/ebooks/build-ebook-ortopedia.ts"))).toBe(true)
    })

    it("existe scripts/ebooks/ortopedia.html (fonte)", () => {
      expect(existsSync(resolve(ROOT, "scripts/ebooks/ortopedia.html"))).toBe(true)
    })

    it("o HTML fonte tem referência ao Quantis logo horizontal", () => {
      const html = readFileSync(
        resolve(ROOT, "scripts/ebooks/ortopedia.html"),
        "utf8",
      )
      expect(html).toContain("quantis-logo-horizontal.png")
      expect(html).toContain("quantis-logo-symbol.png")
    })

    it("o HTML tem os 10 capítulos + anexos", () => {
      const html = readFileSync(
        resolve(ROOT, "scripts/ebooks/ortopedia.html"),
        "utf8",
      )
      // 10 aberturas de capítulo
      const chapterOpeners = html.match(/class="chapter-opener"/g) ?? []
      expect(chapterOpeners.length).toBe(10)
      // Anexos obrigatórios
      expect(html).toContain("Anexo A · Glossário")
      expect(html).toContain("Anexo B · Referências")
      expect(html).toContain("Anexo C · Pesquisadores")
      expect(html).toContain("Anexo D · Congressos")
    })

    it("o HTML cita pelo menos 10 DOIs reais", () => {
      const html = readFileSync(
        resolve(ROOT, "scripts/ebooks/ortopedia.html"),
        "utf8",
      )
      const dois = html.match(/\b10\.\d{4,9}\/[^\s)<]+/g) ?? []
      expect(dois.length).toBeGreaterThanOrEqual(10)
    })
  })
})
