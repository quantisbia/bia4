/**
 * BIA · Projetos científicos (Notebook) — API — R12.66
 *
 * GET    /api/projects              → lista projetos do usuário
 *        ?includeArchived=true      → inclui arquivados
 *        ?q=texto                   → busca em name/description/researchArea
 * POST   /api/projects              → cria projeto
 * PATCH  /api/projects?id=xyz       → atualiza projeto (rename, arquivar, cor, etc.)
 * DELETE /api/projects?id=xyz       → apaga projeto (entradas ficam órfãs — projectId=null)
 *
 * Ownership sempre validado (session.user.id === project.userId).
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

// ────────────────────────────────────────────────────────────
// GET — listar projetos
// ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const url = new URL(req.url)
  const includeArchived = url.searchParams.get("includeArchived") === "true"
  const q = url.searchParams.get("q")?.trim()

  const where: {
    userId: string
    isArchived?: boolean
    OR?: Array<Record<string, unknown>>
  } = { userId: session.user.id }

  if (!includeArchived) where.isArchived = false

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { researchArea: { contains: q, mode: "insensitive" } },
    ]
  }

  const projects = await prisma.project.findMany({
    where,
    orderBy: [{ isArchived: "asc" }, { updatedAt: "desc" }],
    include: {
      _count: { select: { entries: true } },
    },
  })

  return NextResponse.json({
    total: projects.length,
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      researchArea: p.researchArea,
      color: p.color,
      isArchived: p.isArchived,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      entryCount: p._count.entries,
    })),
  })
}

// ────────────────────────────────────────────────────────────
// POST — criar projeto
// ────────────────────────────────────────────────────────────
const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  researchArea: z.string().max(200).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{3,8}$/, "Cor deve ser hex (#rgb, #rrggbb ou #rrggbbaa)")
    .optional()
    .nullable(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const project = await prisma.project.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name.trim(),
      description: parsed.data.description ?? null,
      researchArea: parsed.data.researchArea ?? null,
      color: parsed.data.color ?? null,
    },
  })

  return NextResponse.json({ success: true, project }, { status: 201 })
}

// ────────────────────────────────────────────────────────────
// PATCH — atualizar projeto (rename, arquivar, cor, etc.)
// ────────────────────────────────────────────────────────────
const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  researchArea: z.string().max(200).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{3,8}$/)
    .nullable()
    .optional(),
  isArchived: z.boolean().optional(),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "Parâmetro id obrigatório" }, { status: 400 })
  }

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  // Confirma ownership
  const existing = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 })
  }

  const project = await prisma.project.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.researchArea !== undefined ? { researchArea: parsed.data.researchArea } : {}),
      ...(parsed.data.color !== undefined ? { color: parsed.data.color } : {}),
      ...(parsed.data.isArchived !== undefined ? { isArchived: parsed.data.isArchived } : {}),
    },
  })

  return NextResponse.json({ success: true, project })
}

// ────────────────────────────────────────────────────────────
// DELETE — apaga projeto (entradas ficam com projectId=null via onDelete: SetNull no schema)
// ────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "Parâmetro id obrigatório" }, { status: 400 })
  }

  const existing = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 })
  }

  // Antes de deletar, desassocia entradas (projectId = null) para não perdê-las
  await prisma.$transaction([
    prisma.notebookEntry.updateMany({
      where: { projectId: existing.id },
      data: { projectId: null },
    }),
    prisma.project.delete({ where: { id: existing.id } }),
  ])

  return NextResponse.json({ success: true, projectId: existing.id })
}
