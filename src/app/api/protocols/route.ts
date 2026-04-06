import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { requireCredits } from "@/lib/auth/credits"
import { generateProtocol } from "@/lib/ai/biomaterials"
import { prisma } from "@/lib/db/prisma"
import { Prisma } from "@prisma/client"
import { z } from "zod"

const PROTOCOL_TYPE_LABELS: Record<string, string> = {
  CULTURE: "cell_culture",
  SYNTHESIS: "scaffold_prep",
  CHARACTERIZATION: "characterization",
  QUALITY_CONTROL: "quality_control",
  BIOPRINTING: "bioprinting",
  STERILIZATION: "sterilization",
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const protocols = await prisma.protocol.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      category: true,
      description: true,
      creditsUsed: true,
      createdAt: true,
    },
  })

  const mapped = protocols.map(p => ({
    ...p,
    type: p.category.toUpperCase(),
    status: "DRAFT",
    version: "1.0",
  }))

  return NextResponse.json(mapped)
}

const generateSchema = z.object({
  title: z.string().min(5).max(200),
  type: z.enum(["CULTURE", "SYNTHESIS", "CHARACTERIZATION", "QUALITY_CONTROL", "BIOPRINTING", "STERILIZATION"]),
  context: z.string().min(20),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = generateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 })
  }

  const creditCheck = await requireCredits(
    session.user.id,
    "PROTOCOL_GENERATION",
    `Geração de protocolo: ${parsed.data.title}`,
    { type: parsed.data.type } as Prisma.InputJsonValue
  )
  if (creditCheck) return creditCheck.error

  const content = await generateProtocol(
    parsed.data.title,
    parsed.data.type,
    parsed.data.context
  )

  const protocol = await prisma.protocol.create({
    data: {
      userId: session.user.id,
      title: parsed.data.title,
      category: PROTOCOL_TYPE_LABELS[parsed.data.type] ?? parsed.data.type.toLowerCase(),
      description: parsed.data.context.substring(0, 500),
      content,
      steps: [] as Prisma.InputJsonValue,
      materials: [] as Prisma.InputJsonValue,
      equipment: [],
      safetyNotes: [],
      aiGenerated: true,
      sourceInputs: { type: parsed.data.type, context: parsed.data.context } as Prisma.InputJsonValue,
      creditsUsed: 8,
    },
  })

  return NextResponse.json({
    id: protocol.id,
    title: protocol.title,
    type: parsed.data.type,
    status: "DRAFT",
    version: "1.0",
    content,
    createdAt: protocol.createdAt,
  })
}
