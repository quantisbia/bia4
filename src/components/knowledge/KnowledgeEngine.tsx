"use client"

/**
 * Motor de Conhecimento (R12)
 *
 * UI principal: busca + tabs (Todos/Artigos/Patentes/Metodologias/Meus Uploads)
 * + filtro por categoria + cards com link real + botão de upload
 */

import { useEffect, useState, useCallback } from "react"
import {
  BookOpen, FileText, Briefcase, Wrench, Upload, Search,
  ExternalLink, X, Filter, Loader2, Plus, Globe, FlaskConical,
  Trash2, Lock,
} from "lucide-react"
import { useT } from "@/components/providers/LocaleProvider"
import { cn } from "@/lib/utils/helpers"
import type { KnowledgeKind, KnowledgeItem } from "@/lib/knowledge/dataset"

type Tab = "all" | "article" | "patent" | "methodology" | "user_upload"

interface ApiResponse {
  success: boolean
  items: KnowledgeItem[]
  page: number
  perPage: number
  total: number
  stats: { total: number; articles: number; patents: number; methods: number; uploads: number }
  categories: string[]
}

const KIND_META: Record<Exclude<Tab, "all">, { icon: typeof FileText; label: string; color: string }> = {
  article:      { icon: FileText,    label: "Artigo",      color: "from-quantis-purple-600 to-quantis-lilac-500" },
  patent:       { icon: Briefcase,   label: "Patente",     color: "from-quantis-wine-600 to-quantis-wine-400" },
  methodology:  { icon: Wrench,      label: "Metodologia", color: "from-quantis-blue-600 to-quantis-blue-400" },
  user_upload:  { icon: Upload,      label: "Upload",      color: "from-quantis-gold-500 to-quantis-gold-300" },
}

export function KnowledgeEngine() {
  const t = useT()
  const [tab, setTab] = useState<Tab>("all")
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [category, setCategory] = useState<string>("")
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [page, setPage] = useState(1)

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(id)
  }, [query])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedQuery) params.set("q", debouncedQuery)
      if (tab !== "all") params.set("kind", tab)
      if (category) params.set("category", category)
      params.set("page", String(page))
      params.set("perPage", "30")
      if (tab === "user_upload") params.set("mine", "1")

      const res = await fetch(`/api/knowledge/items?${params.toString()}`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error("Erro ao buscar:", err)
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, tab, category, page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [debouncedQuery, tab, category])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-quantis-purple-600 to-quantis-lilac-500 shadow-quantis-glow">
              <BookOpen className="w-5 h-5 text-white" />
            </span>
            {t("knowledge.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            {t("knowledge.subtitle")}
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-quantis-purple-600 to-quantis-lilac-500 text-white font-medium text-sm shadow-quantis-glow hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus className="w-4 h-4" />
          {t("knowledge.upload.button")}
        </button>
      </div>

      {/* Stats pills */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatPill icon={FileText} label={t("knowledge.tab.articles")} value={data.stats.articles} accent="purple" />
          <StatPill icon={Briefcase} label={t("knowledge.tab.patents")} value={data.stats.patents} accent="wine" />
          <StatPill icon={Wrench} label={t("knowledge.tab.methods")} value={data.stats.methods} accent="blue" />
          <StatPill icon={Upload} label={t("knowledge.tab.uploads")} value={data.stats.uploads} accent="gold" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-border">
        <TabButton active={tab === "all"} onClick={() => setTab("all")}>{t("knowledge.tab.all")}</TabButton>
        <TabButton active={tab === "article"} onClick={() => setTab("article")} icon={FileText}>{t("knowledge.tab.articles")}</TabButton>
        <TabButton active={tab === "patent"} onClick={() => setTab("patent")} icon={Briefcase}>{t("knowledge.tab.patents")}</TabButton>
        <TabButton active={tab === "methodology"} onClick={() => setTab("methodology")} icon={Wrench}>{t("knowledge.tab.methods")}</TabButton>
        <TabButton active={tab === "user_upload"} onClick={() => setTab("user_upload")} icon={Upload}>{t("knowledge.tab.uploads")}</TabButton>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("knowledge.search.placeholder")}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-quantis-purple-500 focus:ring-2 focus:ring-quantis-purple-500/20 transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:border-quantis-purple-500 min-w-[200px]"
        >
          <option value="">{t("knowledge.filter.all_categories")}</option>
          {data?.categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          {t("common.loading")}
        </div>
      )}

      {!loading && data && data.items.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">{t("knowledge.no_results")}</p>
        </div>
      )}

      {!loading && data && data.items.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.items.map((item) => (
              <KnowledgeCard key={item.id} item={item} onDeleted={fetchData} />
            ))}
          </div>

          {/* Pagination */}
          {data.total > data.perPage && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-border bg-card text-sm disabled:opacity-40 hover:bg-quantis-purple-500/10"
              >
                ‹
              </button>
              <span className="text-xs text-muted-foreground px-2">
                {page} / {Math.ceil(data.total / data.perPage)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * data.perPage >= data.total}
                className="px-3 py-1.5 rounded-lg border border-border bg-card text-sm disabled:opacity-40 hover:bg-quantis-purple-500/10"
              >
                ›
              </button>
            </div>
          )}
        </>
      )}

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            setShowUpload(false)
            fetchData()
          }}
        />
      )}
    </div>
  )
}

