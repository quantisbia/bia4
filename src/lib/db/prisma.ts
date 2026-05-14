/**
 * Prisma Client — BIA v4
 * Usa PrismaNeon adapter para conexão HTTP com Neon PostgreSQL
 * Funciona em Node.js (local/Vercel) e Edge runtime.
 *
 * IMPORTANTE: usa Proxy para inicialização TRULY lazy.
 * O cliente só é criado quando alguém acessa uma propriedade
 * (ex.: prisma.user.findMany), nunca apenas pelo import.
 * Isso é essencial para que o build da Vercel não tente
 * conectar no DB durante a fase de "page data collection".
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

// Singleton para hot-reload em dev (evita "too many connections")
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

/**
 * Retorna a instância singleton, criando-a sob demanda.
 * Em dev mantém em globalThis.__prisma; em prod cria uma vez por
 * processo e mantém em variável local do módulo.
 */
let _prismaInstance: PrismaClient | undefined

function getPrismaClient(): PrismaClient {
  if (globalThis.__prisma) return globalThis.__prisma
  if (_prismaInstance) return _prismaInstance

  const client = createPrismaClient()
  _prismaInstance = client
  if (process.env.NODE_ENV !== "production") {
    globalThis.__prisma = client
  }
  return client
}

/**
 * Proxy verdadeiramente lazy: nenhum trabalho é feito no momento do
 * import. O cliente real só é criado quando alguma propriedade é
 * acessada (ex.: prisma.user.findMany).
 *
 * Isso evita falha durante o build da Vercel "Collecting page data",
 * onde DATABASE_URL pode não estar disponível ainda.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value: any = Reflect.get(client as any, prop, receiver)
    // Binda métodos para preservar o `this` do PrismaClient
    return typeof value === "function" ? value.bind(client) : value
  },
  has(_target, prop) {
    return prop in getPrismaClient()
  },
  ownKeys() {
    return Reflect.ownKeys(getPrismaClient())
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(getPrismaClient(), prop)
  },
})

export default prisma
