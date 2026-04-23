/**
 * BIA v4.2 — API de Geração de G-code DLP/SLA
 *
 * POST /api/gcode/dlp
 * Gera G-code para bioimpressoras DLP/SLA (EnvisionTEC Perfactory, etc)
 *
 * Diferente de /api/gcode/generate (extrusão):
 *   - Sem bico extrusor — usa projetor UV
 *   - Cada camada requer uma IMAGEM bitmap (gerada separadamente)
 *   - Tempo total = N_layers × t_exposure (não depende da complexidade)
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { requireCredits } from "@/lib/auth/credits"
import { prisma } from "@/lib/db/prisma"
import type { Prisma } from "@prisma/client"
import { z } from "zod"

import { DLPEmitter, recommendDLPParameters } from "@/lib/gcode/core/dlp-emitter"
import { getBioprinter, listBioprinters } from "@/lib/gcode/profiles/bioprinters"
import { getGeometryBounds } from "@/lib/gcode/slicer/geometry-bounds"
import type { Bioink } from "@/lib/gcode/core/types"

const bioinkSchema = z.object({
  id: z.string().optional(),
  material: z.string(),
  concentration: z.number(),
  hasCells: z.boolean(),
  cellDensity: z.number().optional(),
  crosslinker: z.string().optional(),
  crosslinkerConc: z.string().optional(),
  temperature_c: z.number().default(25),
  pressure_kpa: z.number().default(0),
  nozzleDiameter_um: z.number().default(40),  // DLP: pixel size
  flowMultiplier: z.number().default(1),
  retraction_mm: z.number().default(0),
  printSpeed_mms: z.number().default(0),
  travelSpeed_mms: z.number().default(0),
})

const bodySchema = z.object({
  geometry: z.object({
    id: z.string(),
    params: z.record(z.string(), z.number()),
  }),
  bioink: bioinkSchema,
  bioprinterId: z.string().default("envisiontec_perfactory_p4k"),
  layerHeight_mm: z.number().min(0.01).max(0.2).optional(),
  exposureTime_s: z.number().min(0.5).max(60).optional(),
  uvIntensity_pct: z.number().min(10).max(100).optional(),
  initialLayers: z.number().int().default(3),
  initialExposureMult: z.number().default(2.5),
  liftDistance_mm: z.number().default(5),
  settlingTime_s: z.number().default(2),
  postCureUV_s: z.number().default(30),
  tissue: z.string().default("tecido genérico"),
  application: z.string().default("scaffold DLP"),
  jobName: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "JSON inválido" }, { status: 400 })

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const {
    geometry, bioink, bioprinterId, tissue, application, jobName,
    ...userParams
  } = parsed.data

  // Validar bioimpressora
  let bp
  try { bp = getBioprinter(bioprinterId) }
  catch {
    return NextResponse.json(
      { error: `Bioprinter '${bioprinterId}' não encontrado` },
      { status: 400 },
    )
  }

  if (bp.technology !== "dlp_sla") {
    return NextResponse.json(
      {
        error: `Bioprinter '${bp.name}' usa tecnologia ${bp.technology} — ` +
               `use /api/gcode/generate para extrusão. Para DLP, tente: envisiontec_perfactory_p4k`,
        availableDLP: listBioprinters()
          .filter((b) => b.technology === "dlp_sla")
          .map((b) => b.id),
      },
      { status: 400 },
    )
  }

  // Créditos
  const userRole = (session.user as { role?: string }).role
  const creditCheck = await requireCredits(
    session.user.id,
    "STL_GCODE",
    `DLP G-code: ${geometry.id} @ ${bp.name}`,
    {
      geometry: geometry.id,
      bioprinter: bioprinterId,
      tissue,
    } as Prisma.InputJsonValue,
    userRole,
  )
  if (creditCheck) return creditCheck.error

  // Construir bioink
  const fullBioink: Bioink = {
    id: bioink.id ?? `bioink_${bioink.material}`,
    material: bioink.material,
    concentration: bioink.concentration,
    hasCells: bioink.hasCells,
    cellDensity: bioink.cellDensity,
    viscosity_cP: 0,   // não aplicável DLP
    crosslinker: bioink.crosslinker ?? "LAP (fotoiniciador)",
    crosslinkerConc: bioink.crosslinkerConc,
    temperature_c: bioink.temperature_c,
    pressure_kpa: 0,
    shearStressMax_Pa: 0,  // sem shear no DLP (resina parada no vat)
    nozzleDiameter_um: bp.dlp?.pixelSize_um ?? 40,
    flowMultiplier: 1,
    retraction_mm: 0,
    printSpeed_mms: 0,
    travelSpeed_mms: 0,
  }

  // Parâmetros recomendados
  const recommended = recommendDLPParameters(fullBioink, tissue)
  const layerHeight_mm = userParams.layerHeight_mm ?? recommended.layerHeight_mm ?? 0.05
  const exposureTime_s = userParams.exposureTime_s ?? recommended.exposureTime_s ?? 5
  const uvIntensity_pct = userParams.uvIntensity_pct ?? recommended.uvIntensity_pct ?? 50

  // Calcular camadas a partir da geometria
  const bounds = getGeometryBounds(geometry.id, geometry.params)
  const numLayers = Math.max(1, Math.ceil(bounds.height_mm / layerHeight_mm))

  // Emitir
  let emitter: DLPEmitter
  try {
    emitter = new DLPEmitter({
      bioprinter: bp,
      bioink: fullBioink,
      layerHeight_mm,
      exposureTime_s,
      uvIntensity_pct,
      initialLayers: userParams.initialLayers,
      initialExposureMult: userParams.initialExposureMult,
      liftDistance_mm: userParams.liftDistance_mm,
      liftSpeed_mmmin: 100,
      retractSpeed_mmmin: 80,
      settlingTime_s: userParams.settlingTime_s,
      tiltAngle_deg: bp.dlp?.tiltAngle_deg ?? 3,
      postCureUV_s: userParams.postCureUV_s,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao inicializar DLPEmitter" },
      { status: 400 },
    )
  }

  emitter.emitHeader(
    jobName ?? `${tissue}_${geometry.id}_DLP`,
    tissue,
    { minX: bounds.getBoundsAtZ(bounds.zMin).minX,
      minY: bounds.getBoundsAtZ(bounds.zMin).minY,
      maxX: bounds.getBoundsAtZ(bounds.zMin).maxX,
      maxY: bounds.getBoundsAtZ(bounds.zMin).maxY },
  )

  for (let li = 0; li < numLayers; li++) {
    const z = bounds.zMin + (li + 1) * layerHeight_mm
    const perims = bounds.getPerimetersAtZ(z, 2, 0.2)
    emitter.emitLayer({
      index: li,
      z_mm: z,
      perimeters: perims,
      infillSegments: [],  // DLP: toda informação está no bitmap da camada
    })
  }

  emitter.emitFooter()
  const result = emitter.compile()

  // Auditoria
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "dlp_gcode_generated",
      entity: "gcode",
      metadata: {
        geometry: geometry.id,
        bioprinter: bioprinterId,
        tissue,
        layerCount: result.totalLayers,
        volume_mL: result.bioinkVolume_mL,
        totalEnergy_mJ: result.totalExposureEnergy_mJ,
        estimatedTime_min: result.estimatedTime_min,
      } as Prisma.InputJsonValue,
    },
  }).catch(() => {})

  return NextResponse.json({
    success: true,
    jobName: jobName ?? `${tissue}_${geometry.id}_DLP`,
    gcode: result.gcode,
    totalLayers: result.totalLayers,
    estimatedTime_min: result.estimatedTime_min,
    bioinkVolume_mL: result.bioinkVolume_mL,
    totalExposureEnergy_mJ: result.totalExposureEnergy_mJ,
    layers: result.layers.map((l) => ({
      index: l.index,
      z_mm: l.z_mm,
      exposureTime_s: l.exposureTime_s,
      imageId: l.imageId,
    })),
    bioprinter: {
      id: bp.id,
      name: bp.name,
      technology: bp.technology,
      dlp: bp.dlp,
    },
    parameters: {
      layerHeight_mm,
      exposureTime_s,
      uvIntensity_pct,
      initialLayers: userParams.initialLayers,
      initialExposureMult: userParams.initialExposureMult,
    },
    application,
    summary: {
      bioprinter: bp.name,
      bioink: `${bioink.material} ${bioink.concentration}% + ${bioink.crosslinker ?? "LAP"}`,
      layerCount: result.totalLayers,
      estimatedTime: `${result.estimatedTime_min.toFixed(1)} min`,
      volume: `${result.bioinkVolume_mL.toFixed(1)} mL resina`,
      totalDose: `${result.totalExposureEnergy_mJ.toFixed(0)} mJ`,
    },
    notes: result.notes,
    warnings: result.warnings,
    creditsUsed: 6,
  })
}

export async function GET() {
  const dlpPrinters = listBioprinters().filter((bp) => bp.technology === "dlp_sla")
  return NextResponse.json({
    endpoint: "/api/gcode/dlp",
    method: "POST",
    description: "Geração de G-code para bioimpressoras DLP/SLA (fotopolimerização)",
    dlpBioprinters: dlpPrinters.map((bp) => ({
      id: bp.id,
      name: bp.name,
      manufacturer: bp.manufacturer,
      dlp: bp.dlp,
      notes: bp.notes,
    })),
    typicalParameters: {
      gelMA_10pct: { exposureTime_s: 4, uvIntensity_pct: 50, layerHeight_um: 50 },
      gelMA_75pct: { exposureTime_s: 6, uvIntensity_pct: 55, layerHeight_um: 50 },
      gelMA_5pct:  { exposureTime_s: 10, uvIntensity_pct: 60, layerHeight_um: 50 },
      PEGDA_700:   { exposureTime_s: 3, uvIntensity_pct: 45, layerHeight_um: 25 },
    },
    references: [
      "Grigoryan B et al. (2019) Science 364, 458-464 — multivascular DLP",
      "Lim KS et al. (2020) Adv. Healthc. Mater. 9, 1901792 — GelMA DLP",
      "Bhattacharjee N et al. (2018) Lab Chip 18, 2428 — fotoiniciadores LAP vs I2959",
    ],
  })
}
