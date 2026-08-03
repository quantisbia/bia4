/**
 * BIA v4 — API do Notebook do Pesquisador
 * GET    /api/notebook                     — listar entradas
 * POST   /api/notebook                     — criar entrada (cria versão V1 automaticamente — R12.66)
 * PATCH  /api/notebook?id=                 — atualizar entrada (cria nova versão por padrão — R12.66)
 *        /api/notebook?id=&updateInPlace=true — sobrescreve versão atual sem criar nova
 * DELETE /api/notebook?id=                 — deletar entrada
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"
import {
  createInitialVersion,
  updateEntryWithVersion,
} from "@/lib/notebook/versioning"

// Esta rota lê query params em runtime — não pode ser pré-renderizada (R12.14 fix)
export const dynamic = "force-dynamic"

const createSchema = z.object({
  title:      z.string().min(2).max(200),
  content:    z.string().min(1),
  entryType:  z.string().optional().default("NOTE"),
  category:   z.string().optional(),
  tags:       z.array(z.string()).optional().default([]),
  sourceType: z.string().optional(),
  sourceId:   z.string().optional(),
  isPinned:   z.boolean().optional().default(false),
  metadata:   z.record(z.string(), z.unknown()).optional(),
  // R12.66 — opcional; se enviado, entrada já nasce vinculada ao Project
  projectId:  z.string().optional().nullable(),
})

const patchSchema = z.object({
  title:    z.string().min(2).max(200).optional(),
  content:  z.string().min(1).optional(),
  isPinned: z.boolean().optional(),
  tags:     z.array(z.string()).optional(),
  category: z.string().optional().nullable(),
  generatedDoc: z.record(z.string(), z.unknown()).optional(),
  // R12.66
  entryType:    z.string().optional(),
  metadata:     z.record(z.string(), z.unknown()).optional(),
  projectId:    z.string().nullable().optional(),
  changeSummary: z.string().max(500).optional().nullable(),
})

// GET — listar entradas do usuário
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id       = searchParams.get("id")
  const type     = searchParams.get("type")
  const pinned   = searchParams.get("pinned")
  const search   = searchParams.get("q")
  const page     = parseInt(searchParams.get("page") ?? "1")
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") ?? "20"), 50)

  if (id) {
    const entry = await prisma.notebookEntry.findFirst({
      where: { id, userId: session.user.id },
    })
    if (!entry) return NextResponse.json({ error: "Entrada não encontrada" }, { status: 404 })
    return NextResponse.json(entry)
  }

  const where: Record<string, unknown> = { userId: session.user.id }
  if (type)   where.entryType = type
  if (pinned === "true") where.isPinned = true
  if (search) where.OR = [
    { title:    { contains: search, mode: "insensitive" } },
    { content:  { contains: search, mode: "insensitive" } },
    { category: { contains: search, mode: "insensitive" } },
  ]

  const [entries, total] = await Promise.all([
    prisma.notebookEntry.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, title: true, entryType: true, category: true,
        tags: true, sourceType: true, sourceId: true, isPinned: true,
        isPublic: true, createdAt: true, updatedAt: true,
        content: false, // não retornar conteúdo na listagem
        generatedDoc: true, metadata: true,
      },
    }),
    prisma.notebookEntry.count({ where }),
  ])

  return NextResponse.json({ entries, total, page, pageSize, pages: Math.ceil(total / pageSize) })
}

// POST — criar nova entrada
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 })
  }

  const { title, content, entryType, category, tags, sourceType, sourceId, isPinned, metadata, projectId } = parsed.data

  // Validar entryType contra enum
  const validTypes = ["NOTE","PROTOCOL","FORMULATION","PIPELINE_SUMMARY","ARTICLE_DRAFT",
    "PATENT_DRAFT","BOOK_CHAPTER","RESEARCH_LOG","REFERENCE","STL_GEOMETRY"]
  const safeType = validTypes.includes(entryType) ? entryType : "NOTE"

  // Se projectId veio, valida ownership antes
  if (projectId) {
    const owned = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      select: { id: true },
    })
    if (!owned) {
      return NextResponse.json({ error: "Projeto não encontrado ou sem permissão" }, { status: 400 })
    }
  }

  // R12.66 — cria entry + versão inicial (V1) em transação
  const entry = await prisma.$transaction(async (tx) => {
    const created = await tx.notebookEntry.create({
      data: {
        userId: session.user!.id,
        title,
        content,
        entryType: safeType as never,
        category: category ?? null,
        tags: tags ?? [],
        sourceType: sourceType ?? null,
        sourceId: sourceId ?? null,
        isPinned: isPinned ?? false,
        metadata: (metadata as never) ?? undefined,
        projectId: projectId ?? null,
        currentVersion: 1,
      },
    })

    // Registra a versão inicial (V1)
    await createInitialVersion(tx, created)

    return created
  })

  return NextResponse.json({ ...entry, currentVersion: 1, versionNumber: 1 }, { status: 201 })
}

// PATCH — atualizar entrada
// R12.66: por padrão CRIA NOVA VERSÃO (rastreabilidade preservada).
// Para sobrescrever sem versionar, use ?updateInPlace=true.
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 })
  const updateInPlace = searchParams.get("updateInPlace") === "true"

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 })
  }

  const existing = await prisma.notebookEntry.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, isPinned: true, currentVersion: true },
  })
  if (!existing) return NextResponse.json({ error: "Entrada não encontrada" }, { status: 404 })

  // Se projectId veio no patch, valida ownership
  if (parsed.data.projectId) {
    const owned = await prisma.project.findFirst({
      where: { id: parsed.data.projectId, userId: session.user.id },
      select: { id: true },
    })
    if (!owned) {
      return NextResponse.json({ error: "Projeto não encontrado ou sem permissão" }, { status: 400 })
    }
  }

  // isPinned é campo puramente de estado (não versionável) — trata à parte
  if (parsed.data.isPinned !== undefined && parsed.data.isPinned !== existing.isPinned) {
    await prisma.notebookEntry.update({
      where: { id },
      data: { isPinned: parsed.data.isPinned },
    })
  }

  // Se só pin/unpin, não abre versão
  const hasContentChange =
    parsed.data.title !== undefined ||
    parsed.data.content !== undefined ||
    parsed.data.tags !== undefined ||
    parsed.data.category !== undefined ||
    parsed.data.entryType !== undefined ||
    parsed.data.generatedDoc !== undefined ||
    parsed.data.metadata !== undefined ||
    parsed.data.projectId !== undefined

  if (!hasContentChange) {
    const entry = await prisma.notebookEntry.findFirst({ where: { id, userId: session.user.id } })
    return NextResponse.json({
      ...entry,
      newVersionNumber: null,
      updateInPlace: true,
    })
  }

  const { entry, newVersionNumber } = await updateEntryWithVersion(prisma, {
    entryId: id,
    userId: session.user.id,
    patch: {
      title:        parsed.data.title,
      content:      parsed.data.content,
      tags:         parsed.data.tags,
      // null = limpar categoria; undefined = não mexer
      category:     parsed.data.category !== undefined ? parsed.data.category : undefined,
      entryType:    parsed.data.entryType,
      generatedDoc: parsed.data.generatedDoc,
      metadata:     parsed.data.metadata,
      projectId:    parsed.data.projectId,
    },
    updateInPlace,
    changeSummary: parsed.data.changeSummary ?? null,
  })

  return NextResponse.json({
    ...entry,
    newVersionNumber,
    updateInPlace,
  })
}

// DELETE — deletar entrada
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 })

  const existing = await prisma.notebookEntry.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) return NextResponse.json({ error: "Entrada não encontrada" }, { status: 404 })

  await prisma.notebookEntry.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
