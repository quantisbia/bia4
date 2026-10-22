/**
 * R23 — Laço fechado: nota 1–5 + relato em pt-BR → ajustes no próximo G-code.
 * Cenários do mandato: nota 3 "saiu muito volume de biotinta" → menos fluxo;
 * nota 2 "começou a imprimir longe do ponto zero" → reforço do início.
 */
import { describe, it, expect, beforeEach } from "vitest"
import { interpretFeedback, applyLearned, saveFeedback, pendingAdjustments, markConsumed, clearFeedback, listFeedback } from "@/lib/bioprint/print-feedback"
import { BASIC_PROFILES } from "@/lib/slicer/profiles"
import { sliceMesh } from "@/lib/slicer/slice"
import { boxMesh } from "@/lib/slicer/primitives"

// localStorage mínimo para o ambiente de teste
const mem = new Map<string, string>()
beforeEach(() => {
  mem.clear()
  globalThis.localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v) }, removeItem: (k: string) => { mem.delete(k) },
    clear: () => mem.clear(), key: () => null, length: 0,
  } as unknown as Storage
})

describe("R23 · interpretação do relato", () => {
  it("nota 3 + 'saiu muito volume de biotinta' → fluxo ×0.9", () => {
    const r = interpretFeedback(3, "saiu muito volume de biotinta")
    expect(r.symptoms).toContain("excesso de biotinta (superextrusão)")
    const f = r.adjustments.find((a) => a.target === "flowMultiplier")!
    expect(f.op).toBe("mul"); expect(f.value).toBeCloseTo(0.9, 6)
  })
  it("nota 1 + superextrusão → fluxo ×0.7 e velocidade +15 %", () => {
    const r = interpretFeedback(1, "borrou tudo, excesso de material")
    expect(r.adjustments.find((a) => a.target === "flowMultiplier")!.value).toBeCloseTo(0.7, 6)
    expect(r.adjustments.find((a) => a.target === "speedPerimeter_mms")!.value).toBeCloseTo(1.15, 6)
  })
  it("nota 2 + 'começou a imprimir longe do ponto zero' → originCheck + skirt 0", () => {
    const r = interpretFeedback(2, "começou a imprimir longe do ponto zero")
    expect(r.symptoms).toContain("início fora do ponto zero")
    expect(r.adjustments.some((a) => a.target === "originCheck")).toBe(true)
    expect(r.adjustments.find((a) => a.target === "skirtLoops")!.value).toBe(0)
  })
  it("'não saiu biotinta' → fluxo ↑ e prime ↑", () => {
    const r = interpretFeedback(2, "não saiu biotinta no começo, cordão falhando")
    expect(r.adjustments.find((a) => a.target === "flowMultiplier")!.value).toBeCloseTo(1.3, 6)
    expect(r.adjustments.find((a) => a.target === "primeVolume_uL")!.value).toBe(2)
  })
  it("nota 4/5 → nenhum ajuste (repetir igual)", () => {
    expect(interpretFeedback(5, "perfeito").adjustments).toEqual([])
    expect(interpretFeedback(4, "saiu muito volume").adjustments).toEqual([])
  })
  it("nota 2 sem sintoma reconhecido → ajuste conservador (velocidade −10 %)", () => {
    const r = interpretFeedback(2, "não gostei")
    expect(r.symptoms).toEqual(["não especificado"])
    expect(r.adjustments[0].target).toBe("speedPerimeter_mms")
  })
  it("colapso → camada menor, velocidade menor, +1 parede (nota 2)", () => {
    const r = interpretFeedback(2, "a peça desmoronou no meio")
    expect(r.adjustments.map((a) => a.target)).toEqual(expect.arrayContaining(["layerHeight_mm", "speedPerimeter_mms", "wallCount"]))
  })
})

describe("R23 · aplicação sobre o BioSlicer", () => {
  it("applyLearned reduz flowMultiplier e gera notas ; APRENDIDO", () => {
    const prof = BASIC_PROFILES[0]
    const { adjustments } = interpretFeedback(3, "saiu muito volume de biotinta")
    const { out, notes } = applyLearned({ params: prof.params, extrusion: prof.extrusion }, adjustments)
    expect(out.extrusion.flowMultiplier).toBeCloseTo(prof.extrusion.flowMultiplier * 0.9, 2)
    expect(out.params.speedPerimeter_mms).toBe(prof.params.speedPerimeter_mms)
    expect(notes[0]).toMatch(/^; APRENDIDO \(excesso de biotinta/)
  })
  it("G-code gerado com ajuste tem menos E total do que sem ajuste", () => {
    const prof = BASIC_PROFILES[0]
    const mesh = boxMesh(10, 10, 1)
    const base = sliceMesh({ mesh, params: { ...prof.params }, extrusion: { ...prof.extrusion }, profileId: prof.id, profileName: prof.name })
    const { adjustments } = interpretFeedback(3, "saiu muito volume de biotinta")
    const { out } = applyLearned({ params: { ...prof.params }, extrusion: { ...prof.extrusion } }, adjustments)
    const less = sliceMesh({ mesh, params: out.params, extrusion: out.extrusion, profileId: prof.id, profileName: prof.name })
    expect(less.stats.plungerTravel_mm).toBeLessThan(base.stats.plungerTravel_mm * 0.95)
  })
  it("originCheck: skirt zerado e flag ligada", () => {
    const prof = BASIC_PROFILES[0]
    const { adjustments } = interpretFeedback(2, "começou longe do ponto zero")
    const { out, originCheck } = applyLearned({ params: { ...prof.params, skirtLoops: 2 }, extrusion: prof.extrusion }, adjustments)
    expect(originCheck).toBe(true)
    expect(out.params.skirtLoops).toBe(0)
  })
})

describe("R23 · persistência e consumo", () => {
  it("saveFeedback → pendingAdjustments → markConsumed → vazio", () => {
    clearFeedback()
    const fb = saveFeedback({ rating: 3, text: "saiu muito volume de biotinta", materialId: "gelma", geometryId: "box" })
    expect(listFeedback()).toHaveLength(1)
    const p = pendingAdjustments({ materialId: "gelma" })
    expect(p.feedback?.id).toBe(fb.id)
    expect(p.adjustments.some((a) => a.target === "flowMultiplier")).toBe(true)
    markConsumed(fb.id)
    expect(pendingAdjustments({ materialId: "gelma" }).adjustments).toEqual([])
  })
  it("nota 5 não gera pendência", () => {
    clearFeedback()
    saveFeedback({ rating: 5, text: "ótimo" })
    expect(pendingAdjustments({}).feedback).toBeNull()
  })
  it("prioriza feedback do mesmo material; cai no último global se não houver", () => {
    clearFeedback()
    const a = saveFeedback({ rating: 2, text: "começou longe do ponto zero", materialId: "alginato" })
    const b = saveFeedback({ rating: 3, text: "muito volume", materialId: "gelma" })
    expect(pendingAdjustments({ materialId: "alginato" }).feedback?.id).toBe(a.id)
    expect(pendingAdjustments({ materialId: "colageno" }).feedback?.id).toBe(b.id)
  })
})
