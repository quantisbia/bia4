/**
 * R19 — Etapa A: PONTO ZERO É PONTO ZERO
 *  · peça única centrada em (0,0) = posição do bico no G92
 *  · placa multi-poços: 1º poço (superior-esquerdo) = origem; demais = offsets
 *  · sem skirt por padrão; sem park no fim; só Z+5 relativo
 *  · validador: NO_G92_ORIGIN, FIRST_MOVE_FAR, PARK_MOVE, raio útil
 */
import { describe, it, expect } from "vitest"
import { generateGCodeForJob } from "@/lib/gcode/engine"
import { BIOPRINTER_PROFILES } from "@/lib/gcode/profiles/bioprinters"
import type { PrintJob, Bioink } from "@/lib/gcode/core/types"
import { validateGcode, DEFAULT_BIO_LIMITS } from "@/lib/bioprint/gcode-validator"
import { generateQuickGcode, type QuickGeometry, type QuickBioinkParams } from "@/lib/bioprint/quick-gcode"

const bioink: Bioink = {
  id: "t-alg", material: "Alginato 3 % + Gelatina 7 %", concentration: 3, hasCells: false,
  viscosity_cP: 5000, crosslinker: "CaCl2", temperature_c: 24, pressure_kpa: 60,
  shearStressMax_Pa: 200, nozzleDiameter_um: 410, flowMultiplier: 1.0, retraction_mm: 0,
  printSpeed_mms: 6, travelSpeed_mms: 30,
}
const job = (over: Partial<PrintJob> = {}): PrintJob => ({
  id: "r19", name: "r19", bioprinter: BIOPRINTER_PROFILES.bioender_bioedtech, bioink,
  layerHeight: 0.4, skirtLoops: 0, walls: 2, infillPercent: 20, infillAlgorithm: "linear",
  tissue: "teste", application: "teste", geometryId: "disk", ...over,
})

/** só linhas de comando (sem comentários) */
const cmds = (g: string) => g.split("\n").map((l) => l.replace(/;.*$/, "").trim()).filter(Boolean)

/** primeiro G0/G1 com X ou Y */
function firstXY(gcode: string): { x: number; y: number } | null {
  for (const raw of gcode.split("\n")) {
    const l = raw.trim()
    if (!/^G[01]\b/.test(l)) continue
    const mx = l.match(/X(-?\d+(\.\d+)?)/), my = l.match(/Y(-?\d+(\.\d+)?)/)
    if (mx || my) return { x: mx ? +mx[1] : 0, y: my ? +my[1] : 0 }
  }
  return null
}
function allXY(gcode: string): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = []
  for (const raw of gcode.split("\n")) {
    const l = raw.trim()
    if (!/^G[01]\b/.test(l)) continue
    const mx = l.match(/X(-?\d+(\.\d+)?)/), my = l.match(/Y(-?\d+(\.\d+)?)/)
    if (mx && my) out.push({ x: +mx[1], y: +my[1] })
  }
  return out
}

describe("R19 · Etapa A · engine (Etapa 3)", () => {
  it("peça única: começa com G92 X0 Y0 Z0 E0 e o primeiro XY fica dentro do raio da peça (sem diagonal)", () => {
    const r = generateGCodeForJob({ job: job(), geometryId: "disk", geometryParams: { radius: 10, thickness: 1.2 } })
    expect(r.gcode).toMatch(/G92 X0 Y0 Z0 E0/)
    expect(cmds(r.gcode).some((l) => /^G28\b/.test(l))).toBe(false)
    const f = firstXY(r.gcode)!
    expect(f).not.toBeNull()
    expect(Math.hypot(f.x, f.y)).toBeLessThanOrEqual(10.5) // raio 10 + tolerância
    // centro de massa das coordenadas ≈ (0,0)
    const pts = allXY(r.gcode)
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length
    const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length
    expect(Math.abs(cx)).toBeLessThan(1.5)
    expect(Math.abs(cy)).toBeLessThan(1.5)
  })

  it("sem skirt por padrão (skirtLoops 0) → nenhum movimento além do bbox da peça", () => {
    const r = generateGCodeForJob({ job: job({ skirtLoops: 0, infillPercent: 0 }), geometryId: "disk", geometryParams: { radius: 8, thickness: 0.8 } })
    const maxR = Math.max(...allXY(r.gcode).map((p) => Math.hypot(p.x, p.y)))
    expect(maxR).toBeLessThanOrEqual(8.6)
    expect(cmds(r.gcode).join("\n")).not.toMatch(/SKIRT/)
    // com skirt explícito (opt-in) o raio cresce
    const r2 = generateGCodeForJob({ job: job({ skirtLoops: 1, infillPercent: 0 }), geometryId: "disk", geometryParams: { radius: 8, thickness: 0.8 } })
    const maxR2 = Math.max(...allXY(r2.gcode).map((p) => Math.hypot(p.x, p.y)))
    expect(maxR2).toBeGreaterThan(9)
  })

  it("fim: sem park (G1 X0 Y200), só Z+5 relativo; M400 antes", () => {
    const r = generateGCodeForJob({ job: job(), geometryId: "disk", geometryParams: { radius: 6, thickness: 0.8 } })
    const c = cmds(r.gcode)
    expect(c.some((l) => /^G[01] X0 Y200/.test(l))).toBe(false)
    const tail = r.gcode.split("PRINT END")[1]
    expect(tail).toMatch(/M400/)
    expect(tail).toMatch(/G91[\s\S]*G1 Z5 F300[\s\S]*G90/)
  })

  it("placa 24 poços: 1º poço selecionado (superior-esquerdo) = origem; demais são offsets do pitch 19,3 mm", () => {
    const r = generateGCodeForJob({
      job: job({ layerHeight: 0.8 }), geometryId: "disk", geometryParams: { radius: 3, thickness: 0.8 },
      wellPlate: { format: 24, selectedWells: ["B2", "A1", "A2"], replicationMode: "same", zHopBetweenWells_mm: 5, pauseBetweenWells_s: 0, purgeVolume_uL: 0, wipeTowerEnabled: false },
    })
    expect(r.wellsUsed[0]).toBe("A1")
    expect(r.warnings.some((w) => /Origem \(G92\) = centro do poço A1/.test(w))).toBe(true)
    // A1 está em (0,0): primeiro XY dentro do raio 3
    const f = firstXY(r.gcode)!
    expect(Math.hypot(f.x, f.y)).toBeLessThanOrEqual(3.3)
    // A2 → (19.3, 0) ; B2 → (19.3, 19.3): existe algum ponto perto desses centros
    const pts = allXY(r.gcode)
    const near = (cx: number, cy: number) => pts.some((p) => Math.hypot(p.x - cx, p.y - cy) <= 3.3)
    expect(near(19.3, 0)).toBe(true)
    expect(near(19.3, 19.3)).toBe(true)
    // nenhuma coordenada absoluta de mesa (ex. > 60 mm)
    expect(Math.max(...pts.map((p) => Math.hypot(p.x, p.y)))).toBeLessThan(35)
  })

  it("G-code do engine passa no validador (sem NO_G92_ORIGIN / FIRST_MOVE_FAR / PARK_MOVE)", () => {
    const r = generateGCodeForJob({ job: job(), geometryId: "membrane", geometryParams: { width: 20, height: 20, depth: 1.2 } })
    const v = validateGcode(r.gcode, DEFAULT_BIO_LIMITS, "marlin")
    const codes = v.issues.map((i) => i.code)
    expect(codes).not.toContain("NO_G92_ORIGIN")
    expect(codes).not.toContain("FIRST_MOVE_FAR")
    expect(codes).not.toContain("PARK_MOVE")
    expect(codes).not.toContain("OUT_OF_VOLUME_X")
    expect(v.verdict).not.toBe("blocked")
  })
})

