/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R12.66 — Backend: versionamento + projetos + imagens do Notebook
 *  ─────────────────────────────────────────────────────────────────────
 *  Mandato Janaina (Fase 1 do pacote export/salvar/rastreabilidade):
 *
 *  "Cada alteração realizada em um conteúdo salvo deve gerar
 *   automaticamente uma nova versão numerada, sem apagar as versões
 *   anteriores. Exemplo: Versão 1; Versão 2; Versão 3. Cada versão deve
 *   registrar: Número da versão; Data e horário da alteração; Usuário
 *   responsável; Descrição resumida da alteração; Conteúdo anterior;
 *   Conteúdo atualizado."
 *
 *  "Antes de substituir ou alterar um conteúdo existente, perguntar ao
 *   usuário se deseja: 1. Atualizar a versão atual; ou 2. Criar uma nova
 *   versão. Como padrão, priorizar a criação de uma nova versão para
 *   preservar a rastreabilidade."
 *
 *  Este teste garante (análise estática do código-fonte, sem
 *  precisar de banco):
 *   A) Prisma schema declara Project, NotebookVersion, NotebookImage
 *      com todos os campos exigidos pela Janaina
 *   B) NotebookEntry tem currentVersion e projectId
 *   C) Helper src/lib/notebook/versioning.ts expõe as funções esperadas
 *      (snapshotFromEntry, createInitialVersion, createNewVersion,
 *       updateEntryWithVersion, restoreVersion, snapshotsAreEqual)
 *   D) APIs existem no lugar certo (/api/notebook/[id]/versions,
 *      /api/notebook/[id]/versions/[version],
 *      /api/notebook/[id]/versions/restore,
 *      /api/notebook/[id]/images,
 *      /api/projects)
 *   E) POST /api/notebook cria versão inicial (createInitialVersion)
 *      e aceita projectId
 *   F) PATCH /api/notebook usa updateEntryWithVersion e lê o query
 *      param updateInPlace (padrão = criar nova versão)
 *   G) Migration SQL R12.66 foi criada e cria as tabelas esperadas
 * ═══════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = resolve(__dirname, "..")

function readSrc(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8")
}

function fileExists(rel: string): boolean {
  return existsSync(resolve(ROOT, rel))
}

