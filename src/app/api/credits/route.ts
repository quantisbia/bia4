import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { getCreditBalance, getCreditHistory, spendCredits, addCredits } from "@/lib/db/queries"
import { Prisma } from "@prisma/client"
import { z } from "zod"

// GET /api/credits — saldo + histórico
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const includeHistory = searchParams.get("history") === "true"
    const limit = parseInt(searchParams.get("limit") ?? "20")

    const [balance, history] = await Promise.all([
      getCreditBalance(session.user.id),
      includeHistory ? getCreditHistory(session.user.id, limit) : Promise.resolve([]),
    ])

    return NextResponse.json({
      balance: balance?.balance ?? 0,
      totalEarned: balance?.totalEarned ?? 0,
      totalSpent: balance?.totalSpent ?? 0,
      history: includeHistory ? history : undefined,
    })
  } catch (error) {
    console.error("[CREDITS GET]", error)
    return NextResponse.json({ error: "Erro ao buscar saldo" }, { status: 500 })
  }
}

// POST /api/credits — gastar ou adicionar créditos
const spendSchema = z.object({
  action: z.enum(["spend", "add"]),
  amount: z.number().int().positive(),
  description: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = spendSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    const { action, amount, description, metadata } = parsed.data

    if (action === "spend") {
      const result = await spendCredits(
        session.user.id,
        amount,
        description,
        metadata as Prisma.InputJsonValue
      )
      if (!result.success) {
        return NextResponse.json({ error: result.error, balance: result.balance }, { status: 402 })
      }
      return NextResponse.json({ success: true, balance: result.balance })
    }

    if (action === "add") {
      // Only allow admins to add credits externally
      if (session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
      }
      const newBalance = await addCredits(
        session.user.id,
        amount,
        description,
        metadata as Prisma.InputJsonValue
      )
      return NextResponse.json({ success: true, balance: newBalance })
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
  } catch (error) {
    console.error("[CREDITS POST]", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
