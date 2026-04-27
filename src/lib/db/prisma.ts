/**
 * Prisma Client — BIA v4
 * Usa PrismaNeon adapter para conexão HTTP com Neon PostgreSQL
 * Funciona em Node.js (local/Vercel) e Edge runtime
 */

import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { neonConfig } from "@neondatabase/serverless"

// Node.js precisa de ws como WebSocket (Edge já tem nativo)
if (typeof WebSocket === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  neonConfig.webSocketConstructor = require("ws")
}

function createPrismaClient() {
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

// Singleton para hot-reload em dev (evita "too many connections")
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

export const prisma: PrismaClient =
  globalThis.__prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma
}

export default prisma
