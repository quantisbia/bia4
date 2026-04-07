import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { requireCredits } from "@/lib/auth/credits"
import { analyzePipelineStage, suggestBiomaterials } from "@/lib/ai/pipeline"
import { prisma } from "@/lib/db/prisma"
import {
  getUserPipelineProjects,
  createPipelineProject,
  getPipelineProject,
  updatePipelineStage,
  advancePipelineStage,
} from "@/lib/db/queries"
import { Prisma } from "@prisma/client"
import { z } from "zod"

// GET /api/pipeline — listar projetos
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get("id")

  if (projectId) {
    const project = await getPipelineProject(projectId, session.user.id)
    if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 })
    return NextResponse.json(project)
  }

  const projects = await getUserPipelineProjects(session.user.id)
  return NextResponse.json(projects)
}

const createSchema = z.object({
  name: z.string().min(3).max(100),
  tissueType: z.string().min(2),
  application: z.string().min(2),
  cellSource: z.string().optional(),
  requirements: z.string().optional(),
})

// POST /api/pipeline — criar projeto ou executar etapa
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await req.json()

  // Criar novo projeto
  if (body.action === "create") {
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 })
    }

    const project = await createPipelineProject(session.user.id, {
      name: parsed.data.name,
      tissueType: parsed.data.tissueType,
      targetApplication: parsed.data.application,
      cellSource: parsed.data.cellSource,
    })

    return NextResponse.json(project, { status: 201 })
  }

  // Analisar etapa com IA
  if (body.action === "analyze_stage") {
    const { projectId, stageNum } = body
    if (!projectId || !stageNum) {
      return NextResponse.json({ error: "projectId e stageNum são obrigatórios" }, { status: 400 })
    }

    // Verificar créditos (5 por análise de etapa) — ADMIN tem bypass
    const userRole = (session.user as { role?: string }).role
    const creditCheck = await requireCredits(
      session.user.id,
      "PIPELINE_STAGE",
      `Análise Pipeline - Etapa ${stageNum}`,
      { projectId, stageNum } as Prisma.InputJsonValue,
      userRole
    )
    if (creditCheck) return creditCheck.error

    const project = await getPipelineProject(projectId, session.user.id)
    if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 })

    const analysis = await analyzePipelineStage(
      {
        tissueType: project.tissueType,
        targetApplication: project.targetApplication ?? "",
        cellSource: project.cellSource ?? undefined,
        currentStage: stageNum,
      },
      stageNum
    )

    // Salvar análise no banco — buscar stage pelo projectId + stageNumber
    const stage = await prisma.pipelineStage.findUnique({
      where: { projectId_stageNumber: { projectId, stageNumber: stageNum } },
    })
    if (stage) {
      await updatePipelineStage(stage.id, {
        status: "COMPLETED",
        outputs: analysis as unknown as Prisma.InputJsonValue,
        aiAnalysis: analysis.recommendation,
        creditsUsed: 5,
      })
    }

    await advancePipelineStage(projectId, session.user.id)

    return NextResponse.json(analysis)
  }

  // Sugerir biomateriais para o pipeline
  if (body.action === "suggest_biomaterials") {
    const { tissueType, stageContext } = body
    const userRole2 = (session.user as { role?: string }).role
    const creditCheck2 = await requireCredits(
      session.user.id,
      "BIOMATERIAL_FORMULATION",
      "Sugestão de biomateriais para pipeline",
      { tissueType } as Prisma.InputJsonValue,
      userRole2
    )
    if (creditCheck2) return creditCheck2.error

    const suggestions = await suggestBiomaterials(tissueType, stageContext)
    return NextResponse.json(suggestions)
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
}
