import { describe, it, expect, beforeEach } from "vitest"
import {
  defaultFlowFor, normalizeMaterialKey, suggestStartFlow, rememberGoodFlow, forgetFlow,
  listFlowMemory, clampFlow, nextFlowBump, flowAdvice, FLOW_MIN, FLOW_MAX,
} from "@/lib/bioprint/flow-memory"

// localStorage mínimo para Node
class MemStorage {
  private m = new Map<string, string>()
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
  clear() { this.m.clear() }
}

describe("R17 · flow-memory", () => {
  beforeEach(() => {
    const g = globalThis as unknown as { window?: { localStorage: MemStorage } }
    g.window = { localStorage: new MemStorage() }
  })

  it("defaults por material são ≥ 100 % para hidrogéis (nunca 50 %)", () => {
    expect(defaultFlowFor("Alginato 3 % + Gelatina 7 %")).toBeGreaterThanOrEqual(100)
    expect(defaultFlowFor("gelma")).toBe(100)
    expect(defaultFlowFor("Pluronic F127 35 %")).toBe(130)
    expect(defaultFlowFor("pasta de calibração")).toBe(80)
    expect(defaultFlowFor("desconhecido")).toBe(110)
  })

  it("normalizeMaterialKey remove acentos e símbolos", () => {
    expect(normalizeMaterialKey("Alginato 3 % + Gelatina 7 %")).toBe("alginato_3_gelatina_7")
    expect(normalizeMaterialKey(null)).toBe("generic")
  })

  it("suggestStartFlow usa default sem memória e memória depois de lembrar", () => {
    const a = suggestStartFlow("GelMA 10 %")
    expect(a.source).toBe("default")
    expect(a.percent).toBe(100)
    rememberGoodFlow("GelMA 10 %", "GelMA 10 %", 140, 100)
    const b = suggestStartFlow("GelMA 10 %")
    expect(b.source).toBe("memory")
    expect(b.percent).toBe(140)
    expect(b.entry?.samples).toBe(1)
  })

  it("memória converge (70/30) e lista ordenada; forget limpa", () => {
    rememberGoodFlow("alg", "Alginato", 120, 100)
    const e = rememberGoodFlow("alg", "Alginato", 160, 120)
    expect(e.lastGoodPercent).toBe(Math.round(160 * 0.7 + 120 * 0.3))
    expect(e.samples).toBe(2)
    expect(listFlowMemory()[0].materialKey).toBe("alg")
    forgetFlow("alg")
    expect(suggestStartFlow("alg").source).toBe("default")
  })

  it("clamp e bump", () => {
    expect(clampFlow(5)).toBe(FLOW_MIN)
    expect(clampFlow(999)).toBe(FLOW_MAX)
    // R25: saltos proporcionais (seringa 10 mL exige salto real) e teto Marlin 999
    expect(nextFlowBump(80)).toBe(105)
    expect(nextFlowBump(120)).toBe(170)
    expect(nextFlowBump(200)).toBe(300)
    expect(nextFlowBump(900)).toBe(FLOW_MAX)
  })

  it("flowAdvice orienta por faixa", () => {
    expect(flowAdvice(50, "GelMA")).toMatch(/baixo/i)
    expect(flowAdvice(110, "GelMA")).toMatch(/\+10–25/)
    expect(flowAdvice(170, "GelMA")).toMatch(/purgue/i)
    expect(flowAdvice(250, "GelMA")).toMatch(/200/)
  })
})
