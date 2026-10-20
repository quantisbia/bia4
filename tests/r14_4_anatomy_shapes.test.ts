/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R14.4 — Primitivas anatômicas + ParseResult redesenhado
 *  ─────────────────────────────────────────────────────────────────────
 *  Trava a correção conceitual: STL = sólido anatômico; infill = metadado.
 *
 *  Blocos de teste:
 *   A) Catálogo ANATOMY_CATALOG (8 primitivas, metadados pt-BR)
 *   B) validateAnatomyParams (ranges, kinds inválidos)
 *   C) generateAnatomyMesh gera mesh watertight para cada primitiva
 *   D) Dimensões típicas (typicalDims) coerentes com clínica real
 *   E) Mapeamento preset clínico → forma anatômica (inferAnatomyFromPreset)
 *   F) Parser pt-BR extrai forma anatômica de keywords (menisco, calota...)
 *   G) ParseResult tem novo shape: anatomy + infillSuggestion + tpmsParams
 *   H) Integração end-to-end: prompt → anatomy mesh → STL válido
 *   I) STL exportado tem porosity=0 (sólido, não TPMS)
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from "vitest"

import {
  ANATOMY_CATALOG,
  getAnatomyMeta,
  validateAnatomyParams,
  generateAnatomyMesh,
  type AnatomyKind,
  type AnatomyParams,
} from "../src/lib/studio/anatomy"

import { parseScaffoldPrompt } from "../src/lib/studio/parser"
import { meshToSTLBinary, validateSTLBinary } from "../src/lib/studio/stl-exporter"

