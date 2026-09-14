/**
 * BIA · Academy · Layout da área LOGADA — R13.03
 *
 * Este layout envolve TODAS as rotas autenticadas da Academy:
 *   /academy/dashboard
 *   /academy/journey
 *   /academy/modules/*
 *   /academy/library, /academy/project, /academy/live, /academy/certificate, /academy/profile
 *
 * Fica DENTRO do route group (app) — o Next.js não coloca "(app)" na URL,
 * mas o segmento nos permite ter um layout DIFERENTE do /academy raiz
 * (que serve a landing pública sem sidebar).
 *
 * Guarda de sessão: exige session.user.id. Se anônimo, manda para
 * /auth/login com callbackUrl preservado. Se não tem matrícula (ou
 * está EXPIRED), manda para /academy/welcome (que já trata Opção B).
 */
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { hasAccess } from "@/lib/academy/enrollment"
import { AcademySidebar } from "@/components/academy/AcademySidebar"

export default async function AcademyAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/academy/dashboard")
  }

  const enrollment = await prisma.academyEnrollment.findUnique({
    where: { userId: session.user.id },
  })

  // Sem matrícula OU matrícula expirada → jogar para /academy/welcome
  // que trata a Opção B (CTAs Asaas + WhatsApp em PendingEnrollment).
  if (!enrollment || !hasAccess(enrollment)) {
    redirect("/academy/welcome")
  }

  return (
    <div className="min-h-screen bg-[#050208] flex md:pt-0 pt-14 relative">
      <AcademySidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
