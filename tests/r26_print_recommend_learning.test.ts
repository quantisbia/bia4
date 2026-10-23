import { describe, it, expect, beforeEach } from "vitest"
import {
  recommendPrintParams, describeRecommendation, applicationFromText, SLICER_RECIPE_KEY,
} from "@/lib/bioprint/print-recommend"
import {
  recordLearning, listLearning, suggestFromLearning, learningStats, clearLearning, normalizeMaterial, LEARNING_KEY,
} from "@/lib/bioprint/learning-table"

// localStorage mínimo para Node (learning-table usa `localStorage` global + checa `window`)
class MemStorage {
  private m = new Map<string, string>()
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
  clear() { this.m.clear() }
}

describe("R26 · applicationFromText", () => {
  it("mapeia tecidos pt-BR/en para a aplicação", () => {
    expect(applicationFromText("Cartilagem (menisco)")).toBe("cartilage")
    expect(applicationFromText("pele / derme")).toBe("skin")
    expect(applicationFromText("Osso alveolar")).toBe("bone")
    expect(applicationFromText("vaso sanguíneo")).toBe("vascular")
    expect(applicationFromText("teste de imprimibilidade")).toBe("calibration")
    expect(applicationFromText(undefined)).toBe("generic")
    expect(applicationFromText("")).toBe("generic")
  })
})

describe("R26 · recommendPrintParams", () => {
  it("hidrogel mole (alginato/gelatina) → fator ≥ 1.5, seringa 3 mL, pré-carga > 0, skirt off", () => {
    const r = recommendPrintParams({ material: "Alginato 3% + Gelatina 7%", viscosity_PaS: 20, hasCells: true, application: "cartilage" })
    // alginato + gelatina é pseudoplástico (shear-thinning); alginato puro é hidrogel mole
    expect(r.bioinkClass).toBe("shear_thinning")
    expect(r.extrusion.flowMultiplier).toBeGreaterThanOrEqual(1.3)
    expect(recommendPrintParams({ material: "Alginato 3%" }).bioinkClass).toBe("soft_hydrogel")
    expect(recommendPrintParams({ material: "Alginato 3%" }).extrusion.flowMultiplier).toBeGreaterThanOrEqual(1.5)
    expect(r.syringe.volume_mL).toBe(3)
    expect(r.extrusion.startPrime_uL).toBeGreaterThan(0)
    expect(r.params.skirtLoops).toBe(0)
    expect(r.params.hasCells).toBe(true)
    // camada entre 70 e 90 % da agulha
    const ratio = r.params.layerHeight_mm / r.params.nozzleDiameter_mm
    expect(ratio).toBeGreaterThanOrEqual(0.7)
    expect(ratio).toBeLessThanOrEqual(0.9)
    // cartilagem: concêntrico, 60 %, 2 paredes
    expect(r.params.infillPattern).toBe("concentric")
    expect(r.params.infillDensity).toBe(60)
    expect(r.params.wallCount).toBe(2)
    // com células: agulha ≥ 22G (≥ 0.41 mm)
    expect(r.nozzle_mm).toBeGreaterThanOrEqual(0.41)
  })

  it("pasta (HAp/cerâmica) → 18G, 10 mL, fator menor", () => {
    const r = recommendPrintParams({ material: "Pasta de hidroxiapatita", bioinkClass: "paste", application: "bone" })
    expect(r.nozzle_mm).toBe(0.84)
    expect(r.syringe.volume_mL).toBe(10)
    expect(r.extrusion.flowMultiplier).toBeLessThan(1.5)
    expect(r.params.infillPattern).toBe("grid")
    expect(r.params.speedPerimeter_mms).toBeLessThanOrEqual(12)
  })

  it("respeita a agulha definida pelo usuário e avisa viscosidade alta em agulha fina", () => {
    const r = recommendPrintParams({ material: "GelMA 10%", nozzle_mm: 0.26, viscosity_PaS: 500 })
    expect(r.nozzle_mm).toBe(0.26)
    expect(r.why.nozzle).toMatch(/definida por você/i)
    expect(r.cautions.length).toBeGreaterThan(0)
  })

  it("gelatina/GelMA sugere cartucho ~24 °C e mesa fria", () => {
    const r = recommendPrintParams({ material: "GelMA 7 %" })
    expect(r.params.cartridgeTemp_C).toBe(24)
    expect(r.params.bedTemp_C).toBe(10)
  })

  it("velocidades ficam numa faixa segura (3–15 mm/s) para todas as classes", () => {
    for (const material of ["alginato 2%", "gelma 5%", "pasta HAp", "pluronic f127", "colágeno FRESH banho"]) {
      const r = recommendPrintParams({ material })
      expect(r.params.speedPerimeter_mms).toBeGreaterThanOrEqual(3)
      expect(r.params.speedPerimeter_mms).toBeLessThanOrEqual(15)
      expect(r.params.speedFirstLayer_mms).toBeLessThanOrEqual(r.params.speedPerimeter_mms)
    }
  })

  it("describeRecommendation cobre os parâmetros essenciais com justificativa", () => {
    const rows = describeRecommendation(recommendPrintParams({ material: "Alginato 3%" }))
    const keys = rows.map((r) => r.k)
    for (const k of ["Agulha", "Seringa", "Altura de camada", "Velocidade", "Fator de extrusão", "Retração / prime", "Preenchimento", "Paredes", "Skirt", "Pré-carga (START)"]) {
      expect(keys).toContain(k)
    }
    expect(rows.every((r) => r.why.length > 10)).toBe(true)
    expect(SLICER_RECIPE_KEY).toBe("bia:slicer-recipe")
  })
})

