"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · Modal de Feedback Pós-Impressão (R12.54)
 *  ─────────────────────────────────────────────────────────────────────
 *  Aparece após o `controllerState` virar "completed" no /execute.
 *  Permite ao usuário registrar:
 *    1. Qualidade da impressão (excelente / aceitavel / ruim)
 *    2. Issues observados (subextrusão, colapso, ma_aderencia...)
 *    3. Notas livres
 *
 *  Os dados são salvos via `savePrintResult` do learning-store —
 *  inicialmente em localStorage, futuramente em D1 (R12.55).
 *
 *  Esse feedback alimenta o motor de recomendação adaptativa do
 *  TissueRecommendationCard: na próxima vez que o usuário escolher
 *  o MESMO (tecido, bioink), as sugestões serão ajustadas com base
 *  no que rolou.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from "react"
import {
  X, CheckCircle2, AlertTriangle, ThumbsUp, ThumbsDown,
  Sparkles, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import {
  savePrintResult,
  QUALITY_LABELS, ISSUE_LABELS, ISSUE_CHECKLIST_ORDER,
  type PrintQuality, type PrintIssue,
} from "@/lib/bioprint/learning-store"
import type { PresetParams } from "@/lib/bioprint/tissue-presets"

// ─── Props ─────────────────────────────────────────────────────────────

export interface PrintFeedbackModalProps {
  /** Se o modal está aberto */
  open: boolean
  /** Callback quando o modal fecha (X ou após salvar/pular) */
  onClose: () => void
  /** Tecido que foi impresso (do /slice) */
  tissueId: string
  /** Bioink que foi impresso (do /slice) */
  bioinkId: string
  /** Geometria que foi impressa (do /slice) */
  geometryId: string | null
  /** Snapshot dos parâmetros usados (do /slice) */
  params: PresetParams
  /** Callback opcional após salvar com sucesso — pai pode mostrar toast */
  onSaved?: (resultId: string) => void
}

// ─── Componente principal ──────────────────────────────────────────────

export function PrintFeedbackModal(props: PrintFeedbackModalProps) {
  const { open, onClose, tissueId, bioinkId, geometryId, params, onSaved } = props

  // Estado local do formulário
  const [quality, setQuality] = useState<PrintQuality | null>(null)
  const [selectedIssues, setSelectedIssues] = useState<Set<PrintIssue>>(new Set())
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  // Reset quando abre/fecha
  const handleClose = useCallback(() => {
    setQuality(null)
    setSelectedIssues(new Set())
    setNotes("")
    setError(null)
    setSavedId(null)
    onClose()
  }, [onClose])

  // Toggle de issue (checkbox)
  const toggleIssue = useCallback((issue: PrintIssue) => {
    setSelectedIssues((prev) => {
      const next = new Set(prev)
      if (next.has(issue)) next.delete(issue)
      else next.add(issue)
      return next
    })
  }, [])

  // Salvar resultado no learning-store
  const handleSave = useCallback(async () => {
    if (!quality) {
      setError("Escolha um nível de qualidade antes de salvar.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const result = await savePrintResult({
        tissueId,
        bioinkId,
        geometryId: geometryId ?? "unknown",
        params,
        quality,
        issues: Array.from(selectedIssues),
        notes: notes.trim() || null,
      })
      setSavedId(result.id)
      onSaved?.(result.id)
      // Auto-fecha após 1.5s mostrando o sucesso
      setTimeout(() => handleClose(), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar resultado")
    } finally {
      setSaving(false)
    }
  }, [quality, tissueId, bioinkId, geometryId, params, selectedIssues, notes, onSaved, handleClose])

  if (!open) return null

  // Tela de sucesso
  if (savedId) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-400/40 p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-emerald-100 mb-1">
            Resultado registrado!
          </h3>
          <p className="text-sm text-emerald-200/80">
            A BIA vai usar esse feedback pra melhorar as próximas recomendações de{" "}
            <strong>{tissueId} + {bioinkId}</strong>.
          </p>
          <p className="text-[10px] text-emerald-300/50 mt-3 font-mono">
            ID: {savedId.slice(0, 12)}…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="rounded-2xl bg-[#0a0a0f] border border-violet-500/30 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0a0a0f]/95 backdrop-blur px-5 py-4 border-b border-violet-500/20 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-400/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-violet-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white">
                Como foi a bioimpressão?
              </h2>
              <p className="text-xs text-violet-200/70 mt-0.5">
                Seu feedback treina a BIA pras próximas recomendações de{" "}
                <strong>{tissueId}</strong> com <strong>{bioinkId}</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-400 hover:text-white shrink-0"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-5">
          {/* 1. Qualidade — radio cards */}
          <section>
            <label className="text-xs font-semibold uppercase tracking-wider text-violet-300/80 mb-2 block">
              1. Qualidade geral do resultado
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(["excelente", "aceitavel", "ruim"] as PrintQuality[]).map((q) => {
                const selected = quality === q
                const config = {
                  excelente: {
                    icon: ThumbsUp,
                    color: "emerald",
                    desc: "Atendeu o esperado · forma + viabilidade OK",
                  },
                  aceitavel: {
                    icon: CheckCircle2,
                    color: "amber",
                    desc: "Funcional, mas com pontos a melhorar",
                  },
                  ruim: {
                    icon: ThumbsDown,
                    color: "rose",
                    desc: "Falhou · forma ou viabilidade comprometidas",
                  },
                }[q]
                const Icon = config.icon
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuality(q)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      selected
                        ? config.color === "emerald" &&
                            "border-emerald-400/60 bg-emerald-500/15 ring-1 ring-emerald-400/40"
                        : "border-white/10 bg-white/3 hover:border-white/20",
                      selected && config.color === "amber" &&
                        "border-amber-400/60 bg-amber-500/15 ring-1 ring-amber-400/40",
                      selected && config.color === "rose" &&
                        "border-rose-400/60 bg-rose-500/15 ring-1 ring-rose-400/40",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5 mb-1.5",
                        selected
                          ? config.color === "emerald" ? "text-emerald-300"
                          : config.color === "amber" ? "text-amber-300"
                          : "text-rose-300"
                          : "text-gray-400",
                      )}
                    />
                    <div
                      className={cn(
                        "text-sm font-semibold mb-0.5",
                        selected
                          ? config.color === "emerald" ? "text-emerald-100"
                          : config.color === "amber" ? "text-amber-100"
                          : "text-rose-100"
                          : "text-white",
                      )}
                    >
                      {QUALITY_LABELS[q].emoji} {QUALITY_LABELS[q].label}
                    </div>
                    <div className="text-[10px] text-gray-400 leading-relaxed">
                      {config.desc}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* 2. Issues observados — checklist */}
          <section>
            <label className="text-xs font-semibold uppercase tracking-wider text-violet-300/80 mb-2 block">
              2. O que você observou? (marque quantos quiser)
            </label>
            <p className="text-[11px] text-gray-500 mb-3">
              Esses checkboxes ajudam a BIA a ajustar os parâmetros automaticamente
              na próxima vez. Ex.: subextrusão → +10% no flow; colapso → +1 wall.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {ISSUE_CHECKLIST_ORDER.map((issue) => {
                const checked = selectedIssues.has(issue)
                const isPositive = issue === "forma_ok_otima" || issue === "forma_ok_fragil"
                return (
                  <label
                    key={issue}
                    className={cn(
                      "flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all",
                      checked
                        ? isPositive
                          ? "border-emerald-400/50 bg-emerald-500/10"
                          : "border-violet-400/50 bg-violet-500/10"
                        : "border-white/8 bg-white/3 hover:border-white/15",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleIssue(issue)}
                      className="mt-0.5 accent-violet-500"
                    />
                    <span
                      className={cn(
                        "text-xs leading-snug",
                        checked
                          ? isPositive ? "text-emerald-100" : "text-violet-100"
                          : "text-gray-300",
                      )}
                    >
                      {ISSUE_LABELS[issue]}
                    </span>
                  </label>
                )
              })}
            </div>
          </section>

          {/* 3. Notas livres */}
          <section>
            <label className="text-xs font-semibold uppercase tracking-wider text-violet-300/80 mb-2 block">
              3. Notas adicionais (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: A 3ª camada perdeu fidelidade. Crosslink demorou mais que o esperado. Bioink ficou muito viscosa após 20 min."
              rows={3}
              className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-violet-500/40 focus:outline-none resize-none"
            />
          </section>

          {/* Snapshot dos parâmetros usados */}
          <section className="rounded-xl bg-white/3 border border-white/8 p-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 font-semibold">
              Snapshot dos parâmetros que serão registrados
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <Stat label="Camada" value={`${params.layerHeightMm}mm`} />
              <Stat label="Velocidade" value={`${params.printSpeedMmS}mm/s`} />
              <Stat label="Pressão" value={`${params.pressureKPa}kPa`} />
              <Stat label="Flow" value={`${params.flowPercent}%`} />
              <Stat label="Infill" value={`${params.infillPercent}%`} />
              <Stat label="Walls" value={`${params.walls}`} />
              <Stat label="Cartucho" value={`${params.cartridgeTempC}°C`} />
              <Stat label="Mesa" value={`${params.bedTempC}°C`} />
            </div>
          </section>

          {error && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-200">{error}</p>
            </div>
          )}
        </div>

        {/* Footer com botões */}
        <div className="sticky bottom-0 bg-[#0a0a0f]/95 backdrop-blur px-5 py-4 border-t border-white/8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="text-xs font-medium text-gray-400 hover:text-white px-3 py-2 disabled:opacity-50"
          >
            Pular (não salvar)
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!quality || saving}
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg transition-all",
              !quality || saving
                ? "bg-white/5 text-gray-500 cursor-not-allowed"
                : "bg-violet-500 hover:bg-violet-400 text-violet-950",
            )}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {saving ? "Salvando…" : "Salvar resultado"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-componente: Stat box ──────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-sm text-violet-200 font-mono">{value}</div>
    </div>
  )
}
