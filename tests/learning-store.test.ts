/**
 * Testes do learning-store (R12.54).
 *
 * Cobre:
 *   1. save / list / clear funcionam com localStorage simulado
 *   2. getCombinationStats agrega corretamente
 *   3. recommendParams aplica a lógica certa em cada cenário:
 *      a) sem histórico → no_history
 *      b) tem excelente → from_excellent
 *      c) só aceitável → from_acceptable
 *      d) só ruim → adjusted_from_bad
 *   4. buildAdjustmentsFromIssues mapeia issues → ajustes corretos
 *   5. applyAdjustments aplica deltas e sets sem mutar o base
 *
 * Setup: usa fake localStorage via globalThis.window.
 */

import { describe, it, expect, beforeEach } from "vitest"
import {
  savePrintResult,
  listAllResults,
  listResultsForCombination,
  clearAllResults,
  getCombinationStats,
  recommendParams,
  buildAdjustmentsFromIssues,
  applyAdjustments,
  generateResultId,
  type PrintResult,
  type PrintIssue,
} from "@/lib/bioprint/learning-store"
import type { PresetParams } from "@/lib/bioprint/tissue-presets"

// ─── Fake localStorage no globalThis pra Node ──────────────────────────

class FakeStorage {
  private store = new Map<string, string>()
  getItem(key: string): string | null { return this.store.get(key) ?? null }
  setItem(key: string, value: string): void { this.store.set(key, value) }
  removeItem(key: string): void { this.store.delete(key) }
  clear(): void { this.store.clear() }
}

// Garante que window/localStorage existem no escopo dos testes
function setupFakeStorage() {
  const fake = new FakeStorage()
  // @ts-expect-error - injeção de mock no globalThis
  globalThis.window = { localStorage: fake }
}

const BASE_PARAMS: PresetParams = {
  layerHeightMm: 0.2,
  printSpeedMmS: 8,
  pressureKPa: 50,
  flowPercent: 50,
  infillPercent: 0,
  infillPatternId: "classic-lines",
  walls: 2,
  skirtLoops: 2,
  retractionMm: 0,
  cartridgeTempC: 22,
  bedTempC: 4,
  chamberTempC: null,
  perimeterOnly: true,
}

beforeEach(async () => {
  setupFakeStorage()
  await clearAllResults()
})

describe("R12.54: learning-store — operações básicas", () => {
  it("save + list devolve o resultado gravado", async () => {
    const result = await savePrintResult({
      tissueId: "membrana",
      bioinkId: "alginate",
      geometryId: "membrane_thin",
      params: BASE_PARAMS,
      quality: "excelente",
      issues: ["forma_ok_otima"],
      notes: "primeira impressão da Janaina",
    })
    expect(result.id).toMatch(/^pr_/)
    expect(result.createdAt).toBeGreaterThan(0)
    const all = await listAllResults()
    expect(all.length).toBe(1)
    expect(all[0].tissueId).toBe("membrana")
    expect(all[0].bioinkId).toBe("alginate")
  })

  it("listResultsForCombination filtra corretamente", async () => {
    await savePrintResult({
      tissueId: "membrana", bioinkId: "alginate", geometryId: "g1",
      params: BASE_PARAMS, quality: "excelente", issues: [], notes: "",
    })
    await savePrintResult({
      tissueId: "vaso", bioinkId: "alginate", geometryId: "g2",
      params: BASE_PARAMS, quality: "ruim", issues: ["colapso"], notes: "",
    })
    await savePrintResult({
      tissueId: "membrana", bioinkId: "gelma", geometryId: "g3",
      params: BASE_PARAMS, quality: "aceitavel", issues: [], notes: "",
    })

    const mAlg = await listResultsForCombination("membrana", "alginate")
    expect(mAlg.length).toBe(1)
    expect(mAlg[0].quality).toBe("excelente")

    const mGelma = await listResultsForCombination("membrana", "gelma")
    expect(mGelma.length).toBe(1)
    expect(mGelma[0].quality).toBe("aceitavel")
  })

  it("clearAllResults limpa tudo", async () => {
    await savePrintResult({
      tissueId: "vaso", bioinkId: "alginate", geometryId: "g",
      params: BASE_PARAMS, quality: "excelente", issues: [], notes: "",
    })
    expect((await listAllResults()).length).toBe(1)
    await clearAllResults()
    expect((await listAllResults()).length).toBe(0)
  })

  it("generateResultId gera IDs únicos", () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) ids.add(generateResultId())
    expect(ids.size).toBe(100)
  })
})

