/**
 * BIA v4 · R21 · Biblioteca de modelos ANATÔMICOS reais (malhas curvas)
 * ─────────────────────────────────────────────────────────────────────
 * Mandato Janaina: "o menisco possui arestas retas e não curvilíneas…
 * com fêmur e orelha também… deixar apenas a dimensão para ser escolhida,
 * ver o arquivo na mesa (preview) e poder rodar o arquivo, arrumando ele
 * corretamente na mesa de impressão."
 *
 * Cada item aponta para um STL binário REAL em /public/stl (normalizado:
 * centrado em XY, base em Z=0). A usuária escolhe só a DIMENSÃO alvo
 * (uma medida principal); a escala é uniforme para preservar a anatomia.
 * Rotação/posição são ajustadas na Mesa (BedStage) antes de fatiar.
 */

export interface AnatomicalModel {
  id: string
  label: string
  /** Emoji/ícone simples para o catálogo */
  icon: string
  file: string
  /** Dimensões nativas do STL (mm, após normalização) */
  native: { x: number; y: number; z: number }
  /** Eixo da medida principal que a usuária escolhe */
  primaryAxis: "x" | "y" | "z"
  primaryLabel: string
  /** Faixa típica para a medida principal (mm) e default */
  range: { min: number; max: number; default: number }
  /** Rotação sugerida (graus, eixo X/Y/Z) para apoiar melhor na mesa */
  suggestedRotation?: { x?: number; y?: number; z?: number }
  tissue: string
  description: string
  reference?: string
  tris: number
}

export const ANATOMICAL_MODELS: AnatomicalModel[] = [
  {
    id: "meniscus_real", label: "Menisco (meia-lua)", icon: "🌙", file: "/stl/meniscus-real.stl",
    native: { x: 50.0, y: 70.28, z: 9.95 }, primaryAxis: "y", primaryLabel: "Comprimento (ponta a ponta)",
    range: { min: 20, max: 50, default: 35 },
    tissue: "cartilagem", tris: 4904,
    description: "Menisco em C real (curvo, afilado para dentro). Fatiar deitado — base plana na mesa.",
    reference: "Fibrocartilagem · menisco medial adulto ≈ 35–45 mm",
  },
  {
    id: "ear_real", label: "Orelha (pavilhão)", icon: "👂", file: "/stl/ear-real.stl",
    native: { x: 28.07, y: 47.15, z: 15.16 }, primaryAxis: "y", primaryLabel: "Altura da orelha",
    range: { min: 20, max: 70, default: 60 },
    tissue: "cartilagem", tris: 4432,
    description: "Pavilhão auricular com hélice, anti-hélice e concha. Imprime deitada (face posterior na mesa).",
    reference: "Orelha adulta ≈ 60–65 mm",
  },
  {
    id: "nose_real", label: "Nariz", icon: "👃", file: "/stl/nose-real.stl",
    native: { x: 15.81, y: 25.51, z: 9.96 }, primaryAxis: "y", primaryLabel: "Comprimento dorso→ponta",
    range: { min: 15, max: 60, default: 45 },
    tissue: "cartilagem", tris: 11974,
    description: "Nariz com dorso, ponta e asas. Base (narinas) apoiada na mesa.",
  },
  {
    id: "kidney_real", label: "Rim", icon: "🫘", file: "/stl/kidney-real.stl",
    native: { x: 38.65, y: 19.69, z: 12.73 }, primaryAxis: "x", primaryLabel: "Comprimento",
    range: { min: 10, max: 60, default: 25 },
    tissue: "rim", tris: 7960,
    description: "Rim em feijão com hilo. Escala reduzida para scaffold (adulto real ≈ 110 mm).",
  },
  {
    id: "heart_real", label: "Coração", icon: "🫀", file: "/stl/heart-real.stl",
    native: { x: 28.74, y: 34.09, z: 35.94 }, primaryAxis: "z", primaryLabel: "Altura (ápice→átrios)",
    range: { min: 10, max: 60, default: 30 },
    tissue: "miocárdio", tris: 48254,
    description: "Coração anatômico (átrios, ventrículos, sulco). Alto — use suporte ou imprima em FRESH.",
    reference: "Fonte 3MF PrusaSlicer · decimado para 48 k triângulos",
  },
  {
    id: "femur_real", label: "Fêmur", icon: "🦴", file: "/stl/femur-real.stl",
    native: { x: 104.3, y: 62.3, z: 450 }, primaryAxis: "z", primaryLabel: "Comprimento do osso",
    range: { min: 20, max: 120, default: 60 },
    suggestedRotation: { y: 90 },
    tissue: "osso", tris: 40442,
    description: "Fêmur com cabeça, colo, trocânteres e côndilos. Gire 90° para deitar na mesa.",
    reference: "Fêmur adulto ≈ 450 mm — aqui em escala de laboratório",
  },
  {
    id: "vessel_segment_real", label: "Segmento vascular ramificado", icon: "🩸", file: "/stl/vessel-segment-real.stl",
    native: { x: 15.99, y: 21.72, z: 27.59 }, primaryAxis: "z", primaryLabel: "Altura do segmento",
    range: { min: 10, max: 40, default: 25 },
    tissue: "vascular", tris: 51142,
    description: "Árvore vascular com ramificações — ideal para sacrificial (Pluronic) ou FRESH.",
  },
  {
    id: "fidelity_real", label: "Grade de fidelidade (15,4 mm)", icon: "⬡", file: "/stl/fidelity-test-real.stl",
    native: { x: 15.4, y: 15.4, z: 0.8 }, primaryAxis: "x", primaryLabel: "Lado (travado em 15,4 mm)",
    range: { min: 15.4, max: 15.4, default: 15.4 },
    tissue: "teste", tris: 67220,
    description: "Grade padrão de fidelidade da biotinta (filamentos 0,8 mm). Dimensão fixa pelo protocolo.",
  },
]

export function getAnatomicalModel(id: string): AnatomicalModel | undefined {
  return ANATOMICAL_MODELS.find((m) => m.id === id)
}

/** Escala uniforme para que a medida principal atinja `target_mm`. */
export function uniformScaleFor(m: AnatomicalModel, target_mm: number): number {
  const nat = m.native[m.primaryAxis]
  return nat > 0 ? target_mm / nat : 1
}

/** Tamanho resultante (mm) após escala uniforme. */
export function scaledSize(m: AnatomicalModel, target_mm: number): { x: number; y: number; z: number } {
  const s = uniformScaleFor(m, target_mm)
  return { x: m.native.x * s, y: m.native.y * s, z: m.native.z * s }
}
