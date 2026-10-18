/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R13.15.2 — Gate de acesso do E-book (exclusivo alunos BIA Academy)
 *  ─────────────────────────────────────────────────────────────────────
 *  DECISÃO (Janaina, 2026-10-18):
 *   O e-book de Ortopedia deixa de ser gratuito e vira BRINDE exclusivo
 *   da matrícula BIA Academy. Serve como atrativo da venda e aumenta
 *   percepção de valor do curso.
 *
 *  ESTE ARQUIVO TRAVA (defense in depth):
 *   A) library-content.ts marca o e-book como restrictedToStudents=true,
 *      openAccess=false, com privateFilePath apontando para /private-library/
 *   B) O arquivo PDF NÃO existe em /public/library/ (não é servido direto
 *      pelo Next.js como estático)
 *   C) O arquivo PDF EXISTE em /private-library/ e é um PDF válido
 *   D) O pdfUrl aponta para rota autenticada /api/library/download/[id]
 *   E) A landing /academy mostra o gate (não mais o BrindeDownloadGate direto):
 *      - Badge "🔒 Exclusivo alunos"
 *      - 2 CTAs: "Matricular e desbloquear" + "Já sou aluno · Baixar"
 *   F) Helpers de seleção respeitam a flag:
 *      - getOpenAccessEbooks() NÃO retorna o e-book restrito
 *      - getStudentOnlyEbooks() retorna só os restritos
 *      - getStudentOnlyMaterialById(id) só retorna se restricted + tem privateFilePath
 *   G) A rota /api/library/download/[id]/route.ts existe e tem a lógica
 *      de autenticação + check de matrícula
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  QUANTIS_WHITE_PAPERS,
  getOpenAccessEbooks,
  getStudentOnlyEbooks,
  getStudentOnlyMaterialById,
  getAllStudentAccessibleMaterials,
  getFeaturedWhitePaper,
} from "../src/lib/academy/library-content"

const ROOT = resolve(__dirname, "..")
const ORTOPEDIA_ID = "ebook-biofabricacao-ortopedia-2026"

