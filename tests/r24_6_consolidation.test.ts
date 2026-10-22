import { describe, it, expect } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { PRINTABILITY_TESTS, getPrintabilityTest, makePrintabilityTestMesh } from "../src/lib/slicer/printability-tests"
const ROOT = resolve(__dirname, "..")
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf-8")

describe("R24.6 · uma ferramenta, um lugar", () => {
  it("8 testes de imprimibilidade viram malha fatiável no BioSlicer", () => {
    expect(PRINTABILITY_TESTS.length).toBe(8)
    expect(getPrintabilityTest("test_grid")?.slice.infillPattern).toBe("rectilinear")
    const m = makePrintabilityTestMesh("test_grid")
    expect(m.triangleCount).toBeGreaterThan(10)
    expect(m.bbox.maxZ - m.bbox.minZ).toBeGreaterThan(0)
  })
  it("rotas duplicadas viraram redirects", () => {
    for (const [p, dest] of [
      ["src/app/dashboard/bioprint/bioink/classic/page.tsx", "bioink?mode=free"],
      ["src/app/dashboard/bioprint/bioink/lab/page.tsx", "bioink?mode=lab"],
      ["src/app/dashboard/formulator-pro/page.tsx", "\"mode\", \"pro\""],
      ["src/app/dashboard/bioprint/printability/page.tsx", "slice?test="],
      ["src/app/dashboard/bioprint/toolpath/page.tsx", "/dashboard/bioprint/execute"],
      ["src/app/academy/(app)/project/page.tsx", "/dashboard/notebook"],
    ] as const) { const s = read(p); expect(s, p).toContain("redirect("); expect(s, p).toContain(dest) }
  })
  it("Fase 2 tem os 4 modos e código morto foi removido", () => {
    const s = read("src/app/dashboard/bioprint/bioink/page.tsx")
    for (const c of ["BioinkGuidedLab", "BioinkFreeFormulator", "FormulatorPro", "\"recipes\""]) expect(s).toContain(c)
    expect(existsSync(resolve(ROOT, "src/app/dashboard/studio/StudioClient.tsx"))).toBe(false)
    expect(existsSync(resolve(ROOT, "src/app/dashboard/bioprint/model/_legacy"))).toBe(false)
    expect(existsSync(resolve(ROOT, "src/components/bioprinter/BioinkMultiMaterialFormulator.tsx"))).toBe(false)
  })
})
