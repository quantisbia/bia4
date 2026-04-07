"use client"

import { useState, useEffect, useCallback } from "react"
import { BookOpen, Search, Loader2, ExternalLink, Tag, Sparkles, X } from "lucide-react"

interface KnowledgeArticle {
  id: string; title: string; authors: string[]; journal: string; year: number
  doi?: string; abstract?: string; keywords: string[]; category: string
  citations: number; readTime?: number
}
interface SearchResult { articles: KnowledgeArticle[]; total: number; aiSummary?: string }

const CATEGORIES = [
  { value: "", label: "Todos" },
  { value: "BIOMATERIALS", label: "Biomateriais" },
  { value: "TISSUE_ENGINEERING", label: "Eng. Tecidos" },
  { value: "ORGANOIDS", label: "Organoides" },
  { value: "BIOPRINTING", label: "Bioimpressão" },
  { value: "STEM_CELLS", label: "Células-tronco" },
  { value: "BIOREACTORS", label: "Biorreatores" },
]

const CAT_COLORS: Record<string, string> = {
  BIOMATERIALS: "text-blue-400 bg-blue-500/10",
  TISSUE_ENGINEERING: "text-emerald-400 bg-emerald-500/10",
  ORGANOIDS: "text-purple-400 bg-purple-500/10",
  BIOPRINTING: "text-teal-400 bg-teal-500/10",
  STEM_CELLS: "text-amber-400 bg-amber-500/10",
  BIOREACTORS: "text-rose-400 bg-rose-500/10",
}

export default function KnowledgePage() {
  const [result, setResult]     = useState<SearchResult>({ articles: [], total: 0 })
  const [search, setSearch]     = useState("")
  const [category, setCategory] = useState("")
  const [loading, setLoading]   = useState(false)
  const [aiSearch, setAiSearch] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const loadArticles = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("q", search)
      if (category) params.set("category", category)
      if (aiSearch && search) params.set("ai", "true")
      params.set("limit", "20")
      const res = await fetch(`/api/knowledge?${params}`)
      if (res.ok) setResult(await res.json())
    } finally { setLoading(false) }
  }, [search, category, aiSearch])

  useEffect(() => {
    const t = setTimeout(loadArticles, 400)
    return () => clearTimeout(t)
  }, [loadArticles])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-white/5 shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              Base de Conhecimento
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {result.total.toLocaleString("pt-BR")} artigos científicos
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar títulos, autores, palavras-chave..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20" />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-amber-500/20 transition-colors shrink-0">
            <input type="checkbox" checked={aiSearch} onChange={e => setAiSearch(e.target.checked)}
              className="accent-amber-500 w-3.5 h-3.5" />
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:block text-xs text-gray-300">IA</span>
          </label>
        </div>

        {/* Categories — horizontal scroll */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button key={cat.value} onClick={() => setCategory(cat.value)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                category === cat.value
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/20"
                  : "text-gray-500 hover:text-gray-300 bg-white/3 border border-white/5"
              }`}>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI Summary */}
      {result.aiSummary && (
        <div className="mx-4 sm:mx-6 mt-3 p-3 sm:p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-300">Resumo IA para &ldquo;{search}&rdquo;</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">{result.aiSummary}</p>
        </div>
      )}

      {/* Articles */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
          </div>
        ) : result.articles.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Nenhum artigo encontrado</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {result.articles.map((article) => (
              <div key={article.id}
                className="rounded-xl border border-white/5 bg-white/2 hover:border-white/10 transition-all">
                <button onClick={() => setExpanded(expanded === article.id ? null : article.id)}
                  className="w-full text-left p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${CAT_COLORS[article.category] ?? "text-gray-400 bg-gray-500/10"}`}>
                          {article.category?.replace("_", " ")}
                        </span>
                        <span className="text-[10px] text-gray-500">{article.year}</span>
                        {article.citations > 0 && (
                          <span className="text-[10px] text-gray-600">{article.citations} cit.</span>
                        )}
                      </div>
                      <h3 className="text-xs sm:text-sm font-semibold text-white leading-snug">{article.title}</h3>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {article.authors?.slice(0, 2).join(", ")}
                        {article.authors?.length > 2 && " et al."}
                        {article.journal && ` • ${article.journal}`}
                      </p>
                    </div>
                    {article.doi && (
                      <a href={`https://doi.org/${article.doi}`} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="shrink-0 text-gray-600 hover:text-amber-400 transition-colors p-1">
                        <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </a>
                    )}
                  </div>
                  {expanded === article.id && article.abstract && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <p className="text-xs text-gray-400 leading-relaxed">{article.abstract}</p>
                      {article.keywords?.length > 0 && (
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          <Tag className="w-3 h-3 text-gray-600 shrink-0" />
                          {article.keywords.map((kw, i) => (
                            <button key={i} onClick={e => { e.stopPropagation(); setSearch(kw) }}
                              className="text-[10px] px-2 py-0.5 bg-white/5 rounded-md text-gray-500 hover:text-gray-300 transition-colors active:scale-95">
                              {kw}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
