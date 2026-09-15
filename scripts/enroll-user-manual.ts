/**
 * BIA · Academy · Matrícula manual de aluno — utilitário admin
 *
 * MOTIVAÇÃO
 * ─────────
 * Enquanto o webhook automático do Asaas (R13.10.3) não está implementado,
 * a Janaina precisa matricular manualmente cada aluno que pagou.
 *
 * O que este script faz (idempotente):
 *   1. Confirma que o usuário existe pelo email
 *   2. Se o usuário não tem plano ACADEMY, atualiza para ACADEMY + ACTIVE
 *   3. Se o usuário não tem AcademyEnrollment, cria com:
 *        - enrolledAt = agora
 *        - accessUntil = agora + 12 meses (via helper R13.01)
 *        - source = "manual" (default) ou "asaas" via --source
 *        - asaasPaymentId = --paymentId (opcional)
 *   4. Se já existe, apenas mostra o estado — não sobrescreve
 *
 * COMO USAR
 * ─────────
 *   set -a; source .env.local; set +a
 *
 *   # Dry-run (preview, não altera nada):
 *   npx tsx scripts/enroll-user-manual.ts --email aluno@example.com --dry-run
 *
 *   # Matricular como manual (default):
 *   npx tsx scripts/enroll-user-manual.ts --email aluno@example.com
 *
 *   # Matricular vindo do Asaas com payment id:
 *   npx tsx scripts/enroll-user-manual.ts \
 *       --email aluno@example.com \
 *       --source asaas \
 *       --paymentId "pay_1234567890"
 *
 *   # Estender acesso: por padrão adiciona 12 meses. Para customizar:
 *   npx tsx scripts/enroll-user-manual.ts --email x@y.com --months 6
 *
 * NÃO FAZ
 * ───────
 * - Não envia email de boas-vindas (fica para R13.10.3 com webhook Asaas)
 * - Não cria usuário — se o email não existe, aborta com erro
 * - Não altera senha (use scripts/reset-user-password.ts para isso)
 */

import { prisma } from "../src/lib/db/prisma"
import { calculateAccessUntil, ACCESS_DURATION_MS } from "../src/lib/academy/enrollment"

interface Args {
  email: string | null
  source: "manual" | "asaas" | "corporate"
  paymentId: string | null
  months: number | null
  dryRun: boolean
}

function parseArgs(): Args {
  const args = process.argv.slice(2)
  const get = (flag: string) => {
    const i = args.indexOf(flag)
    return i >= 0 && i + 1 < args.length ? args[i + 1] : null
  }
  const has = (flag: string) => args.includes(flag)

  const rawSource = (get("--source") ?? "manual").toLowerCase()
  const source = (["manual", "asaas", "corporate"].includes(rawSource) ? rawSource : "manual") as
    "manual" | "asaas" | "corporate"

  return {
    email: get("--email"),
    source,
    paymentId: get("--paymentId"),
    months: get("--months") ? Number(get("--months")) : null,
    dryRun: has("--dry-run"),
  }
}

function computeAccessUntil(months: number | null, enrolledAt: Date): Date {
  if (!months) return calculateAccessUntil(enrolledAt)
  // months custom → converte pra ms
  const msPerMonth = ACCESS_DURATION_MS / 12 // usa a mesma base do helper R13.01
  return new Date(enrolledAt.getTime() + months * msPerMonth)
}

