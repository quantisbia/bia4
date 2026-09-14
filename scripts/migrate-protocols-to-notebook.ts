/**
 * BIA · Script de migração Protocol → NotebookEntry — R12.68
 *
 * MOTIVAÇÃO
 * ─────────
 * No R12.68 o Formulator Pro passou a salvar formulações no Notebook R12.66
 * (com versionamento V1/V2/V3, imagens, histórico), em vez do model
 * `Protocol` legado (R12.28). Este script migra as formulações antigas
 * para o novo modelo — de forma NÃO-DESTRUTIVA (Protocol continua intacto
 * na base para retrocompatibilidade da rota /dashboard/protocols).
 *
 * COMO EXECUTAR
 * ─────────────
 *   # Preview (dry-run — nada é gravado):
 *   npx tsx scripts/migrate-protocols-to-notebook.ts --dry-run
 *
 *   # Executar de verdade:
 *   npx tsx scripts/migrate-protocols-to-notebook.ts
 *
 *   # Migrar apenas um usuário:
 *   npx tsx scripts/migrate-protocols-to-notebook.ts --user-id=<cuid>
 *
 *   # Migrar apenas 1 protocolo específico:
 *   npx tsx scripts/migrate-protocols-to-notebook.ts --protocol-id=<cuid>
 *
 * COMPORTAMENTO
 * ─────────────
 *  - Cada `Protocol` vira 1 `NotebookEntry` novo (nunca sobrescreve).
 *  - Protocol.id é preservado em NotebookEntry.metadata.__migratedFromProtocolId.
 *  - Cria V1 automaticamente via createInitialVersion (helper R12.66).
 *  - Idempotência: antes de criar, procura se já existe NotebookEntry com
 *    o mesmo __migratedFromProtocolId — se sim, PULA (não duplica).
 *  - Protocol NÃO é apagado. Se a Janaina quiser limpar depois de
 *    validar tudo, cria-se outro script explícito de cleanup.
 *
 * SAÍDA
 * ─────
 *  - JSON no stdout com { total, migrated, skipped, failed[] }
 *  - Sem prints coloridos (fácil de piparinar / gravar em log)
 */

import { PrismaClient, type Prisma } from "@prisma/client"
import { createInitialVersion } from "../src/lib/notebook/versioning"

interface Args {
  dryRun: boolean
  userId?: string
  protocolId?: string
}

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false }
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") args.dryRun = true
    else if (a.startsWith("--user-id=")) args.userId = a.slice("--user-id=".length)
    else if (a.startsWith("--protocol-id=")) args.protocolId = a.slice("--protocol-id=".length)
  }
  return args
}

/**
 * Converte um Protocol em texto markdown-ish para NotebookEntry.content.
 * Preserva:
 *  - description
 *  - steps (Json)
 *  - materials (Json)
 *  - equipment
 *  - safetyNotes
 */
