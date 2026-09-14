"use client"

/**
 * BIA · Notebook · EntryList — R12.69
 *
 * Nível 2 da UI hierárquica: lista de entradas de um projeto (ou "todas" /
 * "sem projeto"), com busca global e 4 filtros aprovados pela Janaina:
 *  1. Tipo (usa ENTRY_TYPES existente)
 *  2. Data (últimos 7d/30d/90d/todos)
 *  3. Tem imagens? (checkbox — filtro client-side sobre _count.images)
 *  4. Pinned only (usa param existente ?pinned=true)
 *
 * Busca global (via API): faz match em title / content / category / tags.
 * Debounce de 250ms para não bombardear o backend.
 */

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import {
  Search, Filter, Loader2, Pin, ImageIcon, GitBranch, Clock,
  X, RefreshCw, AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import type { ProjectSelection } from "./ProjectSidebar"

// ─── Types ───────────────────────────────────────────────────────

export interface EntryItem {
  id: string
  title: string
  entryType: string
  category: string | null
  tags: string[]
  sourceType: string | null
  isPinned: boolean
  createdAt: string
  updatedAt: string
  projectId: string | null
  currentVersion: number
  _count?: { images: number; versions: number }
}

export interface EntryListProps {
  projectSelection: ProjectSelection
  selectedEntryId: string | null
  onSelectEntry: (id: string) => void
  /** Força reload (ex: após salvar nova entrada em outro lugar) */
  reloadKey?: string | number
  /** Classe extra no container. */
  className?: string
}

// Mesmos tipos do notebook/page.tsx — não importamos para evitar acoplamento
const ENTRY_TYPES: Array<{ value: string; label: string; color: string }> = [
  { value: "ALL",              label: "Todos",             color: "indigo" },
  { value: "NOTE",             label: "Nota",              color: "gray"   },
  { value: "PROTOCOL",         label: "Protocolo",         color: "violet" },
  { value: "FORMULATION",      label: "Formulação",        color: "blue"   },
  { value: "PIPELINE_SUMMARY", label: "Pipeline",          color: "emerald"},
  { value: "ARTICLE_DRAFT",    label: "Artigo",            color: "amber"  },
  { value: "PATENT_DRAFT",     label: "Patente",           color: "orange" },
  { value: "BOOK_CHAPTER",     label: "Cap. Livro",        color: "purple" },
  { value: "RESEARCH_LOG",     label: "Log Pesquisa",      color: "teal"   },
  { value: "REFERENCE",        label: "Referência",        color: "pink"   },
  { value: "STL_GEOMETRY",     label: "Geometria 3D",      color: "cyan"   },
]

const PILL: Record<string, string> = {
  gray:    "bg-gray-500/15 text-gray-300",
  indigo:  "bg-indigo-500/15 text-indigo-300",
  violet:  "bg-violet-500/15 text-violet-300",
  blue:    "bg-blue-500/15 text-blue-300",
  emerald: "bg-emerald-500/15 text-emerald-300",
  amber:   "bg-amber-500/15 text-amber-300",
  orange:  "bg-orange-500/15 text-orange-300",
  purple:  "bg-purple-500/15 text-purple-300",
  teal:    "bg-teal-500/15 text-teal-300",
  pink:    "bg-pink-500/15 text-pink-300",
  cyan:    "bg-cyan-500/15 text-cyan-300",
}

function typeColor(t: string): string {
  return ENTRY_TYPES.find((x) => x.value === t)?.color ?? "gray"
}
function typeLabel(t: string): string {
  return ENTRY_TYPES.find((x) => x.value === t)?.label ?? t
}

// ─── Componente ──────────────────────────────────────────────────

export function EntryList({
  projectSelection,
  selectedEntryId,
  onSelectEntry,
  reloadKey,
  className,
}: EntryListProps) {
  const [entries, setEntries] = useState<EntryItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("") // debounced
  const [typeFilter, setTypeFilter] = useState("ALL")
  const [sinceDays, setSinceDays] = useState<"" | "7" | "30" | "90">("")
  const [hasImagesOnly, setHasImagesOnly] = useState(false)
  const [pinnedOnly, setPinnedOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Debounce da busca
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setSearch(searchInput.trim()), 250)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [searchInput])

  // Params computados
  const queryParams = useMemo(() => {
    const p = new URLSearchParams()
    if (typeFilter !== "ALL") p.set("type", typeFilter)
    if (search) p.set("q", search)
    if (pinnedOnly) p.set("pinned", "true")
    if (sinceDays) p.set("sinceDays", sinceDays)
    // Project selection
    if (projectSelection.kind === "none") p.set("projectId", "null")
    else if (projectSelection.kind === "project") p.set("projectId", projectSelection.id)
    // "all" não seta projectId (não filtra)
    p.set("pageSize", "50")
    return p
  }, [typeFilter, search, pinnedOnly, sinceDays, projectSelection])

  // Load
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/notebook?${queryParams.toString()}`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error ?? `Falha (${res.status})`)
      }
      const data = await res.json()
      setEntries(data.entries ?? [])
      setTotal(data.total ?? 0)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [queryParams])

  useEffect(() => {
    load()
  }, [load, reloadKey])

  // hasImages é filtro client-side (para não complicar o backend)
  const filtered = useMemo(() => {
    if (!hasImagesOnly) return entries
    return entries.filter((e) => (e._count?.images ?? 0) > 0)
  }, [entries, hasImagesOnly])

  const activeFilterCount = [
    typeFilter !== "ALL",
    !!sinceDays,
    hasImagesOnly,
    pinnedOnly,
  ].filter(Boolean).length

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-white/[0.01] border-r border-white/5",
        className,
      )}
      data-testid="entry-list"
    >
      {/* Header + busca */}
      <div className="px-3 py-3 border-b border-white/5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wide truncate">
              {projectSelection.kind === "all"
                ? "Todas as entradas"
                : projectSelection.kind === "none"
                  ? "Sem projeto"
                  : projectSelection.name}
            </h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-gray-500">
              {loading ? "…" : total}
            </span>
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "flex items-center gap-1 text-[11px] px-2 py-1 rounded-md transition-colors",
              activeFilterCount > 0
                ? "bg-violet-500/15 text-violet-300"
                : "text-gray-400 hover:bg-white/5 hover:text-white",
            )}
            data-testid="entry-list-filters-toggle"
          >
            <Filter className="w-3 h-3" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="ml-0.5 rounded-full bg-violet-500 text-white text-[9px] w-4 h-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Busca global */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar título, conteúdo, tag, categoria…"
            className="w-full rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 pl-8 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            data-testid="entry-list-search"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              aria-label="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="space-y-2 pt-1" data-testid="entry-list-filters">
            {/* Tipo */}
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1 uppercase tracking-wide">
                Tipo
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full rounded-md bg-white/5 border border-white/10 text-xs text-white px-2 py-1 focus:outline-none focus:border-violet-500/40"
                data-testid="entry-list-filter-type"
              >
                {ENTRY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Data */}
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1 uppercase tracking-wide">
                Data
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { v: "", l: "Todos" },
                  { v: "7", l: "7d" },
                  { v: "30", l: "30d" },
                  { v: "90", l: "90d" },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setSinceDays(opt.v as typeof sinceDays)}
                    className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
                      sinceDays === opt.v
                        ? "bg-violet-500/25 text-white border border-violet-500/40"
                        : "bg-white/5 text-gray-400 border border-white/5 hover:text-white",
                    )}
                    data-testid={`entry-list-filter-date-${opt.v || "all"}`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasImagesOnly}
                  onChange={(e) => setHasImagesOnly(e.target.checked)}
                  className="accent-violet-600"
                  data-testid="entry-list-filter-has-images"
                />
                <ImageIcon className="w-3 h-3 text-gray-500" />
                <span>Só com imagens</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pinnedOnly}
                  onChange={(e) => setPinnedOnly(e.target.checked)}
                  className="accent-violet-600"
                  data-testid="entry-list-filter-pinned"
                />
                <Pin className="w-3 h-3 text-gray-500" />
                <span>Só fixadas</span>
              </label>
            </div>

            {/* Reset */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setTypeFilter("ALL")
                  setSinceDays("")
                  setHasImagesOnly(false)
                  setPinnedOnly(false)
                }}
                className="w-full flex items-center justify-center gap-1 py-1 rounded-md text-[10px] text-gray-500 hover:text-white hover:bg-white/5"
              >
                <RefreshCw className="w-3 h-3" />
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center gap-2 px-3 py-4 text-xs text-gray-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Carregando…
          </div>
        )}
        {error && (
          <div className="mx-3 my-2 rounded-md bg-red-500/10 border border-red-500/20 p-2 text-xs text-red-300 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-gray-500">
              {activeFilterCount > 0 || search
                ? "Nenhuma entrada com esses filtros."
                : "Nenhuma entrada ainda neste escopo."}
            </p>
          </div>
        )}

        {filtered.map((e) => {
          const isSel = e.id === selectedEntryId
          const color = typeColor(e.entryType)
          return (
            <button
              key={e.id}
              onClick={() => onSelectEntry(e.id)}
              data-testid={`entry-list-item-${e.id}`}
              className={cn(
                "w-full text-left px-3 py-2.5 border-l-2 transition-colors group",
                isSel
                  ? "bg-violet-500/10 border-violet-500"
                  : "border-transparent hover:bg-white/5",
              )}
            >
              <div className="flex items-start gap-2">
                {e.isPinned && (
                  <Pin className="w-3 h-3 mt-0.5 text-amber-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className={cn(
                        "text-[9px] font-medium px-1.5 py-0.5 rounded",
                        PILL[color] ?? PILL.gray,
                      )}
                    >
                      {typeLabel(e.entryType)}
                    </span>
                    {e.currentVersion > 1 && (
                      <span
                        className="flex items-center gap-0.5 text-[9px] text-violet-400"
                        title={`${e.currentVersion} versões`}
                      >
                        <GitBranch className="w-2.5 h-2.5" />v{e.currentVersion}
                      </span>
                    )}
                    {(e._count?.images ?? 0) > 0 && (
                      <span
                        className="flex items-center gap-0.5 text-[9px] text-gray-500"
                        title={`${e._count?.images} imagens`}
                      >
                        <ImageIcon className="w-2.5 h-2.5" />
                        {e._count?.images}
                      </span>
                    )}
                  </div>
                  <h4
                    className={cn(
                      "text-xs font-medium leading-tight line-clamp-2",
                      isSel ? "text-white" : "text-gray-200",
                    )}
                  >
                    {e.title}
                  </h4>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{formatRelative(e.updatedAt)}</span>
                    {e.tags.slice(0, 2).map((t) => (
                      <span key={t} className="text-gray-600">
                        · {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatRelative(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diffMs = now - d.getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return "agora"
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const day = Math.floor(h / 24)
  if (day < 7) return `há ${day} d`
  if (day < 30) return `há ${Math.floor(day / 7)} sem`
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: day > 365 ? "numeric" : undefined,
  }).format(d)
}
