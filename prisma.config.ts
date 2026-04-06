import { defineConfig } from "prisma/config"
import { Pool, neonConfig } from "@neondatabase/serverless"
import { PrismaNeon } from "@prisma/adapter-neon"
import ws from "ws"

neonConfig.webSocketConstructor = ws

const connectionString = process.env.DATABASE_URL ?? ""

export default defineConfig({
  earlyAccess: true,
  schema: "./prisma/schema.prisma",
  datasource: {
    url: connectionString,
  },
  migrate: {
    adapter: () => {
      const pool = new Pool({ connectionString })
      return new PrismaNeon(pool)
    },
  },
})
