/**
 * R40 · Impressão Básica — Trajetória contínua (PathStrategy)
 * Regras: no modo contínuo a peça é percorrida sem levantar/retrair/parar (uma velocidade só);
 * perímetro emenda no meandro; troca de camada sobe em Z andando; a saia é o único levantamento obrigatório.
 */
import { describe, it, expect } from "vitest"
import {
  defaultState, defaultShape, buildToolpaths, generateGcode, syncBed, infillSerpentine, generateInfill,
  shapeRegion, inset, lineWidthOf, skirtLoops, convexHull, rotateClosedTo, speedFor, DEFAULT_STRATEGY,
  type BasicState, type PathStrategy, type Pt,
} from "@/lib/print-basic/engine"

function mk(patch: Partial<PathStrategy>, opts: { pattern?: string; shape?: "square" | "disc"; two?: boolean } = {}): BasicState {
  const st = defaultState() as BasicState
  st.bed = syncBed(st)
  const base = { ...defaultShape(opts.shape ?? "square"), size: 12, height: 0.6, head: 1 }
  st.shapes = opts.two ? [{ ...base, size: 8, x: -8, id: "a" }, { ...base, size: 8, x: 8, id: "b" }] : [base]
  st.layerSettings = { ...st.layerSettings, infillPattern: (opts.pattern ?? "grid") as BasicState["layerSettings"]["infillPattern"], infillDensity: 30 }
  st.printer = { ...st.printer, strategy: { ...DEFAULT_STRATEGY, ...patch } }
  return st
}
const gen = (st: BasicState) => { const tp = buildToolpaths(st); return { tp, ...generateGcode(st, tp) } }
const count = (g: string, re: RegExp) => (g.match(re) || []).length

describe("R40 · infillSerpentine", () => {
  const st = defaultState()
  const lw = lineWidthOf(st.heads[0])
  const reg = inset(shapeRegion({ ...defaultShape("square"), size: 12 }), lw)

  it("num quadrado produz UMA polilinha (meandro contínuo) em vez de N linhas soltas", () => {
    for (const ang of [0, 45, 90, 135]) {
      const s = infillSerpentine(reg, (2 * lw) / 0.3, ang)
      expect(s.length).toBe(1)
      expect(s[0].length).toBeGreaterThan(4)
    }
  })
  it("todos os pontos ficam dentro da região (com tolerância)", () => {
    const s = infillSerpentine(reg, (2 * lw) / 0.3, 45)
    for (const p of s[0]) { expect(Math.abs(p.x)).toBeLessThanOrEqual(6 - lw + 1e-3); expect(Math.abs(p.y)).toBeLessThanOrEqual(6 - lw + 1e-3) }
  })
  it("startNear escolhe a variante que começa mais perto do cabeçote", () => {
    const far = infillSerpentine(reg, (2 * lw) / 0.3, 0, { x: 50, y: 50 })[0][0]
    const near = infillSerpentine(reg, (2 * lw) / 0.3, 0, { x: -50, y: -50 })[0][0]
    expect(Math.hypot(far.x - 50, far.y - 50)).toBeLessThan(Math.hypot(near.x - 50, near.y - 50))
  })
  it("grid contínuo = 2 serpentinas (0° e 90°) e a 2ª começa perto do fim da 1ª", () => {
    const g = generateInfill("grid", reg, lw, 0.3, 45, 0, true, { x: -6, y: -6 })
    expect(g.length).toBe(2)
    const end1 = g[0][g[0].length - 1], start2 = g[1][0]
    expect(Math.hypot(end1.x - start2.x, end1.y - start2.y)).toBeLessThan(6)
    // modo padrão continua gerando muitas linhas soltas
    expect(generateInfill("grid", reg, lw, 0.3, 45).length).toBeGreaterThan(4)
  })
})

describe("R40 · helpers", () => {
  it("convexHull de um quadrado com ponto interno tem 4 vértices", () => {
    const h = convexHull([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: 0.5, y: 0.5 }])
    expect(h.length).toBe(4)
  })
  it("rotateClosedTo começa no ponto da borda mais próximo do alvo", () => {
    const sq: Pt[] = [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }]
    const r = rotateClosedTo(sq, { x: 0.3, y: -5 })
    expect(r[0].x).toBeCloseTo(0.3, 5); expect(r[0].y).toBeCloseTo(-1, 5)
    expect(r.length).toBe(5) // pé da perpendicular inserido
    const r2 = rotateClosedTo(sq, { x: 1, y: 1 })
    expect(r2[0]).toEqual({ x: 1, y: 1 }); expect(r2.length).toBe(4)
  })
  it("skirtLoops gera voltas FORA da peça, da mais externa para a mais interna", () => {
    const paths = [{ head: 1, kind: "external perimeter" as const, pts: [{ x: -5, y: -5 }, { x: 5, y: -5 }, { x: 5, y: 5 }, { x: -5, y: 5 }], closed: true }]
    const loops = skirtLoops(paths, 0.4, 3, 2)
    expect(loops.length).toBe(2)
    const maxX = (l: Pt[]) => Math.max(...l.map((p) => p.x))
    expect(maxX(loops[0])).toBeGreaterThan(maxX(loops[1]))
    expect(maxX(loops[1])).toBeGreaterThan(5 + 3)
  })
  it("speedFor: singleSpeed = velocidade do cabeçote para tudo; senão perímetro externo a 80 %", () => {
    const hd = defaultState().heads[0]
    expect(speedFor(hd, "external perimeter", { ...DEFAULT_STRATEGY, singleSpeed: true })).toBe(hd.speed)
    expect(speedFor(hd, "external perimeter", { ...DEFAULT_STRATEGY, singleSpeed: false })).toBeCloseTo(hd.speed * 0.8)
    expect(speedFor(hd, "infill", { ...DEFAULT_STRATEGY, singleSpeed: false })).toBe(hd.speed)
  })
})

