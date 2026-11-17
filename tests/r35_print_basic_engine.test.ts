/**
 * R35 · Impressão Básica — motor portado do racional MIA Print 2
 * (3 cabeçotes, superfícies mesa/Petri/lâmina/multiwell, extrusão
 * pneumática / volumétrica / filamento, G-code Marlin).
 */
import { describe, it, expect } from "vitest"
import {
  defaultState, defaultHead, defaultShape, buildToolpaths, generateGcode, validate,
  wellOffsets, allWells, surfaceExtent, MULTIWELL, GAUGES, HEAD_TYPES, MAX_HEADS, layerCount, infillLinear, rectPts,
  INFILL, generateInfill, shapeRegion, shapeFromStroke, inset,
} from "@/lib/print-basic/engine"

describe("R35 · estado padrão e cabeçotes", () => {
  it("tem exatamente 3 cabeçotes (T0..T2), só o primeiro ativo", () => {
    const s = defaultState()
    expect(s.heads).toHaveLength(3)
    expect(MAX_HEADS).toBe(3)
    expect(s.heads.map((h) => h.enabled)).toEqual([true, false, false])
    expect(s.heads.map((h) => h.id)).toEqual([1, 2, 3])
  })
  it("defaultHead copia o modelo de extrusão da MIA (gauge 22 → 0,41 mm; M106/M107)", () => {
    const h = defaultHead(0)
    expect(h.gauge).toBe(22); expect(h.lineWidth).toBe(GAUGES[22]); expect(GAUGES[22]).toBe(0.41)
    expect(h.onCmd).toBe("M106 S255"); expect(h.offCmd).toBe("M107"); expect(h.filamentD).toBe(1.75)
    expect(["filament", "volumetric", "pneumatic"]).toContain(h.extrusionMode)
  })
  it("tipos de cabeçote mapeiam para os 3 modos de extrusão", () => {
    const modes = new Set(HEAD_TYPES.map((t) => t.ext))
    expect(modes.has("pneumatic")).toBe(true); expect(modes.has("volumetric")).toBe(true); expect(modes.has("filament")).toBe(true)
    expect(HEAD_TYPES.find((t) => t.id === "syringe")?.ext).toBe("volumetric")
    expect(HEAD_TYPES.find((t) => t.id === "thermo")?.ext).toBe("filament")
  })
})

describe("R35 · superfícies", () => {
  it("mesa quadrada 220 (Ender 3) com margem", () => {
    const s = defaultState(); s.surface = { ...s.surface, kind: "bed", bedShape: "square", bedSize: "220", margin: 5 }
    const e = surfaceExtent(s.surface)
    expect(e.w).toBe(220); expect(e.usableW).toBe(210); expect(e.round).toBe(false)
    expect(wellOffsets(s.surface)).toEqual([{ name: "", x: 0, y: 0 }])
  })
  it("mesa redonda e Petri são redondas; lâmina é retangular 75×25", () => {
    const s = defaultState()
    expect(surfaceExtent({ ...s.surface, kind: "bed", bedShape: "round", bedSize: "200" }).round).toBe(true)
    const p = surfaceExtent({ ...s.surface, kind: "petri", petri: "60", margin: 2 })
    expect(p.round).toBe(true); expect(p.w).toBe(60); expect(p.usableW).toBeCloseTo(52 - 4)
    const l = surfaceExtent({ ...s.surface, kind: "slide", slide: "25x75", margin: 1 })
    expect(l.w).toBe(75); expect(l.h).toBe(25); expect(l.usableW).toBe(73); expect(l.usableH).toBe(23)
  })
  it("placas multiwell: 6/12/24/48/96 poços com geometria ANSI/SLAS", () => {
    for (const sp of MULTIWELL) {
      const w = allWells(sp)
      expect(w).toHaveLength(sp.id)
      expect(w[0].name).toBe("A1")
      // A1 fica no quadrante superior-esquerdo (x<0, y>0)
      expect(w[0].x).toBeLessThan(0); expect(w[0].y).toBeGreaterThan(0)
      // pitch entre A1 e A2
      expect(w[1].x - w[0].x).toBeCloseTo(sp.pitch, 2)
    }
    const p96 = MULTIWELL.find((m) => m.id === 96)!
    expect(allWells(p96).at(-1)?.name).toBe("H12")
  })
  it("seleção de poços filtra offsets; vazio = todos; inválido cai para todos", () => {
    const s = defaultState(); s.surface = { ...s.surface, kind: "multiwell", wells: 24, selectedWells: ["a1", "D6"] }
    const o = wellOffsets(s.surface)
    expect(o.map((w) => w.name)).toEqual(["A1", "D6"])
    expect(wellOffsets({ ...s.surface, selectedWells: [] })).toHaveLength(24)
    expect(wellOffsets({ ...s.surface, selectedWells: ["Z9"] })).toHaveLength(24)
  })
})

