/**
 * BIA — Reset de senha do admin
 * Uso: npx tsx scripts/reset-admin-password.ts <email> <nova-senha>
 */
import * as dotenv from "dotenv"
import * as path from "path"
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

import { prisma } from "../src/lib/db/prisma"
import bcrypt from "bcryptjs"

async function main() {
  const email = process.argv[2]
  const newPassword = process.argv[3]

  if (!email || !newPassword) {
    console.error("❌ Uso: npx tsx scripts/reset-admin-password.ts <email> <nova-senha>")
    process.exit(1)
  }

  if (newPassword.length < 8) {
    console.error("❌ Senha deve ter pelo menos 8 caracteres")
    process.exit(1)
  }

  console.log(`\n🔍 Procurando usuário: ${email}`)
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, name: true, role: true, password: true, createdAt: true },
  })

  if (!user) {
    console.error(`\n❌ Usuário "${email}" NÃO ENCONTRADO no banco.`)
    console.log("\nUsuários existentes:")
    const all = await prisma.user.findMany({
      select: { email: true, role: true, name: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    })
    all.forEach((u) => console.log(`  - ${u.email}  [${u.role}]  ${u.name ?? ""}`))
    process.exit(1)
  }

  console.log(`\n✅ Usuário encontrado:`)
  console.log(`   ID:        ${user.id}`)
  console.log(`   Email:     ${user.email}`)
  console.log(`   Nome:      ${user.name ?? "(sem nome)"}`)
  console.log(`   Role:      ${user.role}`)
  console.log(`   Tem senha: ${user.password ? "SIM (hash bcrypt)" : "NÃO (login só via OAuth)"}`)
  console.log(`   Criado:    ${user.createdAt.toISOString()}`)

  const hash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hash },
  })

  console.log(`\n✅ SENHA REDEFINIDA COM SUCESSO!`)
  console.log(`\n📝 Use estas credenciais para login:`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Senha: ${newPassword}`)
  console.log(`\n⚠️ Faça login agora e MUDE a senha pelo painel se quiser.`)
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
