/**
 * BIA v4 · R15 · BioSlicer — Primitivas de malha: caixa, cilindro, tubo, domo.
 */

import type { TriMesh } from "./types"
import { finalizeMesh } from "./mesh-slice"

function tri(arr: number[], a: number[], b: number[], c: number[]) {
  arr.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2])
}

export function boxMesh(sx: number, sy: number, sz: number, name = "box"): TriMesh {
  const x0 = -sx / 2, x1 = sx / 2, y0 = -sy / 2, y1 = sy / 2, z0 = 0, z1 = sz
  const v: number[] = []
  const p = (x: number, y: number, z: number) => [x, y, z]
  tri(v, p(x0, y0, z0), p(x1, y1, z0), p(x1, y0, z0)); tri(v, p(x0, y0, z0), p(x0, y1, z0), p(x1, y1, z0))
  tri(v, p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1)); tri(v, p(x0, y0, z1), p(x1, y1, z1), p(x0, y1, z1))
  tri(v, p(x0, y0, z0), p(x1, y0, z0), p(x1, y0, z1)); tri(v, p(x0, y0, z0), p(x1, y0, z1), p(x0, y0, z1))
  tri(v, p(x0, y1, z0), p(x1, y1, z1), p(x1, y1, z0)); tri(v, p(x0, y1, z0), p(x0, y1, z1), p(x1, y1, z1))
  tri(v, p(x0, y0, z0), p(x0, y0, z1), p(x0, y1, z1)); tri(v, p(x0, y0, z0), p(x0, y1, z1), p(x0, y1, z0))
  tri(v, p(x1, y0, z0), p(x1, y1, z1), p(x1, y0, z1)); tri(v, p(x1, y0, z0), p(x1, y1, z0), p(x1, y1, z1))
  return finalizeMesh(new Float32Array(v), v.length / 9, name)
}

export function cylinderMesh(diameter: number, height: number, segments = 64, name = "cylinder"): TriMesh {
  return tubeMesh(diameter, 0, height, segments, name)
}

export function tubeMesh(outerDiameter: number, innerDiameter: number, height: number, segments = 64, name = "tube"): TriMesh {
  const ro = outerDiameter / 2, ri = innerDiameter / 2
  const v: number[] = []
  const ring = (r: number, z: number, i: number) => {
    const a = (2 * Math.PI * i) / segments
    return [r * Math.cos(a), r * Math.sin(a), z]
  }
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments
    tri(v, ring(ro, 0, i), ring(ro, 0, j), ring(ro, height, j))
    tri(v, ring(ro, 0, i), ring(ro, height, j), ring(ro, height, i))
    if (ri > 0) {
      tri(v, ring(ri, 0, i), ring(ri, height, j), ring(ri, 0, j))
      tri(v, ring(ri, 0, i), ring(ri, height, i), ring(ri, height, j))
      tri(v, ring(ro, 0, i), ring(ri, 0, j), ring(ro, 0, j))
      tri(v, ring(ro, 0, i), ring(ri, 0, i), ring(ri, 0, j))
      tri(v, ring(ro, height, i), ring(ro, height, j), ring(ri, height, j))
      tri(v, ring(ro, height, i), ring(ri, height, j), ring(ri, height, i))
    } else {
      tri(v, [0, 0, 0], ring(ro, 0, j), ring(ro, 0, i))
      tri(v, [0, 0, height], ring(ro, height, i), ring(ro, height, j))
    }
  }
  return finalizeMesh(new Float32Array(v), v.length / 9, name)
}

export function domeMesh(diameter: number, height: number, segments = 48, rings = 12, name = "dome"): TriMesh {
  const a = diameter / 2
  const R = (a * a + height * height) / (2 * height)
  const zc = height - R
  const v: number[] = []
  const pt = (ri: number, i: number) => {
    const z = height * (1 - ri / rings)
    const rr = Math.sqrt(Math.max(0, R * R - (z - zc) ** 2))
    const ang = (2 * Math.PI * i) / segments
    return [rr * Math.cos(ang), rr * Math.sin(ang), z]
  }
  for (let ri = 0; ri < rings; ri++) {
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments
      const p00 = pt(ri, i), p01 = pt(ri, j), p10 = pt(ri + 1, i), p11 = pt(ri + 1, j)
      tri(v, p00, p11, p01); tri(v, p00, p10, p11)
    }
  }
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments
    tri(v, [0, 0, 0], pt(rings, j), pt(rings, i))
  }
  return finalizeMesh(new Float32Array(v), v.length / 9, name)
}

export const PRIMITIVE_CATALOG = [
  { id: "box", label: "Bloco / scaffold retangular", make: (p: Record<string, number>) => boxMesh(p.x ?? 10, p.y ?? 10, p.z ?? 3, "bloco") },
  { id: "cylinder", label: "Disco / cilindro", make: (p: Record<string, number>) => cylinderMesh(p.d ?? 10, p.z ?? 2, 72, "disco") },
  { id: "tube", label: "Anel / tubo (vaso)", make: (p: Record<string, number>) => tubeMesh(p.d ?? 8, p.di ?? 5, p.z ?? 5, 72, "tubo") },
  { id: "dome", label: "Domo (organoide / córnea)", make: (p: Record<string, number>) => domeMesh(p.d ?? 6, p.z ?? 2.5, 48, 10, "domo") },
]
