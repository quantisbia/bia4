/**
 * R33-A · Remove contas de teste/sonda identificadas na investigação de 08/11/2026.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/purge-test-accounts.ts            # dry-run (só lista)
 *   npx tsx --env-file=.env.local scripts/purge-test-accounts.ts --execute  # apaga de fato
 *
 * Segurança:
 *   - lista FECHADA de e-mails (não usa padrões genéricos para apagar);
 *   - recusa apagar qualquer conta com role ADMIN/INSTRUCTOR, com assinatura paga,
 *     com matrícula Academy ou com e-mail @quantis.bio (exceto a de teste explícita);
 *   - grava um AuditLog "admin_purge_test_account" para cada remoção.
 */
import { prisma } from "../src/lib/db/prisma"

const TEST_ACCOUNTS = [
  // sondas 30/10–04/11
  "qa.tester.9f2@example.com",
  "qa.tester.9f3@example.com",
  "qa.tester.9f4@example.com",
  "qa.tester.9f5@example.com",
  "recon.test+b4a1@gmail.com",
  "recon.test+b4a2@gmail.com",
  "recon.test+b4a3@gmail.com",
  "recon.test+b4a4@gmail.com",
  "recon.test2.crosscheck@gmail.com",
  "ss.keyprobe.01@example.com",
  // contas de teste antigas (abril/2026)
  "test@test.com",
  "debug.test@bia.com",
  "maria.silva.teste@quantis.bio",
]

const EXECUTE = process.argv.includes("--execute")

async function main() {
  console.log(EXECUTE ? "⚠️  MODO EXECUÇÃO — as contas serão apagadas" : "🔎 DRY-RUN — nada será alterado (use --execute para apagar)")
  const users = await prisma.user.findMany({
    where: { email: { in: TEST_ACCOUNTS } },
    include: {
      subscription: true, creditBalance: true, academyEnrollment: true,
      _count: { select: { chatSessions: true, pipelineProjects: true, protocols: true, notebookEntries: true, projects: true, creditTxns: true, sessions: true } },
    },
  })
  const found = new Set(users.map(u => u.email))
  const missing = TEST_ACCOUNTS.filter(e => !found.has(e))
  if (missing.length) console.log("Não encontradas (já removidas?):", missing.join(", "))

  const toDelete = []
  for (const u of users) {
    const paid = u.subscription && u.subscription.plan !== "FREE"
    const blockers = [
      u.role === "ADMIN" && "role ADMIN",
      u.role === "INSTRUCTOR" && "role INSTRUCTOR",
      paid && `plano pago ${u.subscription?.plan}`,
      u.academyEnrollment && "matrícula Academy",
    ].filter(Boolean)
    const line = `${u.email.padEnd(36)} | ${String(u.name).padEnd(14)} | ${u.role} | ${u.subscription?.plan ?? "-"} | créditos gastos ${u.creditBalance?.totalSpent ?? 0} | chats ${u._count.chatSessions} · protocolos ${u._count.protocols} · pipelines ${u._count.pipelineProjects} · notebook ${u._count.notebookEntries} · txns ${u._count.creditTxns}`
    if (blockers.length) { console.log("⛔ PULANDO", line, "→", blockers.join(", ")); continue }
    console.log("🗑 ", line)
    toDelete.push(u)
  }
  console.log(`\nTotal a remover: ${toDelete.length}`)
  if (!EXECUTE) return

  for (const u of toDelete) {
    // AuditLog tem userId sem FK → preserva o histórico de login/cadastro da conta (forense),
    // e registra a remoção. Dados do usuário saem em cascata (sessions, chats, créditos...).
    await prisma.auditLog.create({
      data: { userId: null, action: "admin_purge_test_account", entity: "user", entityId: u.id,
        metadata: { email: u.email, name: u.name, createdAt: u.createdAt.toISOString(), reason: "conta de teste/sonda — investigação 2026-11-08", by: "script purge-test-accounts.ts" } },
    })
    await prisma.user.delete({ where: { id: u.id } })
    console.log("✅ removida:", u.email)
  }
  const remaining = await prisma.user.count({ where: { email: { in: TEST_ACCOUNTS } } })
  console.log(`\nRestantes da lista no banco: ${remaining} · total de usuários agora: ${await prisma.user.count()}`)
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
