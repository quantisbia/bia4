/**
 * BIA v4.2 — Geometry Bounds & Contour Generator
 *
 * Dada uma geometria do catálogo STL (membrane, disk, bone_block, ...),
 * gera os contornos 2D (perímetros/walls) e o bbox para cada camada Z.
 *
 * Estratégia: ao invés de fatiar o STL triangular (caro), geramos
 * diretamente os contornos paramétricos por tipo de geometria.
 * Isso é mais preciso e MUITO mais rápido.
 */

import type { Polygon2D, BBox2D } from "../core/types"
import {
  hasMesh,
  geometryBoundsFromMesh,
  STL_FILE_MAP,
} from "../../stl/mesh-bounds"

export interface GeometryBounds {
  height_mm: number           // altura total Z
  zMin: number
  zMax: number
  getBoundsAtZ: (z: number) => BBox2D
  getPerimetersAtZ: (z: number, walls: number, wallSpacing_mm: number) => Polygon2D[]
}

/**
 * Gera contornos de um círculo com walls múltiplos.
 */
function circlePerimeters(cx: number, cy: number, r: number, walls: number, spacing: number, segments = 64): Polygon2D[] {
  const polys: Polygon2D[] = []
  for (let w = 0; w < walls; w++) {
    const radius = r - w * spacing
    if (radius <= 0.1) break
    const poly: Polygon2D = []
    for (let i = 0; i < segments; i++) {
      const a = (2 * Math.PI * i) / segments
      poly.push({ x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) })
    }
    polys.push(poly)
  }
  return polys
}

function rectPerimeters(cx: number, cy: number, w: number, h: number, walls: number, spacing: number): Polygon2D[] {
  const polys: Polygon2D[] = []
  for (let i = 0; i < walls; i++) {
    const hw = w / 2 - i * spacing
    const hh = h / 2 - i * spacing
    if (hw <= 0.1 || hh <= 0.1) break
    polys.push([
      { x: cx - hw, y: cy - hh },
      { x: cx + hw, y: cy - hh },
      { x: cx + hw, y: cy + hh },
      { x: cx - hw, y: cy + hh },
    ])
  }
  return polys
}

/**
 * Gera GeometryBounds para uma geometria do catálogo STL.
 * @param geomId ID da geometria (membrane, disk, bone_block, ...)
 * @param params parâmetros da geometria
 * @param origin centro (x,y) no referencial local (tipicamente 0,0)
 */
