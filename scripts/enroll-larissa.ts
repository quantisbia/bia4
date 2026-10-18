import { prisma } from "../src/lib/db/prisma"
import bcrypt from "bcryptjs"
import { calculateAccessUntil } from "../src/lib/academy/enrollment"

const SENHA_INICIAL = "BiaAcademy2026!"
const STUDENT = { email: "larissa_spinola@yahoo.com.br", name: "Larissa Spinola" }
const GUIDE_MONTHLY_CREDITS = 1500

async function main() {
  const email = STUDENT.email.trim().toLowerCase()
  console.log(`\n📧 Matriculando ${email} (${STUDENT.name})...\n`)

  const existing = await prisma.user.findUnique({
    where: { email },
    include: { subscription: true, creditBalance: true, academyEnrollment: true },
  })

  let userId: string
  let created = false

  if (!existing) {
    const hashed = await bcrypt.hash(SENHA_INICIAL, 10)
    const u = await prisma.user.create({
      data: { email, name: STUDENT.name, password: hashed, role: "STUDENT" },
    })
    userId = u.id
    created = true
    console.log(`  ✓ User criado (id=${u.id.slice(0, 10)}…) com senha inicial`)
  } else {
    userId = existing.id
    console.log(`  ℹ User já existe (id=${existing.id.slice(0, 10)}…, role=${existing.role})`)
    if (!existing.password) {
      const hashed = await bcrypt.hash(SENHA_INICIAL, 10)
      await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
      console.log(`  ✓ senha inicial setada (estava NULL)`)
      created = true
    }
    if (existing.role === "USER") {
      await prisma.user.update({ where: { id: userId }, data: { role: "STUDENT" } })
      console.log(`  ✓ role USER → STUDENT`)
    }
    // Garante nome se estiver vazio
    if (!existing.name || existing.name.trim() === "") {
      await prisma.user.update({ where: { id: userId }, data: { name: STUDENT.name } })
      console.log(`  ✓ name setado: ${STUDENT.name}`)
    }
  }

  const now = new Date()
  const periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)

  // Subscription GUIDE/ACTIVE
  const sub = await prisma.subscription.findUnique({ where: { userId } })
  if (!sub) {
    await prisma.subscription.create({
      data: {
        userId, plan: "GUIDE", status: "ACTIVE",
        currentPeriodStart: now, currentPeriodEnd: periodEnd,
        monthlyCredits: GUIDE_MONTHLY_CREDITS,
      },
    })
    console.log(`  ✓ Subscription GUIDE/ACTIVE +365d criada`)
  } else {
    if (sub.plan === "FREE" || (sub.status !== "ACTIVE" && sub.status !== "TRIALING")) {
      await prisma.subscription.update({
        where: { userId },
        data: { plan: "GUIDE", status: "ACTIVE", currentPeriodEnd: periodEnd, monthlyCredits: GUIDE_MONTHLY_CREDITS },
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
      data: { userId, balance: GUIDE_MONTHLY_CREDITS, totalEarned: GUIDE_MONTHLY_CREDITS, totalSpent: 0 },
    })
    console.log(`  ✓ CreditBalance com ${GUIDE_MONTHLY_CREDITS} créditos`)
  } else {
    console.log(`  ℹ CreditBalance já existe (saldo=${bal.balance})`)
  }

  // AcademyEnrollment
  const enr = await prisma.academyEnrollment.findUnique({ where: { userId } })
  if (!enr) {
    const accessUntil = calculateAccessUntil(now)
    await prisma.academyEnrollment.create({
      data: { userId, enrolledAt: now, accessUntil, source: "manual-paying-student" },
    })
    console.log(`  ✓ AcademyEnrollment criado (acesso até ${accessUntil.toISOString().slice(0,10)})`)
  } else {
    console.log(`  ℹ AcademyEnrollment já existe (expira em ${enr.accessUntil.toISOString().slice(0,10)})`)
  }

  console.log(`\n${created ? "🔑 Senha inicial: " + SENHA_INICIAL : "⚠ Usuário já existia — senha preservada (não resetada)"}`)
  console.log(`\n✅ Larissa pronta pra entrar: https://biaquantis.bio/auth/login\n`)
  await prisma.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
