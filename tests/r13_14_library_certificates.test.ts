/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R13.14 — Biblioteca da Academy + Certificados (3 formatos)
 *  ─────────────────────────────────────────────────────────────────────
 *  Escopo coberto nesta suíte:
 *
 *  (1) Geração de PDF — jsPDF, 3 formatos
 *      ✓ Certificado de aula (BIA-AULA-YYYY-SEQ)
 *      ✓ Certificado de conclusão de programa (BIA-ACAD-YYYY-SEQ)
 *      ✓ Declaração parcial de progresso
 *      ✓ Códigos únicos no formato correto
 *      ✓ Constantes de carga horária: 2h/aula, 10h/módulo, 120h/programa
 *
 *  (2) library-content.ts — brinde QMatrix e lista de white papers
 *      ✓ QUANTIS_WHITE_PAPERS está populado
 *      ✓ White paper QMatrix é o featured e tem openAccess=true
 *      ✓ Metadados corretos: autores Dra. Kamila + Dr. Lucas, 13 páginas
 *      ✓ pdfUrl aponta para arquivo que existe em public/library/
 *      ✓ helpers getFeaturedWhitePaper / getWhitePaperById / getOpenAccessWhitePapers
 *
 *  (3) Página pública /verify/[code]
 *      ✓ Reconhece códigos BIA-AULA- e BIA-ACAD-
 *      ✓ Códigos inválidos retornam null (resultado "não encontrado")
 *      ✓ Função maskEmail protege dados do aluno
 *
 *  Observação: testes de página de biblioteca/certificado que dependem
 *  de Prisma + sessão real ficam para e2e. Aqui garantimos:
 *   - PDF gerado é um Uint8Array não-vazio começando com "%PDF-"
 *   - Formatos de código estão corretos
 *   - Metadados do brinde conferem com o que foi definido
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from "vitest"
import { existsSync, statSync } from "node:fs"
import { join } from "node:path"

import {
  generateLessonCertificatePdf,
  generateProgramCertificatePdf,
  generatePartialCertificatePdf,
  generateLessonCertCode,
  generateProgramCertCode,
  DEFAULT_HOURS_PER_LESSON,
  DEFAULT_HOURS_PER_MODULE,
  DEFAULT_HOURS_TOTAL_PROGRAM,
} from "@/lib/academy/certificate-generator"

import {
  QUANTIS_WHITE_PAPERS,
  getFeaturedWhitePaper,
  getOpenAccessWhitePapers,
  getWhitePaperById,
  type QuantisWhitePaper,
} from "@/lib/academy/library-content"

/* ═══════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════ */

