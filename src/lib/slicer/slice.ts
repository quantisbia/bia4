/**
 * BIA v4 · R15 · BioSlicer — Pipeline completo: TriMesh → G-code
 *   placeMesh → layerZs/sliceAtZ → planLayer → writeGCode → stats/avisos bio.
 */

import type { TriMesh, SliceParams, ExtrusionModel, SliceResult, SlicedLayer, SliceWarning, Vec2 } from "./types"
import { placeMesh, layerZs, sliceAtZ } from "./mesh-slice"
import { planLayer } from "./toolpath"
import { writeGCode } from "./gcode-writer"
import { flowRate_uLs, wallShearStress_Pa, estimateViability_pct, syringeArea_mm2 } from "./extrusion"

export interface SliceJob {
  mesh: TriMesh
  params: SliceParams
  extrusion: ExtrusionModel
  profileId: string
  profileName: string
  jobName?: string
  rheology?: { viscosity_PaS?: number; powerLawN?: number }
  meta?: Record<string, string | number | boolean | null | undefined>
  onProgress?: (frac: number, stage: string) => void
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function sliceMesh(job: SliceJob): SliceResult {
  const { params: P, extrusion: X } = job
  const warnings: SliceWarning[] = []
  const progress = job.onProgress ?? (() => {})

  progress(0.02, "Posicionando malha")
  const mesh = placeMesh(job.mesh, { scale: P.scale, rotationZ_deg: P.rotationZ_deg, centerX: P.originX_mm, centerY: P.originY_mm, baseZ: 0 })
  const bb = mesh.bbox
  const sizeZ = bb.maxZ - bb.minZ

  if (sizeZ < P.firstLayerHeight_mm * 0.5) {
    warnings.push({ level: "error", code: "mesh_too_thin", message: `Modelo tem ${sizeZ.toFixed(2)} mm de altura — menor que meia camada.`, hint: "Aumente a escala ou reduza a altura de camada." })
  }
  if (P.layerHeight_mm > P.nozzleDiameter_mm * 1.05) {
    warnings.push({ level: "warn", code: "layer_gt_nozzle", message: `Camada (${P.layerHeight_mm} mm) maior que o bico (${P.nozzleDiameter_mm} mm).`, hint: "Em hidrogel use 70–90 % do diâmetro do bico para o cordão aderir à camada anterior." })
  }
  if (P.layerHeight_mm < P.nozzleDiameter_mm * 0.4) {
    warnings.push({ level: "warn", code: "layer_too_thin", message: `Camada muito fina (${P.layerHeight_mm} mm) para bico de ${P.nozzleDiameter_mm} mm.`, hint: "O bico vai esmagar e alargar o cordão; poros fecham." })
  }
  if (P.lineWidth_mm < P.nozzleDiameter_mm * 0.9) {
    warnings.push({ level: "info", code: "line_lt_nozzle", message: "Largura de linha menor que o bico — só funciona se você estirar o gel (velocidade alta)." })
  }

  const zs = layerZs(bb, P.layerHeight_mm, P.firstLayerHeight_mm)
  const layers: SlicedLayer[] = []
  const rand = mulberry32(1337)
  let cursor: Vec2 = { x: P.originX_mm, y: P.originY_mm }
  let emptyLayers = 0
  let poreInfo: { spacing: number; pore: number | null } | null = null
  const tol = Math.min(0.03, P.nozzleDiameter_mm / 10)

  for (let i = 0; i < zs.length; i++) {
    const z = zs[i]
    const h = i === 0 ? P.firstLayerHeight_mm : P.layerHeight_mm
    progress(0.05 + 0.75 * (i / zs.length), `Fatiando camada ${i + 1}/${zs.length}`)
    const contours = sliceAtZ(mesh, z, tol)
    if (contours.length === 0) emptyLayers++
    const plan = planLayer({ contours, layerIndex: i, z_mm: z, layerHeight_mm: h, params: P, startPoint: cursor, rand })
    if (plan.infillInfo && !poreInfo) poreInfo = { spacing: plan.infillInfo.spacing_mm, pore: plan.infillInfo.poreSize_mm }
    cursor = plan.endPoint
    layers.push({ index: i, z_mm: z, height_mm: h, contours, paths: plan.paths })
  }

  if (emptyLayers > 0) {
    warnings.push({ level: emptyLayers === zs.length ? "error" : "warn", code: "empty_layers", message: `${emptyLayers} camada(s) sem contorno.`, hint: emptyLayers === zs.length ? "A malha pode estar aberta/não-manifold. Verifique o STL." : "Normal em topos arredondados; se for no meio da peça, a malha tem buracos." })
  }

  progress(0.85, "Escrevendo G-code")
  const w = writeGCode(layers, P, X, {
    jobName: job.jobName ?? mesh.name ?? "bia-print", meshName: mesh.name,
    profileId: job.profileId, profileName: job.profileName, meta: job.meta,
  })

  progress(0.95, "Calculando estatísticas")
  const avgSpeed = (P.speedPerimeter_mms + P.speedInfill_mms) / 2
  const flow = flowRate_uLs(P.lineWidth_mm, P.layerHeight_mm, avgSpeed, X.flowMultiplier)
  const visc = job.rheology?.viscosity_PaS
  const shear = visc ? wallShearStress_Pa(visc, flow, P.nozzleDiameter_mm, job.rheology?.powerLawN) : null
  const viability = shear !== null ? estimateViability_pct(shear, w.stats.estimatedTime_s, P.hasCells) : null

  if (shear !== null && P.hasCells) {
    if (shear > 10000) warnings.push({ level: "error", code: "shear_high", message: `Shear na parede do bico ≈ ${(shear / 1000).toFixed(1)} kPa (> 10 kPa).`, hint: "Blaeser 2016: viabilidade cai abaixo de 80 %. Use bico maior, velocidade menor ou gel menos viscoso." })
    else if (shear > 5000) warnings.push({ level: "warn", code: "shear_mid", message: `Shear ≈ ${(shear / 1000).toFixed(1)} kPa (5–10 kPa).`, hint: "Aceitável para a maioria das linhagens; MSC e hepatócitos preferem < 5 kPa." })
  }
  if (P.hasCells && w.stats.estimatedTime_s > 45 * 60) {
    warnings.push({ level: "warn", code: "long_print_cells", message: `Impressão com células estimada em ${(w.stats.estimatedTime_s / 60).toFixed(0)} min.`, hint: "Acima de 45–60 min fora da incubadora a viabilidade cai. Divida em lotes ou reduza o construto." })
  }
  if (X.kind === "syringe_stepper" && X.syringe) {
    const cap_uL = X.syringe.volume_mL * 1000
    if (w.stats.volume_uL > cap_uL * 0.9) {
      warnings.push({ level: "error", code: "syringe_capacity", message: `Volume (${(w.stats.volume_uL / 1000).toFixed(2)} mL) excede 90 % da seringa de ${X.syringe.volume_mL} mL.`, hint: "Use seringa maior, reduza infill/escala, ou divida a impressão." })
    } else if (w.stats.volume_uL > cap_uL * 0.6) {
      warnings.push({ level: "info", code: "syringe_60", message: `Volume usa ${Math.round((w.stats.volume_uL / cap_uL) * 100)} % da seringa.`, hint: "Carregue a seringa cheia e purgue bolhas." })
    }
    const ePerMin = (flow / syringeArea_mm2(X.syringe)) * 60
    if (ePerMin < 0.5) warnings.push({ level: "info", code: "plunger_slow", message: `Êmbolo avança só ${ePerMin.toFixed(2)} mm/min.`, hint: "Exige microstepping e E-steps calibrados (≥ 2000 steps/mm). Seringa menor melhora a resolução." })
  }
  if (poreInfo?.pore !== null && poreInfo?.pore !== undefined) {
    if (poreInfo.pore < P.lineWidth_mm * 0.4) {
      warnings.push({ level: "warn", code: "pore_fusion", message: `Poro estimado ${(poreInfo.pore * 1000).toFixed(0)} µm — cordões vizinhos tendem a fundir.`, hint: "Ribeiro 2017: espaçamento ≥ 1,4× o diâmetro do cordão evita fusão. Reduza a densidade ou aumente o espaçamento." })
    }
    if (poreInfo.pore > 1.5) {
      warnings.push({ level: "info", code: "pore_large", message: `Poro estimado ${poreInfo.pore.toFixed(2)} mm.`, hint: "Vãos > 1,5 mm podem colapsar em géis de baixo yield stress (teste de colapso, Ribeiro 2017)." })
    }
  }
  if (w.stats.extrusionStarts > layers.length * 40) {
    warnings.push({ level: "info", code: "many_starts", message: `${w.stats.extrusionStarts} arranques de extrusão.`, hint: "Cada arranque pode gerar gota. Prefira infill 'zigzag' ou 'concêntrico'." })
  }
  if (w.stats.extrudeLength_mm < 1) {
    warnings.push({ level: "error", code: "no_extrusion", message: "G-code sem extrusão.", hint: "Verifique infill > 0 ou paredes > 0 e se a malha tem área nas camadas." })
  }
  const radius = Math.hypot(Math.max(Math.abs(bb.minX), Math.abs(bb.maxX)), Math.max(Math.abs(bb.minY), Math.abs(bb.maxY)))
  if (radius > 85) {
    warnings.push({ level: "warn", code: "bed_fit", message: `Peça alcança raio ${radius.toFixed(0)} mm da origem.`, hint: "Mesa circular de 180 mm (BioEnder) → raio útil 85 mm. Centralize ou reduza." })
  }

  progress(1, "Concluído")
  return {
    layers,
    gcode: w.gcode,
    stats: {
      layerCount: layers.length,
      totalPathLength_mm: w.stats.totalPathLength_mm,
      extrudeLength_mm: w.stats.extrudeLength_mm,
      travelLength_mm: w.stats.travelLength_mm,
      volume_uL: w.stats.volume_uL,
      plungerTravel_mm: w.stats.plungerTravel_mm,
      estimatedTime_s: w.stats.estimatedTime_s,
      avgFlow_uLs: Math.round(flow * 1000) / 1000,
      wallShear_Pa: shear !== null ? Math.round(shear) : null,
      viability_pct: viability,
      extrusionStarts: w.stats.extrusionStarts,
    },
    warnings,
    profileId: job.profileId,
    params: P,
    extrusion: X,
    meshBBox: { ...bb },
  }
}

export function sizeOf(mesh: TriMesh) {
  const b = mesh.bbox
  return { x: b.maxX - b.minX, y: b.maxY - b.minY, z: b.maxZ - b.minZ }
}
