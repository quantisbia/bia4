/**
 * BIA · Auth · Reset de senha de usuário (utilitário admin)
 *
 * MOTIVAÇÃO
 * ─────────
 * Recuperação de senha via email em produção depende de SMTP configurado.
 * Este script é o backdoor admin para resetar senha de qualquer usuário
 * (útil quando a Janaina esquece a senha OU quando um aluno perde acesso
 * e precisa de recuperação manual antes do fluxo de email estar 100%).
 *
 * ATENÇÃO
 * ───────
 * - Requer acesso ao banco (DATABASE_URL em .env.local)
 * - A nova senha deve ser trocada pelo usuário no primeiro login
 *   via /dashboard/settings (não há forçar-troca-no-login ainda — R13.11)
 * - Registra em AuditLog para rastreabilidade
 *
 * COMO USAR
 * ─────────
 *   set -a; source .env.local; set +a
 *
 *   npx tsx scripts/reset-user-password.ts \
 *       --email janaina.dernowsek@quantis.bio \
 *       --password "NovaSenh@2026"
 *
 *   # Dry-run (mostra o que faria, mas não altera):
 *   npx tsx scripts/reset-user-password.ts --email x@y.com --password abc --dry-run
 */

import bcrypt from "bcryptjs"
import { prisma } from "../src/lib/db/prisma"

interface Args {
  email: string | null
  password: string | null
  dryRun: boolean
}

function parseArgs(): Args {
  const args = process.argv.slice(2)
  const get = (flag: string) => {
    const i = args.indexOf(flag)
    return i >= 0 && i + 1 < args.length ? args[i + 1] : null
  }
  return {
    email: get("--email"),
    password: get("--password"),
    dryRun: args.includes("--dry-run"),
  }
}

async function main() {
  const args = parseArgs()

  console.log("\n" + "═".repeat(64))
  console.log(" BIA · Auth · Reset de senha (admin)")
  console.log("═".repeat(64))

  if (!args.email || !args.password) {
    console.error("\n ❌ ERRO: --email e --password são obrigatórios")
    console.error("\n Uso:")
    console.error("   npx tsx scripts/reset-user-password.ts \\")
    console.error("       --email <email> --password <nova_senha> [--dry-run]")
    process.exit(1)
  }

  // Validação básica de senha (mesma do register)
  if (args.password.length < 6) {
    console.error(`\n ❌ Senha muito curta (${args.password.length} chars). Mínimo: 6.`)
    process.exit(1)
  }

  const email = args.email.toLowerCase().trim()
  console.log(` Email:  ${email}`)
  console.log(` Senha:  ${"*".repeat(args.password.length)} (${args.password.length} chars)`)
  console.log(` Modo:   ${args.dryRun ? "DRY-RUN (preview)" : "EXECUTAR"}`)
  console.log("─".repeat(64))

  // Confirma existência
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true },
  })

  if (!user) {
    console.error(`\n ❌ Usuário "${email}" NÃO existe.`)
    await prisma.$disconnect()
    process.exit(1)
  }

  console.log(`\n ✓ Usuário encontrado: ${user.name} (id=${user.id}, role=${user.role})`)

  if (args.dryRun) {
    console.log("\n ⊘ DRY-RUN: senha NÃO alterada.")
    console.log("═".repeat(64) + "\n")
    await prisma.$disconnect()
    return
  }

  // Hash bcrypt (mesmo algoritmo do /auth/register)
  const passwordHash = await bcrypt.hash(args.password, 10)

  await prisma.user.update({
    where: { id: user.id },
    data: { password: passwordHash },
  })

  console.log("\n ✓ Senha atualizada no banco (bcrypt hash, 10 rounds)")

  // Audit log
  try {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "password_reset_admin",
        entity: "user",
        metadata: {
          triggeredBy: "scripts/reset-user-password.ts",
          passwordLength: args.password.length,
        },
      },
    })
    console.log(" ✓ Audit log registrado")
  } catch (e) {
    console.log(` ⚠ Audit log falhou (não crítico): ${(e as Error).message}`)
  }

  console.log("\n" + "═".repeat(64))
  console.log(` 🔐 Senha resetada para ${user.name}!`)
  console.log(`    Login em:  /auth/login`)
  console.log(`    Email:     ${email}`)
  console.log(`    Senha:     ${args.password}`)
  console.log(`    ⚠ Troque em /dashboard/settings após primeiro login`)
  console.log("═".repeat(64) + "\n")

  await prisma.$disconnect()
}

main().catch(err => {
  console.error("\n Fatal:", err instanceof Error ? err.message : err)
  process.exit(1)
})