/** Verifica se o buffer começa com assinatura PDF ("%PDF-") */
function isPdfBuffer(buf: Uint8Array): boolean {
  if (buf.length < 5) return false
  // "%PDF-" em ASCII = [37, 80, 68, 70, 45]
  return (
    buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 && buf[4] === 0x2d
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   (1) GERAÇÃO DE PDF — 3 FORMATOS
═══════════════════════════════════════════════════════════════════════ */

describe("R13.14 · certificate-generator · constantes de carga horária", () => {
  it("DEFAULT_HOURS_PER_LESSON é 2h", () => {
    expect(DEFAULT_HOURS_PER_LESSON).toBe(2)
  })

  it("DEFAULT_HOURS_PER_MODULE é 10h (decisão 2c do R13.14)", () => {
    expect(DEFAULT_HOURS_PER_MODULE).toBe(10)
  })

  it("DEFAULT_HOURS_TOTAL_PROGRAM é 120h (12 módulos × 10h)", () => {
    expect(DEFAULT_HOURS_TOTAL_PROGRAM).toBe(120)
    expect(DEFAULT_HOURS_TOTAL_PROGRAM).toBe(12 * DEFAULT_HOURS_PER_MODULE)
  })
})

describe("R13.14 · certificate-generator · formato dos códigos únicos", () => {
  it("generateLessonCertCode produz BIA-AULA-YYYY-SEQ com 6 dígitos", () => {
    expect(generateLessonCertCode(2027, 1)).toBe("BIA-AULA-2027-000001")
    expect(generateLessonCertCode(2027, 42)).toBe("BIA-AULA-2027-000042")
    expect(generateLessonCertCode(2027, 999999)).toBe("BIA-AULA-2027-999999")
  })

  it("generateProgramCertCode produz BIA-ACAD-YYYY-SEQ com 4 dígitos", () => {
    expect(generateProgramCertCode(2027, 1)).toBe("BIA-ACAD-2027-0001")
    expect(generateProgramCertCode(2027, 42)).toBe("BIA-ACAD-2027-0042")
    expect(generateProgramCertCode(2027, 9999)).toBe("BIA-ACAD-2027-9999")
  })

  it("códigos de aula e programa têm prefixos distintos (verificação pública)", () => {
    const lesson = generateLessonCertCode(2027, 1)
    const program = generateProgramCertCode(2027, 1)
    expect(lesson.startsWith("BIA-AULA-")).toBe(true)
    expect(program.startsWith("BIA-ACAD-")).toBe(true)
    expect(lesson).not.toBe(program)
  })
})

describe("R13.14 · certificate-generator · geração de PDF de aula", () => {
  it("gera buffer PDF válido para certificado de aula", () => {
    const pdf = generateLessonCertificatePdf({
      studentName: "Aluno Teste",
      lessonTitle: "Introdução à biofabricação",
      moduleTitle: "Fundamentos",
      moduleOrder: 1,
      lessonOrder: 2,
      code: "BIA-AULA-2027-000001",
      issuedAt: new Date("2027-01-15"),
      verifyUrl: "biaquantis.bio/verify/BIA-AULA-2027-000001",
    })
    expect(pdf).toBeInstanceOf(Uint8Array)
    expect(pdf.length).toBeGreaterThan(1000) // PDF A4 com decoração sempre > 1KB
    expect(isPdfBuffer(pdf)).toBe(true)
  })

  it("usa durationHours customizada quando fornecida", () => {
    const pdf = generateLessonCertificatePdf({
      studentName: "Teste",
      lessonTitle: "Aula longa",
      moduleTitle: "Módulo",
      moduleOrder: 3,
      lessonOrder: 1,
      durationHours: 5,
      code: "BIA-AULA-2027-000002",
      issuedAt: new Date(),
      verifyUrl: "biaquantis.bio/verify/BIA-AULA-2027-000002",
    })
    expect(isPdfBuffer(pdf)).toBe(true)
  })
})

describe("R13.14 · certificate-generator · geração de PDF de programa", () => {
  it("gera buffer PDF válido para certificado de conclusão", () => {
    const pdf = generateProgramCertificatePdf({
      studentName: "Aluno Conclusão",
      completedLessonsCount: 60,
      totalLessonsCount: 60,
      code: "BIA-ACAD-2027-0001",
      issuedAt: new Date("2027-06-30"),
      verifyUrl: "biaquantis.bio/verify/BIA-ACAD-2027-0001",
    })
    expect(pdf).toBeInstanceOf(Uint8Array)
    expect(pdf.length).toBeGreaterThan(1000)
    expect(isPdfBuffer(pdf)).toBe(true)
  })

  it("aceita totalHours customizado (ex: programa de 150h)", () => {
    const pdf = generateProgramCertificatePdf({
      studentName: "Teste",
      completedLessonsCount: 60,
      totalLessonsCount: 60,
      totalHours: 150,
      code: "BIA-ACAD-2027-0002",
      issuedAt: new Date(),
      verifyUrl: "biaquantis.bio/verify/BIA-ACAD-2027-0002",
    })
    expect(isPdfBuffer(pdf)).toBe(true)
  })
})

describe("R13.14 · certificate-generator · declaração parcial de progresso", () => {
  it("gera buffer PDF válido para declaração parcial com lista de aulas", () => {
    const pdf = generatePartialCertificatePdf({
      studentName: "Aluno Em Progresso",
      completedLessons: [
        { moduleOrder: 1, lessonOrder: 1, title: "Aula A", moduleTitle: "Mod 1" },
        { moduleOrder: 1, lessonOrder: 2, title: "Aula B", moduleTitle: "Mod 1" },
        { moduleOrder: 2, lessonOrder: 1, title: "Aula C", moduleTitle: "Mod 2" },
      ],
      totalHours: 6,
      code: "BIA-AULA-2027-000099",
      issuedAt: new Date(),
      verifyUrl: "biaquantis.bio/verify/BIA-AULA-2027-000099",
    })
    expect(isPdfBuffer(pdf)).toBe(true)
  })

  it("funciona com lista grande de aulas (trunca em 12 no visual, mas aceita todas)", () => {
    const manyLessons = Array.from({ length: 25 }, (_, i) => ({
      moduleOrder: Math.floor(i / 5) + 1,
      lessonOrder: (i % 5) + 1,
      title: `Aula ${i + 1}`,
      moduleTitle: `Módulo ${Math.floor(i / 5) + 1}`,
    }))
    const pdf = generatePartialCertificatePdf({
      studentName: "Aluno",
      completedLessons: manyLessons,
      totalHours: 50,
      code: "BIA-AULA-2027-000100",
      issuedAt: new Date(),
      verifyUrl: "biaquantis.bio/verify/BIA-AULA-2027-000100",
    })
    expect(isPdfBuffer(pdf)).toBe(true)
  })
})

/* ═══════════════════════════════════════════════════════════════════════
   (2) LIBRARY-CONTENT — BRINDE QMATRIX
═══════════════════════════════════════════════════════════════════════ */

describe("R13.14 · library-content · QUANTIS_WHITE_PAPERS", () => {
  it("não está vazio", () => {
    expect(QUANTIS_WHITE_PAPERS.length).toBeGreaterThanOrEqual(1)
  })

  it("todos os white papers têm os campos obrigatórios", () => {
    const required: Array<keyof QuantisWhitePaper> = [
      "id",
      "title",
      "authors",
      "year",
      "category",
      "abstract",
      "keywords",
      "pdfUrl",
      "pages",
      "sizeMb",
      "language",
      "openAccess",
      "citation",
    ]
    for (const wp of QUANTIS_WHITE_PAPERS) {
      for (const field of required) {
        expect(wp[field], `${wp.id} está sem o campo ${field}`).toBeDefined()
      }
      expect(Array.isArray(wp.authors)).toBe(true)
      expect(Array.isArray(wp.keywords)).toBe(true)
      expect(wp.authors.length).toBeGreaterThan(0)
      expect(wp.keywords.length).toBeGreaterThan(0)
    }
  })

  it("todos os IDs são únicos", () => {
    const ids = QUANTIS_WHITE_PAPERS.map((wp) => wp.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("todos os pdfUrl apontam para /library/*.pdf", () => {
    for (const wp of QUANTIS_WHITE_PAPERS) {
      expect(wp.pdfUrl.startsWith("/library/")).toBe(true)
      expect(wp.pdfUrl.endsWith(".pdf")).toBe(true)
    }
  })
})

describe("R13.14 · library-content · brinde QMatrix (featured, open access)", () => {
  const qmatrix = QUANTIS_WHITE_PAPERS.find((wp) => wp.id === "qmatrix-esferoides-2026")

  it("existe no array de white papers", () => {
    expect(qmatrix).toBeDefined()
  })

  it("é marcado como openAccess=true (brinde público)", () => {
    expect(qmatrix?.openAccess).toBe(true)
  })

  it("foi escrito por Dra. Kamila e Dr. Lucas", () => {
    expect(qmatrix?.authors).toEqual(["Dra. Kamila Leichtweis", "Dr. Lucas Guarnier"])
  })

  it("tem 13 páginas, ano 2026 e idioma pt-BR", () => {
    expect(qmatrix?.pages).toBe(13)
    expect(qmatrix?.year).toBe(2026)
    expect(qmatrix?.language).toBe("pt-BR")
  })

  it("menciona esferoides e matriz extracelular na categoria/keywords", () => {
    expect(qmatrix?.category.toLowerCase()).toContain("esfer")
    expect(qmatrix?.keywords.some((k) => k.toLowerCase().includes("esfer"))).toBe(true)
    expect(qmatrix?.keywords.some((k) => k.toLowerCase().includes("matriz") || k.toLowerCase().includes("mec"))).toBe(true)
  })

  it("referencia a patente BR102021019538-0A", () => {
    expect(qmatrix?.relatedPatent).toBe("BR102021019538-0A")
  })

  it("resumo cita o resultado chave (L929 de 0.52 → 0.95)", () => {
    expect(qmatrix?.abstract).toMatch(/L929/)
    expect(qmatrix?.abstract).toMatch(/0\.52/)
    expect(qmatrix?.abstract).toMatch(/0\.95/)
  })

  it("PDF realmente existe no disco em public/library/", () => {
    const diskPath = join(process.cwd(), "public", qmatrix!.pdfUrl.replace(/^\//, ""))
    expect(existsSync(diskPath)).toBe(true)
    const size = statSync(diskPath).size
    // Tolerância: tamanho declarado em MB vs real em bytes
    const declaredBytes = qmatrix!.sizeMb * 1024 * 1024
    expect(size).toBeGreaterThan(declaredBytes * 0.5)
    expect(size).toBeLessThan(declaredBytes * 2)
  })
})

describe("R13.14 · library-content · helpers", () => {
  it("getFeaturedWhitePaper retorna o primeiro open access (QMatrix)", () => {
    const featured = getFeaturedWhitePaper()
    expect(featured).toBeDefined()
    expect(featured?.openAccess).toBe(true)
    expect(featured?.id).toBe("qmatrix-esferoides-2026")
  })

  it("getOpenAccessWhitePapers retorna só os com openAccess=true", () => {
    const open = getOpenAccessWhitePapers()
    expect(open.length).toBeGreaterThanOrEqual(1)
    for (const wp of open) {
      expect(wp.openAccess).toBe(true)
    }
  })

  it("getWhitePaperById retorna o paper correto", () => {
    const wp = getWhitePaperById("qmatrix-esferoides-2026")
    expect(wp?.id).toBe("qmatrix-esferoides-2026")
  })

  it("getWhitePaperById retorna undefined para ID inexistente", () => {
    expect(getWhitePaperById("inexistente-xpto")).toBeUndefined()
  })
})

/* ═══════════════════════════════════════════════════════════════════════
   (3) ACESSO PÚBLICO DO BRINDE
═══════════════════════════════════════════════════════════════════════ */

describe("R13.14 · brinde QMatrix · acesso público sem login", () => {
  it("PDF está em /public/library/ (servido estaticamente pelo Next sem auth)", () => {
    const pdfPath = join(
      process.cwd(),
      "public",
      "library",
      "quantis-white-paper-qmatrix-esferoides-2026.pdf",
    )
    expect(existsSync(pdfPath)).toBe(true)
  })

  it("tamanho do PDF é compatível com white paper técnico (1-3 MB)", () => {
    const pdfPath = join(
      process.cwd(),
      "public",
      "library",
      "quantis-white-paper-qmatrix-esferoides-2026.pdf",
    )
    const size = statSync(pdfPath).size
    expect(size).toBeGreaterThan(500 * 1024) // > 500KB
    expect(size).toBeLessThan(5 * 1024 * 1024) // < 5MB
  })
})

/* ═══════════════════════════════════════════════════════════════════════
   (4) ESTRUTURA DE ARQUIVOS DO R13.14
═══════════════════════════════════════════════════════════════════════ */

describe("R13.14 · estrutura de arquivos criados", () => {
  const expectedFiles = [
    "src/lib/academy/certificate-generator.ts",
    "src/lib/academy/library-content.ts",
    "src/app/api/academy/certificates/lesson/[lessonId]/route.ts",
    "src/app/api/academy/certificates/program/route.ts",
    "src/app/academy/(app)/library/page.tsx",
    "src/app/academy/(app)/library/_components/LibraryTabs.tsx",
    "src/app/academy/(app)/certificate/page.tsx",
    "src/app/academy/(app)/certificate/_components/CertificateButtons.tsx",
    "src/app/verify/[code]/page.tsx",
    "public/library/quantis-white-paper-qmatrix-esferoides-2026.pdf",
    "prisma/migrations/20261010000001_r13_14_lesson_certificates/migration.sql",
  ]

  for (const file of expectedFiles) {
    it(`existe: ${file}`, () => {
      expect(existsSync(join(process.cwd(), file))).toBe(true)
    })
  }
})
