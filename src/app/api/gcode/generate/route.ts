/**
 * BIA v4.2 — API de Geração de G-CODE para Bioimpressão
 *
 * POST /api/gcode/generate
 * Body: {
 *   geometry: { id: string, params: Record<string, number> },
 *   infill: {
 *     algorithm: "gyroid_tpms" | "voronoi_3d" | "gradient" | "rectilinear" | ...,
 *     infillPercent: number,
 *     macroPorosity?: { density: number, poreSize_um: number, seed?: number },
 *     microPorosity?: { density: number, poreSize_um: number }
 *   },
 *   bioink: {...},
 *   bioprinterId: string,
 *   layerHeight_mm: number,
 *   walls: number,
 *   skirtLoops: number,
 *   wellPlate?: {
 *     format: 6 | 12 | 24 | 48 | 96 | 384,
 *     selectedWells: string[],
 *     replicationMode: "same" | "different" | "gradient",
 *     zHopBetweenWells_mm: number,
 *     pauseBetweenWells_s: number,
 *     purgeVolume_uL: number,
 *     wipeTowerEnabled: boolean
 *   },
 *   tissue: string,
 *   application: string
 * }
 *
 * Returns: GCodeResult + metadata
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { requireCredits } from "@/lib/auth/credits"
import { prisma } from "@/lib/db/prisma"
import type { Prisma } from "@prisma/client"
import { z } from "zod"

import { generateGCodeForJob } from "@/lib/gcode/engine"
import { getBioprinter, listBioprinters } from "@/lib/gcode/profiles/bioprinters"
import { WELL_PLATES, plateMetadata, allWellIds } from "@/lib/gcode/wellplates/catalog"
import type {
  PrintJob, Bioink, WellPlateConfig, WellPlateFormat, InfillAlgorithm,
  PorosityConfig, ReplicationMode,
} from "@/lib/gcode/core/types"

// ═══════════════════════════════════════════════════════════════
// SCHEMAS ZOD
// ═══════════════════════════════════════════════════════════════
const porositySchema = z.object({
  density: z.number().min(0).max(1),
  poreSize_um: z.number().min(10).max(2000),
  seed: z.number().optional(),
})

const bioinkSchema = z.object({
  id: z.string().optional(),
  material: z.string(),
  concentration: z.number(),
  hasCells: z.boolean(),
  cellDensity: z.number().optional(),
  viscosity_cP: z.number().optional(),
  crosslinker: z.string().optional(),
  crosslinkerConc: z.string().optional(),
  temperature_c: z.number(),
  pressure_kpa: z.number(),
  shearStressMax_Pa: z.number().optional(),
  nozzleDiameter_um: z.number(),
  flowMultiplier: z.number().default(1.0),
  retraction_mm: z.number().default(0.3),
  printSpeed_mms: z.number().default(10),
  travelSpeed_mms: z.number().default(50),
})

const wellPlateSchema = z.object({
  format: z.union([z.literal(6), z.literal(12), z.literal(24), z.literal(48), z.literal(96), z.literal(384)]),
  selectedWells: z.array(z.string()),
  replicationMode: z.enum(["same", "different", "gradient"]).default("same"),
  zHopBetweenWells_mm: z.number().default(5),
  pauseBetweenWells_s: z.number().default(0),
  purgeVolume_uL: z.number().default(0),
  wipeTowerEnabled: z.boolean().default(false),
})

const bodySchema = z.object({
  geometry: z.object({
    id: z.string(),
    params: z.record(z.string(), z.number()),
  }),
  infill: z.object({
    algorithm: z.enum([
      "gyroid_tpms","schwarz_p","diamond_tpms","honeycomb","gradient",
      "voronoi_2d","voronoi_3d","perlin_noise","l_system",
      "linear","concentric","rectilinear",
    ]),
    infillPercent: z.number().min(0).max(100),
    macroPorosity: porositySchema.optional(),
    microPorosity: porositySchema.optional(),
  }),
  bioink: bioinkSchema,
  bioprinterId: z.string().default("cellink_biox"),
  layerHeight_mm: z.number().default(0.2),
  walls: z.number().int().default(2),
  skirtLoops: z.number().int().default(0),
  wellPlate: wellPlateSchema.optional(),
  tissue: z.string().default("tecido genérico"),
  application: z.string().default("scaffold"),
  jobName: z.string().optional(),
})

// ═══════════════════════════════════════════════════════════════
// POST — Gerar G-code
// ═══════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const {
    geometry, infill, bioink, bioprinterId,
    layerHeight_mm, walls, skirtLoops, wellPlate,
    tissue, application, jobName,
  } = parsed.data

  // Validar bioprinter
  let bp
  try {
    bp = getBioprinter(bioprinterId)
  } catch {
    return NextResponse.json(
      { error: `Bioprinter '${bioprinterId}' não encontrado`, available: listBioprinters().map((b) => b.id) },
      { status: 400 },
    )
  }

  // Validar poços (existem no formato?)
  if (wellPlate) {
    const spec = WELL_PLATES[wellPlate.format as WellPlateFormat]
    const validIds = new Set(allWellIds(spec))
    const invalid = wellPlate.selectedWells.filter((w) => !validIds.has(w))
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Poços inválidos para placa ${wellPlate.format}: ${invalid.join(", ")}` },
        { status: 400 },
      )
    }
    if (wellPlate.selectedWells.length === 0) {
      return NextResponse.json(
        { error: "Selecione ao menos um poço" },
        { status: 400 },
      )
    }
  }

  // Cobrar créditos (6 por geração)
  const userRole = (session.user as { role?: string }).role
  const creditCheck = await requireCredits(
    session.user.id,
    "STL_GCODE",
    `G-code gerado: ${geometry.id} / ${infill.algorithm} / ${wellPlate?.selectedWells.length ?? 1} poços`,
    {
      geometry: geometry.id,
      algorithm: infill.algorithm,
      bioprinter: bioprinterId,
      wells: wellPlate?.selectedWells ?? [],
    } as Prisma.InputJsonValue,
    userRole,
  )
  if (creditCheck) return creditCheck.error

  // Construir PrintJob
  const fullBioink: Bioink = {
    id: bioink.id ?? `bioink_${bioink.material}`,
    material: bioink.material,
    concentration: bioink.concentration,
    hasCells: bioink.hasCells,
    cellDensity: bioink.cellDensity,
    viscosity_cP: bioink.viscosity_cP ?? 1000,
    crosslinker: bioink.crosslinker,
    crosslinkerConc: bioink.crosslinkerConc,
    temperature_c: bioink.temperature_c,
    pressure_kpa: bioink.pressure_kpa,
    shearStressMax_Pa: bioink.shearStressMax_Pa ?? 50,
    nozzleDiameter_um: bioink.nozzleDiameter_um,
    flowMultiplier: bioink.flowMultiplier,
    retraction_mm: bioink.retraction_mm,
    printSpeed_mms: bioink.printSpeed_mms,
    travelSpeed_mms: bioink.travelSpeed_mms,
  }

  const wpConfig: WellPlateConfig | undefined = wellPlate
    ? {
        format: wellPlate.format as WellPlateFormat,
        selectedWells: wellPlate.selectedWells,
        replicationMode: wellPlate.replicationMode as ReplicationMode,
        zHopBetweenWells_mm: wellPlate.zHopBetweenWells_mm,
        pauseBetweenWells_s: wellPlate.pauseBetweenWells_s,
        purgeVolume_uL: wellPlate.purgeVolume_uL,
        wipeTowerEnabled: wellPlate.wipeTowerEnabled,
      }
    : undefined

  const job: PrintJob = {
    id: `job_${Date.now()}`,
    name: jobName ?? `${tissue}_${geometry.id}`,
    bioprinter: bp,
    bioink: fullBioink,
    layerHeight: layerHeight_mm,
    skirtLoops,
    walls,
    infillPercent: infill.infillPercent,
    infillAlgorithm: infill.algorithm as InfillAlgorithm,
    macroPorosity: infill.macroPorosity as PorosityConfig | undefined,
    microPorosity: infill.microPorosity as PorosityConfig | undefined,
    wellPlate: wpConfig,
    tissue,
    application,
  }

  // Gerar G-code
  let result
  try {
    result = generateGCodeForJob({
      job,
      geometryId: geometry.id,
      geometryParams: geometry.params,
      wellPlate: wpConfig,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[GCODE ENGINE ERROR]", err)
    return NextResponse.json(
      { error: `Falha ao gerar G-code: ${msg}` },
      { status: 500 },
    )
  }

  // Auditoria
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "gcode_generated",
      entity: "gcode",
      metadata: {
        geometry: geometry.id,
        algorithm: infill.algorithm,
        bioprinter: bioprinterId,
        tissue,
        wellsUsed: result.wellsUsed,
        layerCount: result.layerCount,
        volume_uL: result.bioinkVolume_uL,
        estimatedTime_min: result.estimatedTime_min,
        viability_pct: result.stats.viabilityEstimate_pct,
      } as Prisma.InputJsonValue,
    },
  }).catch(() => {})

  return NextResponse.json({
    success: true,
    jobName: job.name,
    jobId: job.id,
    ...result,
    // Remove 'moves' (muito pesado) do retorno JSON — cliente usa 'gcode' para baixar
    moves: undefined,
    summary: {
      bioprinter: bp.name,
      bioink: `${bioink.material} ${bioink.concentration}%`,
      algorithm: infill.algorithm,
      wellsCount: result.wellsUsed.length || 1,
      layerCount: result.layerCount,
      estimatedTime: `${result.estimatedTime_min} min`,
      volume: `${result.bioinkVolume_uL} µL`,
      viability: result.stats.viabilityEstimate_pct ? `${result.stats.viabilityEstimate_pct}%` : "N/A",
    },
    creditsUsed: 6,
  })
}

// ═══════════════════════════════════════════════════════════════
// GET — Metadata das opções disponíveis
// ═══════════════════════════════════════════════════════════════
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  return NextResponse.json({
    version: "BIA v4.2 — Bioimpressão Especial GCODE Engine",
    endpoint: "/api/gcode/generate",
    method: "POST",
    bioprinters: listBioprinters().map((bp) => ({
      id: bp.id,
      name: bp.name,
      manufacturer: bp.manufacturer,
      heads: bp.heads,
      buildVolume: bp.buildVolume,
      hasUV: bp.hasUV,
      hasWellPlateSupport: bp.hasWellPlateSupport,
      notes: bp.notes,
    })),
    wellPlates: ([6, 12, 24, 48, 96, 384] as WellPlateFormat[]).map((f) => plateMetadata(f)),
    infillAlgorithms: [
      {
        id: "gyroid_tpms", name: "Gyroid TPMS", category: "paramétrico",
        description: "Triply Periodic Minimal Surface — ideal para osso trabecular e scaffolds volumosos",
        bestFor: ["osso", "cartilagem", "vascularização"],
      },
      {
        id: "voronoi_3d", name: "Voronoi 3D", category: "não-paramétrico",
        description: "Tesselação biomimética com poros irregulares (como osso real)",
        bestFor: ["osso trabecular", "cartilagem", "tecidos heterogêneos"],
      },
      {
        id: "gradient", name: "Gradient", category: "paramétrico",
        description: "Densidade variável ao longo do Z/X/Y ou radial",
        bestFor: ["pele", "gradiente cortical-trabecular", "vascularização radial"],
      },
      {
        id: "rectilinear", name: "Rectilinear", category: "paramétrico",
        description: "Linhas paralelas alternando ângulo por camada (padrão)",
        bestFor: ["scaffolds simples", "MVP rápido"],
      },
      {
        id: "linear", name: "Linear", category: "paramétrico",
        description: "Linhas simples em uma só direção",
        bestFor: ["testes de viabilidade", "peles finas"],
      },
    ],
    defaults: {
      layerHeight_mm: 0.2,
      walls: 2,
      skirtLoops: 2,
      infillPercent: 30,
    },
  })
}
