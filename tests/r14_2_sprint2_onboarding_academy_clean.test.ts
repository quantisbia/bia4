/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R14.2 — Sprint 2 "Onboarding real + Academy Clean"
 *  ─────────────────────────────────────────────────────────────────────
 *  DECISÃO (Janaina, 2026-10-19):
 *   Fechar os buracos abertos no Sprint 1:
 *    - 4 testes legados atualizados (R12.64, R13.02, R13.11.2, R13.11)
 *    - Perfis BR do G-code com bedShape="circular" (R12.64 compliance)
 *    - Migration Prisma CLINICO + LAB_PRO aplicada em Neon
 *    - Onboarding real em /dashboard/settings → PATCH /api/user/profile
 *    - Visual Clean & Clareza aplicado ao Academy (banner + sidebar em grupos)
 *
 *  ESTE ARQUIVO TRAVA:
 *   A) Migration add_clinico_labpro_plans existe e contém ALTER TYPE
 *   B) API /api/user/profile existe e exporta GET + PATCH
 *   C) ProfilePicker component existe e lista os 6 perfis
 *   D) Settings page tem nova aba "Minha Área" (specialty)
 *   E) AcademyWelcomeBanner existe e usa o mesmo padrão do ProfileWelcomeBanner
 *   F) AcademySidebar reorganizada em 3 grupos (Aprender/Praticar/Celebrar)
 *   G) Dashboard do Academy usa AcademyWelcomeBanner
 *   H) Perfis BR do G-code têm bedShape="circular" + bedDiameter_mm válido
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

import { BIOPRINTER_PROFILES } from "../src/lib/gcode/profiles/bioprinters"

const ROOT = resolve(__dirname, "..")
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8")

