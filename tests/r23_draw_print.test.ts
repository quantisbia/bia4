/**
 * R23 — Draw & Print: "fazer três linhas e a impressora entender 3 caminhos";
 * cabeçotes por traço; volume a partir das linhas (N camadas).
 */
import { describe, it, expect } from "vitest"
import { strokesToLayers, drawToGCode, simplifyStroke, circlePoints, rectPoints, describeDrawing, strokeLength, type Stroke } from "@/lib/slicer/draw-print"
import { BASIC_PROFILES } from "@/lib/slicer/profiles"
import { singleTool, type ToolsConfig } from "@/lib/slicer/tools"

const prof = BASIC_PROFILES[0]
const P = { ...prof.params, layerHeight_mm: 0.3, firstLayerHeight_mm: 0.27 }
const X = prof.extrusion
const line = (id: string, y: number, tool = 0): Stroke => ({ id, kind: "line", points: [{ x: -5, y }, { x: 5, y }], closed: false, tool, fill: false })

describe("R23 · Draw & Print", () => {
  it("3 linhas → 3 caminhos de extrusão na camada; G-code com 3 inícios de extrusão", () => {
    const strokes = [line("a", -2), line("b", 0), line("c", 2)]
    const layers = strokesToLayers(strokes, P, { layers: 1, alternate90: false, fillDensity: 30, fillPattern: "rectilinear" })
    expect(layers).toHaveLength(1)
    expect(layers[0].paths).toHaveLength(3)
    expect(layers[0].paths.every((p) => !p.closed && p.points.length === 2)).toBe(true)
    const { result } = drawToGCode({ strokes, params: P, extrusion: X, volume: { layers: 1, alternate90: false, fillDensity: 30, fillPattern: "rectilinear" }, write: { jobName: "3linhas", profileId: prof.id, profileName: prof.name } })
    expect(result.gcode).toMatch(/G92 X0 Y0 Z0 E0/)
    expect(result.gcode).not.toMatch(/\nG28/)
    expect(result.stats.extrusionStarts).toBeGreaterThanOrEqual(3)
    expect(result.stats.extrudeLength_mm).toBeGreaterThan(28) // 3 × 10 mm (+ aproximação)
  })

  it("volume: 10 camadas de 0.3 mm = 3 mm de altura; alterna 90° nas ímpares", () => {
    const strokes = [line("a", 0)]
    const layers = strokesToLayers(strokes, P, { layers: 10, alternate90: true, fillDensity: 30, fillPattern: "rectilinear" })
    expect(layers).toHaveLength(10)
    expect(layers[9].z_mm).toBeCloseTo(0.27 + 9 * 0.3, 5)
    const p0 = layers[0].paths[0].points, p1 = layers[1].paths[0].points
    expect(Math.abs(p0[1].x - p0[0].x)).toBeCloseTo(10, 5) // horizontal
    expect(Math.abs(p1[1].y - p1[0].y)).toBeCloseTo(10, 5) // vertical
  })

  it("2 cabeçotes: traço T0 e traço T1 → G-code com T0 e T1 e volume por ferramenta", () => {
    const base = singleTool(X, "GelMA")
    const tools: ToolsConfig = { ...base, heads: [base.heads[0], { ...base.heads[0], index: 1, label: "Alginato" }] }
    const strokes = [line("a", -2, 0), line("b", 2, 1)]
    const { result } = drawToGCode({ strokes, params: P, extrusion: X, volume: { layers: 1, alternate90: false, fillDensity: 30, fillPattern: "rectilinear" }, write: { jobName: "dual", profileId: prof.id, profileName: prof.name, tools } })
    expect(result.gcode).toMatch(/\nT1\b/)
    expect(result.stats.toolChanges).toBeGreaterThanOrEqual(1)
    expect(result.stats.volumeByTool_uL[0]).toBeGreaterThan(0)
    expect(result.stats.volumeByTool_uL[1]).toBeGreaterThan(0)
  })

  it("círculo fechado com preenchimento ganha infill honesto; sem fill só o contorno", () => {
    const circ: Stroke = { id: "c", kind: "circle", points: circlePoints({ x: 0, y: 0 }, 6), closed: true, tool: 0, fill: true }
    const withFill = strokesToLayers([circ], P, { layers: 1, alternate90: false, fillDensity: 40, fillPattern: "grid" })
    const noFill = strokesToLayers([{ ...circ, fill: false }], P, { layers: 1, alternate90: false, fillDensity: 40, fillPattern: "grid" })
    expect(noFill[0].paths).toHaveLength(1)
    expect(noFill[0].paths[0].closed).toBe(true)
    expect(withFill[0].paths.length).toBeGreaterThan(5)
    expect(withFill[0].paths.filter((p) => p.role === "infill").every((p) => p.points.every((q) => Math.hypot(q.x, q.y) <= 6.05))).toBe(true)
  })

  it("retângulo e utilitários", () => {
    const r = rectPoints({ x: -3, y: -2 }, { x: 3, y: 2 })
    expect(r).toHaveLength(4)
    expect(strokeLength({ id: "r", kind: "rect", points: r, closed: true, tool: 0, fill: false })).toBeCloseTo(20, 6)
    const zig = Array.from({ length: 50 }, (_, i) => ({ x: i * 0.2, y: (i % 2) * 0.02 }))
    const simp = simplifyStroke(zig, 0.1)
    expect(simp.length).toBeLessThan(10)
    expect(describeDrawing([line("a", 0), line("b", 1, 1)], { layers: 4, alternate90: true, fillDensity: 30, fillPattern: "rectilinear" }, 0.3)).toMatch(/2 traço\(s\) \(T0: 1 · T1: 1\).*4 camada\(s\) = 1\.20 mm.*alterna 90°/)
  })
})