export function getGeometryBounds(
  geomId: string,
  params: Record<string, number | undefined>,
  origin: { x: number; y: number } = { x: 0, y: 0 },
): GeometryBounds {
  const { x: cx, y: cy } = origin

  switch (geomId) {
    case "membrane": {
      const w = params.width ?? 30
      const h = params.height ?? 30
      const d = params.depth ?? 2
      return {
        height_mm: d, zMin: 0, zMax: d,
        getBoundsAtZ: () => ({
          minX: cx - w/2, maxX: cx + w/2,
          minY: cy - h/2, maxY: cy + h/2,
        }),
        getPerimetersAtZ: (_z, walls, spacing) => rectPerimeters(cx, cy, w, h, walls, spacing),
      }
    }

    case "disk": {
      const r = params.radius ?? 10
      const t = params.thickness ?? 3
      return {
        height_mm: t, zMin: 0, zMax: t,
        getBoundsAtZ: () => ({ minX: cx - r, maxX: cx + r, minY: cy - r, maxY: cy + r }),
        getPerimetersAtZ: (_z, walls, spacing) => circlePerimeters(cx, cy, r, walls, spacing),
      }
    }

    case "skin_cylinder": {
      // R12.42 — cilindro baixo para Pele (mesh STL real, bounds = círculo)
      const r = params.radius ?? 20
      const t = params.thickness ?? 10
      return {
        height_mm: t, zMin: 0, zMax: t,
        getBoundsAtZ: () => ({ minX: cx - r, maxX: cx + r, minY: cy - r, maxY: cy + r }),
        getPerimetersAtZ: (_z, walls, spacing) => circlePerimeters(cx, cy, r, walls, spacing),
      }
    }

    case "bone_block":
    case "cube_tissue": {
      const w = params.width ?? 20
      const h = params.height ?? 20
      const d = params.depth ?? 10
      return {
        height_mm: d, zMin: 0, zMax: d,
        getBoundsAtZ: () => ({ minX: cx - w/2, maxX: cx + w/2, minY: cy - h/2, maxY: cy + h/2 }),
        getPerimetersAtZ: (_z, walls, spacing) => rectPerimeters(cx, cy, w, h, walls, spacing),
      }
    }

    case "vessel": {
      const oR = params.outerRadius ?? 8
      const iR = params.innerRadius ?? 6.5
      const L = params.tubeLength ?? 30
      return {
        height_mm: L, zMin: 0, zMax: L,
        getBoundsAtZ: () => ({ minX: cx - oR, maxX: cx + oR, minY: cy - oR, maxY: cy + oR }),
        getPerimetersAtZ: (_z, walls, spacing) => {
          const outer = circlePerimeters(cx, cy, oR, walls, spacing)
          const inner = circlePerimeters(cx, cy, iR, 1, spacing)
          return [...outer, ...inner]
        },
      }
    }

    case "hexagonal_liver": {
      const r = params.radius ?? 8
      const t = params.thickness ?? 4
      return {
        height_mm: t, zMin: 0, zMax: t,
        getBoundsAtZ: () => ({ minX: cx - r, maxX: cx + r, minY: cy - r, maxY: cy + r }),
        getPerimetersAtZ: (_z, walls, spacing) => {
          const polys: Polygon2D[] = []
          for (let w = 0; w < walls; w++) {
            const radius = r - w * spacing
            if (radius <= 0.1) break
            const poly: Polygon2D = []
            for (let i = 0; i < 6; i++) {
              const a = (Math.PI / 3) * i
              poly.push({ x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) })
            }
            polys.push(poly)
          }
          return polys
        },
      }
    }

    case "meniscus":
    case "cornea": {
      const oR = params.outerR ?? 20
      const iR = params.innerR ?? 10
      const t  = params.thickness ?? 5
      const arc = params.arcAngle ?? 180
      return {
        height_mm: t, zMin: 0, zMax: t,
        getBoundsAtZ: () => ({ minX: cx - oR, maxX: cx + oR, minY: cy - oR, maxY: cy + oR }),
        getPerimetersAtZ: (_z, walls, spacing) => {
          // Arc perímetros
          const polys: Polygon2D[] = []
          const arcRad = (arc * Math.PI) / 180
          for (let w = 0; w < walls; w++) {
            const ro = oR - w * spacing
            const ri = iR + w * spacing
            if (ro <= ri + 0.1) break
            const poly: Polygon2D = []
            const steps = 32
            // arco externo
            for (let i = 0; i <= steps; i++) {
              const a = -arcRad/2 + (arcRad * i) / steps
              poly.push({ x: cx + ro * Math.cos(a), y: cy + ro * Math.sin(a) })
            }
            // arco interno (reverso)
            for (let i = steps; i >= 0; i--) {
              const a = -arcRad/2 + (arcRad * i) / steps
              poly.push({ x: cx + ri * Math.cos(a), y: cy + ri * Math.sin(a) })
            }
            polys.push(poly)
          }
          return polys
        },
      }
    }

    case "lens": {
      const rA = params.radiusA ?? 5
      const rB = params.radiusB ?? 3
      const t  = params.thickness ?? 4
      return {
        height_mm: t, zMin: 0, zMax: t,
        getBoundsAtZ: () => ({ minX: cx - rA, maxX: cx + rA, minY: cy - rB, maxY: cy + rB }),
        getPerimetersAtZ: (_z, walls, spacing) => {
          const polys: Polygon2D[] = []
          for (let w = 0; w < walls; w++) {
            const a = rA - w * spacing
            const b = rB - w * spacing
            if (a <= 0.1 || b <= 0.1) break
            const poly: Polygon2D = []
            for (let i = 0; i < 64; i++) {
              const ang = (2 * Math.PI * i) / 64
              poly.push({ x: cx + a * Math.cos(ang), y: cy + b * Math.sin(ang) })
            }
            polys.push(poly)
          }
          return polys
        },
      }
    }

    case "organoid_sphere": {
      const r = params.radius ?? 5
      return {
        height_mm: 2 * r, zMin: -r, zMax: r,
        getBoundsAtZ: (z) => {
          const rz = Math.sqrt(Math.max(0, r * r - z * z))
          return { minX: cx - rz, maxX: cx + rz, minY: cy - rz, maxY: cy + rz }
        },
        getPerimetersAtZ: (z, walls, spacing) => {
          const rz = Math.sqrt(Math.max(0, r * r - z * z))
          if (rz < 0.1) return []
          return circlePerimeters(cx, cy, rz, walls, spacing)
        },
      }
    }

    case "femur": {
      // R12.50: Se o STL real foi pré-carregado, usa a malha (118860 tri).
      // STL original em unidades pequenas (bbox 2×1×9) → escala 50× aplicada
      // no STL_PREPROCESS_MAP (bbox final ~105×62×453 mm).
      const stlFileFemur = STL_FILE_MAP["femur"]
      if (stlFileFemur && hasMesh(stlFileFemur)) {
        return geometryBoundsFromMesh(
          stlFileFemur,
          { x: cx, y: cy },
          { width: params.width, height: params.height, depth: params.depth },
        )
      }

      // ── Fallback paramétrico (pré-R12.50) ──
      // R12.15: Fêmur ANATÔMICO real — aproximação de bounds para slicing.
      //   - width  → largura medial→lateral (X, epicôndilos máximos)
      //   - height → comprimento total côndilos→cabeça (Z, eixo longo)
      //   - depth  → profundidade anterior→posterior (Y)
      //
      // Perfil do fêmur (eixo Z):
      //   - 0 a 15% H   → côndilos (epífise distal) — largura 100%
      //   - 15% a 85% H → diáfise — largura ~45% do máximo
      //   - 85% a 100% H → cabeça+colo+trocânter (epífise proximal) — largura 85%
      const W = params.width ?? 85
      const H = params.height ?? 450
      const D = params.depth ?? 30
      const profileAtZ = (z: number) => {
        const t = Math.max(0, Math.min(1, z / H))
        if (t < 0.15) {
          // Côndilos: largo
          return 1.0 - 0.55 * (t / 0.15)  // 1.0 → 0.45
        } else if (t < 0.85) {
          // Diáfise: cilíndrica estreita
          return 0.45
        } else {
          // Cabeça+colo+trocânter: alarga novamente
          const u = (t - 0.85) / 0.15
          return 0.45 + 0.40 * u  // 0.45 → 0.85
        }
      }
      return {
        height_mm: H, zMin: 0, zMax: H,
        getBoundsAtZ: (z) => {
          const k = profileAtZ(z)
          const a = (W / 2) * k
          const b = (D / 2) * k
          return { minX: cx - a, maxX: cx + a, minY: cy - b, maxY: cy + b }
        },
        getPerimetersAtZ: (z, walls, spacing) => {
          const k = profileAtZ(z)
          const rx = (W / 2) * k
          const ry = (D / 2) * k
          const polys: Polygon2D[] = []
          for (let w = 0; w < walls; w++) {
            const aw = rx - w * spacing
            const bw = ry - w * spacing
            if (aw <= 0.1 || bw <= 0.1) break
            const poly: Polygon2D = []
            for (let i = 0; i < 64; i++) {
              const ang = (2 * Math.PI * i) / 64
              poly.push({ x: cx + aw * Math.cos(ang), y: cy + bw * Math.sin(ang) })
            }
            polys.push(poly)
          }
          return polys
        },
      }
    }

    case "nose": {
      // R12.50: Se o STL real foi pré-carregado, usa a malha (11974 tri).
      // STL original com eixo longo em Y → rotacionado 90° X no
      // STL_PREPROCESS_MAP (Y→Z), virando bbox ~16×10×25 mm com Z = eixo longo.
      const stlFileNose = STL_FILE_MAP["nose"]
      if (stlFileNose && hasMesh(stlFileNose)) {
        return geometryBoundsFromMesh(
          stlFileNose,
          { x: cx, y: cy },
          { width: params.width, height: params.height, depth: params.depth },
        )
      }

      // ── Fallback paramétrico (pré-R12.50) ──
      // R12.13: Nariz ANATÔMICO real — aproximação de bounds para slicing.
      //   - width  → largura asa-a-asa (X)
      //   - height → altura do dorso (Z)
      //   - depth  → profundidade base→ponta (Y)
      //
      // O nariz anatômico afunila tanto em largura quanto em profundidade
      // conforme sobe (asas largas na base → ponta estreita no topo).
      // Modelagem: perfil elipsoidal modulado por (0.55 + 0.45 · (1 - z/h)).
      const w = params.width ?? 32
      const h = params.height ?? 20
      const d = params.depth ?? 51
      const taperAtZ = (z: number) => {
        const t = Math.max(0, Math.min(1, 1 - z / h))
        return 0.55 + 0.45 * t   // 1.0 na base, ~0.55 no topo
      }
      return {
        height_mm: h, zMin: 0, zMax: h,
        getBoundsAtZ: (z) => {
          const k = taperAtZ(z)
          const ww = w * k
          const dd = d * k
          return { minX: cx - ww/2, maxX: cx + ww/2, minY: cy - dd/2, maxY: cy + dd/2 }
        },
        getPerimetersAtZ: (z, walls, spacing) => {
          const k = taperAtZ(z)
          const ww = w * k
          const dd = d * k
          return rectPerimeters(cx, cy, ww, dd, walls, spacing)
        },
      }
    }

    // ─── Orelha ANATÔMICA (R12.14/R12.49) ─────────────────────────────────
    case "ear": {
      // R12.49: Se o STL real foi pré-carregado em cache pelo route handler,
      // usamos a MALHA REAL fatiada plano-a-plano (4432 triângulos).
      // Caso contrário (sandbox, teste, fetch falhou), caímos no fallback
      // paramétrico de elipse com taper — mesma lógica anterior à R12.49.
      const stlFile = STL_FILE_MAP["ear"]
      if (stlFile && hasMesh(stlFile)) {
        const W = params.width
        const H = params.height
        const D = params.depth
        return geometryBoundsFromMesh(
          stlFile,
          { x: cx, y: cy },
          { width: W, height: H, depth: D },
        )
      }

      // ── Fallback paramétrico (pré-R12.49) ──
      // Elipse alongada com taper 1.0 (base) → 0.85 (topo).
      // Avisa o coherence-check via "geometria-parametrica" info-level.
      const W = params.width ?? 35
      const H = params.height ?? 60
      const D = params.depth ?? 18
      const taperAtZ = (z: number) => {
        const t = Math.max(0, Math.min(1, 1 - z / H))
        return 0.85 + 0.15 * t
      }
      return {
        height_mm: H, zMin: 0, zMax: H,
        getBoundsAtZ: (z) => {
          const k = taperAtZ(z)
          const a = (W / 2) * k
          const b = (D / 2) * k
          return { minX: cx - a, maxX: cx + a, minY: cy - b, maxY: cy + b }
        },
        getPerimetersAtZ: (z, walls, spacing) => {
          const k = taperAtZ(z)
          const a = (W / 2) * k
          const b = (D / 2) * k
          const polys: Polygon2D[] = []
          for (let w = 0; w < walls; w++) {
            const aw = a - w * spacing
            const bw = b - w * spacing
            if (aw <= 0.1 || bw <= 0.1) break
            const poly: Polygon2D = []
            for (let i = 0; i < 64; i++) {
              const ang = (2 * Math.PI * i) / 64
              poly.push({ x: cx + aw * Math.cos(ang), y: cy + bw * Math.sin(ang) })
            }
            polys.push(poly)
          }
          return polys
        },
      }
    }

    // ─── Coração ANATÔMICO real (R12.16/R12.51) ──────────────────────────
    case "heart": {
      // R12.51: Se o STL real foi pré-carregado (447378 tri convertidos de
      // coracao.3mf, escala 3× → ~86×102×108 mm), usa a malha. Caso contrário,
      // fallback paramétrico abaixo.
      const stlFileHeart = STL_FILE_MAP["heart"]
      if (stlFileHeart && hasMesh(stlFileHeart)) {
        return geometryBoundsFromMesh(
          stlFileHeart,
          { x: cx, y: cy },
          { width: params.width, height: params.height, depth: params.depth },
        )
      }

      // ── Fallback paramétrico (pré-R12.51) ──
      // Aproximação de bounds para a mesh anatômica real:
      //   - width  → largura átrios E↔D (X)
      //   - height → altura ápice→base (Z, eixo longo)
      //   - depth  → profundidade anterior→posterior (Y)
      //
      // Perfil cardíaco (eixo Z, z=0 no ápice, z=H na base/átrios):
      //   - 0 a 15% H    → ápice (estreito, ~25% → 60% da largura)
      //   - 15% a 70% H  → ventrículos (corpo principal, 60% → 100%)
      //   - 70% a 100% H → átrios+aurículas (alarga para 100% no topo)
      const W = params.width ?? 80
      const H = params.height ?? 100
      const D = params.depth ?? 95
      const profileAtZ = (z: number) => {
        const t = Math.max(0, Math.min(1, z / H))
        if (t < 0.15) {
          // Ápice: estreito e cônico
          return 0.25 + (0.60 - 0.25) * (t / 0.15)  // 0.25 → 0.60
        } else if (t < 0.70) {
          // Ventrículos: corpo principal alargando
          const u = (t - 0.15) / 0.55
          return 0.60 + 0.40 * u  // 0.60 → 1.00
        } else {
          // Átrios+aurículas: mantém-se largo no topo
          return 1.00
        }
      }
      return {
        height_mm: H, zMin: 0, zMax: H,
        getBoundsAtZ: (z) => {
          const k = profileAtZ(z)
          const a = (W / 2) * k
          const b = (D / 2) * k
          return { minX: cx - a, maxX: cx + a, minY: cy - b, maxY: cy + b }
        },
        getPerimetersAtZ: (z, walls, spacing) => {
          const k = profileAtZ(z)
          const rx = (W / 2) * k
          const ry = (D / 2) * k
          const polys: Polygon2D[] = []
          for (let w = 0; w < walls; w++) {
            const aw = rx - w * spacing
            const bw = ry - w * spacing
            if (aw <= 0.1 || bw <= 0.1) break
            const poly: Polygon2D = []
            for (let i = 0; i < 64; i++) {
              const ang = (2 * Math.PI * i) / 64
              poly.push({ x: cx + aw * Math.cos(ang), y: cy + bw * Math.sin(ang) })
            }
            polys.push(poly)
          }
          return polys
        },
      }
    }

    // ─── Rim ANATÔMICO real (R12.51) ─────────────────────────────────────
    case "kidney": {
      // R12.51: Se o STL real foi pré-carregado (7960 tri de rim.stl,
      // rotacionado 90° em Y e escala 3× → ~116×38×59 mm anatômico),
      // usa a malha. Caso contrário, fallback paramétrico abaixo.
      const stlFileKidney = STL_FILE_MAP["kidney"]
      if (stlFileKidney && hasMesh(stlFileKidney)) {
        return geometryBoundsFromMesh(
          stlFileKidney,
          { x: cx, y: cy },
          { width: params.width, height: params.height, depth: params.depth },
        )
      }

      // ── Fallback paramétrico (pré-R12.51) ──
      // Aproximação: cilindro com seção elíptica, eixo vertical.
      // params: length=45 (Y), width=25 (X), thickness=15 (Z), segments=32
      const W = params.width ?? 25
      const L = params.length ?? 45
      const T = params.thickness ?? 15
      const a = W / 2, b = L / 2
      return {
        height_mm: T, zMin: 0, zMax: T,
        getBoundsAtZ: () => ({ minX: cx - a, maxX: cx + a, minY: cy - b, maxY: cy + b }),
        getPerimetersAtZ: (_z, walls, spacing) => {
          const polys: Polygon2D[] = []
          for (let w = 0; w < walls; w++) {
            const aw = a - w * spacing
            const bw = b - w * spacing
            if (aw <= 0.1 || bw <= 0.1) break
            const poly: Polygon2D = []
            for (let i = 0; i < 64; i++) {
              const ang = (2 * Math.PI * i) / 64
              // Pequena reentrância no meio para simular hilo renal
              const indent = 1 - 0.15 * Math.exp(-Math.pow(Math.sin(ang) * 2, 2))
              poly.push({ x: cx + aw * Math.cos(ang) * indent, y: cy + bw * Math.sin(ang) })
            }
            polys.push(poly)
          }
          return polys
        },
      }
    }

    // R12.51: case "liver_anatomical" REMOVIDO do catálogo a pedido da Janaina.
    // Justificativa: STL anatômico de fígado não está disponível e o paramétrico
    // (elipse achatada) não representava bem o órgão. Removida do enum
    // SUPPORTED_GEOMETRY_IDS, da lista PARAMETRIC_ANATOMICAL e do frontend.

    // ─── Mão (palma simplificada) ────────────────────────────────────────
    case "hand": {
      // Aproximação simples: retângulo arredondado da palma (sem dedos detalhados).
      // params: palmWidth=80, palmLength=100, fingerLength=70, thickness=15
      const W = params.palmWidth ?? 80
      const L = (params.palmLength ?? 100) + (params.fingerLength ?? 70)
      const T = params.thickness ?? 15
      return {
        height_mm: T, zMin: 0, zMax: T,
        getBoundsAtZ: () => ({ minX: cx - W/2, maxX: cx + W/2, minY: cy - L/2, maxY: cy + L/2 }),
        getPerimetersAtZ: (_z, walls, spacing) => rectPerimeters(cx, cy, W, L, walls, spacing),
      }
    }

    // ─── TPMS Gyroid / Schwarz P / Diamond ──────────────────────────────
    // Os 3 scaffolds TPMS têm bbox cúbica idêntica. A topologia interna
    // (giroide/schwarz/diamond) é gerada pelo algoritmo de infill (não pela
    // shell). Walls = perímetro do cubo.
    case "tpms_gyroid":
    case "tpms_schwarz":
    case "tpms_diamond": {
      const s = params.tpmsSize ?? 20
      return {
        height_mm: s, zMin: 0, zMax: s,
        getBoundsAtZ: () => ({ minX: cx - s/2, maxX: cx + s/2, minY: cy - s/2, maxY: cy + s/2 }),
        getPerimetersAtZ: (_z, walls, spacing) => rectPerimeters(cx, cy, s, s, walls, spacing),
      }
    }

    // ─── R12.36 · Testes de impressibilidade (PERIMETER-ONLY by design) ──
    // Estas geometrias são CONTORNOS (sem volume interno), portanto:
    //   • bounding box é dado pela mesh native (XY plano da peça)
    //   • getPerimetersAtZ retorna um retângulo do bbox da peça
    //   • infill DEVE ser pulado (perimeterOnly mode → infillPercent=0)
    // A fidelidade do contorno depende da mesh real — aqui só geramos um
    // bbox para o engine não dar fallback genérico. O g-code emitido será
    // apenas as paredes/perímetros (engine já trata infillPercent=0).
    case "test_fidelity_biotinta": {
      // Mesh exata 15.4 × 15.4 × 0.8 mm (R12.35)
      const W = 15.4, H = 15.4, T = 0.8
      return {
        height_mm: T, zMin: 0, zMax: T,
        getBoundsAtZ: () => ({ minX: cx - W/2, maxX: cx + W/2, minY: cy - H/2, maxY: cy + H/2 }),
        getPerimetersAtZ: (_z, walls, spacing) => rectPerimeters(cx, cy, W, H, walls, spacing),
      }
    }
    case "test_grid": {
      // Grade de fusão (Pf test): default width=20, segments=5
      const W = params.width ?? 20
      // Altura tipica: 2-3 camadas (assumimos 2 layers de 0.4 mm)
      const T = 0.8
      return {
        height_mm: T, zMin: 0, zMax: T,
        getBoundsAtZ: () => ({ minX: cx - W/2, maxX: cx + W/2, minY: cy - W/2, maxY: cy + W/2 }),
        getPerimetersAtZ: (_z, walls, spacing) => rectPerimeters(cx, cy, W, W, walls, spacing),
      }
    }
    case "test_line": {
      // Linhas paralelas: comprimento × ~10 mm de largura (5 linhas espaçadas 4 mm)
      const L = params.length ?? 20
      const W = 20  // 5 linhas × 4 mm spacing
      const T = 0.4 // 1 camada
      return {
        height_mm: T, zMin: 0, zMax: T,
        getBoundsAtZ: () => ({ minX: cx - L/2, maxX: cx + L/2, minY: cy - W/2, maxY: cy + W/2 }),
        getPerimetersAtZ: (_z, walls, spacing) => rectPerimeters(cx, cy, L, W, walls, spacing),
      }
    }
    case "test_collapse_bridge": {
      // Pontes 3+5+7+10+15 mm + torres 4×4: total ~50×4×8 mm
      const W = 60, D = 8, T = 8
      return {
        height_mm: T, zMin: 0, zMax: T,
        getBoundsAtZ: () => ({ minX: cx - W/2, maxX: cx + W/2, minY: cy - D/2, maxY: cy + D/2 }),
        getPerimetersAtZ: (_z, walls, spacing) => rectPerimeters(cx, cy, W, D, walls, spacing),
      }
    }
    case "test_star": {
      // Pino central + 6 braços de 8 mm × Ø0.4 mm
      const R = 10 // raio total ~ 1.5 + 8
      return {
        height_mm: 4, zMin: 0, zMax: 4,
        getBoundsAtZ: () => ({ minX: cx - R, maxX: cx + R, minY: cy - R, maxY: cy + R }),
        getPerimetersAtZ: (_z, walls, spacing) => circlePerimeters(cx, cy, R, walls, spacing),
      }
    }
    case "test_stacking_tower": {
      const R = params.radius ?? 3
      const layers = params.segments ?? 24
      const T = layers * 0.4 // assume layer height 0.4 mm
      return {
        height_mm: T, zMin: 0, zMax: T,
        getBoundsAtZ: () => ({ minX: cx - R, maxX: cx + R, minY: cy - R, maxY: cy + R }),
        getPerimetersAtZ: (_z, walls, spacing) => circlePerimeters(cx, cy, R, walls, spacing),
      }
    }
    case "test_z_staircase": {
      // 5 degraus 4×12 mm com alturas crescentes
      const W = 4 * 5, D = 12, T = 0.4 + 0.3 + 0.2 + 0.15 + 0.1
      return {
        height_mm: T, zMin: 0, zMax: T,
        getBoundsAtZ: () => ({ minX: cx - W/2, maxX: cx + W/2, minY: cy - D/2, maxY: cy + D/2 }),
        getPerimetersAtZ: (_z, walls, spacing) => rectPerimeters(cx, cy, W, D, walls, spacing),
      }
    }
    case "test_angle_fan": {
      const L = params.length ?? 15
      const R = L  // raio do leque
      return {
        height_mm: 0.4, zMin: 0, zMax: 0.4,
        getBoundsAtZ: () => ({ minX: cx, maxX: cx + R, minY: cy - R, maxY: cy + R }),
        getPerimetersAtZ: (_z, walls, spacing) => rectPerimeters(cx + R/2, cy, R, R*2, walls, spacing),
      }
    }

    default: {
      // ⚠️ Geometria desconhecida: usa um disco generoso (Ø20mm, 5mm alto)
      // ao invés do antigo 10x3 — mais útil como fallback para teste de
      // impressão. O caller deve sempre verificar warnings do engine.
      console.warn(`[geometry-bounds] geometria "${geomId}" sem mapping específico — usando fallback disk 20mm/5mm.`)
      return getGeometryBounds("disk", { radius: 10, thickness: 5 }, origin)
    }
  }
}

