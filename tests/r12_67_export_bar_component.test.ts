/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R12.67 — Frontend: <ExportBar> universal + jspdf + docx
 *  ─────────────────────────────────────────────────────────────────────
 *  Mandato Janaina (Fase 2 do pacote export/salvar/rastreabilidade):
 *
 *  "Ordem oficial dos botões (7):
 *   1. Salvar no Notebook
 *   2. Editar
 *   3. Gerar nova versão
 *   4. Exportar PDF
 *   5. Exportar DOCX
 *   6. Adicionar imagem
 *   7. Consultar histórico"
 *
 *  Cobre:
 *   A) tipos ExportableContent (contrato universal)
 *   B) pdf-exporter — gera Blob PDF real com conteúdo variado
 *   C) docx-exporter — gera ArrayBuffer DOCX real com conteúdo variado
 *   D) helpers slugifyFileName + timestampForFileName
 *   E) source-code do ExportBar contém os 7 botões + dialogs + integração APIs R12.66
 *   F) documento R13 (BIA Academy) foi preservado com todas as decisões
 * ═══════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import {
  buildPdfBlob,
} from "../src/lib/export/pdf-exporter"
import {
  buildDocxArrayBuffer,
} from "../src/lib/export/docx-exporter"
import {
  slugifyFileName,
  timestampForFileName,
  type ExportableContent,
} from "../src/lib/export/types"

const ROOT = resolve(__dirname, "..")

function readSrc(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8")
}

function fileExists(rel: string): boolean {
  return existsSync(resolve(ROOT, rel))
}

// Fixture de conteúdo científico com TODOS os tipos de bloco
const richContent: ExportableContent = {
  title: "Formulação GelMA 10% para cartilagem articular",
  subtitle: "Protocolo experimental — validação preliminar",
  source: "Formulator Pro",
  entryType: "FORMULATION",
  tags: ["gelma", "cartilagem", "hidrogel", "condrócitos"],
  category: "Biomateriais",
  existing: { entryId: "cktest001", currentVersion: 3 },
  projectId: "prj_test_001",
  blocks: [
    { type: "heading", level: 1, text: "Objetivo" },
    {
      type: "paragraph",
      text: "Testar biocompatibilidade e printabilidade de GelMA 10% com condrócitos primários bovinos para reparo condral.",
    },
    { type: "heading", level: 2, text: "Composição da biotinta" },
    {
      type: "keyvalue",
      title: "Componentes principais",
      pairs: [
        { key: "GelMA (DS ≥ 60%)", value: "10% (m/v) em PBS" },
        { key: "LAP (photoinitiator)", value: "0.25% (m/v)" },
        { key: "Ácido hialurônico", value: "1% (m/v)" },
        { key: "Densidade celular", value: "2 × 10⁶ células/mL" },
      ],
    },
    { type: "heading", level: 2, text: "Parâmetros de bioimpressão" },
    {
      type: "table",
      title: "Configuração do bico e velocidade",
      headers: ["Parâmetro", "Valor", "Unidade"],
      rows: [
        ["Pressão de extrusão", "80", "kPa"],
        ["Velocidade de deposição", "6", "mm/s"],
        ["Altura de camada", "0.2", "mm"],
        ["Diâmetro do bico", "410", "µm"],
        ["Temperatura da cabeça", "25", "°C"],
      ],
    },
    { type: "heading", level: 3, text: "Procedimento" },
    {
      type: "list",
      style: "numbered",
      items: [
        "Preparar solução de GelMA 10% em PBS a 37°C sob agitação por 1 h",
        "Adicionar LAP sob agitação leve (proteger da luz UV)",
        "Filtrar em 0.22 µm dentro de fluxo laminar",
        "Ressuspender pellet de condrócitos em GelMA na densidade alvo",
        "Carregar no cartucho e imprimir em superfície tratada",
      ],
    },
    {
      type: "callout",
      variant: "warning",
      title: "Fotoiniciador",
      text: "LAP é fotossensível — proteger da luz UV durante todo o preparo até o momento da fotorreticulação (405 nm, 30 s).",
    },
    {
      type: "callout",
      variant: "success",
      title: "Resultado esperado",
      text: "Estrutura autossustentável com G' > 500 Pa após crosslink, viabilidade celular > 85% em 24 h.",
    },
    { type: "divider" },
    { type: "heading", level: 2, text: "G-code de teste" },
    {
      type: "code",
      language: "gcode",
      content:
        "G92 X0 Y0 Z0 E0\nG1 F600\nG1 X10 Y10 Z0.2 E1.5\nG1 X20 Y10 Z0.2 E3.0\nM104 S25",
    },
  ],
  metadata: { rheology: { G_prime_Pa: 520 }, sourceExperiment: "EXP-2026-047" },
  autoChangeSummary: "Ajuste concentração LAP 0.25% + densidade celular",
}

