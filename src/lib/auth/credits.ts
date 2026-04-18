import { auth } from "@/lib/auth/config"
import { getCreditBalance, spendCredits } from "@/lib/db/queries"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { CREDIT_COSTS, type CreditAction } from "@/lib/config"

export { CREDIT_COSTS }
export type { CreditAction }

/**
 * Check if user is ADMIN — admins bypass ALL credit and plan restrictions
 */
export async function isAdminSession(): Promise<boolean> {
  const session = await auth()
  return session?.user?.role === "ADMIN"
}

/**
 * Server-side credit guard for API routes.
 * ADMIN users bypass all credit checks.
 * Returns an error response if insufficient credits, otherwise deducts and returns null.
 */
export async function requireCredits(
  userId: string,
  action: CreditAction,
  description: string,
  metadata?: Prisma.InputJsonValue,
  userRole?: string
): Promise<{ error: NextResponse } | null> {
  // ADMIN bypass: never charge credits, always succeed
  if (userRole === "ADMIN") {
    return null
  }

  const cost = CREDIT_COSTS[action]
  const result = await spendCredits(userId, cost, description, metadata)

  if (!result.success) {
    return {
      error: NextResponse.json(
        {
          error: result.error,
          code: "INSUFFICIENT_CREDITS",
          balance: result.balance,
          required: cost,
        },
        { status: 402 }
      ),
    }
  }

  return null // success
}

/**
 * Check credit balance without deducting.
 */
export async function checkCredits(
  userId: string,
  action: CreditAction
): Promise<{ sufficient: boolean; balance: number; required: number }> {
  const required = CREDIT_COSTS[action]
  const balance = await getCreditBalance(userId)
  const current = balance?.balance ?? 0

  return {
    sufficient: current >= required,
    balance: current,
    required,
  }
}

/**
 * Full auth + credits check for API routes.
 * ADMIN users bypass all restrictions.
 * Returns userId if OK, or an error NextResponse.
 */
export async function authAndCredits(
  action: CreditAction,
  description: string,
  metadata?: Prisma.InputJsonValue
): Promise<{ userId: string; cost: number } | { error: NextResponse }> {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    }
  }

  const userRole = session.user.role as string | undefined

  const guard = await requireCredits(session.user.id, action, description, metadata, userRole)
  if (guard) return guard

  return { userId: session.user.id, cost: CREDIT_COSTS[action] }
}
