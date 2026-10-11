/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R13.14.1 — Captura de leads do brinde (biblioteca)
 *  ─────────────────────────────────────────────────────────────────────
 *  Escopo coberto nesta suíte (sem mock de DB — valida a estrutura):
 *
 *  (1) Schema Prisma: LibraryLead
 *      ✓ Modelo existe no schema
 *      ✓ Campos obrigatórios presentes
 *      ✓ Index únicos corretos
 *
 *  (2) Migration SQL
 *      ✓ Arquivo existe
 *      ✓ Cria tabela library_leads
 *      ✓ Define unique(email, resourceId)
 *
 *  (3) API /api/library/lead (route handler + validação zod)
 *      ✓ Arquivo existe com POST exportado
 *      ✓ Valida nome, email, instituição mínimos
 *      ✓ Verifica resourceId contra QUANTIS_WHITE_PAPERS
 *
 *  (4) API /api/library/leads/export (CSV)
 *      ✓ Arquivo existe com GET exportado
 *      ✓ Checa permissão admin
 *
 *  (5) Componente BrindeDownloadGate
 *      ✓ Arquivo existe
 *      ✓ Modal + form + campos obrigatórios
 *      ✓ Chama /api/library/lead no submit
 *
 *  (6) Página admin /dashboard/admin/academy/leads
 *      ✓ Arquivo existe
 *      ✓ Usa checkAcademyAdminOrRedirect
 *      ✓ Lista leads + KPIs + exportação CSV
 *
 *  (7) Landing /academy — usa o gate (não <a> direto)
 *      ✓ Importa BrindeDownloadGate
 *      ✓ Não tem mais <a href=pdfUrl download> no CTA do brinde
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

const ROOT = process.cwd()
function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf-8")
}

/* ═══════════════════════════════════════════════════════════════════════
   (1) SCHEMA PRISMA
═══════════════════════════════════════════════════════════════════════ */

