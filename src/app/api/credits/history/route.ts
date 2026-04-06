import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { getCreditHistory } from "@/lib/db/queries"

// GET /api/credits/history — histórico paginado
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100)

    const history = await getCreditHistory(session.user.id, limit)

    return NextResponse.json({ history })
  } catch (error) {
    console.error("[CREDITS HISTORY]", error)
    return NextResponse.json({ error: "Erro ao buscar histórico" }, { status: 500 })
  }
}