describe("R40 · G-code contínuo", () => {
  it("padrão: cabeçalho 'standard', muitos travels; contínuo: cabeçalho CONTINUOUS, zero travels dentro da peça", () => {
    const std = gen(mk({ continuous: false }))
    const cont = gen(mk({ continuous: true, maxBridge: 0 }))
    expect(std.gcode).toContain("; Path strategy: standard")
    expect(cont.gcode).toContain("; Path strategy: CONTINUOUS")
    expect(std.stats.travels).toBeGreaterThan(10)
    expect(cont.stats.travels).toBe(0)
    expect(cont.stats.bridges).toBeGreaterThan(0)
    expect(cont.tp[0].paths.length).toBeLessThan(std.tp[0].paths.length)
    // sem retração / sem desligar ar dentro da peça (pneumático: M107 só no fim)
    expect(count(cont.gcode, /; extrusion off/g)).toBe(1)
    expect(count(std.gcode, /; extrusion off/g)).toBeGreaterThan(5)
  })
  it("uma velocidade só: todas as linhas G1 XY usam o mesmo F", () => {
    const { gcode } = gen(mk({ continuous: true }))
    const Fs = new Set(gcode.split("\n").filter((l) => /^G1 X.*F\d+ ; (external perimeter|infill|bridge|layer change)/.test(l)).map((l) => l.match(/F(\d+)/)![1]))
    expect(Fs.size).toBe(1)
  })
  it("Z contínuo: troca de camada é um único G1 X Y Z E (sem 'layer change' seco)", () => {
    const { gcode } = gen(mk({ continuous: true, continuousZ: true }))
    expect(gcode).toContain("; layer change (continuous)")
    expect(count(gcode, /F600 ; layer change$/gm)).toBe(1) // só a 1ª camada
    const off = gen(mk({ continuous: true, continuousZ: false })).gcode
    expect(off).not.toContain("layer change (continuous)")
  })
  it("perímetro emendado: a emenda perímetro→meandro é menor que 1 mm", () => {
    const { tp } = gen(mk({ continuous: true, joinPerimeter: true }))
    const [per, inf] = tp[0].paths
    expect(per.kind).toBe("external perimeter"); expect(inf.kind).toBe("infill")
    const end = per.pts[0], start = inf.pts[0]
    expect(Math.hypot(end.x - start.x, end.y - start.y)).toBeLessThan(1)
  })
  it("maxBridge limita a emenda: saltos maiores levantam", () => {
    const tight = gen(mk({ continuous: true, maxBridge: 0.5 }))
    const loose = gen(mk({ continuous: true, maxBridge: 0 }))
    expect(tight.stats.travels).toBeGreaterThan(loose.stats.travels)
  })
  it("entre objetos diferentes SEMPRE levanta, mesmo com maxBridge = 0", () => {
    const { stats, gcode } = gen(mk({ continuous: true, maxBridge: 0 }, { two: true }))
    expect(stats.travels).toBeGreaterThanOrEqual(2) // ≥ 1 por camada (2 camadas)
    expect(gcode).toContain("; travel")
  })
  it("saia: imprime antes da peça, e 'levantar após saia' gera retração/levantamento único", () => {
    const { tp, gcode, stats } = gen(mk({ continuous: true, maxBridge: 0, skirt: true, skirtLoops: 1, skirtGap: 3, liftAfterSkirt: true }))
    expect(tp[0].paths[0].kind).toBe("skirt")
    expect(tp[1].paths.some((p) => p.kind === "skirt")).toBe(false)
    expect(gcode).toContain("; skirt done")
    expect(gcode).toContain("skirt 1 loop(s) @ 3 mm")
    expect(stats.travels).toBe(1)
    const noLift = gen(mk({ continuous: true, maxBridge: 0, skirt: true, liftAfterSkirt: false }))
    expect(noLift.gcode).not.toContain("; skirt done")
  })
  it("disco e linear também ficam contínuos", () => {
    expect(gen(mk({ continuous: true, maxBridge: 0 }, { shape: "disc" })).stats.travels).toBe(0)
    expect(gen(mk({ continuous: true, maxBridge: 0 }, { pattern: "linear" })).stats.travels).toBe(0)
  })
  it("estado padrão continua 'standard' (não muda G-code de quem não ativou)", () => {
    const st = defaultState() as BasicState
    expect(st.printer.strategy?.continuous).toBe(false)
  })
})
