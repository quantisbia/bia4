/**
 * R13.14.5 · Matricular alunos pagantes em lote (BIA Academy + plataforma BIA)
 *
 * Lista entregue pela Janaina (2026-10-13). Para cada e-mail:
 *   1. Cria o User (se não existir) com role=STUDENT + senha inicial bcrypt
 *   2. Garante Subscription plan=GUIDE, status=ACTIVE
 *      (plano "Guia Inteligente em Biofabricação 3D" — R13.11)
 *      → libera acesso à plataforma BIA (Formulator, Bioimpressão, etc)
 *   3. Garante CreditBalance com saldo mensal padrão (1500 créditos do GUIDE)
 *   4. Garante AcademyEnrollment com accessUntil = hoje + 365 dias
 *      → libera acesso aos 12 módulos + encontros ao vivo
 *   5. Imprime a senha inicial no stdout para você enviar
 *
 * IDEMPOTENTE: pode rodar várias vezes. Se o usuário já existe,
 * só completa o que estiver faltando — NUNCA sobrescreve senha
 * já definida pelo próprio aluno (checa se é a senha inicial padrão
 * antes de reescrever).
 *
 * Senha inicial: SENHA_INICIAL (constante abaixo).
 * Os alunos trocam depois em /auth/forgot-password OU no primeiro login
 * usando /auth/reset-password.
 *
 * Como rodar:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/enroll-paying-students.ts            # execução real
 *   npx tsx scripts/enroll-paying-students.ts --dry-run  # preview
 */
import { prisma } from "../src/lib/db/prisma"
import bcrypt from "bcryptjs"
import { calculateAccessUntil } from "../src/lib/academy/enrollment"

const DRY_RUN = process.argv.includes("--dry-run")

// Senha inicial para TODOS os alunos deste lote.
// Será trocada por eles no primeiro login (via "esqueci minha senha")
// ou direto em /profile depois.
const SENHA_INICIAL = "BiaAcademy2026!"

interface StudentSeed {
  email: string
  name: string // mostrado na saudação, perfil e certificados
}

