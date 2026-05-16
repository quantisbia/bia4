import { NextRequest, NextResponse } from "next/server"
import {
  KNOWLEDGE_ALL,
  searchKnowledge,
  getCategories,
  type KnowledgeKind,
  type KnowledgeItem,
} from "@/lib/knowledge/dataset"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth/config"

/**
 * GET /api/knowledge/items
 *
 * Query params:
 *  - q          (string)  busca textual
 *  - kind       (KnowledgeKind | "all")  filtro por tipo
 *  - category   (string)  filtro por categoria
 *  - yearMin    (number)
 *  - yearMax    (number)
 *  - page       (number, default 1)
 *  - perPage    (number, default 20, max 100)
 *  - mine       ("1")     mostrar apenas uploads do usuário logado
 *
 * Retorna estática (dataset.ts) + uploads do DB (KnowledgeArticle.kind=user_upload)
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const q = url.searchParams.get("q") ?? ""
    const kindParam = url.searchParams.get("kind") ?? "all"
    const category = url.searchParams.get("category") ?? undefined
    const yearMin = url.searchParams.get("yearMin")
    const yearMax = url.searchParams.get("yearMax")
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10))
    const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("perPage") ?? "20", 10)))
    const mineOnly = url.searchParams.get("mine") === "1"

    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id

    // 1) Carregar uploads do DB (todos públicos + do usuário se logado)
    let dbItems: KnowledgeItem[] = []
    try {
      const where: Record<string, unknown> = {}
      if (mineOnly) {
        if (!userId) {
          dbItems = []
        } else {
          where.uploadedBy = userId
        }
      } else {
        where.OR = [{ isPublic: true }, ...(userId ? [{ uploadedBy: userId }] : [])]
      }
      const dbResults = await prisma.knowledgeArticle.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 500,
      })
      dbItems = dbResults.map((r) => ({
        id: r.id,
        kind: (r.kind as KnowledgeKind) ?? "user_upload",
        title: r.title,
        authors: r.authors?.join(", ") || undefined,
        year: r.year,
        source: r.source ?? "Upload do usuário",
        category: r.category,
        tags: r.tags ?? [],
        summary: r.abstract,
        url: r.url || r.fileUrl || "#",
        doi: r.doi ?? undefined,
      }))
    } catch (err) {
      // Em ambientes onde a tabela ainda não foi migrada, seguimos sem DB
      console.warn("[knowledge] DB indisponível, usando apenas dataset estático:", err)
    }

    // 2) Combinar
    const all = [...KNOWLEDGE_ALL, ...dbItems]

    // 3) Filtrar
    const filtered = searchKnowledge(all, q, {
      kind: kindParam as KnowledgeKind | "all",
      category,
      yearMin: yearMin ? parseInt(yearMin, 10) : undefined,
      yearMax: yearMax ? parseInt(yearMax, 10) : undefined,
    })

    // 4) Paginar
    const total = filtered.length
    const start = (page - 1) * perPage
    const items = filtered.slice(start, start + perPage)

    // 5) Stats
    const stats = {
      total,
      articles: filtered.filter((i) => i.kind === "article").length,
      patents: filtered.filter((i) => i.kind === "patent").length,
      methods: filtered.filter((i) => i.kind === "methodology").length,
      uploads: filtered.filter((i) => i.kind === "user_upload").length,
    }

    return NextResponse.json({
      success: true,
      items,
      page,
      perPage,
      total,
      stats,
      categories: getCategories(all),
    })
  } catch (error) {
    console.error("[knowledge/items] error:", error)
    return NextResponse.json(
      { success: false, error: "Falha ao listar itens" },
      { status: 500 }
    )
  }
}