describe("R35 · validação e camadas", () => {
  it("rejeita objeto maior que o poço e cabeçote desativado", () => {
    const s = defaultState(); s.surface = { ...s.surface, kind: "multiwell", wells: 96, selectedWells: ["A1"] }
    s.shapes = [{ ...defaultShape("disc", 2), id: "x", size: 10 }]
    const v = validate(s)
    expect(v.errors.some((e) => /não cabe/.test(e))).toBe(true)
    expect(v.errors.some((e) => /desativado/.test(e))).toBe(true)
  })
  it("conta camadas a partir da altura e primeira camada", () => {
    const s = defaultState(); s.layerSettings = { ...s.layerSettings, layerHeight: 0.4, firstLayerPct: 100 }
    s.shapes = [{ ...defaultShape("disc", 1), id: "d", height: 2 }]
    expect(layerCount(s)).toBe(5)
    s.shapes = [{ ...defaultShape("lines", 1), id: "l" }]
    expect(layerCount(s)).toBe(1)
  })
  it("infill linear recorta por polígono", () => {
    const sq = rectPts(0, 0, 10, 10)
    const lines = infillLinear([sq], 1, 0)
    expect(lines.length).toBeGreaterThanOrEqual(9)
    for (const l of lines) for (const p of l) { expect(Math.abs(p.x)).toBeLessThanOrEqual(5 + 1e-6); expect(Math.abs(p.y)).toBeLessThanOrEqual(5 + 1e-6) }
  })
  it("malha alterna 0°/90° entre camadas", () => {
    const s = defaultState(); s.shapes = [{ ...defaultShape("lattice", 1), id: "m", size: 10, size2: 1, height: 1 }]
    s.layerSettings = { ...s.layerSettings, layerHeight: 0.5, firstLayerPct: 100 }
    const tp = buildToolpaths(s)
    expect(tp).toHaveLength(2)
    const horiz = tp[0].paths.every((p) => Math.abs(p.pts[0].y - p.pts[1].y) < 1e-9)
    const vert = tp[1].paths.every((p) => Math.abs(p.pts[0].x - p.pts[1].x) < 1e-9)
    expect(horiz).toBe(true); expect(vert).toBe(true)
  })
})

