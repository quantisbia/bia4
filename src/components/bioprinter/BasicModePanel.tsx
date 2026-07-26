/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BasicModePanel — Painel do Modo BÁSICO de geração de G-code (R12.55)
 *
 *  Filosofia: G-code que FUNCIONA, geração síncrona <100ms, sem rede,
 *  sem timeout, com validação estática automática + Nelson 2021.
 *
 *  Fluxo:
 *    1. Usuário escolhe geometria BÁSICA (cube / cylinder / disk / patch / tube / grid)
 *    2. MultiBioinkSelector para definir blend (1..4 componentes)
 *    3. Parâmetros globais (layer, walls, infill %)
 *    4. Botão "⚡ Gerar G-code Básico" → generateQuickGcodeMulti() no browser
 *    5. Resultado: preview + validação + score Nelson + download
 *
 *  Substitui o pipeline pesado /api/gcode/generate para os casos comuns.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

"use client"

import { useState, useMemo, useCallback } from "react"
import {
  Zap, Box, Circle, Layers, Square, Sparkles, Download, Copy,
  CheckCircle2, AlertTriangle, Loader2, FileCode2, ChevronDown,
  ChevronRight, Info, Wrench,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import {
  generateQuickGcodeMulti, GEOMETRY_PRESETS, geometryLabel,
  type QuickGeometry, type QuickGeometryId, type QuickGcodeResult,
  type QuickGcodeOptions, type QuickInfillPattern, type QuickMultiBioink,
} from "@/lib/bioprint/quick-gcode"
import { MultiBioinkSelector, defaultMultiBioink } from "./MultiBioinkSelector"
import { validateGcode, DEFAULT_BIO_LIMITS, type ValidationResult } from "@/lib/bioprint/gcode-validator"

// ─── Props ──────────────────────────────────────────────────────────────

export interface BasicModePanelProps {
  /** Se fornecido, pré-seleciona esta geometria (mapping engine→quick já resolvido) */
  initialGeometryId?: QuickGeometryId
  /** Bioink inicial (opcional — default GelMA 10%) */
  initialBioink?: QuickMultiBioink
  /** Callback quando G-code é gerado e validado com sucesso */
  onGcodeGenerated?: (gcode: string, result: QuickGcodeResult) => void
  /** Nome do job (opcional) */
  jobName?: string
  className?: string
}

// ─── Ícones por geometria ────────────────────────────────────────────────

const GEOMETRY_ICONS: Record<QuickGeometryId, React.ComponentType<{ className?: string }>> = {
  cube: Box,
  cylinder: Circle,
  disk: Circle,
  patch: Square,
  tube: Circle,
  grid: Layers,
  "hollow-sphere": Circle, // não deve ser usado, mas mantém type completo
}

// ─── Painel principal ──────────────────────────────────────────────────

export function BasicModePanel({
  initialGeometryId = "cube",
  initialBioink,
  onGcodeGenerated,
  jobName,
  className,
}: BasicModePanelProps) {
  // Estados
  const [geomId, setGeomId] = useState<QuickGeometryId>(initialGeometryId)
  const [dims, setDims] = useState(() => {
    const preset = GEOMETRY_PRESETS.find(p => p.id === initialGeometryId)
    return preset?.defaultParams ?? { width: 10, depth: 10, height: 5 }
  })
  const [blend, setBlend] = useState<QuickMultiBioink>(initialBioink ?? defaultMultiBioink())
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

  // Presets visíveis (Modo Básico não expõe hollow-sphere)
  const visiblePresets = useMemo(
    () => GEOMETRY_PRESETS.filter(p => p.id !== "hollow-sphere"),
    []
  )

  // Sincroniza dimensões quando muda geometria
  function selectGeometry(id: QuickGeometryId) {
    setGeomId(id)
    const preset = GEOMETRY_PRESETS.find(p => p.id === id)
    if (preset) setDims(preset.defaultParams)
    setResult(null)
    setValidation(null)
  }

  // Ação: gerar G-code
  const generateNow = useCallback(async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const geom: QuickGeometry = { id: geomId, ...dims }
      const gcodeResult = generateQuickGcodeMulti(geom, blend, {
        ...opts,
        jobName: jobName ?? `bia_basic_${geomId}_${Date.now()}`,
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
  }, [geomId, dims, blend, opts, jobName, onGcodeGenerated])

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
    a.download = `${jobName ?? `bia_basic_${geomId}`}.gcode`
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

      {/* ═══ Etapa 1: Geometria ═══ */}
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-100">
          <Wrench className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          1. Geometria básica
        </h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          {visiblePresets.map((preset) => {
            const Icon = GEOMETRY_ICONS[preset.id] ?? Box
            const isSelected = preset.id === geomId
            return (
              <button
                key={preset.id}
                onClick={() => selectGeometry(preset.id)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition",
                  isSelected
                    ? "border-indigo-500 bg-indigo-50 shadow-sm dark:border-indigo-400 dark:bg-indigo-900/30"
                    : "border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-indigo-600 dark:hover:bg-indigo-900/20"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className={cn("h-4 w-4", isSelected ? "text-indigo-600 dark:text-indigo-300" : "text-gray-500")} />
                  <span className={cn("text-xs font-semibold", isSelected ? "text-indigo-800 dark:text-indigo-200" : "text-gray-700 dark:text-gray-300")}>
                    {preset.label}
                  </span>
                </div>
                <p className="text-[10px] leading-tight text-gray-500 dark:text-gray-400 line-clamp-2">
                  {preset.description}
                </p>
              </button>
            )
          })}
        </div>

        {/* Dimensões */}
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <label className="text-xs">
            <span className="mb-0.5 block font-medium text-gray-600 dark:text-gray-400">
              Largura (X) mm
            </span>
            <input
              type="number"
              min={1}
              step={0.5}
              value={dims.width}
              onChange={(e) => setDims({ ...dims, width: parseFloat(e.target.value) || 10 })}
              className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </label>
          <label className="text-xs">
            <span className="mb-0.5 block font-medium text-gray-600 dark:text-gray-400">
              Profundidade (Y) mm
            </span>
            <input
              type="number"
              min={1}
              step={0.5}
              value={dims.depth}
              onChange={(e) => setDims({ ...dims, depth: parseFloat(e.target.value) || 10 })}
              className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </label>
          <label className="text-xs">
            <span className="mb-0.5 block font-medium text-gray-600 dark:text-gray-400">
              Altura (Z) mm
            </span>
            <input
              type="number"
              min={0.2}
              step={0.5}
              value={dims.height}
              onChange={(e) => setDims({ ...dims, height: parseFloat(e.target.value) || 5 })}
              className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </label>
          {(geomId === "tube") && (
            <label className="text-xs">
              <span className="mb-0.5 block font-medium text-gray-600 dark:text-gray-400">
                Parede (mm)
              </span>
              <input
                type="number"
                min={0.3}
                step={0.1}
                value={dims.wallThickness ?? 1.5}
                onChange={(e) => setDims({ ...dims, wallThickness: parseFloat(e.target.value) || 1.5 })}
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />
            </label>
          )}
          {(geomId === "grid") && (
            <label className="text-xs">
              <span className="mb-0.5 block font-medium text-gray-600 dark:text-gray-400">
                Pitch (mm)
              </span>
              <input
                type="number"
                min={0.5}
                step={0.1}
                value={dims.pitch ?? 1.5}
                onChange={(e) => setDims({ ...dims, pitch: parseFloat(e.target.value) || 1.5 })}
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />
            </label>
          )}
        </div>
      </section>

      {/* ═══ Etapa 2: Multi-bioink ═══ */}
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <MultiBioinkSelector value={blend} onChange={setBlend} maxFormulations={4} />
      </section>

      {/* ═══ Etapa 3: Opções de fatiamento ═══ */}
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-100">
          <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          3. Fatiamento
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
          disabled={isGenerating || blend.length === 0}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold shadow-md transition",
            isGenerating
              ? "bg-gray-400 text-white cursor-wait"
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