/* ══════════════════════════════════════════════════════════════════════
 *  A) ANATOMY_CATALOG — 8 primitivas pt-BR
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.4 · A) Catálogo de 8 primitivas anatômicas", () => {
  const expectedKinds: AnatomyKind[] = [
    "block", "cylinder", "crescent", "cranial_cap",
    "mandible_seg", "femur_seg", "ear_auricle", "disc",
  ]

  it("tem exatamente 8 primitivas", () => {
    expect(ANATOMY_CATALOG).toHaveLength(8)
  })

  it("todas as 8 kinds esperadas estão presentes", () => {
    const kinds = ANATOMY_CATALOG.map(m => m.kind).sort()
    expect(kinds).toEqual([...expectedKinds].sort())
  })

  it("cada primitiva tem metadados completos (label, emoji, descrição, exemplos)", () => {
    for (const m of ANATOMY_CATALOG) {
      expect(m.label.length).toBeGreaterThan(3)
      expect(m.shortLabel.length).toBeGreaterThan(0)
      expect(m.emoji.length).toBeGreaterThan(0)
      expect(m.description.length).toBeGreaterThan(20)
      expect(m.typicalDims.x).toBeGreaterThan(0)
      expect(m.typicalDims.y).toBeGreaterThan(0)
      expect(m.typicalDims.z).toBeGreaterThan(0)
      expect(m.clinicalExamples.length).toBeGreaterThan(0)
    }
  })

  it("getAnatomyMeta retorna meta correta por kind", () => {
    for (const kind of expectedKinds) {
      const m = getAnatomyMeta(kind)
      expect(m.kind).toBe(kind)
    }
  })

  it("getAnatomyMeta lança para kind inválido", () => {
    expect(() => getAnatomyMeta("invalid" as AnatomyKind)).toThrow()
  })

  it("CRESCENT (menisco) tem exemplos clínicos de menisco/cartilagem", () => {
    const m = getAnatomyMeta("crescent")
    const lower = m.clinicalExamples.join(" ").toLowerCase()
    expect(lower).toMatch(/menisco|cartilagem/)
  })

  it("CRANIAL_CAP tem exemplos de craniotomia/CBMF", () => {
    const m = getAnatomyMeta("cranial_cap")
    const lower = m.clinicalExamples.join(" ").toLowerCase()
    expect(lower).toMatch(/crani|cbmf|calota/)
  })

  it("MANDIBLE_SEG tem exemplos de mandíbula/alveolar", () => {
    const m = getAnatomyMeta("mandible_seg")
    const lower = m.clinicalExamples.join(" ").toLowerCase()
    expect(lower).toMatch(/mandibular|alveolar|ressec/)
  })

  it("EAR_AURICLE tem exemplos de microtia/auricular", () => {
    const m = getAnatomyMeta("ear_auricle")
    const lower = m.clinicalExamples.join(" ").toLowerCase()
    expect(lower).toMatch(/microtia|auric|trauma/)
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  B) validateAnatomyParams
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.4 · B) validateAnatomyParams", () => {

  const valid: AnatomyParams = { kind: "block", sizeX: 20, sizeY: 20, sizeZ: 10 }

  it("aceita params válidos", () => {
    expect(() => validateAnatomyParams(valid)).not.toThrow()
  })

  it("rejeita kind inválido", () => {
    expect(() => validateAnatomyParams({ ...valid, kind: "foo" as AnatomyKind }))
      .toThrow(/anat[ôo]mica inv[áa]lida/i)
  })

  it("rejeita sizeX <= 0 ou > 500", () => {
    expect(() => validateAnatomyParams({ ...valid, sizeX: 0 })).toThrow()
    expect(() => validateAnatomyParams({ ...valid, sizeX: 600 })).toThrow()
    expect(() => validateAnatomyParams({ ...valid, sizeY: -1 })).toThrow()
    expect(() => validateAnatomyParams({ ...valid, sizeZ: 1000 })).toThrow()
  })

  it("rejeita resolution fora de [8, 128]", () => {
    expect(() => validateAnatomyParams({ ...valid, resolution: 4 })).toThrow()
    expect(() => validateAnatomyParams({ ...valid, resolution: 256 })).toThrow()
  })

  it("aceita resolution undefined (usa default)", () => {
    expect(() => validateAnatomyParams(valid)).not.toThrow()
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  C) generateAnatomyMesh — mesh watertight para todas as primitivas
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.4 · C) generateAnatomyMesh para todas as 8 primitivas", () => {

  const allKinds: AnatomyKind[] = [
    "block", "cylinder", "crescent", "cranial_cap",
    "mandible_seg", "femur_seg", "ear_auricle", "disc",
  ]

  for (const kind of allKinds) {
    it(`${kind}: gera mesh não-vazia com stats corretos`, () => {
      const meta = getAnatomyMeta(kind)
      const mesh = generateAnatomyMesh({
        kind,
        sizeX: meta.typicalDims.x,
        sizeY: meta.typicalDims.y,
        sizeZ: meta.typicalDims.z,
        resolution: 24,  // baixo pros testes serem rápidos
      })
      expect(mesh.vertices.length, `${kind} vertices`).toBeGreaterThan(0)
      expect(mesh.indices.length, `${kind} indices`).toBeGreaterThan(0)
      expect(mesh.indices.length % 3, `${kind} tri múltiplo de 3`).toBe(0)
      expect(mesh.stats.triangleCount, `${kind} triangleCount`).toBeGreaterThan(0)
      expect(mesh.vertices.length / 3, `${kind} vertexCount`).toBe(mesh.stats.vertexCount)
    })
  }

  it("todas as primitivas têm porosity=0 no stats (STL é SÓLIDO)", () => {
    for (const kind of allKinds) {
      const meta = getAnatomyMeta(kind)
      const mesh = generateAnatomyMesh({
        kind, sizeX: meta.typicalDims.x, sizeY: meta.typicalDims.y, sizeZ: meta.typicalDims.z,
        resolution: 16,
      })
      expect(mesh.stats.porosity, `${kind} porosity deve ser 0 (sólido)`).toBe(0)
    }
  })

  it("volume_mm3 > 0 para todas as primitivas", () => {
    for (const kind of allKinds) {
      const meta = getAnatomyMeta(kind)
      const mesh = generateAnatomyMesh({
        kind, sizeX: meta.typicalDims.x, sizeY: meta.typicalDims.y, sizeZ: meta.typicalDims.z,
        resolution: 16,
      })
      expect(mesh.stats.volume_mm3, `${kind} volume`).toBeGreaterThan(0)
    }
  })

  it("block tem exatamente 12 triângulos (cubo)", () => {
    const mesh = generateAnatomyMesh({ kind: "block", sizeX: 10, sizeY: 10, sizeZ: 10 })
    expect(mesh.stats.triangleCount).toBe(12)
  })

  it("cylinder com 16 segmentos tem triangleCount proporcional", () => {
    const mesh = generateAnatomyMesh({ kind: "cylinder", sizeX: 10, sizeY: 10, sizeZ: 20, resolution: 16 })
    // 16 top + 16 bot + 32 lateral = 64 triângulos
    expect(mesh.stats.triangleCount).toBeGreaterThanOrEqual(60)
    expect(mesh.stats.triangleCount).toBeLessThanOrEqual(70)
  })

  it("bounds correspondem às dimensões (block perfeito)", () => {
    const mesh = generateAnatomyMesh({ kind: "block", sizeX: 30, sizeY: 20, sizeZ: 10 })
    expect(mesh.stats.bounds.min).toEqual([-15, -10, -5])
    expect(mesh.stats.bounds.max).toEqual([15, 10, 5])
  })

  it("block tem volume exato = sizeX * sizeY * sizeZ", () => {
    const mesh = generateAnatomyMesh({ kind: "block", sizeX: 10, sizeY: 10, sizeZ: 10 })
    expect(mesh.stats.volume_mm3).toBeCloseTo(1000, 0)
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  D) Dimensões típicas coerentes com literatura clínica
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.4 · D) Dimensões típicas plausíveis clinicamente", () => {

  it("CRANIAL_CAP: X > 40 mm, Z <= 10 mm (placa fina)", () => {
    const m = getAnatomyMeta("cranial_cap")
    expect(m.typicalDims.x).toBeGreaterThan(40)
    expect(m.typicalDims.z).toBeLessThanOrEqual(10)
  })

  it("CRESCENT (menisco): X ~ 2x Y (meia-lua achatada)", () => {
    const m = getAnatomyMeta("crescent")
    expect(m.typicalDims.x / m.typicalDims.y).toBeGreaterThan(1.5)
    expect(m.typicalDims.z).toBeLessThan(15)  // fino
  })

  it("FEMUR_SEG: Z > X (segmento diafisário alongado)", () => {
    const m = getAnatomyMeta("femur_seg")
    expect(m.typicalDims.z).toBeGreaterThan(m.typicalDims.x)
  })

  it("DISC: Z muito menor que X,Y (achatado)", () => {
    const m = getAnatomyMeta("disc")
    expect(m.typicalDims.z).toBeLessThan(m.typicalDims.x / 2)
    expect(m.typicalDims.z).toBeLessThan(m.typicalDims.y / 2)
  })

  it("EAR_AURICLE: X > Y > Z (orelha é vertical, mais alta que larga)", () => {
    const m = getAnatomyMeta("ear_auricle")
    expect(m.typicalDims.x).toBeGreaterThan(m.typicalDims.y)
    expect(m.typicalDims.y).toBeGreaterThan(m.typicalDims.z)
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  E) Parser identifica forma anatômica por keywords
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.4 · E) Parser detecta forma anatômica pt-BR", () => {

  it("identifica menisco por 'menisco', 'meia lua', 'meia-lua'", () => {
    for (const kw of ["menisco", "meia lua", "meia-lua", "semi-lunar"]) {
      const r = parseScaffoldPrompt(`Scaffold de ${kw} 40x20x5 mm`)
      expect(r.anatomy.kind, kw).toBe("crescent")
      expect(r.extracted.anatomyKind, kw).toBe("crescent")
    }
  })

  it("identifica calota craniana por 'calota', 'craniana', 'craniotomia'", () => {
    for (const kw of ["calota", "craniotomia", "cranioplastia"]) {
      const r = parseScaffoldPrompt(`${kw} 60x50x4 mm`)
      expect(r.anatomy.kind, kw).toBe("cranial_cap")
    }
  })

  it("identifica mandíbula (acento safe)", () => {
    const r1 = parseScaffoldPrompt("Mandíbula 40x12x15 mm")
    const r2 = parseScaffoldPrompt("Arco mandibular 50x15x15 mm")
    expect(r1.anatomy.kind).toBe("mandible_seg")
    expect(r2.anatomy.kind).toBe("mandible_seg")
  })

  it("identifica fêmur, tíbia, úmero → femur_seg", () => {
    for (const kw of ["fêmur", "tíbia", "úmero", "diáfise"]) {
      const r = parseScaffoldPrompt(`Segmento de ${kw} 25x25x40 mm`)
      expect(r.anatomy.kind, kw).toBe("femur_seg")
    }
  })

  it("identifica orelha por 'orelha', 'aurícula', 'microtia'", () => {
    for (const kw of ["orelha", "microtia", "pavilhão auricular"]) {
      const r = parseScaffoldPrompt(`Scaffold para ${kw}`)
      expect(r.anatomy.kind, kw).toBe("ear_auricle")
    }
  })

  it("identifica disco intervertebral", () => {
    const r = parseScaffoldPrompt("Disco intervertebral lombar 35x25x8 mm")
    expect(r.anatomy.kind).toBe("disc")
  })

  it("identifica cilindro", () => {
    const r = parseScaffoldPrompt("Cilindro 10x10x30 mm")
    expect(r.anatomy.kind).toBe("cylinder")
  })

  it("identifica bloco (keyword 'bloco', 'retangular', 'paralelepípedo')", () => {
    for (const kw of ["bloco retangular", "paralelepípedo"]) {
      const r = parseScaffoldPrompt(`${kw} 20x20x10 mm`)
      expect(r.anatomy.kind, kw).toBe("block")
    }
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  F) Preset → anatomia inferida
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.4 · F) Inferência de forma anatômica a partir do preset clínico", () => {

  it("preset ósseo cortical → cranial_cap", () => {
    const r = parseScaffoldPrompt("Scaffold ósseo cortical")
    expect(r.presetId).toBe("scaffold_ossea_cortical")
    expect(r.anatomy.kind).toBe("cranial_cap")
  })

  it("preset ósseo esponjoso → femur_seg", () => {
    const r = parseScaffoldPrompt("Scaffold ósseo esponjoso")
    expect(r.presetId).toBe("scaffold_ossea_esponjosa")
    expect(r.anatomy.kind).toBe("femur_seg")
  })

  it("preset cartilagem → crescent (menisco é o caso comum)", () => {
    const r = parseScaffoldPrompt("Scaffold de cartilagem")
    expect(r.presetId).toBe("scaffold_cartilagem")
    expect(r.anatomy.kind).toBe("crescent")
  })

  it("preset alveolar → mandible_seg", () => {
    const r = parseScaffoldPrompt("Enxerto alveolar")
    expect(r.presetId).toBe("scaffold_alveolar")
    expect(r.anatomy.kind).toBe("mandible_seg")
  })

  it("preset pele → block (retalho)", () => {
    const r = parseScaffoldPrompt("Scaffold de pele")
    expect(r.presetId).toBe("scaffold_pele")
    expect(r.anatomy.kind).toBe("block")
  })

  it("forma EXPLÍCITA no prompt (menisco) ganha sobre keyword de cilindro", () => {
    // Quando "menisco" explícito aparece junto com "cilindro",
    // menisco (crescent) ganha porque está mais acima no ANATOMY_KEYWORDS
    // (ordem define prioridade quando múltiplas keywords batem).
    const r = parseScaffoldPrompt("Menisco cilíndrico 10x10x30 mm")
    expect(r.anatomy.kind).toBe("crescent")
    expect(r.extracted.anatomyKind).toBe("crescent")
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  G) Novo shape do ParseResult
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.4 · G) ParseResult tem shape conceitualmente correto", () => {

  const r = parseScaffoldPrompt("Menisco gyroid 40x20x6 mm 75% porosidade")

  it("tem campo 'anatomy' com AnatomyParams", () => {
    expect(r.anatomy).toBeDefined()
    expect(r.anatomy.kind).toBe("crescent")
    expect(r.anatomy.sizeX).toBe(40)
    expect(r.anatomy.sizeY).toBe(20)
    expect(r.anatomy.sizeZ).toBe(6)
  })

  it("tem campo 'infillSuggestion' com padrão + porosidade", () => {
    expect(r.infillSuggestion).toBeDefined()
    expect(r.infillSuggestion.pattern).toBe("gyroid")
    expect(r.infillSuggestion.porosity).toBeCloseTo(0.75, 1)
    expect(r.infillSuggestion.cellsPerAxis).toBeGreaterThan(0)
  })

  it("tem campo 'tpmsParams' legacy pra visualização educacional", () => {
    expect(r.tpmsParams).toBeDefined()
    expect(r.tpmsParams.kind).toBe("gyroid")
    expect(r.tpmsParams.sizeX).toBe(40)  // mesmas dims da anatomy
  })

  it("extracted inclui anatomyKind", () => {
    expect(r.extracted.anatomyKind).toBe("crescent")
  })

  it("confidence > 0.7 para prompt completo com forma + dims + porosidade", () => {
    expect(r.confidence).toBeGreaterThan(0.7)
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  H) Integração: prompt → anatomy → STL
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.4 · H) Integração end-to-end", () => {

  const prompts = [
    "Menisco 40x20x6 mm",
    "Calota craniana 60x50x4 mm",
    "Mandíbula 40x12x15 mm",
    "Fêmur 25x25x40 mm",
    "Orelha para microtia",
    "Disco intervertebral lombar",
    "Cilindro 10x10x30 mm",
    "Bloco 20x20x10 mm",
  ]

  for (const prompt of prompts) {
    it(`"${prompt}" gera STL binário válido`, () => {
      const parsed = parseScaffoldPrompt(prompt)
      const mesh = generateAnatomyMesh({ ...parsed.anatomy, resolution: 24 })
      expect(mesh.indices.length).toBeGreaterThan(0)

      const stl = meshToSTLBinary(mesh)
      const r = validateSTLBinary(stl)
      expect(r.ok, prompt).toBe(true)
      if (r.ok) {
        expect(r.triangleCount, prompt).toBe(mesh.stats.triangleCount)
      }
    })
  }

  it("mudar o padrão de infill NÃO altera o STL (metadado separado)", () => {
    // Gera 2 meshes com mesma anatomy mas infill diferente
    const basePrompt = "Menisco 40x20x6 mm 75% porosidade"
    const r1 = parseScaffoldPrompt(`${basePrompt} gyroid`)
    const r2 = parseScaffoldPrompt(`${basePrompt} diamond`)

    // Anatomy sempre o mesmo
    expect(r1.anatomy).toEqual(r2.anatomy)

    // Infill diferente
    expect(r1.infillSuggestion.pattern).toBe("gyroid")
    expect(r2.infillSuggestion.pattern).toBe("diamond")

    // Meshes dos sólidos são IDÊNTICOS em contagem
    const m1 = generateAnatomyMesh({ ...r1.anatomy, resolution: 24 })
    const m2 = generateAnatomyMesh({ ...r2.anatomy, resolution: 24 })
    expect(m1.stats.triangleCount).toBe(m2.stats.triangleCount)
    expect(m1.stats.vertexCount).toBe(m2.stats.vertexCount)
    expect(m1.stats.volume_mm3).toBeCloseTo(m2.stats.volume_mm3, 2)
    // porosity sempre 0 (sólido)
    expect(m1.stats.porosity).toBe(0)
    expect(m2.stats.porosity).toBe(0)
  })
})

/* ══════════════════════════════════════════════════════════════════════
 *  I) STL exportado tem assinatura de sólido (não TPMS)
 * ══════════════════════════════════════════════════════════════════════ */
