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
      const r = params.radius ?? 8
      const L = params.tubeLength ?? 60
      return {
        height_mm: L, zMin: 0, zMax: L,
        getBoundsAtZ: () => ({ minX: cx - r, maxX: cx + r, minY: cy - r, maxY: cy + r }),
        getPerimetersAtZ: (_z, walls, spacing) => circlePerimeters(cx, cy, r, walls, spacing),
      }
    }

    case "nose": {
      const w = params.width ?? 24
      const h = params.height ?? 30
      const d = params.depth ?? 18
      return {
        height_mm: h, zMin: 0, zMax: h,
        getBoundsAtZ: (z) => {
          // afunila no topo
          const t = 1 - z / h
          const ww = w * (0.5 + 0.5 * t)
          const dd = d * (0.5 + 0.5 * t)
          return { minX: cx - ww/2, maxX: cx + ww/2, minY: cy - dd/2, maxY: cy + dd/2 }
        },
        getPerimetersAtZ: (z, walls, spacing) => {
          const t = 1 - z / h
          const ww = w * (0.5 + 0.5 * t)
          const dd = d * (0.5 + 0.5 * t)
          return rectPerimeters(cx, cy, ww, dd, walls, spacing)
        },
      }
    }

    default: {
      // fallback: disk 10x3
      return getGeometryBounds("disk", { radius: 10, thickness: 3 }, origin)
    }
  }
}
