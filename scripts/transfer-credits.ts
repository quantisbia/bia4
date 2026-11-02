/**
 * BIA · Transferência de créditos entre contas (admin)
 *
 *   npx tsx --env-file=.env.local scripts/transfer-credits.ts \
 *     --from=vitor.mattos@quantis.bio --to=janaina.dernowsek@quantis.bio --amount=10000 [--dry] [--note="..."]
 *
 * Faz tudo numa transação: DEBIT no remetente, CREDIT no destinatário, e um
 * CreditTransaction em cada lado com metadata { transfer: true, counterpart }.
 * Para reverter: rode de novo com --from/--to invertidos.
 */
import { prisma } from "../src/lib/db/prisma"

const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3)
const FROM = (arg("from") ?? "").toLowerCase().trim()
const TO = (arg("to") ?? "").toLowerCase().trim()
const AMOUNT = Number(arg("amount") ?? 0)
const DRY = process.argv.includes("--dry")
const NOTE = arg("note") ?? "Transferência interna de créditos (admin)"

async function main() {
  if (!FROM || !TO || !Number.isInteger(AMOUNT) || AMOUNT <= 0) {
    console.error("uso: --from=<email> --to=<email> --amount=<inteiro> [--dry]"); process.exit(1)
  }
  if (FROM === TO) { console.error("from e to iguais"); process.exit(1) }
  const [src, dst] = await Promise.all([
    prisma.user.findUnique({ where: { email: FROM }, select: { id: true, name: true, email: true, creditBalance: true } }),
    prisma.user.findUnique({ where: { email: TO }, select: { id: true, name: true, email: true, creditBalance: true } }),
  ])
  if (!src) { console.error(`remetente não encontrado: ${FROM}`); process.exit(1) }
  if (!dst) { console.error(`destinatário não encontrado: ${TO}`); process.exit(1) }
  const srcBal = src.creditBalance?.balance ?? 0
  const dstBal = dst.creditBalance?.balance ?? 0
  console.log(`${src.name} <${src.email}>: ${srcBal}  →  ${srcBal - AMOUNT}`)
  console.log(`${dst.name} <${dst.email}>: ${dstBal}  →  ${dstBal + AMOUNT}`)
  if (srcBal < AMOUNT) { console.error(`saldo insuficiente no remetente (${srcBal} < ${AMOUNT})`); process.exit(1) }
  if (DRY) { console.log("(dry-run — nada gravado)"); return }

  const when = new Date().toISOString()
  await prisma.$transaction(async (tx) => {
    const s = await tx.creditBalance.upsert({
      where: { userId: src.id },
      create: { userId: src.id, balance: -AMOUNT, totalEarned: 0, totalSpent: AMOUNT },
      update: { balance: { decrement: AMOUNT }, totalSpent: { increment: AMOUNT } },
    })
    await tx.creditTransaction.create({
      data: { userId: src.id, type: "DEBIT", amount: AMOUNT, balance: s.balance, description: `${NOTE} → ${dst.email}`, metadata: { transfer: true, direction: "out", counterpart: dst.email, at: when } },
    })
    const d = await tx.creditBalance.upsert({
      where: { userId: dst.id },
      create: { userId: dst.id, balance: AMOUNT, totalEarned: AMOUNT, totalSpent: 0 },
      update: { balance: { increment: AMOUNT }, totalEarned: { increment: AMOUNT } },
    })
    await tx.creditTransaction.create({
      data: { userId: dst.id, type: "CREDIT", amount: AMOUNT, balance: d.balance, description: `${NOTE} ← ${src.email}`, metadata: { transfer: true, direction: "in", counterpart: src.email, at: when } },
    })
    console.log(`✓ transferidos ${AMOUNT} créditos. Saldos: ${src.email}=${s.balance} · ${dst.email}=${d.balance}`)
  })
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
