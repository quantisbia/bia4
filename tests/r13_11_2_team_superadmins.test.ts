/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R13.11.2 — Time interno Quantis como superadmins
 *  ─────────────────────────────────────────────────────────────────────
 *  DECISÃO (Janaina, 2026-09-16):
 *   Dar acesso admin + Academy (sem pagar) para 4 pessoas do time interno.
 *   Cada um recebeu:
 *     1. Entrada em SUPERADMIN_EMAILS (bypass hardcoded no código)
 *     2. role=ADMIN no banco (via scripts/promote-team-admins.ts)
 *     3. Subscription.plan=ACADEMY, status=ACTIVE (créditos altos)
 *     4. AcademyEnrollment manual até 2027-09-16
 *
 *  ESTE ARQUIVO TRAVA:
 *   A) SUPERADMIN_EMAILS contém Janaina + os 4 novos emails
 *   B) isSuperAdmin() reconhece todos eles (case-insensitive)
 *   C) isSuperAdmin() ainda rejeita emails aleatórios
 *   D) Script promote-team-admins.ts existe e é idempotente
 *   E) Script promote-team-admins.ts filtra pelos 4 emails corretos
 *   F) Regressão: Janaina não pode ser removida da lista
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { SUPERADMIN_EMAILS, isSuperAdmin } from "../src/lib/auth/admin-shared"

const ROOT = resolve(__dirname, "..")
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8")

const TEAM_EMAILS = [
  "vitor.mattos@quantis.bio",
  "lucas.guarnier@quantis.bio",
  "kamila.leichtweis@quantis.bio",
  "thais.amaral@quantis.bio",
]

describe("R13.11.2 · SUPERADMIN_EMAILS contém time interno Quantis", () => {

  it("A) Janaina (2 grafias) preservada", () => {
    expect(SUPERADMIN_EMAILS).toContain("janaina.dernowsek@quantis.bio")
    expect(SUPERADMIN_EMAILS).toContain("janaina@quantis.bio")
  })

  it("A.2) Os 4 emails do time interno estão em SUPERADMIN_EMAILS", () => {
    for (const email of TEAM_EMAILS) {
      expect(SUPERADMIN_EMAILS).toContain(email)
    }
  })

  it("A.3) Vitor está com grafia 'mattos' (2 t's, confirmada pela Janaina)", () => {
    expect(SUPERADMIN_EMAILS).toContain("vitor.mattos@quantis.bio")
    expect(SUPERADMIN_EMAILS).not.toContain("vitor.matos@quantis.bio")
  })

  it("A.4) Total: 6 superadmins (2 Janaina + 4 time)", () => {
    expect(SUPERADMIN_EMAILS.length).toBe(6)
  })
})

describe("R13.11.2 · isSuperAdmin() reconhece corretamente", () => {

  it("B) reconhece todos os 4 emails do time", () => {
    for (const email of TEAM_EMAILS) {
      expect(isSuperAdmin(email)).toBe(true)
    }
  })

  it("B.2) case-insensitive (uppercase e mixed case)", () => {
    expect(isSuperAdmin("VITOR.MATTOS@QUANTIS.BIO")).toBe(true)
    expect(isSuperAdmin("Lucas.Guarnier@Quantis.BIO")).toBe(true)
    expect(isSuperAdmin("KAMILA.LEICHTWEIS@quantis.bio")).toBe(true)
    expect(isSuperAdmin("Thais.Amaral@quantis.bio")).toBe(true)
  })

  it("B.3) tolera whitespace nas bordas", () => {
    expect(isSuperAdmin("  vitor.mattos@quantis.bio  ")).toBe(true)
    expect(isSuperAdmin("\tlucas.guarnier@quantis.bio\n")).toBe(true)
  })

  it("C) rejeita emails aleatórios (não é permissivo demais)", () => {
    expect(isSuperAdmin("cliente@example.com")).toBe(false)
    expect(isSuperAdmin("aluno.teste@quantis.bio")).toBe(false)
    // Grafia errada NÃO deve dar bypass
    expect(isSuperAdmin("vitor.matos@quantis.bio")).toBe(false)
  })

  it("C.2) rejeita null e undefined", () => {
    expect(isSuperAdmin(null)).toBe(false)
    expect(isSuperAdmin(undefined)).toBe(false)
    expect(isSuperAdmin("")).toBe(false)
  })
})

describe("R13.11.2 · Script promote-team-admins.ts", () => {

  it("D) script existe e tem os 4 emails no array TEAM_EMAILS", () => {
    const src = read("scripts/promote-team-admins.ts")
    for (const email of TEAM_EMAILS) {
      expect(src).toContain(`"${email}"`)
    }
  })

  it("D.2) script é idempotente (usa 'já é' / 'já existe' em vez de sobrescrever)", () => {
    const src = read("scripts/promote-team-admins.ts")
    expect(src).toMatch(/já é ADMIN/)
    expect(src).toMatch(/já é ACADEMY\/ACTIVE/)
    expect(src).toMatch(/já existe/)
  })

  it("D.3) script promove role para ADMIN e mantém Subscription ACADEMY/ACTIVE", () => {
    const src = read("scripts/promote-team-admins.ts")
    expect(src).toMatch(/data:\s*\{\s*role:\s*"ADMIN"\s*\}/)
    expect(src).toMatch(/plan:\s*"ACADEMY"/)
    expect(src).toMatch(/status:\s*"ACTIVE"/)
  })

  it("D.4) script cria AcademyEnrollment com source='manual'", () => {
    const src = read("scripts/promote-team-admins.ts")
    expect(src).toMatch(/source:\s*"manual"/)
    expect(src).toMatch(/calculateAccessUntil/)
  })

  it("D.5) script suporta --dry-run", () => {
    const src = read("scripts/promote-team-admins.ts")
    expect(src).toContain("--dry-run")
    expect(src).toMatch(/DRY_RUN/)
  })
})

describe("R13.11.2 · Regressão — proteções contra desconfiguração", () => {

  it("F) Nunca remover Janaina da lista de superadmins", () => {
    const src = read("src/lib/auth/admin-shared.ts")
    expect(src).toContain("janaina.dernowsek@quantis.bio")
  })

  it("F.2) Comentário R13.11.2 documenta a mudança", () => {
    const src = read("src/lib/auth/admin-shared.ts")
    expect(src).toMatch(/R13\.11\.2/)
    expect(src).toMatch(/Time interno Quantis/i)
  })

  it("F.3) SUPERADMIN_EMAILS não contém emails duplicados", () => {
    const set = new Set(SUPERADMIN_EMAILS)
    expect(set.size).toBe(SUPERADMIN_EMAILS.length)
  })

  it("F.4) Todos os emails são lowercase (evita bugs case-sensitive)", () => {
    for (const email of SUPERADMIN_EMAILS) {
      expect(email).toBe(email.toLowerCase())
    }
  })
})