describe("R36 · preenchimentos (6 padrões MIA) e desenho livre", () => {
  const disc = () => shapeRegion({ ...defaultShape("disc", 1), size: 10 })
  const ring = () => shapeRegion({ ...defaultShape("ring", 1), size: 8, size2: 4 })
  it("lista os 6 padrões + nenhum", () => {
    expect(INFILL.map((i) => i.id)).toEqual(["grid", "gyroid", "honeycomb", "meandering", "linear", "concentric", "spiral", "none"])
  })
  it("cada padrão gera trajetórias dentro do disco e termina (sem anéis infinitos)", () => {
    for (const p of INFILL) {
      const lines = generateInfill(p.id, disc(), 0.41, 0.3, 45)
      if (p.id === "none") { expect(lines).toHaveLength(0); continue }
      expect(lines.length).toBeGreaterThan(0)
      expect(lines.length).toBeLessThan(200)
      for (const l of lines) for (const q of l) expect(Math.hypot(q.x, q.y)).toBeLessThanOrEqual(5 + 0.05)
    }
  })
  it("anel: inset consome o par externo/furo quando se encontram (concêntrico finito)", () => {
    let cur = ring(); let n = 0
    while (cur.length && n < 50) { cur = inset(cur, 0.8); n++ }
    expect(n).toBeLessThan(10)
    const conc = generateInfill("concentric", ring(), 0.41, 0.3, 0)
    expect(conc.length).toBeGreaterThan(0); expect(conc.length).toBeLessThan(40)
  })
  it("giroide: seção da TPMS por camada, dentro da região, variando com z", () => {
    const z0 = generateInfill("gyroid", disc(), 0.41, 0.3, 0, 0), z1 = generateInfill("gyroid", disc(), 0.41, 0.3, 0, 0.8)
    expect(z0.length).toBeGreaterThan(3); expect(z1.length).toBeGreaterThan(3)
    for (const l of [...z0, ...z1]) for (const q of l) expect(Math.hypot(q.x, q.y)).toBeLessThanOrEqual(5 + 0.05)
    // muda com a altura (sin(z)·cos(x) termo)
    const sig = (L: typeof z0) => L.reduce((n, l) => n + l.length, 0)
    expect(sig(z0)).not.toBe(sig(z1))
    // integra no fatiamento: camadas diferentes → trajetórias diferentes
    const s = defaultState(); s.layerSettings = { ...s.layerSettings, infillPattern: "gyroid", layerHeight: 0.4, firstLayerPct: 100, infillDensity: 30 }
    s.shapes = [{ ...defaultShape("disc", 1), id: "d", size: 10, height: 1.2 }]
    const tp = buildToolpaths(s)
    expect(tp).toHaveLength(3)
    const a = tp[0].paths.filter((p) => p.kind === "infill"), b = tp[1].paths.filter((p) => p.kind === "infill")
    expect(a.length).toBeGreaterThan(0); expect(JSON.stringify(a[0].pts.slice(0, 3))).not.toBe(JSON.stringify(b[0].pts.slice(0, 3)))
  })
  it("espiral é uma trajetória contínua única em região simples", () => {
    const sp = generateInfill("spiral", disc(), 0.41, 0.3, 0)
    expect(sp).toHaveLength(1); expect(sp[0].length).toBeGreaterThan(96)
  })
  it("meandro liga faixas em serpentina (menos trajetórias que linear)", () => {
    const lin = generateInfill("linear", disc(), 0.41, 0.3, 0), me = generateInfill("meandering", disc(), 0.41, 0.3, 0)
    expect(me.length).toBeLessThan(lin.length)
  })
  it("desenho fechado vira sólido com perímetro + preenchimento; aberto vira traço", () => {
    const star = Array.from({ length: 40 }, (_, i) => { const a = (i / 40) * Math.PI * 2; const r = i % 2 ? 4 : 8; return { x: r * Math.cos(a), y: r * Math.sin(a) } })
    const poly = shapeFromStroke(star, true, 1, 1.2)!
    expect(poly.type).toBe("polygon"); expect(poly.solid).toBe(true); expect(poly.pts!.length).toBeGreaterThan(10)
    const open = shapeFromStroke([{ x: -10, y: 0 }, { x: 0, y: 2 }, { x: 10, y: 0 }], false, 2)!
    expect(open.type).toBe("path"); expect(open.head).toBe(2); expect(open.height).toBe(0)
    const s = defaultState(); s.heads[1].enabled = true
    s.layerSettings = { ...s.layerSettings, layerHeight: 0.4, firstLayerPct: 100, infillPattern: "grid" }
    s.shapes = [poly, open]
    expect(validate(s).errors).toEqual([])
    const tp = buildToolpaths(s)
    expect(tp).toHaveLength(3)
    const kinds = new Set(tp[0].paths.map((p) => p.kind))
    expect(kinds.has("external perimeter")).toBe(true); expect(kinds.has("infill")).toBe(true); expect(kinds.has("line")).toBe(true)
    expect(tp[1].paths.some((p) => p.kind === "line")).toBe(false) // traço aberto só na 1ª camada
    expect(shapeFromStroke([{ x: 0, y: 0 }], true)).toBeNull()
  })
  it("origem na agulha: G92 X0 Y0 Z0, sem G28, coordenadas relativas ao centro", () => {
    const s = defaultState(); s.shapes = [{ ...defaultShape("disc", 1), id: "d", size: 4, height: 0.4 }]
    s.layerSettings = { ...s.layerSettings, layerHeight: 0.4, firstLayerPct: 100 }
    const { lines } = generateGcode(s)
    expect(lines.some((l) => l.startsWith("G92 X0 Y0 Z0"))).toBe(true)
    expect(lines.some((l) => l.startsWith("G28"))).toBe(false)
    const xs = lines.filter((l) => /^G[01] X/.test(l)).map((l) => +/X(-?[\d.]+)/.exec(l)![1])
    expect(Math.max(...xs)).toBeLessThanOrEqual(2.1); expect(Math.min(...xs)).toBeGreaterThanOrEqual(-2.1)
  })
})

