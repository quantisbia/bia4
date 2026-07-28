/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BasicModePanel — Painel do Modo BÁSICO de geração de G-code (R12.59)
 *
 *  R12.59 · FLUXO CONTÍNUO (Opção B):
 *  ─────────────────────────────────
 *  Antes (R12.55..R12.58) este painel mantinha estado local próprio para
 *  geometria (setGeomId/setDims) e para blend de biotinta (MultiBioinkSelector
 *  com até 4 slots) — DUPLICANDO Etapa 1 (Modelo 3D) e Etapa 2 (Biotinta) e
 *  contradizendo diretamente a R12.58 (que limita a 2 biotintas com 1 célula
 *  cada).
 *
 *  Agora o painel é **100% controlado por contexto**:
 *    - geometria vem de state.model (Etapa 1)
 *    - blend vem de state.bioink.formulations[] (Etapa 2, R12.58)
 *    - só permanece aqui: parâmetros DE FATIAMENTO (layer, walls, infill %,
 *      densidade) + botão gerar + resultado/validação
 *
 *  Cards read-only mostram um resumo das etapas anteriores + link "← alterar"
 *  que joga o usuário de volta na etapa correspondente sem perda de contexto.
 *
 *  Filosofia: G-code que FUNCIONA, geração síncrona <100ms, sem rede,
 *  sem timeout, com validação estática automática + Nelson 2021.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import {
  Zap, Layers, Download, Copy,
  CheckCircle2, AlertTriangle, Loader2, ChevronDown,
  ChevronRight, Info, Microscope, Droplets, Edit3,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import {
  generateQuickGcodeMulti,
  type QuickGcodeResult,
  type QuickGcodeOptions,
  type QuickInfillPattern,
} from "@/lib/bioprint/quick-gcode"
import { useBioprintProcess } from "@/lib/bioprint/process-context"
import {
  contextToQuickGeometry,
  contextToQuickBlend,
  summarizeModel,
  summarizeFormulation,
} from "@/lib/bioprint/context-to-quick"
import { validateGcode, DEFAULT_BIO_LIMITS, type ValidationResult } from "@/lib/bioprint/gcode-validator"

// ─── Cores por tool (T0..T3) — R12.58 consistency ────────────────────────
const TOOL_COLORS = ["#22d3ee", "#a78bfa", "#f472b6", "#facc15"]

// ─── Props ──────────────────────────────────────────────────────────────

export interface BasicModePanelProps {
  /** Callback quando G-code é gerado e validado com sucesso */
  onGcodeGenerated?: (gcode: string, result: QuickGcodeResult) => void
  /** Nome do job (opcional) — se omitido, gerado a partir de state.model */
  jobName?: string
  className?: string
}

// ─── Painel principal ──────────────────────────────────────────────────

export function BasicModePanel({
  onGcodeGenerated,
  jobName,
  className,
}: BasicModePanelProps) {
  const { state } = useBioprintProcess()

  // ── R12.59: Geometria + blend derivados do contexto (NÃO local!) ──────
  const geometry = useMemo(() => contextToQuickGeometry(state.model), [state.model])
  const blend = useMemo(() => contextToQuickBlend(state.bioink), [state.bioink])

  // Só parâmetros de FATIAMENTO ficam locais aqui (é o que o painel controla)
  const [opts, setOpts] = useState<QuickGcodeOptions>({
    layerHeight_mm: 0.2,
    infillPattern: "rectilinear",
    infillDensity_pct: 20,
    walls: 2,
  })
  const [result, setResult] = useState<QuickGcodeResult | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle")

  // Nome do job (fallback baseado no modelo do contexto)
  const effectiveJobName = useMemo(() => {
    if (jobName) return jobName
    const modelName = state.model.name?.replace(/\W+/g, "_").toLowerCase() ?? "basic"
    const geomId = state.model.geometryId ?? "cube"
    return `bia_${modelName}_${geomId}_${Date.now()}`
  }, [jobName, state.model.name, state.model.geometryId])

  // Ação: gerar G-code (usa geometria + blend derivados do contexto)
  const generateNow = useCallback(async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const gcodeResult = generateQuickGcodeMulti(geometry, blend, {
        ...opts,
        jobName: effectiveJobName,
      })
      setResult(gcodeResult)
      // Validação estática
      const val = validateGcode(gcodeResult.gcode, DEFAULT_BIO_LIMITS)
      setValidation(val)
      onGcodeGenerated?.(gcodeResult.gcode, gcodeResult)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    } finally {
      setIsGenerating(false)
    }
  }, [geometry, blend, opts, effectiveJobName, onGcodeGenerated])

  // Ação: copiar G-code
  async function copyGcode() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.gcode)
      setCopyStatus("copied")
      setTimeout(() => setCopyStatus("idle"), 2000)
    } catch {
      // fallback silencioso
    }
  }

  // Ação: download
  function downloadGcode() {
    if (!result) return
    const blob = new Blob([result.gcode], { type: "text/x-gcode" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${effectiveJobName}.gcode`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const verdictColor =
    validation?.verdict === "safe" ? "emerald"
    : validation?.verdict === "review" ? "amber"
    : validation?.verdict === "blocked" ? "red"
    : "gray"

  // Resumo textual do modelo + biotintas (usado nos cards read-only)
  const modelSummary = summarizeModel(state.model)
  const formulations = state.bioink.formulations ?? []
  // Se formulations está vazio mas há legacy fields (bioink R12.0..R12.9), sintetiza 1 card
  const hasLegacyFallback = formulations.length === 0 && !!state.bioink.material

  return (
    <div className={cn("space-y-4", className)}>
      {/* ═══ Banner: modo básico ═══ */}
      <div className="rounded-xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-cyan-50 p-4 shadow-sm dark:border-emerald-700 dark:from-emerald-900/20 dark:to-cyan-900/20">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
            <Zap className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="flex items-center gap-2 text-base font-bold text-emerald-800 dark:text-emerald-200">
              ⚡ Modo Básico · Pipeline Verificado
              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                Recomendado
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
              Geração síncrona &lt;100ms · validado por Nelson 2021 · sem timeout · 17 testes verdes.
            </p>
          </div>
        </div>
      </div>

      {/* ═══ R12.59: Cards read-only (Etapa 1 + Etapa 2) ═══ */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* Card Etapa 1 · Modelo (read-only, com link "alterar") */}
        <section className="rounded-lg border border-rose-200 bg-rose-50/40 p-3 shadow-sm dark:border-rose-800/50 dark:bg-rose-950/20">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <Microscope className="h-4 w-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-rose-600/80 dark:text-rose-400/80 font-semibold">
                  Etapa 1 · Modelo 3D
                </div>
                <div className="text-sm font-semibold text-rose-900 dark:text-rose-100 truncate mt-0.5">
                  {state.model.name ?? state.model.geometryId ?? "—"}
                </div>
                <div className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                  {modelSummary}
                </div>
              </div>
            </div>
            <Link
              href="/dashboard/bioprint/model"
              className="text-[10px] font-semibold px-2 py-1 rounded-md bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-900/50 dark:hover:bg-rose-900/70 dark:text-rose-200 transition-colors whitespace-nowrap flex items-center gap-1"
              title="Voltar para Etapa 1 e alterar o modelo"
            >
              <Edit3 className="h-3 w-3" />
              alterar
            </Link>
          </div>
        </section>

        {/* Card Etapa 2 · Biotinta (read-only, mostra até 2 biotintas por R12.58) */}
        <section className="rounded-lg border border-cyan-200 bg-cyan-50/40 p-3 shadow-sm dark:border-cyan-800/50 dark:bg-cyan-950/20">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <Droplets className="h-4 w-4 text-cyan-600 dark:text-cyan-400 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wider text-cyan-600/80 dark:text-cyan-400/80 font-semibold">
                  Etapa 2 · Biotinta ({formulations.length > 0 ? formulations.length : (hasLegacyFallback ? 1 : 0)}
                  {formulations.length > 0 || hasLegacyFallback ? " ativa(s)" : " — vazio"})
                </div>
                {/* Se tem formulations (R12.10+ path) */}
                {formulations.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {formulations.slice(0, 2).map((f, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-cyan-900 dark:text-cyan-100">
                        <span
                          className="inline-block h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: f.color ?? TOOL_COLORS[f.tool ?? idx] }}
                        />
                        <span className="font-semibold uppercase text-[9px] text-cyan-700 dark:text-cyan-300">
                          T{f.tool ?? idx}
                        </span>
                        <span className="truncate">{summarizeFormulation(f)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Fallback legacy (R12.0..R12.9) */}
                {hasLegacyFallback && (
                  <div className="mt-1 text-[11px] text-cyan-900 dark:text-cyan-100">
                    <span
                      className="inline-block h-2 w-2 rounded-full mr-1.5"
                      style={{ backgroundColor: TOOL_COLORS[0] }}
                    />
                    {state.bioink.material} {state.bioink.concentration ?? 5}%
                    {state.bioink.cellType && (
                      <span className="text-cyan-700 dark:text-cyan-300 ml-1">
                        + {state.bioink.cellType} {state.bioink.cellDensityMillionMl}×10⁶/mL
                      </span>
                    )}
                  </div>
                )}
                {/* Estado vazio */}
                {formulations.length === 0 && !hasLegacyFallback && (
                  <div className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                    ⚠️ Nenhuma biotinta configurada
                  </div>
                )}
              </div>
            </div>
            <Link
              href="/dashboard/bioprint/bioink"
              className="text-[10px] font-semibold px-2 py-1 rounded-md bg-cyan-100 hover:bg-cyan-200 text-cyan-800 dark:bg-cyan-900/50 dark:hover:bg-cyan-900/70 dark:text-cyan-200 transition-colors whitespace-nowrap flex items-center gap-1"
              title="Voltar para Etapa 2 e alterar a biotinta"
            >
              <Edit3 className="h-3 w-3" />
              alterar
            </Link>
          </div>
        </section>
      </div>

      {/* ═══ Etapa 3: Opções de fatiamento (única seção realmente controlada aqui) ═══ */}
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-100">
          <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          Parâmetros de fatiamento
          <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">
            (única coisa nova nesta etapa)
          </span>
        </h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <label className="text-xs">
            <span className="mb-0.5 block font-medium text-gray-600 dark:text-gray-400">
              Layer height (mm)
            </span>
            <input
              type="number"
              min={0.05}
              max={1.0}
              step={0.05}
              value={opts.layerHeight_mm}
              onChange={(e) => setOpts({ ...opts, layerHeight_mm: parseFloat(e.target.value) || 0.2 })}
              className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </label>
          <label className="text-xs">
            <span className="mb-0.5 block font-medium text-gray-600 dark:text-gray-400">
              Paredes
            </span>
            <input
              type="number"
              min={1}
              max={5}
              step={1}
              value={opts.walls}
              onChange={(e) => setOpts({ ...opts, walls: parseInt(e.target.value) || 2 })}
              className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </label>
          <label className="text-xs">
            <span className="mb-0.5 block font-medium text-gray-600 dark:text-gray-400">
              Padrão de infill
            </span>
            <select
              value={opts.infillPattern}
              onChange={(e) => setOpts({ ...opts, infillPattern: e.target.value as QuickInfillPattern })}
              className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="rectilinear">Retilíneo (cross-hatch)</option>
              <option value="concentric">Concêntrico (espiral)</option>
              <option value="none">Sem infill (oco)</option>
            </select>
          </label>
          <label className="text-xs">
            <span className="mb-0.5 block font-medium text-gray-600 dark:text-gray-400">
              Densidade (%)
            </span>
            <input
              type="number"
              min={0}
              max={100}
              step={5}
              value={opts.infillDensity_pct}
              disabled={opts.infillPattern === "none"}
              onChange={(e) => setOpts({ ...opts, infillDensity_pct: parseInt(e.target.value) || 20 })}
              className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:disabled:bg-gray-800 dark:disabled:text-gray-600"
            />
          </label>
        </div>
      </section>

      {/* ═══ Botão gerar ═══ */}
      <div className="flex flex-col items-stretch gap-2 sm:flex-row">
        <button
          onClick={generateNow}
          disabled={isGenerating || blend.length === 0 || !state.model.geometryId}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold shadow-md transition",
            isGenerating
              ? "bg-gray-400 text-white cursor-wait"
              : blend.length === 0 || !state.model.geometryId
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-emerald-500 to-cyan-600 text-white hover:from-emerald-600 hover:to-cyan-700"
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              ⚡ Gerar G-code Básico
            </>
          )}
        </button>
      </div>

      {/* ═══ Erro ═══ */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm dark:border-red-800 dark:bg-red-900/20">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <div>
            <b className="text-red-800 dark:text-red-200">Erro na geração:</b>
            <p className="mt-0.5 text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* ═══ Resultado ═══ */}
      {result && validation && (
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {/* Verdict + score */}
          <div
            className={cn(
              "mb-3 flex items-center justify-between rounded-lg border p-3",
              verdictColor === "emerald" && "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20",
              verdictColor === "amber" && "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20",
              verdictColor === "red" && "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20",
            )}
          >
            <div className="flex items-center gap-3">
              {validation.verdict === "safe" && <CheckCircle2 className="h-6 w-6 text-emerald-600" />}
              {validation.verdict === "review" && <AlertTriangle className="h-6 w-6 text-amber-600" />}
              {validation.verdict === "blocked" && <AlertTriangle className="h-6 w-6 text-red-600" />}
              <div>
                <div className="text-sm font-bold text-gray-800 dark:text-gray-100">
                  Validação: <span className="uppercase">{validation.verdict}</span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Nelson 2021: <b>{result.printability.score}/100</b> · verdict <b>{result.printability.verdict}</b>
                </div>
              </div>
            </div>
            <div className="text-right text-xs">
              <div>{result.layerCount} camadas · {result.moveCount} moves</div>
              <div>{result.bioinkVolume_uL.toFixed(0)} µL · {result.estimatedTime_min.toFixed(1)} min</div>
            </div>
          </div>

          {/* Ações */}
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              onClick={copyGcode}
              className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <Copy className="h-3.5 w-3.5" />
              {copyStatus === "copied" ? "Copiado!" : "Copiar"}
            </button>
            <button
              onClick={downloadGcode}
              className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              <Download className="h-3.5 w-3.5" />
              Baixar .gcode
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {showPreview ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Preview G-code
            </button>
          </div>

          {/* Rationale */}
          <details className="mb-3 rounded-md bg-gray-50 p-2 dark:bg-gray-900">
            <summary className="cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300">
              <Info className="mr-1 inline h-3 w-3" />
              Racional ({result.rationale.length} pontos)
            </summary>
            <ul className="mt-2 space-y-1 text-[11px] text-gray-600 dark:text-gray-400">
              {result.rationale.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </details>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-2 dark:border-amber-700 dark:bg-amber-900/20">
              <div className="mb-1 flex items-center gap-1 text-xs font-medium text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                Avisos ({result.warnings.length})
              </div>
              <ul className="space-y-0.5 text-[11px] text-amber-700 dark:text-amber-300">
                {result.warnings.map((w, i) => (
                  <li key={i}>• {w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview G-code */}
          {showPreview && (
            <pre className="max-h-96 overflow-auto rounded-md bg-gray-900 p-3 text-[10px] leading-tight text-gray-100">
              <code>{result.gcode}</code>
            </pre>
          )}
        </section>
      )}
    </div>
  )
}
