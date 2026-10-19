/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R14.1 — Opção A "Clean & Clareza" (Sprint 1)
 *  ─────────────────────────────────────────────────────────────────────
 *  DECISÃO (Janaina, 2026-10-19):
 *   Reorganizar a plataforma BIA (não a Academy) para 6 perfis de usuário:
 *   ortopedistas, dermatologistas, dentistas, pós-grad, graduação, pesquisadores.
 *
 *  REGRAS DE NEGÓCIO QUE ESTE ARQUIVO TRAVA:
 *   A) Catálogo de 6 UserProfiles existe (profile.ts)
 *   B) Dicionário UI (clinical ↔ researcher) tem pelo menos 20 pares de termos
 *   C) UIModeToggle component existe + hook useUIMode exposto
 *   D) Sidebar reorganizada em NAV_GROUPS (5 grupos funcionais)
 *   E) Catálogo de bioprinters agrupado com Brasil em DESTAQUE
 *   F) Plano CLINICO existe no Prisma + maps PLAN_COLORS/PLAN_LABEL
 *   G) Plano FREE tem quota 1 STL + 1 G-code
 *   H) Dashboard home carrega ProfileWelcomeBanner + PersonalizedQuickActions
 *   I) QuickActions por perfil estão corretamente destacadas
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

import {
  USER_PROFILES,
  DEFAULT_PROFILE_ID,
  getProfileById,
  resolveUserProfile,
  type UserProfileId,
} from "../src/lib/user/profile"
import {
  UI_TERMS,
  t as translate,
  UI_MODE_STORAGE_KEY,
} from "../src/lib/user/ui-mode"
import {
  BIOPRINTERS,
  getGroupedBioprinters,
  getBioprinterCountry,
  isNationalBioprinter,
  BIOPRINTER_COUNTRIES,
} from "../src/lib/bioprinting/bioprinters"
import {
  PLAN_QUOTAS,
  getQuotaLimit,
  canUseFeature,
  isUnlimited,
  remainingQuota,
  describePlanQuotas,
} from "../src/lib/plan/quotas"
import {
  ALL_QUICK_ACTIONS,
  resolveQuickActionsForUser,
} from "../src/lib/user/quick-actions"

const ROOT = resolve(__dirname, "..")

