/**
 * BIA v4 · R15 · BioSlicer — Planejador de trajetórias por camada
 *
 * Contornos normalizados + params → ToolPaths ordenados (skirt, paredes,
 * infill) minimizando travel e arranques de extrusão.
 */

import type { Polygon, Path, Vec2, SliceParams, ToolPath, PathRole } from "./types"
import {
  offsetPolySet, groupIslands, normalizeContours, nearestVertexIndex, rotateStart,
  dist, pathLength, centroid, isCCW, bboxOf,
} from "./polygon-ops"
import { generateInfill, type InfillOutput } from "./infill"

export interface LayerPlanInput {
  contours: Polygon[]
  layerIndex: number
  z_mm: number
  layerHeight_mm: number
  params: SliceParams
  startPoint: Vec2
  rand: () => number
}

export interface LayerPlanOutput {
  paths: ToolPath[]
  infillInfo: { spacing_mm: number; poreSize_mm: number | null } | null
  endPoint: Vec2
}

export function planLayer(inp: LayerPlanInput): LayerPlanOutput {
  const { params: P, contours, layerIndex } = inp
  const isFirst = layerIndex === 0
  const speedWall = isFirst ? P.speedFirstLayer_mms : P.speedPerimeter_mms
  const speedInfill = isFirst ? P.speedFirstLayer_mms : P.speedInfill_mms
  const paths: ToolPath[] = []
  let cursor = inp.startPoint
  let infillInfo: LayerPlanOutput["infillInfo"] = null

  if (contours.length === 0) return { paths, infillInfo, endPoint: cursor }

  if (isFirst && P.skirtLoops > 0) {
    const outers = contours.filter(isCCW)
    for (let k = 0; k < P.skirtLoops; k++) {
      const d = -(P.skirtDistance_mm + k * P.lineWidth_mm)
      const ring = offsetPolySet(outers, d).filter(isCCW)
      for (const poly of ring) {
        const pts = rotateStart(poly, nearestVertexIndex(poly, cursor))
        paths.push({ role: "skirt", points: pts, closed: true, speed_mms: speedWall, lineWidth_mm: P.lineWidth_mm })
        cursor = pts[0]
      }
    }
  }

  const wallSets: Polygon[][] = []
  for (let w = 0; w < P.wallCount; w++) {
    const set = offsetPolySet(contours, P.lineWidth_mm * (w + 0.5))
    if (set.length === 0) break
    wallSets.push(set)
  }

  const infillInset = P.lineWidth_mm * P.wallCount - P.lineWidth_mm * P.infillOverlap
  const infillRegion = P.wallCount > 0 ? offsetPolySet(contours, Math.max(P.lineWidth_mm * 0.5, infillInset)) : contours

  const islands = groupIslands(normalizeContours(contours))
  const islandOrder = orderIslands(islands.map((i) => i.outer), cursor)

  for (const ii of islandOrder) {
    const island = islands[ii]
    const wallsHere: Polygon[][] = wallSets.map((set) => set.filter((poly) => insideIsland(poly, island.outer)))
    const order = P.wallOrder === "outside_in" ? wallsHere : [...wallsHere].reverse()
    for (let k = 0; k < order.length; k++) {
      const role: PathRole = (P.wallOrder === "outside_in" ? k === 0 : k === order.length - 1) ? "wall_outer" : "wall_inner"
      for (const poly of orderPolys(order[k], cursor)) {
        const pts = rotateStart(poly, chooseSeam(poly, cursor, P.seam, inp.rand))
        paths.push({ role, points: pts, closed: true, speed_mms: speedWall, lineWidth_mm: P.lineWidth_mm })
        cursor = pts[0]
      }
    }

    const doInfill = P.infillPattern !== "none" && P.infillDensity > 0 &&
      (P.infillEveryNLayers <= 1 || layerIndex % P.infillEveryNLayers === 0)
    if (doInfill) {
      const regionHere = infillRegion.filter((poly) => insideIsland(poly, island.outer))
      if (regionHere.length > 0) {
        const out: InfillOutput = generateInfill({
          region: normalizeContours(regionHere),
          pattern: P.infillPattern,
          lineWidth_mm: P.lineWidth_mm,
          density_pct: P.infillDensity,
          angle_deg: P.infillAngle_deg + layerIndex * P.infillAngleStep_deg,
          layerIndex, z_mm: inp.z_mm,
          strandSpacing_mm: P.strandSpacing_mm,
        })
        infillInfo = { spacing_mm: out.spacing_mm, poreSize_mm: out.poreSize_mm }
        for (const p of orderPaths(out.paths, cursor)) {
          const closed = p.length > 2 && dist(p[0], p[p.length - 1]) < 1e-6
          const pts = closed ? p.slice(0, -1) : p
          paths.push({ role: "infill", points: pts, closed, speed_mms: speedInfill, lineWidth_mm: P.lineWidth_mm })
          cursor = closed ? pts[0] : pts[pts.length - 1]
        }
      }
    }
  }

  return { paths, infillInfo, endPoint: cursor }
}

