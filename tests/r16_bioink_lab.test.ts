import { describe, it, expect } from "vitest"
import {
  RECIPES, getRecipe, GOAL_LABELS, CELL_LABELS,
  evaluateRecipeWindow, wallShear_kPa,
  recommend, pickAlternatives, DEFAULT_EQUIPMENT, nearestNozzle,
  planBench, parseMixRatio, componentAmount, estimateVolume_mL,
  relevantTroubles, TROUBLES,
  protocolMarkdown, toBioinkPatch, slicerHint,
} from "@/lib/bioink-lab"
import type { Goal, CellTypeId } from "@/lib/bioink-lab"

describe("R16 · receitas", () => {
  it("tem ≥ 10 receitas com ids únicos e campos essenciais", () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(10) // R16: 10 · R24.5: 18
    const ids = new Set(RECIPES.map((r) => r.id))
    expect(ids.size).toBe(RECIPES.length)
    for (const r of RECIPES) {
      expect(r.components.length).toBeGreaterThan(0)
      expect(r.prep.length).toBeGreaterThan(0)
      expect(r.references.length).toBeGreaterThan(0)
      expect(r.goals.length).toBeGreaterThan(0)
      expect(r.startParams.nozzle_mm).toBeGreaterThan(0)
      expect(r.pipelineMaterialId).toBeTruthy()
      expect(r.rheology.powerLawN).toBeGreaterThan(0)
      expect(r.rheology.powerLawN).toBeLessThanOrEqual(1)
    }
  })
  it("todos os objetivos têm pelo menos uma receita e rótulo", () => {
    const goals = Object.keys(GOAL_LABELS) as Goal[]
    for (const g of goals) {
      expect(RECIPES.some((r) => r.goals.includes(g))).toBe(true)
    }
    for (const c of Object.keys(CELL_LABELS) as CellTypeId[]) {
      expect(RECIPES.some((r) => r.cellsOk.includes(c))).toBe(true)
    }
  })
  it("getRecipe", () => {
    expect(getRecipe("gelma_10_lap")?.crosslink).toBe("photo")
    expect(getRecipe("nope")).toBeUndefined()
  })
  it("receitas com células têm passo crítico e densidade > 0", () => {
    for (const r of RECIPES.filter((x) => !(x.cellsOk.length === 1 && x.cellsOk[0] === "none"))) {
      expect(r.cellDensity_Mml[1]).toBeGreaterThan(0)
      expect(r.prep.some((s) => s.critical)).toBe(true)
    }
  })
})

describe("R16 · janela de biofabricação", () => {
  it("shear cresce com agulha fina e velocidade alta", () => {
    const rh = getRecipe("alg_gel_starter")!.rheology
    const a = wallShear_kPa(rh, 0.41, 6)
    const b = wallShear_kPa(rh, 0.26, 6)
    const c = wallShear_kPa(rh, 0.41, 20)
    expect(b).toBeGreaterThan(a)
    expect(c).toBeGreaterThan(a)
  })
  it("starter alginato-gelatina fica dentro da janela com fibroblastos", () => {
    const w = evaluateRecipeWindow(getRecipe("alg_gel_starter")!, "fibroblast")
    expect(w.inWindow).toBe(true)
    expect(w.fidelity).toBeGreaterThan(50)
    expect(w.viability).toBeGreaterThan(65)
  })
  it("colágeno sem banho seria mole; com FRESH a fidelidade vem do banho", () => {
    const w = evaluateRecipeWindow(getRecipe("collagen_fresh")!, "cardiomyocyte")
    expect(w.fidelity).toBeGreaterThanOrEqual(78)
    expect(w.notes.some((n) => /banho/i.test(n))).toBe(true)
  })
  it("pluronic acelular → viabilidade 100 e alta fidelidade", () => {
    const w = evaluateRecipeWindow(getRecipe("pluronic_sacrificial")!, "none")
    expect(w.viability).toBe(100)
    expect(w.fidelity).toBeGreaterThan(70)
  })
  it("neurônios em alginato-CNF (gel rígido) saem da janela", () => {
    const w = evaluateRecipeWindow(getRecipe("alg_cnf_bone")!, "neuron", { nozzle_mm: 0.26, speed_mms: 15 })
    expect(w.inWindow).toBe(false)
    expect(["too_fast", "too_stiff"]).toContain(w.zone)
  })
})

