/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · Notebook · Versioning helpers (R12.66)
 *  ─────────────────────────────────────────────────────────────────────
 *  Regras do sistema de versionamento:
 *
 *  1. Toda NotebookEntry criada tem AUTOMATICAMENTE uma versão 1 —
 *     snapshot inicial. `NotebookEntry.currentVersion` = 1.
 *
 *  2. Ao editar uma entrada (PATCH), por padrão criamos uma NOVA versão
 *     (currentVersion++) e o snapshot ANTERIOR é copiado para
 *     `previousSnapshot` da nova versão, para diff e restauração.
 *
 *  3. Se ?updateInPlace=true (exceção pra correções de typo), a versão
 *     corrente é atualizada SEM criar nova NotebookVersion. Uso raro.
 *
 *  4. Para "restaurar" versão N, criamos uma nova versão (N+1) com o
 *     snapshot de N — assim o histórico nunca é apagado.
 *
 *  Rationale: rastreabilidade científica exige que NADA se perca.
 *  Se um revisor cético precisar saber "o que foi mudado entre v3 e v5",
 *  a resposta está no banco.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import type { NotebookEntry, Prisma, PrismaClient } from "@prisma/client"

/**
 * Snapshot canônico de uma NotebookEntry — o que fica no
 * `NotebookVersion.snapshot`. Só os campos "de conteúdo" — nunca
 * metadata de infra (id, createdAt, etc.).
 */
export interface EntrySnapshot {
  title: string
  content: string
  entryType: string
  category: string | null
  tags: string[]
  generatedDoc: unknown | null
  metadata: unknown | null
  projectId: string | null
}

/**
 * Extrai o snapshot canônico de uma NotebookEntry vinda do Prisma.
 * Deve ser usado tanto na criação inicial (versão 1) quanto no diff
 * antes de gerar uma nova versão.
 */
export function snapshotFromEntry(entry: NotebookEntry): EntrySnapshot {
  return {
    title: entry.title,
    content: entry.content,
    entryType: entry.entryType,
    category: entry.category,
    tags: entry.tags,
    generatedDoc: entry.generatedDoc,
    metadata: entry.metadata,
    projectId: entry.projectId,
  }
}

/**
 * Cria a versão inicial (número 1) para uma entrada recém-criada.
 * Deve ser chamada logo após `prisma.notebookEntry.create()`.
 * Não retorna nada — falhas propagam.
 */
export async function createInitialVersion(
  prisma: PrismaClient | Prisma.TransactionClient,
  entry: NotebookEntry,
): Promise<void> {
  await prisma.notebookVersion.create({
    data: {
      entryId: entry.id,
      userId: entry.userId,
      versionNumber: 1,
      changeSummary: "Criação inicial",
      snapshot: snapshotFromEntry(entry) as unknown as Prisma.InputJsonValue,
      previousSnapshot: undefined,
    },
  })
}

/**
 * Cria uma nova versão a partir do snapshot atual (previousSnapshot) e
 * do snapshot novo (snapshot). Incrementa `currentVersion` na entrada.
 * Retorna o número da nova versão.
 *
 * IMPORTANTE: esta função assume que a NotebookEntry já foi ATUALIZADA
 * no banco com o novo conteúdo — ela apenas registra o histórico.
 * O caller deve chamar em ordem:
 *   1. buscar entry (previousSnapshot = snapshotFromEntry)
 *   2. atualizar entry com os novos campos + currentVersion + 1
 *   3. chamar createNewVersion com o snapshot novo e o antigo
 * ...ou usar `updateEntryWithVersion` abaixo que faz tudo dentro
 * de uma transação.
 */
export async function createNewVersion(
  prisma: PrismaClient | Prisma.TransactionClient,
  params: {
    entryId: string
    userId: string
    newVersionNumber: number
    snapshot: EntrySnapshot
    previousSnapshot: EntrySnapshot
    changeSummary?: string | null
  },
): Promise<void> {
  await prisma.notebookVersion.create({
    data: {
      entryId: params.entryId,
      userId: params.userId,
      versionNumber: params.newVersionNumber,
      changeSummary: params.changeSummary ?? null,
      snapshot: params.snapshot as unknown as Prisma.InputJsonValue,
      previousSnapshot: params.previousSnapshot as unknown as Prisma.InputJsonValue,
    },
  })
}

/**
 * Fluxo transacional completo:
 *   - lê entrada atual
 *   - aplica patch
 *   - se `updateInPlace === false` (padrão): cria nova versão + increment
 *   - se `updateInPlace === true`: só atualiza a entrada, sem versão nova
 *
 * Retorna a entrada atualizada e o número da versão criada (ou null se
 * updateInPlace).
 */
