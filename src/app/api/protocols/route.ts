/**
 * BIA v4 — API de Protocolos
 * GET  /api/protocols        → lista protocolos do usuário
 * POST /api/protocols        → gera protocolo via IA
 * GET  /api/protocols?id=xx  → busca protocolo específico com conteúdo
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { requireCredits } from "@/lib/auth/credits"
import { prisma } from "@/lib/db/prisma"
import { generateContent, SYSTEM_PROMPTS, BiaAIError, aiErrorToHttp } from "@/lib/ai/gemini"
import { Prisma } from "@prisma/client"
import { z } from "zod"

// ─── Constantes ───────────────────────────────────────────────────────────────
const PROTOCOL_TYPE_LABELS: Record<string, string> = {
  CULTURE:          "Cultura Celular",
  SYNTHESIS:        "Síntese de Biomaterial",
  CHARACTERIZATION: "Caracterização",
  QUALITY_CONTROL:  "Controle de Qualidade",
  BIOPRINTING:      "Bioimpressão 3D",
  STERILIZATION:    "Esterilização",
  ELECTROSPINNING:  "Eletrofiação",
  REGULATORY:       "Documentação Regulatória",
}

const CREDIT_COST = 8

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    // Buscar protocolo específico (com conteúdo completo)
    if (id) {
      const protocol = await prisma.protocol.findFirst({
        where: { id, userId: session.user.id },
      })
      if (!protocol) {
        return NextResponse.json({ error: "Protocolo não encontrado" }, { status: 404 })
      }
      return NextResponse.json({
        id: protocol.id,
        title: protocol.title,
        type: protocol.category?.toUpperCase() ?? "CULTURE",
        typeName: PROTOCOL_TYPE_LABELS[protocol.category?.toUpperCase() ?? ""] ?? protocol.category,
        status: "DRAFT",
        version: "1.0",
        content: protocol.content,
        description: protocol.description,
        creditsUsed: protocol.creditsUsed,
        createdAt: protocol.createdAt,
      })
    }

    // Listar todos os protocolos (sem conteúdo — para performance)
    const protocols = await prisma.protocol.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        title: true,
        category: true,
        description: true,
        creditsUsed: true,
        aiGenerated: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const mapped = protocols.map((p) => ({
      id: p.id,
      title: p.title,
      type: p.category?.toUpperCase() ?? "CULTURE",
      typeName: PROTOCOL_TYPE_LABELS[p.category?.toUpperCase() ?? ""] ?? p.category,
      status: "DRAFT",
      version: "1.0",
      description: p.description,
      creditsUsed: p.creditsUsed,
      aiGenerated: p.aiGenerated,
      createdAt: p.createdAt,
    }))

    return NextResponse.json(mapped)
  } catch (error) {
    console.error("[GET /api/protocols]", error)
    return NextResponse.json({ error: "Erro ao buscar protocolos" }, { status: 500 })
  }
}

// ─── Schema de validação ───────────────────────────────────────────────────────
const generateSchema = z.object({
  title: z.string().min(5, "Título muito curto").max(200),
  type: z.enum([
    "CULTURE", "SYNTHESIS", "CHARACTERIZATION",
    "QUALITY_CONTROL", "BIOPRINTING", "STERILIZATION",
    "ELECTROSPINNING", "REGULATORY",
  ]),
  context: z.string().min(10, "Contexto muito curto — descreva o objetivo do protocolo"),
  // Campos opcionais para protocolos mais específicos
  tissueType: z.string().optional(),
  application: z.string().optional(),
  specialRequirements: z.string().optional(),
})

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    // Parse body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "JSON inválido no body da requisição" }, { status: 400 })
    }

    // Validate
    const parsed = generateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { title, type, context, tissueType, application, specialRequirements } = parsed.data

    // ── Verificar créditos (ADMIN tem bypass automático) ─────────────────────
    const userRole = (session.user as { role?: string }).role
    const creditCheck = await requireCredits(
      session.user.id,
      "PROTOCOL_GENERATION",
      `Protocolo: ${title}`,
      { type, title } as Prisma.InputJsonValue,
      userRole
    )
    if (creditCheck) return creditCheck.error

    // ── Gerar protocolo com IA ────────────────────────────────────────────────
    const typeName = PROTOCOL_TYPE_LABELS[type] ?? type
    const extras = [
      tissueType ? `Tecido/Material: ${tissueType}` : null,
      application ? `Aplicação clínica: ${application}` : null,
      specialRequirements ? `Requisitos especiais: ${specialRequirements}` : null,
    ].filter(Boolean).join("\n")

    const prompt = `Gere um protocolo laboratorial completo e detalhado para biofabricação:

TÍTULO: ${title}
TIPO: ${typeName}
CONTEXTO / OBJETIVO: ${context}
${extras ? "\nINFORMAÇÕES ADICIONAIS:\n" + extras : ""}

Gere um protocolo científico rigoroso no formato padrão GLP/GMP, incluindo:

## Objetivo
(2-3 frases claras sobre o propósito)

## Escopo e Aplicabilidade
(quando e onde aplicar este protocolo)

## Materiais e Reagentes
(lista completa com fornecedor sugerido, concentração, quantidade estimada)

## Equipamentos
(lista de equipamentos com especificações técnicas)

## Medidas de Segurança e EPI
(riscos específicos e EPIs necessários)

## Procedimento
(passo a passo numerado, com:
- tempos exatos
- temperaturas
- concentrações
- pontos críticos de controle — CCPs
- alertas em negrito para etapas críticas)

## Controles de Qualidade
(critérios de aceitação e rejeição)

## Análise e Interpretação de Resultados
(como avaliar e documentar)

## Troubleshooting
(problemas comuns e soluções)

## Referências Normativas
(normas ISO, ASTM, ABNT, FDA, ANVISA aplicáveis)

## Registros e Documentação
(formulários e logs necessários)

Seja específico com números, temperaturas, concentrações e tempos. Este protocolo será usado em laboratório de biofabricação especializado.`

    const { text: content } = await generateContent(prompt, {
      systemPrompt: SYSTEM_PROMPTS.PROTOCOL_GENERATOR,
      temperature: 0.3,
      maxTokens: 4096,
    })

    if (!content || content.trim().length < 100) {
      return NextResponse.json(
        { error: "IA não retornou conteúdo válido. Tente novamente." },
        { status: 500 }
      )
    }

    // ── Salvar no banco ───────────────────────────────────────────────────────
    const protocol = await prisma.protocol.create({
      data: {
        userId: session.user.id,
        title,
        category: typeName.toLowerCase().replace(/ /g, "_"),
        description: context.substring(0, 500),
        content,
        steps: [] as Prisma.InputJsonValue,
        materials: [] as Prisma.InputJsonValue,
        equipment: [],
        safetyNotes: [],
        aiGenerated: true,
        sourceInputs: {
          type,
          context,
          tissueType: tissueType ?? null,
          application: application ?? null,
        } as Prisma.InputJsonValue,
        creditsUsed: CREDIT_COST,
      },
    })

    // ── Audit log ─────────────────────────────────────────────────────────────
    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "protocol_generated",
        entity: "protocol",
        entityId: protocol.id,
        metadata: { type, title } as Prisma.InputJsonValue,
      },
    }).catch(() => {})

    return NextResponse.json(
      {
        id: protocol.id,
        title: protocol.title,
        type,
        typeName,
        status: "DRAFT",
        version: "1.0",
        content,
        description: protocol.description,
        creditsUsed: CREDIT_COST,
        createdAt: protocol.createdAt,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[POST /api/protocols]", error)
    if (error instanceof BiaAIError) {
      const r = aiErrorToHttp(error)
      return NextResponse.json({ error: r.error, code: r.code }, { status: r.status })
    }
    // Retornar erro legível
    const message = error instanceof Error ? error.message : "Erro desconhecido"
    if (message.includes("Créditos insuficientes") || message.includes("INSUFFICIENT")) {
      return NextResponse.json({ error: message, code: "INSUFFICIENT_CREDITS" }, { status: 402 })
    }
    return NextResponse.json(
      { error: "Erro ao gerar protocolo. Tente novamente em alguns segundos." },
      { status: 500 }
    )
  }
}
