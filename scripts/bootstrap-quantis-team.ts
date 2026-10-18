/**
 * R13.15.5 · Bootstrap da equipe Quantis colaboradora da BIA Academy
 *
 * Garante que todos os 6 colaboradores internos têm conta na plataforma
 * com role INSTRUCTOR + senha inicial (se novos) + créditos institucionais.
 *
 * TODOS os 6 estão em SUPERADMIN_EMAILS → têm bypass total mesmo sem
 * matrícula AcademyEnrollment. Mas criamos a matrícula mesmo assim pra
 * que apareçam no dashboard do aluno e possam testar o fluxo completo.
 *
 * Idempotente: NÃO sobrescreve senha existente.
 */
import { prisma } from "../src/lib/db/prisma"
import bcrypt from "bcryptjs"
import { calculateAccessUntil } from "../src/lib/academy/enrollment"

const SENHA_INICIAL = "QuantisTeam2026!"
const INSTRUCTOR_MONTHLY_CREDITS = 5000 // generoso pra equipe interna

const TEAM = [
  { email: "kamila.leichtweis@quantis.bio", name: "Dra. Kamila Leichtweis", role: "Diretora Científica" },
  { email: "vitor.mattos@quantis.bio",      name: "Vitor Mattos",            role: "Tech/Dev" },
  { email: "thais.amaral@quantis.bio",      name: "Thais Amaral",            role: "Operações" },
  { email: "lucas.guarnier@quantis.bio",    name: "Dr. Lucas Guarnier",      role: "Pesquisa & Desenvolvimento" },
  { email: "paula.elbl@quantis.bio",        name: "Paula Elbl",              role: "Colaboradora Academy" },
  { email: "suporte@quantis.bio",           name: "Suporte Quantis",         role: "Atendimento" },
]

async function upsertTeamMember(member: typeof TEAM[number]) {
  const email = member.email.trim().toLowerCase()
  console.log(`\n👤 ${email} (${member.name} — ${member.role})`)

  const existing = await prisma.user.findUnique({
    where: { email },
    include: { subscription: true, creditBalance: true, academyEnrollment: true },
  })

  let userId: string
  let created = false

  if (!existing) {
    const hashed = await bcrypt.hash(SENHA_INICIAL, 10)
    const u = await prisma.user.create({
      data: { email, name: member.name, password: hashed, role: "INSTRUCTOR" },
    })
    userId = u.id
    created = true
    console.log(`  ✓ User criado (id=${u.id.slice(0, 10)}…) com senha inicial · role=INSTRUCTOR`)
  } else {
    userId = existing.id
    console.log(`  ℹ User já existe (id=${existing.id.slice(0, 10)}…, role=${existing.role})`)
    if (!existing.password) {
      const hashed = await bcrypt.hash(SENHA_INICIAL, 10)
      await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
      console.log(`  ✓ senha inicial setada (estava NULL)`)
      created = true
    }
    // Promove USER→INSTRUCTOR (preserva ADMIN se já for)
    if (existing.role === "USER" || existing.role === "STUDENT") {
      await prisma.user.update({ where: { id: userId }, data: { role: "INSTRUCTOR" } })
      console.log(`  ✓ role ${existing.role} → INSTRUCTOR`)
    }
    if (!existing.name || existing.name.trim() === "") {
      await prisma.user.update({ where: { id: userId }, data: { name: member.name } })
      console.log(`  ✓ name setado: ${member.name}`)
    }
  }

  const now = new Date()
  const periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)

  // Subscription INSTRUCTOR (reutiliza plano GUIDE com créditos maiores)
  const sub = await prisma.subscription.findUnique({ where: { userId } })
  if (!sub) {
    await prisma.subscription.create({
      data: {
        userId, plan: "GUIDE", status: "ACTIVE",
        currentPeriodStart: now, currentPeriodEnd: periodEnd,
        monthlyCredits: INSTRUCTOR_MONTHLY_CREDITS,
      },
    })
    console.log(`  ✓ Subscription GUIDE/ACTIVE +365d (${INSTRUCTOR_MONTHLY_CREDITS} créditos/mês)`)
  } else {
    if (sub.plan === "FREE" || (sub.status !== "ACTIVE" && sub.status !== "TRIALING")) {
      await prisma.subscription.update({
        where: { userId },
        data: { plan: "GUIDE", status: "ACTIVE", currentPeriodEnd: periodEnd, monthlyCredits: INSTRUCTOR_MONTHLY_CREDITS },
      })
      console.log(`  ✓ Subscription atualizada → GUIDE/ACTIVE`)
    } else {
      console.log(`  ℹ Subscription já ativa (plan=${sub.plan}/${sub.status}) — preservada`)
    }
  }

  // CreditBalance
  const bal = await prisma.creditBalance.findUnique({ where: { userId } })
  if (!bal) {
    await prisma.creditBalance.create({
      data: { userId, balance: INSTRUCTOR_MONTHLY_CREDITS, totalEarned: INSTRUCTOR_MONTHLY_CREDITS, totalSpent: 0 },
    })
    console.log(`  ✓ CreditBalance com ${INSTRUCTOR_MONTHLY_CREDITS} créditos`)
  } else {
    console.log(`  ℹ CreditBalance já existe (saldo=${bal.balance})`)
  }

  // AcademyEnrollment (mesmo colaboradores precisam ter pra aparecer no fluxo)
  const enr = await prisma.academyEnrollment.findUnique({ where: { userId } })
  if (!enr) {
    const accessUntil = calculateAccessUntil(now)
    await prisma.academyEnrollment.create({
      data: { userId, enrolledAt: now, accessUntil, source: "quantis-team-bootstrap" },
    })
    console.log(`  ✓ AcademyEnrollment criado (acesso até ${accessUntil.toISOString().slice(0,10)})`)
  } else {
    console.log(`  ℹ AcademyEnrollment já existe (expira em ${enr.accessUntil.toISOString().slice(0,10)})`)
  }

  return { email, name: member.name, role: member.role, createdWithPassword: created }
}

async function main() {
  console.log("🏢 Bootstrap da equipe Quantis — BIA Academy\n")
  console.log(`   Total: ${TEAM.length} colaboradores`)
  console.log(`   Role: INSTRUCTOR (+ bypass SUPERADMIN)`)
  console.log(`   Senha inicial para novos: ${SENHA_INICIAL}`)
  console.log(`   Créditos: ${INSTRUCTOR_MONTHLY_CREDITS}/mês\n`)
  console.log("═".repeat(60))

  const results: { email: string; name: string; role: string; createdWithPassword: boolean }[] = []
  for (const member of TEAM) {
    const r = await upsertTeamMember(member)
    results.push(r)
  }

  console.log("\n" + "═".repeat(60))
  console.log("\n📊 RESUMO:\n")
  const novos = results.filter(r => r.createdWithPassword)
  const existentes = results.filter(r => !r.createdWithPassword)
  console.log(`   ✅ Novos (senha inicial criada): ${novos.length}`)
  for (const n of novos) console.log(`      - ${n.email}`)
  console.log(`\n   ℹ Já existiam (senha preservada): ${existentes.length}`)
  for (const e of existentes) console.log(`      - ${e.email}`)
  console.log(`\n🔑 Senha inicial para novos: ${SENHA_INICIAL}`)
  console.log(`🌐 Login: https://biaquantis.bio/auth/login\n`)

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
