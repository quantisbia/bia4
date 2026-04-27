/**
 * Prisma Client — BIA v4
 * Usa PrismaNeon adapter para conexão HTTP com Neon PostgreSQL
 * Funciona em Node.js (local/Vercel) e Edge runtime
 *
 * IMPORTANTE: Cliente é LAZY — só conecta quando uma rota efetivamente
 * usa o `prisma`. Isso evita que o build do Next.js no Vercel falhe
 * por falta de DATABASE_URL durante a fase de coleta de rotas.
 */

import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { neonConfig } from "@neondatabase/serverless"

// Node.js precisa de ws como WebSocket (Edge já tem nativo)
if (typeof WebSocket === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  neonConfig.webSocketConstructor = require("ws")
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error(
      "[BIA] DATABASE_URL não configurada.\n" +
      "Adicione em .env.local: DATABASE_URL=\"postgresql://...\"\n" +
      "Obtenha em: https://neon.tech"
    )
  }

  const adapter = new PrismaNeon({ connectionString })

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  })
}

// Singleton lazy: só inicializa quando alguém efetivamente acessa `prisma.xxx`
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

function getPrismaClient(): PrismaClient {
  if (!globalThis.__prisma) {
    globalThis.__prisma = createPrismaClient()
  }
  return globalThis.__prisma
}

// Proxy: aparenta ser PrismaClient, mas só instancia ao primeiro acesso real
// Isso é seguro durante o build do Next.js (rotas não são executadas em build)
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient()
    const value = (client as unknown as Record<string | symbol, unknown>)[prop as string | symbol]
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client)
    }
    return value
  },
})

export default prisma
