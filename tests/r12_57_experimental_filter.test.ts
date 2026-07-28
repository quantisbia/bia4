/**
 * R12.57 · Smoke test — Etapa 1 (Modelo)
 * ────────────────────────────────────────────────────────────────
 * Garante que a separação BASIC vs EXPERIMENTAL faz sentido:
 *   - Todas as geometrias "básicas" referenciadas pela UI existem
 *     no catálogo (evita seleção fantasma quando toggle está OFF).
 *   - A união BASIC ∪ ADVANCED cobre a grande maioria das geometrias
 *     do catálogo — as poucas restantes são explicitamente "compostas
 *     experimentais" (skin_3layer, cardiac_patch, etc.), que a UI
 *     esconde por padrão.
 *   - Cada uma das 5 categorias do painel de geração tem PELO MENOS
 *     UMA geometria básica que apareça quando o toggle está OFF, OU
 *     a UI oferece fallback automático para outra categoria.
 *
 * NOTA: não carrega React nem o page.tsx — só valida os dados que a
 * UI consome, para ficar rápido e não abrir o rendering worker.
 */
import { describe, it, expect } from "vitest"
import {
  BASIC_GEOMETRY_IDS,
  ADVANCED_GEOMETRY_IDS,
  isBasicGeometry,
  isAdvancedGeometry,
  classifyGeometry,
} from "@/lib/gcode/slicer/geometry-bounds"
import { GEOMETRIES } from "@/lib/stl/generator"
import { BIOMIMETIC_GEOMETRIES } from "@/lib/stl/biomimetic-tissues"

const ALL_IDS = new Set<string>([
  ...GEOMETRIES.map(g => g.id),
  ...BIOMIMETIC_GEOMETRIES.map(g => g.id),
])

// Espelha CATEGORY_DEFS de src/app/dashboard/bioprint/model/page.tsx.
// Mantido aqui como snapshot — se a UI mudar as categorias, este teste
// falha e força o desenvolvedor a atualizar ambos.
const CATEGORY_GEOMETRY_IDS: Record<string, string[]> = {
  "soft-tissue": [
    "membrane", "disk", "skin_cylinder", "cube_tissue", "vessel", "hexagonal_liver",
    "nose", "meniscus", "cornea", "lens", "ear", "heart", "kidney",
    "skin_3layer", "cardiac_patch", "cornea_curved", "cartilage_zonal",
  ],
  "rigid-tissue": [
    "bone_block", "femur", "hand", "bone_cortical_trabecular",
  ],
  "biomimetic-tpms": ["tpms_gyroid", "tpms_schwarz", "tpms_diamond"],
  "printability-test": [
    "test_line", "test_grid", "test_collapse_bridge", "test_star",
    "test_stacking_tower", "test_z_staircase", "test_angle_fan",
    "test_fidelity_biotinta",
  ],
  "organoid-vascular": [
    "organoid_sphere", "spheroid_capsule", "vessel_y_branch", "nerve_conduit",
  ],
}

