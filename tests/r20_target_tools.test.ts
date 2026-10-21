/**
 * R20 — BioSlicer como base única: ALVO (Petri/placa) + CABEÇOTES (multi-material)
 */
import { describe, it, expect } from "vitest"
import { sliceMesh, boxMesh, cylinderMesh, BASIC_PROFILES, PLATES, wellOffsets, referenceWell, allWells, singleTool, suggestAssignment, type ToolsConfig, type PrintTarget } from "@/lib/slicer"
import { validateGcode } from "@/lib/bioprint/gcode-validator"

const prof = BASIC_PROFILES[0]
const cmds = (g: string) => g.split("\n").map((l) => l.replace(/;.*$/, "").trim()).filter(Boolean)
const run = (mesh = boxMesh(8, 8, 1.2), extra: Partial<Parameters<typeof sliceMesh>[0]> = {}) =>
  sliceMesh({ mesh, params: { ...prof.params }, extrusion: prof.extrusion, profileId: prof.id, profileName: prof.name, ...extra })
const xyOf = (l: string) => { const mx = l.match(/X(-?[\d.]+)/), my = l.match(/Y(-?[\d.]+)/); return mx && my ? { x: +mx[1], y: +my[1] } : null }

describe("R20 · alvo · catálogo de placas", () => {
  it("referência = superior-esquerdo; offsets pelo pitch; linhas crescem em −Y", () => {
    const spec = PLATES[24]
    expect(referenceWell(spec, ["C3", "A2", "B1"])).toBe("A2")
    const offs = wellOffsets(spec, ["A2", "A3", "B2"])
    expect(offs[0]).toEqual({ id: "A2", dx: 0, dy: 0 })
    expect(offs.find((o) => o.id === "A3")!.dx).toBeCloseTo(19.3, 3)
    expect(offs.find((o) => o.id === "B2")!.dy).toBeCloseTo(-19.3, 3)
    expect(allWells(PLATES[96]).length).toBe(96)
    expect(allWells(PLATES[6])).toEqual(["A1", "A2", "A3", "B1", "B2", "B3"])
  })
})

describe("R20 · alvo · G-code replicado por poço", () => {
  it("placa 24, 3 poços: 3 blocos ;WELL:, 1º poço em (0,0), demais deslocados; z-hop entre poços; validador OK", () => {
    const target: PrintTarget = { kind: "plate", format: 24, wells: ["B1", "A1", "A2"], zHop_mm: 5, pause_s: 0, purge_uL: 0 }
    const r = run(cylinderMesh(6, 1.2), { target })
    expect(r.stats.wells).toBe(3)
    expect(r.gcode).toMatch(/; Origin: centro do poço A1/)
    const wells = r.gcode.match(/^;WELL:(\w+)/gm)!
    expect(wells.length).toBe(3)
    expect(wells[0]).toBe(";WELL:A1")
    // dentro do bloco A2 as coordenadas ficam perto de (19.3, 0)
    const blockA2 = r.gcode.split(";WELL:A2")[1].split(";WELL:")[0]
    const pts = cmds(blockA2).map(xyOf).filter(Boolean) as Array<{ x: number; y: number }>
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length
    expect(cx).toBeGreaterThan(15); expect(cx).toBeLessThan(23)
    // bloco B1 perto de (0, -19.3)
    const blockB1 = r.gcode.split(";WELL:B1")[1].split(";WELL:")[0]
    const ptsB = cmds(blockB1).map(xyOf).filter(Boolean) as Array<{ x: number; y: number }>
    const cy = ptsB.reduce((a, p) => a + p.y, 0) / ptsB.length
    expect(cy).toBeLessThan(-15); expect(cy).toBeGreaterThan(-23)
    expect(r.gcode).toMatch(/z-hop entre poços/)
    // 1º movimento após G92 é extrusão (ponto zero)
    const c = cmds(r.gcode); const g92 = c.findIndex((l) => l.startsWith("G92"))
    const first = c.slice(g92 + 1).find((l) => /^G[01]\b/.test(l) && /[XY]-?\d/.test(l))!
    expect(first).toMatch(/^G1\b.*E/)
    const v = validateGcode(r.gcode)
    expect(v.issues.filter((i) => ["FIRST_MOVE_FAR", "PARK_MOVE", "NO_G92_ORIGIN", "OUT_OF_VOLUME_X"].includes(i.code)).length).toBe(0)
  })
  it("peça não cabe no poço → erro target_too_small", () => {
    const r = run(boxMesh(20, 20, 1), { target: { kind: "plate", format: 96, wells: ["A1"], zHop_mm: 5, pause_s: 0, purge_uL: 0 } })
    expect(r.warnings.some((w) => w.code === "target_too_small" && w.level === "error")).toBe(true)
  })
  it("Petri 60 (default): 1 cópia, sem ;WELL:", () => {
    const r = run()
    expect(r.stats.wells).toBe(1)
    expect(r.gcode).not.toMatch(/^;WELL:/m)
    expect(r.gcode).toMatch(/; Origin: centro da peça/)
  })
})

