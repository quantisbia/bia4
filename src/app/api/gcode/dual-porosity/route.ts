/**
 * BIA v4.2 — API de Dual-Porosity (macro + micro)
 *
 * POST /api/gcode/dual-porosity
 * Gera arquitetura dual-poro para OSSO, FÍGADO, CARTILAGEM ou RIM.
 *
 * Body simplificado — use presets biomiméticos:
 * {
 *   tissue: "osso_trabecular" | "figado" | "cartilagem" | "rim" | "custom",
 *   bboxXY: { minX, minY, maxX, maxY },
 *   zRange: [zMin, zMax],
 *   layerHeight_mm: number,
 *   customConfig?: DualPorosityConfig (se tissue="custom")
 * }
 *
 * Retorna: DualPorosityResult + segmentos prontos para preview/emissão.
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { requireCredits } from "@/lib/auth/credits"
import { prisma } from "@/lib/db/prisma"
import type { Prisma } from "@prisma/client"
import { z } from "zod"

import {
  generateDualPorosity,
  dualPorosityBone,
  dualPorosityLiver,
  dualPorosityCartilage,
  dualPorosityKidney,
  type DualPorosityConfig,
} from "@/lib/gcode/infill/dual-porosity"
import type { Segment2D } from "@/lib/gcode/core/types"

const bboxSchema = z.object({
  minX: z.number(),
  minY: z.number(),
  maxX: z.number(),
  maxY: z.number(),
})

const bodySchema = z.object({
  tissue: z.enum(["osso_trabecular", "figado", "cartilagem", "rim", "custom"]),
  bboxXY: bboxSchema,
  zRange: z.tuple([z.number(), z.number()]),
  layerHeight_mm: z.number().min(0.02).max(1).default(0.25),
  // Opções customizáveis sobre os presets
  baseDensity: z.number().min(0.1).max(0.9).optional(),
  macroEnabled: z.boolean().optional(),
  microEnabled: z.boolean().optional(),
  macroDiameter_um: z.number().min(100).max(1500).optional(),
  microSpacing_um: z.number().min(50).max(500).optional(),
  seed: z.number().int().optional(),
})

function getPresetFor(
  tissue: string,
  overrides: {
    baseDensity?: number
    macroEnabled?: boolean
    microEnabled?: boolean
    macroDiameter_um?: number
    microSpacing_um?: number
    seed?: number
  },
): DualPorosityConfig {
  let preset: DualPorosityConfig
  switch (tissue) {
    case "osso_trabecular": preset = dualPorosityBone(); break
    case "figado":          preset = dualPorosityLiver(); break
    case "cartilagem":      preset = dualPorosityCartilage(); break
    case "rim":             preset = dualPorosityKidney(); break
    default:                preset = dualPorosityBone()
  }
  if (overrides.baseDensity !== undefined) preset.baseDensity = overrides.baseDensity
  if (overrides.macroEnabled !== undefined) preset.macroEnabled = overrides.macroEnabled
  if (overrides.microEnabled !== undefined) preset.microEnabled = overrides.microEnabled
  if (overrides.macroDiameter_um !== undefined && preset.macroConfig) {
    preset.macroConfig.diameter_um = overrides.macroDiameter_um
  }
  if (overrides.microSpacing_um !== undefined && preset.microConfig) {
    preset.microConfig.spacing_um = overrides.microSpacing_um
  }
  if (overrides.seed !== undefined) preset.baseSeed = overrides.seed
  return preset
}

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

  const { tissue, bboxXY, zRange, layerHeight_mm, ...overrides } = parsed.data

  // Cobrar créditos
  const userRole = (session.user as { role?: string }).role
  const creditCheck = await requireCredits(
    session.user.id,
    "STL_GCODE",
    `Dual-porosity gerado: ${tissue} (${zRange[1] - zRange[0]}mm Z)`,
    {
      tissue,
      bboxXY,
      zRange,
      layerHeight_mm,
    } as Prisma.InputJsonValue,
    userRole,
  )
  if (creditCheck) return creditCheck.error

  const config = getPresetFor(tissue, overrides)

  let result
  try {
    result = generateDualPorosity({
      bbox: bboxXY,
      zRange,
      layerHeight_mm,
      config,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[DUAL-POROSITY ERROR]", err)
    return NextResponse.json(
      { error: `Falha: ${msg}` },
      { status: 500 },
    )
  }

  // Converter para segmentos de preview (com cor por tipo)
  interface PreviewSeg { ax: number; ay: number; bx: number; by: number; z: number; kind: string }
  const previewSegments: PreviewSeg[] = []
  const MAX_PREVIEW = 30000

  const pushSegs = (segs: Segment2D[], z: number, kind: string) => {
    for (const s of segs) {
      if (previewSegments.length >= MAX_PREVIEW) return
      previewSegments.push({
        ax: s.a.x, ay: s.a.y, bx: s.b.x, by: s.b.y, z, kind,
      })
    }
  }

  result.layers.forEach((layer) => {
    pushSegs(layer.baseSegments, layer.z_mm, "base")
    pushSegs(layer.macroSegments, layer.z_mm, "macro")
    pushSegs(layer.microSegments, layer.z_mm, "micro")
  })

  // Auditoria
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "dual_porosity_generated",
      entity: "gcode",
      metadata: {
        tissue,
        baseStructure: config.baseStructure,
        macroEnabled: config.macroEnabled,
        microEnabled: config.microEnabled,
        totalPorosity: result.summary.totalPorosity_pct,
        folkmanCompliant: result.summary.folkmanCompliant,
        mechanicalCompliant: result.summary.mechanicalCompliant,
        viability: result.summary.estimatedViability_pct,
      } as Prisma.InputJsonValue,
    },
  }).catch(() => {})

  // Contagem leve de camadas (não enviar Map inteiro — só resumo)
  const layerSummary: Array<{ z: number; base: number; macro: number; micro: number }> = []
  result.layers.forEach((l) => {
    layerSummary.push({
      z: l.z_mm,
      base: l.baseSegments.length,
      macro: l.macroSegments.length,
      micro: l.microSegments.length,
    })
  })

  return NextResponse.json({
    success: true,
    tissue,
    config: {
      baseStructure: config.baseStructure,
      baseDensity: config.baseDensity,
      macroEnabled: config.macroEnabled,
      microEnabled: config.microEnabled,
      macro: config.macroConfig
        ? {
            pattern: config.macroConfig.pattern,
            diameter_um: config.macroConfig.diameter_um,
            spacing_mm: config.macroConfig.spacing_mm,
            mode: config.macroConfig.mode,
            sacrificialMaterial: config.macroConfig.sacrificialMaterial,
          }
        : null,
      micro: config.microConfig
        ? {
            pattern: config.microConfig.pattern,
            diameter_um: config.microConfig.diameter_um,
            spacing_um: config.microConfig.spacing_um,
            porogenType: config.microConfig.porogenType,
          }
        : null,
    },
    summary: result.summary,
    layerSummary,
    previewSegments,
    previewTruncated: previewSegments.length >= MAX_PREVIEW,
    macroResult: result.macroResult
      ? {
          totalLength_mm: result.macroResult.totalLength_mm,
          channelCount: result.macroResult.channelCount,
          avgDiameter_um: result.macroResult.avgDiameter_um,
          perfusion_mLminKg: result.macroResult.estimatedPerfusion_mLminKg,
          vascularEfficiency: result.macroResult.vascularEfficiency,
          notes: result.macroResult.notes,
        }
      : null,
    microResult: result.microResult
      ? {
          channelCount: result.microResult.channelCount,
          density_per_mm2: result.microResult.density_per_mm2,
          porosity_pct: result.microResult.porosity_pct,
          diffusionLimit_um: result.microResult.diffusionLimit_um,
          folkmanCompliance: result.microResult.folkmanCompliance,
          surfaceAreaRatio: result.microResult.surfaceAreaRatio,
          notes: result.microResult.notes,
        }
      : null,
    voronoi3DStats: result.voronoi3DResult
      ? {
          cellCount: result.voronoi3DResult.cellCount,
          porosity_pct: result.voronoi3DResult.porosity_pct,
          avgTrabeculaSize_um: result.voronoi3DResult.avgTrabeculaSize_um,
          vertConnectivity: result.voronoi3DResult.vertConnectivity,
          lloydIterations: result.voronoi3DResult.lloydIterations,
        }
      : null,
    notes: result.notes,
    warnings: result.warnings,
    creditsUsed: 6,
  })
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/gcode/dual-porosity",
    method: "POST",
    description: "Geração de arquitetura dual-poro (macro + micro) para bioimpressão hierárquica",
    availableTissues: [
      {
        id: "osso_trabecular",
        name: "Osso Trabecular",
        baseStructure: "voronoi_3d",
        macroPattern: "cross_hatch (Havers Ø600µm)",
        microPattern: "stochastic NaCl Ø80µm (Volkmann)",
        expectedPorosity: "75-80%",
        applications: ["scaffolds ortopédicos", "defeitos craniofaciais"],
      },
      {
        id: "figado",
        name: "Fígado",
        baseStructure: "perlin",
        macroPattern: "hexagonal (tríade portal Ø500µm)",
        microPattern: "hexagonal_pores (Disse Ø100µm)",
        expectedPorosity: "65-70%",
        applications: ["organoides hepáticos", "bioreator de detoxificação"],
      },
      {
        id: "cartilagem",
        name: "Cartilagem",
        baseStructure: "gyroid",
        macroPattern: "NONE (avascular)",
        microPattern: "directional_aligned (fibras Ø120µm)",
        expectedPorosity: "40-50%",
        applications: ["menisco", "regeneração condral"],
      },
      {
        id: "rim",
        name: "Rim",
        baseStructure: "voronoi_3d",
        macroPattern: "branching Murray Ø700µm (arcuato)",
        microPattern: "radial_capillary (glomérulo Ø60µm)",
        expectedPorosity: "70-75%",
        applications: ["organoides renais", "néfron artificial"],
      },
    ],
    references: [
      "Karageorgiou & Kaplan (2005) Biomaterials 26, 5474 — osteogênese vs porosidade",
      "Grayson et al. (2008) PNAS 105, 17169 — bone dual-scale",
      "Miri et al. (2018) Adv. Mater. 30, 1800242 — hierarchical bioprinting",
      "Kolesky et al. (2014) Adv. Mater. 26, 3124 — vascularização sacrificial",
    ],
  })
}
