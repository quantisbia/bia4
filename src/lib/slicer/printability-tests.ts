/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R24.6 · Testes de imprimibilidade — catálogo para o BioSlicer
 *  ─────────────────────────────────────────────────────────────────────
 *  Antes viviam numa página separada (/bioprint/printability) com fatiador
 *  próprio. Agora são apenas MAIS UMA FONTE DE MODELO 3D da Fase 3: o STL
 *  é gerado aqui (geometria paramétrica de `src/lib/stl`) e o BioSlicer
 *  fatia/cobra/envia exatamente como qualquer outro modelo.
 *
 *  Referências: Ouyang 2016 (Pf), Therriault 2018 (linha), Schwab 2020.
 * ═══════════════════════════════════════════════════════════════════════
 */

import type { GeometryParams, Triangle } from "@/lib/stl/generator"
import { BIOMIMETIC_GEOMETRIES, generateBiomimeticGeometry, type BiomimeticGeometry } from "@/lib/stl/biomimetic-tissues"
import { finalizeMesh } from "./mesh-slice"
import type { TriMesh } from "./types"
import type { InfillPattern } from "./types"

export interface PrintabilityTestDef {
  id: string
  label: string
  icon: string
  /** Iniciante · Padrão-ouro · Intermediário · Avançado · Especialista */
  difficulty: string
  description: string
  rationale: string
  analysisProtocol?: string
  defaultParams: GeometryParams
  paramLabels: Record<string, string>
  /** Parâmetros de fatiamento recomendados para o teste */
  slice: { layerHeight_mm: number; wallCount: number; infillPattern: InfillPattern; infillDensity: number; note: string }
}

const ORDER = [
  "test_line", "test_grid", "test_collapse_bridge", "test_stacking_tower",
  "test_z_staircase", "test_angle_fan", "test_star", "test_fidelity_biotinta",
]

const ICON: Record<string, string> = {
  test_line: "➖", test_grid: "▦", test_collapse_bridge: "🌉", test_star: "✱",
  test_stacking_tower: "🗼", test_z_staircase: "🪜", test_angle_fan: "📐", test_fidelity_biotinta: "⬡",
}

const DIFFICULTY: Record<string, string> = {
  test_line: "Iniciante", test_grid: "Padrão-ouro", test_collapse_bridge: "Intermediário",
  test_stacking_tower: "Intermediário", test_z_staircase: "Intermediário", test_angle_fan: "Avançado",
  test_star: "Avançado", test_fidelity_biotinta: "Especialista",
}

const SLICE: Record<string, PrintabilityTestDef["slice"]> = {
  test_line:              { layerHeight_mm: 0.25, wallCount: 1, infillPattern: "rectilinear", infillDensity: 50, note: "5 filamentos paralelos de larguras crescentes. Mede CV de largura." },
  test_grid:              { layerHeight_mm: 0.2,  wallCount: 1, infillPattern: "rectilinear", infillDensity: 50, note: "Grade cruzada para Pf = P²/(16·A). Padrão-ouro Ouyang 2016." },
  test_collapse_bridge:   { layerHeight_mm: 0.25, wallCount: 1, infillPattern: "rectilinear", infillDensity: 50, note: "Torres com vãos crescentes. Mede vão máximo sem colapso." },
  test_stacking_tower:    { layerHeight_mm: 0.2,  wallCount: 2, infillPattern: "concentric",  infillDensity: 40, note: "Torre cilíndrica. Mede altura máxima sem deformação." },
  test_z_staircase:       { layerHeight_mm: 0.1,  wallCount: 1, infillPattern: "concentric",  infillDensity: 50, note: "Camada de 0,1 mm para determinar a resolução vertical mínima." },
  test_angle_fan:         { layerHeight_mm: 0.25, wallCount: 1, infillPattern: "concentric",  infillDensity: 30, note: "Patch fino. Imprima e meça o ângulo crítico antes do colapso." },
  test_star:              { layerHeight_mm: 0.25, wallCount: 1, infillPattern: "concentric",  infillDensity: 0,  note: "Estrela com braços em balanço — anisotropia 360°." },
  test_fidelity_biotinta: { layerHeight_mm: 0.1,  wallCount: 1, infillPattern: "rectilinear", infillDensity: 60, note: "Grade densa 15,4×15,4×0,8 mm. Mede o índice de fidelidade F." },
}

function toDef(g: BiomimeticGeometry): PrintabilityTestDef {
  return {
    id: g.id, label: g.label, icon: ICON[g.id] ?? g.icon ?? "🧪", difficulty: DIFFICULTY[g.id] ?? "Intermediário",
    description: g.description, rationale: g.rationale, analysisProtocol: g.analysisProtocol,
    defaultParams: { ...(g.defaultParams ?? {}) } as GeometryParams, paramLabels: g.paramLabels ?? {},
    slice: SLICE[g.id] ?? { layerHeight_mm: 0.2, wallCount: 1, infillPattern: "rectilinear", infillDensity: 50, note: "" },
  }
}

/** Catálogo ordenado por dificuldade (8 testes). */
export const PRINTABILITY_TESTS: PrintabilityTestDef[] = ORDER
  .map((id) => BIOMIMETIC_GEOMETRIES.find((g) => g.id === id && g.category === "printability_test"))
  .filter((g): g is BiomimeticGeometry => !!g)
  .map(toDef)

export function getPrintabilityTest(id: string): PrintabilityTestDef | undefined {
  return PRINTABILITY_TESTS.find((t) => t.id === id)
}

/** Triângulos do gerador de STL → malha do BioSlicer. */
export function trianglesToMesh(tris: Triangle[], name: string): TriMesh {
  const v = new Float32Array(tris.length * 9)
  let k = 0
  for (const t of tris) {
    v[k++] = t.v1[0]; v[k++] = t.v1[1]; v[k++] = t.v1[2]
    v[k++] = t.v2[0]; v[k++] = t.v2[1]; v[k++] = t.v2[2]
    v[k++] = t.v3[0]; v[k++] = t.v3[1]; v[k++] = t.v3[2]
  }
  return finalizeMesh(v, tris.length, name)
}

/** Gera a malha do teste (parâmetros opcionais sobrepõem os padrões). */
export function makePrintabilityTestMesh(id: string, params?: Partial<GeometryParams>): TriMesh {
  const def = getPrintabilityTest(id)
  if (!def) throw new Error(`Teste de imprimibilidade desconhecido: ${id}`)
  // chamada direta (sem o require() dinâmico de generateGeometry) — funciona em Node/ESM e no browser
  const tris = generateBiomimeticGeometry(id, { ...def.defaultParams, ...(params ?? {}) } as GeometryParams)
  if (!tris || tris.length === 0) throw new Error(`O teste ${def.label} não gerou triângulos.`)
  return trianglesToMesh(tris, `teste_${id}`)
}
