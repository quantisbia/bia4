"use client"

/**
 * BIA · Notebook · VersionDiff — R12.69
 *
 * Nível 3 (parte 2): comparação visual side-by-side entre 2 versões.
 * Consumo: GET /api/notebook/[id]/versions/[version]?compareTo=[other]
 *
 * Design (opção A aprovada pela Janaina — simples, sem lib externa):
 *  - Backend já entrega `changedFields[]` e `diff[]` no response
 *  - UI mostra 2 colunas lado a lado — Antiga (esq) vs Nova (dir)
 *  - Campos alterados ficam com background âmbar; campos idênticos
 *    ficam esmaecidos
 *  - Em telas pequenas, empilha (uma coluna abaixo da outra)
 *  - Snapshot é JSON estruturado (title/content/tags/etc) — para cada
 *    campo mostramos formatação apropriada (título → h3, tags → pills,
 *    content → block de texto scrollável)
 */

import { useEffect, useState, useCallback } from "react"
import {
  GitCompare, Loader2, AlertTriangle, X, ArrowLeftRight,
  Check, Minus, Plus,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

// ─── Types ───────────────────────────────────────────────────────

interface EntrySnapshot {
  title: string
  content: string
  entryType?: string
  category?: string | null
  tags?: string[]
  generatedDoc?: unknown
  metadata?: unknown
  projectId?: string | null
}

interface DiffResponse {
  entryId: string
  versionA: number // versão "esquerda"
  versionB: number // versão "direita"
  snapshotA: EntrySnapshot
  snapshotB: EntrySnapshot
  changedFields: string[]
  diff: Array<{ field: string; before: unknown; after: unknown }>
}

// Campos que renderizamos (na ordem)
const FIELD_LABELS: Array<{ key: keyof EntrySnapshot; label: string }> = [
  { key: "title", label: "Título" },
  { key: "entryType", label: "Tipo" },
  { key: "category", label: "Categoria" },
  { key: "tags", label: "Tags" },
  { key: "projectId", label: "Projeto" },
  { key: "content", label: "Conteúdo" },
]

// ─── Props ───────────────────────────────────────────────────────

export interface VersionDiffProps {
  entryId: string
  /** versão MAIS NOVA (aparece à direita) */
  versionNew: number
  /** versão MAIS ANTIGA (aparece à esquerda) */
  versionOld: number
  onClose: () => void
}

// ─── Componente ──────────────────────────────────────────────────

export function VersionDiff({
  entryId,
  versionNew,
  versionOld,
  onClose,
}: VersionDiffProps) {
  const [data, setData] = useState<DiffResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Sempre buscamos com versão MAIS NOVA como principal, comparando com a mais antiga
      const res = await fetch(
        `/api/notebook/${entryId}/versions/${versionNew}?compareTo=${versionOld}`,
      )
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error ?? `Falha (${res.status})`)
      }
      const body = await res.json()
      setData(body as DiffResponse)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [entryId, versionNew, versionOld])

  useEffect(() => {
    load()
  }, [load])

  // Padroniza: A = mais antiga (esq), B = mais nova (dir)
  // Como pedimos ao backend com principal=versionNew e compareTo=versionOld,
  // a resposta pode vir invertida — vamos normalizar aqui:
  const A_ver = versionOld
  const B_ver = versionNew
  const snapshotA: EntrySnapshot | undefined = data
    ? data.versionA === versionOld
      ? data.snapshotA
      : data.snapshotB
    : undefined
  const snapshotB: EntrySnapshot | undefined = data
    ? data.versionA === versionOld
      ? data.snapshotB
      : data.snapshotA
    : undefined
  const changedFields = data?.changedFields ?? []

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      data-testid="version-diff"
    >
      <div
        className="w-full max-w-6xl h-[85vh] rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <GitCompare className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <h2 className="text-sm font-semibold text-white truncate">
              Comparar versões v{A_ver} ↔ v{B_ver}
            </h2>
            {data && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-gray-400">
                {changedFields.length} {changedFields.length === 1 ? "campo alterado" : "campos alterados"}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-white"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-header: legenda de cores */}
        <div className="flex items-center gap-4 px-5 py-2 border-b border-white/5 text-[10px] text-gray-500 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-red-500/20 border border-red-500/30" />
            <span>v{A_ver} (mais antiga)</span>
          </div>
          <ArrowLeftRight className="w-3 h-3 text-gray-600" />
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-500/30" />
            <span>v{B_ver} (mais nova)</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="inline-block w-3 h-3 rounded-sm bg-amber-500/15 border border-amber-500/30" />
            <span>Campo alterado</span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando diff…
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-300">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {data && snapshotA && snapshotB && (
            <div className="space-y-4">
              {changedFields.length === 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-200">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Estas duas versões têm conteúdo <strong>idêntico</strong> — a nova versão
                    pode ter sido criada mesmo assim (ex: usuária apenas confirmou "gerar nova versão").
                  </span>
                </div>
              )}

              {FIELD_LABELS.map(({ key, label }) => {
                const isChanged = changedFields.includes(key as string)
                const valA = snapshotA[key]
                const valB = snapshotB[key]
                if (!isChanged && isEmpty(valA) && isEmpty(valB)) return null
                return (
                  <FieldRow
                    key={key}
                    label={label}
                    fieldKey={key as string}
                    valA={valA}
                    valB={valB}
                    isChanged={isChanged}
                    verA={A_ver}
                    verB={B_ver}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/10 flex-shrink-0">
          <button onClick={onClose} className={btnGhost}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// FieldRow — 1 linha (2 colunas lado a lado)
// ═══════════════════════════════════════════════════════════════

function FieldRow({
  label,
  fieldKey,
  valA,
  valB,
  isChanged,
  verA,
  verB,
}: {
  label: string
  fieldKey: string
  valA: unknown
  valB: unknown
  isChanged: boolean
  verA: number
  verB: number
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        isChanged
          ? "border-amber-500/30 bg-amber-500/[0.04]"
          : "border-white/5 bg-white/[0.01] opacity-60",
      )}
      data-testid={`version-diff-field-${fieldKey}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-xs font-semibold text-white uppercase tracking-wide">{label}</h4>
        {isChanged ? (
          <span className="text-[10px] text-amber-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Alterado
          </span>
        ) : (
          <span className="text-[10px] text-gray-600">Idêntico</span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FieldCell
          side="A"
          version={verA}
          value={valA}
          fieldKey={fieldKey}
          isChanged={isChanged}
        />
        <FieldCell
          side="B"
          version={verB}
          value={valB}
          fieldKey={fieldKey}
          isChanged={isChanged}
        />
      </div>
    </div>
  )
}

function FieldCell({
  side,
  version,
  value,
  fieldKey,
  isChanged,
}: {
  side: "A" | "B"
  version: number
  value: unknown
  fieldKey: string
  isChanged: boolean
}) {
  const isEmptyVal = isEmpty(value)
  const bgTint = isChanged
    ? side === "A"
      ? "bg-red-500/5 border-red-500/20"
      : "bg-emerald-500/5 border-emerald-500/20"
    : "bg-white/[0.02] border-white/5"

  return (
    <div className={cn("rounded-md border p-2", bgTint)}>
      <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-gray-500 font-mono">
        {isChanged ? (
          side === "A" ? (
            <Minus className="w-2.5 h-2.5 text-red-400" />
          ) : (
            <Plus className="w-2.5 h-2.5 text-emerald-400" />
          )
        ) : null}
        <span>v{version}</span>
      </div>
      {isEmptyVal ? (
        <span className="text-[11px] text-gray-600 italic">(vazio)</span>
      ) : (
        <FieldValue fieldKey={fieldKey} value={value} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Renderers de valor
// ═══════════════════════════════════════════════════════════════

function FieldValue({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  // Tags: pills
  if (fieldKey === "tags" && Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-[11px] text-gray-600 italic">(sem tags)</span>
    }
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((t, i) => (
          <span
            key={`${t}-${i}`}
            className="inline-block rounded px-1.5 py-0.5 text-[10px] bg-white/8 text-gray-200"
          >
            {String(t)}
          </span>
        ))}
      </div>
    )
  }

  // Conteúdo: bloco pré-formatado, scroll interno
  if (fieldKey === "content") {
    return (
      <pre
        className="text-[11px] text-gray-200 whitespace-pre-wrap break-words max-h-56 overflow-y-auto font-sans leading-relaxed"
        data-testid="version-diff-content"
      >
        {String(value ?? "")}
      </pre>
    )
  }

  // Metadata / generatedDoc: JSON com scroll
  if (typeof value === "object" && value !== null) {
    return (
      <pre className="text-[10px] text-gray-300 max-h-40 overflow-y-auto font-mono">
        {JSON.stringify(value, null, 2)}
      </pre>
    )
  }

  // Texto simples
  return <p className="text-xs text-gray-200 break-words">{String(value)}</p>
}

// ─── Helpers ─────────────────────────────────────────────────────

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true
  if (typeof v === "string" && v.trim() === "") return true
  if (Array.isArray(v) && v.length === 0) return true
  return false
}

const btnGhost =
  "inline-flex items-center gap-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 text-sm font-medium px-3 py-2 disabled:opacity-50"