describe("R13.14.1 · schema.prisma · model LibraryLead", () => {
  const schema = read("prisma/schema.prisma")

  it("declara model LibraryLead com @@map('library_leads')", () => {
    expect(schema).toMatch(/model\s+LibraryLead\s*\{/)
    expect(schema).toMatch(/@@map\(\s*"library_leads"\s*\)/)
  })

  it("tem campos obrigatórios: resourceId, resourceTitle, name, email, institution", () => {
    const block = schema.split(/model\s+LibraryLead\s*\{/)[1]?.split(/^}/m)[0] ?? ""
    for (const field of [
      "resourceId",
      "resourceTitle",
      "name",
      "email",
      "institution",
    ]) {
      expect(block, `campo ${field} faltando`).toMatch(new RegExp(`\\b${field}\\s+String`))
    }
  })

  it("tem downloadCount Int com default 1", () => {
    const block = schema.split(/model\s+LibraryLead\s*\{/)[1]?.split(/^}/m)[0] ?? ""
    expect(block).toMatch(/downloadCount\s+Int\s+@default\(\s*1\s*\)/)
  })

  it("tem consentMarketing Boolean com default false (LGPD opt-in)", () => {
    const block = schema.split(/model\s+LibraryLead\s*\{/)[1]?.split(/^}/m)[0] ?? ""
    expect(block).toMatch(/consentMarketing\s+Boolean\s+@default\(\s*false\s*\)/)
  })

  it("tem unique composto (email, resourceId) para upsert", () => {
    const block = schema.split(/model\s+LibraryLead\s*\{/)[1]?.split(/^}/m)[0] ?? ""
    expect(block).toMatch(/@@unique\(\s*\[\s*email\s*,\s*resourceId\s*\]\s*\)/)
  })

  it("tem index por resourceId, email, lastDownloadAt, createdAt", () => {
    const block = schema.split(/model\s+LibraryLead\s*\{/)[1]?.split(/^}/m)[0] ?? ""
    expect(block).toMatch(/@@index\(\s*\[\s*resourceId\s*\]\s*\)/)
    expect(block).toMatch(/@@index\(\s*\[\s*email\s*\]\s*\)/)
    expect(block).toMatch(/@@index\(\s*\[\s*lastDownloadAt\s*\]\s*\)/)
    expect(block).toMatch(/@@index\(\s*\[\s*createdAt\s*\]\s*\)/)
  })
})

/* ═══════════════════════════════════════════════════════════════════════
   (2) MIGRATION SQL
═══════════════════════════════════════════════════════════════════════ */

describe("R13.14.1 · migration SQL", () => {
  const migPath = "prisma/migrations/20261010000002_r13_14_1_library_leads/migration.sql"

  it("arquivo existe", () => {
    expect(existsSync(join(ROOT, migPath))).toBe(true)
  })

  it("cria tabela library_leads com colunas essenciais", () => {
    const sql = read(migPath)
    expect(sql).toMatch(/CREATE TABLE "library_leads"/)
    for (const col of [
      '"resourceId"', '"resourceTitle"', '"name"', '"email"',
      '"institution"', '"downloadCount"', '"consentMarketing"',
    ]) {
      expect(sql, `coluna ${col} faltando`).toContain(col)
    }
  })

  it("cria unique index (email, resourceId)", () => {
    const sql = read(migPath)
    expect(sql).toMatch(/CREATE UNIQUE INDEX "library_leads_email_resourceId_key"[^;]+"email", "resourceId"/s)
  })

  it("cria índices de busca", () => {
    const sql = read(migPath)
    expect(sql).toMatch(/CREATE INDEX "library_leads_resourceId_idx"/)
    expect(sql).toMatch(/CREATE INDEX "library_leads_email_idx"/)
    expect(sql).toMatch(/CREATE INDEX "library_leads_lastDownloadAt_idx"/)
    expect(sql).toMatch(/CREATE INDEX "library_leads_createdAt_idx"/)
  })
})

/* ═══════════════════════════════════════════════════════════════════════
   (3) API /api/library/lead
═══════════════════════════════════════════════════════════════════════ */

describe("R13.14.1 · API /api/library/lead (POST)", () => {
  const path = "src/app/api/library/lead/route.ts"

  it("arquivo existe e exporta POST", () => {
    expect(existsSync(join(ROOT, path))).toBe(true)
    const src = read(path)
    expect(src).toMatch(/export\s+async\s+function\s+POST\s*\(/)
  })

  it("valida com zod os campos obrigatórios", () => {
    const src = read(path)
    expect(src).toMatch(/z\.object/)
    expect(src).toMatch(/resourceId:\s*z\.string/)
    expect(src).toMatch(/name:\s*z\.string/)
    expect(src).toMatch(/email:\s*z\.string[^,]*\.email/)
    expect(src).toMatch(/institution:\s*z\.string/)
  })

  it("verifica resourceId contra QUANTIS_WHITE_PAPERS", () => {
    const src = read(path)
    expect(src).toMatch(/getWhitePaperById/)
    expect(src).toMatch(/openAccess/)
  })

  it("usa upsert por (email, resourceId) para evitar duplicatas", () => {
    const src = read(path)
    expect(src).toMatch(/\.libraryLead\.upsert/)
    expect(src).toMatch(/email_resourceId/)
  })

  it("incrementa downloadCount no update", () => {
    const src = read(path)
    expect(src).toMatch(/downloadCount:\s*\{\s*increment:\s*1\s*\}/)
  })

  it("não persiste IP (LGPD-friendly)", () => {
    const src = read(path)
    // Garante que não há leitura de forwarded-for / ip
    expect(src).not.toMatch(/x-forwarded-for/i)
    expect(src).not.toMatch(/\brequest\.ip\b/i)
  })
})

/* ═══════════════════════════════════════════════════════════════════════
   (4) API /api/library/leads/export (CSV)
═══════════════════════════════════════════════════════════════════════ */

describe("R13.14.1 · API /api/library/leads/export (GET)", () => {
  const path = "src/app/api/library/leads/export/route.ts"

  it("arquivo existe e exporta GET", () => {
    expect(existsSync(join(ROOT, path))).toBe(true)
    const src = read(path)
    expect(src).toMatch(/export\s+async\s+function\s+GET\s*\(/)
  })

  it("checa autenticação + role (ADMIN/INSTRUCTOR ou superadmin)", () => {
    const src = read(path)
    expect(src).toMatch(/\bauth\(\)/)
    expect(src).toMatch(/isSuperAdmin/)
    expect(src).toMatch(/"ADMIN"/)
    expect(src).toMatch(/"INSTRUCTOR"/)
  })

  it("retorna CSV com headers de attachment e BOM UTF-8", () => {
    const src = read(path)
    expect(src).toMatch(/content-type.*text\/csv/i)
    expect(src).toMatch(/content-disposition.*attachment/i)
    expect(src).toMatch(/\\uFEFF/) // BOM
  })

  it("escapa valores com vírgula/aspas/newline (RFC 4180)", () => {
    const src = read(path)
    expect(src).toMatch(/escapeCsv/)
    expect(src).toMatch(/\.replace\(\s*\/"\/g\s*,\s*'""'\s*\)/)
  })
})

/* ═══════════════════════════════════════════════════════════════════════
   (5) COMPONENTE BrindeDownloadGate
═══════════════════════════════════════════════════════════════════════ */

describe("R13.14.1 · componente BrindeDownloadGate", () => {
  const path = "src/app/academy/_components/BrindeDownloadGate.tsx"

  it("arquivo existe e é client component", () => {
    expect(existsSync(join(ROOT, path))).toBe(true)
    const src = read(path)
    expect(src.trim().startsWith('"use client"')).toBe(true)
  })

  it("exporta BrindeDownloadGate", () => {
    const src = read(path)
    expect(src).toMatch(/export\s+function\s+BrindeDownloadGate/)
  })

  it("renderiza inputs required: name, email, institution", () => {
    const src = read(path)
    expect(src).toMatch(/name="name"[^>]*required/s)
    expect(src).toMatch(/name="email"[^>]*required/s)
    expect(src).toMatch(/name="institution"[^>]*required/s)
  })

  it("POSTa para /api/library/lead", () => {
    const src = read(path)
    expect(src).toMatch(/fetch\(\s*["']\/api\/library\/lead["']/)
    expect(src).toMatch(/method:\s*["']POST["']/)
  })

  it("dispara download via createElement('a') após sucesso", () => {
    const src = read(path)
    expect(src).toMatch(/document\.createElement\(\s*["']a["']\s*\)/)
    expect(src).toMatch(/\.download\s*=/)
    expect(src).toMatch(/\.click\(\)/)
  })

  it("tem checkbox de consent LGPD opt-in", () => {
    const src = read(path)
    expect(src).toMatch(/name="consent"/)
    expect(src).toMatch(/consentMarketing/)
  })

  it("captura UTM params da URL e referrer", () => {
    const src = read(path)
    expect(src).toMatch(/utm_source/)
    expect(src).toMatch(/utm_medium/)
    expect(src).toMatch(/utm_campaign/)
    expect(src).toMatch(/document\.referrer/)
  })

  it("tem acessibilidade: role=dialog + aria-labelledby + ESC fecha", () => {
    const src = read(path)
    expect(src).toMatch(/role=["']dialog["']/)
    expect(src).toMatch(/aria-modal/)
    expect(src).toMatch(/aria-labelledby/)
    expect(src).toMatch(/e\.key\s*===\s*["']Escape["']/)
  })
})

/* ═══════════════════════════════════════════════════════════════════════
   (6) PÁGINA ADMIN /dashboard/admin/academy/leads
═══════════════════════════════════════════════════════════════════════ */

describe("R13.14.1 · página admin /dashboard/admin/academy/leads", () => {
  const path = "src/app/dashboard/admin/academy/leads/page.tsx"

  it("arquivo existe", () => {
    expect(existsSync(join(ROOT, path))).toBe(true)
  })

  it("usa checkAcademyAdminOrRedirect (gate de permissão)", () => {
    const src = read(path)
    expect(src).toMatch(/checkAcademyAdminOrRedirect/)
    expect(src).toMatch(/redirect\(redirectTo\)/)
  })

  it("lista leads do banco (prisma.libraryLead.findMany)", () => {
    const src = read(path)
    expect(src).toMatch(/prisma\.libraryLead\.findMany/)
  })

  it("mostra KPIs: total leads, downloads, instituições, consent", () => {
    const src = read(path)
    expect(src).toMatch(/stat-total-leads/)
    expect(src).toMatch(/stat-total-downloads/)
    expect(src).toMatch(/stat-institutions/)
    expect(src).toMatch(/stat-consent/)
  })

  it("expõe link para export CSV", () => {
    const src = read(path)
    expect(src).toMatch(/\/api\/library\/leads\/export/)
    expect(src).toMatch(/leads-export-csv/)
  })

  it("suporta filtros por q (busca) e resource (recurso específico)", () => {
    const src = read(path)
    expect(src).toMatch(/searchParams/)
    expect(src).toMatch(/\bq\b/)
    expect(src).toMatch(/\bresource\b/)
  })

  it("agrupa por recurso (downloads por white paper)", () => {
    const src = read(path)
    expect(src).toMatch(/\.libraryLead\.groupBy/)
    expect(src).toMatch(/by:\s*\[\s*"resourceId"/)
  })

  it("regressão: orderBy do groupBy por recurso NÃO usa _count._all (Prisma 7 rejeita)", () => {
    // Em Prisma 7, orderBy: { _count: { _all: "desc" } } quebra em runtime com
    // "Unknown argument `_all`". Precisa ser um campo real do model.
    const src = read(path)
    expect(src).not.toMatch(/orderBy:\s*\{\s*_count:\s*\{\s*_all:/)
  })
})

/* ═══════════════════════════════════════════════════════════════════════
   (7) PÁGINA ADMIN /dashboard/admin/academy — card de atalho
═══════════════════════════════════════════════════════════════════════ */

describe("R13.14.1 · dashboard admin · card de atalho para leads", () => {
  const src = read("src/app/dashboard/admin/academy/page.tsx")

  it("inclui link para /dashboard/admin/academy/leads", () => {
    expect(src).toMatch(/href="\/dashboard\/admin\/academy\/leads"/)
    expect(src).toMatch(/admin-academy-leads-card/)
  })

  it("mostra contadores: total de leads + downloads", () => {
    expect(src).toMatch(/prisma\.libraryLead\.count/)
    expect(src).toMatch(/\.aggregate\(/)
    expect(src).toMatch(/downloadCount/)
  })
})

/* ═══════════════════════════════════════════════════════════════════════
   (8) LANDING /academy — usa o gate em vez de <a> direto
═══════════════════════════════════════════════════════════════════════ */

describe("R13.14.1 · landing /academy · integra o gate", () => {
  const src = read("src/app/academy/page.tsx")

  it("importa BrindeDownloadGate", () => {
    expect(src).toMatch(/import\s+\{\s*BrindeDownloadGate\s*\}\s+from/)
  })

  it("usa <BrindeDownloadGate> na seção do brinde", () => {
    expect(src).toMatch(/<BrindeDownloadGate\b/)
    expect(src).toMatch(/resourceId=\{FEATURED_BRINDE\.id\}/)
    expect(src).toMatch(/pdfUrl=\{FEATURED_BRINDE\.pdfUrl\}/)
  })

  it("NÃO tem mais <a href={FEATURED_BRINDE.pdfUrl} download> no CTA do brinde", () => {
    expect(src).not.toMatch(/<a\s+href=\{FEATURED_BRINDE\.pdfUrl\}\s+download/)
  })
})
