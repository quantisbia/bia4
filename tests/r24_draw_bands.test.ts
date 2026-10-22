/**
 * R24.5 — Sanduíche por camada no Desenhar & Imprimir: faixas de camadas com
 * padrão e densidade próprios (ex.: gyroid → grid → triangular 30 %), repetindo.
 */
import { describe, it, expect } from "vitest"
import { strokesToLayers, fillForLayer, bandsTotalLayers, BAND_PRESETS, describeDrawing, drawToGCode, circlePoints, type Stroke, type DrawVolume } from "@/lib/slicer/draw-print"
import { BASIC_PROFILES } from "@/lib/slicer/profiles"
import { RECIPES } from "@/lib/bioink-lab"

const prof = BASIC_PROFILES[0]
const P = { ...prof.params, layerHeight_mm: 0.3, firstLayerHeight_mm: 0.27 }
const circ: Stroke = { id: "c", kind: "circle", points: circlePoints({ x: 0, y: 0 }, 6), closed: true, tool: 0, fill: true, layers: 7 }
const vol: DrawVolume = { layers: 1, alternate90: false, fillDensity: 30, fillPattern: "rectilinear", bands: [
  { layers: 1, pattern: "gyroid", density: 30 }, { layers: 1, pattern: "grid", density: 40 }, { layers: 1, pattern: "triangles", density: 30 } ] }

describe("R24.5 · sanduíche por camada", () => {
  it("fillForLayer cicla pelas faixas em ordem", () => {
    expect(fillForLayer(vol, 0)).toMatchObject({ pattern: "gyroid", density: 30, band: 0 })
    expect(fillForLayer(vol, 1)).toMatchObject({ pattern: "grid", density: 40, band: 1 })
    expect(fillForLayer(vol, 2)).toMatchObject({ pattern: "triangles", density: 30, band: 2 })
    expect(fillForLayer(vol, 3)).toMatchObject({ pattern: "gyroid", band: 0 })
    expect(fillForLayer(vol, 6)).toMatchObject({ pattern: "gyroid", band: 0 })
    expect(bandsTotalLayers(vol)).toBe(3)
  })
  it("sem faixas usa o preenchimento global", () => {
    expect(fillForLayer({ ...vol, bands: undefined }, 5)).toMatchObject({ pattern: "rectilinear", density: 30, band: null })
    expect(fillForLayer({ ...vol, bands: [] }, 5)).toMatchObject({ pattern: "rectilinear", band: null })
  })
  it("camadas do círculo recebem infills diferentes conforme a faixa", () => {
    const layers = strokesToLayers([circ], P, vol)
    expect(layers).toHaveLength(7)
    const infillCount = (i: number) => layers[i].paths.filter((p) => p.role === "infill").length
    // todas têm contorno + algum infill
    for (let i = 0; i < 7; i++) { expect(layers[i].paths.some((p) => p.closed)).toBe(true); expect(infillCount(i)).toBeGreaterThan(0) }
    // faixas diferentes → geometrias de infill diferentes (gyroid ≠ grid)
    expect(infillCount(1)).not.toBe(infillCount(0))
    // ciclo: camada 3 volta ao gyroid (ângulo por camada muda, mas o padrão é o mesmo)
    expect(fillForLayer(vol, 3).pattern).toBe(fillForLayer(vol, 0).pattern)
    // gyroid e grid têm contagens em ordens de grandeza compatíveis mas distintas do triangular 30 %
    const kinds = [0, 1, 2].map((i) => fillForLayer(vol, i).pattern)
    expect(new Set(kinds).size).toBe(3)
  })
  it("presets válidos e descrição/meta registram o sanduíche", () => {
    expect(BAND_PRESETS.length).toBeGreaterThanOrEqual(4)
    for (const pr of BAND_PRESETS) { expect(pr.bands.length).toBeGreaterThan(0); for (const b of pr.bands) expect(b.layers).toBeGreaterThanOrEqual(1) }
    expect(describeDrawing([circ], vol, 0.3)).toMatch(/sanduíche 1×gyroid 30% \/ 1×grid 40% \/ 1×triangles 30%/)
    const { result } = drawToGCode({ strokes: [circ], params: P, extrusion: prof.extrusion, volume: vol, write: { jobName: "s", profileId: prof.id, profileName: prof.name } })
    expect(result.gcode).toMatch(/1xgyroid@30%\|1xgrid@40%\|1xtriangles@30%/)
  })
  it("catálogo de biotintas ampliado (≥ 18, ids únicos, CELLINK SKIN presente)", () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(18)
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(RECIPES.length)
    expect(RECIPES.some((r) => r.id === "cellink_skin_fibrin")).toBe(true)
    for (const r of RECIPES) { expect(r.components.length).toBeGreaterThan(0); expect(r.references.length).toBeGreaterThan(0); expect(r.startParams.nozzle_mm).toBeGreaterThan(0) }
  })
})