/* ══════════════════════════════════════════════════════════════════════
 *  A) Migration Prisma add_clinico_labpro_plans
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.2 · A) Migration Prisma CLINICO + LAB_PRO", () => {
  const migPath = "prisma/migrations/20261019000001_r14_1_add_clinico_labpro_plans/migration.sql"

  it("migration file existe no path esperado", () => {
    expect(existsSync(resolve(ROOT, migPath))).toBe(true)
  })

  it("migration adiciona CLINICO ao enum via ALTER TYPE", () => {
    const sql = read(migPath)
    expect(sql).toMatch(/ALTER TYPE\s+"SubscriptionPlan"\s+ADD VALUE\s+'CLINICO'/)
  })

  it("migration adiciona LAB_PRO ao enum via ALTER TYPE", () => {
    const sql = read(migPath)
    expect(sql).toMatch(/ALTER TYPE\s+"SubscriptionPlan"\s+ADD VALUE\s+'LAB_PRO'/)
  })

  it("migration tem cabeçalho explicativo (contexto R14.1)", () => {
    const sql = read(migPath)
    expect(sql).toMatch(/R14\.1/)
    expect(sql).toMatch(/CLINICO/)
    expect(sql).toMatch(/LAB_PRO/)
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  B) API /api/user/profile
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.2 · B) API /api/user/profile", () => {
  const apiPath = "src/app/api/user/profile/route.ts"

  it("arquivo da rota existe", () => {
    expect(existsSync(resolve(ROOT, apiPath))).toBe(true)
  })

  it("exporta função GET", () => {
    const src = read(apiPath)
    expect(src).toMatch(/export\s+async\s+function\s+GET/)
  })

  it("exporta função PATCH", () => {
    const src = read(apiPath)
    expect(src).toMatch(/export\s+async\s+function\s+PATCH/)
  })

  it("exige auth() antes de responder", () => {
    const src = read(apiPath)
    expect(src).toMatch(/await\s+auth\s*\(/)
    expect(src).toMatch(/unauthorized/)
  })

  it("valida researchArea contra getProfileById (não aceita qualquer string)", () => {
    const src = read(apiPath)
    expect(src).toContain("getProfileById")
    expect(src).toMatch(/invalid_profile/)
  })

  it("permite limpar o perfil enviando null/''", () => {
    const src = read(apiPath)
    expect(src).toMatch(/researchArea\s*=\s*null/)
  })

  it("runtime=nodejs (precisa de prisma, não vai edge)", () => {
    const src = read(apiPath)
    expect(src).toMatch(/runtime\s*=\s*["']nodejs["']/)
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  C) ProfilePicker component
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.2 · C) ProfilePicker component", () => {
  const pickerPath = "src/components/settings/ProfilePicker.tsx"

  it("arquivo existe", () => {
    expect(existsSync(resolve(ROOT, pickerPath))).toBe(true)
  })

  it("é 'use client' (precisa de estado + fetch)", () => {
    const src = read(pickerPath)
    // "use client" pode vir no topo ou logo após o header de comentário.
    expect(src.includes('"use client"') || src.includes("'use client'")).toBe(true)
  })

  it("itera sobre USER_PROFILES para renderizar os 6 cards", () => {
    const src = read(pickerPath)
    expect(src).toContain("USER_PROFILES")
    expect(src).toMatch(/USER_PROFILES\.map/)
  })

  it("faz PATCH em /api/user/profile ao salvar", () => {
    const src = read(pickerPath)
    expect(src).toContain('"/api/user/profile"')
    expect(src).toMatch(/method:\s*["']PATCH["']/)
  })

  it("expõe data-testid para cada opção + save button", () => {
    const src = read(pickerPath)
    // template literal: `profile-option-${profile.id}`
    expect(src).toMatch(/profile-option-\$\{profile\.id\}/)
    // save button (string literal estável)
    expect(src).toContain('"profile-picker-save"')
  })

  it("também atualiza o modo UI (storeMode) ao salvar", () => {
    const src = read(pickerPath)
    expect(src).toContain("storeMode")
  })

  it("router.refresh() depois de salvar (pra o server component recarregar)", () => {
    const src = read(pickerPath)
    expect(src).toMatch(/router\.refresh\s*\(\s*\)/)
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  D) Settings page com nova aba "Minha Área"
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.2 · D) Settings page com aba specialty", () => {
  const settingsPath = "src/app/dashboard/settings/page.tsx"
  const src = read(settingsPath)

  it("importa ProfilePicker", () => {
    expect(src).toContain('from "@/components/settings/ProfilePicker"')
  })

  it("array TABS inclui 'specialty' com label 'Minha Área'", () => {
    expect(src).toMatch(/key:\s*["']specialty["']/)
    expect(src).toMatch(/label:\s*["']Minha Área["']/)
  })

  it("renderiza <ProfilePicker /> quando activeTab === 'specialty'", () => {
    expect(src).toMatch(/activeTab\s*===\s*["']specialty["']/)
    expect(src).toContain("<ProfilePicker")
  })

  it("suporta ?tab=specialty via useSearchParams (deep-link do banner)", () => {
    expect(src).toContain("useSearchParams")
    expect(src).toMatch(/searchParams\?\.get\(["']tab["']\)/)
  })

  it("carrega researchArea atual via GET /api/user/profile", () => {
    expect(src).toContain('"/api/user/profile"')
    expect(src).toContain("currentResearchArea")
  })

  it("plano badge inclui CLINICO + LAB_PRO (R14.1 novos tiers)", () => {
    expect(src).toContain("CLINICO:")
    expect(src).toContain("LAB_PRO:")
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  E) ProfileWelcomeBanner → CTA de onboarding aponta pra ?tab=specialty
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.2 · E) ProfileWelcomeBanner CTA de onboarding", () => {
  const bannerPath = "src/components/dashboard/ProfileWelcomeBanner.tsx"
  const src = read(bannerPath)

  it("link de onboarding aponta pra /dashboard/settings?tab=specialty", () => {
    expect(src).toContain("/dashboard/settings?tab=specialty")
  })

  it("ainda preserva o testid profile-onboarding-cta", () => {
    expect(src).toContain('data-testid="profile-onboarding-cta"')
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  F) AcademyWelcomeBanner (visual Clean & Clareza no Academy)
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.2 · F) AcademyWelcomeBanner (equivalente Academy)", () => {
  const path = "src/components/academy/AcademyWelcomeBanner.tsx"

  it("arquivo existe", () => {
    expect(existsSync(resolve(ROOT, path))).toBe(true)
  })

  it("expõe data-testid academy-welcome-banner", () => {
    const src = read(path)
    expect(src).toContain(`data-testid="academy-welcome-banner"`)
  })

  it("renderiza CTA primária com testid academy-welcome-primary-cta", () => {
    const src = read(path)
    expect(src).toContain(`data-testid="academy-welcome-primary-cta"`)
  })

  it("inclui barra de progresso com %", () => {
    const src = read(path)
    expect(src).toMatch(/progressPct/)
    expect(src).toMatch(/style=\{\s*\{\s*width:\s*`\$\{progressPct\}%`/)
  })

  it("mostra dias restantes quando daysLeft > 0", () => {
    const src = read(path)
    expect(src).toMatch(/daysLeft/)
    expect(src).toMatch(/dias?\s+restante/i)
  })

  it("dashboard do Academy importa e usa o banner", () => {
    const dash = read("src/app/academy/(app)/dashboard/page.tsx")
    expect(dash).toContain("AcademyWelcomeBanner")
    expect(dash).toContain("<AcademyWelcomeBanner")
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  G) AcademySidebar reorganizada em 3 grupos lógicos (análise estática)
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.2 · G) AcademySidebar em 3 grupos lógicos", () => {
  const sidebarSrc = read("src/components/academy/AcademySidebar.tsx")

  it("exporta ACADEMY_NAV_GROUPS", () => {
    expect(sidebarSrc).toMatch(/export\s+const\s+ACADEMY_NAV_GROUPS/)
  })

  it("define os 3 grupos esperados (learn/practice/celebrate)", () => {
    expect(sidebarSrc).toMatch(/id:\s*["']learn["']/)
    expect(sidebarSrc).toMatch(/id:\s*["']practice["']/)
    expect(sidebarSrc).toMatch(/id:\s*["']celebrate["']/)
  })

  it("rótulos pt-BR dos grupos (Aprender/Praticar/Celebrar)", () => {
    expect(sidebarSrc).toMatch(/label:\s*["']Aprender["']/)
    expect(sidebarSrc).toMatch(/label:\s*["']Praticar["']/)
    expect(sidebarSrc).toMatch(/label:\s*["']Celebrar["']/)
  })

  it("grupo 'learn' contém dashboard + journey + modules", () => {
    // procurar o bloco do grupo learn
    const learnMatch = sidebarSrc.match(/id:\s*["']learn["'][\s\S]{0,400}?itemHrefs:\s*\[([\s\S]{0,300}?)\]/m)
    expect(learnMatch, "bloco learn deve existir").toBeTruthy()
    const body = learnMatch![1]
    expect(body).toContain("/academy/dashboard")
    expect(body).toContain("/academy/journey")
    expect(body).toContain("/academy/modules")
  })

  it("grupo 'celebrate' contém certificate", () => {
    const celebrateMatch = sidebarSrc.match(/id:\s*["']celebrate["'][\s\S]{0,400}?itemHrefs:\s*\[([\s\S]{0,200}?)\]/m)
    expect(celebrateMatch, "bloco celebrate deve existir").toBeTruthy()
    expect(celebrateMatch![1]).toContain("/academy/certificate")
  })

  it("sidebar renderiza grupos no JSX (data-testids)", () => {
    expect(sidebarSrc).toContain("academy-sidebar-grouped-nav")
    expect(sidebarSrc).toMatch(/academy-sidebar-group-\$\{group\.id\}/)
  })

  it("ACADEMY_NAV_ITEMS legado preservado (backward compat)", () => {
    expect(sidebarSrc).toMatch(/export\s+const\s+ACADEMY_NAV_ITEMS/)
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  H) Perfis BR do G-code → bedShape circular (R12.64 compliance)
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.2 · H) Perfis BR gcode com bedShape circular", () => {

  it("BioEnder (BIOEDTECH) tem bedShape=circular + bedDiameter_mm válido", () => {
    const p = BIOPRINTER_PROFILES.bioender_bioedtech
    expect(p).toBeDefined()
    expect(p.bedShape).toBe("circular")
    expect(p.bedDiameter_mm).toBeDefined()
    expect(p.bedDiameter_mm!).toBeGreaterThan(0)
    // 180 mm cabendo nos 200×200 do buildVolume
    const minXY = Math.min(p.buildVolume.max.x, p.buildVolume.max.y)
    expect(p.bedDiameter_mm!).toBeLessThanOrEqual(minXY)
  })

  it("Octopus (3DBS) tem bedShape=circular + bedDiameter_mm válido", () => {
    const p = BIOPRINTER_PROFILES.octopus_3dbs
    expect(p).toBeDefined()
    expect(p.bedShape).toBe("circular")
    expect(p.bedDiameter_mm).toBeDefined()
    expect(p.bedDiameter_mm!).toBeGreaterThan(0)
    const minXY = Math.min(p.buildVolume.max.x, p.buildVolume.max.y)
    expect(p.bedDiameter_mm!).toBeLessThanOrEqual(minXY)
  })
})