describe("R12.54: getCombinationStats", () => {
  it("retorna stats zeradas quando não há resultados", async () => {
    const stats = await getCombinationStats("nervo", "gelma")
    expect(stats.total).toBe(0)
    expect(stats.excelente).toBe(0)
    expect(stats.aceitavel).toBe(0)
    expect(stats.ruim).toBe(0)
    expect(stats.topIssues).toEqual([])
  })

  it("agrega corretamente quando há mix de qualidades", async () => {
    await savePrintResult({ tissueId: "musculo", bioinkId: "alg_gel_standard", geometryId: "g", params: BASE_PARAMS, quality: "excelente", issues: ["forma_ok_otima"], notes: "" })
    await savePrintResult({ tissueId: "musculo", bioinkId: "alg_gel_standard", geometryId: "g", params: BASE_PARAMS, quality: "excelente", issues: [], notes: "" })
    await savePrintResult({ tissueId: "musculo", bioinkId: "alg_gel_standard", geometryId: "g", params: BASE_PARAMS, quality: "aceitavel", issues: ["subextrusao"], notes: "" })
    await savePrintResult({ tissueId: "musculo", bioinkId: "alg_gel_standard", geometryId: "g", params: BASE_PARAMS, quality: "ruim", issues: ["colapso", "subextrusao", "subextrusao"], notes: "" })

    const stats = await getCombinationStats("musculo", "alg_gel_standard")
    expect(stats.total).toBe(4)
    expect(stats.excelente).toBe(2)
    expect(stats.aceitavel).toBe(1)
    expect(stats.ruim).toBe(1)
    // topIssues ordenado por frequência — subextrusao aparece 3x, colapso 1x, forma_ok_otima 1x
    expect(stats.topIssues[0].issue).toBe("subextrusao")
    expect(stats.topIssues[0].count).toBe(3)
  })

  it("isola combinações diferentes", async () => {
    await savePrintResult({ tissueId: "membrana", bioinkId: "alginate", geometryId: "g", params: BASE_PARAMS, quality: "excelente", issues: [], notes: "" })
    await savePrintResult({ tissueId: "vaso", bioinkId: "alginate", geometryId: "g", params: BASE_PARAMS, quality: "ruim", issues: ["colapso"], notes: "" })

    const m = await getCombinationStats("membrana", "alginate")
    expect(m.excelente).toBe(1)
    expect(m.ruim).toBe(0)

    const v = await getCombinationStats("vaso", "alginate")
    expect(v.excelente).toBe(0)
    expect(v.ruim).toBe(1)
  })
})

