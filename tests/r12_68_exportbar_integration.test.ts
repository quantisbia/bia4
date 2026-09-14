/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R12.68 — Integração: espalhar <ExportBar> em 5 ferramentas
 *  ─────────────────────────────────────────────────────────────────────
 *  Mandato Janaina (Fase 3 do pacote export/salvar/rastreabilidade):
 *
 *  "Botões padrão em TODAS as ferramentas: Pipeline, Formulator Pro,
 *   Bioink, Chat IA, Próximos Passos."
 *
 *  Decisões acordadas neste sprint:
 *   1. "Próximos Passos" é uma seção da Pipeline (não uma rota) → 1 ExportBar
 *   2. Formulator Pro: remover botão antigo "Salvar Protocolo"; Notebook é fonte única
 *   3. Script de migração Protocol → NotebookEntry criado (não-destrutivo)
 *   4. Bioink: escopo escolhido no clique (ativa | ambas | T0 | T1) — opção C
 *   5. Chat IA: filtro por autor (all | assistant | user) — opção C
 *
 *  Cobre:
 *   A) 4 adapters existem e produzem ExportableContent válido
 *   B) Adapter Pipeline gera blocos coerentes para projeto + análise + Próximos Passos
 *   C) Adapter Formulator Pro cobre todos os 16 campos ricos da ProFormulation
 *   D) Adapter Bioink respeita escopo (active/both/single) e reologia
 *   E) Adapter Chat filtra por role (all/assistant/user) e preserva code fences
 *   F) Pipeline page importa ExportBar+adapter e renderiza após "Próximos Passos"
 *   G) Formulator Pro page importa ExportBar+adapter e REMOVEU handleSaveProtocol
 *   H) Bioink page importa ExportBar+adapter com dropdown de escopo
 *   I) Chat page importa ExportBar+adapter com dropdown de filtro
 *   J) Script de migração é não-destrutivo (idempotente, não apaga Protocol)
 * ═══════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import {
  buildContentFromPipeline,
} from "../src/lib/export/adapters/pipeline-adapter"
import {
  buildContentFromProFormulation,
} from "../src/lib/export/adapters/formulator-pro-adapter"
import {
  buildContentFromBioinkDrafts,
} from "../src/lib/export/adapters/bioink-adapter"
import {
  buildContentFromChatSession,
  type ChatExportFilter,
} from "../src/lib/export/adapters/chat-adapter"
import { buildPdfBlob } from "../src/lib/export/pdf-exporter"

const ROOT = resolve(__dirname, "..")

function readSrc(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8")
}

function fileExists(rel: string): boolean {
  return existsSync(resolve(ROOT, rel))
}

