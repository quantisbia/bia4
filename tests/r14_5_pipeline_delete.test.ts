/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R14.5 — Pipeline: exclusão de projetos
 *  ─────────────────────────────────────────────────────────────────────
 *  REQUISITO (Janaina, 2026-10-20):
 *   "na parte de projeto - pipeline, criar a opção de exclusão dos
 *    projetos criados, mesmo os que não chegaram até o final do
 *    desenvolvimento."
 *
 *  ESTE ARQUIVO TRAVA:
 *   A) Schema: PipelineStage.project tem onDelete: Cascade
 *      (deletar o projeto apaga as etapas automaticamente — sem migration)
 *   B) API `/api/pipeline` tem `export async function DELETE`
 *      - valida auth() → 401 se não autenticado
 *      - exige query param `id`
 *      - usa getPipelineProject(id, userId) para validar ownership → 404
 *      - chama prisma.pipelineProject.delete({ where: { id } })
 *      - permite excluir em qualquer status (sem whitelist de status)
 *   C) UI `/dashboard/pipeline/page.tsx`:
 *      - importa Trash2 do lucide-react
 *      - tem função deleteProject(id, name) com confirm pt-BR
 *      - fetch("/api/pipeline?id=...", { method: "DELETE" })
 *      - remove do state local (setProjects filter)
 *      - reseta selectedProject + analysis se o deletado for o atual
 *      - renderiza botão <Trash2 /> em cada card com stopPropagation
 *      - passa onDelete para ProjectsPanel (desktop + mobile)
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = resolve(__dirname, "..")
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8")