export async function updateEntryWithVersion(
  prisma: PrismaClient,
  params: {
    entryId: string
    userId: string
    patch: {
      title?: string
      content?: string
      tags?: string[]
      category?: string | null
      entryType?: string
      generatedDoc?: unknown
      metadata?: unknown
      projectId?: string | null
    }
    updateInPlace?: boolean
    changeSummary?: string | null
  },
): Promise<{
  entry: NotebookEntry
  newVersionNumber: number | null
}> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.notebookEntry.findFirst({
      where: { id: params.entryId, userId: params.userId },
    })
    if (!existing) {
      throw new Error("Entrada não encontrada ou não pertence ao usuário")
    }

    const previousSnapshot = snapshotFromEntry(existing)

    const updateData: Prisma.NotebookEntryUpdateInput = {
      title: params.patch.title ?? undefined,
      content: params.patch.content ?? undefined,
      tags: params.patch.tags ?? undefined,
      category: params.patch.category ?? undefined,
      entryType: (params.patch.entryType as never) ?? undefined,
      generatedDoc: (params.patch.generatedDoc as never) ?? undefined,
      metadata: (params.patch.metadata as never) ?? undefined,
    }

    if (params.patch.projectId !== undefined) {
      updateData.project = params.patch.projectId
        ? { connect: { id: params.patch.projectId } }
        : { disconnect: true }
    }

    if (params.updateInPlace) {
      const updated = await tx.notebookEntry.update({
        where: { id: params.entryId },
        data: updateData,
      })
      return { entry: updated, newVersionNumber: null }
    }

    // Cria nova versão
    const newVersionNumber = existing.currentVersion + 1
    const updated = await tx.notebookEntry.update({
      where: { id: params.entryId },
      data: { ...updateData, currentVersion: newVersionNumber },
    })

    await createNewVersion(tx, {
      entryId: params.entryId,
      userId: params.userId,
      newVersionNumber,
      snapshot: snapshotFromEntry(updated),
      previousSnapshot,
      changeSummary: params.changeSummary,
    })

    return { entry: updated, newVersionNumber }
  })
}

/**
 * Restaura uma versão N — cria uma nova versão (currentVersion + 1)
 * com o snapshot da versão N. NUNCA apaga versões existentes.
 */
export async function restoreVersion(
  prisma: PrismaClient,
  params: {
    entryId: string
    userId: string
    targetVersionNumber: number
  },
): Promise<{
  entry: NotebookEntry
  newVersionNumber: number
  restoredFromVersion: number
}> {
  return prisma.$transaction(async (tx) => {
    const [entry, targetVersion] = await Promise.all([
      tx.notebookEntry.findFirst({
        where: { id: params.entryId, userId: params.userId },
      }),
      tx.notebookVersion.findUnique({
        where: {
          entryId_versionNumber: {
            entryId: params.entryId,
            versionNumber: params.targetVersionNumber,
          },
        },
      }),
    ])
    if (!entry) throw new Error("Entrada não encontrada")
    if (!targetVersion) throw new Error(`Versão ${params.targetVersionNumber} não encontrada`)

    const previousSnapshot = snapshotFromEntry(entry)
    const snapshotToRestore = targetVersion.snapshot as unknown as EntrySnapshot
    const newVersionNumber = entry.currentVersion + 1

    // Aplica o snapshot na entrada
    const updated = await tx.notebookEntry.update({
      where: { id: params.entryId },
      data: {
        title: snapshotToRestore.title,
        content: snapshotToRestore.content,
        entryType: snapshotToRestore.entryType as never,
        category: snapshotToRestore.category,
        tags: snapshotToRestore.tags,
        generatedDoc: snapshotToRestore.generatedDoc as never,
        metadata: snapshotToRestore.metadata as never,
        projectId: snapshotToRestore.projectId,
        currentVersion: newVersionNumber,
      },
    })

    await createNewVersion(tx, {
      entryId: params.entryId,
      userId: params.userId,
      newVersionNumber,
      snapshot: snapshotToRestore,
      previousSnapshot,
      changeSummary: `Restaurada versão ${params.targetVersionNumber}`,
    })

    return {
      entry: updated,
      newVersionNumber,
      restoredFromVersion: params.targetVersionNumber,
    }
  })
}

/**
 * Detecta se dois snapshots diferem em conteúdo significativo.
 * Usado para NÃO criar versão fantasma quando o PATCH não muda nada real.
 */
export function snapshotsAreEqual(a: EntrySnapshot, b: EntrySnapshot): boolean {
  return (
    a.title === b.title &&
    a.content === b.content &&
    a.entryType === b.entryType &&
    a.category === b.category &&
    a.projectId === b.projectId &&
    JSON.stringify(a.tags) === JSON.stringify(b.tags) &&
    JSON.stringify(a.generatedDoc) === JSON.stringify(b.generatedDoc) &&
    JSON.stringify(a.metadata) === JSON.stringify(b.metadata)
  )
}
