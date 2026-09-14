/**
 * BIA · Academy · Onboarding — R13.02
 *
 * Rota: /academy/welcome  (protegida por auth)
 *
 * Comportamento:
 *  - Anônimo → redirect /auth/login?callbackUrl=/academy/welcome
 *  - Logado SEM matrícula (NO_ENROLLMENT) → renderiza página
 *    "Matrícula pendente" com CTAs Asaas + WhatsApp (opção B da Janaina)
 *  - Logado COM matrícula EXPIRADA → renderiza mesma página pendente
 *  - Logado COM matrícula ATIVA → renderiza form de 3 perguntas
 *  - Se já respondeu antes → redireciona para /academy/dashboard (R13.03)
 *    OU permite atualizar as respostas se `?edit=true`
 */

import { redirect } from "next/navigation"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { hasAccess, getEnrollmentState } from "@/lib/academy/enrollment"
import { WelcomeForm } from "./_components/WelcomeForm"
import { PendingEnrollment } from "./_components/PendingEnrollment"

export const metadata = {
  title: "Bem-vindo — BIA Academy",
}

export const dynamic = "force-dynamic"

interface OnboardingPayload {
  preferredArea?: string | null
  experienceLevel?: string | null
  mainGoal?: string | null
  skipped?: boolean
  answeredAt?: string
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams?: Promise<{ edit?: string }> | { edit?: string }
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/academy/welcome")
  }

  const enrollment = await prisma.academyEnrollment.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      onboarding: true,
      accessUntil: true,
      completedAt: true,
      enrolledAt: true,
    },
  })

  // Sem matrícula OU expirada → página "pendente" (opção B da Janaina)
  if (!enrollment) {
    return (
      <PendingEnrollment
        state="NO_ENROLLMENT"
        userName={session.user.name ?? null}
      />
    )
  }
  if (!hasAccess(enrollment)) {
    return (
      <PendingEnrollment
        state={getEnrollmentState(enrollment)}
        userName={session.user.name ?? null}
        accessUntil={enrollment.accessUntil}
      />
    )
  }

  // Se já respondeu e não pediu edição → vai para o dashboard (R13.03)
  const ob = (enrollment.onboarding as OnboardingPayload | null) ?? null
  const alreadyAnswered = Boolean(
    ob && (ob.answeredAt || ob.preferredArea || ob.experienceLevel || ob.mainGoal),
  )

  const resolvedSearch = searchParams instanceof Promise
    ? await searchParams
    : (searchParams ?? {})
  const editMode = resolvedSearch?.edit === "true"

  if (alreadyAnswered && !editMode) {
    // R13.03: manda para o dashboard próprio do aluno na Academy.
    redirect("/academy/dashboard?from=academy-welcome")
  }

  return (
    <WelcomeForm
      userName={session.user.name ?? null}
      initial={ob}
    />
  )
}
