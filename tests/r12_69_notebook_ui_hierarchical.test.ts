/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R12.69 — UI hierárquica do Notebook (Projetos → Entradas → Versões)
 *  ─────────────────────────────────────────────────────────────────────
 *  Mandato Janaina (Fase 4 de 4 do pacote export/salvar/rastreabilidade):
 *
 *  "Hierarquia Projetos → Experimentos → Protocolos → Formulações → Bioinks
 *   → Resultados → Imagens → Próximos Passos → Versões; busca por título/
 *   projeto/palavra-chave/data/protocolo/tag; UI para consultar/abrir/
 *   comparar/restaurar/exportar versões."
 *
 *  Defaults aprovados nesta sprint:
 *   1. Mobile: tabs no topo (Projetos | Entradas | Viewer)
 *   2. Diff: side-by-side simples, ZERO deps novas
 *   3. Projetos: ordem por atividade recente (updatedAt DESC)
 *   4. 4 filtros na EntryList: Tipo · Data · Tem imagens · Pinned
 *   5. Views create/generate existentes preservadas intactas
 *
 *  Cobre:
 *   A) API GET /api/notebook estendida (projectId + tags + sinceDays)
 *   B) ProjectSidebar renderiza slots + projetos + botão criar
 *   C) EntryList tem busca, 4 filtros e testIds
 *   D) VersionTimeline lista versões, permite comparar 2 e restaurar
 *   E) VersionDiff é side-by-side, ZERO libs externas
 *   F) Página notebook tem view=explorer com layout 3 colunas
 *   G) Mobile tabs para responsividade
 *   H) Sanidade global
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
describe("R12.69.A · API GET /api/notebook estendida com projectId + tags + sinceDays", () => {
  const src = readSrc("src/app/api/notebook/route.ts")

  it("Aceita ?projectId=<id> como filtro na consulta", () => {
    expect(src).toMatch(/projectId\s*=\s*searchParams\.get\(["']projectId["']\)/)
    expect(src).toMatch(/where\.projectId\s*=\s*projectId/)
  })

  it("Aceita ?projectId=null (string) para filtrar entradas SEM projeto", () => {
    expect(src).toMatch(/projectId\s*===\s*["']null["'][\s\S]*?where\.projectId\s*=\s*null/)
  })

  it("Busca ?q= inclui tags (Postgres array `has`)", () => {
    // O bloco OR da busca precisa ter { tags: { has: ... } }
    const searchBlock = src.match(/if\s*\(\s*search\s*\)[\s\S]*?\]/)
    expect(searchBlock).toBeTruthy()
    expect(searchBlock?.[0]).toMatch(/tags:\s*\{\s*has:/)
  })

  it("Busca ?q= mantém title, content, category (retrocompatibilidade)", () => {
    const searchBlock = src.match(/if\s*\(\s*search\s*\)[\s\S]*?\]/)
    expect(searchBlock?.[0]).toContain("title:")
    expect(searchBlock?.[0]).toContain("content:")
    expect(searchBlock?.[0]).toContain("category:")
  })

  it("Aceita ?sinceDays=N para filtrar updatedAt >= now - N dias", () => {
    expect(src).toMatch(/sinceDays\s*=\s*searchParams\.get\(["']sinceDays["']\)/)
    expect(src).toMatch(/where\.updatedAt\s*=\s*\{\s*gte:\s*cutoff\s*\}/)
  })

  it("Retorna _count.images e _count.versions no select (para filtros e badges)", () => {
    expect(src).toMatch(/_count:\s*\{\s*select:\s*\{\s*images:\s*true,\s*versions:\s*true\s*\}/)
  })

  it("Retorna projectId e currentVersion no select (para UI hierárquica)", () => {
    expect(src).toMatch(/projectId:\s*true/)
    expect(src).toMatch(/currentVersion:\s*true/)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.69.B · ProjectSidebar (Nível 1)", () => {
  const src = readSrc("src/components/notebook/ProjectSidebar.tsx")

  it('É Client Component ("use client")', () => {
    expect(src.trim().startsWith('"use client"')).toBe(true)
  })

  it("Exporta ProjectSidebar + ProjectItem + ProjectSelection", () => {
    expect(src).toMatch(/export\s+function\s+ProjectSidebar\s*\(/)
    expect(src).toMatch(/export\s+interface\s+ProjectItem\b/)
    expect(src).toMatch(/export\s+type\s+ProjectSelection\b/)
  })

  it("Consome GET /api/projects", () => {
    expect(src).toMatch(/fetch\(\s*["']\/api\/projects["']/)
  })

  it("Renderiza 2 slots virtuais: 'all' e 'none' (sem projeto)", () => {
    expect(src).toContain("project-sidebar-all")
    expect(src).toContain("project-sidebar-none")
    expect(src).toMatch(/kind:\s*["']all["']/)
    expect(src).toMatch(/kind:\s*["']none["']/)
  })

  it("Tem botão para criar novo projeto (POST /api/projects)", () => {
    expect(src).toContain("project-sidebar-new")
    expect(src).toMatch(/method:\s*["']POST["']/)
    // O POST vai para /api/projects
    expect(src).toMatch(/fetch\(\s*["']\/api\/projects["'],\s*\{[\s\S]*?method:\s*["']POST["']/)
  })

  it("Modal de criar projeto pede name + researchArea + color", () => {
    expect(src).toContain("new-project-name")
    expect(src).toContain("new-project-area")
    expect(src).toContain("new-project-color")
    expect(src).toContain("new-project-submit")
  })

  it("Projetos arquivados ficam com opacity reduzida (não escondidos)", () => {
    expect(src).toMatch(/archived\s*&&\s*["']opacity-50["']/)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.69.C · EntryList (Nível 2) — busca + 4 filtros", () => {
  const src = readSrc("src/components/notebook/EntryList.tsx")

  it("Consome GET /api/notebook (com params dinâmicos)", () => {
    expect(src).toMatch(/fetch\(\s*`\/api\/notebook\?/)
  })

  it("Busca global com debounce de 250ms", () => {
    expect(src).toMatch(/setTimeout\([\s\S]*?250/)
  })

  it("Passa projectId=null para 'sem projeto' e id real para 'project'", () => {
    expect(src).toMatch(/projectSelection\.kind\s*===\s*["']none["'][\s\S]*?p\.set\(\s*["']projectId["'],\s*["']null["']/)
    expect(src).toMatch(/projectSelection\.kind\s*===\s*["']project["'][\s\S]*?projectSelection\.id/)
  })

  it("Tem os 4 filtros oficiais: Tipo, Data, Tem imagens, Pinned", () => {
    expect(src).toContain("entry-list-filter-type")
    // Data usa template literal — testamos o prefixo
    expect(src).toMatch(/entry-list-filter-date-\$\{opt\.v/)
    // Opções v: "", "7", "30", "90"
    for (const v of ["", "7", "30", "90"]) {
      const label = v === "" ? '"Todos"' : `"${v}d"`
      expect(src, `opção de data "${label}" ausente`).toContain(label)
    }
    expect(src).toContain("entry-list-filter-has-images")
    expect(src).toContain("entry-list-filter-pinned")
  })

  it("Filtro 'Tem imagens' é aplicado client-side (usa _count.images)", () => {
    expect(src).toMatch(/hasImagesOnly[\s\S]*?_count\?\.images/)
  })

  it("Mostra badge de versão (vN) quando currentVersion > 1", () => {
    expect(src).toMatch(/currentVersion\s*>\s*1[\s\S]*?v\{[^}]*currentVersion/)
  })

  it("Mostra contador de imagens no card quando > 0", () => {
    expect(src).toMatch(/_count\?\.images[\s\S]*?>\s*0/)
  })

  it("Tem input de busca com testId entry-list-search", () => {
    expect(src).toContain("entry-list-search")
    expect(src).toMatch(/placeholder=["'][^"']*[Bb]uscar/)
  })

  it("Formata datas relativas (há N min/h/d/sem)", () => {
    expect(src).toMatch(/formatRelative/)
    expect(src).toMatch(/há \$\{min\} min|há \$\{h\} h|há \$\{day\} d/)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.69.D · VersionTimeline (Nível 3 parte 1)", () => {
  const src = readSrc("src/components/notebook/VersionTimeline.tsx")

  it("Consome GET /api/notebook/[id]/versions", () => {
    expect(src).toMatch(/fetch\(\s*`\/api\/notebook\/\$\{entryId\}\/versions`\)/)
  })

  it("Consome POST /api/notebook/[id]/versions/restore para restaurar", () => {
    expect(src).toMatch(/\/versions\/restore/)
    expect(src).toMatch(/method:\s*["']POST["']/)
    expect(src).toMatch(/targetVersion:\s*versionNumber/)
  })

  it("Permite selecionar até 2 versões para diff (máx 2)", () => {
    // Se já tem 2, substitui a mais antiga (não acumula 3)
    expect(src).toMatch(/prev\.length\s*>=\s*2[\s\S]*?prev\[1\]/)
  })

  it("Chama onCompare(novaV, antigaV) com nova primeiro (sort desc)", () => {
    // Ordem descendente: sort((x, y) => y - x)
    expect(src).toMatch(/selectedForDiff\.sort\([\s\S]*?y\s*-\s*x/)
    // Chamada real é `onCompare(a, b)` dentro de triggerCompare
    expect(src).toMatch(/onCompare\(a,\s*b\)/)
  })

  it("Restaurar usa window.confirm() antes de chamar API (proteção)", () => {
    expect(src).toMatch(/window\.confirm/)
    expect(src).toMatch(/histórico NÃO é apagado|hist[óo]rico.*n[ãa]o.*apagado/i)
  })

  it("Botão de restaurar não aparece na versão atual", () => {
    expect(src).toMatch(/!isCurrent\s*&&\s*\(\s*<button[\s\S]*?doRestore/)
  })

  it("Badge 'atual' aparece na versão marcada como currentVersion", () => {
    expect(src).toMatch(/isCurrent\s*&&\s*\([\s\S]*?atual/)
  })

  it("Tem testIds para item/select/restore de cada versão", () => {
    expect(src).toMatch(/version-timeline-item-\$\{v\.versionNumber\}/)
    expect(src).toMatch(/version-timeline-select-\$\{v\.versionNumber\}/)
    expect(src).toMatch(/version-timeline-restore-\$\{v\.versionNumber\}/)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.69.E · VersionDiff (Nível 3 parte 2) — side-by-side ZERO libs", () => {
  const src = readSrc("src/components/notebook/VersionDiff.tsx")

  it("Consome GET /api/notebook/[id]/versions/[versionNew]?compareTo=[versionOld]", () => {
    expect(src).toMatch(/\/api\/notebook\/\$\{entryId\}\/versions\/\$\{versionNew\}\?compareTo=\$\{versionOld\}/)
  })

  it("NÃO importa nenhuma lib de diff externa (opção A aprovada)", () => {
    expect(src).not.toMatch(/from\s+["']diff["']/)
    expect(src).not.toMatch(/from\s+["']diff-match-patch["']/)
    expect(src).not.toMatch(/from\s+["']jsdiff["']/)
    expect(src).not.toMatch(/from\s+["']fast-diff["']/)
  })

  it("Renderiza 2 colunas: v_A (esquerda, vermelha) vs v_B (direita, verde)", () => {
    // Cores semânticas: A → red, B → emerald
    expect(src).toMatch(/side\s*===\s*["']A["'][\s\S]*?red-500/)
    expect(src).toMatch(/side\s*===\s*["']A["'][\s\S]*?emerald-500|B["']\s*[\s\S]*?emerald-500/)
  })

  it("Marca campos alterados com background âmbar", () => {
    expect(src).toMatch(/isChanged[\s\S]*?amber-500/)
  })

  it("Renderiza os 6 campos versionáveis do EntrySnapshot", () => {
    for (const field of ["title", "entryType", "category", "tags", "projectId", "content"]) {
      expect(src, `campo "${field}" ausente do diff`).toContain(field)
    }
  })

  it("Tags viram pills (não texto puro)", () => {
    expect(src).toMatch(/fieldKey\s*===\s*["']tags["'][\s\S]*?Array\.isArray/)
    expect(src).toMatch(/inline-block\s+rounded/)
  })

  it("Conteúdo (content) é pre-formatado com scroll interno", () => {
    expect(src).toMatch(/fieldKey\s*===\s*["']content["'][\s\S]*?whitespace-pre-wrap[\s\S]*?overflow-y-auto/)
  })

  it("Empilha em 1 coluna em telas <= md (grid-cols-1 md:grid-cols-2)", () => {
    expect(src).toMatch(/grid-cols-1\s+md:grid-cols-2/)
  })

  it("Mostra callout de sucesso se conteúdo é idêntico (changedFields.length === 0)", () => {
    expect(src).toMatch(/changedFields\.length\s*===\s*0[\s\S]*?id[êe]nticos?/i)
  })

  it("Tem testId 'version-diff' no modal + testIds por campo", () => {
    expect(src).toMatch(/data-testid=["']version-diff["']/)
    expect(src).toMatch(/version-diff-field-\$\{fieldKey\}/)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.69.F · Página /dashboard/notebook adiciona view=explorer", () => {
  const src = readSrc("src/app/dashboard/notebook/page.tsx")

  it("Importa os 4 componentes novos + ExportBar", () => {
    expect(src).toMatch(/import\s*\{\s*ProjectSidebar[\s\S]*?ProjectSelection\s*\}/)
    expect(src).toMatch(/import\s*\{\s*EntryList\s*\}/)
    expect(src).toMatch(/import\s*\{\s*VersionTimeline\s*\}/)
    expect(src).toMatch(/import\s*\{\s*VersionDiff\s*\}/)
    expect(src).toMatch(/import\s*\{\s*ExportBar\s*\}/)
  })

  it("Estado view aceita 'explorer' (5 valores no total)", () => {
    expect(src).toMatch(/useState<["']list["']\s*\|\s*["']create["']\s*\|\s*["']generate["']\s*\|\s*["']viewer["']\s*\|\s*["']explorer["']>/)
  })

  it("Views 'create' e 'generate' existentes NÃO foram removidas", () => {
    expect(src).toMatch(/view\s*===\s*["']create["']/)
    expect(src).toMatch(/view\s*===\s*["']generate["']/)
    expect(src).toMatch(/view\s*===\s*["']viewer["']/)
  })

  it("Botão 'Toggle Explorador' com testId notebook-toggle-explorer", () => {
    expect(src).toContain("notebook-toggle-explorer")
    expect(src).toMatch(/setView\(view\s*===\s*["']explorer["']\s*\?\s*["']list["']\s*:\s*["']explorer["']\)/)
  })

  it("Layout explorer tem 3 colunas (md) e tabs (mobile <md)", () => {
    expect(src).toMatch(/data-testid=["']notebook-explorer["']/)
    expect(src).toMatch(/md:hidden\s+flex\s+border-b/) // tabs mobile
    expect(src).toMatch(/hidden\s+md:block/)          // colunas escondem em mobile
  })

  it("Mobile tabs têm os 3 valores: projects, entries, viewer", () => {
    // testId com template literal — checamos o prefixo
    expect(src).toMatch(/explorer-mobile-tab-\$\{t\.key\}/)
    // Os 3 valores estão na definição do array (key: "projects", "entries", "viewer")
    expect(src).toMatch(/key:\s*["']projects["']/)
    expect(src).toMatch(/key:\s*["']entries["']/)
    expect(src).toMatch(/key:\s*["']viewer["']/)
  })

  it("Ao selecionar projeto, muda para tab 'entries' no mobile", () => {
    expect(src).toMatch(/setProjectSel[\s\S]*?setMobileTab\(["']entries["']\)/)
  })

  it("Ao selecionar entrada, muda para tab 'viewer' no mobile", () => {
    expect(src).toMatch(/setExplorerEntryId[\s\S]*?setMobileTab\(["']viewer["']\)/)
  })

  it("VersionTimeline.onCompare abre modal VersionDiff", () => {
    expect(src).toMatch(/onCompare=\{\s*\(newV,\s*oldV\)\s*=>\s*setDiffPair/)
    expect(src).toMatch(/<VersionDiff\b/)
  })

  it("VersionTimeline.onRestored bumpa reloadKey (recarrega entry + timeline)", () => {
    expect(src).toMatch(/onRestored=\{\s*\(\)\s*=>\s*setReloadKey/)
  })

  it("ExportBar do explorer reidrata blocos via metadata.__exportableBlocks", () => {
    expect(src).toMatch(/__exportableBlocks/)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.69.G · Sanidade global", () => {
  const files = [
    "src/components/notebook/ProjectSidebar.tsx",
    "src/components/notebook/EntryList.tsx",
    "src/components/notebook/VersionTimeline.tsx",
    "src/components/notebook/VersionDiff.tsx",
  ]

  it("Todos os 4 novos componentes existem em disco", () => {
    for (const f of files) {
      expect(fileExists(f), `Ausente: ${f}`).toBe(true)
    }
  })

  it("Todos os 4 componentes têm 'use client' (interagem com fetch/state)", () => {
    for (const f of files) {
      const src = readSrc(f)
      expect(src.trim().startsWith('"use client"'), `${f} deve ser Client Component`).toBe(true)
    }
  })

  it("Nenhum arquivo R12.69 vaza secret/DATABASE_URL hardcoded", () => {
    const allFiles = [
      ...files,
      "src/app/dashboard/notebook/page.tsx",
      "src/app/api/notebook/route.ts",
    ]
    for (const f of allFiles) {
      const src = readSrc(f)
      expect(src, `${f} não deve conter chaves API`).not.toMatch(/sk-[A-Za-z0-9]{20,}/)
      expect(src, `${f} não deve conter DATABASE_URL`).not.toMatch(/postgres:\/\/[^"'`]+/)
    }
  })

  it("Nenhum componente R12.69 adicionou dep externa não-instalada", () => {
    const pkg = JSON.parse(readSrc("package.json"))
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
    // Não deveria haver dependência de lib de diff
    expect(allDeps["diff"]).toBeUndefined()
    expect(allDeps["diff-match-patch"]).toBeUndefined()
    expect(allDeps["fast-diff"]).toBeUndefined()
  })

  it("Todos os componentes R12.69 usam @/components/notebook/ como namespace", () => {
    const page = readSrc("src/app/dashboard/notebook/page.tsx")
    expect(page).toMatch(/@\/components\/notebook\/ProjectSidebar/)
    expect(page).toMatch(/@\/components\/notebook\/EntryList/)
    expect(page).toMatch(/@\/components\/notebook\/VersionTimeline/)
    expect(page).toMatch(/@\/components\/notebook\/VersionDiff/)
  })
})
