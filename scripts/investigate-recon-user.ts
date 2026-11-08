/**
 * Investigação (somente leitura) do usuário recon.test2.crosscheck@gmail.com
 * e de contas com padrão semelhante. Não altera nada.
 */
import { prisma } from "../src/lib/db/prisma"
const TARGET = "recon.test2.crosscheck@gmail.com"

async function main() {
  // 1) usuário alvo
  const u = await prisma.user.findUnique({
    where: { email: TARGET },
    include: { subscription: true, creditBalance: true, accounts: true, sessions: true, academyEnrollment: true,
      _count: { select: { chatSessions: true, pipelineProjects: true, protocols: true, notebookEntries: true, projects: true } } },
  })
  console.log("=== USER ===")
  console.log(u ? JSON.stringify({ ...u, password: u.password ? `<hash ${u.password.slice(0, 7)}…>` : null }, null, 2) : "NÃO ENCONTRADO")

  // 2) contas com padrão semelhante
  const similar = await prisma.user.findMany({
    where: { OR: [
      { email: { contains: "recon", mode: "insensitive" } },
      { email: { contains: "crosscheck", mode: "insensitive" } },
      { email: { contains: "test", mode: "insensitive" } },
      { email: { contains: "pentest", mode: "insensitive" } },
      { email: { contains: "scan", mode: "insensitive" } },
    ] },
    select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true, emailVerified: true, institution: true, researchArea: true },
    orderBy: { createdAt: "asc" },
  })
  console.log("\n=== CONTAS COM PADRÃO SEMELHANTE (recon/crosscheck/test/pentest/scan) ===", similar.length)
  console.table(similar.map(s => ({ email: s.email, name: s.name, role: s.role, inst: s.institution, created: s.createdAt.toISOString() })))

  // 3) audit log do alvo e dos similares
  const ids = [u?.id, ...similar.map(s => s.id)].filter(Boolean) as string[]
  const logs = await prisma.auditLog.findMany({
    where: { OR: [ { userId: { in: ids } }, { metadata: { path: ["email"], string_contains: "crosscheck" } } ] },
    orderBy: { createdAt: "asc" },
  })
  console.log("\n=== AUDIT LOG (todos os eventos dessas contas) ===", logs.length)
  for (const l of logs) console.log(l.createdAt.toISOString(), "|", l.userId?.slice(0, 8), "|", l.action, "|", l.entity ?? "", "|", l.ip ?? "", "|", JSON.stringify(l.metadata ?? {}).slice(0, 200))

  // 4) agregação por ação / por dia / por hora (UTC)
  const byAction: Record<string, number> = {}; const byDay: Record<string, number> = {}; const byHour: Record<string, number> = {}; const byIp: Record<string, number> = {}
  for (const l of logs) {
    byAction[l.action] = (byAction[l.action] ?? 0) + 1
    byDay[l.createdAt.toISOString().slice(0, 10)] = (byDay[l.createdAt.toISOString().slice(0, 10)] ?? 0) + 1
    byHour[l.createdAt.getUTCHours()] = (byHour[l.createdAt.getUTCHours()] ?? 0) + 1
    if (l.ip) byIp[l.ip] = (byIp[l.ip] ?? 0) + 1
  }
  console.log("\n=== por ação ===", byAction); console.log("=== por dia ===", byDay); console.log("=== por hora UTC ===", byHour); console.log("=== por IP ===", byIp)

  // 5) uso de créditos e chat
  if (u) {
    const txns = await prisma.creditTransaction.findMany({ where: { userId: u.id }, orderBy: { createdAt: "asc" } })
    console.log("\n=== CREDIT TRANSACTIONS ===", txns.length)
    for (const t of txns) console.log(t.createdAt.toISOString(), t.type, t.amount, t.description)
    const chats = await prisma.chatSession.findMany({ where: { userId: u.id }, include: { messages: { orderBy: { createdAt: "asc" }, take: 6 } }, orderBy: { createdAt: "asc" } })
    console.log("\n=== CHAT SESSIONS ===", chats.length)
    for (const c of chats) { console.log("--", c.createdAt.toISOString(), c.title ?? ""); for (const m of c.messages) console.log("   ", m.role, ":", (m.content ?? "").slice(0, 300).replace(/\n/g, " ")) }
    const notes = await prisma.notebookEntry.findMany({ where: { userId: u.id }, select: { title: true, createdAt: true }, take: 20 })
    console.log("\n=== NOTEBOOK ===", notes.length, notes.map(n => n.title))
    const leads = await prisma.libraryLead.findMany({ where: { email: { contains: "crosscheck", mode: "insensitive" } } })
    console.log("\n=== LIBRARY LEADS ===", leads.length, JSON.stringify(leads).slice(0, 500))
  }

  // 6) contexto: cadastros gmail do mesmo dia do alvo (possível lote)
  if (u) {
    const d0 = new Date(u.createdAt); d0.setUTCHours(0, 0, 0, 0); const d1 = new Date(d0); d1.setUTCDate(d1.getUTCDate() + 1)
    const sameDay = await prisma.user.findMany({ where: { createdAt: { gte: d0, lt: d1 } }, select: { email: true, createdAt: true, name: true }, orderBy: { createdAt: "asc" } })
    console.log("\n=== CADASTROS NO MESMO DIA ===", sameDay.length)
    console.table(sameDay.map(s => ({ email: s.email, name: s.name, created: s.createdAt.toISOString() })))
  }
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
