import { NextResponse, type NextRequest } from "next/server"

/**
 * Serve o manual da BIA — busca o arquivo estático público via fetch
 * para garantir que sempre temos a versão mais recente (sem cache do
 * readFileSync no build standalone).
 */
export async function GET(request: NextRequest) {
  try {
    const origin = request.nextUrl.origin
    const res = await fetch(`${origin}/manual-bia-v4.html`, {
      cache: "no-store",
    })

    if (!res.ok) {
      return new NextResponse("Manual não encontrado", { status: 404 })
    }

    const content = await res.text()
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, must-revalidate",
      },
    })
  } catch (err) {
    console.error("[/api/manual]", err)
    return new NextResponse("Erro ao carregar manual", { status: 500 })
  }
}

export const dynamic = "force-dynamic"