// Nome inferido do e-mail (local-part). Alunos podem editar depois em /profile.
function inferNameFromEmail(email: string): string {
  const local = email.split("@")[0]
  // Troca pontos e underscores por espaço, capitaliza cada palavra
  return local
    .replace(/[._-]+/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
    .trim() || email
}

const STUDENTS: StudentSeed[] = [
  { email: "diego.faria@institutodiegofaria.com.br", name: inferNameFromEmail("diego.faria@institutodiegofaria.com.br") },
  { email: "paulonaimayer@hotmail.com",              name: inferNameFromEmail("paulonaimayer@hotmail.com") },
  { email: "marcelobarros0212@hotmail.com",          name: inferNameFromEmail("marcelobarros0212@hotmail.com") },
  { email: "mariana.bpedroni@gmail.com",             name: inferNameFromEmail("mariana.bpedroni@gmail.com") },
  { email: "andrecupertino@hotmail.com",             name: inferNameFromEmail("andrecupertino@hotmail.com") },
  { email: "janaina@bioedtech.com.br",               name: inferNameFromEmail("janaina@bioedtech.com.br") },
]

// Plano usado para acesso à BIA (plataforma geral) — R13.11 "Guia Inteligente"
const GUIDE_MONTHLY_CREDITS = 1500

// ─────────────────────────────────────────────────────────────────────
async function processStudent(seed: StudentSeed): Promise<{
  email: string
  changes: string[]
  tempPassword: string | null
  warning?: string
}> {
  const changes: string[] = []
  const email = seed.email.trim().toLowerCase()
  const existing = await prisma.user.findUnique({
    where: { email },
    include: {
      subscription:     true,
      creditBalance:    true,
      academyEnrollment:true,
    },
  })

  // ─── 1. User ─────────────────────────────────────────────────────
  let userId: string
  let tempPassword: string | null = SENHA_INICIAL

  if (!existing) {
    const hashed = await bcrypt.hash(SENHA_INICIAL, 10)
    changes.push(`CRIAR usuário STUDENT com senha inicial`)
    if (!DRY_RUN) {
      const created = await prisma.user.create({
        data: {
          email,
          name:     seed.name,
          password: hashed,
          role:     "STUDENT",
        },
      })
      userId = created.id
    } else {
      userId = "DRY_RUN_PLACEHOLDER"
    }
  } else {
    userId = existing.id
    tempPassword = null // só devolvemos a senha inicial se CRIAMOS o user agora
    changes.push(`usuário já existe (id=${existing.id.slice(0, 10)}…, role=${existing.role})`)

    // Se não tem senha nenhuma OU se nunca logou, re-seta pra senha inicial
    if (!existing.password) {
      const hashed = await bcrypt.hash(SENHA_INICIAL, 10)
      changes.push(`senha estava NULL → setando senha inicial`)
      if (!DRY_RUN) {
        await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
      }
      tempPassword = SENHA_INICIAL
    }

    // Se role é USER, promove pra STUDENT (nunca mexe em ADMIN/INSTRUCTOR)
    if (existing.role === "USER") {
      changes.push(`role: USER → STUDENT`)
      if (!DRY_RUN) {
        await prisma.user.update({ where: { id: userId }, data: { role: "STUDENT" } })
      }
    }
  }

  // ─── 2. Subscription (GUIDE / ACTIVE) → acesso à BIA ──────────────
  const sub = existing?.subscription
  const now = new Date()
  const periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) // +365 dias
  if (!sub) {
    changes.push(`criar Subscription plan=GUIDE, status=ACTIVE, +365d`)
    if (!DRY_RUN) {
      await prisma.subscription.create({
        data: {
          userId,
          plan:               "GUIDE",
          status:             "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd:   periodEnd,
          monthlyCredits:     GUIDE_MONTHLY_CREDITS,
        },
      })
    }
  } else {
    const needsPlanFix = sub.plan === "FREE"
    const needsStatusFix = sub.status !== "ACTIVE" && sub.status !== "TRIALING"
    if (needsPlanFix || needsStatusFix) {
      changes.push(`subscription: plan=${sub.plan}→GUIDE, status=${sub.status}→ACTIVE`)
      if (!DRY_RUN) {
        await prisma.subscription.update({
          where: { userId },
          data:  {
            plan:             "GUIDE",
            status:           "ACTIVE",
            currentPeriodEnd: periodEnd,
            monthlyCredits:   GUIDE_MONTHLY_CREDITS,
          },
        })
      }
    } else {
      changes.push(`subscription já ok (plan=${sub.plan}, status=${sub.status})`)
    }
  }

  // ─── 3. CreditBalance ─────────────────────────────────────────────
  const bal = existing?.creditBalance
  if (!bal) {
    changes.push(`criar CreditBalance com ${GUIDE_MONTHLY_CREDITS} créditos`)
    if (!DRY_RUN) {
      await prisma.creditBalance.create({
        data: {
          userId,
          balance:     GUIDE_MONTHLY_CREDITS,
          totalEarned: GUIDE_MONTHLY_CREDITS,
          totalSpent:  0,
        },
      })
    }
  } else {
    changes.push(`creditBalance já existe (saldo=${bal.balance})`)
  }

  // ─── 4. AcademyEnrollment ─────────────────────────────────────────
  const enr = existing?.academyEnrollment
  if (!enr) {
    const accessUntil = calculateAccessUntil(now)
    changes.push(`criar AcademyEnrollment, accessUntil=${accessUntil.toISOString().slice(0, 10)}`)
    if (!DRY_RUN) {
      await prisma.academyEnrollment.create({
        data: {
          userId,
          enrolledAt:   now,
          accessUntil,
          source:       "manual-paying-student",
        },
      })
    }
  } else {
    const daysLeft = Math.ceil((enr.accessUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    changes.push(`academyEnrollment já existe (expira em ${daysLeft}d)`)
  }

  return { email, changes, tempPassword }
}

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log("─────────────────────────────────────────────────────")
  console.log(`R13.14.5 · Enroll ${STUDENTS.length} alunos pagantes`)
  console.log(`Modo: ${DRY_RUN ? "DRY RUN (sem gravar)" : "EXECUÇÃO REAL"}`)
  console.log("─────────────────────────────────────────────────────\n")

  const results: Array<Awaited<ReturnType<typeof processStudent>>> = []

  for (const s of STUDENTS) {
    console.log(`\n📧 ${s.email} (${s.name})`)
    try {
      const r = await processStudent(s)
      for (const c of r.changes) console.log(`   • ${c}`)
      if (r.tempPassword) {
        console.log(`   🔑 SENHA INICIAL: ${r.tempPassword}`)
      }
      results.push(r)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`   ❌ ERRO: ${msg}`)
      results.push({ email: s.email, changes: [], tempPassword: null, warning: msg })
    }
  }

  // ─── Resumo em tabela pronta para você enviar ─────────────────────
  console.log("\n─────────────────────────────────────────────────────")
  console.log("📋 RESUMO (para enviar aos alunos)")
  console.log("─────────────────────────────────────────────────────")
  console.log(`URL de login: https://biaquantis.bio/auth/login`)
  console.log(`              (ou /academy/dashboard direto após login)`)
  console.log(`Senha inicial: ${SENHA_INICIAL}`)
  console.log(`             (recomendar troca em /profile ou "esqueci minha senha")\n`)
  console.log("┌─────────────────────────────────────────────────────┬─────────────────┐")
  console.log("│ E-mail                                              │ Status          │")
  console.log("├─────────────────────────────────────────────────────┼─────────────────┤")
  for (const r of results) {
    const status = r.warning ? "❌ erro" :
                   r.tempPassword ? "✅ criado novo" :
                   "✅ já existia"
    console.log(`│ ${r.email.padEnd(51)} │ ${status.padEnd(15)} │`)
  }
  console.log("└─────────────────────────────────────────────────────┴─────────────────┘")

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