describe("R16 · recomendador", () => {
  it("iniciante, pele, fibroblastos, sem luz → alginato-gelatina em 1º", () => {
    const recs = recommend({ goal: "skin", cell: "fibroblast", equipment: DEFAULT_EQUIPMENT, experience: "first" })
    expect(recs[0].recipe.id).toBe("alg_gel_starter")
    expect(recs[0].blockers.length).toBe(0)
    const gelma = recs.find((r) => r.recipe.id === "gelma_10_lap")!
    expect(gelma.blockers.some((b) => /luz/i.test(b))).toBe(true)
  })
  it("com luz 405 e experiência → GelMA sobe", () => {
    const recs = recommend({ goal: "cartilage", cell: "chondrocyte", equipment: { ...DEFAULT_EQUIPMENT, hasLight: true }, experience: "expert" })
    const top2 = recs.slice(0, 2).map((r) => r.recipe.id)
    expect(top2.some((id) => id.startsWith("gelma"))).toBe(true)
    expect(recs[0].blockers.length).toBe(0)
  })
  it("organoides sem cabeçote frio → Matrigel bloqueado", () => {
    const recs = recommend({ goal: "organoid", cell: "ipsc", equipment: { ...DEFAULT_EQUIPMENT, hasLight: true }, experience: "some" })
    const mg = recs.find((r) => r.recipe.id === "matrigel_organoid")!
    expect(mg.blockers.length).toBeGreaterThan(0)
  })
  it("vascular acelular → pluronic sacrificial é candidato sem bloqueio", () => {
    const recs = recommend({ goal: "vascular", cell: "none", equipment: DEFAULT_EQUIPMENT, experience: "some" })
    const pl = recs.find((r) => r.recipe.id === "pluronic_sacrificial")!
    expect(pl.blockers.length).toBe(0)
    expect(recs.indexOf(pl)).toBeLessThan(3)
  })
  it("alternativas excluem a primeira e bloqueadas", () => {
    const recs = recommend({ goal: "bone", cell: "osteoblast", equipment: { ...DEFAULT_EQUIPMENT, nozzle_mm: 0.6 }, experience: "some" })
    const alts = pickAlternatives(recs, 3)
    expect(alts.length).toBeLessThanOrEqual(3)
    expect(alts.every((a) => a.recipe.id !== recs[0].recipe.id && a.blockers.length === 0)).toBe(true)
  })
  it("nearestNozzle", () => {
    expect(nearestNozzle(0.4)).toBe(0.41)
    expect(nearestNozzle(0.25)).toBe(0.26)
  })
  it("agulha fina gera aviso de shear", () => {
    const recs = recommend({ goal: "learn", cell: "none", equipment: { ...DEFAULT_EQUIPMENT, nozzle_mm: 0.2 }, experience: "first" })
    expect(recs[0].warnings.some((w) => /fina/i.test(w)) || recs[0].reasons.length > 0).toBe(true)
  })
})