describe("R12.54: recommendParams — adaptação inteligente", () => {
  it("sem histórico → mode=no_history, params=null", async () => {
    const rec = await recommendParams("membrana", "alginate", BASE_PARAMS)
    expect(rec.mode).toBe("no_history")
    expect(rec.params).toBeNull()
    expect(rec.message).toContain("Primeira impressão")
  })

  it("com 1 excelente → mode=from_excellent + params do excelente", async () => {
    const customParams: PresetParams = { ...BASE_PARAMS, printSpeedMmS: 12, flowPercent: 55 }
    await savePrintResult({
      tissueId: "membrana", bioinkId: "alginate", geometryId: "g",
      params: customParams, quality: "excelente", issues: ["forma_ok_otima"], notes: "deu muito certo",
    })

    const rec = await recommendParams("membrana", "alginate", BASE_PARAMS)
    expect(rec.mode).toBe("from_excellent")
    expect(rec.params).toEqual(customParams)
    expect(rec.message).toContain("EXCELENTE")
  })

  it("com vários excelentes → usa o MAIS RECENTE", async () => {
    const old: PresetParams = { ...BASE_PARAMS, printSpeedMmS: 6 }
    const newer: PresetParams = { ...BASE_PARAMS, printSpeedMmS: 9 }

    await savePrintResult({
      tissueId: "vaso", bioinkId: "alginate", geometryId: "g",
      params: old, quality: "excelente", issues: [], notes: "antigo",
      // @ts-expect-error - injetando timestamp manualmente
      createdAt: 1000,
    })
    await savePrintResult({
      tissueId: "vaso", bioinkId: "alginate", geometryId: "g",
      params: newer, quality: "excelente", issues: [], notes: "novo",
      // @ts-expect-error - injetando timestamp manualmente
      createdAt: 2000,
    })

    const rec = await recommendParams("vaso", "alginate", BASE_PARAMS)
    expect(rec.mode).toBe("from_excellent")
    expect(rec.params?.printSpeedMmS).toBe(9) // o mais recente
  })

  it("só aceitável → mode=from_acceptable", async () => {
    const customParams: PresetParams = { ...BASE_PARAMS, flowPercent: 60 }
    await savePrintResult({
      tissueId: "nervo", bioinkId: "gelma", geometryId: "g",
      params: customParams, quality: "aceitavel", issues: ["subextrusao"], notes: "",
    })

    const rec = await recommendParams("nervo", "gelma", BASE_PARAMS)
    expect(rec.mode).toBe("from_acceptable")
    expect(rec.params).toEqual(customParams)
  })

  it("só ruim com subextrusao → mode=adjusted_from_bad + flow +10", async () => {
    await savePrintResult({
      tissueId: "musculo", bioinkId: "alg_gel_standard", geometryId: "g",
      params: BASE_PARAMS, quality: "ruim", issues: ["subextrusao"], notes: "",
    })

    const rec = await recommendParams("musculo", "alg_gel_standard", BASE_PARAMS)
    expect(rec.mode).toBe("adjusted_from_bad")
    expect(rec.adjustments).toBeDefined()
    expect(rec.adjustments?.[0].param).toBe("flowPercent")
    expect(rec.adjustments?.[0].value).toBe(10)
    expect(rec.params?.flowPercent).toBe(BASE_PARAMS.flowPercent + 10)
  })

  it("só ruim com colapso → mode=adjusted_from_bad + walls +1", async () => {
    await savePrintResult({
      tissueId: "vaso", bioinkId: "col_fibrin_vascular", geometryId: "g",
      params: BASE_PARAMS, quality: "ruim", issues: ["colapso"], notes: "",
    })

    const rec = await recommendParams("vaso", "col_fibrin_vascular", BASE_PARAMS)
    expect(rec.mode).toBe("adjusted_from_bad")
    expect(rec.adjustments?.[0].param).toBe("walls")
    expect(rec.params?.walls).toBe(BASE_PARAMS.walls + 1)
  })

  it("excelente tem prioridade sobre ruim", async () => {
    await savePrintResult({
      tissueId: "membrana", bioinkId: "alginate", geometryId: "g",
      params: BASE_PARAMS, quality: "ruim", issues: ["colapso"], notes: "antigo ruim",
    })
    const goodParams: PresetParams = { ...BASE_PARAMS, layerHeightMm: 0.1 }
    await savePrintResult({
      tissueId: "membrana", bioinkId: "alginate", geometryId: "g",
      params: goodParams, quality: "excelente", issues: ["forma_ok_otima"], notes: "consegui!",
    })

    const rec = await recommendParams("membrana", "alginate", BASE_PARAMS)
    expect(rec.mode).toBe("from_excellent")
    expect(rec.params?.layerHeightMm).toBe(0.1)
  })
})

