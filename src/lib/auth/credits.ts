import { auth } from "@/lib/auth/config"
import { getCreditBalance, spendCredits } from "@/lib/db/queries"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"

// Credit costs per action
export const CREDIT_COSTS = {
  PIPELINE_STAGE:         5,
  BIOMATERIAL_FORMULATION:10,
  ORGANOID_DESIGN:        15,
  PROTOCOL_GENERATION:    8,
  REGULATORY_DOSSIER:     20,
  ANALYSIS_RUN:           12,
  STL_GCODE:              6,
  CHAT_MESSAGE:           2,
  KNOWLEDGE_SEARCH:       1,
} as const

export type CreditAction = keyof typeof CREDIT_COSTS

/**
 * Server-side credit guard for API routes.
 * Returns an error response if insufficient credits, otherwise deducts and returns null.
 */
export async function requireCredits(
  userId: string,
  action: CreditAction,
  description: string,
  metadata?: Prisma.InputJsonValue
): Promise<{ error: NextResponse } | null> {
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

  const guard = await requireCredits(session.user.id, action, description, metadata)
  if (guard) return guard

  return { userId: session.user.id, cost: CREDIT_COSTS[action] }
}
