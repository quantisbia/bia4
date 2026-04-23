/**
 * BIA v4.2 — Motor Principal de GCODE
 *
 * Orquestra todos os módulos:
 *   1. Para cada poço selecionado → posicionar geometria no referencial da placa
 *   2. Planeja trajetória ótima entre poços (TSP)
 *   3. Para cada poço, para cada camada Z:
 *        - emite perímetros (walls)
 *        - emite infill (gyroid/voronoi/gradient/channels)
 *        - transita entre poços com z-hop + purge
 *   4. Agrupa em Moves e emite G-code final via emitter
 */

import type {
  PrintJob, Move, GCodeResult, Point2D,
  Polygon2D, Segment2D, BBox2D, WellPlateConfig,
  InfillAlgorithm,
} from "./core/types"
import {
  emitGCode, travelTo, extrudeTo, retract, primeExtruder, dwell,
} from "./core/emitter"
import { analyzeMoves, shearStressWall_Pa, estimateViability_pct, mmsToMmMin } from "./core/kinematics"
import { WELL_PLATES, wellCenter } from "./wellplates/catalog"
import { planTrajectory } from "./wellplates/trajectory-planner"
import { getGeometryBounds } from "./slicer/geometry-bounds"
import { generateGyroidInfill } from "./infill/parametric/gyroid-tpms"
import { generateVoronoiInfill } from "./infill/non-parametric/voronoi"
import { generateGradientInfill, rectilinear } from "./infill/parametric/gradient"
import { generateChannels } from "./infill/channels/channels"