describe("R12.54: buildAdjustmentsFromIssues", () => {
  it("subextrusao → flow +10", () => {
    const adj = buildAdjustmentsFromIssues([{ issue: "subextrusao", count: 1 }])
    expect(adj.length).toBe(1)
    expect(adj[0].param).toBe("flowPercent")
    expect(adj[0].value).toBe(10)
  })

  it("superextrusao → flow -10", () => {
    const adj = buildAdjustmentsFromIssues([{ issue: "superextrusao", count: 1 }])
    expect(adj.length).toBe(1)
    expect(adj[0].param).toBe("flowPercent")
    expect(adj[0].value).toBe(-10)
  })

  it("mapeia colapso → walls +1", () => {
    const adj = buildAdjustmentsFromIssues([{ issue: "colapso", count: 1 }])
    expect(adj[0].param).toBe("walls")
    expect(adj[0].value).toBe(1)
  })

  it("limita a 2 ajustes mesmo com mais issues", () => {
    const issues: Array<{ issue: PrintIssue; count: number }> = [
      { issue: "subextrusao", count: 5 },
      { issue: "colapso", count: 4 },
      { issue: "ma_aderencia", count: 3 },
      { issue: "desidratacao", count: 2 },
    ]
    const adj = buildAdjustmentsFromIssues(issues)
    expect(adj.length).toBe(2)
    // Pega os 2 mais frequentes (já vêm ordenados)
    expect(adj[0].param).toBe("flowPercent")
    expect(adj[1].param).toBe("walls")
  })

  it("forma_ok_otima NÃO gera ajuste", () => {
    const adj = buildAdjustmentsFromIssues([{ issue: "forma_ok_otima", count: 5 }])
    expect(adj.length).toBe(0)
  })

  it("array vazio → ajustes vazios", () => {
    expect(buildAdjustmentsFromIssues([])).toEqual([])
  })
})

describe("R12.54: applyAdjustments", () => {
  it("delta numérico soma corretamente", () => {
    const out = applyAdjustments(BASE_PARAMS, [
      { param: "flowPercent", op: "delta", value: 15, reason: "" },
    ])
    expect(out.flowPercent).toBe(BASE_PARAMS.flowPercent + 15)
  })

  it("delta negativo subtrai", () => {
    const out = applyAdjustments(BASE_PARAMS, [
      { param: "printSpeedMmS", op: "delta", value: -3, reason: "" },
    ])
    expect(out.printSpeedMmS).toBe(BASE_PARAMS.printSpeedMmS - 3)
  })

  it("set substitui valor", () => {
    const out = applyAdjustments(BASE_PARAMS, [
      { param: "infillPatternId", op: "set", value: "parallel-lines", reason: "" },
    ])
    expect(out.infillPatternId).toBe("parallel-lines")
  })

  it("múltiplos ajustes aplicados em sequência", () => {
    const out = applyAdjustments(BASE_PARAMS, [
      { param: "flowPercent", op: "delta", value: 10, reason: "" },
      { param: "walls", op: "delta", value: 1, reason: "" },
      { param: "skirtLoops", op: "set", value: 5, reason: "" },
    ])
    expect(out.flowPercent).toBe(BASE_PARAMS.flowPercent + 10)
    expect(out.walls).toBe(BASE_PARAMS.walls + 1)
    expect(out.skirtLoops).toBe(5)
  })

  it("NÃO muta o objeto base (imutabilidade)", () => {
    const original = { ...BASE_PARAMS }
    applyAdjustments(BASE_PARAMS, [
      { param: "flowPercent", op: "delta", value: 99, reason: "" },
    ])
    expect(BASE_PARAMS).toEqual(original)
  })
})

describe("R12.54: PrintResult schema completo", () => {
  it("preserva todos os campos no roundtrip save → list", async () => {
    const input = {
      tissueId: "membrana" as const,
      bioinkId: "alginate" as const,
      geometryId: "membrane_thin",
      params: BASE_PARAMS,
      quality: "excelente" as const,
      issues: ["forma_ok_otima"] as PrintIssue[],
      notes: "perfeito",
    }
    const saved = await savePrintResult(input)
    const all = await listAllResults()
    const found = all.find((r) => r.id === saved.id)
    expect(found).toBeDefined()
    expect(found?.tissueId).toBe(input.tissueId)
    expect(found?.bioinkId).toBe(input.bioinkId)
    expect(found?.geometryId).toBe(input.geometryId)
    expect(found?.params).toEqual(input.params)
    expect(found?.quality).toBe(input.quality)
    expect(found?.issues).toEqual(input.issues)
    expect(found?.notes).toBe(input.notes)
    expect(typeof found?.createdAt).toBe("number")
    expect(typeof found?.id).toBe("string")
  })
})

interface SavedResultWithCustomTimestamp extends PrintResult {
  createdAt: number
}

// Helper para checar TS — não vai pra runtime
const _typeCheck: SavedResultWithCustomTimestamp | null = null
void _typeCheck