// ─────────────────────────────────────────────────────────────────────
describe("R12.66.A · Prisma schema — Project + NotebookVersion + NotebookImage", () => {
  const schema = readSrc("prisma/schema.prisma")

  it("User model referencia as novas relações R12.66", () => {
    expect(schema).toMatch(/projects\s+Project\[\]/)
    expect(schema).toMatch(/notebookVersions\s+NotebookVersion\[\]/)
    expect(schema).toMatch(/notebookImages\s+NotebookImage\[\]/)
  })

  it("NotebookEntry ganhou currentVersion (Int default 1) e projectId (String? opcional)", () => {
    // extrai o bloco NotebookEntry inteiro
    const match = schema.match(/model\s+NotebookEntry\s*\{[\s\S]*?\n\}/)
    expect(match).not.toBeNull()
    const block = match![0]
    expect(block).toMatch(/currentVersion\s+Int\s+@default\(1\)/)
    expect(block).toMatch(/projectId\s+String\?/)
    expect(block).toMatch(/project\s+Project\?/)
    expect(block).toMatch(/versions\s+NotebookVersion\[\]/)
    expect(block).toMatch(/images\s+NotebookImage\[\]/)
  })

  it("NotebookVersion model tem todos os campos de rastreabilidade da Janaina", () => {
    const match = schema.match(/model\s+NotebookVersion\s*\{[\s\S]*?\n\}/)
    expect(match).not.toBeNull()
    const block = match![0]

    // Campos obrigatórios pedidos verbatim
    expect(block).toMatch(/versionNumber\s+Int/)             // Número da versão
    expect(block).toMatch(/createdAt\s+DateTime/)            // Data e horário
    expect(block).toMatch(/userId\s+String/)                 // Usuário responsável
    expect(block).toMatch(/changeSummary\s+String\?/)        // Descrição resumida
    expect(block).toMatch(/previousSnapshot\s+Json\?/)       // Conteúdo anterior
    expect(block).toMatch(/snapshot\s+Json/)                 // Conteúdo atualizado

    // Unique constraint: uma entry não pode ter 2 versões com mesmo número
    expect(block).toMatch(/@@unique\(\[entryId,\s*versionNumber\]\)/)
  })

  it("NotebookImage model tem os campos de biblioteca de imagens da Janaina", () => {
    const match = schema.match(/model\s+NotebookImage\s*\{[\s\S]*?\n\}/)
    expect(match).not.toBeNull()
    const block = match![0]

    // Metadados científicos exigidos verbatim pela Janaina
    expect(block).toMatch(/title\s+String\?/)
    expect(block).toMatch(/caption\s+String\?/)
    expect(block).toMatch(/experimentId\s+String\?/)
    expect(block).toMatch(/sampleNumber\s+String\?/)
    expect(block).toMatch(/tags\s+String\[\]/)
    expect(block).toMatch(/observations\s+String\?/)

    // Associação a versão (rastreabilidade da foto)
    expect(block).toMatch(/versionNumber\s+Int\?/)

    // Armazenamento: base64 (R12.66) OU storageUrl (futuro R12.70)
    expect(block).toMatch(/dataBase64\s+String\?\s+@db\.Text/)
    expect(block).toMatch(/storageUrl\s+String\?/)

    // Sanidade — mime + size + dimensões
    expect(block).toMatch(/mimeType\s+String/)
    expect(block).toMatch(/sizeBytes\s+Int/)
  })

  it("Project model existe e é dedicado ao Notebook (separado de PipelineProject)", () => {
    const match = schema.match(/model\s+Project\s*\{[\s\S]*?\n\}/)
    expect(match).not.toBeNull()
    const block = match![0]

    expect(block).toMatch(/name\s+String/)
    expect(block).toMatch(/description\s+String\?/)
    expect(block).toMatch(/researchArea\s+String\?/)
    expect(block).toMatch(/color\s+String\?/)
    expect(block).toMatch(/isArchived\s+Boolean/)
    expect(block).toMatch(/entries\s+NotebookEntry\[\]/)
    expect(block).toMatch(/@@map\("projects"\)/)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.66.B · Migration SQL foi criada e aplicada", () => {
  const migrationDir = "prisma/migrations/20260731000001_r12_66_notebook_versioning_projects_images"

  it("A pasta da migration R12.66 existe", () => {
    expect(fileExists(migrationDir)).toBe(true)
  })

  it("A migration cria as 3 tabelas novas + alter na notebook_entries", () => {
    const sql = readSrc(`${migrationDir}/migration.sql`)
    expect(sql).toMatch(/CREATE TABLE.*"notebook_versions"/i)
    expect(sql).toMatch(/CREATE TABLE.*"notebook_images"/i)
    expect(sql).toMatch(/CREATE TABLE.*"projects"/i)
    expect(sql).toMatch(/ALTER TABLE\s+"notebook_entries"[\s\S]*?ADD COLUMN\s+"currentVersion"/i)
    expect(sql).toMatch(/ALTER TABLE\s+"notebook_entries"[\s\S]*?ADD COLUMN\s+"projectId"/i)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.66.C · Helper src/lib/notebook/versioning.ts", () => {
  const src = readSrc("src/lib/notebook/versioning.ts")

  it("exporta a interface EntrySnapshot com todos os campos versionáveis", () => {
    expect(src).toMatch(/export\s+interface\s+EntrySnapshot\b/)
    for (const field of [
      "title", "content", "entryType", "category",
      "tags", "generatedDoc", "metadata", "projectId",
    ]) {
      expect(src).toContain(field)
    }
  })

  it("exporta snapshotFromEntry, createInitialVersion, createNewVersion", () => {
    expect(src).toMatch(/export\s+function\s+snapshotFromEntry\s*\(/)
    expect(src).toMatch(/export\s+async\s+function\s+createInitialVersion\s*\(/)
    expect(src).toMatch(/export\s+async\s+function\s+createNewVersion\s*\(/)
  })

  it("exporta updateEntryWithVersion (transacional) e restoreVersion (transacional)", () => {
    expect(src).toMatch(/export\s+async\s+function\s+updateEntryWithVersion\s*\(/)
    expect(src).toMatch(/export\s+async\s+function\s+restoreVersion\s*\(/)
    // Ambos usam transação Prisma
    const updateBlock = src.match(/updateEntryWithVersion[\s\S]*?restoreVersion/)?.[0] ?? ""
    expect(updateBlock).toMatch(/\$transaction/)
  })

  it("exporta snapshotsAreEqual para comparação de snapshots", () => {
    expect(src).toMatch(/export\s+function\s+snapshotsAreEqual\s*\(/)
  })

  it("createInitialVersion sempre grava versionNumber = 1 com changeSummary 'Criação inicial'", () => {
    const block = src.match(/createInitialVersion[\s\S]*?^}/m)?.[0] ?? ""
    expect(block).toMatch(/versionNumber:\s*1/)
    expect(block).toMatch(/Cria[çc][ãa]o\s+inicial/i)
  })

  it("restoreVersion NUNCA apaga versões — sempre cria nova versão N+1", () => {
    // Isola o corpo da função entre "export async function restoreVersion" e
    // a próxima "export" (ou fim de arquivo). Regex simples e robusto.
    const start = src.indexOf("export async function restoreVersion")
    expect(start).toBeGreaterThan(-1)
    const rest = src.slice(start + "export async function restoreVersion".length)
    const nextExport = rest.search(/\n\/\*\*|\nexport\s+(?:async\s+)?function|\nexport\s+interface|\nexport\s+const/)
    const block = nextExport === -1 ? rest : rest.slice(0, nextExport)

    // Não deve haver .delete() na função restoreVersion
    expect(block).not.toMatch(/\.delete\(/)
    // Deve criar nova versão via createNewVersion (ou notebookVersion.create)
    expect(block).toMatch(/notebookVersion\.create|createNewVersion/)
    // Deve incrementar versão (currentVersion + 1)
    expect(block).toMatch(/currentVersion\s*\+\s*1/)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.66.D · APIs no lugar correto (Next.js App Router)", () => {
  const apis: Array<[string, string]> = [
    ["src/app/api/notebook/[id]/versions/route.ts",        "versions list + POST manual"],
    ["src/app/api/notebook/[id]/versions/[version]/route.ts", "single version + diff"],
    ["src/app/api/notebook/[id]/versions/restore/route.ts", "restore"],
    ["src/app/api/notebook/[id]/images/route.ts",          "images CRUD"],
    ["src/app/api/projects/route.ts",                       "projects CRUD"],
  ]

  it.each(apis)("existe: %s (%s)", (path) => {
    expect(fileExists(path)).toBe(true)
  })

  it("versions/route.ts exporta GET e POST", () => {
    const src = readSrc("src/app/api/notebook/[id]/versions/route.ts")
    expect(src).toMatch(/export\s+async\s+function\s+GET\s*\(/)
    expect(src).toMatch(/export\s+async\s+function\s+POST\s*\(/)
  })

  it("versions/[version]/route.ts implementa diff via ?compareTo=", () => {
    const src = readSrc("src/app/api/notebook/[id]/versions/[version]/route.ts")
    expect(src).toMatch(/export\s+async\s+function\s+GET\s*\(/)
    expect(src).toMatch(/compareTo/)
  })

  it("versions/restore/route.ts exporta POST e usa restoreVersion", () => {
    const src = readSrc("src/app/api/notebook/[id]/versions/restore/route.ts")
    expect(src).toMatch(/export\s+async\s+function\s+POST\s*\(/)
    expect(src).toMatch(/restoreVersion/)
  })

  it("images/route.ts exporta GET, POST e DELETE com validação de mime image/*", () => {
    const src = readSrc("src/app/api/notebook/[id]/images/route.ts")
    expect(src).toMatch(/export\s+async\s+function\s+GET\s*\(/)
    expect(src).toMatch(/export\s+async\s+function\s+POST\s*\(/)
    expect(src).toMatch(/export\s+async\s+function\s+DELETE\s*\(/)
    // Deve rejeitar mime não-imagem
    expect(src).toMatch(/image\//)
    // Deve ter limite de tamanho
    expect(src).toMatch(/MAX_(BASE64_STRING_LENGTH|ORIGINAL_BYTES)|sizeBytes/)
  })

  it("projects/route.ts exporta GET, POST, PATCH e DELETE", () => {
    const src = readSrc("src/app/api/projects/route.ts")
    expect(src).toMatch(/export\s+async\s+function\s+GET\s*\(/)
    expect(src).toMatch(/export\s+async\s+function\s+POST\s*\(/)
    expect(src).toMatch(/export\s+async\s+function\s+PATCH\s*\(/)
    expect(src).toMatch(/export\s+async\s+function\s+DELETE\s*\(/)
  })

  it("todas as APIs versionadas validam ownership via session.user.id", () => {
    for (const [path] of apis) {
      const src = readSrc(path)
      expect(src, `${path} deve chamar auth()`).toMatch(/await\s+auth\(\)/)
      expect(src, `${path} deve filtrar por session.user.id`).toMatch(/session\.user\.id|session\?\.user\?\.id/)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.66.E · POST /api/notebook cria versão inicial + aceita projectId", () => {
  const src = readSrc("src/app/api/notebook/route.ts")

  it("importa createInitialVersion e updateEntryWithVersion do helper", () => {
    expect(src).toMatch(/createInitialVersion/)
    expect(src).toMatch(/updateEntryWithVersion/)
    expect(src).toMatch(/from\s+["']@\/lib\/notebook\/versioning["']/)
  })

  it("createSchema aceita projectId opcional", () => {
    // pega apenas o bloco do createSchema (antes do patchSchema)
    const before = src.split("const patchSchema")[0]
    expect(before).toMatch(/projectId:\s*z\.string\(\)\.optional\(\)/)
  })

  it("POST cria a entrada dentro de $transaction e chama createInitialVersion", () => {
    // Isola o corpo do POST (até antes do PATCH)
    const postBody = src.slice(src.indexOf("export async function POST"), src.indexOf("export async function PATCH"))
    expect(postBody).toMatch(/\$transaction/)
    expect(postBody).toMatch(/createInitialVersion\(/)
    expect(postBody).toMatch(/currentVersion:\s*1/)
  })

  it("POST valida ownership do projectId antes de criar (evita atalho vazio de segurança)", () => {
    const postBody = src.slice(src.indexOf("export async function POST"), src.indexOf("export async function PATCH"))
    expect(postBody).toMatch(/prisma\.project\.findFirst/)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.66.F · PATCH /api/notebook usa updateEntryWithVersion + updateInPlace", () => {
  const src = readSrc("src/app/api/notebook/route.ts")
  const patchBody = src.slice(src.indexOf("export async function PATCH"), src.indexOf("export async function DELETE"))

  it("Lê o query param updateInPlace do request", () => {
    expect(patchBody).toMatch(/updateInPlace/)
    expect(patchBody).toMatch(/searchParams\.get\(["']updateInPlace["']\)/)
  })

  it("Chama updateEntryWithVersion (helper transacional)", () => {
    expect(patchBody).toMatch(/updateEntryWithVersion\(/)
  })

  it("Padrão = criar NOVA versão (updateInPlace só ativa se ?updateInPlace=true)", () => {
    // updateInPlace só é true quando a query param bate exatamente "true"
    expect(patchBody).toMatch(/updateInPlace\s*=\s*searchParams\.get\(["']updateInPlace["']\)\s*===\s*["']true["']/)
  })

  it("Responde com newVersionNumber para o front saber que versão foi criada", () => {
    expect(patchBody).toMatch(/newVersionNumber/)
  })

  it("Passa changeSummary do body para o helper (rastreabilidade da alteração)", () => {
    expect(patchBody).toMatch(/changeSummary/)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.66.G · Sanidade global — arquivos existem, imports coerentes", () => {
  it("Todos os arquivos R12.66 criados nesta sprint existem em disco", () => {
    const files = [
      "prisma/schema.prisma",
      "prisma/migrations/20260731000001_r12_66_notebook_versioning_projects_images/migration.sql",
      "src/lib/notebook/versioning.ts",
      "src/app/api/notebook/route.ts",
      "src/app/api/notebook/[id]/versions/route.ts",
      "src/app/api/notebook/[id]/versions/[version]/route.ts",
      "src/app/api/notebook/[id]/versions/restore/route.ts",
      "src/app/api/notebook/[id]/images/route.ts",
      "src/app/api/projects/route.ts",
    ]
    for (const f of files) {
      expect(fileExists(f), `Arquivo esperado ausente: ${f}`).toBe(true)
    }
  })

  it("Nenhuma API R12.66 vaza chave/secret hardcoded", () => {
    const files = [
      "src/app/api/notebook/route.ts",
      "src/app/api/notebook/[id]/versions/route.ts",
      "src/app/api/notebook/[id]/versions/[version]/route.ts",
      "src/app/api/notebook/[id]/versions/restore/route.ts",
      "src/app/api/notebook/[id]/images/route.ts",
      "src/app/api/projects/route.ts",
    ]
    for (const f of files) {
      const src = readSrc(f)
      expect(src, `${f} não deve conter chaves API hardcoded`).not.toMatch(/sk-[A-Za-z0-9]{20,}/)
      expect(src, `${f} não deve conter DATABASE_URL hardcoded`).not.toMatch(/postgres:\/\/[^"'`]+/)
    }
  })
})