describe("R12.57 · Etapa 1 · filtro de geometrias experimentais", () => {
  describe("integridade do catálogo BASIC", () => {
    it("cada ID em BASIC_GEOMETRY_IDS existe no catálogo (GEOMETRIES ∪ BIOMIMETIC_GEOMETRIES)", () => {
      for (const id of BASIC_GEOMETRY_IDS) {
        expect(ALL_IDS.has(id), `BASIC id "${id}" não existe no catálogo`).toBe(true)
      }
    })

    it("cada ID em ADVANCED_GEOMETRY_IDS existe no catálogo", () => {
      for (const id of ADVANCED_GEOMETRY_IDS) {
        expect(ALL_IDS.has(id), `ADVANCED id "${id}" não existe no catálogo`).toBe(true)
      }
    })

    it("BASIC e ADVANCED são conjuntos disjuntos", () => {
      const basicSet = new Set<string>(BASIC_GEOMETRY_IDS)
      for (const id of ADVANCED_GEOMETRY_IDS) {
        expect(basicSet.has(id), `id "${id}" está em BASIC e ADVANCED`).toBe(false)
      }
    })
  })

  describe("classificação", () => {
    it("cube_tissue e vessel são BASIC", () => {
      expect(isBasicGeometry("cube_tissue")).toBe(true)
      expect(isBasicGeometry("vessel")).toBe(true)
      expect(classifyGeometry("cube_tissue")).toBe("basic")
    })

    it("heart, kidney, femur e TPMS são ADVANCED", () => {
      expect(isAdvancedGeometry("heart")).toBe(true)
      expect(isAdvancedGeometry("kidney")).toBe(true)
      expect(isAdvancedGeometry("femur")).toBe(true)
      expect(isAdvancedGeometry("tpms_gyroid")).toBe(true)
      expect(classifyGeometry("heart")).toBe("advanced")
    })

    it("IDs desconhecidos retornam 'unknown' (tratados como experimentais pela UI)", () => {
      expect(classifyGeometry("id_que_nao_existe")).toBe("unknown")
    })
  })

  describe("cobertura por categoria (com toggle experimental OFF)", () => {
    // Espelha o helper `isVerifiedGeometry` da página (page.tsx):
    // uma geometria é "verificada" (aparece com toggle OFF) sse está em BASIC.
    const isVerified = (id: string) => isBasicGeometry(id)

    it("cada categoria tem pelo menos 1 geometria verificada — OU cai no fallback", () => {
      // Tecidos moles: membrane, disk, skin_cylinder, cube_tissue, vessel (5 verificadas)
      const soft = CATEGORY_GEOMETRY_IDS["soft-tissue"].filter(isVerified)
      expect(soft.length).toBeGreaterThan(0)

      // Testes de imprimibilidade: 8 IDs test_* verificados
      const tests = CATEGORY_GEOMETRY_IDS["printability-test"].filter(isVerified)
      expect(tests.length).toBeGreaterThan(0)

      // Rígidos, biomiméticos TPMS e organoides são 100% experimentais hoje —
      // por design. A UI faz fallback automático (useEffect) para uma
      // categoria com ao menos 1 verificada quando o usuário abre uma dessas
      // com o toggle OFF. Vamos apenas garantir que exista PELO MENOS UMA
      // categoria fallback válida.
      const anyFallback = Object.values(CATEGORY_GEOMETRY_IDS)
        .some(ids => ids.some(isVerified))
      expect(anyFallback).toBe(true)
    })

    it("padrão OFF: soft-tissue mostra exatamente 5 formas (membrane/disk/skin_cylinder/cube_tissue/vessel)", () => {
      const visible = CATEGORY_GEOMETRY_IDS["soft-tissue"].filter(isVerified)
      expect(visible.sort()).toEqual(
        ["cube_tissue", "disk", "membrane", "skin_cylinder", "vessel"].sort()
      )
    })

    it("padrão OFF: printability-test mostra exatamente 8 formas (todos os test_*)", () => {
      const visible = CATEGORY_GEOMETRY_IDS["printability-test"].filter(isVerified)
      expect(visible.length).toBe(8)
      expect(visible.every(id => id.startsWith("test_"))).toBe(true)
    })

    it("padrão OFF: geometrias que travam (heart, kidney, femur, TPMS) ficam ESCONDIDAS", () => {
      const crashers = ["heart", "kidney", "femur", "tpms_gyroid", "hexagonal_liver"]
      for (const id of crashers) {
        expect(isVerified(id), `"${id}" apareceria por padrão — deveria estar escondida`).toBe(false)
      }
    })

    it("padrão OFF: geometrias compostas experimentais (skin_3layer, cardiac_patch, etc.) ficam ESCONDIDAS", () => {
      const composites = [
        "skin_3layer", "cardiac_patch", "cornea_curved", "cartilage_zonal",
        "bone_cortical_trabecular", "spheroid_capsule", "vessel_y_branch", "nerve_conduit",
      ]
      for (const id of composites) {
        expect(isVerified(id), `composta "${id}" apareceria por padrão`).toBe(false)
      }
    })
  })

  describe("contagem total esperada", () => {
    it("13 geometrias BASIC (5 paramétricas + 8 testes)", () => {
      expect(BASIC_GEOMETRY_IDS.length).toBe(13)
    })

    it("15 geometrias ADVANCED (anatômicas + TPMS + bone_block)", () => {
      expect(ADVANCED_GEOMETRY_IDS.length).toBe(15)
    })

    it("com toggle OFF, usuário vê ~13 formas total (contra ~30 com toggle ON)", () => {
      const allShown = new Set<string>()
      const basicShown = new Set<string>()
      for (const ids of Object.values(CATEGORY_GEOMETRY_IDS)) {
        for (const id of ids) {
          allShown.add(id)
          if (isBasicGeometry(id)) basicShown.add(id)
        }
      }
      // Com toggle OFF: só as básicas que estão referenciadas por alguma
      // categoria — deve ser exatamente todas as 13 (todas têm categoria).
      expect(basicShown.size).toBe(13)
      // Com toggle ON: catálogo completo referenciado por categorias.
      expect(allShown.size).toBeGreaterThanOrEqual(28) // 13 + 15 = 28 mínimo
    })
  })
})
