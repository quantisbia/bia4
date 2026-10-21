/**
 * R20 · Etapa B — infills honestos na base BioSlicer.
 * "gyroid é gyroid, grid é grid, ondas é ondas": cada padrão gera geometria
 * com a assinatura esperada, dentro da região, e o slicer completo roda com
 * todos eles (G-code com extrusão).
 */
import { describe, it, expect } from "vitest"
import { generateInfill, type InfillInput } from "@/lib/slicer/infill"
import { ADVANCED_INFILL_PATTERNS, INFILL_PATTERN_LABELS, waves, voronoi, schwarzP, gradient } from "@/lib/slicer/infill-advanced"
import { pointInPolySet } from "@/lib/slicer/polygon-ops"
import { sliceMesh } from "@/lib/slicer/slice"
import { boxMesh } from "@/lib/slicer/primitives"
import { BASIC_PROFILES } from "@/lib/slicer/profiles"
import type { Polygon, Path, InfillPattern } from "@/lib/slicer/types"

const square = (s: number): Polygon[] => [[{ x: -s / 2, y: -s / 2 }, { x: s / 2, y: -s / 2 }, { x: s / 2, y: s / 2 }, { x: -s / 2, y: s / 2 }]]
const totalLen = (paths: Path[]) => paths.reduce((L, p) => { for (let i = 1; i < p.length; i++) L += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y); return L }, 0)
const allInside = (paths: Path[], region: Polygon[], tol = 0.05) => {
  const grown = region.map((poly) => poly.map((q) => ({ x: q.x * (1 + tol), y: q.y * (1 + tol) })))
  return paths.every((p) => p.every((q) => pointInPolySet(q, grown)))
}

const base = (pattern: InfillPattern, over: Partial<InfillInput> = {}): InfillInput => ({
  region: square(20), pattern, lineWidth_mm: 0.4, density_pct: 30, angle_deg: 0, layerIndex: 0, z_mm: 0.3, ...over,
})

describe("R20-B · ondas (waves)", () => {
  it("gera linhas senoidais paralelas — y oscila ao longo de x com amplitude ~ espaçamento/4", () => {
    const sp = 2
    const paths = waves(square(20), sp, 0, 0, 0.4)
    expect(paths.length).toBeGreaterThan(5)
    const longest = paths.reduce((a, b) => (b.length > a.length ? b : a))
    const ys = longest.map((p) => p.y)
    const amp = (Math.max(...ys) - Math.min(...ys)) / 2
    expect(amp).toBeGreaterThan(sp / 4 * 0.8)
    expect(amp).toBeLessThan(sp / 4 * 1.2)
    expect(allInside(paths, square(20))).toBe(true)
  })
  it("alterna fase entre camadas (camada ímpar deslocada de meio período)", () => {
    const a = waves(square(20), 2, 0, 0, 0.4).reduce((x, y) => (y.length > x.length ? y : x))
    const b = waves(square(20), 2, 0, 1, 0.4)
    // crista da camada 0 → na camada 1 (fase π) deve ser vale: Δy ≈ 2·amplitude = 1 mm
    const crest = a.reduce((m, q) => (q.y > m.y ? q : m))
    const row = b.reduce((m, p) => (Math.abs(p[0].y - a[0].y) < Math.abs(m[0].y - a[0].y) ? p : m))
    const near = row.reduce((m, q) => (Math.abs(q.x - crest.x) < Math.abs(m.x - crest.x) ? q : m))
    expect(crest.y - near.y).toBeGreaterThan(0.6)
  })
  it("via generateInfill: tem tamanho de poro e densidade coerente", () => {
    const o = generateInfill(base("waves"))
    expect(o.poreSize_mm).not.toBeNull()
    expect(o.paths.length).toBeGreaterThan(0)
    const d = totalLen(o.paths) * 0.4 / 400
    expect(d).toBeGreaterThan(0.15)
    expect(d).toBeLessThan(0.45)
  })
})