// ─────────────────────────────────────────────────────────────────────
describe("R12.68.A · Todos os 4 adapters existem e são funções", () => {
  it("Pipeline adapter é função exportada", () => {
    expect(typeof buildContentFromPipeline).toBe("function")
  })
  it("Formulator Pro adapter é função exportada", () => {
    expect(typeof buildContentFromProFormulation).toBe("function")
  })
  it("Bioink adapter é função exportada", () => {
    expect(typeof buildContentFromBioinkDrafts).toBe("function")
  })
  it("Chat IA adapter é função exportada", () => {
    expect(typeof buildContentFromChatSession).toBe("function")
  })
  it("Todos os 4 arquivos de adapter existem em src/lib/export/adapters/", () => {
    for (const f of [
      "src/lib/export/adapters/pipeline-adapter.ts",
      "src/lib/export/adapters/formulator-pro-adapter.ts",
      "src/lib/export/adapters/bioink-adapter.ts",
      "src/lib/export/adapters/chat-adapter.ts",
    ]) {
      expect(fileExists(f), `Adapter ausente: ${f}`).toBe(true)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.68.B · Adapter Pipeline (inclui Próximos Passos)", () => {
  const project = {
    id: "p1",
    name: "Cartilagem MVP",
    tissueType: "Cartilagem articular",
    targetApplication: "Reparo condral",
    currentStage: 3,
    completionRate: 30,
    status: "ACTIVE",
    createdAt: "2026-08-01T10:00:00Z",
  }
  const analysis = {
    stage: 3,
    stageName: "Seleção de biomateriais",
    recommendation: "Use GelMA 10% com HA 1% para viscoelasticidade balanceada.",
    parameters: { modulusKPa: 20, gelationTime: "5-10 min" },
    warnings: ["Verificar biocompatibilidade dos crosslinkers"],
    nextSteps: ["Testar reologia", "Definir densidade celular", "Otimizar UV"],
    creditsUsed: 5,
  }

  it("Gera título completo com etapa e nome da etapa", () => {
    const c = buildContentFromPipeline({ project, analysis })
    expect(c.title).toContain(project.name)
    expect(c.title).toContain("Etapa 3")
    expect(c.title).toContain("Seleção de biomateriais")
  })

  it("entryType é PIPELINE_SUMMARY e source = Pipeline", () => {
    const c = buildContentFromPipeline({ project, analysis })
    expect(c.entryType).toBe("PIPELINE_SUMMARY")
    expect(c.source).toBe("Pipeline")
  })

  it("Sem análise: só contexto do projeto (menos blocos)", () => {
    const only = buildContentFromPipeline({ project, analysis: null })
    const withA = buildContentFromPipeline({ project, analysis })
    expect(withA.blocks.length).toBeGreaterThan(only.blocks.length)
  })

  it("Próximos passos vira lista numerada", () => {
    const c = buildContentFromPipeline({ project, analysis })
    const hasNextSteps = c.blocks.some(
      (b) => b.type === "list" && b.style === "numbered",
    )
    expect(hasNextSteps).toBe(true)
  })

  it("Warnings viram callouts warning (destaque visual verbatim Janaina)", () => {
    const c = buildContentFromPipeline({ project, analysis })
    const hasWarnCallout = c.blocks.some(
      (b) => b.type === "callout" && b.variant === "warning",
    )
    expect(hasWarnCallout).toBe(true)
  })

  it("Metadata preserva pipelineProjectId + stage + creditsUsed", () => {
    const c = buildContentFromPipeline({ project, analysis })
    expect(c.metadata?.pipelineProjectId).toBe(project.id)
    expect(c.metadata?.stage).toBe(3)
    expect(c.metadata?.creditsUsed).toBe(5)
  })

  it("PDF real é gerado sem erro", () => {
    const c = buildContentFromPipeline({ project, analysis })
    const blob = buildPdfBlob(c)
    expect(blob.size).toBeGreaterThan(2000)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.68.C · Adapter Formulator Pro (16 campos ricos)", () => {
  const result = {
    name: "GelMA-HA para cartilagem v3",
    goalCategory: "CARTILAGE_REPAIR",
    rationale: "Formulação balanceada para condrócitos.",
    scientificScore: {
      overall: 82, mechanical: 78, biological: 88, manufacturability: 80, regulatory: 82,
    },
    components: [
      { name: "GelMA", role: "STRUCTURAL", concentration: "10%", rationale: "backbone fotocurável" },
      { name: "HA", role: "RHEOLOGY", concentration: "1%", rationale: "retenção de água" },
    ],
    crosslinking: {
      method: "Fotocrosslink UV/LAP",
      parameters: { "UV": "405 nm", "tempo": "30s" },
      rationale: "compatível com condrócitos primários",
    },
    predictedProperties: { "G' (Pa)": "500", "Viabilidade 24h": ">85%" },
    preparationProtocol: [
      { step: 1, title: "Preparar GelMA", description: "em PBS a 37°C", timeMin: 60, temperature: "37°C" },
      { step: 2, title: "Adicionar LAP", description: "sob agitação leve", criticalPoint: true },
    ],
    warnings: [
      { severity: "warning" as const, type: "UV", message: "LAP fotossensível", suggestion: "proteger da luz" },
    ],
    printingParameters: { pressureKPa: 80, speedMmS: 6 },
    characterization: ["Reologia G'/G''", "LDH viabilidade"],
    regulatory: {
      estimatedClass: "IIb",
      relevantStandards: ["ISO 10993-1", "ISO 13485"],
      notes: "Requer estudos in vivo antes de submissão.",
    },
    references: [
      { title: "Yue et al. GelMA review", year: 2015, doi: "10.1016/j.biomaterials.2015.08.045" },
    ],
    alternatives: [
      { name: "Alternativa com Alginato", summary: "Reticulação iônica", swapFromOriginal: "GelMA→Alginato", tradeoff: "menor rigidez" },
    ],
  }

  it("Título e goalCategory humanizada", () => {
    const c = buildContentFromProFormulation({ result })
    expect(c.title).toBe(result.name)
    expect(c.subtitle).toBe("Cartilagem articular") // humanizado
    expect(c.entryType).toBe("FORMULATION")
  })

  it("Scores viram KeyValue com formato N/100", () => {
    const c = buildContentFromProFormulation({ result })
    const kv = c.blocks.find(
      (b) => b.type === "keyvalue" && b.title === "Scores científicos (0-100)",
    )
    expect(kv).toBeTruthy()
    if (kv && kv.type === "keyvalue") {
      const overall = kv.pairs.find((p) => p.key === "Score geral")
      expect(overall?.value).toBe("82/100")
    }
  })

  it("Componentes viram tabela com colunas [Componente, Papel, Concentração, Segurança]", () => {
    const c = buildContentFromProFormulation({ result })
    const table = c.blocks.find((b) => b.type === "table")
    expect(table).toBeTruthy()
    if (table && table.type === "table") {
      expect(table.headers).toContain("Componente")
      expect(table.headers).toContain("Papel")
      expect(table.headers).toContain("Concentração")
      expect(table.rows.length).toBe(2)
    }
  })

  it("Protocolo de preparação vira headings + parágrafos", () => {
    const c = buildContentFromProFormulation({ result })
    const stepHeadings = c.blocks.filter(
      (b) => b.type === "heading" && b.level === 3 && /Passo/.test(b.text),
    )
    expect(stepHeadings.length).toBe(2)
    // Passo 2 é ponto crítico
    const criticalHeading = stepHeadings.find((h) =>
      h.type === "heading" && /ponto crítico/.test(h.text),
    )
    expect(criticalHeading).toBeTruthy()
  })

  it("Warnings viram callouts", () => {
    const c = buildContentFromProFormulation({ result })
    const hasWarnCallout = c.blocks.some(
      (b) => b.type === "callout" && b.variant === "warning",
    )
    expect(hasWarnCallout).toBe(true)
  })

  it("Regulatório + normas + referências + alternativas todos aparecem", () => {
    const c = buildContentFromProFormulation({ result })
    const headings = c.blocks
      .filter((b) => b.type === "heading")
      .map((b) => (b as { text: string }).text)
    expect(headings.some((t) => /regulatóri/i.test(t))).toBe(true)
    expect(headings.some((t) => /Referências/i.test(t))).toBe(true)
    expect(headings.some((t) => /alternativas/i.test(t))).toBe(true)
  })

  it("PDF real do documento rico é gerado (>4KB)", () => {
    const c = buildContentFromProFormulation({ result })
    const blob = buildPdfBlob(c)
    expect(blob.size).toBeGreaterThan(4000)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.68.D · Adapter Bioink (escopo active/both/single)", () => {
  const drafts = [
    {
      tool: 0 as const, role: "structural", materialId: "gelma",
      concentration: 10, crosslinker: "LAP", crosslinkerConc: 0.25,
      hasCells: false, cellType: "", cellDensity: 0, additivesText: "",
    },
    {
      tool: 1 as const, role: "cellular", materialId: "collagen",
      concentration: 2, crosslinker: "Térmico 37°C", crosslinkerConc: 0,
      hasCells: true, cellType: "Condrócito", cellDensity: 2,
      additivesText: "HA 0.5%",
    },
  ]
  const materialsInfo = [
    { id: "gelma", label: "GelMA" },
    { id: "collagen", label: "Colágeno Tipo I" },
  ]
  const rheology = {
    shearRateS: 100, wallShearStressPa: 500, viscosityPas: 5,
    printabilityScore: 75, warnings: ["Cisalhamento alto"],
  }

  it('scope="active" produz UMA biotinta (com o material humanizado)', () => {
    const c = buildContentFromBioinkDrafts({
      drafts, materialsInfo, rheology, scope: "active", activeIdx: 0,
    })
    expect(c.title).toContain("T0")
    // Só uma biotinta → material label deve aparecer nos blocos
    const kv = c.blocks.find((b) => b.type === "keyvalue")
    expect(kv).toBeTruthy()
    if (kv && kv.type === "keyvalue") {
      const matPair = kv.pairs.find((p) => p.key === "Material principal")
      expect(matPair?.value).toBe("GelMA") // resolvido do materialsInfo
    }
  })

  it('scope="both" produz DUAS biotintas + callout de aviso sobre reologia', () => {
    const c = buildContentFromBioinkDrafts({
      drafts, materialsInfo, rheology, scope: "both",
    })
    expect(c.title).toContain("T0 + T1")
    // Deve ter callout info explicando que reologia é individual
    const info = c.blocks.find(
      (b) => b.type === "callout" && b.variant === "info",
    )
    expect(info).toBeTruthy()
  })

  it('scope="single" com singleIdx=1 produz só T1 (celular)', () => {
    const c = buildContentFromBioinkDrafts({
      drafts, materialsInfo, rheology, scope: "single", singleIdx: 1,
    })
    expect(c.title).toContain("T1")
    // Deve mostrar tipo celular e densidade
    const hasCellular = c.blocks.some(
      (b) =>
        b.type === "keyvalue" &&
        b.pairs.some((p) => p.key === "Tipo celular" && p.value === "Condrócito"),
    )
    expect(hasCellular).toBe(true)
  })

  it('scope="active" com rheology inclui bloco de reologia', () => {
    const c = buildContentFromBioinkDrafts({
      drafts, materialsInfo, rheology, scope: "active", activeIdx: 0,
    })
    const rheoHeading = c.blocks.find(
      (b) => b.type === "heading" && /Reologia/i.test((b as { text: string }).text),
    )
    expect(rheoHeading).toBeTruthy()
    // Warnings da reologia viram callouts
    const warnCallout = c.blocks.some(
      (b) => b.type === "callout" && b.variant === "warning",
    )
    expect(warnCallout).toBe(true)
  })

  it("source=Bioink e entryType=FORMULATION", () => {
    const c = buildContentFromBioinkDrafts({
      drafts, materialsInfo, rheology, scope: "active", activeIdx: 0,
    })
    expect(c.source).toBe("Bioink")
    expect(c.entryType).toBe("FORMULATION")
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.68.E · Adapter Chat IA (filtro all/assistant/user)", () => {
  const session = {
    id: "s1",
    title: "Consulta GelMA",
    mode: "formulation",
    createdAt: new Date("2026-08-04T10:00:00Z"),
  }
  const messages = [
    { role: "user" as const, content: "Qual concentração de GelMA para cartilagem?", createdAt: new Date() },
    { role: "assistant" as const, content: "Use **10% em PBS**.\n\nCódigo:\n```json\n{\"G\": 500}\n```", createdAt: new Date() },
    { role: "user" as const, content: "E para pele?", createdAt: new Date() },
    { role: "assistant" as const, content: "Para pele, 5-8% costuma funcionar bem.", createdAt: new Date() },
    { role: "system" as const, content: "Sistema — sempre ignorado", createdAt: new Date() },
  ]

  it("filter=all inclui todas as mensagens de user+assistant (não system)", () => {
    const c = buildContentFromChatSession({ session, messages, filter: "all" })
    // Cada mensagem gera ≥ 1 heading + N blocos → contamos os headings de mensagem
    const authorHeadings = c.blocks.filter(
      (b) =>
        b.type === "heading" &&
        b.level === 3 &&
        (/BIA/.test((b as { text: string }).text) || /Você/.test((b as { text: string }).text)),
    )
    expect(authorHeadings.length).toBe(4) // 2 user + 2 assistant
    expect(c.metadata?.messageCount).toBe(4)
  })

  it("filter=assistant inclui apenas respostas da IA", () => {
    const c = buildContentFromChatSession({ session, messages, filter: "assistant" })
    const authorHeadings = c.blocks.filter(
      (b) =>
        b.type === "heading" &&
        b.level === 3 &&
        /BIA/.test((b as { text: string }).text),
    )
    expect(authorHeadings.length).toBe(2)
    // Nenhum heading de "Você"
    const userHeadings = c.blocks.filter(
      (b) => b.type === "heading" && /Você/.test((b as { text: string }).text),
    )
    expect(userHeadings.length).toBe(0)
  })

  it("filter=user inclui apenas perguntas do usuário", () => {
    const c = buildContentFromChatSession({ session, messages, filter: "user" })
    const userHeadings = c.blocks.filter(
      (b) =>
        b.type === "heading" &&
        b.level === 3 &&
        /Você/.test((b as { text: string }).text),
    )
    expect(userHeadings.length).toBe(2)
    // Nenhum heading da BIA
    const biaHeadings = c.blocks.filter(
      (b) => b.type === "heading" && /BIA/.test((b as { text: string }).text),
    )
    expect(biaHeadings.length).toBe(0)
  })

  it("Blocos de código markdown viram CodeBlock (não texto puro)", () => {
    const c = buildContentFromChatSession({ session, messages, filter: "assistant" })
    const codeBlocks = c.blocks.filter((b) => b.type === "code")
    expect(codeBlocks.length).toBe(1)
    if (codeBlocks[0].type === "code") {
      expect(codeBlocks[0].language).toBe("json")
      expect(codeBlocks[0].content).toContain('"G": 500')
    }
  })

  it("Sistema é sempre filtrado (system nunca vai para o export)", () => {
    for (const f of ["all", "assistant", "user"] as ChatExportFilter[]) {
      const c = buildContentFromChatSession({ session, messages, filter: f })
      const hasSystem = c.blocks.some((b) =>
        b.type === "paragraph" && /Sistema — sempre ignorado/.test(b.text),
      )
      expect(hasSystem, `filter=${f} não deveria incluir mensagem system`).toBe(false)
    }
  })

  it("entryType=RESEARCH_LOG e metadata.chatSessionId preservado", () => {
    const c = buildContentFromChatSession({ session, messages, filter: "all" })
    expect(c.entryType).toBe("RESEARCH_LOG")
    expect(c.metadata?.chatSessionId).toBe("s1")
    expect(c.metadata?.filter).toBe("all")
  })

  it("Filtro vazio (sem mensagens do papel) gera callout informativo", () => {
    const c = buildContentFromChatSession({
      session,
      messages: [{ role: "user", content: "só perguntas" }],
      filter: "assistant",
    })
    const info = c.blocks.find(
      (b) => b.type === "callout" && b.variant === "info",
    )
    expect(info).toBeTruthy()
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.68.F · Pipeline page instalou ExportBar corretamente", () => {
  const src = readSrc("src/app/dashboard/pipeline/page.tsx")

  it("Importa ExportBar de @/components/notebook/ExportBar", () => {
    expect(src).toMatch(/import\s*\{\s*ExportBar\s*\}\s*from\s*["']@\/components\/notebook\/ExportBar["']/)
  })
  it("Importa buildContentFromPipeline do adapter", () => {
    expect(src).toMatch(/buildContentFromPipeline/)
  })
  it("Renderiza <ExportBar buildContent={...} onSaved={...} />", () => {
    expect(src).toMatch(/<ExportBar\b[\s\S]*?buildContent=\{[\s\S]*?\}[\s\S]*?onSaved=/)
  })
  it("Mantém estado notebookEntry para rastrear vínculo com Notebook", () => {
    expect(src).toMatch(/notebookEntry.*setNotebookEntry/)
  })
  it("ExportBar aparece DEPOIS de 'Próximos Passos' (mesma seção)", () => {
    const nextIdx = src.indexOf("Próximos Passos")
    const barIdx = src.indexOf("<ExportBar")
    expect(nextIdx).toBeGreaterThan(-1)
    expect(barIdx).toBeGreaterThan(-1)
    expect(barIdx).toBeGreaterThan(nextIdx)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.68.G · Formulator Pro instalou ExportBar E removeu handleSaveProtocol antigo", () => {
  const src = readSrc("src/app/dashboard/formulator-pro/page.tsx")

  it("Importa ExportBar + buildContentFromProFormulation", () => {
    expect(src).toMatch(/import\s*\{\s*ExportBar\s*\}\s*from\s*["']@\/components\/notebook\/ExportBar["']/)
    expect(src).toMatch(/buildContentFromProFormulation/)
  })

  it("REMOVEU o antigo handleSaveProtocol (R12.28 → deprecated no R12.68)", () => {
    expect(src).not.toMatch(/const\s+handleSaveProtocol\s*=/)
    expect(src).not.toMatch(/setSaveState\s*\(/)
    expect(src).not.toMatch(/fetch\(\s*["']\/api\/protocols\/save-formulation["']/)
  })

  it("REMOVEU o botão visual 'Salvar protocolo' antigo (FolderHeart)", () => {
    // "Salvar protocolo" (letra minúscula 'p') era o botão antigo — texto exato
    expect(src).not.toMatch(/>\s*Salvar protocolo\s*</)
    expect(src).not.toMatch(/FolderHeart/)
  })

  it("Renderiza <ExportBar> passando buildFormulatorContent", () => {
    expect(src).toMatch(/<ExportBar\b/)
    expect(src).toMatch(/buildFormulatorContent/)
  })

  it("Mantém estado notebookEntry", () => {
    expect(src).toMatch(/notebookEntry.*setNotebookEntry/)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.68.H · Bioink instalou ExportBar com dropdown de escopo (opção C)", () => {
  const src = readSrc("src/app/dashboard/bioprint/bioink/page.tsx")

  it("Importa ExportBar + buildContentFromBioinkDrafts", () => {
    expect(src).toMatch(/import\s*\{\s*ExportBar\s*\}\s*from\s*["']@\/components\/notebook\/ExportBar["']/)
    expect(src).toMatch(/buildContentFromBioinkDrafts/)
  })

  it("Tem dropdown de escopo com testId=bioink-export-scope", () => {
    expect(src).toContain("bioink-export-scope")
    // Deve ter as 4 opções: active, both, single-0, single-1
    for (const opt of ["active", "both", "single-0", "single-1"]) {
      expect(src, `opção "${opt}" ausente do dropdown`).toContain(`"${opt}"`)
    }
  })

  it("Dropdown só aparece quando drafts.length === 2 (uma só biotinta não precisa escolher)", () => {
    expect(src).toMatch(/drafts\.length\s*===\s*2/)
  })

  it("ExportBar aparece na tab 'formulate' (não em catalog nem em rheology)", () => {
    expect(src).toMatch(/tab\s*===\s*["']formulate["'][\s\S]*?<ExportBar/)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.68.I · Chat IA instalou ExportBar com filtro por autor (opção C)", () => {
  const src = readSrc("src/app/dashboard/chat/page.tsx")

  it("Importa ExportBar + buildContentFromChatSession + ChatExportFilter", () => {
    expect(src).toMatch(/import\s*\{\s*ExportBar\s*\}\s*from\s*["']@\/components\/notebook\/ExportBar["']/)
    expect(src).toMatch(/buildContentFromChatSession/)
    expect(src).toMatch(/ChatExportFilter/)
  })

  it("Tem dropdown de filtro com testId=chat-export-filter e 3 opções (all/assistant/user)", () => {
    expect(src).toContain("chat-export-filter")
    for (const opt of ["all", "assistant", "user"]) {
      expect(src, `opção "${opt}" ausente`).toContain(`"${opt}"`)
    }
  })

  it("ExportBar só aparece com sessão + mensagens (não em tela vazia)", () => {
    expect(src).toMatch(/currentSession\s*&&\s*messages\.length\s*>\s*0/)
  })

  it("Reset do vínculo notebook ao trocar sessão ou filtro", () => {
    expect(src).toMatch(/setChatNotebookEntry\s*\(\s*null\s*\)/)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.68.J · Script de migração Protocol → NotebookEntry é NÃO-DESTRUTIVO", () => {
  const scriptPath = "scripts/migrate-protocols-to-notebook.ts"
  const src = readSrc(scriptPath)

  it("O arquivo existe", () => {
    expect(fileExists(scriptPath)).toBe(true)
  })

  it("Suporta flag --dry-run para preview sem gravar", () => {
    expect(src).toMatch(/--dry-run/)
    expect(src).toMatch(/args\.dryRun/)
  })

  it("Suporta filtros --user-id e --protocol-id", () => {
    expect(src).toMatch(/--user-id=/)
    expect(src).toMatch(/--protocol-id=/)
  })

  it("Preserva Protocol original — NUNCA chama .delete() nele", () => {
    // Regex robusto: só falha se realmente deletar protocol
    expect(src).not.toMatch(/prisma\.protocol\.delete/i)
    expect(src).not.toMatch(/tx\.protocol\.delete/i)
    expect(src).not.toMatch(/protocol\.deleteMany/i)
  })

  it("É idempotente: pula se já existe NotebookEntry com __migratedFromProtocolId", () => {
    expect(src).toMatch(/__migratedFromProtocolId/)
    expect(src).toMatch(/summary\.skipped/)
  })

  it("Usa createInitialVersion do helper R12.66 (cria V1 automaticamente)", () => {
    expect(src).toMatch(/from\s+["']\.\.\/src\/lib\/notebook\/versioning["']/)
    expect(src).toMatch(/createInitialVersion/)
  })

  it("Grava metadata com __migratedFromProtocolId e __migratedAt para auditoria", () => {
    expect(src).toMatch(/__migratedFromProtocolId/)
    expect(src).toMatch(/__migratedAt/)
  })

  it("Categoria 'synthesis' vira entryType=FORMULATION; demais viram PROTOCOL", () => {
    expect(src).toMatch(/synthesis[\s\S]*?FORMULATION/)
    expect(src).toMatch(/PROTOCOL/)
  })

  it("Saída em JSON no stdout com {total, migrated, skipped, failed}", () => {
    expect(src).toMatch(/total:/)
    expect(src).toMatch(/migrated:/)
    expect(src).toMatch(/skipped:/)
    expect(src).toMatch(/failed:/)
    expect(src).toMatch(/JSON\.stringify\(summary/)
  })
})

// ─────────────────────────────────────────────────────────────────────
describe("R12.68.K · Sanidade global", () => {
  it("Nenhuma página R12.68 vaza secret hardcoded", () => {
    const pages = [
      "src/app/dashboard/pipeline/page.tsx",
      "src/app/dashboard/formulator-pro/page.tsx",
      "src/app/dashboard/bioprint/bioink/page.tsx",
      "src/app/dashboard/chat/page.tsx",
      "scripts/migrate-protocols-to-notebook.ts",
    ]
    for (const p of pages) {
      const src = readSrc(p)
      expect(src, `${p} não deve conter chaves API`).not.toMatch(/sk-[A-Za-z0-9]{20,}/)
      expect(src, `${p} não deve conter DATABASE_URL hardcoded`).not.toMatch(/postgres:\/\/[^"'`]+/)
    }
  })

  it("Nenhum adapter R12.68 usa fetch() (adapters são funções puras)", () => {
    for (const f of [
      "src/lib/export/adapters/pipeline-adapter.ts",
      "src/lib/export/adapters/formulator-pro-adapter.ts",
      "src/lib/export/adapters/bioink-adapter.ts",
      "src/lib/export/adapters/chat-adapter.ts",
    ]) {
      const src = readSrc(f)
      expect(src, `${f} adapter deveria ser função pura sem I/O`).not.toMatch(/\bfetch\(/)
    }
  })
})