describe("R19 · Etapa A · validador", () => {
  const head = "G21\nG90\nM83\nG92 X0 Y0 Z0 E0\n"
  it("aceita coordenadas negativas (peça centrada no bico)", () => {
    const g = head + "G1 X-5 Y-5 Z0.3 F600\nG1 X5 Y-5 E0.1\nG1 X5 Y5 E0.1\nG1 X-5 Y5 E0.1\n"
    const v = validateGcode(g)
    expect(v.issues.filter((i) => i.code.startsWith("OUT_OF_VOLUME")).length).toBe(0)
  })
  it("bloqueia primeiro movimento longe da origem (diagonal após G92)", () => {
    const g = head + "G0 X60 Y45 Z0.3 F3000\nG1 X70 Y45 E0.2\n"
    const v = validateGcode(g)
    expect(v.issues.some((i) => i.code === "FIRST_MOVE_FAR")).toBe(true)
    expect(v.verdict).toBe("blocked")
  })
  it("bloqueia sem G92 antes do primeiro movimento", () => {
    const g = "G21\nG90\nM83\nG1 X1 Y1 Z0.3 F600\nG1 X5 Y1 E0.1\n"
    const v = validateGcode(g)
    expect(v.issues.some((i) => i.code === "NO_G92_ORIGIN")).toBe(true)
  })
  it("bloqueia park no fim (movimento longo sem extrusão após extrudar)", () => {
    const g = head + "G1 X-5 Y0 Z0.3 F600\nG1 X5 Y0 E0.2\nG91\nG1 Z10\nG90\nG1 X0 Y200 F3000\n"
    const v = validateGcode(g)
    expect(v.issues.some((i) => i.code === "PARK_MOVE")).toBe(true)
  })
  it("bloqueia ponto fora do raio útil (90 mm)", () => {
    const g = head + "G1 X-5 Y0 Z0.3 F600\nG1 X95 Y0 E2\n"
    const v = validateGcode(g)
    expect(v.issues.some((i) => i.code === "OUT_OF_VOLUME_X")).toBe(true)
  })
})

describe("R19 · Etapa A · G-code Rápido", () => {
  it("peça centrada em (0,0) e sem viagem inicial", () => {
    const geom = { id: "cube", width: 10, depth: 10, height: 1 } as QuickGeometry
    const ink = { materialLabel: "Alginato 3 %", nozzleDiameter_mm: 0.41, viscosity_PaS: 5, printSpeed_mms: 8, travelSpeed_mms: 30, hasCells: false } as QuickBioinkParams
    const res = generateQuickGcode(geom, ink, { layerHeight_mm: 0.4, walls: 2, infillPattern: "rectilinear", infillDensity_pct: 30, jobName: "r19" })
    const g = res.gcode
    expect(g).toMatch(/G92 X0 Y0 Z0 E0/)
    const f = firstXY(g)!
    expect(Math.hypot(f.x, f.y)).toBeLessThanOrEqual(7.5)
    expect(g).not.toMatch(/X110\./)
    const v = validateGcode(g)
    expect(v.issues.some((i) => i.code === "FIRST_MOVE_FAR")).toBe(false)
    expect(v.issues.some((i) => i.code === "PARK_MOVE")).toBe(false)
  })
})