describe("R20 · cabeçotes · multi-material em 1 G-code", () => {
  const tools2 = (): ToolsConfig => {
    const base = singleTool(prof.extrusion, "GelMA 10 %", "gelma")
    return {
      ...base,
      heads: [
        base.heads[0],
        { index: 1, label: "Alginato 3 % + células", materialId: "alginate", extrusion: { ...prof.extrusion, flowMultiplier: 1.1 }, offsetX_mm: 0, offsetY_mm: 0, temp_C: 24, color: "#10b981" },
      ],
      assign: suggestAssignment([base.heads[0], { index: 1, label: "x", extrusion: prof.extrusion, offsetX_mm: 0, offsetY_mm: 0, temp_C: null, color: "" }], { 0: "structural", 1: "cellular" }),
    }
  }
  it("1 cabeçote: sem T<n> e sem trocas (compatível com hoje)", () => {
    const r = run()
    expect(cmds(r.gcode).some((l) => /^T\d/.test(l))).toBe(false)
    expect(r.stats.toolChanges).toBe(0)
  })
  it("2 cabeçotes: paredes em T0, infill em T1; trocas com retração→T→prime; volume por ferramenta; M104 por T", () => {
    const t = tools2()
    expect(t.assign.wall_outer).toBe(0); expect(t.assign.infill).toBe(1)
    const r = run(boxMesh(10, 10, 1.2), { tools: t })
    const c = cmds(r.gcode)
    expect(c[c.findIndex((l) => l.startsWith("G92")) + 1]).toBe("T0")
    expect(c.some((l) => l === "T1")).toBe(true)
    expect(r.stats.toolChanges!).toBeGreaterThan(0)
    expect(r.gcode).toMatch(/;TOOL:1/)
    expect(r.gcode).toMatch(/troca de cabeçote T0 → T1/)
    expect(r.gcode).toMatch(/M104 T1 S24/)
    // retração antes da troca e prime depois
    const i = c.indexOf("T1")
    expect(c[i - 2]).toMatch(/^G1 E-/)      // retract
    expect(c[i + 1]).toMatch(/^G1 E\d/)     // prime
    const vt = r.stats.volumeByTool_uL!
    expect(vt[0]).toBeGreaterThan(0); expect(vt[1]).toBeGreaterThan(0)
    expect(Math.abs(vt[0] + vt[1] - r.stats.volume_uL)).toBeLessThan(0.5)
    expect(validateGcode(r.gcode).issues.filter((x) => x.code === "PARK_MOVE").length).toBe(0)
  })
  it("offset de cabeçote aplicado no caminho desloca as coordenadas do T1", () => {
    const t = tools2(); t.applyOffsetInPath = true; t.heads[1].offsetX_mm = 30
    const r = run(boxMesh(10, 10, 1.2), { tools: t })
    const afterT1 = r.gcode.split(";TOOL:1")[1].split(";TYPE:WALL")[0]
    const pts = cmds(afterT1).map(xyOf).filter(Boolean) as Array<{ x: number; y: number }>
    expect(pts.some((p) => p.x < -20)).toBe(true) // x − 30
  })
  it("offset via firmware emite M218", () => {
    const t = tools2(); t.heads[1].offsetX_mm = 30
    const r = run(boxMesh(10, 10, 1.2), { tools: t })
    expect(r.gcode).toMatch(/M218 T1 X30/)
  })
})
