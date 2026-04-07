import { defineConfig } from "prisma/config"
import { Pool, neonConfig } from "@neondatabase/serverless"
import { PrismaNeon } from "@prisma/adapter-neon"
import ws from "ws"
import * as dotenv from "dotenv"
import * as path from "path"

// Load .env.local first, then .env (for Prisma CLI usage)
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })
dotenv.config({ path: path.resolve(process.cwd(), ".env") })

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