/* ══════════════════════════════════════════════════════════════════════
 *  A) Schema: cascade preserva integridade sem migration
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.5 · A) Schema cascade", () => {
  const schema = read("prisma/schema.prisma")

  it("PipelineProject existe no schema", () => {
    expect(schema).toMatch(/model\s+PipelineProject\s*{/)
  })

  it("PipelineStage.project tem onDelete: Cascade (apaga stages ao apagar projeto)", () => {
    const match = schema.match(/model\s+PipelineStage\s*{[\s\S]*?^}/m)
    expect(match, "bloco PipelineStage não encontrado").toBeTruthy()
    const block = match![0]
    expect(block).toMatch(/project\s+PipelineProject[\s\S]*onDelete:\s*Cascade/)
  })

  it("PipelineProject.user tem onDelete: Cascade (apaga projetos ao apagar user)", () => {
    const match = schema.match(/model\s+PipelineProject\s*{[\s\S]*?^}/m)
    expect(match).toBeTruthy()
    const block = match![0]
    expect(block).toMatch(/user\s+User[\s\S]*onDelete:\s*Cascade/)
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  B) API: DELETE handler
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.5 · B) API /api/pipeline DELETE", () => {
  const api = read("src/app/api/pipeline/route.ts")

  it("exporta função DELETE assíncrona", () => {
    expect(api).toMatch(/export\s+async\s+function\s+DELETE\s*\(/)
  })

  it("valida auth() e retorna 401 quando não autenticado", () => {
    const match = api.match(/export\s+async\s+function\s+DELETE\s*\([\s\S]*?^}/m)
    expect(match, "função DELETE não encontrada").toBeTruthy()
    const block = match![0]
    expect(block).toMatch(/await\s+auth\(\)/)
    expect(block).toMatch(/session\?\.user\?\.id/)
    expect(block).toMatch(/status:\s*401/)
  })

  it("exige query param `id` e retorna 400 se ausente", () => {
    const match = api.match(/export\s+async\s+function\s+DELETE\s*\([\s\S]*?^}/m)
    const block = match![0]
    expect(block).toMatch(/searchParams\.get\(["']id["']\)/)
    expect(block).toMatch(/status:\s*400/)
  })

  it("valida ownership via getPipelineProject(id, userId) e retorna 404 se não achar", () => {
    const match = api.match(/export\s+async\s+function\s+DELETE\s*\([\s\S]*?^}/m)
    const block = match![0]
    expect(block).toMatch(/getPipelineProject\s*\(/)
    expect(block).toMatch(/status:\s*404/)
  })

  it("chama prisma.pipelineProject.delete com where.id", () => {
    const match = api.match(/export\s+async\s+function\s+DELETE\s*\([\s\S]*?^}/m)
    const block = match![0]
    expect(block).toMatch(/prisma\.pipelineProject\.delete/)
    expect(block).toMatch(/where:\s*{\s*id:\s*projectId\s*}/)
  })

  it("NÃO restringe por status (permite excluir DRAFT, IN_PROGRESS ou COMPLETED)", () => {
    // Requisito explícito da Janaina: "mesmo os que não chegaram até o final"
    const match = api.match(/export\s+async\s+function\s+DELETE\s*\([\s\S]*?^}/m)
    const block = match![0]
    expect(block).not.toMatch(/status\s*!==\s*["']COMPLETED["']/)
    expect(block).not.toMatch(/status\s*===\s*["']DRAFT["']/)
    expect(block).not.toMatch(/completionRate\s*[<>=]/)
  })

  it("responde com { ok: true, id } no sucesso", () => {
    const match = api.match(/export\s+async\s+function\s+DELETE\s*\([\s\S]*?^}/m)
    const block = match![0]
    expect(block).toMatch(/ok:\s*true/)
    expect(block).toMatch(/id:\s*projectId/)
  })

  it("preserva as rotas GET e POST originais (não quebra funcionalidade existente)", () => {
    expect(api).toMatch(/export\s+async\s+function\s+GET\s*\(/)
    expect(api).toMatch(/export\s+async\s+function\s+POST\s*\(/)
    expect(api).toMatch(/action\s*===\s*["']create["']/)
    expect(api).toMatch(/action\s*===\s*["']analyze_stage["']/)
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  C) UI: botão lixeira + handler + reset de seleção
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.5 · C) UI /dashboard/pipeline/page.tsx", () => {
  const page = read("src/app/dashboard/pipeline/page.tsx")

  it("importa Trash2 do lucide-react", () => {
    const importBlock = page.match(/import\s*{[\s\S]*?}\s*from\s*["']lucide-react["']/)
    expect(importBlock).toBeTruthy()
    expect(importBlock![0]).toContain("Trash2")
  })

  it("define função deleteProject(id, name)", () => {
    expect(page).toMatch(/(async\s+)?function\s+deleteProject\s*\(\s*id\s*:\s*string\s*,\s*name\s*:\s*string/)
  })

  it("usa confirm nativo em pt-BR com nome do projeto e aviso de permanência", () => {
    const match = page.match(/function\s+deleteProject[\s\S]*?^\s{2}}/m)
    expect(match).toBeTruthy()
    const block = match![0]
    expect(block).toMatch(/window\.confirm/)
    expect(block.toLowerCase()).toMatch(/excluir/)
    expect(block.toLowerCase()).toMatch(/não pode ser desfeita|permanentemente/)
  })

  it("chama fetch com method DELETE e query param id", () => {
    const match = page.match(/function\s+deleteProject[\s\S]*?^\s{2}}/m)
    const block = match![0]
    expect(block).toMatch(/fetch\(\s*`\/api\/pipeline\?id=\$\{encodeURIComponent\(id\)\}`/)
    expect(block).toMatch(/method:\s*["']DELETE["']/)
  })

  it("remove projeto do state local após sucesso", () => {
    const match = page.match(/function\s+deleteProject[\s\S]*?^\s{2}}/m)
    const block = match![0]
    expect(block).toMatch(/setProjects\s*\(\s*prev\s*=>\s*prev\.filter\s*\(\s*p\s*=>\s*p\.id\s*!==\s*id\s*\)\s*\)/)
  })

  it("reseta selectedProject + analysis se o projeto excluído era o atual", () => {
    const match = page.match(/function\s+deleteProject[\s\S]*?^\s{2}}/m)
    const block = match![0]
    expect(block).toMatch(/selectedProject\?\.id\s*===\s*id/)
    expect(block).toMatch(/setSelectedProject\(null\)/)
    expect(block).toMatch(/setAnalysis\(null\)/)
  })

  it("ProjectsPanel aceita prop onDelete opcional", () => {
    expect(page).toMatch(/onDelete\?:\s*\(\s*id\s*:\s*string\s*,\s*name\s*:\s*string\s*\)\s*=>\s*void/)
  })

  it("renderiza botão Trash2 em cada card com stopPropagation (não dispara seleção)", () => {
    expect(page).toMatch(/<Trash2\s/)
    expect(page).toMatch(/e\.stopPropagation\(\)/)
    expect(page).toMatch(/e\.preventDefault\(\)/)
  })

  it("botão de exclusão tem aria-label e data-testid identificáveis", () => {
    expect(page).toMatch(/aria-label=\{`Excluir projeto \$\{p\.name\}`\}/)
    expect(page).toMatch(/data-testid=\{`pipeline-delete-\$\{p\.id\}`\}/)
  })

  it("ProjectsPanel desktop E mobile recebem onDelete={deleteProject}", () => {
    const matches = page.match(/onDelete=\{deleteProject\}/g)
    expect(matches).toBeTruthy()
    expect(matches!.length).toBeGreaterThanOrEqual(2)
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  D) Arquivos existem (regressão rápida)
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.5 · D) Arquivos", () => {
  it("src/app/api/pipeline/route.ts existe", () => {
    expect(existsSync(resolve(ROOT, "src/app/api/pipeline/route.ts"))).toBe(true)
  })
  it("src/app/dashboard/pipeline/page.tsx existe", () => {
    expect(existsSync(resolve(ROOT, "src/app/dashboard/pipeline/page.tsx"))).toBe(true)
  })
  it("prisma/schema.prisma existe", () => {
    expect(existsSync(resolve(ROOT, "prisma/schema.prisma"))).toBe(true)
  })
})
