/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · Password Reset Table Bootstrap (R12.31)
 *  ─────────────────────────────────────────────────────────────────────
 *  Garante que a tabela `password_reset_tokens` existe ANTES de qualquer
 *  operação. Resolve o cenário em que a migration não foi aplicada em
 *  produção — o usuário ficava sem reset porque o INSERT dava erro 500.
 *
 *  Estratégia:
 *    · Executa CREATE TABLE IF NOT EXISTS via $executeRawUnsafe
 *    · É idempotente — pode rodar a cada request sem custo material
 *    · Cache em memória: só roda uma vez por processo (ensuredOnce)
 *    · Se falhar, retorna false mas NÃO lança (caller decide)
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import { prisma } from "@/lib/db/prisma"

let ensuredOnce = false
let ensuringPromise: Promise<boolean> | null = null

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);
`

const CREATE_INDEXES_SQL = [
  `CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");`,
  `CREATE INDEX IF NOT EXISTS "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");`,
  `CREATE INDEX IF NOT EXISTS "password_reset_tokens_email_idx" ON "password_reset_tokens"("email");`,
  `CREATE INDEX IF NOT EXISTS "password_reset_tokens_expires_idx" ON "password_reset_tokens"("expires");`,
]

/**
 * Garante que a tabela password_reset_tokens existe. Idempotente.
 * Retorna true se ok (tabela disponível), false se falhou.
 */
export async function ensurePasswordResetTable(): Promise<boolean> {
  if (ensuredOnce) return true
  // Se já há uma chamada concorrente em voo, espera ela
  if (ensuringPromise) return ensuringPromise

  ensuringPromise = (async () => {
    try {
      await prisma.$executeRawUnsafe(CREATE_TABLE_SQL)
      for (const idx of CREATE_INDEXES_SQL) {
        try {
          await prisma.$executeRawUnsafe(idx)
        } catch (e) {
          // Índices podem falhar por race (outro request criando) — ignorar
          console.warn(
            "[password-reset-bootstrap] index create warning:",
            e instanceof Error ? e.message : String(e),
          )
        }
      }
      ensuredOnce = true
      console.log("[password-reset-bootstrap] tabela password_reset_tokens pronta")
      return true
    } catch (e) {
      console.error(
        "[password-reset-bootstrap] FALHA ao garantir tabela:",
        e instanceof Error ? e.message : String(e),
      )
      return false
    } finally {
      ensuringPromise = null
    }
  })()

  return ensuringPromise
}
