/**
 * BIA v4 — API do Notebook do Pesquisador
 * GET    /api/notebook          — listar entradas
 * POST   /api/notebook          — criar entrada
 * PATCH  /api/notebook?id=      — atualizar entrada
 * DELETE /api/notebook?id=      — deletar entrada
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

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
})

const patchSchema = z.object({
  title:    z.string().min(2).max(200).optional(),
  content:  z.string().min(1).optional(),
  isPinned: z.boolean().optional(),
  tags:     z.array(z.string()).optional(),
  category: z.string().optional(),
  generatedDoc: z.record(z.string(), z.unknown()).optional(),
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

  const { title, content, entryType, category, tags, sourceType, sourceId, isPinned, metadata } = parsed.data

  // Validar entryType contra enum
  const validTypes = ["NOTE","PROTOCOL","FORMULATION","PIPELINE_SUMMARY","ARTICLE_DRAFT",
    "PATENT_DRAFT","BOOK_CHAPTER","RESEARCH_LOG","REFERENCE","STL_GEOMETRY"]
  const safeType = validTypes.includes(entryType) ? entryType : "NOTE"

  const entry = await prisma.notebookEntry.create({
    data: {
      userId: session.user.id,
      title,
      content,
      entryType: safeType as never,
      category: category ?? null,
      tags: tags ?? [],
      sourceType: sourceType ?? null,
      sourceId: sourceId ?? null,
      isPinned: isPinned ?? false,
      metadata: (metadata as never) ?? undefined,
    },
  })

  return NextResponse.json(entry, { status: 201 })
}

// PATCH — atualizar entrada
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const existing = await prisma.notebookEntry.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) return NextResponse.json({ error: "Entrada não encontrada" }, { status: 404 })

  const updated = await prisma.notebookEntry.update({
    where: { id },
    data: {
      ...parsed.data,
      generatedDoc: parsed.data.generatedDoc as never ?? existing.generatedDoc,
    },
  })

  return NextResponse.json(updated)
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