// ─── Helper público: lista todas as geometrias com bounds dedicado ─────────
// Útil para o frontend validar antes de chamar /api/gcode/generate.
export const SUPPORTED_GEOMETRY_IDS = [
  "membrane", "disk", "skin_cylinder", "bone_block", "cube_tissue", "vessel", "hexagonal_liver",
  "femur", "nose", "meniscus", "cornea", "lens", "organoid_sphere",
  "ear", "heart", "kidney", "hand",
  "tpms_gyroid", "tpms_schwarz", "tpms_diamond",
  // R12.36 — testes de impressibilidade (perimeter-only by design)
  "test_fidelity_biotinta", "test_grid", "test_line", "test_collapse_bridge",
  "test_star", "test_stacking_tower", "test_z_staircase", "test_angle_fan",
] as const

// R12.36 — geometrias que SÃO contornos (sem volume interno) e devem
// SEMPRE rodar em modo "Apenas Contorno" (infillPercent=0). Usado pelo
// frontend para sugerir/forçar perimeterOnly automaticamente.
export const PERIMETER_ONLY_GEOMETRY_IDS = [
  "test_fidelity_biotinta", "test_grid", "test_line", "test_collapse_bridge",
  "test_star", "test_stacking_tower", "test_z_staircase", "test_angle_fan",
] as const