// ═══════════════════════════════════════════════════════════════
// GERADOR DE INFILL (dispatcher)
// ═══════════════════════════════════════════════════════════════
function dispatchInfill(
  algorithm: InfillAlgorithm,
  bbox: BBox2D,
  z_mm: number,
  zMax: number,
  infillPercent: number,
  macroPorosity?: { density: number; poreSize_um: number; seed?: number },
): Segment2D[] {
  const density = 1 - infillPercent / 100  // porosity = 1 - infill
  const poreSize = macroPorosity?.poreSize_um ?? 500
  const seed = macroPorosity?.seed ?? 42

  switch (algorithm) {
    case "gyroid_tpms":
      return generateGyroidInfill(bbox, z_mm, { density, poreSize_um: poreSize, seed })
    case "voronoi_3d":
    case "voronoi_2d":
      return generateVoronoiInfill(bbox, { density, poreSize_um: poreSize, seed }).segments
    case "gradient":
      return generateGradientInfill(bbox, {
        axis: "z",
        profile: "linear",
        startDensity: 0.8,
        endDensity: 0.3,
        z_mm, zMin: 0, zMax,
        angle_deg: 45,
        minSpacing_mm: 0.8,
        maxSpacing_mm: 3.0,
      })
    case "rectilinear":
    case "linear":
    default: {
      // spacing = nozzle_mm / infill_fraction (quanto menor infill, maior espaço)
      const nozzle_mm = 0.4 // placeholder; será ajustado pelo caller
      const spacing = infillPercent > 0 ? nozzle_mm / (infillPercent / 100) : 5
      return rectilinear(bbox, spacing, (z_mm * 90) % 180)  // alterna ângulo por camada
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// TRANSLADA GEOMETRIA PARA POSIÇÃO DO POÇO
// ═══════════════════════════════════════════════════════════════
function translatePoly(poly: Polygon2D, dx: number, dy: number): Polygon2D {
  return poly.map((p) => ({ x: p.x + dx, y: p.y + dy }))
}
function translateSeg(seg: Segment2D, dx: number, dy: number): Segment2D {
  return {
    a: { x: seg.a.x + dx, y: seg.a.y + dy },
    b: { x: seg.b.x + dx, y: seg.b.y + dy },
  }
}
function translateBBox(bbox: BBox2D, dx: number, dy: number): BBox2D {
  return {
    minX: bbox.minX + dx, maxX: bbox.maxX + dx,
    minY: bbox.minY + dy, maxY: bbox.maxY + dy,
  }
}

// ═══════════════════════════════════════════════════════════════
// EMITIR POLIGONAL (perímetro) COMO MOVES
// ═══════════════════════════════════════════════════════════════
function polygonToMoves(
  poly: Polygon2D,
  z: number,
  extrusionPerMm: number,
  job: PrintJob,
  wellId: string,
  layer: number,
): Move[] {
  if (poly.length === 0) return []
  const moves: Move[] = []
  const first = poly[0]
  // travel to start
  moves.push({ ...travelTo(first.x, first.y, job.bioink, z, wellId), layer })
  moves.push({ ...primeExtruder(job.bioink), wellId, layer })

  let prev = first
  for (let i = 1; i <= poly.length; i++) {
    const p = poly[i % poly.length]
    const d = Math.sqrt((p.x - prev.x) ** 2 + (p.y - prev.y) ** 2)
    const e = d * extrusionPerMm
    moves.push({ ...extrudeTo(p.x, p.y, e, job.bioink, z, wellId, layer) })
    prev = p
  }
  moves.push({ ...retract(job.bioink), wellId, layer })
  return moves
}

/**
 * Converte uma lista de segmentos (infill/channels) em moves.
 * Ordena para minimizar travel (greedy nearest-neighbor).
 */
function segmentsToMoves(
  segs: Segment2D[],
  z: number,
  extrusionPerMm: number,
  job: PrintJob,
  wellId: string,
  layer: number,
): Move[] {
  if (segs.length === 0) return []
  const moves: Move[] = []
  const used = new Set<number>()
  let current: Point2D = segs[0].a
  let first = true

  for (let iter = 0; iter < segs.length; iter++) {
    // encontra segmento mais próximo não usado
    let bestIdx = -1
    let bestDist = Infinity
    let bestFlip = false
    for (let i = 0; i < segs.length; i++) {
      if (used.has(i)) continue
      const dA = (segs[i].a.x - current.x) ** 2 + (segs[i].a.y - current.y) ** 2
      const dB = (segs[i].b.x - current.x) ** 2 + (segs[i].b.y - current.y) ** 2
      if (dA < bestDist) { bestDist = dA; bestIdx = i; bestFlip = false }
      if (dB < bestDist) { bestDist = dB; bestIdx = i; bestFlip = true }
    }
    if (bestIdx < 0) break
    used.add(bestIdx)
    const seg = segs[bestIdx]
    const start = bestFlip ? seg.b : seg.a
    const end   = bestFlip ? seg.a : seg.b

    // travel + prime + extrude
    if (first || Math.sqrt(bestDist) > 0.3) {
      moves.push({ ...travelTo(start.x, start.y, job.bioink, z, wellId), layer })
      if (!first) moves.push({ ...primeExtruder(job.bioink), wellId, layer })
      first = false
    }
    const d = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2)
    moves.push({ ...extrudeTo(end.x, end.y, d * extrusionPerMm, job.bioink, z, wellId, layer) })
    current = end
  }
  moves.push({ ...retract(job.bioink), wellId, layer })
  return moves
}

// ═══════════════════════════════════════════════════════════════
// MOTOR PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export interface EngineInput {
  job: PrintJob
  geometryId: string
  geometryParams: Record<string, number>
  wellPlate?: WellPlateConfig
}

export function generateGCodeForJob(input: EngineInput): GCodeResult {
  const { job, geometryId, geometryParams, wellPlate } = input
  const warnings: string[] = []

  // 1) Determinar poços e trajetória
  let selectedWells: string[]
  let wellCenters: Record<string, Point2D>
  if (wellPlate && wellPlate.selectedWells.length > 0) {
    const spec = WELL_PLATES[wellPlate.format]
    selectedWells = wellPlate.selectedWells
    wellCenters = {}
    for (const w of selectedWells) wellCenters[w] = wellCenter(spec, w)

    // Validar que construto cabe no poço
    const bounds = getGeometryBounds(geometryId, geometryParams)
    const sample = bounds.getBoundsAtZ(bounds.zMin + bounds.height_mm / 2)
    const constructW = sample.maxX - sample.minX
    const constructH = sample.maxY - sample.minY
    const constructMax = Math.max(constructW, constructH)
    if (constructMax > spec.wellDiameter_mm * 0.85) {
      warnings.push(
        `⚠️ Construto (${constructMax.toFixed(1)} mm) é grande para poço (${spec.wellDiameter_mm} mm). Reduza dimensões.`,
      )
    }
  } else {
    // impressão única no centro da plataforma
    selectedWells = ["solo"]
    wellCenters = { solo: { x: 60, y: 45 } }
  }

  // 2) Planejar ordem ótima entre poços
  let orderedWells: string[]
  if (wellPlate && selectedWells.length > 1) {
    const spec = WELL_PLATES[wellPlate.format]
    const plan = planTrajectory(spec, selectedWells, {
      algorithm: "nearest_2opt",
      returnToStart: false,
    })
    orderedWells = plan.orderedWells
  } else {
    orderedWells = selectedWells
  }

  // 3) Preparar geometria (bounds)
  const bounds = getGeometryBounds(geometryId, geometryParams)
  const numLayers = Math.max(1, Math.ceil(bounds.height_mm / job.layerHeight))
  const wallSpacing = job.bioink.nozzleDiameter_um / 1000  // mm

  // 4) Volume de extrusão por mm depositado (volumétrico)
  const nozzle_mm = job.bioink.nozzleDiameter_um / 1000
  const extrusionPerMm = nozzle_mm * job.layerHeight * job.bioink.flowMultiplier

  const moves: Move[] = []

  // 5) SKIRT inicial (opcional) — no primeiro poço
  if (job.skirtLoops > 0 && orderedWells.length > 0) {
    const firstCenter = wellCenters[orderedWells[0]]
    const skirtR = Math.max(10, bounds.getBoundsAtZ(bounds.zMin).maxX - bounds.getBoundsAtZ(bounds.zMin).minX) / 2 + 3
    for (let s = 0; s < job.skirtLoops; s++) {
      const r = skirtR + s * wallSpacing * 2
      const poly: Polygon2D = []
      for (let i = 0; i < 48; i++) {
        const a = (2 * Math.PI * i) / 48
        poly.push({ x: firstCenter.x + r * Math.cos(a), y: firstCenter.y + r * Math.sin(a) })
      }
      moves.push(...polygonToMoves(poly, job.layerHeight, extrusionPerMm, job, "SKIRT", 0))
    }
  }

  // 6) ITERAR poços
  for (let wi = 0; wi < orderedWells.length; wi++) {
    const wid = orderedWells[wi]
    const center = wellCenters[wid]

    // Travel até próximo poço com z-hop
    if (wi > 0 && wellPlate) {
      moves.push({
        type: "zhop",
        z: bounds.zMax + (wellPlate.zHopBetweenWells_mm ?? 5),
        f: mmsToMmMin(job.bioink.travelSpeed_mms),
        wellId: wid,
        comment: `z-hop antes de ${wid}`,
      })
      moves.push({
        ...travelTo(center.x, center.y, job.bioink, undefined, wid),
        comment: `travel to well ${wid}`,
      })
      if (wellPlate.pauseBetweenWells_s > 0) {
        moves.push(dwell(wellPlate.pauseBetweenWells_s, `pausa entre poços`))
      }
      if (wellPlate.purgeVolume_uL > 0) {
        moves.push({
          type: "prime",
          e: wellPlate.purgeVolume_uL,
          f: mmsToMmMin(10),
          wellId: wid,
          comment: `purge ${wellPlate.purgeVolume_uL} µL`,
        })
      }
    }

    // 7) ITERAR camadas
    for (let li = 0; li < numLayers; li++) {
      const z = bounds.zMin + (li + 1) * job.layerHeight
      const localBBox = bounds.getBoundsAtZ(z)
      // bbox in plate frame (reserved for future clipping)
      void translateBBox(localBBox, center.x, center.y)

      // Perímetros (walls)
      const localPerims = bounds.getPerimetersAtZ(z, job.walls, wallSpacing)
      const perims = localPerims.map((p) => translatePoly(p, center.x, center.y))
      for (const poly of perims) {
        moves.push(...polygonToMoves(poly, z, extrusionPerMm, job, wid, li))
      }

      // Infill (apenas se infillPercent > 0)
      if (job.infillPercent > 0) {
        const localInfillSegs = dispatchInfill(
          job.infillAlgorithm,
          localBBox,
          z,
          bounds.zMax,
          job.infillPercent,
          job.macroPorosity,
        )
        // Clip to innermost perimeter (se houver) — simplificação: bbox
        const infillSegs = localInfillSegs.map((s) => translateSeg(s, center.x, center.y))
        moves.push(...segmentsToMoves(infillSegs, z, extrusionPerMm, job, wid, li))
      }

      // Microcanais (overlay) — em camadas espaçadas
      if (job.microPorosity && li % 3 === 0) {
        const localChans = generateChannels(localBBox, {
          type: "micro",
          pattern: "cross_hatch",
          spacing_mm: job.microPorosity.poreSize_um / 100,
          diameter_um: job.microPorosity.poreSize_um,
          angle_deg: 45,
        })
        const chans = localChans.map((s) => translateSeg(s, center.x, center.y))
        moves.push(...segmentsToMoves(chans, z, extrusionPerMm * 0.6, job, wid, li))
      }
    }

    // UV crosslink pós-poço (se GelMA/PEGDA e impressora com UV)
    if (
      job.bioprinter.hasUV &&
      (job.bioink.material.toLowerCase().includes("gelma") ||
       job.bioink.material.toLowerCase().includes("pegda"))
    ) {
      moves.push({
        type: "uv",
        f: 30,
        wellId: wid,
        comment: `UV crosslink 30s — poço ${wid}`,
      })
    }
  }

  // 8) Emitir G-code final
  const gcode = emitGCode(moves, job.bioprinter, job.bioink, {
    verbose: true,
    relativeExtrusion: false,
    includeHeader: true,
    includeFooter: true,
    jobMetadata: job,
  })

  // 9) Estatísticas
  const stats = analyzeMoves(moves, job.bioink, job.layerHeight)

  // 10) Shear stress estimate (Hagen-Poiseuille em nozzle)
  const flowRate_uL_per_s =
    extrusionPerMm * job.bioink.printSpeed_mms  // µL/s aproximado
  const shear_Pa = shearStressWall_Pa(
    job.bioink.viscosity_cP ?? 1000,
    flowRate_uL_per_s,
    job.bioink.nozzleDiameter_um,
  )
  const viability = estimateViability_pct(
    shear_Pa,
    stats.extrudeTime_sec,
    job.bioink.hasCells,
  )

  // Warnings adicionais
  if (shear_Pa > (job.bioink.shearStressMax_Pa ?? 50) && job.bioink.hasCells) {
    warnings.push(
      `⚠️ Shear stress ${shear_Pa.toFixed(1)} Pa excede limite seguro (${job.bioink.shearStressMax_Pa ?? 50} Pa). Reduza velocidade ou aumente nozzle.`,
    )
  }
  if (stats.totalTime_sec > 7200 && job.bioink.hasCells) {
    warnings.push(
      `⚠️ Impressão > 2h fora da incubadora pode comprometer viabilidade. Considere reduzir número de poços.`,
    )
  }

  const result: GCodeResult = {
    gcode,
    moves,
    totalLines: gcode.split("\n").length,
    estimatedTime_min: Math.round((stats.totalTime_sec / 60) * 10) / 10,
    bioinkVolume_uL: Math.round(stats.extrudedVolume_uL * 10) / 10,
    totalDistance_mm: Math.round(stats.totalDistance_mm * 10) / 10,
    layerCount: numLayers,
    wellsUsed: orderedWells.filter(w => w !== "solo"),
    warnings,
    stats: {
      travelDistance_mm: Math.round(stats.travelDistance_mm * 10) / 10,
      extrudeDistance_mm: Math.round(stats.extrudeDistance_mm * 10) / 10,
      avgShearStress_Pa: Math.round(shear_Pa * 10) / 10,
      peakShearStress_Pa: Math.round(shear_Pa * 1.2 * 10) / 10,
      viabilityEstimate_pct: viability,
    },
  }

  return result
}

// ═══════════════════════════════════════════════════════════════
// EXPORT públicos auxiliares
// ═══════════════════════════════════════════════════════════════
export { WELL_PLATES, wellCenter } from "./wellplates/catalog"
export { planTrajectory } from "./wellplates/trajectory-planner"
export { BIOPRINTER_PROFILES, listBioprinters, getBioprinter } from "./profiles/bioprinters"
