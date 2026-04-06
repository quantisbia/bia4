import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { requireCredits } from "@/lib/auth/credits"
import { formulateBiomaterial } from "@/lib/ai/biomaterials"
import { prisma } from "@/lib/db/prisma"
import { Prisma } from "@prisma/client"
import { z } from "zod"

// GET /api/biomaterials — listar biomateriais do banco
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const category = searchParams.get("category") ?? ""
  const limit = parseInt(searchParams.get("limit") ?? "20")

  const where: Prisma.BiomaterialWhereInput = {
    isActive: true,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { tags: { hasSome: [search] } },
        { applications: { hasSome: [search] } },
      ],
    }),
    ...(category && { category: category as Prisma.EnumBiomaterialCategoryFilter }),
  }

  const biomaterials = await prisma.biomaterial.findMany({
    where,
    take: limit,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      category: true,
      composition: true,
      concentration: true,
      applications: true,
      biocompatibility: true,
      gelTime: true,
      crosslinking: true,
    },
  })

  const total = await prisma.biomaterial.count({ where })

  return NextResponse.json({ biomaterials, total })
}

const formulateSchema = z.object({
  application: z.string().min(3),
  tissueType: z.string().min(2),
  requirements: z.object({
    stiffness: z.string().optional(),
    biodegradable: z.boolean().optional(),
    printable: z.boolean().optional(),
    cellLaden: z.boolean().optional(),
    transparency: z.boolean().optional(),
  }).optional(),
})

// POST /api/biomaterials — formular biomaterial com IA
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = formulateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 })
  }

  // Verificar e gastar créditos (10 por formulação)
  const creditCheck = await requireCredits(
    session.user.id,
    "BIOMATERIAL_FORMULATION",
    `Formulação: ${parsed.data.application} para ${parsed.data.tissueType}`,
    { application: parsed.data.application } as Prisma.InputJsonValue
  )
  if (creditCheck) return creditCheck.error

  const formulation = await formulateBiomaterial(
    parsed.data.application,
    parsed.data.tissueType,
    parsed.data.requirements ?? {}
  )

  // Salvar formulação no histórico
  await prisma.formulationRecord.create({
    data: {
      userId: session.user.id,
      application: parsed.data.application,
      tissueType: parsed.data.tissueType,
      formulation: formulation as unknown as Prisma.InputJsonValue,
      creditsUsed: 10,
    },
  })

  return NextResponse.json(formulation)
}
