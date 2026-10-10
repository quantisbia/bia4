"use client"

/**
 * BIA · Academy · R13.14 · Tabs + busca da biblioteca (client)
 */
import { useState, useTransition, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Search, FileText, Microscope, FlaskConical, X } from "lucide-react"

const TABS = [
  { key: "materials", label: "Materiais das aulas", icon: FileText },
  { key: "papers", label: "Papers & Patentes", icon: Microscope },
  { key: "whitepapers", label: "White Papers Quantis", icon: FlaskConical },
] as const

const MATERIAL_TYPES = ["PDF", "LINK", "STL", "GCODE", "IMAGE"] as const

export function LibraryTabs({
  activeTab,
  search,
  typeFilter,
  counts,
}: {
  activeTab: "materials" | "papers" | "whitepapers"
  search: string
  typeFilter: string
  counts: { materials: number; papers: number; whitepapers: number }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const [draft, setDraft] = useState(search)

  // Debounce para a busca
  useEffect(() => {
    const t = setTimeout(() => {
      if (draft === search) return
      updateQuery({ q: draft || undefined })
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  function updateQuery(patch: Record<string, string | undefined>) {
    const url = new URL(window.location.href)
    for (const [k, v] of Object.entries(patch)) {
      if (!v) url.searchParams.delete(k)
      else url.searchParams.set(k, v)
    }
    const next = `${pathname}?${url.searchParams.toString()}`
    startTransition(() => router.push(next, { scroll: false }))
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Categorias da biblioteca"
        data-testid="library-tabs"
        className="flex items-center gap-2 border-b border-white/[0.08] overflow-x-auto"
      >
        {TABS.map((t) => {
          const Icon = t.icon
          const isActive = activeTab === t.key
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => updateQuery({ tab: t.key })}
              data-testid={`library-tab-${t.key}`}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? "border-fuchsia-500 text-white"
                  : "border-transparent text-gray-400 hover:text-gray-200 hover:border-white/[0.15]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                isActive ? "bg-fuchsia-500/20 text-fuchsia-200" : "bg-white/[0.04] text-gray-500"
              }`}>
                {counts[t.key]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Busca + filtro */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Buscar por título, autor, DOI, keyword…"
            data-testid="library-search-input"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-fuchsia-500/40 focus:bg-white/[0.06] transition-all"
          />
          {draft && (
            <button
              type="button"
              onClick={() => setDraft("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/[0.08]"
            >
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
          )}
        </div>

        {activeTab === "materials" && (
          <select
            value={typeFilter}
            onChange={(e) => updateQuery({ type: e.target.value || undefined })}
            data-testid="library-type-filter"
            className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-fuchsia-500/40 cursor-pointer"
          >
            <option value="">Todos os tipos</option>
            {MATERIAL_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
