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
import { WELL_PLATES, wellCenter, parseWellId } from "./wellplates/catalog"
import { planTrajectory } from "./wellplates/trajectory-planner"
import { getGeometryBounds } from "./slicer/geometry-bounds"
import { generateGyroidInfill } from "./infill/parametric/gyroid-tpms"
import { generateVoronoiInfill } from "./infill/non-parametric/voronoi"
import { generateVoronoi2D } from "./infill/non-parametric/voronoi-2d"
import { generateVoronoi3D, type Voronoi3DResult } from "./infill/non-parametric/voronoi-3d"
import { generatePerlinInfill } from "./infill/non-parametric/perlin-noise"
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
  voronoi3DCache?: Voronoi3DResult,
  zRange?: [number, number],
  layerHeight?: number,
): Segment2D[] {
  const density = 1 - infillPercent / 100  // porosity = 1 - infill
  const poreSize = macroPorosity?.poreSize_um ?? 500
  const seed = macroPorosity?.seed ?? 42

  switch (algorithm) {
    case "gyroid_tpms":
      return generateGyroidInfill(bbox, z_mm, { density, poreSize_um: poreSize, seed })

    case "voronoi_2d":
      return generateVoronoi2D(bbox, {
        density, poreSize_um: poreSize, seed,
        lloydIterations: 3,
      }).segments

    case "voronoi_3d": {
      // Usa cache pré-computado se disponível (ideal — uma tesselação p/ toda a peça)
      if (voronoi3DCache) {
        const key = Math.round(z_mm * 1000) / 1000
        return voronoi3DCache.layerSegments.get(key) ?? []
      }
      // Fallback: geração por camada (não recomendado — não tem interconexão vertical)
      return generateVoronoiInfill(bbox, {
        density, poreSize_um: poreSize, seed,
      }).segments
    }

    case "perlin_noise":
      return generatePerlinInfill(bbox, z_mm, {
        density, poreSize_um: poreSize, seed,
        octaves: 4, scale: 2.5, persistence: 0.55,
      }).segments

    case "gradient":
      return generateGradientInfill(bbox, {
        axis: "z",
        profile: "linear",
        startDensity: 0.8,
        endDensity: 0.3,
        z_mm, zMin: zRange?.[0] ?? 0, zMax,
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
  // parameters reserved for future infill variants
  void layerHeight
}

/**
 * Pré-computa o Voronoi 3D completo para uma geometria (chamado uma vez por job).
 * Retorna undefined se o algoritmo não for voronoi_3d.
 */
export function precomputeVoronoi3D(
  algorithm: InfillAlgorithm,
  bbox: BBox2D,
  zRange: [number, number],
  layerHeight: number,
  infillPercent: number,
  poreSize_um: number,
  seed = 42,
): Voronoi3DResult | undefined {
  if (algorithm !== "voronoi_3d") return undefined
  const density = 1 - infillPercent / 100
  return generateVoronoi3D(
    {
      min: { x: bbox.minX, y: bbox.minY, z: zRange[0] },
      max: { x: bbox.maxX, y: bbox.maxY, z: zRange[1] },
    },
    {
      density,
      poreSize_um,
      seed,
      layerHeight_mm: layerHeight,
      zRange,
      lloydIterations: 4,
    },
  )
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
  /**
   * R19.1: posição atual do bico. Se informada, o polígono é ROTACIONADO para
   * começar no vértice mais próximo e o deslocamento até ele é EXTRUDADO
   * (cordão de aproximação) em vez de travel — zero deslocamento "seco".
   */
  from?: Point2D,
): Move[] {
  if (poly.length === 0) return []
  const moves: Move[] = []
  let ring = poly
  if (from) {
    let bi = 0, bd = Infinity
    for (let i = 0; i < poly.length; i++) {
      const d = (poly[i].x - from.x) ** 2 + (poly[i].y - from.y) ** 2
      if (d < bd) { bd = d; bi = i }
    }
    ring = [...poly.slice(bi), ...poly.slice(0, bi)]
  }
  const first = ring[0]
  if (from) {
    const d = Math.hypot(first.x - from.x, first.y - from.y)
    if (d > 0.05) {
      // cordão de aproximação: sai extrudando do ponto onde o bico está
      moves.push({ ...extrudeTo(first.x, first.y, d * extrusionPerMm, job.bioink, z, wellId, layer), comment: "aproximação extrudada (sem travel)" })
    } else {
      // já está no vértice: só garante o Z
      moves.push({ type: "travel", x: first.x, y: first.y, z, f: mmsToMmMin(job.bioink.travelSpeed_mms), wellId, layer, comment: "ajuste de Z no ponto atual" })
    }
  } else {
    // travel to start (perímetros subsequentes / outras camadas)
    moves.push({ ...travelTo(first.x, first.y, job.bioink, z, wellId), layer })
    moves.push({ ...primeExtruder(job.bioink), wellId, layer })
  }
  poly = ring

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
  //
  // R19 — PONTO ZERO É PONTO ZERO.
  // O G-code começa com `G92 X0 Y0 Z0 E0` no ponto onde o bico ESTÁ. Portanto:
  //   · impressão única ("direto na mesa"/Petri): peça centrada em (0,0);
  //   · placa multi-poços: o bico é posicionado pela usuária sobre o CENTRO do
  //     PRIMEIRO poço selecionado (o mais acima/à esquerda: menor linha, menor
  //     coluna — ex. A1) e TODOS os outros poços viram offsets RELATIVOS a ele
  //     (pitch da placa). Nenhuma coordenada absoluta de mesa é usada.
  // Antes: centro fixo em (60,45) → "viagem na diagonal" após o G92.
  let selectedWells: string[]
  let wellCenters: Record<string, Point2D>
  let referenceWell: string | null = null
  if (wellPlate && wellPlate.selectedWells.length > 0) {
    const spec = WELL_PLATES[wellPlate.format]
    selectedWells = wellPlate.selectedWells
    // poço de referência = superior-esquerdo entre os selecionados
    referenceWell = [...selectedWells].sort((a, b) => {
      const pa = parseWellId(spec, a), pb = parseWellId(spec, b)
      return pa.row - pb.row || pa.col - pb.col
    })[0]
    const ref = wellCenter(spec, referenceWell)
    wellCenters = {}
    for (const w of selectedWells) {
      const c = wellCenter(spec, w)
      wellCenters[w] = { x: c.x - ref.x, y: c.y - ref.y }
    }
    warnings.push(
      `📍 Origem (G92) = centro do poço ${referenceWell}. Posicione o bico sobre o centro de ${referenceWell} antes de iniciar; os demais poços são offsets de ${spec.wellSpacing_mm} mm.`,
    )

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
    // impressão única: peça centrada EXATAMENTE no ponto do G92
    selectedWells = ["solo"]
    wellCenters = { solo: { x: 0, y: 0 } }
  }

  // 2) Planejar ordem entre poços — SEMPRE começando pelo poço de referência
  //    (onde o bico está). O planejador otimiza o resto a partir dele.
  let orderedWells: string[]
  if (wellPlate && selectedWells.length > 1 && referenceWell) {
    const spec = WELL_PLATES[wellPlate.format]
    const plan = planTrajectory(spec, selectedWells, {
      algorithm: "nearest_2opt",
      returnToStart: false,
      startFrom: referenceWell,
    })
    orderedWells = plan.orderedWells
    if (orderedWells[0] !== referenceWell) {
      // garante o invariante mesmo que o planejador ignore startFrom
      orderedWells = [referenceWell, ...orderedWells.filter((w) => w !== referenceWell)]
    }
  } else {
    orderedWells = selectedWells
  }

  // 3) Preparar geometria (bounds)
  const bounds = getGeometryBounds(geometryId, geometryParams)
  const numLayers = Math.max(1, Math.ceil(bounds.height_mm / job.layerHeight))
  const wallSpacing = job.bioink.nozzleDiameter_um / 1000  // mm

  // 3b) Pré-computar Voronoi 3D UMA VEZ por job (se aplicável)
  //     Isto garante interconexão vertical real entre camadas.
  const seedBBoxAtBase = bounds.getBoundsAtZ(bounds.zMin)
  const voronoi3DCache = precomputeVoronoi3D(
    job.infillAlgorithm,
    seedBBoxAtBase,
    [bounds.zMin, bounds.zMax],
    job.layerHeight,
    job.infillPercent,
    job.macroPorosity?.poreSize_um ?? 500,
    job.macroPorosity?.seed ?? 42,
  )

  // 4) Volume de extrusão por mm depositado (volumétrico)
  const nozzle_mm = job.bioink.nozzleDiameter_um / 1000
  const extrusionPerMm = nozzle_mm * job.layerHeight * job.bioink.flowMultiplier

  const moves: Move[] = []

  // 5) SKIRT inicial — DESLIGADO por padrão (R19). Só se a usuária marcar
  //    explicitamente skirtLoops > 0. A purga é feita pelo botão na Etapa 4.
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
      let perims = localPerims.map((p) => translatePoly(p, center.x, center.y))
      // R19.1: PONTO ZERO É PONTO ZERO — o PRIMEIRO cordão da impressão sai
      // do ponto exato onde o bico está (centro do alvo). Para isso, na 1ª
      // camada do 1º poço, imprimimos de DENTRO para FORA (perímetro mais
      // interno primeiro) e o deslocamento até ele é extrudado, não travel.
      const isVeryFirst = wi === 0 && li === 0 && job.skirtLoops === 0
      if (isVeryFirst) perims = [...perims].reverse()
      let nozzle: Point2D | undefined = isVeryFirst ? { x: center.x, y: center.y } : undefined
      for (const poly of perims) {
        moves.push(...polygonToMoves(poly, z, extrusionPerMm, job, wid, li, nozzle))
        nozzle = undefined
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
          voronoi3DCache,
          [bounds.zMin, bounds.zMax],
          job.layerHeight,
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
  //
  // R12.42 — CRITICAL FIX: extrusão RELATIVA (M83) por padrão.
  //
  // ANTES: relativeExtrusion=false → header emitia M82 (absoluta), mas o
  // engine calcula `e` como INCREMENTO por segmento (linha 178: `d * extrusionPerMm`).
  // Em modo absoluto cada E=0.04 → E=0.05 fazia o firmware interpretar como
  // "vá para posição 0.04, agora 0.05" — efetivamente NÃO EXTRUDA nada após
  // o primeiro segmento (motor recua ou ignora).
  //
  // AGORA: M83 (relativa) — cada `E n` significa "extrude +n mm". Isso bate
  // com como o engine, retract() e primeExtruder() emitem deltas, e também
  // está alinhado com o que a página /execute envia para a impressora real
  // após o handshake (linha 765: "M83 ; extrusora em modo relativo").
  const gcode = emitGCode(moves, job.bioprinter, job.bioink, {
    verbose: true,
    relativeExtrusion: true,    // ← M83
    includeHeader: true,
    includeFooter: true,
    jobMetadata: job,
    originLabel: referenceWell
      ? `centro do poço ${referenceWell} (placa ${wellPlate!.format} poços) — demais poços são offsets relativos`
      : "centro da peça (Petri/lâmina) — ponto atual do bico",
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
  // R12.42: validação defensiva — se não há nada para extrudar, é configuração
  // sem sentido. Sinaliza com warning bem visível ao invés de retornar G-code
  // mudo (apenas header/footer) que faria a impressora não fazer nada.
  if (stats.extrudeDistance_mm < 0.1) {
    warnings.push(
      `🚨 G-code sem nenhuma extrusão! Verifique se: (a) infillPercent > 0 OU walls > 0; (b) geometria tem dimensões válidas; (c) bbox não está em zero. Esta impressão não vai depositar bioink.`,
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
