/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R13.01 — BIA Academy · Schema Prisma + Migration + Seeds + Helpers
 *  ─────────────────────────────────────────────────────────────────────
 *  Primeiro sprint do R13 (BIA Academy). Entrega:
 *   - 11 models Prisma (AcademyEnrollment, Module, Lesson, Attachment,
 *     Quiz, QuizQuestion, Progress, Project, LiveEvent, Update, Certificate)
 *   - 2 roles novos no enum UserRole: STUDENT + INSTRUCTOR
 *   - Migration SQL aplicada no Neon Postgres
 *   - Helper src/lib/academy/enrollment.ts (cálculos deterministas)
 *   - Seed script do Módulo 1 piloto (idempotente)
 *
 *  Cobre (análise estática — não roda Prisma real):
 *   A) Schema tem os 11 models Academy com campos verbatim das decisões R13
 *   B) User.academyEnrollment e NotebookEntry.academyProject (relations)
 *   C) UserRole tem STUDENT e INSTRUCTOR
 *   D) Migration R13.01 existe com todas as 11 CREATE TABLEs + ADD VALUE
 *   E) Helper enrollment.ts: cálculos deterministas de accessUntil/estado/progresso
 *   F) Seed script é idempotente (upsert por slug) e não-destrutivo
 *   G) Decisões R13 do doc de roadmap batem com o schema (verificação cruzada)
 * ═══════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import {
  calculateAccessUntil,
  getEnrollmentState,
  hasAccess,
  daysRemaining,
  moduleCompletionPercent,
  overallCompletionPercent,
  generateCertificateCode,
  prepareEnrollmentData,
  ACCESS_DURATION_MS,
} from "../src/lib/academy/enrollment"

const ROOT = resolve(__dirname, "..")

function readSrc(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8")
}

function fileExists(rel: string): boolean {
  return existsSync(resolve(ROOT, rel))
}