describe("R14.4 · I) STL exportado é sólido fechado", () => {

  it("header do STL contém label pt-BR da forma", () => {
    const parsed = parseScaffoldPrompt("Menisco 40x20x6 mm")
    const mesh = generateAnatomyMesh(parsed.anatomy)
    const headerText = `BIA v4 Studio | Meia-lua (menisco) | 40x20x6mm`
    const stl = meshToSTLBinary(mesh, headerText)
    const view = new Uint8Array(stl, 0, 80)
    const decoder = new TextDecoder()
    const header = decoder.decode(view).replace(/\0+$/, "")
    // Case-insensitive: "Meia-lua (menisco)" tem "menisco" minúsculo
    expect(header.toLowerCase()).toContain("menisco")
    expect(header).toContain("mm")
  })

  it("mesh sólida tem volume próximo do bounding box (bloco)", () => {
    const mesh = generateAnatomyMesh({ kind: "block", sizeX: 20, sizeY: 20, sizeZ: 10 })
    const bboxVol = 20 * 20 * 10  // 4000
    // Bloco preenche 100% do bbox
    expect(mesh.stats.volume_mm3).toBeCloseTo(bboxVol, 0)
  })

  it("cilindro ocupa ~79% do bbox (π/4 ≈ 0.785)", () => {
    const mesh = generateAnatomyMesh({ kind: "cylinder", sizeX: 20, sizeY: 20, sizeZ: 10, resolution: 48 })
    const bboxVol = 20 * 20 * 10
    const ratio = mesh.stats.volume_mm3 / bboxVol
    expect(ratio).toBeGreaterThan(0.70)
    expect(ratio).toBeLessThan(0.85)
  })
})