describe("R35 · G-code (porta do MIA slicer)", () => {
  function tri() {
    const s = defaultState()
    s.heads[0] = { ...s.heads[0], extrusionMode: "pneumatic", type: "pneumatic3", onCmd: "M106 S255", offCmd: "M107" }
    s.heads[1] = { ...s.heads[1], enabled: true, extrusionMode: "volumetric", type: "syringe" }
    s.heads[2] = { ...s.heads[2], enabled: true, extrusionMode: "filament", type: "thermo", temp: 80 }
    s.shapes = [
      { ...defaultShape("disc", 1), id: "a", x: -6, size: 6, height: 0.8 },
      { ...defaultShape("square", 2), id: "b", x: 6, size: 6, height: 0.8 },
      { ...defaultShape("lines", 3), id: "c", y: -8, size: 10, count: 3 },
    ]
    s.surface = { ...s.surface, kind: "petri", petri: "60", margin: 2 }
    s.layerSettings = { ...s.layerSettings, layerHeight: 0.4, firstLayerPct: 100 }
    return s
  }
  it("cabeçalho Marlin: M200 D0 só com volumétrico, M83 com E, T0..T2, M104/M109 para filamento aquecido", () => {
    const s = tri()
    const { lines, stats } = generateGcode(s)
    expect(lines).toContain("G21 ; set units to millimeters")
    expect(lines.some((l) => l.startsWith("M200 D0"))).toBe(true)
    expect(lines.some((l) => l.startsWith("M83"))).toBe(true)
    expect(lines.some((l) => l.startsWith("T0 "))).toBe(true)
    expect(lines.some((l) => l.startsWith("T1 "))).toBe(true)
    expect(lines.some((l) => l.startsWith("T2 "))).toBe(true)
    expect(lines.some((l) => /^T[3-9]/.test(l))).toBe(false)
    expect(lines.some((l) => l.startsWith("M104 T2 S80"))).toBe(true)
    expect(lines.some((l) => l.startsWith("M109 T2 S80"))).toBe(true)
    expect(stats.layers).toBe(2)
    expect(Object.keys(stats.perHead).map(Number).sort()).toEqual([1, 2, 3])
  })
  it("pneumático usa M106/M107 e G1 sem E; volumétrico e filamento usam E", () => {
    const s = tri()
    const { lines } = generateGcode(s)
    // segmenta por cabeçote ativo
    let head = -1; const byHead: Record<number, string[]> = { 0: [], 1: [], 2: [] }
    for (const l of lines) { const m = /^T(\d)/.exec(l); if (m) { head = +m[1]; continue } if (head >= 0 && /^G1 X/.test(l)) byHead[head].push(l) }
    expect(byHead[0].length).toBeGreaterThan(0); expect(byHead[0].every((l) => !/ E/.test(l))).toBe(true)
    expect(byHead[1].length).toBeGreaterThan(0); expect(byHead[1].every((l) => / E\d/.test(l))).toBe(true)
    expect(byHead[2].length).toBeGreaterThan(0); expect(byHead[2].every((l) => / E\d/.test(l))).toBe(true)
    expect(lines.some((l) => l.startsWith("M106 S255 ; extrusion on"))).toBe(true)
    expect(lines.some((l) => l.startsWith("M107 ; extrusion off"))).toBe(true)
  })
  it("E volumétrico = d·lw·h·flow (mm³); E filamento = volume / área do filamento", () => {
    const s = defaultState()
    s.shapes = [{ ...defaultShape("lines", 1), id: "l", size: 10, count: 1 }]
    s.layerSettings = { ...s.layerSettings, layerHeight: 0.4, firstLayerPct: 100 }
    s.heads[0] = { ...s.heads[0], extrusionMode: "volumetric", lineWidth: 0.41, flow: 100, retract: 0, zHop: 0 }
    const vol = generateGcode(s)
    const eVol = vol.lines.filter((l) => /^G1 X.* E/.test(l)).map((l) => +/E([\d.]+)/.exec(l)![1])
    expect(eVol).toHaveLength(1)
    expect(eVol[0]).toBeCloseTo(10 * 0.41 * 0.4, 3)
    s.heads[0] = { ...s.heads[0], extrusionMode: "filament", filamentD: 1.75 }
    const fil = generateGcode(s)
    const eFil = fil.lines.filter((l) => /^G1 X.* E/.test(l)).map((l) => +/E([\d.]+)/.exec(l)![1])
    expect(eFil[0]).toBeCloseTo((10 * 0.41 * 0.4) / (Math.PI * 0.875 ** 2), 3)
    expect(fil.lines.some((l) => l.startsWith("M200 D0"))).toBe(false)
  })
  it("multiwell replica o trabalho por poço com cabeçalhos WELL e deslocamento do centro", () => {
    const s = defaultState()
    s.shapes = [{ ...defaultShape("disc", 1), id: "d", size: 4, height: 0.4 }]
    s.layerSettings = { ...s.layerSettings, layerHeight: 0.4, firstLayerPct: 100 }
    s.surface = { ...s.surface, kind: "multiwell", wells: 24, selectedWells: ["A1", "B2"] }
    s.printer = { ...s.printer, origin: "bed", homeFirst: true }
    const { lines, stats } = generateGcode(s)
    expect(stats.wells).toBe(2)
    expect(lines.filter((l) => l.startsWith("; ===== WELL")).map((l) => l.split(" ")[3])).toEqual(["A1", "B2"])
    // centróide dos movimentos de extrusão de cada poço = centro do poço (mesa 110,110 + offset)
    const cent: Record<string, { x: number; y: number; n: number }> = {}
    let well = ""
    for (const l of lines) {
      const w = /^; ===== WELL (\w+)/.exec(l); if (w) { well = w[1]; cent[well] = { x: 0, y: 0, n: 0 }; continue }
      const m = /^G1 X([\d.]+) Y([\d.]+)/.exec(l); if (m && well) { cent[well].x += +m[1]; cent[well].y += +m[2]; cent[well].n++ }
    }
    const a1 = { x: cent.A1.x / cent.A1.n, y: cent.A1.y / cent.A1.n }, b2 = { x: cent.B2.x / cent.B2.n, y: cent.B2.y / cent.B2.n }
    expect(b2.x - a1.x).toBeCloseTo(19.3, 1); expect(a1.y - b2.y).toBeCloseTo(19.3, 1)
    const sp = MULTIWELL.find((m) => m.id === 24)!
    const A1 = allWells(sp)[0]
    expect(a1.x).toBeCloseTo(110 + A1.x, 1); expect(a1.y).toBeCloseTo(110 + A1.y, 1)
  })
  it("meta BIA_META identifica o gerador e os modos por cabeçote", () => {
    const { lines } = generateGcode(tri())
    const meta = lines.find((l) => l.startsWith("; BIA_META "))!
    const j = JSON.parse(meta.slice("; BIA_META ".length))
    expect(j.generator).toBe("bia-print-basic-r36")
    expect(j.heads).toEqual([{ t: 0, mode: "pneumatic" }, { t: 1, mode: "volumetric" }, { t: 2, mode: "filament" }])
  })
})
