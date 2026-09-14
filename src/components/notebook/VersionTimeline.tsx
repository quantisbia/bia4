"use client"

/**
 * BIA · Notebook · VersionTimeline — R12.69
 *
 * Nível 3 (parte 1) da UI hierárquica: timeline horizontal de versões
 * de uma entrada específica. Usuária pode:
 *  - Ver todas as versões em ordem cronológica (nova → antiga)
 *  - Selecionar 2 versões para comparar (diff)
 *  - Restaurar uma versão antiga (via API — cria N+1, nunca apaga)
 *
 * Consumo: GET /api/notebook/[id]/versions (R12.66)
 *          POST /api/notebook/[id]/versions/restore (R12.66)
 */

import { useEffect, useState, useCallback } from "react"
import {
  GitBranch, Loader2, AlertTriangle, RotateCcw, GitCompare, Check,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

export interface VersionItem {
  id: string
  versionNumber: number
  changeSummary: string | null
  createdAt: string
  userId: string
  user?: { id: string; name: string | null; email: string | null } | null
}

export interface VersionTimelineProps {
  entryId: string
  currentVersion: number
  /** Chamado quando o usuário seleciona 2 versões para comparar */
  onCompare?: (a: number, b: number) => void
  /** Chamado após restauração bem-sucedida (nova versão criada) */
  onRestored?: (newVersionNumber: number) => void
  /** Reload key (bumpa após save externo) */
  reloadKey?: string | number
  className?: string
}

export function VersionTimeline({
  entryId,
  currentVersion,
  onCompare,
  onRestored,
  reloadKey,
  className,
}: VersionTimelineProps) {
  const [versions, setVersions] = useState<VersionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Estado de seleção múltipla para diff (máx 2)
  const [selectedForDiff, setSelectedForDiff] = useState<number[]>([])
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/notebook/${entryId}/versions`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error ?? `Falha (${res.status})`)
      }
      const data = await res.json()
      setVersions(data.versions ?? [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [entryId])

  useEffect(() => {
    load()
    setSelectedForDiff([])
  }, [load, reloadKey])

  const toggleSelectForDiff = (v: number) => {
    setSelectedForDiff((prev) => {
      if (prev.includes(v)) return prev.filter((x) => x !== v)
      if (prev.length >= 2) {
        // Substitui o mais antigo pela nova seleção
        return [prev[1], v]
      }
      return [...prev, v]
    })
  }

  const triggerCompare = () => {
    if (selectedForDiff.length === 2 && onCompare) {
      const [a, b] = selectedForDiff.sort((x, y) => y - x) // nova primeiro
      onCompare(a, b)
    }
  }

  const doRestore = async (versionNumber: number) => {
    if (
      !window.confirm(
        `Restaurar v${versionNumber}?\n\nO histórico NÃO é apagado — uma nova versão v${currentVersion + 1} será criada com o conteúdo desta versão antiga.`,
      )
    ) {
      return
    }
    setRestoringVersion(versionNumber)
    setError(null)
    try {
      const res = await fetch(
        `/api/notebook/${entryId}/versions/restore`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetVersion: versionNumber }),
        },
      )
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error ?? `Falha (${res.status})`)
      }
      const data = await res.json()
      onRestored?.(data.newVersionNumber ?? currentVersion + 1)
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setRestoringVersion(null)
    }
  }

  return (
    <div
      className={cn("bg-white/[0.02] border border-white/5 rounded-xl p-3", className)}
      data-testid="version-timeline"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-violet-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wide">
            Histórico de versões
          </h3>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-gray-500">
            {loading ? "…" : versions.length}
          </span>
        </div>
        {selectedForDiff.length === 2 && (
          <button
            onClick={triggerCompare}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-md"
            data-testid="version-timeline-compare"
          >
            <GitCompare className="w-3.5 h-3.5" />
            Comparar v{Math.max(...selectedForDiff)} × v{Math.min(...selectedForDiff)}
          </button>
        )}
        {selectedForDiff.length > 0 && selectedForDiff.length < 2 && (
          <span className="text-[10px] text-gray-500 italic">
            Selecione mais 1 para comparar…
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-2 text-xs text-gray-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Carregando histórico…
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-2 text-xs text-red-300 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && versions.length === 0 && (
        <p className="text-[11px] text-gray-500 py-2">
          Nenhuma versão registrada.
        </p>
      )}

      {/* Timeline horizontal com scroll (mobile-friendly) */}
      {versions.length > 0 && (
        <div className="overflow-x-auto -mx-1 px-1">
          <ol className="flex items-stretch gap-2 min-w-max py-1" data-testid="version-timeline-list">
            {versions.map((v, idx) => {
              const isCurrent = v.versionNumber === currentVersion
              const isSelected = selectedForDiff.includes(v.versionNumber)
              return (
                <li
                  key={v.id}
                  className="flex-shrink-0"
                  data-testid={`version-timeline-item-${v.versionNumber}`}
                >
                  <div
                    className={cn(
                      "flex flex-col gap-1 w-36 rounded-lg border p-2 transition-all",
                      isCurrent
                        ? "border-violet-500/50 bg-violet-500/10"
                        : isSelected
                          ? "border-fuchsia-500/50 bg-fuchsia-500/10"
                          : "border-white/10 bg-white/[0.02] hover:bg-white/5",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => toggleSelectForDiff(v.versionNumber)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition-all",
                          isSelected
                            ? "bg-fuchsia-500 text-white"
                            : isCurrent
                              ? "bg-violet-500 text-white"
                              : "bg-white/10 text-gray-200 hover:bg-white/15",
                        )}
                        data-testid={`version-timeline-select-${v.versionNumber}`}
                        title={isSelected ? "Remover da comparação" : "Marcar para comparar"}
                      >
                        v{v.versionNumber}
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>
                      {isCurrent && (
                        <span className="text-[9px] text-violet-300 font-medium">atual</span>
                      )}
                    </div>

                    <div className="text-[10px] text-gray-500">
                      {formatShortDate(v.createdAt)}
                    </div>

                    {v.user?.name && (
                      <div className="text-[10px] text-gray-400 truncate" title={v.user.email ?? ""}>
                        {v.user.name}
                      </div>
                    )}

                    <p
                      className="text-[10px] text-gray-300 leading-tight line-clamp-3 min-h-[2.5em]"
                      title={v.changeSummary ?? ""}
                    >
                      {v.changeSummary ?? <span className="text-gray-600 italic">sem descrição</span>}
                    </p>

                    {!isCurrent && (
                      <button
                        onClick={() => doRestore(v.versionNumber)}
                        disabled={restoringVersion !== null}
                        className="mt-1 flex items-center justify-center gap-1 text-[10px] text-gray-400 hover:text-white rounded-md py-1 border border-white/10 hover:bg-white/10 disabled:opacity-50"
                        data-testid={`version-timeline-restore-${v.versionNumber}`}
                      >
                        {restoringVersion === v.versionNumber ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3 h-3" />
                        )}
                        Restaurar
                      </button>
                    )}
                  </div>

                  {/* Conector horizontal entre versões */}
                  {idx < versions.length - 1 && (
                    <div className="hidden" aria-hidden />
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}

function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}