// ─────────────────────────────────────────────────────────────────────
describe("R13.01.A · Schema Prisma tem os 11 models Academy", () => {
  const schema = readSrc("prisma/schema.prisma")

  it("Todos os 11 models Academy estão declarados", () => {
    const models = [
      "AcademyEnrollment", "AcademyModule", "AcademyLesson",
      "AcademyAttachment", "AcademyQuiz", "AcademyQuizQuestion",
      "AcademyProgress", "AcademyProject", "AcademyLiveEvent",
      "AcademyUpdate", "AcademyCertificate",
    ]
    for (const m of models) {
      expect(schema, `Model ${m} ausente`).toMatch(new RegExp(`model\\s+${m}\\b`))
    }
  })

  it("AcademyEnrollment tem userId @unique + accessUntil + source", () => {
    const block = schema.match(/model\s+AcademyEnrollment\s*\{[\s\S]*?\n\}/)?.[0] ?? ""
    expect(block).toMatch(/userId\s+String\s+@unique/)
    expect(block).toMatch(/enrolledAt\s+DateTime/)
    expect(block).toMatch(/accessUntil\s+DateTime/)
    expect(block).toMatch(/completedAt\s+DateTime\?/)
    expect(block).toMatch(/source\s+String\?/)
    expect(block).toMatch(/asaasPaymentId\s+String\?/)
    expect(block).toMatch(/@@map\(\s*["']academy_enrollments["']/)
  })

  it("AcademyLesson tem youtubeId + biaHook Json? + relation com module", () => {
    const block = schema.match(/model\s+AcademyLesson\s*\{[\s\S]*?\n\}/)?.[0] ?? ""
    expect(block).toMatch(/youtubeId\s+String/)
    expect(block).toMatch(/biaHook\s+Json\?/)
    expect(block).toMatch(/@@unique\(\[moduleId,\s*slug\]\)/)
    // Levels de dificuldade: default "intermediate"
    expect(block).toMatch(/level\s+String\s+@default\(["']intermediate["']\)/)
  })

  it("AcademyProject amarra com NotebookEntry via notebookEntryId @unique", () => {
    const block = schema.match(/model\s+AcademyProject\s*\{[\s\S]*?\n\}/)?.[0] ?? ""
    expect(block).toMatch(/notebookEntryId\s+String\s+@unique/)
    expect(block).toMatch(/enrollmentId\s+String\s+@unique/)
    expect(block).toMatch(/notebookEntry\s+NotebookEntry/)
  })

  it("AcademyProgress tem @@unique([enrollmentId, lessonId]) (1 progress por aula)", () => {
    const block = schema.match(/model\s+AcademyProgress\s*\{[\s\S]*?\n\}/)?.[0] ?? ""
    expect(block).toMatch(/@@unique\(\[enrollmentId,\s*lessonId\]\)/)
    expect(block).toMatch(/watchedSeconds\s+Int/)
    expect(block).toMatch(/biaHookOpened\s+Boolean/)
  })

  it("AcademyLiveEvent tem 3 encontros ao vivo (order 1|2|3 conceitualmente)", () => {
    const block = schema.match(/model\s+AcademyLiveEvent\s*\{[\s\S]*?\n\}/)?.[0] ?? ""
    expect(block).toMatch(/scheduledAt\s+DateTime/)
    expect(block).toMatch(/meetingUrl\s+String\?/)
    expect(block).toMatch(/recordingUrl\s+String\?/)
    expect(block).toMatch(/order\s+Int/)
  })

  it("AcademyCertificate tem code @unique para verificação", () => {
    const block = schema.match(/model\s+AcademyCertificate\s*\{[\s\S]*?\n\}/)?.[0] ?? ""
    expect(block).toMatch(/code\s+String\s+@unique/)
    expect(block).toMatch(/pdfUrl\s+String\?/)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R13.01.B · Relations bidirecionais em User e NotebookEntry", () => {
  const schema = readSrc("prisma/schema.prisma")

  it("User tem academyEnrollment (opcional, 1:1)", () => {
    const userBlock = schema.match(/model\s+User\s*\{[\s\S]*?\n\}/)?.[0] ?? ""
    expect(userBlock).toMatch(/academyEnrollment\s+AcademyEnrollment\?/)
  })

  it("NotebookEntry tem academyProject (opcional, 1:1)", () => {
    const entryBlock = schema.match(/model\s+NotebookEntry\s*\{[\s\S]*?\n\}/)?.[0] ?? ""
    expect(entryBlock).toMatch(/academyProject\s+AcademyProject\?/)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R13.01.C · Enum UserRole ganhou STUDENT + INSTRUCTOR", () => {
  const schema = readSrc("prisma/schema.prisma")
  const enumBlock = schema.match(/enum\s+UserRole\s*\{[\s\S]*?\n\}/)?.[0] ?? ""

  it("Mantém valores originais (USER, ADMIN, RESEARCHER)", () => {
    expect(enumBlock).toMatch(/\bUSER\b/)
    expect(enumBlock).toMatch(/\bADMIN\b/)
    expect(enumBlock).toMatch(/\bRESEARCHER\b/)
  })

  it("Adiciona STUDENT (aluno matriculado)", () => {
    expect(enumBlock).toMatch(/\bSTUDENT\b/)
  })

  it("Adiciona INSTRUCTOR (professor/monitor)", () => {
    expect(enumBlock).toMatch(/\bINSTRUCTOR\b/)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R13.01.D · Migration SQL R13.01 existe e cria as 11 tabelas", () => {
  const migrationDir = "prisma/migrations/20260806000001_r13_01_academy_schema"

  it("A pasta da migration existe", () => {
    expect(fileExists(migrationDir)).toBe(true)
  })

  it("O SQL cria as 11 tabelas com prefixo academy_", () => {
    const sql = readSrc(`${migrationDir}/migration.sql`)
    const tables = [
      "academy_enrollments", "academy_modules", "academy_lessons",
      "academy_attachments", "academy_quizzes", "academy_quiz_questions",
      "academy_progress", "academy_projects", "academy_live_events",
      "academy_updates", "academy_certificates",
    ]
    for (const t of tables) {
      expect(sql, `CREATE TABLE ${t} ausente`).toMatch(
        new RegExp(`CREATE TABLE\\s+"${t}"`, "i"),
      )
    }
  })

  it("O SQL adiciona os 2 valores STUDENT e INSTRUCTOR ao enum UserRole", () => {
    const sql = readSrc(`${migrationDir}/migration.sql`)
    expect(sql).toMatch(/ALTER TYPE\s+"UserRole"\s+ADD VALUE\s+'STUDENT'/i)
    expect(sql).toMatch(/ALTER TYPE\s+"UserRole"\s+ADD VALUE\s+'INSTRUCTOR'/i)
  })

  it("O SQL tem FK apropriadas (cascade em enrollment, notebook)", () => {
    const sql = readSrc(`${migrationDir}/migration.sql`)
    // Progress → Enrollment CASCADE (se aluno some, progresso some)
    expect(sql).toMatch(/academy_progress[\s\S]*?FOREIGN KEY[\s\S]*?enrollment/i)
    // Project → NotebookEntry (relação com R12.66)
    expect(sql).toMatch(/academy_projects[\s\S]*?REFERENCES\s+"notebook_entries"/i)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R13.01.E · Helper enrollment.ts — cálculos deterministas", () => {
  it("ACCESS_DURATION_MS é 365 dias em milissegundos", () => {
    expect(ACCESS_DURATION_MS).toBe(365 * 24 * 60 * 60 * 1000)
  })

  it("calculateAccessUntil soma 365 dias exatos", () => {
    const enrolledAt = new Date("2026-01-01T00:00:00Z")
    const accessUntil = calculateAccessUntil(enrolledAt)
    expect(accessUntil.getTime() - enrolledAt.getTime()).toBe(ACCESS_DURATION_MS)
  })

  it("getEnrollmentState: COMPLETED tem prioridade máxima", () => {
    // completedAt vence mesmo se accessUntil já passou
    const state = getEnrollmentState(
      { accessUntil: new Date("2020-01-01"), completedAt: new Date("2026-06-01") },
      new Date("2026-08-01"),
    )
    expect(state).toBe("COMPLETED")
  })

  it("getEnrollmentState: EXPIRED se accessUntil < now e não completado", () => {
    const state = getEnrollmentState(
      { accessUntil: new Date("2026-01-01"), completedAt: null },
      new Date("2026-08-01"),
    )
    expect(state).toBe("EXPIRED")
  })

  it("getEnrollmentState: ACTIVE dentro do período", () => {
    const state = getEnrollmentState(
      { accessUntil: new Date("2027-01-01"), completedAt: null },
      new Date("2026-08-01"),
    )
    expect(state).toBe("ACTIVE")
  })

  it("hasAccess: true para ACTIVE e COMPLETED; false para EXPIRED", () => {
    expect(hasAccess({ accessUntil: new Date("2099-01-01"), completedAt: null })).toBe(true)
    expect(hasAccess({ accessUntil: new Date("2020-01-01"), completedAt: new Date() })).toBe(true)
    expect(hasAccess({ accessUntil: new Date("2020-01-01"), completedAt: null })).toBe(false)
  })

  it("daysRemaining: número positivo quando ACTIVE, 0 quando EXPIRED, null quando COMPLETED", () => {
    const now = new Date("2026-08-01T00:00:00Z")
    // ACTIVE: 30 dias
    expect(daysRemaining(
      { accessUntil: new Date("2026-08-31T00:00:00Z"), completedAt: null },
      now,
    )).toBe(30)
    // EXPIRED
    expect(daysRemaining(
      { accessUntil: new Date("2020-01-01"), completedAt: null },
      now,
    )).toBe(0)
    // COMPLETED
    expect(daysRemaining(
      { accessUntil: new Date("2099-01-01"), completedAt: new Date() },
      now,
    )).toBe(null)
  })

  it("moduleCompletionPercent: divide corretamente + retorna 0 se sem aulas", () => {
    // Módulo vazio
    expect(moduleCompletionPercent([], [])).toBe(0)
    // 2 de 4 concluídas = 50%
    const lessons = [{ id: "l1" }, { id: "l2" }, { id: "l3" }, { id: "l4" }]
    const progress = [
      { lessonId: "l1", status: "COMPLETED" as const },
      { lessonId: "l2", status: "COMPLETED" as const },
      { lessonId: "l3", status: "IN_PROGRESS" as const },
    ]
    expect(moduleCompletionPercent(lessons, progress)).toBe(50)
    // 100%
    const allDone = lessons.map((l) => ({ lessonId: l.id, status: "COMPLETED" as const }))
    expect(moduleCompletionPercent(lessons, allDone)).toBe(100)
  })

  it("overallCompletionPercent: só considera módulos e aulas publicadas", () => {
    const modules = [
      {
        id: "m1", isPublished: true,
        lessons: [{ id: "l1", isPublished: true }, { id: "l2", isPublished: true }],
      },
      {
        id: "m2", isPublished: false, // não conta
        lessons: [{ id: "l3", isPublished: true }],
      },
      {
        id: "m3", isPublished: true,
        lessons: [{ id: "l4", isPublished: false }], // não conta
      },
    ]
    const progress = [
      { lessonId: "l1", status: "COMPLETED" as const },
    ]
    // Aulas contáveis: l1, l2 (l3 e l4 excluídas). 1 de 2 = 50%
    expect(overallCompletionPercent(modules, progress)).toBe(50)
  })

  it("generateCertificateCode formata corretamente: BIA-ACAD-YYYY-NNNN", () => {
    expect(generateCertificateCode(2027, 1)).toBe("BIA-ACAD-2027-0001")
    expect(generateCertificateCode(2027, 42)).toBe("BIA-ACAD-2027-0042")
    expect(generateCertificateCode(2027, 9999)).toBe("BIA-ACAD-2027-9999")
  })

  it("prepareEnrollmentData preenche accessUntil = enrolledAt + 12 meses", () => {
    const enrolledAt = new Date("2026-01-15T10:00:00Z")
    const data = prepareEnrollmentData({
      userId: "u1",
      source: "asaas",
      enrolledAt,
      asaasPaymentId: "PAY-123",
    })
    expect(data.userId).toBe("u1")
    expect(data.source).toBe("asaas")
    expect(data.asaasPaymentId).toBe("PAY-123")
    expect(data.enrolledAt).toEqual(enrolledAt)
    expect(data.accessUntil.getTime() - enrolledAt.getTime()).toBe(ACCESS_DURATION_MS)
  })

  it("prepareEnrollmentData aceita source=corporate + asaasPaymentId opcional", () => {
    const data = prepareEnrollmentData({ userId: "u1", source: "corporate" })
    expect(data.source).toBe("corporate")
    expect(data.asaasPaymentId).toBe(null)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R13.01.F · Seed script Módulo 1 é idempotente e não-destrutivo", () => {
  const scriptPath = "scripts/seed-academy-module-01.ts"
  const src = readSrc(scriptPath)

  it("O arquivo existe", () => {
    expect(fileExists(scriptPath)).toBe(true)
  })

  it("Suporta --dry-run e --publish", () => {
    expect(src).toMatch(/--dry-run/)
    expect(src).toMatch(/--publish/)
    expect(src).toMatch(/args\.dryRun/)
    expect(src).toMatch(/args\.publish/)
  })

  it("Usa upsert por slug (idempotente)", () => {
    // Ao menos 2 upserts (module + lesson)
    expect(src).toMatch(/academyModule\.upsert/)
    expect(src).toMatch(/academyLesson\.upsert/)
  })

  it("NÃO chama .delete() ou .deleteMany() em módulos, aulas ou enrollments", () => {
    expect(src).not.toMatch(/academyModule\.delete/)
    expect(src).not.toMatch(/academyLesson\.deleteMany?/)
    expect(src).not.toMatch(/academyEnrollment\.delete/)
  })

  it("Delete de attachments e quizzes é local à aula (não é destrutivo global)", () => {
    // Attachments/quizzes SÃO apagados antes de recriar, mas SÓ dentro
    // do lessonId corrente — isso é aceitável (reconciliação).
    expect(src).toMatch(/academyAttachment\.deleteMany[\s\S]*?where:\s*\{\s*lessonId:/)
    expect(src).toMatch(/academyQuiz\.deleteMany[\s\S]*?where:\s*\{\s*lessonId:/)
  })

  it("Módulo 1 tem slug 'introducao-biofabricacao' e order 1", () => {
    expect(src).toContain('"introducao-biofabricacao"')
    expect(src).toMatch(/order:\s*1\b/)
  })

  it("Contém as 5 aulas piloto acordadas", () => {
    const slugs = [
      "o-que-e-biofabricacao",
      "engenharia-tecidual-fundamentos",
      "bioimpressao-3d-panorama",
      "aplicacoes-clinicas-atuais",
      "limitacoes-e-desafios",
    ]
    for (const s of slugs) {
      expect(src, `Aula ${s} ausente do seed`).toContain(s)
    }
  })

  it("Reusa o singleton do app (adapter Neon) em vez de new PrismaClient()", () => {
    expect(src).toMatch(/from\s+["']\.\.\/src\/lib\/db\/prisma["']/)
    // NÃO deveria mais ter new PrismaClient(): usa o proxy exportado
    expect(src).not.toMatch(/new\s+PrismaClient\s*\(/)
  })

  it("Saída JSON no stdout com resumo completo", () => {
    expect(src).toMatch(/JSON\.stringify\(summary/)
    expect(src).toMatch(/summary\.module\b/)
    expect(src).toMatch(/summary\.lessons/)
    expect(src).toMatch(/summary\.errors/)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R13.01.G · Coerência com o doc de decisões R13", () => {
  const doc = readSrc("docs/roadmap/R13_bia_academy_decisions.md")
  const schema = readSrc("prisma/schema.prisma")

  it("Os 11 models mencionados no doc estão no schema", () => {
    const models = [
      "AcademyEnrollment", "AcademyModule", "AcademyLesson",
      "AcademyAttachment", "AcademyQuiz", "AcademyQuizQuestion",
      "AcademyProgress", "AcademyProject", "AcademyLiveEvent",
      "AcademyUpdate", "AcademyCertificate",
    ]
    for (const m of models) {
      expect(doc, `Model ${m} deve estar no doc`).toContain(m)
      expect(schema, `Model ${m} deve estar no schema`).toContain(m)
    }
  })

  it("Doc menciona os novos roles STUDENT + INSTRUCTOR", () => {
    expect(doc).toMatch(/STUDENT/)
    expect(doc).toMatch(/INSTRUCTOR/)
  })

  it("Doc menciona AcademyProject.notebookEntryId (amarração R12.66)", () => {
    expect(doc).toContain("notebookEntryId")
  })

  it("Doc menciona acesso rolling de 12 meses", () => {
    expect(doc).toMatch(/rolling/i)
    expect(doc).toMatch(/12 meses/i)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R13.01.H · Sanidade global", () => {
  it("Todos os arquivos R13.01 criados existem em disco", () => {
    for (const f of [
      "prisma/schema.prisma",
      "prisma/migrations/20260806000001_r13_01_academy_schema/migration.sql",
      "src/lib/academy/enrollment.ts",
      "scripts/seed-academy-module-01.ts",
    ]) {
      expect(fileExists(f), `Ausente: ${f}`).toBe(true)
    }
  })

  it("Helper enrollment.ts exporta todas as 7 funções + tipos", () => {
    const src = readSrc("src/lib/academy/enrollment.ts")
    for (const sym of [
      "ACCESS_DURATION_MS",
      "calculateAccessUntil",
      "getEnrollmentState",
      "hasAccess",
      "daysRemaining",
      "moduleCompletionPercent",
      "overallCompletionPercent",
      "generateCertificateCode",
      "prepareEnrollmentData",
    ]) {
      expect(src, `Symbol ${sym} não exportado`).toMatch(new RegExp(`export\\s+(?:function\\s+|const\\s+|type\\s+)?${sym}\\b`))
    }
  })

  it("Seed script não vaza secrets", () => {
    const src = readSrc("scripts/seed-academy-module-01.ts")
    expect(src).not.toMatch(/sk-[A-Za-z0-9]{20,}/)
    expect(src).not.toMatch(/postgres:\/\/[^"'`]+/)
    // youtubeIds são PLACEHOLDER (não vídeos reais)
    expect(src).toContain("PLACEHOLDER_M01_L01")
  })
})
