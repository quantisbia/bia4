/**
 * R24.3 — Desenhar & Imprimir: ao fechar uma forma a usuária informa quantas
 * camadas ela deve ter → a forma vira volume próprio; linhas ao lado mantêm
 * a altura padrão do desenho. A altura total = traço mais alto.
 */
import { describe, it, expect } from "vitest"
import { strokesToLayers, drawToGCode, describeDrawing, strokeLayers, drawingLayerCount, circlePoints, type Stroke, type DrawVolume } from "@/lib/slicer/draw-print"
import { BASIC_PROFILES } from "@/lib/slicer/profiles"

const prof = BASIC_PROFILES[0]
const P = { ...prof.params, layerHeight_mm: 0.3, firstLayerHeight_mm: 0.27 }
const X = prof.extrusion
const vol: DrawVolume = { layers: 2, alternate90: false, fillDensity: 30, fillPattern: "rectilinear" }
const line: Stroke = { id: "l", kind: "line", points: [{ x: -5, y: -8 }, { x: 5, y: -8 }], closed: false, tool: 0, fill: false }
const circ10: Stroke = { id: "c", kind: "circle", points: circlePoints({ x: 0, y: 4 }, 3), closed: true, tool: 0, fill: true, layers: 10 }

describe("R24.3 · camadas por forma fechada", () => {
  it("strokeLayers usa o valor próprio do traço, senão o do desenho (mín. 1)", () => {
    expect(strokeLayers(line, vol)).toBe(2)
    expect(strokeLayers(circ10, vol)).toBe(10)
    expect(strokeLayers({ ...circ10, layers: 0 }, vol)).toBe(2)
    expect(strokeLayers({ ...circ10, layers: NaN }, vol)).toBe(2)
    expect(strokeLayers(line, { ...vol, layers: 0 })).toBe(1)
  })

  it("altura total do desenho = traço mais alto", () => {
    expect(drawingLayerCount([line], vol)).toBe(2)
    expect(drawingLayerCount([line, circ10], vol)).toBe(10)
    expect(drawingLayerCount([], vol)).toBe(2)
  })

  it("círculo fechado com 10 camadas vira volume; a linha ao lado para na camada 2", () => {
    const layers = strokesToLayers([line, circ10], P, vol)
    expect(layers).toHaveLength(10)
    // camadas 0 e 1: linha + contorno + infill do círculo
    expect(layers[0].paths.some((p) => !p.closed && p.points.length === 2 && p.points[0].y === -8)).toBe(true)
    expect(layers[1].paths.some((p) => p.points[0]?.y === -8)).toBe(true)
    // camada 2+: só o círculo (contorno fechado + infill), nada da linha
    for (let i = 2; i < 10; i++) {
      expect(layers[i].paths.some((p) => p.points[0]?.y === -8 && p.points.length === 2)).toBe(false)
      expect(layers[i].paths.some((p) => p.closed)).toBe(true)
      expect(layers[i].contours).toHaveLength(1)
    }
    expect(layers[9].z_mm).toBeCloseTo(0.27 + 9 * 0.3, 5)
  })

  it("G-code: meta drawLayers reflete o traço mais alto; descrição indica alturas mistas", () => {
    const { result, layers } = drawToGCode({ strokes: [line, circ10], params: P, extrusion: X, volume: vol, write: { jobName: "vol", profileId: prof.id, profileName: prof.name } })
    expect(layers).toHaveLength(10)
    expect(result.gcode).toMatch(/drawLayers[":\s]+10/)
    expect(describeDrawing([line, circ10], vol, 0.3)).toMatch(/10 camada\(s\) \(máx\.; alturas por traço\) = 3\.00 mm/)
    expect(describeDrawing([line], vol, 0.3)).not.toMatch(/máx\./)
  })
})