function protocolToMarkdown(p: {
  title: string
  category: string
  description: string | null
  content: string | null
  steps: unknown
  materials: unknown
  equipment: string[]
  safetyNotes: string[]
  duration: string | null
  difficulty: string | null
}): string {
  const lines: string[] = []

  // Metadata inicial
  const meta: string[] = []
  if (p.category) meta.push(`**Categoria:** ${p.category}`)
  if (p.difficulty) meta.push(`**Dificuldade:** ${p.difficulty}`)
  if (p.duration) meta.push(`**Duração:** ${p.duration}`)
  if (meta.length > 0) {
    lines.push(meta.join(" · "))
    lines.push("")
  }

  if (p.description) {
    lines.push(`## Descrição`)
    lines.push(p.description)
    lines.push("")
  }

  // Materials
  if (p.materials) {
    lines.push(`## Materiais`)
    if (Array.isArray(p.materials)) {
      for (const m of p.materials) {
        if (typeof m === "string") lines.push(`- ${m}`)
        else if (m && typeof m === "object") {
          const obj = m as Record<string, unknown>
          const parts = Object.entries(obj)
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join(", ")
          lines.push(`- ${parts}`)
        }
      }
    } else {
      lines.push("```json")
      lines.push(JSON.stringify(p.materials, null, 2))
      lines.push("```")
    }
    lines.push("")
  }

  if (p.equipment && p.equipment.length > 0) {
    lines.push(`## Equipamentos`)
    for (const e of p.equipment) lines.push(`- ${e}`)
    lines.push("")
  }

  // Steps
  if (p.steps) {
    lines.push(`## Procedimento`)
    if (Array.isArray(p.steps)) {
      p.steps.forEach((s, i) => {
        if (typeof s === "string") {
          lines.push(`${i + 1}. ${s}`)
        } else if (s && typeof s === "object") {
          const obj = s as Record<string, unknown>
          const title = obj.title ?? obj.name ?? `Passo ${i + 1}`
          const desc = obj.description ?? obj.detail ?? ""
          lines.push(`${i + 1}. **${title}** — ${desc}`)
        }
      })
    } else {
      lines.push("```json")
      lines.push(JSON.stringify(p.steps, null, 2))
      lines.push("```")
    }
    lines.push("")
  }

  if (p.safetyNotes && p.safetyNotes.length > 0) {
    lines.push(`## Segurança`)
    for (const n of p.safetyNotes) lines.push(`> ⚠ ${n}`)
    lines.push("")
  }

  // Content bruto (raro — mas se existir, anexa)
  if (p.content) {
    lines.push(`## Notas adicionais`)
    lines.push(p.content)
  }

  return lines.join("\n").trim() || p.title
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv)
  const prisma = new PrismaClient()

  const summary: {
    total: number
    migrated: number
    skipped: number
    failed: Array<{ protocolId: string; error: string }>
    dryRun: boolean
  } = {
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: [],
    dryRun: args.dryRun,
  }

  try {
    // Filtro do query
    const where: Prisma.ProtocolWhereInput = {}
    if (args.userId) where.userId = args.userId
    if (args.protocolId) where.id = args.protocolId

    const protocols = await prisma.protocol.findMany({
      where,
      orderBy: { createdAt: "asc" },
    })
    summary.total = protocols.length

    for (const p of protocols) {
      try {
        // Idempotência: se já foi migrado, pula
        const existing = await prisma.notebookEntry.findFirst({
          where: {
            userId: p.userId,
            metadata: {
              path: ["__migratedFromProtocolId"],
              equals: p.id,
            } as Prisma.JsonFilter,
          },
          select: { id: true },
        })
        if (existing) {
          summary.skipped++
          continue
        }

        if (args.dryRun) {
          summary.migrated++
          continue
        }

        // Detecta entryType a partir da categoria/aiGenerated
        const entryType =
          p.category?.toLowerCase() === "synthesis"
            ? "FORMULATION"
            : "PROTOCOL"

        const contentMd = protocolToMarkdown({
          title: p.title,
          category: p.category,
          description: p.description,
          content: p.content,
          steps: p.steps,
          materials: p.materials,
          equipment: p.equipment,
          safetyNotes: p.safetyNotes,
          duration: p.duration,
          difficulty: p.difficulty,
        })

        // Transação: cria entry + versão V1
        await prisma.$transaction(async (tx) => {
          const entry = await tx.notebookEntry.create({
            data: {
              userId: p.userId,
              title: p.title,
              content: contentMd,
              entryType: entryType as never,
              category: p.category,
              tags: ["migrado", "protocol-legacy", ...(entryType === "FORMULATION" ? ["formulacao"] : [])],
              sourceType: "protocol-migration",
              sourceId: p.id,
              isPinned: false,
              currentVersion: 1,
              metadata: {
                __migratedFromProtocolId: p.id,
                __migratedAt: new Date().toISOString(),
                protocolMeta: {
                  duration: p.duration,
                  difficulty: p.difficulty,
                  aiGenerated: p.aiGenerated,
                  validated: p.validated,
                  creditsUsed: p.creditsUsed,
                },
                sourceInputs: p.sourceInputs ?? null,
              } as Prisma.InputJsonValue,
            },
          })
          await createInitialVersion(tx, entry)
        })

        summary.migrated++
      } catch (err) {
        summary.failed.push({
          protocolId: p.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    // Saída JSON
    console.log(JSON.stringify(summary, null, 2))
    process.exit(summary.failed.length === 0 ? 0 : 1)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(2)
})