export function isPerimeterOnlyGeometry(id: string): boolean {
  return PERIMETER_ONLY_GEOMETRY_IDS.includes(id as typeof PERIMETER_ONLY_GEOMETRY_IDS[number])
}

export function isSupportedGeometry(id: string): boolean {
  return SUPPORTED_GEOMETRY_IDS.includes(id as typeof SUPPORTED_GEOMETRY_IDS[number])
}

// ═══════════════════════════════════════════════════════════════════════════
// R12.55 — Segmentação Básico vs Avançado (Modo B como default)
// ───────────────────────────────────────────────────────────────────────────
// Estratégia: o /slice mostra APENAS a lista BÁSICA por default (Motor B —
// quick-gcode.ts síncrono, validado em teste). O usuário precisa acionar
// explicitamente o toggle "🧪 Modo Avançado (experimental)" para acessar as
// geometrias anatômicas (heart/kidney/femur/…) + TPMS via Motor A (engine.ts,
// 45s timeout, sem cobertura de testes garantida).
//
// BASIC_GEOMETRY_IDS: cobertas pelo Motor B (quick-gcode) + testes de
// impressibilidade validados (Nelson 2021 ready).
//
// ADVANCED_GEOMETRY_IDS: anatômicas + TPMS via engine.ts — bandeira
// "experimental" obrigatória no UI.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Geometrias BÁSICAS (Modo B / quick-gcode.ts) — Motor síncrono, testado, <100ms.
 *
 * Inclui as 5 formas paramétricas simples + 8 testes de impressibilidade
 * (perimeter-only). No total, 13 IDs seguros para uso em produção.
 *
 * As geometrias "cube", "cylinder", "disk", "patch", "tube" são geradas pelo
 * quick-gcode.ts diretamente no browser (sync). Os testes de impressibilidade
 * são gerados pelo engine.ts em modo perimeter-only (rápido e determinístico).
 *
 * Mapeamento quick-gcode → engine.ts IDs:
 *   quick "cube"     ↔ engine "cube_tissue"
 *   quick "cylinder" ↔ engine "skin_cylinder"  (cilindro sólido)
 *   quick "disk"     ↔ engine "disk"
 *   quick "patch"    ↔ engine "membrane"
 *   quick "tube"     ↔ engine "vessel"         (tubulação/anel)
 *   quick "grid"     ↔ (não há equivalente engine — só quick-gcode)
 */
