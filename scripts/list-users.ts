/**
 * BIA — Lista usuários cadastrados
 * Uso: npx tsx scripts/list-users.ts
 */
import * as dotenv from "dotenv"
import * as path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

import { prisma } from "../src/lib/db/prisma"

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      password: true,
      institution: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  console.log(`\n📊 Total de usuários: ${users.length}\n`)
  console.log("┌─────┬──────────────────────────────────────────────┬──────────┬──────┬─────────────────────┐")
  console.log("│ #   │ Email                                        │ Senha?   │ Role │ Criado              │")
  console.log("├─────┼──────────────────────────────────────────────┼──────────┼──────┼─────────────────────┤")
  users.forEach((u, i) => {
    const idx = String(i + 1).padEnd(3)
    const email = (u.email ?? "").padEnd(44).slice(0, 44)
    const hasPwd = (u.password ? "SIM" : "NÃO (OAuth)").padEnd(8)
    const role = (u.role ?? "").padEnd(4)
    const created = u.createdAt.toISOString().slice(0, 19).replace("T", " ")
    console.log(`│ ${idx} │ ${email} │ ${hasPwd} │ ${role} │ ${created} │`)
  })
  console.log("└─────┴──────────────────────────────────────────────┴──────────┴──────┴─────────────────────┘")
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
