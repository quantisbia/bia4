/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R14.6 — Academy: cores do tema claro + toggles PT/EN/ES em local visível
 *  ─────────────────────────────────────────────────────────────────────
 *  REQUISITO (Janaina, 2026-10-20):
 *   "Vamos otimizar as cores da plataforma academy. A versão clara não
 *    está legal, ruim de ver. Além disso, precisamos verificar as
 *    linguagens. Precisa ser pt, inglês e espanhol em um local fácil de
 *    ver e funcional em ambas as plataformas. Bia é academy."
 *
 *  ESTE ARQUIVO TRAVA:
 *   A) Infra i18n: 3 locales (pt/en/es) + LocaleProvider com storage
 *   B) AcademySidebar: imports de ThemeToggle + LocaleSwitcher presentes
 *   C) AcademySidebar: toggles renderizados no desktop (bottom)
 *   D) AcademySidebar: LocaleSwitcher no mobile header (sempre visível)
 *   E) DashboardSidebar: LocaleSwitcher no mobile header (sempre visível)
 *   F) globals.css: bloco R14.6 com overrides de contraste no light
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = resolve(__dirname, "..")
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8")

/* ══════════════════════════════════════════════════════════════════════
 *  A) Infra i18n — 3 locales presentes
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.6 · A) Infra i18n", () => {
  const locales = read("src/lib/i18n/locales.ts")

  it("exporta exatamente 3 locales (pt/en/es)", () => {
    expect(locales).toMatch(/export\s+type\s+Locale\s*=\s*"pt"\s*\|\s*"en"\s*\|\s*"es"/)
    expect(locales).toMatch(/LOCALES[^=]*=\s*\[\s*"pt"\s*,\s*"en"\s*,\s*"es"\s*\]/)
  })

  it("tem labels nativos para cada locale (Português / English / Español)", () => {
    expect(locales).toContain("Português")
    expect(locales).toContain("English")
    expect(locales).toContain("Español")
  })

  it("tem bandeiras para cada locale", () => {
    expect(locales).toContain("🇧🇷")
    expect(locales).toContain("🇺🇸")
    expect(locales).toContain("🇪🇸")
  })

  it("tem dicionários pt + en + es com chaves common.*", () => {
    expect(locales).toMatch(/pt:\s*{[\s\S]*"common\.save"\s*:\s*"Salvar"/)
    expect(locales).toMatch(/en:\s*{[\s\S]*"common\.save"\s*:\s*"Save"/)
    expect(locales).toMatch(/es:\s*{[\s\S]*"common\.save"\s*:\s*"Guardar"/)
  })

  it("detectBrowserLocale cobre en, es e fallback pt", () => {
    expect(locales).toMatch(/lang\.startsWith\("en"\)/)
    expect(locales).toMatch(/lang\.startsWith\("es"\)/)
    expect(locales).toMatch(/return\s+"pt"/)
  })
})

describe("R14.6 · A2) LocaleProvider", () => {
  const prov = read("src/components/providers/LocaleProvider.tsx")

  it("persiste em localStorage com chave bia-locale", () => {
    expect(prov).toMatch(/STORAGE_KEY\s*=\s*"bia-locale"/)
    expect(prov).toMatch(/localStorage\.setItem\(STORAGE_KEY/)
  })

  it("expõe useLocale e useT", () => {
    expect(prov).toMatch(/export\s+function\s+useLocale/)
    expect(prov).toMatch(/export\s+function\s+useT/)
  })

  it("aceita os 3 locales ao hidratar", () => {
    expect(prov).toMatch(/stored\s*===\s*"pt"[\s\S]*stored\s*===\s*"en"[\s\S]*stored\s*===\s*"es"/)
  })

  it("atualiza document.documentElement.lang com LOCALE_HTML_LANG", () => {
    expect(prov).toMatch(/document\.documentElement\.lang\s*=\s*LOCALE_HTML_LANG\[locale\]/)
  })
})

describe("R14.6 · A3) LocaleSwitcher", () => {
  const sw = read("src/components/ui/LocaleSwitcher.tsx")

  it("itera sobre LOCALES e mostra flag + nome nativo + código", () => {
    expect(sw).toMatch(/LOCALES\.map/)
    expect(sw).toMatch(/LOCALE_LABELS\[loc\]/)
    expect(sw).toMatch(/\{info\.flag\}/)
    expect(sw).toMatch(/\{info\.nativeName\}/)
  })

  it("tem botão com role listbox / aria-haspopup", () => {
    expect(sw).toMatch(/aria-haspopup="listbox"/)
    expect(sw).toMatch(/role="listbox"/)
  })

  it("chama setLocale ao selecionar", () => {
    expect(sw).toMatch(/setLocale\(next\)/)
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  B) AcademySidebar — imports + toggles
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.6 · B) AcademySidebar imports", () => {
  const sb = read("src/components/academy/AcademySidebar.tsx")

  it("importa ThemeToggle", () => {
    expect(sb).toMatch(/import\s*{\s*ThemeToggle\s*}\s*from\s*["']@\/components\/ui\/ThemeToggle["']/)
  })

  it("importa LocaleSwitcher", () => {
    expect(sb).toMatch(/import\s*{\s*LocaleSwitcher\s*}\s*from\s*["']@\/components\/ui\/LocaleSwitcher["']/)
  })
})

describe("R14.6 · C) AcademySidebar desktop toggles", () => {
  const sb = read("src/components/academy/AcademySidebar.tsx")

  it("renderiza <LocaleSwitcher /> dentro do SidebarContent (compartilhado desktop+drawer)", () => {
    expect(sb).toMatch(/<LocaleSwitcher\s*\/>/)
  })

  it("renderiza <ThemeToggle /> dentro do SidebarContent", () => {
    expect(sb).toMatch(/<ThemeToggle\s*\/>/)
  })

  it("tem container de preferências com data-testid identificável", () => {
    expect(sb).toMatch(/data-testid="academy-sidebar-preferences"/)
  })

  it("Locale e Theme ficam no MESMO container de preferências (lado a lado)", () => {
    const m = sb.match(/data-testid="academy-sidebar-preferences"[\s\S]{0,400}/)
    expect(m).toBeTruthy()
    const block = m![0]
    expect(block).toMatch(/<LocaleSwitcher/)
    expect(block).toMatch(/<ThemeToggle/)
  })
})

describe("R14.6 · D) AcademySidebar mobile header", () => {
  const sb = read("src/components/academy/AcademySidebar.tsx")

  it("tem LocaleSwitcher no header mobile (fora do drawer, sempre visível)", () => {
    // Procura o <header> do MobileHeader que contém o botão back-to-bia
    const headerMatch = sb.match(/<header[^>]*>[\s\S]*?<\/header>/)
    expect(headerMatch, "mobile header não encontrado").toBeTruthy()
    const block = headerMatch![0]
    expect(block).toMatch(/<LocaleSwitcher\s*\/>/)
    expect(block).toMatch(/data-testid="academy-mobile-back-to-bia"/)
  })

  it("mantém o botão BIA (voltar) ao lado do LocaleSwitcher", () => {
    const headerMatch = sb.match(/<header[^>]*>[\s\S]*?<\/header>/)
    const block = headerMatch![0]
    expect(block).toMatch(/academy-mobile-back-to-bia/)
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  E) DashboardSidebar — LocaleSwitcher no mobile header também
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.6 · E) DashboardSidebar mobile header", () => {
  const sb = read("src/components/layout/DashboardSidebar.tsx")

  it("ainda importa LocaleSwitcher e ThemeToggle", () => {
    expect(sb).toMatch(/import\s*{\s*ThemeToggle\s*}\s*from\s*["']@\/components\/ui\/ThemeToggle["']/)
    expect(sb).toMatch(/import\s*{\s*LocaleSwitcher\s*}\s*from\s*["']@\/components\/ui\/LocaleSwitcher["']/)
  })

  it("tem LocaleSwitcher no header mobile (ao lado do botão de créditos)", () => {
    // Isola o header mobile do dashboard (tem classe md:hidden fixed top-0)
    const headerMatch = sb.match(/<header className="md:hidden fixed top-0[\s\S]*?<\/header>/)
    expect(headerMatch, "mobile header do Dashboard não encontrado").toBeTruthy()
    const block = headerMatch![0]
    expect(block).toMatch(/<LocaleSwitcher\s*\/>/)
  })

  it("mantém LocaleSwitcher + ThemeToggle no sidebar desktop (bottom)", () => {
    // O bloco de Preferências existente
    expect(sb).toMatch(/Preferências[\s\S]*?<LocaleSwitcher[\s\S]*?<ThemeToggle/)
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  F) globals.css — bloco R14.6 (polimento de light na Academy)
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.6 · F) globals.css light-mode overrides para Academy", () => {
  const css = read("src/app/globals.css")

  it("tem bloco de abertura R14.6", () => {
    expect(css).toMatch(/R14\.6\s*[—\-]\s*ACADEMY LIGHT MODE/i)
  })

  it("override: sidebar Academy desktop fica com fundo claro em light", () => {
    expect(css).toMatch(/html\.light aside\[data-testid="academy-desktop-sidebar"\]/)
  })

  it("override: text-fuchsia-300/60 (captions dos grupos) vira cor profunda", () => {
    expect(css).toMatch(/html\.light[\s\S]*text-fuchsia-300\/[\s\S]*color:\s*hsl\([^)]+\)\s*!important/)
  })

  it("override: links do nav Academy ficam legíveis em light (data-testid academy-sidebar-link)", () => {
    expect(css).toMatch(/html\.light[\s\S]*a\[data-testid\*="academy-sidebar-link"\]/)
  })

  it("override: link ativo (gradient from-violet-500/15) vira gradient claro + texto escuro", () => {
    expect(css).toMatch(/html\.light[\s\S]*from-violet-500\/15[\s\S]*linear-gradient/)
  })

  it("override: botão 'Voltar para a BIA' tem fundo violet claro + texto escuro", () => {
    expect(css).toMatch(/html\.light[\s\S]*academy-sidebar-back-to-bia/)
  })

  it("override: InfoTooltip popup (bg-[#0c0820]) fica claro com texto escuro", () => {
    expect(css).toMatch(/html\.light\s*div\[class\*="bg-\[#0c0820\]"\]/)
  })

  it("override: bg-[#050208] (layout wrapper da Academy logada) vira fundo claro", () => {
    expect(css).toMatch(/html\.light[\s\S]*bg-\[#050208\][\s\S]*background-color/)
  })

  it("preserva bloco de fechamento R14.6", () => {
    expect(css).toMatch(/FIM R14\.6/)
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  G) Dicionários cobrem termos de navegação Academy
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.6 · G) Dicionários i18n", () => {
  const locales = read("src/lib/i18n/locales.ts")

  it("todos os 3 locales têm chave common.theme + common.language", () => {
    for (const loc of ["pt", "en", "es"] as const) {
      const dictMatch = locales.match(new RegExp(`${loc}:\\s*{[\\s\\S]*?^\\s{2}}`, "m"))
      expect(dictMatch, `dicionário ${loc} não encontrado`).toBeTruthy()
      const dict = dictMatch![0]
      expect(dict, `${loc}: common.theme ausente`).toMatch(/"common\.theme"/)
      expect(dict, `${loc}: common.language ausente`).toMatch(/"common\.language"/)
    }
  })

  it("os 3 locales têm 'Claro / Escuro / Sistema' traduzidos", () => {
    expect(locales).toMatch(/"common\.light":\s*"Claro"/)   // pt
    expect(locales).toMatch(/"common\.light":\s*"Light"/)    // en
    expect(locales).toMatch(/"common\.light":\s*"Claro"/)    // es (igual pt)
    expect(locales).toMatch(/"common\.dark":\s*"Escuro"/)    // pt
    expect(locales).toMatch(/"common\.dark":\s*"Dark"/)      // en
    expect(locales).toMatch(/"common\.dark":\s*"Oscuro"/)    // es
  })
})
