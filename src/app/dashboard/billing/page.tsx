import { Metadata } from "next"
import { auth } from "@/lib/auth/config"
import { redirect } from "next/navigation"
import { getCreditBalance, getCreditHistory, getUserSubscription } from "@/lib/db/queries"
import { BillingClient } from "./BillingClient"

export const metadata: Metadata = { title: "Assinatura & Créditos" }

export default async function BillingPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  // Fetch with fallback for disconnected DB
  let subscription = null
  let creditBalance = null
  let history: {
    id: string
    type: string
    amount: number
    balance: number
    description: string
    createdAt: Date
  }[] = []

  try {
    ;[subscription, creditBalance, history] = await Promise.all([
      getUserSubscription(session.user.id),
      getCreditBalance(session.user.id),
      getCreditHistory(session.user.id, 30),
    ])
  } catch {
    // DB not connected yet — use session defaults
  }

  const plan = subscription?.plan ?? (session.user.plan as string) ?? "FREE"
  const balance = creditBalance?.balance ?? (session.user.credits as number) ?? 0
  const totalEarned = creditBalance?.totalEarned ?? balance
  const totalSpent = creditBalance?.totalSpent ?? 0

  return (
    <BillingClient
      currentPlan={plan}
      balance={balance}
      totalEarned={totalEarned}
      totalSpent={totalSpent}
      history={history.map((h) => ({
        ...h,
        createdAt: h.createdAt.toISOString(),
      }))}
      periodEnd={subscription?.currentPeriodEnd?.toISOString()}
    />
  )
}