export const BASIC_GEOMETRY_IDS = [
  // Formas paramétricas (Motor B / quick-gcode.ts)
  "cube_tissue", "skin_cylinder", "disk", "membrane", "vessel",
  // Testes de impressibilidade (rápidos, perimeter-only, validados)
  "test_fidelity_biotinta", "test_grid", "test_line", "test_collapse_bridge",
  "test_star", "test_stacking_tower", "test_z_staircase", "test_angle_fan",
] as const

/**
 * Geometrias AVANÇADAS (Motor A / engine.ts) — experimental, sem garantia de tempo.
 *
 * - Anatômicas: heart, kidney, femur, nose, ear, hand, hexagonal_liver,
 *   meniscus, cornea, lens, organoid_sphere → carregam STL grande + Voronoi
 *   e podem exceder 45s no build.
 * - TPMS: gyroid/schwarz/diamond → gerações matematicamente pesadas.
 * - bone_block: bloco denso trabecular → também via engine.ts.
 */
export const ADVANCED_GEOMETRY_IDS = [
  "bone_block",
  "femur", "nose", "meniscus", "cornea", "lens", "organoid_sphere",
  "ear", "heart", "kidney", "hand", "hexagonal_liver",
  "tpms_gyroid", "tpms_schwarz", "tpms_diamond",
] as const