describe("R26 · learning-table", () => {
  beforeEach(() => {
    const g = globalThis as unknown as { window?: object; localStorage?: MemStorage; fetch?: unknown }
    const ls = new MemStorage()
    g.window = { localStorage: ls }
    g.localStorage = ls
    g.fetch = async () => ({ ok: false, json: async () => ({}) })
    clearLearning()
  })

  const base = {
    material: "Alginato 3 % + Gelatina 7 %", application: "cartilage" as const, geometryId: "meniscus",
    params: { nozzle_mm: 0.41, layerHeight_mm: 0.33, speed_mms: 8, flowFactor: 1.5, flowPercentM221: 100, infillPattern: "concentric", infillDensity: 60, wallCount: 2, syringe_mL: 3 },
    text: "",
  }

  it("normalizeMaterial remove % e vírgulas", () => {
    expect(normalizeMaterial("Alginato 3 %, Gelatina 7 %")).toBe("alginato 3 gelatina 7")
  })

  it("sem histórico → nota explicando literatura", () => {
    const s = suggestFromLearning({ material: "alginato" })
    expect(s.samples).toBe(0)
    expect(s.notes[0]).toMatch(/literatura/i)
  })

  it("'não fluiu' acrescenta ajustes de fluxo e vira sugestão pendente", () => {
    const row = recordLearning({ ...base, flowed: false, rating: 1 })
    expect(row.symptoms).toContain("biotinta não fluiu")
    expect(row.adjustments.some((a) => a.target === "flowMultiplier" && a.op === "mul" && a.value === 1.25)).toBe(true)
    expect(row.effectiveFactor).toBe(1.5)
    expect(listLearning()).toHaveLength(1)
    expect(localStorage.getItem(LEARNING_KEY)).toBeTruthy()

    const s = suggestFromLearning({ material: base.material, application: "cartilage" })
    expect(s.samples).toBe(1)
    expect(s.gold).toBe(0)
    expect(s.adjustments.length).toBeGreaterThan(0)
    expect(s.flowFactorThatWorked).toBeUndefined()
  })

  it("impressões boas (nota ≥ 4 e fluiu) → mediana dos parâmetros + fator que funcionou", () => {
    recordLearning({ ...base, flowed: true, rating: 4, params: { ...base.params, flowFactor: 1.8, flowPercentM221: 120, speed_mms: 6 } })
    recordLearning({ ...base, flowed: true, rating: 5, params: { ...base.params, flowFactor: 1.8, flowPercentM221: 110, speed_mms: 7 } })
    recordLearning({ ...base, flowed: true, rating: 5, params: { ...base.params, flowFactor: 1.9, flowPercentM221: 100, speed_mms: 8 } })
    const s = suggestFromLearning({ material: base.material, geometryId: "meniscus" })
    expect(s.samples).toBe(3)
    expect(s.gold).toBe(3)
    expect(s.params?.flowFactor).toBe(1.8)
    expect(s.params?.speed_mms).toBe(7)
    // efetivos: 2.16, 1.98, 1.9 → mediana 1.98
    expect(s.flowFactorThatWorked).toBeCloseTo(1.98, 2)
    expect(s.adjustments).toHaveLength(0)
  })

  it("uma impressão ruim DEPOIS das boas reativa os ajustes", () => {
    recordLearning({ ...base, flowed: true, rating: 5 })
    const bad = recordLearning({ ...base, flowed: true, rating: 2, text: "cordão achatado e espalhou muito" })
    // garante ordem temporal
    expect(bad.createdAt).toBeGreaterThanOrEqual(listLearning().at(-1)!.createdAt)
    const s = suggestFromLearning({ material: base.material })
    expect(s.gold).toBe(1)
    expect(s.adjustments.length).toBeGreaterThan(0)
  })

  it("learningStats agrupa por material com taxa de fluxo e nota média", () => {
    recordLearning({ ...base, flowed: true, rating: 4 })
    recordLearning({ ...base, flowed: false, rating: 1 })
    recordLearning({ ...base, material: "GelMA 7%", application: "skin", flowed: true, rating: 5 })
    const st = learningStats()
    expect(st).toHaveLength(2)
    const alg = st.find((s) => s.material.startsWith("Alginato"))!
    expect(alg.n).toBe(2)
    expect(alg.flowRate).toBe(50)
    expect(alg.avgRating).toBe(2.5)
    expect(alg.bestFactor).toBe(1.5)
  })
})
