/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R14.3 — BIA Studio Sprint 1: Scaffold Generator (TPMS)
 *  ─────────────────────────────────────────────────────────────────────
 *  DECISÃO (Janaina, 2026-10-19):
 *   A plataforma BIA passa a GERAR o STL (não só receber). Primeira etapa:
 *   scaffolds porosos matematicamente perfeitos (gyroid/schwarz-p/diamond)
 *   via marching cubes puro TS, zero deps, roda em edge/browser/node.
 *
 *   Comando de voz pt-BR via Web Speech API (grátis, nativa do browser).
 *   Parser determinístico pt-BR extrai dimensões + porosidade + preset.
 *
 *  ESTE ARQUIVO TRAVA:
 *   A) TPMS engine: funções matemáticas corretas (gyroid/schwarz_p/diamond)
 *   B) Validação de parâmetros (ranges + mensagens pt-BR)
 *   C) Marching cubes gera mesh não-vazia + stats consistentes
 *   D) Porosidade calculada é coerente com wallThickness
 *   E) STL binário tem layout correto (header 80 + count 4 + 50/triangle)
 *   F) STL ASCII válido estruturalmente
 *   G) Parser pt-BR extrai dimensões (mm/cm, 1D/2D/3D)
 *   H) Parser identifica porosidade + TPMS + preset clínico
 *   I) Parser fallback para defaults quando prompt é vago
 *   J) Presets clínicos têm cobertura das 6 principais aplicações
 *   K) Arquivos da UI existem (StudioClient, page.tsx, API route)
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

import {
  evaluateTPMS,
  validateTPMSParams,
  generateTPMSMesh,
  porosityToWallThickness,
  presetToTPMSParams,
  CLINICAL_PRESETS,
  type TPMSKind,
  type TPMSParams,
} from "../src/lib/studio/tpms"

import {
  meshToSTLBinary,
  meshToSTLAscii,
  validateSTLBinary,
  predictSTLSize,
} from "../src/lib/studio/stl-exporter"

import {
  parseScaffoldPrompt,
  describeParseResult,
  PRESET_LABELS,
} from "../src/lib/studio/parser"

const ROOT = resolve(__dirname, "..")
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8")