describe("R16 · calculadora de bancada", () => {
  it("parseMixRatio", () => {
    expect(parseMixRatio("10 partes biotinta : 1 parte suspensão celular (x)")).toBe(10)
    expect(parseMixRatio("sem células")).toBe(10)
  })
  it("componentAmount: %w/v → g; mg/mL → mg; mM → banho", () => {
    expect(componentAmount({ name: "x", amount: 3, unit: "%w/v", role: "polymer", why: "" }, 10).value).toBe("0.300 g")
    expect(componentAmount({ name: "x", amount: 0.25, unit: "%w/v", role: "photoinitiator", why: "" }, 10).value).toBe("25.0 mg")
    expect(componentAmount({ name: "x", amount: 20, unit: "mg/mL", role: "polymer", why: "" }, 2).value).toBe("40.0 mg")
    expect(componentAmount({ name: "x", amount: 100, unit: "mM", role: "crosslinker", why: "" }, 1).value).toMatch(/g em 10 mL/)
  })
  it("plano acelular: volume total ≥ impressão + morto, 1 seringa", () => {
    const r = getRecipe("alg_gel_starter")!
    const b = planBench({ recipe: r, printVolume_mL: 1.2, cellDensity_Mml: null })
    expect(b.syringes).toBe(1)
    expect(b.totalVolume_mL).toBeGreaterThanOrEqual(1.2 + 0.25)
    expect(b.cellSuspension_mL).toBe(0)
    expect(b.cellsNeeded_M).toBeNull()
    expect(b.lines.some((l) => /Alginato/.test(l.name))).toBe(true)
  })
  it("plano com células: divisão 10:1 e contagem de células", () => {
    const r = getRecipe("alg_gel_starter")!
    const b = planBench({ recipe: r, printVolume_mL: 2, cellDensity_Mml: 3 })
    expect(b.cellSuspension_mL).toBeCloseTo(b.totalVolume_mL / 11, 1)
    expect(b.cellsNeeded_M).toBeCloseTo(3 * b.totalVolume_mL, 1)
    expect(b.lines.some((l) => /Suspensão celular/.test(l.name))).toBe(true)
    expect(b.lines.some((l) => /conc\. final/.test(l.note ?? ""))).toBe(true)
  })
  it("volume grande → várias seringas", () => {
    const b = planBench({ recipe: getRecipe("pluronic_sacrificial")!, printVolume_mL: 7, cellDensity_Mml: null, syringe_mL: 3 })
    expect(b.syringes).toBeGreaterThanOrEqual(3)
  })
  it("estimateVolume_mL", () => {
    expect(estimateVolume_mL(10, 10, 2, 100)).toBeCloseTo(0.2, 2)
    expect(estimateVolume_mL(10, 10, 2, 20)).toBeCloseTo(0.07, 2)
  })
})

describe("R16 · troubleshooting + protocolo", () => {
  it("filtra por reticulação e células", () => {
    const acel = relevantTroubles("none", false)
    expect(acel.some((t) => t.id === "no_gel")).toBe(false)
    expect(acel.some((t) => t.id === "low_viability")).toBe(false)
    const cel = relevantTroubles("photo", true, true)
    expect(cel.some((t) => t.id === "no_gel")).toBe(true)
    expect(cel.some((t) => t.id === "clog_particles")).toBe(true)
    expect(TROUBLES.every((t) => t.fixes.length > 0 && t.likelyCauses.length > 0)).toBe(true)
  })
  it("protocolMarkdown contém seções e referências", () => {
    const r = getRecipe("gelma_10_lap")!
    const bench = planBench({ recipe: r, printVolume_mL: 1, cellDensity_Mml: 5 })
    const w = evaluateRecipeWindow(r, "msc")
    const md = protocolMarkdown({ recipe: r, cell: "msc", cellDensity_Mml: 5, bench, window: w, date: new Date("2026-10-21") })
    expect(md).toContain("# Protocolo de biotinta — GelMA 10 %")
    expect(md).toContain("## 1. Quantidades")
    expect(md).toContain("Incorporação das células")
    expect(md).toContain("doi.org/")
    expect(md).toContain("2026-10-21")
  })
  it("toBioinkPatch preenche formulations[0] e campos legados", () => {
    const p = toBioinkPatch(getRecipe("alg_gel_starter")!, "fibroblast", 2)
    expect(p.status).toBe("ready")
    expect(p.formulations.length).toBe(1)
    expect(p.formulations[0].materialId).toBe("alginate")
    expect(p.materialId).toBe("alginate")
    expect(p.cellType).toBe("Fibroblast")
    expect(p.cellDensityMillionMl).toBe(2)
    expect(p.formulations[0].role).toBe("cellular")
    expect(p.rheology.flowIndex).toBeLessThan(1)
    expect(p.rheology.consistencyK).toBeGreaterThan(0)
    expect(p.additives.length).toBe(0)
  })
  it("toBioinkPatch sacrificial/acelular", () => {
    const p = toBioinkPatch(getRecipe("pluronic_sacrificial")!, "none", null)
    expect(p.formulations[0].role).toBe("sacrificial")
    expect(p.cellType).toBe("")
    const q = toBioinkPatch(getRecipe("alg_cnf_bone")!, "none", null)
    expect(q.formulations[0].role).toBe("structural")
    expect(q.additives.length).toBeGreaterThan(0)
  })
  it("slicerHint menciona material e agulha (para o intent parser)", () => {
    const h = slicerHint(getRecipe("gelma_10_lap")!, "msc", "Cartilagem")
    expect(h).toMatch(/gelma/i)
    expect(h).toMatch(/0\.41 mm/)
    expect(h).toMatch(/msc/i)
  })
})