/* ══════════════════════════════════════════════════════════════════════
 *  A) UserProfiles
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.1 · A) Catálogo de 6 UserProfiles", () => {
  it("exporta exatamente 6 perfis", () => {
    expect(USER_PROFILES).toHaveLength(6)
  })

  it("todos os IDs esperados estão presentes", () => {
    const ids = USER_PROFILES.map(p => p.id).sort()
    expect(ids).toEqual([
      "dentist", "dermatologist", "orthopedist",
      "postgrad", "researcher", "undergrad",
    ])
  })

  it("cada perfil tem label, emoji, descrição, defaultMode e cor", () => {
    for (const p of USER_PROFILES) {
      expect(p.label.length).toBeGreaterThan(0)
      expect(p.shortLabel.length).toBeGreaterThan(0)
      expect(p.emoji.length).toBeGreaterThan(0)
      expect(p.description.length).toBeGreaterThan(10)
      expect(["clinical", "researcher"]).toContain(p.defaultMode)
      expect(["rose", "amber", "sky", "violet", "emerald", "fuchsia"]).toContain(p.accentColor)
    }
  })

  it("cada perfil tem pelo menos 3 highlightedActions", () => {
    for (const p of USER_PROFILES) {
      expect(p.highlightedActions.length).toBeGreaterThanOrEqual(3)
    }
  })

  it("DEFAULT_PROFILE_ID é 'postgrad'", () => {
    expect(DEFAULT_PROFILE_ID).toBe("postgrad")
  })

  it("getProfileById retorna o perfil correto", () => {
    const ortho = getProfileById("orthopedist")
    expect(ortho?.id).toBe("orthopedist")
    expect(getProfileById("inexistente")).toBeUndefined()
  })

  it("resolveUserProfile sempre retorna um perfil (fallback = postgrad)", () => {
    expect(resolveUserProfile(null).id).toBe("postgrad")
    expect(resolveUserProfile(undefined).id).toBe("postgrad")
    expect(resolveUserProfile("inexistente").id).toBe("postgrad")
    expect(resolveUserProfile("dermatologist").id).toBe("dermatologist")
  })

  it("perfis clínicos defaultam para modo 'clinical'", () => {
    const clin: UserProfileId[] = ["orthopedist", "dermatologist", "dentist", "undergrad"]
    for (const id of clin) {
      const p = getProfileById(id)!
      expect(p.defaultMode).toBe("clinical")
    }
  })

  it("perfis de pesquisa defaultam para modo 'researcher'", () => {
    const res: UserProfileId[] = ["postgrad", "researcher"]
    for (const id of res) {
      const p = getProfileById(id)!
      expect(p.defaultMode).toBe("researcher")
    }
  })

  it("ortopedista tem e-book recomendado = Biofabricação em Ortopedia", () => {
    const ortho = getProfileById("orthopedist")!
    expect(ortho.recommendedEbookId).toBe("ebook-biofabricacao-ortopedia-2026")
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  B) UI Mode (Clinical ↔ Researcher)
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.1 · B) Dicionário Clínico ↔ Pesquisador", () => {
  it("tem pelo menos 20 pares de termos", () => {
    const count = Object.keys(UI_TERMS).length
    expect(count).toBeGreaterThanOrEqual(20)
  })

  it("cada par tem variante 'researcher' e 'clinical' não vazias", () => {
    for (const [key, pair] of Object.entries(UI_TERMS)) {
      expect(pair.researcher.length, `${key}.researcher`).toBeGreaterThan(0)
      expect(pair.clinical.length, `${key}.clinical`).toBeGreaterThan(0)
    }
  })

  it("t() retorna o rótulo pesquisador por padrão", () => {
    expect(translate("nav_pipeline")).toBe("Pipeline")
    expect(translate("nav_formulator")).toBe("Formulador Pro")
    expect(translate("term_gcode")).toBe("G-code")
  })

  it("t() retorna rótulo clínico quando mode='clinical'", () => {
    expect(translate("nav_pipeline", "clinical")).toBe("Projeto de Tecido")
    expect(translate("nav_formulator", "clinical")).toBe("Laboratório de Biotintas")
    expect(translate("term_gcode", "clinical")).toBe("Instruções da Impressora")
  })

  it("t() cai pro próprio key quando a chave é inválida (sem crash)", () => {
    expect(translate("chave_inexistente")).toBe("chave_inexistente")
  })

  it("UI_MODE_STORAGE_KEY tem o namespace certo", () => {
    expect(UI_MODE_STORAGE_KEY).toBe("bia:ui-mode")
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  C) UIModeToggle component + useUIMode hook
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.1 · C) UIModeToggle + useUIMode", () => {
  it("UIModeToggle.tsx existe e tem data-testid", () => {
    const path = resolve(ROOT, "src/components/layout/UIModeToggle.tsx")
    expect(existsSync(path)).toBe(true)
    const src = readFileSync(path, "utf-8")
    expect(src).toContain('data-testid="ui-mode-toggle"')
    expect(src).toContain('Stethoscope')
    expect(src).toContain('Microscope')
  })

  it("useUIMode hook existe e exporta API esperada", () => {
    const path = resolve(ROOT, "src/lib/user/use-ui-mode.ts")
    expect(existsSync(path)).toBe(true)
    const src = readFileSync(path, "utf-8")
    expect(src).toMatch(/export\s+function\s+useUIMode/)
    // deve expor pelo menos mode, setMode, toggle, t, hydrated
    expect(src).toContain("mode")
    expect(src).toContain("toggle")
    expect(src).toContain("hydrated")
  })

  it("DashboardSidebar importa + renderiza UIModeToggle", () => {
    const src = readFileSync(resolve(ROOT, "src/components/layout/DashboardSidebar.tsx"), "utf-8")
    expect(src).toContain('import { UIModeToggle }')
    expect(src).toContain('<UIModeToggle')
  })

  it("MobileBottomNav importa + renderiza UIModeToggle", () => {
    const src = readFileSync(resolve(ROOT, "src/components/layout/MobileBottomNav.tsx"), "utf-8")
    expect(src).toContain('import { UIModeToggle }')
    expect(src).toContain('<UIModeToggle')
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  D) Sidebar NAV_GROUPS (5 grupos funcionais)
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.1 · D) Sidebar reorganizada em NAV_GROUPS", () => {
  const src = readFileSync(resolve(ROOT, "src/components/layout/DashboardSidebar.tsx"), "utf-8")

  it("exporta NAV_GROUPS", () => {
    expect(src).toMatch(/export\s+const\s+NAV_GROUPS/)
  })

  it("os 5 grupos esperados existem (project/bioprint/validate/learn/account)", () => {
    expect(src).toMatch(/id:\s*"project"/)
    expect(src).toMatch(/id:\s*"bioprint"/)
    expect(src).toMatch(/id:\s*"validate"/)
    expect(src).toMatch(/id:\s*"learn"/)
    expect(src).toMatch(/id:\s*"account"/)
  })

  it("mantém NAV_ITEMS legado (backward compat)", () => {
    expect(src).toMatch(/export\s+const\s+NAV_ITEMS/)
  })

  it("SidebarGroupedNav component existe", () => {
    expect(src).toContain("SidebarGroupedNav")
  })

  it("usa chave de localStorage versionada (bia:sidebar-groups-v14)", () => {
    expect(src).toContain("bia:sidebar-groups-v14")
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  E) Bioprinters com Brasil em destaque
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.1 · E) Catálogo de bioprinters com Brasil em DESTAQUE", () => {
  it("getGroupedBioprinters retorna 3 grupos (national/international/generic)", () => {
    const groups = getGroupedBioprinters()
    expect(groups).toHaveLength(3)
    expect(groups.map(g => g.key)).toEqual(["national", "international", "generic"])
  })

  it("grupo nacional tem pelo menos 2 impressoras (BioEnder + Octopus)", () => {
    const [national] = getGroupedBioprinters()
    expect(national.printers.length).toBeGreaterThanOrEqual(2)
    const ids = national.printers.map(p => p.id)
    expect(ids).toContain("bioender_bioedtech")
    expect(ids).toContain("octopus_3dbs")
  })

  it("as duas BR aparecem ANTES de qualquer internacional no array global", () => {
    const idxBioEnder = BIOPRINTERS.findIndex(p => p.id === "bioender_bioedtech")
    const idxOctopus  = BIOPRINTERS.findIndex(p => p.id === "octopus_3dbs")
    const idxFirstIntl = BIOPRINTERS.findIndex(p => !isNationalBioprinter(p) && getBioprinterCountry(p).code !== "GENERIC")
    expect(idxBioEnder).toBeGreaterThanOrEqual(0)
    expect(idxOctopus).toBeGreaterThanOrEqual(0)
    expect(idxFirstIntl).toBeGreaterThan(idxBioEnder)
    expect(idxFirstIntl).toBeGreaterThan(idxOctopus)
  })

  it("getBioprinterCountry identifica Brasil para BIOEDTECH e 3DBS", () => {
    const bioender = BIOPRINTERS.find(p => p.id === "bioender_bioedtech")!
    const octopus  = BIOPRINTERS.find(p => p.id === "octopus_3dbs")!
    expect(getBioprinterCountry(bioender).code).toBe("BR")
    expect(getBioprinterCountry(octopus).code).toBe("BR")
    expect(isNationalBioprinter(bioender)).toBe(true)
    expect(isNationalBioprinter(octopus)).toBe(true)
  })

  it("Brasil tem flag 🇧🇷 e isNational=true", () => {
    expect(BIOPRINTER_COUNTRIES.BR.flag).toBe("🇧🇷")
    expect(BIOPRINTER_COUNTRIES.BR.isNational).toBe(true)
    expect(BIOPRINTER_COUNTRIES.BR.name).toBe("Brasil")
  })

  it("perfis de G-code (bioprinters.ts) tem os BR adicionados", () => {
    const src = readFileSync(resolve(ROOT, "src/lib/gcode/profiles/bioprinters.ts"), "utf-8")
    expect(src).toContain("bioender_bioedtech")
    expect(src).toContain("octopus_3dbs")
    expect(src).toContain("🇧🇷") // flag presente em algum manufacturer
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  F) Plano CLINICO (R$ 507/mês) + LAB_PRO + maps atualizados
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.1 · F) Plano CLINICO + LAB_PRO adicionados", () => {
  it("Prisma schema contém CLINICO e LAB_PRO no enum SubscriptionPlan", () => {
    const src = readFileSync(resolve(ROOT, "prisma/schema.prisma"), "utf-8")
    expect(src).toMatch(/enum\s+SubscriptionPlan\s*\{[\s\S]*CLINICO[\s\S]*\}/)
    expect(src).toMatch(/enum\s+SubscriptionPlan\s*\{[\s\S]*LAB_PRO[\s\S]*\}/)
  })

  it("DashboardSidebar.PLAN_COLORS tem CLINICO e LAB_PRO", () => {
    const src = readFileSync(resolve(ROOT, "src/components/layout/DashboardSidebar.tsx"), "utf-8")
    expect(src).toContain("CLINICO:")
    expect(src).toContain("LAB_PRO:")
  })

  it("DashboardSidebar.PLAN_LABEL tem CLINICO=\"Clínico\" e LAB_PRO=\"Lab Pro\"", () => {
    const src = readFileSync(resolve(ROOT, "src/components/layout/DashboardSidebar.tsx"), "utf-8")
    expect(src).toMatch(/CLINICO:\s*"Clínico"/)
    expect(src).toMatch(/LAB_PRO:\s*"Lab Pro"/)
  })

  it("BillingClient tem plano CLINICO a R$ 507/mês", () => {
    const src = readFileSync(resolve(ROOT, "src/app/dashboard/billing/BillingClient.tsx"), "utf-8")
    expect(src).toMatch(/id:\s*"CLINICO"/)
    // preço 507 na mesma declaração do plano
    const clinicoBlock = src.match(/id:\s*"CLINICO"[\s\S]*?^\s*\}/m)
    expect(clinicoBlock).not.toBeNull()
    expect(clinicoBlock![0]).toMatch(/price:\s*507/)
    expect(clinicoBlock![0]).toMatch(/period:\s*"mês"/)
  })

  it("BillingClient tem plano LAB_PRO a R$ 2.375/ano", () => {
    const src = readFileSync(resolve(ROOT, "src/app/dashboard/billing/BillingClient.tsx"), "utf-8")
    expect(src).toMatch(/id:\s*"LAB_PRO"/)
    const labBlock = src.match(/id:\s*"LAB_PRO"[\s\S]*?^\s*\}/m)
    expect(labBlock).not.toBeNull()
    expect(labBlock![0]).toMatch(/price:\s*2375/)
    expect(labBlock![0]).toMatch(/period:\s*"ano"/)
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  G) Plano FREE com quota 1 STL + 1 G-code
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.1 · G) Plano FREE: quota 1 STL + 1 G-code", () => {
  it("PLAN_QUOTAS.FREE tem exatamente 1 STL + 1 G-code", () => {
    expect(PLAN_QUOTAS.FREE.stl_upload).toBe(1)
    expect(PLAN_QUOTAS.FREE.gcode_generation).toBe(1)
  })

  it("CLINICO + LAB_PRO têm quota Infinity (ilimitado)", () => {
    expect(PLAN_QUOTAS.CLINICO.stl_upload).toBe(Infinity)
    expect(PLAN_QUOTAS.CLINICO.gcode_generation).toBe(Infinity)
    expect(PLAN_QUOTAS.LAB_PRO.stl_upload).toBe(Infinity)
    expect(PLAN_QUOTAS.LAB_PRO.gcode_generation).toBe(Infinity)
  })

  it("planos legados (GUIDE/ADVANCED/ENTERPRISE/etc.) seguem ilimitados", () => {
    for (const p of ["GUIDE", "ADVANCED", "ENTERPRISE", "DISCOVERY", "ORGANOID_LAB", "ACADEMY"] as const) {
      expect(PLAN_QUOTAS[p].stl_upload, `${p} stl`).toBe(Infinity)
      expect(PLAN_QUOTAS[p].gcode_generation, `${p} gcode`).toBe(Infinity)
    }
  })

  it("getQuotaLimit retorna o número certo", () => {
    expect(getQuotaLimit("FREE", "stl_upload")).toBe(1)
    expect(getQuotaLimit("FREE", "gcode_generation")).toBe(1)
    expect(getQuotaLimit("CLINICO", "stl_upload")).toBe(Infinity)
  })

  it("isUnlimited distingue FREE de pagos", () => {
    expect(isUnlimited("FREE", "stl_upload")).toBe(false)
    expect(isUnlimited("CLINICO", "stl_upload")).toBe(true)
    expect(isUnlimited("LAB_PRO", "stl_upload")).toBe(true)
  })

  it("canUseFeature trava o segundo STL no FREE", () => {
    expect(canUseFeature("FREE", "stl_upload", 0)).toBe(true)   // 0 usados → pode
    expect(canUseFeature("FREE", "stl_upload", 1)).toBe(false)  // 1 usado → NÃO pode
    expect(canUseFeature("CLINICO", "stl_upload", 999)).toBe(true) // ilimitado
  })

  it("remainingQuota é correto", () => {
    expect(remainingQuota("FREE", "stl_upload", 0)).toBe(1)
    expect(remainingQuota("FREE", "stl_upload", 1)).toBe(0)
    expect(remainingQuota("FREE", "stl_upload", 10)).toBe(0) // não vai negativo
    expect(remainingQuota("CLINICO", "stl_upload", 500)).toBe(Infinity)
  })

  it("describePlanQuotas rotula FREE como '1 STL + 1 G-code'", () => {
    expect(describePlanQuotas("FREE")).toBe("1 STL + 1 G-code")
    expect(describePlanQuotas("CLINICO")).toBe("Uso ilimitado")
    expect(describePlanQuotas("LAB_PRO")).toBe("Uso ilimitado")
  })

  it("fallback de plano desconhecido vai pro FREE (safe)", () => {
    expect(getQuotaLimit("PLANO_INEXISTENTE", "stl_upload")).toBe(1)
    expect(getQuotaLimit(null, "stl_upload")).toBe(1)
    expect(getQuotaLimit(undefined, "stl_upload")).toBe(1)
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  H) Dashboard home — ProfileWelcomeBanner + PersonalizedQuickActions
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.1 · H) Dashboard home personalizado", () => {
  it("ProfileWelcomeBanner.tsx existe", () => {
    const path = resolve(ROOT, "src/components/dashboard/ProfileWelcomeBanner.tsx")
    expect(existsSync(path)).toBe(true)
    const src = readFileSync(path, "utf-8")
    expect(src).toContain("profile-welcome-")
    expect(src).toContain("profile-cta-primary-")
  })

  it("PersonalizedQuickActions.tsx existe e usa useUIMode", () => {
    const path = resolve(ROOT, "src/components/dashboard/PersonalizedQuickActions.tsx")
    expect(existsSync(path)).toBe(true)
    const src = readFileSync(path, "utf-8")
    expect(src).toContain("useUIMode")
    expect(src).toContain('data-testid="personalized-quick-actions"')
    expect(src).toContain("quick-action-")
  })

  it("Dashboard page.tsx carrega os 2 componentes novos", () => {
    const src = readFileSync(resolve(ROOT, "src/app/dashboard/page.tsx"), "utf-8")
    expect(src).toContain("ProfileWelcomeBanner")
    expect(src).toContain("PersonalizedQuickActions")
    expect(src).toContain("researchArea")
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  I) QuickActions reordenam por perfil + modo UI
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.1 · I) QuickActions personalizadas por perfil", () => {
  it("ALL_QUICK_ACTIONS tem pelo menos 10 ações", () => {
    expect(ALL_QUICK_ACTIONS.length).toBeGreaterThanOrEqual(10)
  })

  it("todos os IDs são únicos", () => {
    const ids = ALL_QUICK_ACTIONS.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("todas as highlightedActions dos perfis existem em ALL_QUICK_ACTIONS", () => {
    const allIds = new Set(ALL_QUICK_ACTIONS.map(a => a.id))
    for (const profile of USER_PROFILES) {
      for (const actionId of profile.highlightedActions) {
        expect(allIds.has(actionId), `${profile.id}.${actionId}`).toBe(true)
      }
    }
  })

  it("ortopedista vê bioprint-model + pipeline destacadas (em primeiro)", () => {
    const actions = resolveQuickActionsForUser("orthopedist", "clinical")
    const firstTwoIds = actions.slice(0, 2).map(a => a.id)
    // bioprint-model vem antes de pipeline conforme ordem do highlightedActions
    expect(firstTwoIds).toEqual(["bioprint-model", "pipeline"])
    expect(actions[0].isHighlighted).toBe(true)
    expect(actions[1].isHighlighted).toBe(true)
  })

  it("pesquisador vê formulator-pro destacado em primeiro", () => {
    const actions = resolveQuickActionsForUser("researcher", "researcher")
    expect(actions[0].id).toBe("formulator-pro")
    expect(actions[0].isHighlighted).toBe(true)
  })

  it("undergrad vê roadmap destacado em primeiro", () => {
    const actions = resolveQuickActionsForUser("undergrad", "clinical")
    expect(actions[0].id).toBe("roadmap")
  })

  it("modo clinical usa titleClinical quando existe", () => {
    const actions = resolveQuickActionsForUser(null, "clinical")
    const pipeline = actions.find(a => a.id === "pipeline")!
    expect(pipeline.title).toBe("Novo Projeto de Tecido")
    const bioprint = actions.find(a => a.id === "bioprint-model")!
    expect(bioprint.title).toBe("Imprimir Tecido 3D")
  })

  it("modo researcher usa title técnico", () => {
    const actions = resolveQuickActionsForUser(null, "researcher")
    const pipeline = actions.find(a => a.id === "pipeline")!
    expect(pipeline.title).toBe("Novo Pipeline")
    const formulator = actions.find(a => a.id === "formulator-pro")!
    expect(formulator.title).toBe("Formulador Pro")
  })

  it("perfil não cadastrado cai no DEFAULT (postgrad)", () => {
    const actions = resolveQuickActionsForUser("perfil_inexistente", "researcher")
    // postgrad destaca: pipeline, formulator-pro, notebook, knowledge
    expect(actions[0].isHighlighted).toBe(true)
    expect(actions[0].id).toBe("pipeline") // ordem do highlightedActions do postgrad
  })

  it("total de ações preservado após reordenação", () => {
    for (const profile of USER_PROFILES) {
      const actions = resolveQuickActionsForUser(profile.id, "researcher")
      expect(actions.length).toBe(ALL_QUICK_ACTIONS.length)
    }
  })
})
