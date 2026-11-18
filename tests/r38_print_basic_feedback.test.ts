/**
 * R38 · Impressão Básica — feedback pós-impressão → sugestões da BIA
 */
import { describe, it, expect } from "vitest"
import { defaultState, defaultShape } from "@/lib/print-basic/engine"
import { analyzeFeedback, SYMPTOMS, summarizeSuggestions, type PrintFeedback } from "@/lib/print-basic/feedback"

const base = () => { const s = defaultState(); s.shapes = [{ ...defaultShape("disc", 1), id: "d" }]; return s }
const fb = (p: Partial<PrintFeedback>): PrintFeedback => ({ rating: 3, symptoms: [], at: "2026-11-18T00:00:00Z", ...p })

describe("R38 · sintomas e sugestões", () => {
  it("lista os sintomas principais (hidrogel não saiu, falhas, fios, arrasto, colapso, entupimento, offset)", () => {
    const ids = SYMPTOMS.map((s) => s.id)
    for (const k of ["no_material", "gaps_first_layer", "gaps_layers", "too_much", "stringing", "dragging", "collapse", "clog", "offset", "ok"]) expect(ids).toContain(k)
  })
  it("'não saiu hidrogel' → escorvar, aumentar fluxo/pressão, reduzir velocidade", () => {
    const s = base()
    const out = analyzeFeedback(fb({ rating: 1, symptoms: ["no_material"] }), s)
    const ids = out.map((o) => o.id)
    expect(ids).toContain("prime"); expect(ids).toContain("flow-up"); expect(ids).toContain("speed-down")
    const up = out.find((o) => o.id === "flow-up")!.apply!(s)
    expect(up.heads[0].flow).toBe(120)
    expect(up.heads[0].pressure).toBeCloseTo(24 * 1.2, 1) // pneumático: pressão sobe junto
    const down = out.find((o) => o.id === "speed-down")!.apply!(s)
    expect(down.heads[0].speed).toBeCloseTo(15, 2)
  })
  it("falhas na 1ª camada → primeira camada 70 % e mais lenta; falhas no meio → altura ≤ Ø agulha", () => {
    const s = base()
    const a = analyzeFeedback(fb({ symptoms: ["gaps_first_layer"] }), s)
    expect(a.find((o) => o.id === "first-layer")!.apply!(s).layerSettings.firstLayerPct).toBe(70)
    s.layerSettings.layerHeight = 0.6
    const b = analyzeFeedback(fb({ symptoms: ["gaps_layers"] }), s)
    const lh = b.find((o) => o.id === "layer-h")!.apply!(s).layerSettings.layerHeight
    expect(lh).toBeCloseTo(0.41 * 0.9, 2)
  })
  it("saiu demais → fluxo −20 %; fios → Z-hop 0,8; arrasto → altura = Ø agulha; colapso → UV por camada", () => {
    const s = base()
    expect(analyzeFeedback(fb({ symptoms: ["too_much"] }), s).find((o) => o.id === "flow-down")!.apply!(s).heads[0].flow).toBe(80)
    expect(analyzeFeedback(fb({ symptoms: ["stringing"] }), s).find((o) => o.id === "zhop")!.apply!(s).heads[0].zHop).toBe(0.8)
    expect(analyzeFeedback(fb({ symptoms: ["dragging"] }), s).find((o) => o.id === "layer-h-up")!.apply!(s).layerSettings.layerHeight).toBeCloseTo(0.41, 2)
    const c = analyzeFeedback(fb({ symptoms: ["collapse"] }), s).find((o) => o.id === "crosslink")!.apply!(s)
    expect(c.printer.photocrosslinking).toBe(true); expect(c.printer.uvEvery).toBe("layer")
  })
  it("ajustes feitos ao vivo viram sugestões de fixar (fluxo, velocidade, altura)", () => {
    const s = base()
    const out = analyzeFeedback(fb({ rating: 4, symptoms: ["ok"], live: { flow: 150, speed: 70, zBaby: -0.1 } }), s)
    const ids = out.map((o) => o.id)
    expect(ids).toContain("live-flow"); expect(ids).toContain("live-speed"); expect(ids).toContain("live-z")
    expect(out.find((o) => o.id === "live-flow")!.apply!(s).heads[0].flow).toBe(150)
    expect(out.find((o) => o.id === "live-speed")!.apply!(s).heads[0].speed).toBeCloseTo(14, 1)
    const z = out.find((o) => o.id === "live-z")!.apply!(s).layerSettings.firstLayerPct
    expect(z).toBeLessThan(80) // aproximou a agulha → primeira camada menor
  })
  it("impressão boa sem ajustes → registra como referência; prioridade 1 vem primeiro", () => {
    const s = base()
    const ok = analyzeFeedback(fb({ rating: 5, symptoms: ["ok"] }), s)
    expect(ok).toHaveLength(1); expect(ok[0].id).toBe("ok")
    const multi = analyzeFeedback(fb({ rating: 2, symptoms: ["no_material", "stringing"] }), s)
    for (let i = 1; i < multi.length; i++) expect(multi[i].priority).toBeGreaterThanOrEqual(multi[i - 1].priority)
    expect(summarizeSuggestions(multi).split("\n").length).toBeLessThanOrEqual(5)
  })
  it("offset com 2 cabeçotes lembra dos offsets entre agulhas", () => {
    const s = base(); s.heads[1].enabled = true; s.shapes.push({ ...defaultShape("disc", 2), id: "e", x: 8 })
    const ids = analyzeFeedback(fb({ symptoms: ["offset"] }), s).map((o) => o.id)
    expect(ids).toContain("zero"); expect(ids).toContain("offsets")
  })
})