/* ══════════════════════════════════════════════════════════════════════
 *  A) TPMS engine — matemática correta
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.3 · A) TPMS engine · funções matemáticas", () => {

  it("gyroid(0,0,0) = 0 (ponto de origem é zero-level)", () => {
    expect(evaluateTPMS("gyroid", 0, 0, 0)).toBeCloseTo(0, 10)
  })

  it("schwarz_p(0,0,0) = 3 (cos de todos zero)", () => {
    expect(evaluateTPMS("schwarz_p", 0, 0, 0)).toBeCloseTo(3, 10)
  })

  it("diamond(0,0,0) = 0", () => {
    expect(evaluateTPMS("diamond", 0, 0, 0)).toBeCloseTo(0, 10)
  })

  it("gyroid é periódica (período 2π em cada eixo)", () => {
    for (const [x, y, z] of [[0.5, 1.2, 2.1], [1.0, 0.3, 2.5], [2.1, 0.9, 1.4]]) {
      const a = evaluateTPMS("gyroid", x, y, z)
      const b = evaluateTPMS("gyroid", x + 2 * Math.PI, y, z)
      const c = evaluateTPMS("gyroid", x, y + 2 * Math.PI, z + 2 * Math.PI)
      expect(a).toBeCloseTo(b, 8)
      expect(a).toBeCloseTo(c, 8)
    }
  })

  it("todas as TPMS têm range aproximado [-k, +k] com k≤3", () => {
    const kinds: TPMSKind[] = ["gyroid", "schwarz_p", "diamond"]
    for (const k of kinds) {
      let min = Infinity, max = -Infinity
      for (let i = 0; i < 1000; i++) {
        const x = Math.random() * 2 * Math.PI
        const y = Math.random() * 2 * Math.PI
        const z = Math.random() * 2 * Math.PI
        const v = evaluateTPMS(k, x, y, z)
        if (v < min) min = v
        if (v > max) max = v
      }
      expect(min, `${k} min`).toBeGreaterThanOrEqual(-3.1)
      expect(max, `${k} max`).toBeLessThanOrEqual(3.1)
    }
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  B) Validação de parâmetros
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.3 · B) validateTPMSParams · ranges + mensagens pt-BR", () => {

  const valid: TPMSParams = {
    kind: "gyroid", sizeX: 20, sizeY: 20, sizeZ: 10,
    resolution: 48, cellsPerAxis: 4, wallThickness: 0.3,
  }

  it("aceita parâmetros válidos sem throw", () => {
    expect(() => validateTPMSParams(valid)).not.toThrow()
  })

  it("rejeita kind inválido com mensagem clara", () => {
    expect(() => validateTPMSParams({ ...valid, kind: "cubic" as TPMSKind }))
      .toThrow(/TPMS inválido/)
  })

  it("rejeita sizeX <= 0", () => {
    expect(() => validateTPMSParams({ ...valid, sizeX: 0 })).toThrow(/sizeX/)
    expect(() => validateTPMSParams({ ...valid, sizeX: -5 })).toThrow(/sizeX/)
  })

  it("rejeita sizeX > 500 (seguro contra OOM)", () => {
    expect(() => validateTPMSParams({ ...valid, sizeX: 1000 })).toThrow(/500/)
  })

  it("rejeita resolution fora de [16, 128]", () => {
    expect(() => validateTPMSParams({ ...valid, resolution: 8 })).toThrow(/resolution/)
    expect(() => validateTPMSParams({ ...valid, resolution: 256 })).toThrow(/resolution/)
    expect(() => validateTPMSParams({ ...valid, resolution: 32.5 })).toThrow(/resolution/)
  })

  it("rejeita cellsPerAxis fora de [1, 20]", () => {
    expect(() => validateTPMSParams({ ...valid, cellsPerAxis: 0 })).toThrow(/cellsPerAxis/)
    expect(() => validateTPMSParams({ ...valid, cellsPerAxis: 50 })).toThrow(/cellsPerAxis/)
  })

  it("rejeita wallThickness fora de [0.0, 1.0]", () => {
    expect(() => validateTPMSParams({ ...valid, wallThickness: -0.1 })).toThrow(/wallThickness/)
    expect(() => validateTPMSParams({ ...valid, wallThickness: 1.5 })).toThrow(/wallThickness/)
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  C) Marching cubes · mesh válida + stats
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.3 · C) generateTPMSMesh · mesh e stats", () => {

  it("gera mesh não-vazia para gyroid 20×20×10 mm", () => {
    const mesh = generateTPMSMesh({
      kind: "gyroid", sizeX: 20, sizeY: 20, sizeZ: 10,
      resolution: 32, cellsPerAxis: 3, wallThickness: 0.3,
    })
    expect(mesh.vertices.length).toBeGreaterThan(0)
    expect(mesh.indices.length).toBeGreaterThan(0)
    expect(mesh.indices.length % 3).toBe(0)
    expect(mesh.stats.triangleCount).toBe(mesh.indices.length / 3)
    expect(mesh.stats.vertexCount).toBe(mesh.vertices.length / 3)
  })

  it("gera mesh para todos os 3 tipos TPMS", () => {
    const kinds: TPMSKind[] = ["gyroid", "schwarz_p", "diamond"]
    for (const kind of kinds) {
      const mesh = generateTPMSMesh({
        kind, sizeX: 10, sizeY: 10, sizeZ: 10,
        resolution: 24, cellsPerAxis: 2, wallThickness: 0.4,
      })
      expect(mesh.stats.triangleCount, `${kind}`).toBeGreaterThan(0)
    }
  })

  it("vertices são Float32Array; indices são Uint32Array", () => {
    const mesh = generateTPMSMesh({
      kind: "gyroid", sizeX: 10, sizeY: 10, sizeZ: 10,
      resolution: 24, cellsPerAxis: 2, wallThickness: 0.3,
    })
    expect(mesh.vertices).toBeInstanceOf(Float32Array)
    expect(mesh.indices).toBeInstanceOf(Uint32Array)
    expect(mesh.normals).toBeInstanceOf(Float32Array)
    expect(mesh.normals.length).toBe(mesh.vertices.length)
  })

  it("bounds correspondem ao sizeX/Y/Z dos parâmetros", () => {
    const mesh = generateTPMSMesh({
      kind: "diamond", sizeX: 30, sizeY: 20, sizeZ: 15,
      resolution: 24, cellsPerAxis: 2, wallThickness: 0.3,
    })
    expect(mesh.stats.bounds.max[0]).toBe(30)
    expect(mesh.stats.bounds.max[1]).toBe(20)
    expect(mesh.stats.bounds.max[2]).toBe(15)
  })

  it("porosidade sobe quando wallThickness cai (gyroid)", () => {
    const base = { kind: "gyroid" as TPMSKind, sizeX: 15, sizeY: 15, sizeZ: 15, resolution: 32, cellsPerAxis: 3 }
    const thinWall = generateTPMSMesh({ ...base, wallThickness: 0.1 })
    const thickWall = generateTPMSMesh({ ...base, wallThickness: 0.9 })
    expect(thinWall.stats.porosity).toBeGreaterThan(thickWall.stats.porosity)
  })

  it("volume_mm3 nunca excede sizeX·sizeY·sizeZ", () => {
    const mesh = generateTPMSMesh({
      kind: "gyroid", sizeX: 20, sizeY: 20, sizeZ: 20,
      resolution: 24, cellsPerAxis: 3, wallThickness: 0.3,
    })
    const bboxVolume = 20 * 20 * 20
    expect(mesh.stats.volume_mm3).toBeLessThanOrEqual(bboxVolume)
    expect(mesh.stats.volume_mm3).toBeGreaterThan(0)
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  D) Porosidade ↔ wallThickness
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.3 · D) porosityToWallThickness", () => {

  it("rejeita porosidade fora de (0, 1)", () => {
    expect(() => porosityToWallThickness(0, "gyroid")).toThrow()
    expect(() => porosityToWallThickness(1, "gyroid")).toThrow()
    expect(() => porosityToWallThickness(1.5, "gyroid")).toThrow()
  })

  it("quanto maior porosidade, menor wallThickness", () => {
    const low  = porosityToWallThickness(0.3, "gyroid")
    const mid  = porosityToWallThickness(0.6, "gyroid")
    const high = porosityToWallThickness(0.9, "gyroid")
    expect(low).toBeGreaterThan(mid)
    expect(mid).toBeGreaterThan(high)
  })

  it("retorna valor em [0, 1]", () => {
    for (const p of [0.1, 0.5, 0.75, 0.95]) {
      for (const k of ["gyroid", "schwarz_p", "diamond"] as TPMSKind[]) {
        const w = porosityToWallThickness(p, k)
        expect(w).toBeGreaterThanOrEqual(0)
        expect(w).toBeLessThanOrEqual(1)
      }
    }
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  E) STL binário · layout correto
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.3 · E) STL exporter · binário", () => {

  const mesh = generateTPMSMesh({
    kind: "gyroid", sizeX: 10, sizeY: 10, sizeZ: 10,
    resolution: 24, cellsPerAxis: 2, wallThickness: 0.3,
  })

  it("header tem 80 bytes + 4 bytes de contagem = 84 bytes de prelude", () => {
    const buf = meshToSTLBinary(mesh)
    const view = new DataView(buf)
    const count = view.getUint32(80, true)
    expect(count).toBe(mesh.stats.triangleCount)
    expect(buf.byteLength).toBe(84 + count * 50)
  })

  it("predictSTLSize corresponde ao tamanho real", () => {
    const buf = meshToSTLBinary(mesh)
    expect(predictSTLSize(mesh.stats.triangleCount)).toBe(buf.byteLength)
  })

  it("validateSTLBinary aceita um STL recém-gerado", () => {
    const buf = meshToSTLBinary(mesh)
    const r = validateSTLBinary(buf)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.triangleCount).toBe(mesh.stats.triangleCount)
  })

  it("validateSTLBinary rejeita buffer truncado", () => {
    const buf = meshToSTLBinary(mesh)
    const truncated = buf.slice(0, buf.byteLength - 10)
    const r = validateSTLBinary(truncated)
    expect(r.ok).toBe(false)
  })

  it("validateSTLBinary rejeita buffer vazio", () => {
    const r = validateSTLBinary(new ArrayBuffer(10))
    expect(r.ok).toBe(false)
  })

  it("header contém o comentário customizado", () => {
    const buf = meshToSTLBinary(mesh, "Minha custom header")
    const headerBytes = new Uint8Array(buf, 0, 80)
    const decoder = new TextDecoder()
    const header = decoder.decode(headerBytes).replace(/\0+$/, "")
    expect(header).toContain("Minha custom header")
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  F) STL ASCII · estrutura
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.3 · F) STL exporter · ASCII", () => {

  const smallMesh = generateTPMSMesh({
    kind: "gyroid", sizeX: 5, sizeY: 5, sizeZ: 5,
    resolution: 16, cellsPerAxis: 1, wallThickness: 0.3,
  })

  it("começa com 'solid' e termina com 'endsolid'", () => {
    const ascii = meshToSTLAscii(smallMesh, "test_mesh")
    expect(ascii).toMatch(/^solid test_mesh/)
    expect(ascii.trim()).toMatch(/endsolid test_mesh$/)
  })

  it("conta de 'facet normal' bate com triangleCount", () => {
    const ascii = meshToSTLAscii(smallMesh)
    const facets = (ascii.match(/facet normal/g) ?? []).length
    expect(facets).toBe(smallMesh.stats.triangleCount)
  })

  it("cada facet tem 'outer loop' + 3 vértices + 'endloop' + 'endfacet'", () => {
    const ascii = meshToSTLAscii(smallMesh)
    const facets = (ascii.match(/facet normal/g) ?? []).length
    expect((ascii.match(/outer loop/g) ?? []).length).toBe(facets)
    expect((ascii.match(/endloop/g) ?? []).length).toBe(facets)
    expect((ascii.match(/endfacet/g) ?? []).length).toBe(facets)
    expect((ascii.match(/vertex/g) ?? []).length).toBe(facets * 3)
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  G) Parser pt-BR · dimensões
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.3 · G) Parser · dimensões", () => {

  it("extrai 3D em mm: '20x15x10 mm' (dimensões vão em anatomy)", () => {
    const r = parseScaffoldPrompt("Scaffold 20x15x10 mm gyroid")
    expect(r.anatomy.sizeX).toBe(20)
    expect(r.anatomy.sizeY).toBe(15)
    expect(r.anatomy.sizeZ).toBe(10)
  })

  it("extrai 3D em cm: '2x1.5x1 cm' → 20x15x10 mm", () => {
    const r = parseScaffoldPrompt("Scaffold 2x1.5x1 cm")
    expect(r.anatomy.sizeX).toBe(20)
    expect(r.anatomy.sizeY).toBe(15)
    expect(r.anatomy.sizeZ).toBe(10)
  })

  it("aceita vírgula decimal pt-BR: '1,5 cm'", () => {
    const r = parseScaffoldPrompt("Scaffold 1,5 cm cubo gyroid")
    expect(r.anatomy.sizeX).toBe(15)
  })

  it("fallback 2D: assume espessura 3 mm e warning", () => {
    const r = parseScaffoldPrompt("Scaffold 20x15 mm")
    expect(r.anatomy.sizeX).toBe(20)
    expect(r.anatomy.sizeY).toBe(15)
    expect(r.anatomy.sizeZ).toBe(3)
    expect(r.warnings.some(w => w.toLowerCase().includes("espessura"))).toBe(true)
  })

  it("fallback 1D: gera cubo e warning", () => {
    const r = parseScaffoldPrompt("Scaffold 15 mm gyroid")
    expect(r.anatomy.sizeX).toBe(15)
    expect(r.anatomy.sizeY).toBe(15)
    expect(r.anatomy.sizeZ).toBe(15)
    expect(r.warnings.some(w => w.toLowerCase().includes("cubo"))).toBe(true)
  })

  it("R14.4 · sem dimensões + sem preset + sem forma: fallback block + warning", () => {
    // Prompt vago → forma anatômica default = block (bloco)
    const r = parseScaffoldPrompt("Quero gerar um scaffold básico")
    // Block tem dimensões típicas 20×20×10
    expect(r.anatomy.kind).toBe("block")
    expect(r.anatomy.sizeX).toBe(20)
    expect(r.anatomy.sizeY).toBe(20)
    expect(r.anatomy.sizeZ).toBe(10)
    // Warning avisa que caiu no fallback (sem forma OU sem dimensões)
    const hasAnyWarn = r.warnings.some(w => /anat[ôo]mica|bloco|default|dimens/i.test(w))
    expect(hasAnyWarn).toBe(true)
  })

  it("R14.4 · sem dimensões MAS com preset: infere forma + dimensões típicas", () => {
    // Com preset identificado → forma anatômica inferida (ex: ósseo esponjoso → femur_seg)
    const r = parseScaffoldPrompt("Quero um scaffold ósseo")
    expect(r.presetId).toBe("scaffold_ossea_esponjosa")
    expect(r.anatomy.sizeX).toBeGreaterThan(0)
    expect(r.anatomy.kind).toBe("femur_seg") // inferido do preset
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  H) Parser · porosidade + TPMS + preset clínico
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.3 · H) Parser · porosidade/TPMS/preset", () => {

  it("extrai porosidade em %: '70% porosidade'", () => {
    const r = parseScaffoldPrompt("Scaffold 15x15x5 mm 70% porosidade gyroid")
    expect(r.extracted.porosity).toBeCloseTo(0.7, 2)
  })

  it("extrai porosidade por extenso: 'porosidade 85 por cento'", () => {
    const r = parseScaffoldPrompt("Scaffold 15x15x5 mm porosidade 85 por cento")
    expect(r.extracted.porosity).toBeCloseTo(0.85, 2)
  })

  it("extrai porosidade decimal: 'porosidade 0.75'", () => {
    const r = parseScaffoldPrompt("Scaffold 15x15x5 mm porosidade 0.75 gyroid")
    expect(r.extracted.porosity).toBeCloseTo(0.75, 2)
  })

  it("identifica gyroid (3 grafias): gyroid, giroide, giroid — vai em tpmsParams (infill, não STL)", () => {
    for (const kw of ["gyroid", "giroide", "giroid"]) {
      const r = parseScaffoldPrompt(`Scaffold 10 mm ${kw}`)
      expect(r.tpmsParams.kind).toBe("gyroid")
      expect(r.infillSuggestion.pattern).toBe("gyroid")
    }
  })

  it("identifica schwarz_p (variantes): 'schwarz', 'schwarz-p'", () => {
    for (const kw of ["schwarz", "schwarz-p"]) {
      const r = parseScaffoldPrompt(`Scaffold 10 mm ${kw}`)
      expect(r.tpmsParams.kind).toBe("schwarz_p")
    }
  })

  it("identifica diamond (pt+en): 'diamond', 'diamante'", () => {
    for (const kw of ["diamond", "diamante"]) {
      const r = parseScaffoldPrompt(`Scaffold 10 mm ${kw}`)
      expect(r.tpmsParams.kind).toBe("diamond")
    }
  })

  it("identifica preset ortopédico esponjoso por 'esponjoso'", () => {
    const r = parseScaffoldPrompt("Scaffold ósseo esponjoso 20x20x10 mm")
    expect(r.presetId).toBe("scaffold_ossea_esponjosa")
  })

  it("identifica preset cortical por 'cortical' ou 'calota'", () => {
    expect(parseScaffoldPrompt("osso cortical 10 mm").presetId).toBe("scaffold_ossea_cortical")
    expect(parseScaffoldPrompt("calota craniana 50x40x3 mm").presetId).toBe("scaffold_ossea_cortical")
  })

  it("identifica preset cartilagem", () => {
    expect(parseScaffoldPrompt("cartilagem articular 15 mm").presetId).toBe("scaffold_cartilagem")
  })

  it("identifica preset pele", () => {
    expect(parseScaffoldPrompt("scaffold de pele queimadura 25x25x2 mm").presetId).toBe("scaffold_pele")
  })

  it("identifica preset alveolar (odonto)", () => {
    expect(parseScaffoldPrompt("enxerto alveolar 10x8x5 mm").presetId).toBe("scaffold_alveolar")
  })

  it("fallback 'ósseo' sem especificar → esponjoso", () => {
    expect(parseScaffoldPrompt("scaffold ósseo 20 mm").presetId).toBe("scaffold_ossea_esponjosa")
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  I) Parser · robustez
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.3 · I) Parser · robustez e confidence", () => {

  it("rejeita prompt vazio ou só espaços", () => {
    expect(() => parseScaffoldPrompt("")).toThrow()
    expect(() => parseScaffoldPrompt("   ")).toThrow()
  })

  it("prompt completo tem confidence > 0.8", () => {
    const r = parseScaffoldPrompt("Scaffold ósseo esponjoso gyroid 20x20x10 mm porosidade 75%")
    expect(r.confidence).toBeGreaterThan(0.8)
  })

  it("prompt vago tem confidence < 0.5", () => {
    const r = parseScaffoldPrompt("Quero um scaffold")
    expect(r.confidence).toBeLessThan(0.5)
  })

  it("params do parser sempre validam", () => {
    const samples = [
      "Scaffold gyroid 15x15x5 mm porosidade 70",
      "Enxerto alveolar diamond 10 mm",
      "Pele 25x25x2 mm",
      "Osso esponjoso 20 mm 80%",
      "cartilagem articular 15x15x3 mm",
    ]
    for (const s of samples) {
      const r = parseScaffoldPrompt(s)
      // R14.4: TPMS vira infill (tpmsParams); anatomy é forma sólida.
      // Ambos devem ser válidos.
      expect(() => validateTPMSParams(r.tpmsParams), `tpms ${s}`).not.toThrow()
      expect(r.anatomy.sizeX, `anatomy ${s}`).toBeGreaterThan(0)
    }
  })

  it("describeParseResult retorna string legível pt-BR", () => {
    const r = parseScaffoldPrompt("scaffold ósseo esponjoso 20x20x10 mm 75%")
    const desc = describeParseResult(r)
    expect(desc).toContain("mm")
    expect(desc).toContain("Gyroid")
    expect(desc.length).toBeGreaterThan(20)
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  J) Presets clínicos
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.3 · J) Presets clínicos (6 principais)", () => {

  it("exporta exatamente 6 presets", () => {
    expect(Object.keys(CLINICAL_PRESETS)).toHaveLength(6)
  })

  it("todos os presets têm kind + porosityTarget + cellsPerAxis", () => {
    for (const [id, p] of Object.entries(CLINICAL_PRESETS)) {
      expect(p.kind, id).toMatch(/^(gyroid|schwarz_p|diamond)$/)
      expect(p.porosityTarget, id).toBeGreaterThan(0)
      expect(p.porosityTarget, id).toBeLessThan(1)
      expect(p.cellsPerAxis, id).toBeGreaterThan(0)
    }
  })

  it("todos os presets têm label pt-BR em PRESET_LABELS", () => {
    for (const id of Object.keys(CLINICAL_PRESETS)) {
      expect(PRESET_LABELS[id], id).toBeDefined()
      expect(PRESET_LABELS[id].length, id).toBeGreaterThan(5)
    }
  })

  it("presetToTPMSParams gera TPMSParams válidos", () => {
    for (const id of Object.keys(CLINICAL_PRESETS) as (keyof typeof CLINICAL_PRESETS)[]) {
      const p = presetToTPMSParams(id, 20, 20, 10)
      expect(() => validateTPMSParams(p), id).not.toThrow()
    }
  })

  it("preset cortical usa diamond (resistência mecânica)", () => {
    expect(CLINICAL_PRESETS.scaffold_ossea_cortical.kind).toBe("diamond")
  })

  it("preset pele usa schwarz_p (alta porosidade)", () => {
    expect(CLINICAL_PRESETS.scaffold_pele.kind).toBe("schwarz_p")
    expect(CLINICAL_PRESETS.scaffold_pele.porosityTarget).toBeGreaterThan(0.80)
  })

  it("preset alveolar porosidade 60-70% (osso denso)", () => {
    const p = CLINICAL_PRESETS.scaffold_alveolar
    expect(p.porosityTarget).toBeGreaterThanOrEqual(0.6)
    expect(p.porosityTarget).toBeLessThanOrEqual(0.75)
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  K) Arquivos de UI + API existem
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.3 · K) Arquivos de UI/API presentes", () => {

  it("src/app/dashboard/studio/page.tsx existe", () => {
    expect(existsSync(resolve(ROOT, "src/app/dashboard/studio/page.tsx"))).toBe(true)
  })

  it("src/app/dashboard/studio/StudioClient.tsx existe", () => {
    expect(existsSync(resolve(ROOT, "src/app/dashboard/studio/StudioClient.tsx"))).toBe(true)
  })

  it("StudioClient usa Web Speech API nativa (não biblioteca externa)", () => {
    const src = read("src/app/dashboard/studio/StudioClient.tsx")
    expect(src).toMatch(/SpeechRecognition|webkitSpeechRecognition/)
    expect(src).toMatch(/lang\s*=\s*["']pt-BR["']/)
  })

  it("StudioClient tem data-testids esperados", () => {
    const src = read("src/app/dashboard/studio/StudioClient.tsx")
    for (const id of [
      "studio-prompt-input",
      "studio-generate-button",
      "studio-mic-button",
      "studio-preview-canvas",
    ]) {
      expect(src, id).toContain(`"${id}"`)
    }
  })

  it("API route /api/studio/scaffold/generate existe", () => {
    expect(existsSync(resolve(ROOT, "src/app/api/studio/scaffold/generate/route.ts"))).toBe(true)
  })

  it("API route é runtime=nodejs (usa prisma + computação CPU)", () => {
    const src = read("src/app/api/studio/scaffold/generate/route.ts")
    expect(src).toMatch(/runtime\s*=\s*["']nodejs["']/)
    expect(src).toMatch(/export\s+async\s+function\s+POST/)
  })

  it("API route exige auth + verifica quota", () => {
    const src = read("src/app/api/studio/scaffold/generate/route.ts")
    expect(src).toContain("await auth()")
    expect(src).toContain("canUseFeature")
    expect(src).toContain("stl_upload")
  })

  it("DashboardSidebar inclui BIA Studio no grupo 'project'", () => {
    const src = read("src/components/layout/DashboardSidebar.tsx")
    expect(src).toContain("/dashboard/studio")
    expect(src).toContain("BIA Studio")
    expect(src).toContain("Sparkles")
  })

  it("QuickActions tem 'studio-scaffold' no catálogo", () => {
    const src = read("src/lib/user/quick-actions.ts")
    expect(src).toContain('id: "studio-scaffold"')
    expect(src).toContain("/dashboard/studio")
  })

  it("Perfis clínicos destacam BIA Studio nos highlightedActions", () => {
    const src = read("src/lib/user/profile.ts")
    // ortopedista + dermatologista + dentista
    const matches = (src.match(/studio-scaffold/g) ?? []).length
    expect(matches).toBeGreaterThanOrEqual(3)
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  L) Integração: parser → generate → STL
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.3 · L) Integração end-to-end (parser → mesh → STL)", () => {

  it("R14.4 · prompt completo gera STL ANATÔMICO válido (sólido, não TPMS)", async () => {
    const { generateAnatomyMesh } = await import("../src/lib/studio/anatomy")
    const prompt = "Scaffold ósseo esponjoso gyroid 15x15x8 mm porosidade 75%"
    const parsed = parseScaffoldPrompt(prompt)

    // Agora é anatomy mesh, não TPMS mesh
    const mesh = generateAnatomyMesh(parsed.anatomy)
    expect(mesh.stats.triangleCount).toBeGreaterThan(0)
    // Mesh anatômica é SÓLIDA — porosidade sempre 0 no STL
    expect(mesh.stats.porosity).toBe(0)
    // Infill ainda está disponível como metadado (pro slicer)
    expect(parsed.infillSuggestion.pattern).toBe("gyroid")
    expect(parsed.infillSuggestion.porosity).toBeCloseTo(0.75, 1)

    const stl = meshToSTLBinary(mesh)
    const r = validateSTLBinary(stl)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.triangleCount).toBe(mesh.stats.triangleCount)
  })

  it("R14.4 · infillSuggestion carrega porosidade requisitada (±5%)", () => {
    const parsed = parseScaffoldPrompt("Scaffold gyroid 20x20x20 mm 70% porosidade")
    // Porosidade agora é metadado do infill (não do mesh STL)
    expect(parsed.infillSuggestion.porosity).toBeCloseTo(0.70, 1)
    expect(parsed.infillSuggestion.pattern).toBe("gyroid")
  })
})