export function isBasicGeometry(id: string): boolean {
  return BASIC_GEOMETRY_IDS.includes(id as typeof BASIC_GEOMETRY_IDS[number])
}

export function isAdvancedGeometry(id: string): boolean {
  return ADVANCED_GEOMETRY_IDS.includes(id as typeof ADVANCED_GEOMETRY_IDS[number])
}

/**
 * Retorna "basic" | "advanced" | "unknown" para qualquer geometry ID.
 * Usado pela UI para decidir badge: "⚡ Verificado" vs "🧪 Experimental".
 */
export function classifyGeometry(id: string): "basic" | "advanced" | "unknown" {
  if (isBasicGeometry(id)) return "basic"
  if (isAdvancedGeometry(id)) return "advanced"
  return "unknown"
}

/**
 * Mapeamento quick-gcode → engine ID (usado quando /slice precisa
 * traduzir a escolha do modo Básico para o naming legacy do engine.ts).
 */
export const QUICK_TO_ENGINE_ID: Record<string, string> = {
  cube: "cube_tissue",
  cylinder: "skin_cylinder",
  disk: "disk",
  patch: "membrane",
  tube: "vessel",
  // grid: sem mapping — só quick-gcode
}

/**
 * Mapeamento engine → quick-gcode ID (inverso).
 */
export const ENGINE_TO_QUICK_ID: Record<string, string> = {
  cube_tissue: "cube",
  skin_cylinder: "cylinder",
  disk: "disk",
  membrane: "patch",
  vessel: "tube",
}