describe("R13.15.2 · Gate de acesso do e-book de Ortopedia", () => {
  const ebook = QUANTIS_WHITE_PAPERS.find((wp) => wp.id === ORTOPEDIA_ID)

  describe("(A) library-content.ts · schema correto", () => {
    it("o e-book está cadastrado", () => {
      expect(ebook).toBeDefined()
    })

    it("é restrictedToStudents=true", () => {
      expect(ebook!.restrictedToStudents).toBe(true)
    })

    it("NÃO é openAccess (mutuamente exclusivo com restricted)", () => {
      expect(ebook!.openAccess).toBe(false)
    })

    it("tem privateFilePath apontando para diretório privado (/private-library ou /src/content/ebooks)", () => {
      expect(ebook!.privateFilePath).toBeDefined()
      // R13.15.4 · aceita ambos os paths (migração de /private-library/ → /src/content/ebooks/)
      expect(ebook!.privateFilePath).toMatch(
        /^(private-library|src\/content\/ebooks)\//,
      )
    })

    it("pdfUrl aponta para a rota autenticada /api/library/download/", () => {
      expect(ebook!.pdfUrl).toContain("/api/library/download/")
      expect(ebook!.pdfUrl).toContain(ORTOPEDIA_ID)
    })

    it("citation menciona 'Exclusivo para alunos'", () => {
      expect(ebook!.citation.toLowerCase()).toContain("exclusivo")
    })
  })

  describe("(B/C) Arquivo físico fora de /public/library/ e no path privado", () => {
    it("o PDF NÃO existe em public/library/ebook-biofabricacao-ortopedia-2026.pdf", () => {
      const publicPath = resolve(
        ROOT,
        "public/library/ebook-biofabricacao-ortopedia-2026.pdf",
      )
      expect(existsSync(publicPath)).toBe(false)
    })

    it("o PDF EXISTE no privateFilePath declarado (sem bater path hardcoded)", () => {
      const privatePath = resolve(ROOT, ebook!.privateFilePath!)
      expect(existsSync(privatePath)).toBe(true)
    })

    it("o PDF privado é um arquivo PDF válido (%PDF- header)", () => {
      const privatePath = resolve(ROOT, ebook!.privateFilePath!)
      const header = readFileSync(privatePath).slice(0, 8).toString("ascii")
      expect(header).toMatch(/^%PDF-/)
    })

    it("a capa (coverUrl) PODE continuar em /public (é só preview)", () => {
      // Capa não é o conteúdo protegido — pode ficar pública pra UX
      const coverPath = resolve(ROOT, "public", ebook!.coverUrl!.replace(/^\//, ""))
      expect(existsSync(coverPath)).toBe(true)
    })
  })

  describe("(F) Helpers de seleção respeitam a flag restrictedToStudents", () => {
    it("getOpenAccessEbooks() NÃO inclui o e-book restrito", () => {
      const openEbooks = getOpenAccessEbooks()
      expect(openEbooks.find((e) => e.id === ORTOPEDIA_ID)).toBeUndefined()
    })

    it("getStudentOnlyEbooks() INCLUI o e-book restrito", () => {
      const studentOnly = getStudentOnlyEbooks()
      const found = studentOnly.find((e) => e.id === ORTOPEDIA_ID)
      expect(found).toBeDefined()
      expect(found!.restrictedToStudents).toBe(true)
    })

    it("getStudentOnlyMaterialById retorna o e-book quando ID é correto", () => {
      const material = getStudentOnlyMaterialById(ORTOPEDIA_ID)
      expect(material).toBeDefined()
      expect(material!.id).toBe(ORTOPEDIA_ID)
    })

    it("getStudentOnlyMaterialById rejeita ID de material open-access", () => {
      // QMatrix é white-paper openAccess — não deve passar
      const material = getStudentOnlyMaterialById("qmatrix-esferoides-2026")
      expect(material).toBeUndefined()
    })

    it("getStudentOnlyMaterialById rejeita ID inexistente", () => {
      const material = getStudentOnlyMaterialById("non-existent-id-123")
      expect(material).toBeUndefined()
    })

    it("getAllStudentAccessibleMaterials inclui tanto open-access quanto restricted", () => {
      const all = getAllStudentAccessibleMaterials()
      expect(all.find((m) => m.id === ORTOPEDIA_ID)).toBeDefined() // restricted
      expect(all.find((m) => m.id === "qmatrix-esferoides-2026")).toBeDefined() // open
    })

    it("getFeaturedWhitePaper NÃO retorna o e-book (preserva QMatrix como brinde público)", () => {
      const featured = getFeaturedWhitePaper()
      expect(featured).toBeDefined()
      expect(featured!.id).not.toBe(ORTOPEDIA_ID)
      expect(featured!.kind).toBe("white-paper")
    })
  })

  describe("(G) Rota /api/library/download/[id] existe e tem a lógica certa", () => {
    const routePath = resolve(ROOT, "src/app/api/library/download/[id]/route.ts")

    it("o arquivo da rota existe", () => {
      expect(existsSync(routePath)).toBe(true)
    })

    it("usa runtime=nodejs (precisa fs.readFile)", () => {
      const src = readFileSync(routePath, "utf8")
      expect(src).toMatch(/runtime\s*=\s*["']nodejs["']/)
    })

    it("autentica via NextAuth (await auth())", () => {
      const src = readFileSync(routePath, "utf8")
      expect(src).toContain("await auth()")
    })

    it("redireciona para /login quando não autenticado", () => {
      const src = readFileSync(routePath, "utf8")
      expect(src).toMatch(/\/login/)
      expect(src).toContain("callbackUrl")
    })

    it("checa hasAccess da matrícula (ACTIVE ou COMPLETED)", () => {
      const src = readFileSync(routePath, "utf8")
      expect(src).toContain("hasAccess")
      expect(src).toContain("academyEnrollment.findUnique")
    })

    it("tem admin bypass (SUPERADMIN ou role=ADMIN)", () => {
      const src = readFileSync(routePath, "utf8")
      expect(src).toContain("isSuperAdmin")
      expect(src).toMatch(/role\s*===?\s*["']ADMIN["']/)
    })

    it("usa getStudentOnlyMaterialById para enforcement", () => {
      const src = readFileSync(routePath, "utf8")
      expect(src).toContain("getStudentOnlyMaterialById")
    })

    it("serve o arquivo como application/pdf", () => {
      const src = readFileSync(routePath, "utf8")
      expect(src).toContain("application/pdf")
    })

    it("usa Cache-Control: no-store (não cacheia conteúdo protegido)", () => {
      const src = readFileSync(routePath, "utf8")
      expect(src).toMatch(/Cache-Control.*no-store/)
    })

    it("redireciona para /academy#ebooks quando aluno não tem acesso", () => {
      const src = readFileSync(routePath, "utf8")
      expect(src).toContain('"/academy"')
      expect(src).toContain('"ebooks"')
      expect(src).toContain("gate")
    })
  })

  describe("(E) Landing /academy mostra o gate de 2 CTAs, não o download direto", () => {
    const landingSrc = readFileSync(resolve(ROOT, "src/app/academy/page.tsx"), "utf8")

    it("importa getStudentOnlyEbooks", () => {
      expect(landingSrc).toContain("getStudentOnlyEbooks")
    })

    it("usa STUDENT_ONLY_EBOOKS no render (não só FEATURED_EBOOKS)", () => {
      expect(landingSrc).toContain("STUDENT_ONLY_EBOOKS")
    })

    it("renderiza badge 'Exclusivo alunos' no card", () => {
      expect(landingSrc).toMatch(/Exclusivo alunos/i)
    })

    it("tem CTA 'Matricular e desbloquear' apontando pro Asaas", () => {
      expect(landingSrc).toMatch(/Matricular e desbloquear/i)
      expect(landingSrc).toContain("ASAAS_LINK")
    })

    it("tem CTA secundário 'Já sou aluno · Baixar' indo pro login", () => {
      expect(landingSrc).toMatch(/Já sou aluno/i)
      expect(landingSrc).toContain("/login")
    })

    it("dispara tracking de eventos distintos para cada CTA do gate", () => {
      expect(landingSrc).toContain("ebook_gate_enroll_clicked")
      expect(landingSrc).toContain("ebook_gate_login_clicked")
    })

    it("tem data-testid 'ebook-gate-' para localizar nos testes E2E", () => {
      expect(landingSrc).toContain("ebook-gate-")
    })

    it("NÃO renderiza BrindeDownloadGate para o e-book restrito", () => {
      // O BrindeDownloadGate pode continuar sendo usado para o QMatrix (brinde
      // público), mas o e-book restrito deve usar o gate novo. Isso é garantido
      // porque o map agora é sobre STUDENT_ONLY_EBOOKS, não FEATURED_EBOOKS.
      // Verifica que o map de STUDENT_ONLY_EBOOKS não chama BrindeDownloadGate.
      const studentSection = landingSrc.match(
        /STUDENT_ONLY_EBOOKS\.map[\s\S]*?<\/section>/,
      )
      expect(studentSection).toBeTruthy()
      // Dentro do bloco student-only, não deve ter BrindeDownloadGate.
      expect(studentSection![0]).not.toContain("BrindeDownloadGate")
    })
  })

  describe("Biblioteca interna /academy/(app)/library · badge brinde", () => {
    const librarySrc = readFileSync(
      resolve(ROOT, "src/app/academy/(app)/library/page.tsx"),
      "utf8",
    )

    it("renderiza badge '🎁 Brinde da matrícula' quando restrictedToStudents", () => {
      expect(librarySrc).toContain("restrictedToStudents")
      expect(librarySrc).toMatch(/Brinde da matrícula/i)
    })

    it("tem data-testid identificando o badge brinde", () => {
      expect(librarySrc).toContain("library-badge-student-only-")
    })

    it("renderiza badge 'E-book' quando kind='ebook'", () => {
      expect(librarySrc).toMatch(/kind\s*===?\s*["']ebook["']/)
    })
  })

  describe("Build script escreve PDF fora de /public/library/", () => {
    const buildScriptPath = resolve(
      ROOT,
      "scripts/ebooks/build-ebook-ortopedia.ts",
    )
    const buildSrc = readFileSync(buildScriptPath, "utf8")

    it("o output path NÃO aponta para /public/library/", () => {
      // O arquivo pode estar em /private-library/ (R13.15.2) ou
      // /src/content/ebooks/ (R13.15.4). O que NÃO pode é estar em /public.
      expect(buildSrc).not.toContain(
        "public/library/ebook-biofabricacao-ortopedia-2026.pdf",
      )
      // Deve estar em algum path privado reconhecido
      const temPathPrivado =
        buildSrc.includes("private-library/ebook-biofabricacao-ortopedia-2026.pdf") ||
        buildSrc.includes("src/content/ebooks/ebook-biofabricacao-ortopedia-2026.pdf")
      expect(temPathPrivado).toBe(true)
    })
  })
})
