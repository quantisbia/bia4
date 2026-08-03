/**
 * BIA · Notebook · API de restauração de versão — R12.66
 *
 * POST /api/notebook/[id]/versions/restore
 * body: { targetVersion: number }
 *
 * NUNCA apaga o histórico — cria uma nova versão (N+1) com o snapshot
 * da versão-alvo. Isso preserva a rastreabilidade científica: um dia
 * o revisor pode olhar as versões 3, 4, 5 e ver que a 5 é "cópia da 3".
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"
import { restoreVersion } from "@/lib/notebook/versioning"

export const dynamic = "force-dynamic"

const restoreSchema = z.object({
  targetVersion: z.number().int().min(1),
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
  const parsed = restoreSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "targetVersion obrigatório (inteiro >= 1)", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const result = await restoreVersion(prisma, {
      entryId: params.id,
      userId: session.user.id,
      targetVersionNumber: parsed.data.targetVersion,
    })
    return NextResponse.json({
      success: true,
      entryId: result.entry.id,
      restoredFromVersion: result.restoredFromVersion,
      newVersionNumber: result.newVersionNumber,
      entry: {
        id: result.entry.id,
        title: result.entry.title,
        currentVersion: result.entry.currentVersion,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido"
    if (msg.includes("não encontrada")) {
      return NextResponse.json({ error: msg }, { status: 404 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
