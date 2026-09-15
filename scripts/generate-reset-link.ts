/**
 * BIA · Auth · Gerar link mágico de reset de senha
 *
 * MOTIVAÇÃO
 * ─────────
 * Enquanto SMTP não está 100% configurado (ou quando a Janaina precisa de
 * acesso emergencial), este script gera o mesmo token que /api/auth/forgot-password
 * geraria e imprime o link direto no terminal.
 *
 * Você abre esse link no navegador (celular ou desktop), define uma senha
 * nova e loga imediatamente. TTL de 30 min (constante TOKEN_TTL_MIN).
 *
 * COMO USAR
 * ─────────
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/generate-reset-link.ts --email janaina.dernowsek@quantis.bio
 *
 *   # Passar --base-url custom (default: https://biaquantis.bio)
 *   npx tsx scripts/generate-reset-link.ts \
 *       --email x@y.com \
 *       --base-url http://localhost:3000
 */

import { prisma } from "../src/lib/db/prisma"
import { generateResetToken, tokenExpiry, TOKEN_TTL_MIN } from "../src/lib/auth/password-reset-token"

interface Args {
  email: string | null
  baseUrl: string
}

function parseArgs(): Args {
  const args = process.argv.slice(2)
  const get = (flag: string) => {
    const i = args.indexOf(flag)
    return i >= 0 && i + 1 < args.length ? args[i + 1] : null
  }
  return {
    email: get("--email"),
    baseUrl: (get("--base-url") ?? "https://biaquantis.bio").replace(/\/+$/, ""),
  }
}

async function main() {
  const args = parseArgs()

  console.log("\n" + "═".repeat(64))
  console.log(" BIA · Auth · Gerar link de reset de senha")
  console.log("═".repeat(64))

  if (!args.email) {
    console.error("\n ❌ ERRO: --email é obrigatório")
    console.error(" Uso: npx tsx scripts/generate-reset-link.ts --email <email>")
    process.exit(1)
  }

  const email = args.email.toLowerCase().trim()

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  })

  if (!user) {
    console.error(`\n ❌ Usuário "${email}" NÃO existe no banco.`)
    await prisma.$disconnect()
    process.exit(1)
  }

  console.log(` ✓ Usuário: ${user.name} (${user.email})`)

  // Invalida tokens anteriores não usados
  const invalidated = await prisma.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      usedAt: null,
      expires: { gt: new Date() },
    },
    data: { usedAt: new Date() },
  })

  if (invalidated.count > 0) {
    console.log(` ↻ Invalidou ${invalidated.count} token(s) anteriores`)
  }

  // Gera novo token
  const { plainToken, tokenHash } = await generateResetToken()
  const expires = tokenExpiry()

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      email: user.email,
      tokenHash,
      expires,
      ip: "127.0.0.1",
      userAgent: "scripts/generate-reset-link.ts",
    },
  })

  const link = `${args.baseUrl}/auth/reset-password?token=${plainToken}`

  console.log("\n" + "─".repeat(64))
  console.log(` 🔗 LINK DE RESET GERADO (válido por ${TOKEN_TTL_MIN} minutos):\n`)
  console.log(`    ${link}\n`)
  console.log(` Expira em: ${expires.toISOString()}`)
  console.log(" O que fazer:")
  console.log("   1. Abre o link no navegador (celular ou desktop)")
  console.log("   2. Define uma senha nova (min 6 chars)")
  console.log("   3. Faz login com email + senha nova")
  console.log("═".repeat(64) + "\n")

  await prisma.$disconnect()
}

main().catch(err => {
  console.error("\n Fatal:", err instanceof Error ? err.message : err)
  process.exit(1)
})