/* ───────────────────────── Helpers ───────────────────────── */

function StatPill({
  icon: Icon, label, value, accent,
}: {
  icon: typeof FileText
  label: string
  value: number
  accent: "purple" | "wine" | "blue" | "gold"
}) {
  const colors = {
    purple: "from-quantis-purple-500/20 to-quantis-lilac-500/10 text-quantis-purple-300 border-quantis-purple-500/30",
    wine: "from-quantis-wine-500/20 to-quantis-wine-400/10 text-quantis-wine-300 border-quantis-wine-500/30",
    blue: "from-quantis-blue-500/20 to-quantis-blue-400/10 text-quantis-blue-300 border-quantis-blue-500/30",
    gold: "from-quantis-gold-500/20 to-quantis-gold-300/10 text-quantis-gold-400 border-quantis-gold-500/30",
  }
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-xl border bg-gradient-to-br",
      colors[accent]
    )}>
      <Icon className="w-4 h-4 shrink-0" />
      <div className="min-w-0">
        <div className="text-lg font-bold leading-none text-foreground">{value}</div>
        <div className="text-[10px] uppercase tracking-wider opacity-80 mt-0.5">{label}</div>
      </div>
    </div>
  )
}

function TabButton({
  active, onClick, children, icon: Icon,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  icon?: typeof FileText
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
        active
          ? "border-quantis-purple-500 text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  )
}

function KnowledgeCard({ item, onDeleted }: { item: KnowledgeItem; onDeleted?: () => void }) {
  const t = useT()
  const meta = KIND_META[(item.kind === "user_upload" ? "user_upload" : item.kind) as Exclude<Tab, "all">] ?? KIND_META.article
  const Icon = meta.icon
  const [deleting, setDeleting] = useState(false)

  const isUserUpload = item.kind === "user_upload"

  async function handleDelete() {
    if (!confirm("Remover este upload da BIA?")) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/knowledge/upload?id=${item.id}`, { method: "DELETE" })
      if (res.ok) onDeleted?.()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="group flex flex-col bg-card border border-border rounded-xl p-4 hover:border-quantis-purple-500/40 hover:shadow-quantis-card transition-all">
      {/* Header */}
      <div className="flex items-start gap-2 mb-3">
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-gradient-to-r text-white",
          meta.color
        )}>
          <Icon className="w-3 h-3" />
          {meta.label}
        </span>
        {item.year && (
          <span className="text-[10px] text-muted-foreground font-mono">{item.year}</span>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-wider">{item.category}</span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-foreground leading-snug mb-2 line-clamp-2">
        {item.title}
      </h3>

      {/* Authors */}
      {item.authors && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{item.authors}</p>
      )}

      {/* Source */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-2">
        <Globe className="w-3 h-3" />
        <span className="font-medium">{item.source}</span>
        {item.doi && <span className="font-mono opacity-70">· {item.doi}</span>}
        {item.patentNumber && <span className="font-mono opacity-70">· {item.patentNumber}</span>}
      </div>

      {/* Summary */}
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-3">
        {item.summary}
      </p>

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {item.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded bg-quantis-purple-500/10 text-quantis-lilac-300 border border-quantis-purple-500/20"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto pt-2 border-t border-border flex items-center gap-2">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-quantis-purple-500/10 text-quantis-lilac-300 hover:bg-quantis-purple-500/20 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          {t("knowledge.open_link")}
        </a>
        {item.citations !== undefined && item.citations > 0 && (
          <span className="text-[10px] text-muted-foreground font-mono">{item.citations} citações</span>
        )}
        {isUserUpload && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-quantis-wine-400 hover:bg-quantis-wine-500/10 transition-colors"
            title="Remover"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const t = useT()
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [authors, setAuthors] = useState("")
  const [year, setYear] = useState<string>(String(new Date().getFullYear()))
  const [kind, setKind] = useState<KnowledgeKind>("article")
  const [category, setCategory] = useState("Geral")
  const [tags, setTags] = useState("")
  const [abstract, setAbstract] = useState("")
  const [externalUrl, setExternalUrl] = useState("")
  const [doi, setDoi] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const fd = new FormData()
      if (file) fd.append("file", file)
      fd.append("title", title)
      fd.append("authors", authors)
      fd.append("year", year)
      fd.append("kind", kind)
      fd.append("category", category)
      fd.append("tags", tags)
      fd.append("abstract", abstract)
      fd.append("url", externalUrl)
      fd.append("doi", doi)
      fd.append("isPublic", String(isPublic))

      const res = await fetch("/api/knowledge/upload", {
        method: "POST",
        body: fd,
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? "Erro desconhecido")
        return
      }
      onUploaded()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no upload")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-quantis-lilac-400" />
              {t("knowledge.upload.title")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("knowledge.upload.desc")}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-quantis-purple-500/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* File */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              {t("knowledge.upload.file")} (PDF / DOCX / TXT / MD — máx. 10MB)
            </label>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md,.markdown,application/pdf,text/plain"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-quantis-purple-500/10 file:text-quantis-lilac-300 file:font-medium hover:file:bg-quantis-purple-500/20 transition-all"
            />
          </div>

          {/* Title */}
          <Field label="Título *">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              className="form-input"
              placeholder="Título do artigo, patente ou metodologia"
            />
          </Field>

          {/* Type + Year */}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("knowledge.upload.kind")}>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as KnowledgeKind)}
                className="form-input"
              >
                <option value="article">Artigo científico</option>
                <option value="patent">Patente</option>
                <option value="methodology">Metodologia / Protocolo</option>
                <option value="user_upload">Outro</option>
              </select>
            </Field>
            <Field label="Ano">
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                min={1900}
                max={2100}
                className="form-input"
              />
            </Field>
          </div>

          {/* Authors */}
          <Field label="Autores (vírgula-separado)">
            <input
              type="text"
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
              className="form-input"
              placeholder="Smith J, Doe A, Silva M"
            />
          </Field>

          {/* Category */}
          <Field label={t("knowledge.upload.category_field")}>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="form-input"
              placeholder="Bioink / Cartilagem / Osso / GelMA..."
            />
          </Field>

          {/* Tags */}
          <Field label={t("knowledge.upload.tags")}>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="form-input"
              placeholder="hidrogel, scaffold, viabilidade"
            />
          </Field>

          {/* External URL + DOI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="URL externa (opcional)">
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                className="form-input"
                placeholder="https://doi.org/..."
              />
            </Field>
            <Field label="DOI / Nº Patente (opcional)">
              <input
                type="text"
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
                className="form-input"
                placeholder="10.1038/..."
              />
            </Field>
          </div>

          {/* Abstract */}
          <Field label="Resumo (1-3 linhas)">
            <textarea
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              rows={3}
              className="form-input resize-none"
              placeholder="Breve descrição do conteúdo..."
            />
          </Field>

          {/* Public */}
          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded border-border accent-quantis-purple-500"
            />
            <span>{t("knowledge.upload.public")}</span>
            {!isPublic && <Lock className="w-3 h-3 text-muted-foreground ml-1" />}
          </label>

          {error && (
            <div className="text-xs text-quantis-wine-400 bg-quantis-wine-500/10 border border-quantis-wine-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting || title.length < 3}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-quantis-purple-600 to-quantis-lilac-500 text-white font-medium text-sm shadow-quantis-glow hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {submitting ? "Enviando..." : t("knowledge.upload.submit")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border text-sm text-foreground hover:bg-quantis-purple-500/10"
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>

        {/* Reusable form-input class via inline style helper */}
        <style jsx>{`
          .form-input {
            width: 100%;
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
            border-radius: 0.5rem;
            background-color: hsl(var(--background));
            color: hsl(var(--foreground));
            border: 1px solid hsl(var(--border));
            outline: none;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
          }
          .form-input:focus {
            border-color: hsl(268 84% 60%);
            box-shadow: 0 0 0 3px hsl(268 84% 60% / 0.2);
          }
        `}</style>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-foreground mb-1.5">{label}</label>
      {children}
    </div>
  )
}
