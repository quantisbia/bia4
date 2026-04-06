import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { requireCredits } from "@/lib/auth/credits"
import { designOrganoid } from "@/lib/ai/biomaterials"
import { prisma } from "@/lib/db/prisma"
import { OrganoidType, Prisma } from "@prisma/client"
import { z } from "zod"

const ORGANOID_TYPE_MAP: Record<string, OrganoidType> = {
  intestinal: "INTESTINE",
  hepatico: "LIVER",
  neural: "BRAIN",
  cardiaco: "HEART",
  renal: "KIDNEY",
  pancreatico: "PANCREAS",
  pulmonar: "LUNG",
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const designs = await prisma.organoidDesign.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  return NextResponse.json(designs)
}

const designSchema = z.object({
  organoidType: z.enum(["intestinal", "hepatico", "neural", "cardiaco", "renal", "pancreatico", "pulmonar"]),
  purpose: z.string().min(5),
  cellSource: z.enum(["iPSC", "ESC", "Adult_Stem", "Primary"]),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = designSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 })
  }

  const creditCheck = await requireCredits(
    session.user.id,
    "ORGANOID_DESIGN",
    `Design de organoide ${parsed.data.organoidType}`,
    { type: parsed.data.organoidType } as Prisma.InputJsonValue
  )
  if (creditCheck) return creditCheck.error

  const design = await designOrganoid(
    parsed.data.organoidType,
    parsed.data.purpose,
    parsed.data.cellSource
  )

  const prismaType = ORGANOID_TYPE_MAP[parsed.data.organoidType] ?? "CUSTOM"

  const saved = await prisma.organoidDesign.create({
    data: {
      userId: session.user.id,
      name: `${parsed.data.organoidType} - ${new Date().toLocaleDateString("pt-BR")}`,
      organoidType: prismaType,
      purpose: parsed.data.purpose,
      cellSource: parsed.data.cellSource,
      cellTypes: [parsed.data.cellSource],
      protocol: design.protocol,
      aiDesign: JSON.stringify({
        materials: design.materials,
        timeline: design.timeline,
        expectedMarkers: design.expectedMarkers,
        qualityMetrics: design.qualityMetrics,
      }),
      creditsUsed: 15,
    },
  })

  return NextResponse.json({
    ...design,
    id: saved.id,
    organoidType: parsed.data.organoidType,
    purpose: parsed.data.purpose,
    createdAt: saved.createdAt,
  })
}
