/**
 * BIA · Notebook · API de versões — R12.66
 *
 * GET  /api/notebook/[id]/versions       → lista histórico (todas as versões)
 * POST /api/notebook/[id]/versions       → cria nova versão manualmente
 *                                          (uso raro; o PATCH principal já cria)
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"
import {
  createNewVersion,
  snapshotFromEntry,
  type EntrySnapshot,
} from "@/lib/notebook/versioning"

export const dynamic = "force-dynamic"

// GET — lista todas as versões de uma entrada, ordem decrescente por número
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  // Confirma que a entrada existe e pertence ao usuário
  const entry = await prisma.notebookEntry.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true, currentVersion: true, title: true },
  })
  if (!entry) {
    return NextResponse.json({ error: "Entrada não encontrada" }, { status: 404 })
  }

  const versions = await prisma.notebookVersion.findMany({
    where: { entryId: entry.id },
    orderBy: { versionNumber: "desc" },
    select: {
      id: true,
      versionNumber: true,
      changeSummary: true,
      createdAt: true,
      userId: true,
      user: { select: { id: true, name: true, email: true } },
      // Não retornamos snapshot na listagem (pesado); só na leitura individual
    },
  })

  return NextResponse.json({
    entryId: entry.id,
    entryTitle: entry.title,
    currentVersion: entry.currentVersion,
    total: versions.length,
    versions,
  })
}

// POST — criar versão manualmente (uso raro — normalmente vem do PATCH)
const createVersionSchema = z.object({
  changeSummary: z.string().max(500).optional(),
  snapshot: z
    .object({
      title: z.string().min(1),
      content: z.string().min(1),
      entryType: z.string().optional(),
      category: z.string().optional().nullable(),
      tags: z.array(z.string()).optional(),
      generatedDoc: z.unknown().optional(),
      metadata: z.unknown().optional(),
      projectId: z.string().optional().nullable(),
    })
    .optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = createVersionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 })
  }

  const entry = await prisma.notebookEntry.findFirst({
    where: { id: params.id, userId: session.user.id },
  })
  if (!entry) {
    return NextResponse.json({ error: "Entrada não encontrada" }, { status: 404 })
  }

  const previousSnapshot = snapshotFromEntry(entry)
  const newSnapshot: EntrySnapshot = parsed.data.snapshot
    ? {
        title: parsed.data.snapshot.title ?? entry.title,
        content: parsed.data.snapshot.content ?? entry.content,
        entryType: parsed.data.snapshot.entryType ?? entry.entryType,
        category: parsed.data.snapshot.category ?? entry.category,
        tags: parsed.data.snapshot.tags ?? entry.tags,
        generatedDoc: (parsed.data.snapshot.generatedDoc ?? entry.generatedDoc) as unknown,
        metadata: (parsed.data.snapshot.metadata ?? entry.metadata) as unknown,
        projectId: parsed.data.snapshot.projectId ?? entry.projectId,
      }
    : previousSnapshot

  const newVersionNumber = entry.currentVersion + 1
  await prisma.$transaction(async (tx) => {
    if (parsed.data.snapshot) {
      // Aplica também na entrada
      await tx.notebookEntry.update({
        where: { id: entry.id },
        data: {
          title: newSnapshot.title,
          content: newSnapshot.content,
          entryType: newSnapshot.entryType as never,
          category: newSnapshot.category,
          tags: newSnapshot.tags,
          generatedDoc: newSnapshot.generatedDoc as never,
          metadata: newSnapshot.metadata as never,
          projectId: newSnapshot.projectId,
          currentVersion: newVersionNumber,
        },
      })
    } else {
      // Só bumpar version (snapshot manual do estado atual)
      await tx.notebookEntry.update({
        where: { id: entry.id },
        data: { currentVersion: newVersionNumber },
      })
    }

    await createNewVersion(tx, {
      entryId: entry.id,
      userId: session.user!.id,
      newVersionNumber,
      snapshot: newSnapshot,
      previousSnapshot,
      changeSummary: parsed.data.changeSummary ?? null,
    })
  })

  return NextResponse.json(
    { success: true, entryId: entry.id, versionNumber: newVersionNumber },
    { status: 201 },
  )
}