function insideIsland(poly: Polygon, outer: Polygon): boolean {
  if (poly.length < 2) return false
  const probe = { x: (poly[0].x + poly[1].x) / 2, y: (poly[0].y + poly[1].y) / 2 }
  let inside = false
  const n = outer.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = outer[i], b = outer[j]
    if ((a.y > probe.y) !== (b.y > probe.y) &&
      probe.x < ((b.x - a.x) * (probe.y - a.y)) / ((b.y - a.y) || 1e-12) + a.x) inside = !inside
  }
  return inside
}

function orderIslands(outers: Polygon[], start: Vec2): number[] {
  const cents = outers.map(centroid)
  const result: number[] = []
  let cur = start
  const remaining = new Set(outers.map((_, i) => i))
  while (remaining.size) {
    let best = -1, bd = Infinity
    for (const i of Array.from(remaining)) {
      const d = dist(cur, cents[i])
      if (d < bd) { bd = d; best = i }
    }
    result.push(best); remaining.delete(best); cur = cents[best]
  }
  return result
}

function orderPolys(polys: Polygon[], start: Vec2): Polygon[] {
  const remaining = polys.slice()
  const out: Polygon[] = []
  let cur = start
  while (remaining.length) {
    let bi = 0, bd = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const d = dist(cur, remaining[i][nearestVertexIndex(remaining[i], cur)])
      if (d < bd) { bd = d; bi = i }
    }
    const p = remaining.splice(bi, 1)[0]
    out.push(p)
    cur = p[0]
  }
  return out
}

export function orderPaths(paths: Path[], start: Vec2): Path[] {
  const remaining = paths.map((p) => p)
  const out: Path[] = []
  let cur = start
  while (remaining.length) {
    let bi = 0, bd = Infinity, flip = false
    for (let i = 0; i < remaining.length; i++) {
      const p = remaining[i]
      const d0 = dist(cur, p[0]), d1 = dist(cur, p[p.length - 1])
      if (d0 < bd) { bd = d0; bi = i; flip = false }
      if (d1 < bd) { bd = d1; bi = i; flip = true }
    }
    let p = remaining.splice(bi, 1)[0]
    const closed = p.length > 2 && dist(p[0], p[p.length - 1]) < 1e-6
    if (flip && !closed) p = [...p].reverse()
    if (closed) {
      const open = p.slice(0, -1)
      const rot = rotateStart(open, nearestVertexIndex(open, cur))
      p = [...rot, rot[0]]
    }
    out.push(p)
    cur = p[p.length - 1]
  }
  return out
}

function chooseSeam(poly: Polygon, cursor: Vec2, seam: SliceParams["seam"], rand: () => number): number {
  switch (seam) {
    case "aligned": {
      let best = 0
      for (let i = 1; i < poly.length; i++) {
        if (poly[i].x < poly[best].x - 1e-6 || (Math.abs(poly[i].x - poly[best].x) < 1e-6 && poly[i].y < poly[best].y)) best = i
      }
      return best
    }
    case "rear": {
      let best = 0
      for (let i = 1; i < poly.length; i++) if (poly[i].y > poly[best].y) best = i
      return best
    }
    case "random": return Math.floor(rand() * poly.length) % poly.length
    default: return nearestVertexIndex(poly, cursor)
  }
}

export function totalExtrudeLength(paths: ToolPath[]): number {
  let L = 0
  for (const p of paths) L += pathLength(p.points, p.closed)
  return L
}

export { bboxOf }
