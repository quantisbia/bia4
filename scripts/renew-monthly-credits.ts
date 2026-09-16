/**
 * BIA · R13.11 · Renovação MENSAL de créditos para assinantes GUIDE
 *
 * MOTIVAÇÃO
 * ─────────
 * O plano "Guia Inteligente em Biofabricação 3D" (R$ 507/mês) é vendido no
 * modelo de ASSINATURA RECORRENTE via Asaas. Como decidido com a Janaina
 * em R13.11, os créditos:
 *   - São RENOVADOS todo mês (RESET para 1.500, NÃO acumula)
 *   - Se o usuário não usar os 1.500 do mês, ELES ZERAM e viram 1.500 no novo ciclo
 *   - Se cancelar a assinatura, os créditos restantes VALEM até o fim do ciclo pago
 *     (política 2a) — o job simplesmente para de renovar quando a Subscription
 *     estiver com status != ACTIVE.
 *
 * COMO USAR (execução MANUAL — não há cron agendado)
 * ──────────────────────────────────────────────────
 * A Janaina roda no início de cada mês:
 *
 *   set -a; source .env.local; set +a
 *
 *   # Dry-run (mostra quem seria renovado, sem mexer no banco):
 *   npx tsx scripts/renew-monthly-credits.ts --dry-run
 *
 *   # Execução real (RESETA créditos de todos GUIDE ativos p/ 1500):
 *   npx tsx scripts/renew-monthly-credits.ts
 *
 *   # Renovar apenas 1 usuário específico:
 *   npx tsx scripts/renew-monthly-credits.ts --email joao@empresa.com
 *
 * DE ONDE VIRÁ O AUTOMATISMO
 * ──────────────────────────
 * O Asaas envia webhook `PAYMENT_RECEIVED` toda vez que uma cobrança é paga.
 * Quando essa integração for implementada (R13.12), o webhook irá:
 *   1. Localizar o usuário pela reference do Asaas
 *   2. Chamar `renewUserCredits(userId, 1500)` — mesma função abaixo
 *   3. Registrar 1 linha de CreditTransaction com type=RENEWAL
 *
 * Enquanto isso, este script é o "cron humano" da Janaina.
 *
 * NÃO FAZ
 * ───────
 * - Não cobra ninguém (isso é papel do Asaas)
 * - Não cancela assinatura de quem parou de pagar (só não renova mais)
 * - Não mexe em outros planos (ADVANCED/ENTERPRISE/ACADEMY etc.)
 * - Não acumula créditos — RESETA sempre para 1.500 (política Janaina R13.11)
 */

import { prisma } from "../src/lib/db/prisma"
import { PLAN_CREDITS } from "../src/lib/db/queries"

interface Args {
  email: string | null
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
    dryRun: args.includes("--dry-run"),
  }
}

/**
 * Renova créditos de UM usuário (RESET, não acumula).
 * Público-alvo: chamado por este script E, no futuro (R13.12), pelo webhook Asaas.
 */
export async function renewUserCredits(
  userId: string,
  targetCredits = 1500,
  reason = "R13.11 · Renovação mensal GUIDE",
): Promise<{ before: number; after: number }> {
  const balance = await prisma.creditBalance.findUnique({
    where: { userId },
    select: { balance: true },
  })
  const before = balance?.balance ?? 0

  // UPSERT: cria se não existir, atualiza para exatamente targetCredits
  await prisma.creditBalance.upsert({
    where: { userId },
    create: { userId, balance: targetCredits },
    update: { balance: targetCredits }, // RESET absoluto, não incremental
  })

  // Registra transação para auditoria (schema atual só suporta CREDIT/DEBIT;
  // usar CREDIT como categoria genérica de "entrada de saldo"; descrição narra
  // que é renovação. R13.12 poderá adicionar RENEWAL como enum próprio.)
  const delta = targetCredits - before
  if (delta !== 0) {
    await prisma.creditTransaction.create({
      data: {
        userId,
        amount: Math.abs(delta),
        type: delta > 0 ? "CREDIT" : "DEBIT",
        balance: targetCredits,
        description: reason,
        metadata: { source: "renew-monthly-credits", cycle: "monthly", plan: "GUIDE" },
      },
    })
  }

  return { before, after: targetCredits }
}

async function main() {
  const args = parseArgs()
  const guideCredits = PLAN_CREDITS.GUIDE // 1500

  console.log(`\n${args.dryRun ? "🧪 DRY-RUN" : "🚀 EXECUÇÃO"} · Renovação mensal de créditos GUIDE`)
  console.log(`   Créditos alvo por usuário: ${guideCredits}`)
  console.log()

  // Busca: usuários com Subscription plan=GUIDE E status ACTIVE
  const users = await prisma.user.findMany({
    where: {
      subscription: {
        plan: "GUIDE",
        status: "ACTIVE",
      },
      ...(args.email ? { email: args.email } : {}),
    },
    include: {
      creditBalance: true,
      subscription: { select: { plan: true, status: true } },
    },
  })

  if (users.length === 0) {
    console.log(`⚠️  Nenhum assinante GUIDE ativo encontrado${args.email ? ` para ${args.email}` : ""}.`)
    console.log(`   (Isso é normal se ainda não há assinantes — o plano foi lançado em R13.11.)`)
    await prisma.$disconnect()
    return
  }

  console.log(`👥 ${users.length} assinante(s) GUIDE ativo(s) encontrado(s):\n`)

  let processed = 0
  for (const u of users) {
    const currentBalance = u.creditBalance?.balance ?? 0
    console.log(`   • ${u.email} (${u.name ?? "sem nome"})`)
    console.log(`     saldo atual: ${currentBalance} → novo: ${guideCredits}`)

    if (!args.dryRun) {
      const result = await renewUserCredits(u.id, guideCredits)
      console.log(`     ✅ renovado (delta=${result.after - result.before})`)
      processed++
    }
  }

  console.log()
  if (args.dryRun) {
    console.log(`🧪 DRY-RUN concluído. Rode sem --dry-run para aplicar as mudanças.`)
  } else {
    console.log(`✅ ${processed} usuário(s) renovado(s) com sucesso.`)
  }
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error("❌ ERRO:", e)
  await prisma.$disconnect()
  process.exit(1)
})
