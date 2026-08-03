/**
 * BIA · Notebook · API de versão individual — R12.66
 *
 * GET /api/notebook/[id]/versions/[version]                → snapshot completo
 * GET /api/notebook/[id]/versions/[version]?compareTo=N    → diff simplificado
 *
 * O snapshot retornado é o JSON completo (title/content/tags/etc.).
 * Para "restaurar", use POST /api/notebook/[id]/versions/restore.
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import type { EntrySnapshot } from "@/lib/notebook/versioning"

export const dynamic = "force-dynamic"

interface DiffField {
  field: keyof EntrySnapshot
  changed: boolean
  before: unknown
  after: unknown
}

/** Diff simples (before → after) sobre os campos do snapshot */
function diffSnapshots(before: EntrySnapshot, after: EntrySnapshot): DiffField[] {
  const fields: Array<keyof EntrySnapshot> = [
    "title", "content", "entryType", "category", "tags",
    "generatedDoc", "metadata", "projectId",
  ]
  return fields.map((f) => {
    const b = before[f]
    const a = after[f]
    const changed = JSON.stringify(b) !== JSON.stringify(a)
    return { field: f, changed, before: b, after: a }
  })
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; version: string } },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const versionNumber = parseInt(params.version, 10)
  if (!Number.isInteger(versionNumber) || versionNumber < 1) {
    return NextResponse.json({ error: "Número de versão inválido" }, { status: 400 })
  }

  // Confirma ownership da entrada
  const entry = await prisma.notebookEntry.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true, currentVersion: true, title: true },
  })
  if (!entry) {
    return NextResponse.json({ error: "Entrada não encontrada" }, { status: 404 })
  }

  const version = await prisma.notebookVersion.findUnique({
    where: {
      entryId_versionNumber: { entryId: entry.id, versionNumber },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })
  if (!version) {
    return NextResponse.json({ error: `Versão ${versionNumber} não encontrada` }, { status: 404 })
  }

  // Comparação opcional com outra versão via ?compareTo=N
  const { searchParams } = new URL(req.url)
  const compareTo = searchParams.get("compareTo")
  if (compareTo) {
    const compareVersionNum = parseInt(compareTo, 10)
    if (!Number.isInteger(compareVersionNum) || compareVersionNum < 1) {
      return NextResponse.json({ error: "compareTo inválido" }, { status: 400 })
    }
    const compareVersion = await prisma.notebookVersion.findUnique({
      where: {
        entryId_versionNumber: { entryId: entry.id, versionNumber: compareVersionNum },
      },
    })
    if (!compareVersion) {
      return NextResponse.json(
        { error: `Versão ${compareVersionNum} para comparação não encontrada` },
        { status: 404 },
      )
    }
    const diff = diffSnapshots(
      version.snapshot as unknown as EntrySnapshot,
      compareVersion.snapshot as unknown as EntrySnapshot,
    )
    return NextResponse.json({
      entryId: entry.id,
      entryTitle: entry.title,
      from: {
        versionNumber: version.versionNumber,
        createdAt: version.createdAt,
        changeSummary: version.changeSummary,
        snapshot: version.snapshot,
      },
      to: {
        versionNumber: compareVersion.versionNumber,
        createdAt: compareVersion.createdAt,
        changeSummary: compareVersion.changeSummary,
        snapshot: compareVersion.snapshot,
      },
      diff,
      changedFields: diff.filter((d) => d.changed).map((d) => d.field),
    })
  }

  // Sem compareTo — só retorna o snapshot completo da versão
  return NextResponse.json({
    entryId: entry.id,
    entryTitle: entry.title,
    versionNumber: version.versionNumber,
    changeSummary: version.changeSummary,
    createdAt: version.createdAt,
    author: version.user,
    snapshot: version.snapshot,
    previousSnapshot: version.previousSnapshot,
    isCurrent: version.versionNumber === entry.currentVersion,
  })
}