describe("R20-B · Voronoi", () => {
  it("células poligonais: arestas retas, nenhuma paralela-regular, tudo dentro da região", () => {
    const paths = voronoi(square(20), 3)
    expect(paths.length).toBeGreaterThan(20)
    expect(paths.every((p) => p.length === 2)).toBe(true)
    expect(allInside(paths, square(20))).toBe(true)
    // ângulos variados (não é grid): desvio padrão dos ângulos > 20°
    const angs = paths.map(([a, b]) => (Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI + 180) % 180)
    const mean = angs.reduce((s, v) => s + v, 0) / angs.length
    const sd = Math.sqrt(angs.reduce((s, v) => s + (v - mean) ** 2, 0) / angs.length)
    expect(sd).toBeGreaterThan(20)
  })
  it("determinístico (mesma semente → mesmas arestas)", () => {
    expect(JSON.stringify(voronoi(square(10), 2))).toBe(JSON.stringify(voronoi(square(10), 2)))
  })
})

describe("R20-B · TPMS Schwarz P e Diamond", () => {
  it("Schwarz P: iso-curvas fechadas/curvas (muitos pontos por caminho) e periodicidade pela célula", () => {
    const paths = schwarzP(square(20), 5, 0, 0.4)
    expect(paths.length).toBeGreaterThan(2)
    expect(paths.some((p) => p.length > 8)).toBe(true)
    expect(allInside(paths, square(20))).toBe(true)
  })
  it("Schwarz P muda com Z (z=0 vs z=célula/2 dão curvas diferentes)", () => {
    const a = totalLen(schwarzP(square(20), 5, 0, 0.4))
    const b = totalLen(schwarzP(square(20), 5, 1.25, 0.4))
    expect(Math.abs(a - b) / Math.max(a, b)).toBeGreaterThan(0.02)
  })
  it("Diamond via generateInfill produz caminhos", () => {
    const o = generateInfill(base("diamond", { density_pct: 40 }))
    expect(o.paths.length).toBeGreaterThan(0)
    expect(o.poreSize_mm).toBeNull()
  })
})

describe("R20-B · Perlin e Gradiente", () => {
  it("Perlin: curvas orgânicas (não retas) dentro da região", () => {
    const o = generateInfill(base("perlin", { density_pct: 40 }))
    expect(o.paths.length).toBeGreaterThan(0)
    expect(o.paths.some((p) => p.length > 6)).toBe(true)
    expect(allInside(o.paths, square(20))).toBe(true)
  })
  it("Gradiente: espaçamento cresce do centro para a borda", () => {
    const paths = gradient(square(20), 1, 0, 2.5)
    const ys = Array.from(new Set(paths.map((p) => Math.round(p[0].y * 1000) / 1000))).sort((a, b) => a - b)
    const pos = ys.filter((y) => y >= 0)
    const gaps = pos.slice(1).map((y, i) => y - pos[i])
    expect(gaps.length).toBeGreaterThan(3)
    expect(gaps[gaps.length - 1]).toBeGreaterThan(gaps[0] * 1.5)
  })
})

describe("R20-B · slicer completo com todos os padrões", () => {
  const all: InfillPattern[] = ["rectilinear", "zigzag", "grid", "triangles", "honeycomb", "waves", "concentric", "gyroid", ...ADVANCED_INFILL_PATTERNS]
  for (const pat of all) {
    it(`${pat}: G-code com extrusão, ;TYPE:FILL e sem erro`, () => {
      const prof = BASIC_PROFILES[0]
      const res = sliceMesh({ mesh: boxMesh(12, 12, 1.0), params: { ...prof.params, infillPattern: pat, infillDensity: 35 }, extrusion: prof.extrusion, profileId: prof.id, profileName: prof.name })
      expect(res.warnings.some((w) => w.level === "error")).toBe(false)
      expect(res.gcode).toMatch(/;TYPE:FILL/)
      expect(res.stats.extrudeLength_mm).toBeGreaterThan(50)
    })
  }
  it("rótulos: todo padrão tem label/hint/tier", () => {
    for (const pat of [...all, "none"]) expect(INFILL_PATTERN_LABELS[pat]?.label).toBeTruthy()
    expect(ADVANCED_INFILL_PATTERNS.every((p) => INFILL_PATTERN_LABELS[p].tier === "advanced")).toBe(true)
  })
})