async function main() {
  const args = parseArgs()

  console.log("\n" + "═".repeat(64))
  console.log(" BIA · Academy · Matrícula manual de aluno")
  console.log("═".repeat(64))

  if (!args.email) {
    console.error("\n ❌ ERRO: --email é obrigatório")
    console.error("\n Uso: npx tsx scripts/enroll-user-manual.ts --email <email> [flags]")
    console.error(" Flags:")
    console.error("   --source <manual|asaas|corporate>   (default: manual)")
    console.error("   --paymentId <id>                    (só se --source asaas)")
    console.error("   --months <n>                        (default: 12)")
    console.error("   --dry-run                           (preview, não altera)")
    process.exit(1)
  }

  console.log(` Email:      ${args.email}`)
  console.log(` Source:     ${args.source}`)
  console.log(` PaymentId:  ${args.paymentId ?? "(nenhum)"}`)
  console.log(` Duração:    ${args.months ?? 12} meses`)
  console.log(` Modo:       ${args.dryRun ? "DRY-RUN (preview)" : "EXECUTAR"}`)
  console.log("─".repeat(64))

  // 1. Confirma que usuário existe
  const user = await prisma.user.findUnique({
    where: { email: args.email.toLowerCase().trim() },
    include: {
      subscription: true,
      academyEnrollment: true,
    },
  })

  if (!user) {
    console.error(`\n ❌ Usuário com email "${args.email}" NÃO existe.`)
    console.error(" Peça para o aluno criar conta primeiro em /auth/register.")
    await prisma.$disconnect()
    process.exit(1)
  }

  console.log(`\n ✓ Usuário encontrado:`)
  console.log(`   id:      ${user.id}`)
  console.log(`   nome:    ${user.name}`)
  console.log(`   role:    ${user.role}`)
  console.log(`   plan:    ${user.subscription?.plan ?? "(sem subscription)"}`)
  console.log(`   status:  ${user.subscription?.status ?? "-"}`)
  console.log(`   matrícula: ${user.academyEnrollment ? `SIM (source=${user.academyEnrollment.source}, até ${user.academyEnrollment.accessUntil.toISOString().slice(0, 10)})` : "❌ não existe"}`)

  // 2. Decide o que fazer
  const now = new Date()
  const accessUntil = computeAccessUntil(args.months, now)

  // 2.1 · Subscription
  const needsPlanUpdate = user.subscription?.plan !== "ACADEMY" || user.subscription?.status !== "ACTIVE"

  // 2.2 · Enrollment
  const needsEnrollment = !user.academyEnrollment

  console.log("\n" + "─".repeat(64))
  console.log(" Ações a tomar:")
  console.log(`   ${needsPlanUpdate ? "↻" : "="} Subscription: ${needsPlanUpdate ? `atualizar para plan=ACADEMY, status=ACTIVE` : "já é ACADEMY+ACTIVE"}`)
  console.log(`   ${needsEnrollment ? "+" : "="} AcademyEnrollment: ${needsEnrollment ? `criar (accessUntil=${accessUntil.toISOString().slice(0, 10)}, source=${args.source})` : "já existe (preservado)"}`)

  if (args.dryRun) {
    console.log("\n ⊘ DRY-RUN: nenhuma alteração feita.")
    console.log("═".repeat(64) + "\n")
    await prisma.$disconnect()
    return
  }

  // 3. Executa
  console.log("\n" + "─".repeat(64))
  console.log(" Executando...")

  if (needsPlanUpdate) {
    if (user.subscription) {
      await prisma.subscription.update({
        where: { userId: user.id },
        data: { plan: "ACADEMY", status: "ACTIVE" },
      })
    } else {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          plan: "ACADEMY",
          status: "ACTIVE",
        },
      })
    }
    console.log("   ✓ Subscription: plan=ACADEMY, status=ACTIVE")
  }

  if (needsEnrollment) {
    const enrollment = await prisma.academyEnrollment.create({
      data: {
        userId: user.id,
        enrolledAt: now,
        accessUntil,
        source: args.source,
        asaasPaymentId: args.paymentId ?? null,
      },
    })
    console.log(`   ✓ AcademyEnrollment criado (id=${enrollment.id})`)
    console.log(`     accessUntil=${accessUntil.toISOString()}`)
    console.log(`     source=${args.source}`)
  } else {
    console.log("   = AcademyEnrollment já existia (preservado, não sobrescrito)")
  }

  // Audit log fire-and-forget (Janaina consegue rastrear no /dashboard/admin)
  try {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "academy_manual_enrollment",
        entity: "academy_enrollment",
        metadata: {
          source: args.source,
          paymentId: args.paymentId,
          months: args.months ?? 12,
          triggeredBy: "scripts/enroll-user-manual.ts",
        },
      },
    })
    console.log("   ✓ Audit log registrado")
  } catch (e) {
    console.log(`   ⚠ Audit log falhou (não crítico): ${(e as Error).message}`)
  }

  console.log("\n" + "═".repeat(64))
  console.log(` 🎓 ${user.name} matriculado(a) na BIA Academy!`)
  console.log(`    Acesso até: ${accessUntil.toISOString().slice(0, 10)}`)
  console.log(`    Login em:   /auth/login`)
  console.log("═".repeat(64) + "\n")

  await prisma.$disconnect()
}

main().catch(err => {
  console.error("\n Fatal:", err instanceof Error ? err.message : err)
  process.exit(1)
})
