import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { requireCredits } from "@/lib/auth/credits"
import { searchKnowledgeArticles } from "@/lib/db/queries"
import { searchKnowledgeWithAI } from "@/lib/ai/biomaterials"
import { Prisma } from "@prisma/client"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q") ?? ""
  const category = searchParams.get("category") ?? ""
  const limit = parseInt(searchParams.get("limit") ?? "12")
  const aiSearch = searchParams.get("ai") === "true"

  if (!query && !category) {
    // Retornar artigos mais recentes
    const articles = await searchKnowledgeArticles("", limit)
    return NextResponse.json({ articles, total: articles.length })
  }

  const articles = await searchKnowledgeArticles(query || category, limit)

  // Se AI search solicitado
  if (aiSearch && query && articles.length > 0) {
    const session = await auth()
    if (session?.user?.id) {
      // Gastar 1 crédito para busca com IA
      const creditCheck = await requireCredits(
        session.user.id,
        "KNOWLEDGE_SEARCH",
        `Busca IA: ${query}`,
        { query } as Prisma.InputJsonValue
      )

      if (!creditCheck) {
        const aiResult = await searchKnowledgeWithAI(query, articles.map((a) => ({
          title: a.title,
          abstract: a.abstract ?? "",
          doi: a.doi ?? "",
        })))
        return NextResponse.json({ articles, total: articles.length, aiSummary: aiResult.summary })
      }
    }
  }

  return NextResponse.json({ articles, total: articles.length })
}
