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
  dermico: "CUSTOM",
  esferoide: "CUSTOM",
}

const STANDARD_CELL_SOURCES = new Set(["iPSC", "ESC", "Adult_Stem", "Primary"])

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

// Schema flexível: aceita os tipos padronizados + esferoide/dermico (novos builders)
// cellSource aceita qualquer string (é normalizado antes de salvar no banco)
const designSchema = z.object({
  organoidType: z.string().min(1),
  purpose: z.string().min(5),
  cellSource: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "JSON inválido no corpo da requisição" }, { status: 400 })
    }

    const parsed = designSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 })
    }

    const { organoidType, purpose, cellSource } = parsed.data

    const userRole = (session.user as { role?: string }).role
    const creditCheck = await requireCredits(
      session.user.id,
      "ORGANOID_DESIGN",
      `Design de organoide ${organoidType}`,
      { type: organoidType } as Prisma.InputJsonValue,
      userRole
    )
    if (creditCheck) return creditCheck.error

    // Normaliza cellSource para o prompt da IA (mas preserva o original no banco)
    const normalizedCellSource = STANDARD_CELL_SOURCES.has(cellSource)
      ? cellSource
      : `Células primárias / linhagem: ${cellSource}`

    let design
    try {
      design = await designOrganoid(organoidType, purpose, normalizedCellSource)
    } catch (aiError) {
      console.error("[organoids] Erro ao gerar design com IA:", aiError)
      const message = aiError instanceof Error ? aiError.message : "Erro desconhecido na IA"
      return NextResponse.json(
        { error: `Falha ao gerar protocolo: ${message}. Verifique se GOOGLE_AI_API_KEY está configurada.` },
        { status: 500 }
      )
    }

    const prismaType = ORGANOID_TYPE_MAP[organoidType] ?? "CUSTOM"

    const saved = await prisma.organoidDesign.create({
      data: {
        userId: session.user.id,
        name: `${organoidType} - ${new Date().toLocaleDateString("pt-BR")}`,
        organoidType: prismaType,
        purpose,
        cellSource,
        cellTypes: [cellSource],
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
      organoidType,
      purpose,
      createdAt: saved.createdAt,
    })
  } catch (err) {
    console.error("[organoids] Erro inesperado:", err)
    const message = err instanceof Error ? err.message : "Erro interno do servidor"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