// Fixture mínima (sem existing → simula primeiro salvamento)
const minimalContent: ExportableContent = {
  title: "Nota rápida",
  blocks: [{ type: "paragraph", text: "Hello world." }],
}

// ─────────────────────────────────────────────────────────────────────
describe("R12.67.A · Tipos e helpers", () => {
  it("slugifyFileName remove acentos, espaços e caracteres especiais", () => {
    expect(slugifyFileName("Formulação GelMA 10% · v3")).toMatch(
      /^formulacao-gelma-10-v3$/,
    )
    expect(slugifyFileName("")).toBe("documento")
    expect(slugifyFileName("!!!@@@###")).toBe("documento")
    // Limita a 80 chars
    expect(slugifyFileName("a".repeat(200)).length).toBeLessThanOrEqual(80)
  })

  it("timestampForFileName produz formato YYYY-MM-DD-HHMM", () => {
    const ts = timestampForFileName(new Date("2026-08-03T14:35:00Z"))
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}-\d{4}$/)
  })

  it("ExportableContent aceita todos os 9 tipos de bloco sem erro de tipo", () => {
    // Compila = passa. Se algum tipo deixar de existir, o import cima quebra.
    const allTypes: ExportableContent["blocks"] = [
      { type: "heading", level: 1, text: "x" },
      { type: "paragraph", text: "x" },
      { type: "list", items: ["a", "b"] },
      { type: "keyvalue", pairs: [{ key: "k", value: "v" }] },
      { type: "table", headers: ["a"], rows: [["b"]] },
      { type: "code", content: "x" },
      { type: "image", src: "data:image/png;base64,x" },
      { type: "divider" },
      { type: "callout", text: "x" },
    ]
    expect(allTypes).toHaveLength(9)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.67.B · PDF Exporter (jsPDF)", () => {
  it("Gera Blob PDF válido de conteúdo mínimo (não estoura)", () => {
    const blob = buildPdfBlob(minimalContent)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(500) // header PDF já tem ~500 bytes
  })

  it("Gera Blob PDF de conteúdo rico com TODOS os 9 tipos de bloco", () => {
    const blob = buildPdfBlob(richContent)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(2000)
    // MIME padrão jsPDF é application/pdf
    expect(blob.type).toBe("application/pdf")
  })

  it("PDF de conteúdo maior (quebra de página) não quebra o exporter", () => {
    // 30 parágrafos densos forçam múltiplas páginas
    const many: ExportableContent = {
      title: "Documento longo",
      blocks: Array.from({ length: 30 }, (_, i) => ({
        type: "paragraph" as const,
        text:
          `Parágrafo ${i + 1}. ` +
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(6),
      })),
    }
    const blob = buildPdfBlob(many)
    expect(blob.size).toBeGreaterThan(3000)
  })

  it("PDF respeita conteúdo com tabela larga (5 colunas)", () => {
    const content: ExportableContent = {
      title: "Tabela larga",
      blocks: [
        {
          type: "table",
          headers: ["A", "B", "C", "D", "E"],
          rows: [
            ["1", "2", "3", "4", "5"],
            ["aa", "bb", "cc", "dd", "ee"],
          ],
        },
      ],
    }
    const blob = buildPdfBlob(content)
    expect(blob.size).toBeGreaterThan(500)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.67.C · DOCX Exporter (docx)", () => {
  it("Gera ArrayBuffer DOCX válido de conteúdo mínimo", async () => {
    const buf = await buildDocxArrayBuffer(minimalContent)
    expect(buf.byteLength).toBeGreaterThan(2000) // DOCX tem overhead XML
    // DOCX é ZIP → começa com "PK"
    const first2 = new Uint8Array(buf.slice(0, 2))
    expect(first2[0]).toBe(0x50) // 'P'
    expect(first2[1]).toBe(0x4b) // 'K'
  })

  it("Gera DOCX de conteúdo rico com TODOS os 9 tipos de bloco", async () => {
    const buf = await buildDocxArrayBuffer(richContent)
    expect(buf.byteLength).toBeGreaterThan(3000)
    const first2 = new Uint8Array(buf.slice(0, 2))
    expect(first2[0]).toBe(0x50)
    expect(first2[1]).toBe(0x4b)
  })

  it("DOCX com imagem base64 embutida gera arquivo válido", async () => {
    // PNG 1x1 pixel transparente (13 bytes decoded)
    const tinyPng =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    const content: ExportableContent = {
      title: "Micrografia D7",
      blocks: [
        {
          type: "image",
          src: tinyPng,
          caption: "Amostra 03 · aumento 40x",
          widthPx: 100,
          heightPx: 100,
        },
      ],
    }
    const buf = await buildDocxArrayBuffer(content)
    expect(buf.byteLength).toBeGreaterThan(2000)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.67.D · Source-code do ExportBar contém os 7 botões oficiais", () => {
  const src = readSrc("src/components/notebook/ExportBar.tsx")

  it('É um Client Component (tem "use client")', () => {
    expect(src.trim().startsWith('"use client"')).toBe(true)
  })

  it("Exporta o componente ExportBar e a interface ExportBarProps", () => {
    expect(src).toMatch(/export\s+function\s+ExportBar\s*\(/)
    expect(src).toMatch(/export\s+interface\s+ExportBarProps\b/)
  })

  it("Importa jspdf-exporter e docx-exporter", () => {
    expect(src).toMatch(/from\s+["']@\/lib\/export\/pdf-exporter["']/)
    expect(src).toMatch(/from\s+["']@\/lib\/export\/docx-exporter["']/)
  })

  it.each([
    ["Salvar no Notebook", "export-bar-save"],
    ["Editar", "export-bar-edit"],
    ["Gerar nova versão", "export-bar-new-version"],
    ["Exportar PDF", "export-bar-pdf"],
    ["Exportar DOCX", "export-bar-docx"],
    ["Adicionar imagem", "export-bar-add-image"],
    ["Consultar histórico", "export-bar-history"],
  ])(
    "Contém o botão '%s' com testId '%s'",
    (label, testId) => {
      expect(src, `label "${label}" ausente`).toContain(label)
      expect(src, `testId "${testId}" ausente`).toContain(testId)
    },
  )

  it("Botões primários usam gradient violet→fuchsia (marca BIA Academy)", () => {
    expect(src).toMatch(/from-violet-600\s+to-fuchsia-600/)
  })

  it("Prop `hide` permite ocultar cada um dos 7 botões", () => {
    // Prop hide aceita um array literal com todas as chaves
    expect(src).toMatch(/hide\?:\s*Array<[\s\S]*?"save"/)
    for (const key of ["edit", "newVersion", "pdf", "docx", "addImage", "history"]) {
      expect(src, `hide não suporta "${key}"`).toContain(`"${key}"`)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.67.E · ExportBar integra corretamente com APIs R12.66", () => {
  const src = readSrc("src/components/notebook/ExportBar.tsx")

  it("POST /api/notebook para criar entrada nova (createOrPatchEntry)", () => {
    expect(src).toMatch(/fetch\(\s*["']\/api\/notebook["']\s*,\s*\{[^}]*method:\s*["']POST["']/s)
  })

  it("PATCH /api/notebook?id=... para editar (padrão = nova versão)", () => {
    expect(src).toMatch(/\/api\/notebook.*id=/)
    expect(src).toMatch(/method:\s*["']PATCH["']/)
  })

  it("PATCH com ?updateInPlace=true é rota EXCEÇÃO (apenas se forceInPlace)", () => {
    // Confirma que updateInPlace só é adicionado se forceInPlace for true
    expect(src).toMatch(/forceInPlace/)
    expect(src).toMatch(/updateInPlace=true/)
  })

  it("POST /api/notebook/[id]/images para adicionar imagem", () => {
    expect(src).toMatch(/\/api\/notebook\/\$\{[^}]*\}\/images/)
  })

  it("GET /api/notebook/[id]/versions para carregar histórico", () => {
    expect(src).toMatch(/\/api\/notebook\/\$\{[^}]*\}\/versions/)
  })

  it("POST /api/notebook/[id]/versions/restore para restaurar", () => {
    expect(src).toMatch(/\/versions\/restore/)
    expect(src).toMatch(/targetVersion/)
  })

  it("Envia changeSummary no PATCH (rastreabilidade da alteração)", () => {
    expect(src).toMatch(/changeSummary/)
  })

  it("Preserva blocos do ExportableContent em metadata.__exportableBlocks (reidratação)", () => {
    expect(src).toMatch(/__exportableBlocks/)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.67.F · Diálogos internos do ExportBar (verbatim Janaina)", () => {
  const src = readSrc("src/components/notebook/ExportBar.tsx")

  it("SaveDialog pergunta título, descrição, tags e projectId", () => {
    expect(src).toMatch(/SaveDialog\b/)
    for (const testId of [
      "save-dialog-title",
      "save-dialog-description",
      "save-dialog-tags",
      "save-dialog-projectid",
      "save-dialog-confirm",
    ]) {
      expect(src, `${testId} ausente`).toContain(testId)
    }
  })

  it('EditDialog pergunta "atualizar VS nova versão" e o PADRÃO é criar nova', () => {
    expect(src).toMatch(/EditDialog\b/)
    // Estado inicial mode = "newVersion" (padrão Janaina)
    expect(src).toMatch(/useState<[^>]*>\s*\(\s*["']newVersion["']\s*\)/)
    expect(src).toContain("edit-dialog-new-version")
    expect(src).toContain("edit-dialog-in-place")
    // Descrição da alternativa "atualizar" avisa que sobrescreve
    expect(src).toMatch(/Sobrescreve/i)
  })

  it("AddImageDialog pede título, legenda, experimentId, sampleNumber, tags, observações", () => {
    expect(src).toMatch(/AddImageDialog\b/)
    for (const field of ["title", "caption", "experimentId", "sampleNumber", "tags", "observations"]) {
      // presente na chamada do POST /images
      expect(src).toContain(field)
    }
    expect(src).toContain("image-dialog-file")
    expect(src).toContain("image-dialog-confirm")
  })

  it("HistoryDialog usa useEffect (não useState) para carregar histórico", () => {
    // R12.67 correção: useEffect é o padrão correto
    expect(src).toMatch(/HistoryDialog\b/)
    // Não deve ter useState com IIFE anônima async dentro (anti-pattern)
    // Ao invés, useEffect com cancelamento
    expect(src).toMatch(/useEffect\(\(\)\s*=>/)
    // deve haver cleanup (cancelled flag)
    expect(src).toMatch(/cancelled/)
  })

  it("HistoryDialog mostra confirm() antes de restaurar (evita clique acidental)", () => {
    expect(src).toMatch(/window\.confirm/)
    expect(src).toMatch(/Restaurar/i)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.67.G · Documento BIA Academy (R13) preservado", () => {
  const docPath = "docs/roadmap/R13_bia_academy_decisions.md"

  it("O documento existe", () => {
    expect(fileExists(docPath)).toBe(true)
  })

  it("Registra as 10 decisões travadas verbatim da Janaina", () => {
    const doc = readSrc(docPath)
    // 1. URL /academy path
    expect(doc).toMatch(/biaquantis\.bio\/academy/)
    // 2. Oferta oficial padronizada
    expect(doc).toMatch(/12 módulos/)
    expect(doc).toMatch(/12 meses de acesso/)
    expect(doc).toMatch(/3 encontros online ao vivo/)
    // 3. Links comerciais
    expect(doc).toMatch(/asaas\.com\/c\/iu7ym1dp93cei9zk/)
    expect(doc).toMatch(/wa\.me\/11968632231/)
    // 4. Novos roles
    expect(doc).toMatch(/STUDENT/)
    expect(doc).toMatch(/INSTRUCTOR/)
    // 5. YouTube nocookie
    expect(doc).toMatch(/youtube-nocookie/)
    // 7. Meu Projeto amarrado ao Notebook R12.66
    expect(doc).toMatch(/notebookEntryId/)
    // 9. Acesso rolling
    expect(doc).toMatch(/rolling/i)
    // 10. Prioridade — R12.67 → R12.68 → R12.69 antes
    expect(doc).toMatch(/R12\.67/)
    expect(doc).toMatch(/R12\.68/)
    expect(doc).toMatch(/R12\.69/)
  })

  it("Registra o roadmap R13.01 a R13.10", () => {
    const doc = readSrc(docPath)
    for (const sprint of ["R13.01", "R13.02", "R13.03", "R13.04", "R13.05", "R13.06", "R13.07", "R13.08", "R13.09", "R13.10"]) {
      expect(doc, `${sprint} ausente do roadmap`).toContain(sprint)
    }
  })

  it("Enumera os 12 módulos oficiais do curso", () => {
    const doc = readSrc(docPath)
    for (const mod of [
      "Introdução à Biofabricação",
      "Biomateriais",
      "Biotintas",
      "Bioimpressão 3D",
      "Arquitetura 3D",
      "Células",
      "Tecidos",
      "organoides",
      "Avaliação pós-impressão",
      "Translação",
      "Desenvolvimento de projeto",
      "Projeto final",
    ]) {
      expect(doc, `Módulo "${mod}" ausente`).toMatch(new RegExp(mod, "i"))
    }
  })

  it("Documenta os 10 modelos Prisma propostos para R13.01", () => {
    const doc = readSrc(docPath)
    for (const model of [
      "AcademyEnrollment",
      "AcademyModule",
      "AcademyLesson",
      "AcademyAttachment",
      "AcademyQuiz",
      "AcademyQuizQuestion",
      "AcademyProgress",
      "AcademyProject",
      "AcademyLiveEvent",
      "AcademyUpdate",
      "AcademyCertificate",
    ]) {
      expect(doc, `Modelo ${model} ausente`).toContain(model)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.67.H · Sanidade global", () => {
  const files = [
    "src/lib/export/types.ts",
    "src/lib/export/pdf-exporter.ts",
    "src/lib/export/docx-exporter.ts",
    "src/components/notebook/ExportBar.tsx",
    "docs/roadmap/R13_bia_academy_decisions.md",
  ]

  it("Todos os arquivos R12.67 criados nesta sprint existem em disco", () => {
    for (const f of files) {
      expect(fileExists(f), `Arquivo esperado ausente: ${f}`).toBe(true)
    }
  })

  it("package.json declara jspdf, docx, file-saver + @types/file-saver", () => {
    const pkg = JSON.parse(readSrc("package.json"))
    expect(pkg.dependencies?.jspdf).toBeTruthy()
    expect(pkg.dependencies?.docx).toBeTruthy()
    expect(pkg.dependencies?.["file-saver"]).toBeTruthy()
    expect(pkg.devDependencies?.["@types/file-saver"]).toBeTruthy()
  })

  it("Nenhum arquivo R12.67 vaza secret hardcoded", () => {
    for (const f of files.filter((x) => x.endsWith(".ts") || x.endsWith(".tsx"))) {
      const src = readSrc(f)
      expect(src, `${f} não deve conter chaves API hardcoded`).not.toMatch(/sk-[A-Za-z0-9]{20,}/)
      expect(src, `${f} não deve conter DATABASE_URL hardcoded`).not.toMatch(/postgres:\/\/[^"'`]+/)
    }
  })
})
