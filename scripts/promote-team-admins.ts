/**
 * BIA · R13.11.2 · Promover time interno Quantis a ADMIN + criar enrollment
 *
 * Aplica no banco Neon (produção) o que já foi codificado em
 * src/lib/auth/admin-shared.ts:
 *
 *   1. role: USER → ADMIN (dá acesso ao painel admin)
 *   2. Subscription.plan=ACADEMY, status=ACTIVE (mantém acesso à plataforma)
 *   3. AcademyEnrollment: cria manual com accessUntil = hoje + 365 dias
 *      (só cria se não existir — idempotente)
 *
 * Roda em modo idempotente: se já for admin ou já tiver enrollment, apenas
 * mostra o estado sem sobrescrever. É seguro rodar N vezes.
 *
 * USO:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/promote-team-admins.ts           # execução real
 *   npx tsx scripts/promote-team-admins.ts --dry-run # preview
 */
import { prisma } from "../src/lib/db/prisma"
import { calculateAccessUntil } from "../src/lib/academy/enrollment"

const TEAM_EMAILS = [
  "vitor.mattos@quantis.bio",
  "lucas.guarnier@quantis.bio",
  "kamila.leichtweis@quantis.bio",
  "thais.amaral@quantis.bio",
]

const DRY_RUN = process.argv.includes("--dry-run")

async function processUser(email: string): Promise<{ ok: boolean; changes: string[]; error?: string }> {
  const changes: string[] = []

  const user = await prisma.user.findUnique({
    where: { email },
    include: { subscription: true, academyEnrollment: true },
  })

  if (!user) {
    return { ok: false, changes: [], error: `usuário não encontrado: ${email}` }
  }

  // 1. role → ADMIN
  if (user.role !== "ADMIN") {
    changes.push(`role: ${user.role} → ADMIN`)
    if (!DRY_RUN) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "ADMIN" },
      })
    }
  } else {
    changes.push("role: já é ADMIN (sem mudança)")
  }

  // 2. Subscription: garantir plan=ACADEMY, status=ACTIVE
  if (!user.subscription) {
    changes.push("subscription: criar plan=ACADEMY, status=ACTIVE")
    if (!DRY_RUN) {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          plan: "ACADEMY",
          status: "ACTIVE",
        },
      })
    }
  } else if (user.subscription.plan !== "ACADEMY" || user.subscription.status !== "ACTIVE") {
    changes.push(
      `subscription: plan=${user.subscription.plan}/status=${user.subscription.status} → plan=ACADEMY/status=ACTIVE`,
    )
    if (!DRY_RUN) {
      await prisma.subscription.update({
        where: { userId: user.id },
        data: { plan: "ACADEMY", status: "ACTIVE" },
      })
    }
  } else {
    changes.push("subscription: já é ACADEMY/ACTIVE (sem mudança)")
  }

  // 3. AcademyEnrollment: criar se não existir (idempotente)
  if (!user.academyEnrollment) {
    const enrolledAt = new Date()
    const accessUntil = calculateAccessUntil(enrolledAt)
    changes.push(
      `academyEnrollment: criar (source=manual, accessUntil=${accessUntil.toISOString().slice(0, 10)})`,
    )
    if (!DRY_RUN) {
      await prisma.academyEnrollment.create({
        data: {
          userId: user.id,
          source: "manual",
          enrolledAt,
          accessUntil,
        },
      })
    }
  } else {
    const now = new Date()
    const stillActive = user.academyEnrollment.accessUntil > now
    changes.push(
      `academyEnrollment: já existe (source=${user.academyEnrollment.source}, ` +
        `accessUntil=${user.academyEnrollment.accessUntil.toISOString().slice(0, 10)}, ` +
        `ativa=${stillActive})`,
    )

    // Se acesso expirou, estender por mais 12 meses
    if (!stillActive) {
      const newAccessUntil = calculateAccessUntil(new Date())
      changes.push(`  → renovar accessUntil → ${newAccessUntil.toISOString().slice(0, 10)}`)
      if (!DRY_RUN) {
        await prisma.academyEnrollment.update({
          where: { userId: user.id },
          data: { accessUntil: newAccessUntil },
        })
      }
    }
  }

  return { ok: true, changes }
}

async function main() {
  console.log(
    `\n${DRY_RUN ? "🧪 DRY-RUN" : "🚀 EXECUÇÃO"} · Promover time interno Quantis a ADMIN + criar enrollment\n`,
  )

  let ok = 0
  let fail = 0

  for (const email of TEAM_EMAILS) {
    console.log(`── ${email}`)
    try {
      const result = await processUser(email)
      if (!result.ok) {
        console.log(`   ❌ ${result.error}`)
        fail++
      } else {
        for (const change of result.changes) {
          console.log(`   • ${change}`)
        }
        ok++
      }
    } catch (e) {
      console.log(`   ❌ erro: ${(e as Error).message}`)
      fail++
    }
    console.log()
  }

  console.log("─".repeat(60))
  if (DRY_RUN) {
    console.log(`🧪 DRY-RUN concluído. ${ok} OK, ${fail} erros.`)
    console.log("   Rode sem --dry-run para aplicar.")
  } else {
    console.log(`✅ Aplicado: ${ok} usuário(s) OK, ${fail} erro(s).`)
  }
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error("❌ ERRO:", e)
  await prisma.$disconnect()
  process.exit(1)
})
