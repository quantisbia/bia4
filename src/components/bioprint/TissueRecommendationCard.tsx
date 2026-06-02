"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · Card "Recomendado pela BIA" + Painel "Ajustar e Regenerar"
 *  ─────────────────────────────────────────────────────────────────────
 *  R12.54: componente isolado pra encapsular toda a lógica de recomendação
 *  de parâmetros por (tecido, bioink). Renderizado na página /slice
 *  ANTES do gerador de G-code.
 *
 *  Estrutura visual:
 *
 *    ┌─ Card "Recomendado pela BIA" ─────────────────────────────────┐
 *    │ 🎯 Membrana fina (alginato 2%)                                │
 *    │    Status: ✨ Preset científico padrão                         │
 *    │    📊 Histórico: 0 impressões anteriores                       │
 *    │                                                                │
 *    │    [Parâmetros]                  [Rationale - expansível]    │
 *    │    Layer: 0.15mm                 Por que: ...                 │
 *    │    Speed: 6 mm/s                                              │
 *    │    Flow: 45%                     [Fluxo - expansível]         │
 *    │    ...                           1. Esterilize bocal...       │
 *    │                                                                │
 *    │    [✅ Aplicar e gerar G-code]  [🔧 Ajustar e regenerar]    │
 *    └────────────────────────────────────────────────────────────────┘
 *
 *  Quando o usuário clica "Ajustar e regenerar", abre um painel com
 *  sliders pra todos os 10 parâmetros + indicador "N parâmetros fora
 *  do recomendado".
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo } from "react"
import {
  Sparkles, ChevronDown, ChevronRight, Wand2, Wrench,
  BookOpen, ListChecks, Activity, FlaskConical, Info, RotateCw, Check,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import {
  findPreset,
  listPresetsForTissue,
  getRangesForPreset,
  countParamDeviations,
  type TissuePreset,
  type PresetParams,
  type ParamRanges,
} from "@/lib/bioprint/tissue-presets"
import {
  recommendParams,
  type AdaptationResult,
  type CombinationStats,
} from "@/lib/bioprint/learning-store"

// ─── Props ─────────────────────────────────────────────────────────────

export interface TissueRecommendationCardProps {
  /** Tecido escolhido (membrana / vaso / musculo / nervo) — inferido ou manual */
  tissueId: string
  /** Bioink escolhido (id em BIOMATERIALS / BIOINK_PRESETS) */
  bioinkId: string
  /** Geometria atual (passada apenas pra contextualizar — não muda os parâmetros) */
  geometryId: string | null
  /** Parâmetros atuais do /slice (controlled — vêm do estado do pai) */
  currentParams: PresetParams
  /**
   * Callback quando o usuário aplica novos parâmetros (clica em
   * "Aplicar e gerar G-code" ou em "Aplicar mudanças" do painel
   * Regenerar). O pai deve mergear esses params no seu estado e chamar
   * `/api/gcode/generate` em seguida.
   */
  onApplyParams: (params: PresetParams) => void
  /**
   * Callback chamado quando o usuário muda manualmente o tissueId
   * (via dropdown "Outras opções"). O pai DEVE atualizar o tissueId
   * em seu estado e refazer o cálculo de recomendação.
   */
  onTissueChange?: (newTissueId: string) => void
  /**
   * Callback chamado quando o usuário muda manualmente o bioinkId
   * dentro de um mesmo tecido (ex: alginate → gelma na membrana).
   */
  onBioinkChange?: (newBioinkId: string) => void
}

// ─── Componente principal ──────────────────────────────────────────────

export function TissueRecommendationCard(props: TissueRecommendationCardProps) {
  const {
    tissueId, bioinkId, geometryId, currentParams,
    onApplyParams, onTissueChange, onBioinkChange,
  } = props

  // Preset científico exato pra essa combinação (pode ser null se
  // tecido+bioink ainda não está catalogado).
  const preset = useMemo<TissuePreset | null>(
    () => findPreset(tissueId, bioinkId),
    [tissueId, bioinkId],
  )

  // Outras opções de bioink pro mesmo tecido (mostradas no select)
  const alternativePresets = useMemo<TissuePreset[]>(
    () => listPresetsForTissue(tissueId).filter((p) => p.bioinkId !== bioinkId),
    [tissueId, bioinkId],
  )

  // Faixas seguras pros sliders (override do preset OU default global)
  const ranges = useMemo<ParamRanges>(
    () => (preset ? getRangesForPreset(preset) : DEFAULT_RANGES_PLACEHOLDER),
    [preset],
  )

  // Adaptação inteligente (puxa do learning-store)
  const [adaptation, setAdaptation] = useState<AdaptationResult | null>(null)

  useEffect(() => {
    if (!preset) {
      setAdaptation(null)
      return
    }
    let cancelled = false
    void (async () => {
      const result = await recommendParams(tissueId, bioinkId, preset.params)
      if (!cancelled) setAdaptation(result)
    })()
    return () => {
      cancelled = true
    }
  }, [tissueId, bioinkId, preset])

  // Parâmetros recomendados finais = adaptado (se houver) OU preset base
  const recommendedParams = useMemo<PresetParams | null>(() => {
    if (!preset) return null
    if (adaptation?.params) return adaptation.params
    return preset.params
  }, [preset, adaptation])

  // Quantos parâmetros do usuário desviam do recomendado?
  const deviations = useMemo(() => {
    if (!recommendedParams) return 0
    return countParamDeviations(currentParams, recommendedParams)
  }, [currentParams, recommendedParams])

  // Estados de UI (expanders + painel Regenerar)
  const [showRationale, setShowRationale] = useState(false)
  const [showFluxo, setShowFluxo] = useState(false)
  const [showValidacao, setShowValidacao] = useState(false)
  const [showRefs, setShowRefs] = useState(false)
  const [showAdjustPanel, setShowAdjustPanel] = useState(false)

  // ─── Renderização: sem preset (combinação não catalogada) ──
  if (!preset) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-amber-200">
              Sem preset para combinação{" "}
              <code className="font-mono bg-amber-500/10 px-1 rounded">{tissueId}</code> +{" "}
              <code className="font-mono bg-amber-500/10 px-1 rounded">{bioinkId}</code>
            </div>
            <div className="text-[10px] text-amber-200/80 mt-1 leading-relaxed">
              A BIA ainda não tem parâmetros curados pra essa combinação. Use os controles tradicionais
              abaixo pra configurar manualmente, ou troque o bioink/tecido.
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Renderização: card completo ──
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-violet-500/5 p-4 space-y-3">
      {/* ── Header: tecido + bioink + status ── */}
      <div className="flex items-start gap-3">
        <div className="text-3xl shrink-0">{preset.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Sparkles className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="text-sm font-bold text-emerald-100">Recomendado pela BIA</span>
            <AdaptationBadge adaptation={adaptation} />
          </div>
          <div className="text-base font-semibold text-white mt-0.5">{preset.displayName}</div>
          <div className="text-[11px] text-gray-300 leading-tight mt-0.5">{preset.summary}</div>
          {adaptation && adaptation.stats.total > 0 && (
            <StatsLine stats={adaptation.stats} />
          )}
        </div>
      </div>

      {/* ── Outras opções de bioink (se há alternativas pra esse tecido) ── */}
      {alternativePresets.length > 0 && onBioinkChange && (
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-gray-400">Outras opções:</span>
          {alternativePresets.map((alt) => (
            <button
              key={alt.bioinkId}
              onClick={() => onBioinkChange(alt.bioinkId)}
              className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-[10px] transition-colors"
              title={alt.summary}
            >
              {alt.displayName}
            </button>
          ))}
        </div>
      )}

      {/* ── Parâmetros recomendados (resumo visual) ── */}
      <ParamsSummary params={recommendedParams!} preset={preset} />

      {/* ── Expanders: rationale, fluxo, validação, refs ── */}
      <div className="space-y-1.5">
        <Expander icon={<BookOpen className="w-3.5 h-3.5" />} label="Por que esses parâmetros?" open={showRationale} onToggle={() => setShowRationale(!showRationale)}>
          <RationaleBlock preset={preset} />
        </Expander>
        <Expander icon={<ListChecks className="w-3.5 h-3.5" />} label={`Fluxo de bioimpressão (${preset.fluxoBioimpressao.length} passos)`} open={showFluxo} onToggle={() => setShowFluxo(!showFluxo)}>
          <ol className="text-[11px] text-gray-200 leading-relaxed space-y-1.5 pl-1">
            {preset.fluxoBioimpressao.map((passo, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-emerald-300 font-mono shrink-0">{i + 1}.</span>
                <span>{passo}</span>
              </li>
            ))}
          </ol>
        </Expander>
        <Expander icon={<Activity className="w-3.5 h-3.5" />} label="Como validar o resultado" open={showValidacao} onToggle={() => setShowValidacao(!showValidacao)}>
          <ul className="text-[11px] text-gray-200 leading-relaxed space-y-1">
            {preset.validacaoEsperada.map((v, i) => (
              <li key={i} className="flex gap-2">
                <Check className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                <span>{v}</span>
              </li>
            ))}
          </ul>
        </Expander>
        <Expander icon={<FlaskConical className="w-3.5 h-3.5" />} label={`Referências científicas (${preset.referencias.length})`} open={showRefs} onToggle={() => setShowRefs(!showRefs)}>
          <ul className="text-[10px] text-gray-300 leading-relaxed space-y-1">
            {preset.referencias.map((ref, i) => (
              <li key={i} className="flex gap-2 items-start">
                <span className="text-violet-300 font-mono shrink-0">[{i + 1}]</span>
                <span>
                  {ref.citation}
                  {ref.doi && (
                    <>
                      {" · "}
                      <a
                        href={`https://doi.org/${ref.doi}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-300 hover:text-cyan-100 underline"
                      >
                        doi:{ref.doi}
                      </a>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Expander>
      </div>

      {/* ── Aviso de desvio ── */}
      {deviations > 0 && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[10px]">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>
            Você já ajustou <b>{deviations}</b> parâmetro(s) fora do recomendado. Clique em
            "Aplicar recomendado" pra resetar, ou em "Regerar G-code" pra usar os seus valores.
          </span>
        </div>
      )}

      {/* ── CTAs principais ── */}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={() => recommendedParams && onApplyParams(recommendedParams)}
          className="flex-1 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          title="Aplica os parâmetros recomendados aos sliders abaixo e prepara pra gerar G-code"
        >
          <Sparkles className="w-3.5 h-3.5" /> Aplicar recomendado
        </button>
        <button
          onClick={() => setShowAdjustPanel(!showAdjustPanel)}
          className={cn(
            "px-3 py-2 rounded-lg border text-xs font-bold transition-colors flex items-center gap-2",
            showAdjustPanel
              ? "bg-violet-500 hover:bg-violet-400 border-violet-400 text-white"
              : "bg-white/5 hover:bg-white/10 border-white/15 text-white"
          )}
          title="Abre painel com sliders pra customizar cada parâmetro"
        >
          <Wrench className="w-3.5 h-3.5" />
          {showAdjustPanel ? "Fechar ajustes" : "Ajustar e Regenerar"}
        </button>
      </div>

      {/* ── Painel de ajuste (expansível) ── */}
      {showAdjustPanel && recommendedParams && (
        <AdjustPanel
          current={currentParams}
          recommended={recommendedParams}
          ranges={ranges}
          onApply={onApplyParams}
        />
      )}
    </div>
  )
}

// ─── Sub-componentes ───────────────────────────────────────────────────

function AdaptationBadge({ adaptation }: { adaptation: AdaptationResult | null }) {
  if (!adaptation) return null
  const cfg = {
    no_history: { label: "Preset científico", color: "violet" },
    from_excellent: { label: "Baseado em ✅ excelentes anteriores", color: "emerald" },
    from_acceptable: { label: "Baseado em ⚠️ aceitáveis anteriores", color: "amber" },
    adjusted_from_bad: { label: "Ajustado pra evitar ❌ ruins anteriores", color: "rose" },
  }[adaptation.mode]
  const colorClass = {
    violet: "bg-violet-500/20 border-violet-400/40 text-violet-100",
    emerald: "bg-emerald-500/20 border-emerald-400/40 text-emerald-100",
    amber: "bg-amber-500/20 border-amber-400/40 text-amber-100",
    rose: "bg-rose-500/20 border-rose-400/40 text-rose-100",
  }[cfg.color]
  return (
    <span className={cn("text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border font-semibold", colorClass)}>
      {cfg.label}
    </span>
  )
}

function StatsLine({ stats }: { stats: CombinationStats }) {
  return (
    <div className="flex items-center gap-2 text-[10px] mt-1.5">
      <span className="text-gray-400">📊 Histórico:</span>
      <span className="text-emerald-300 font-mono">✅ {stats.excelente}</span>
      <span className="text-amber-300 font-mono">⚠️ {stats.aceitavel}</span>
      <span className="text-rose-300 font-mono">❌ {stats.ruim}</span>
      <span className="text-gray-500">({stats.total} total)</span>
    </div>
  )
}

function ParamsSummary({ params, preset }: { params: PresetParams; preset: TissuePreset }) {
  const items: Array<{ label: string; value: string; key: string }> = [
    { label: "Layer", value: `${params.layerHeightMm} mm`, key: "layerHeightMm" },
    { label: "Velocidade", value: `${params.printSpeedMmS} mm/s`, key: "printSpeedMmS" },
    { label: "Pressão", value: `${params.pressureKPa} kPa`, key: "pressureKPa" },
    { label: "Fluxo", value: `${params.flowPercent}%`, key: "flowPercent" },
    { label: "Infill", value: params.perimeterOnly ? "0% (perímetro)" : `${params.infillPercent}%`, key: "infillPercent" },
    { label: "Perímetros", value: `${params.walls}`, key: "walls" },
    { label: "Saia", value: `${params.skirtLoops} loops`, key: "skirtLoops" },
    { label: "Cartucho", value: `${params.cartridgeTempC}°C`, key: "cartridgeTempC" },
    { label: "Mesa", value: `${params.bedTempC}°C`, key: "bedTempC" },
  ]
  // Hint: marca diferenças do preset base (se a adaptação inteligente mudou algo)
  const baseParams = preset.params
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {items.map((item) => {
        const baseValue = (baseParams as unknown as Record<string, number | string | boolean>)[item.key]
        const curValue = (params as unknown as Record<string, number | string | boolean>)[item.key]
        const isAdjusted = baseValue !== curValue
        return (
          <div
            key={item.key}
            className={cn(
              "px-2 py-1.5 rounded-md border text-[10px]",
              isAdjusted
                ? "bg-amber-500/10 border-amber-500/40"
                : "bg-black/30 border-white/10",
            )}
            title={isAdjusted ? `Ajustado da base (era ${baseValue})` : ""}
          >
            <div className="text-gray-400">{item.label}</div>
            <div className={cn("font-mono font-semibold", isAdjusted ? "text-amber-200" : "text-white")}>
              {item.value}
              {isAdjusted && <span className="ml-1 text-amber-300">●</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Expander({
  icon, label, open, onToggle, children,
}: {
  icon: React.ReactNode
  label: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-2.5 py-1.5 flex items-center gap-2 text-[11px] font-semibold text-gray-200 hover:bg-white/5 transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
        {icon}
        <span className="flex-1 text-left">{label}</span>
      </button>
      {open && <div className="px-3 py-2 border-t border-white/10 bg-black/40">{children}</div>}
    </div>
  )
}

function RationaleBlock({ preset }: { preset: TissuePreset }) {
  const items: Array<[string, string]> = [
    ["Altura da camada", preset.rationale.layerHeight],
    ["Velocidade", preset.rationale.speed],
    ["Fluxo de extrusão", preset.rationale.flow],
    ["Infill", preset.rationale.infill],
    ["Perímetros", preset.rationale.walls],
  ]
  if (preset.rationale.pressure) items.push(["Pressão", preset.rationale.pressure])
  if (preset.rationale.temperature) items.push(["Temperatura", preset.rationale.temperature])
  return (
    <div className="space-y-2">
      {items.map(([label, text], i) => (
        <div key={i}>
          <div className="text-[10px] font-semibold text-emerald-200 uppercase tracking-wider">{label}</div>
          <div className="text-[11px] text-gray-200 leading-relaxed mt-0.5">{text}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Painel "Ajustar e Regenerar" ──────────────────────────────────────

function AdjustPanel({
  current, recommended, ranges, onApply,
}: {
  current: PresetParams
  recommended: PresetParams
  ranges: ParamRanges
  onApply: (params: PresetParams) => void
}) {
  // Estado local — não modifica o pai até o usuário clicar em "Aplicar"
  const [draft, setDraft] = useState<PresetParams>(current)

  // Quando o currentParams do pai muda, re-sincroniza o draft
  useEffect(() => {
    setDraft(current)
  }, [current])

  const deviationsFromRec = useMemo(
    () => countParamDeviations(draft, recommended),
    [draft, recommended],
  )

  const update = <K extends keyof PresetParams>(key: K, value: PresetParams[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  return (
    <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <Wrench className="w-3.5 h-3.5 text-violet-300" />
        <span className="text-xs font-semibold text-violet-100">Ajuste fino dos parâmetros</span>
        <span className="ml-auto text-[10px] text-violet-300/80">
          {deviationsFromRec > 0 ? `${deviationsFromRec} mudança(s)` : "= recomendado"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <Slider
          label="Altura da camada"
          unit="mm"
          value={draft.layerHeightMm}
          onChange={(v) => update("layerHeightMm", v)}
          min={ranges.layerHeightMm.min}
          max={ranges.layerHeightMm.max}
          step={ranges.layerHeightMm.step}
          recommended={recommended.layerHeightMm}
        />
        <Slider
          label="Velocidade"
          unit="mm/s"
          value={draft.printSpeedMmS}
          onChange={(v) => update("printSpeedMmS", v)}
          min={ranges.printSpeedMmS.min}
          max={ranges.printSpeedMmS.max}
          step={ranges.printSpeedMmS.step}
          recommended={recommended.printSpeedMmS}
        />
        <Slider
          label="Pressão"
          unit="kPa"
          value={draft.pressureKPa}
          onChange={(v) => update("pressureKPa", v)}
          min={ranges.pressureKPa.min}
          max={ranges.pressureKPa.max}
          step={ranges.pressureKPa.step}
          recommended={recommended.pressureKPa}
        />
        <Slider
          label="Fluxo de extrusão"
          unit="%"
          value={draft.flowPercent}
          onChange={(v) => update("flowPercent", v)}
          min={ranges.flowPercent.min}
          max={ranges.flowPercent.max}
          step={ranges.flowPercent.step}
          recommended={recommended.flowPercent}
        />
        {!draft.perimeterOnly && (
          <Slider
            label="Preenchimento (infill)"
            unit="%"
            value={draft.infillPercent}
            onChange={(v) => update("infillPercent", v)}
            min={ranges.infillPercent.min}
            max={ranges.infillPercent.max}
            step={ranges.infillPercent.step}
            recommended={recommended.infillPercent}
          />
        )}
        <Slider
          label="Perímetros (walls)"
          unit=""
          value={draft.walls}
          onChange={(v) => update("walls", v)}
          min={ranges.walls.min}
          max={ranges.walls.max}
          step={ranges.walls.step}
          recommended={recommended.walls}
        />
        <Slider
          label="Loops de saia"
          unit=""
          value={draft.skirtLoops}
          onChange={(v) => update("skirtLoops", v)}
          min={ranges.skirtLoops.min}
          max={ranges.skirtLoops.max}
          step={ranges.skirtLoops.step}
          recommended={recommended.skirtLoops}
        />
        <Slider
          label="Retração"
          unit="mm"
          value={draft.retractionMm}
          onChange={(v) => update("retractionMm", v)}
          min={ranges.retractionMm.min}
          max={ranges.retractionMm.max}
          step={ranges.retractionMm.step}
          recommended={recommended.retractionMm}
        />
        <Slider
          label="Temp. cartucho"
          unit="°C"
          value={draft.cartridgeTempC}
          onChange={(v) => update("cartridgeTempC", v)}
          min={ranges.cartridgeTempC.min}
          max={ranges.cartridgeTempC.max}
          step={ranges.cartridgeTempC.step}
          recommended={recommended.cartridgeTempC}
        />
        <Slider
          label="Temp. mesa"
          unit="°C"
          value={draft.bedTempC}
          onChange={(v) => update("bedTempC", v)}
          min={ranges.bedTempC.min}
          max={ranges.bedTempC.max}
          step={ranges.bedTempC.step}
          recommended={recommended.bedTempC}
        />
      </div>

      {/* Toggle perimeter only */}
      <label className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-black/30 border border-white/10 cursor-pointer">
        <input
          type="checkbox"
          checked={draft.perimeterOnly}
          onChange={(e) => update("perimeterOnly", e.target.checked)}
          className="mt-0.5 accent-violet-400"
        />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-white">
            Apenas perímetros (sem preenchimento interno)
            {recommended.perimeterOnly && (
              <span className="ml-1.5 text-[9px] text-emerald-300">recomendado ✓</span>
            )}
          </div>
          <div className="text-[9px] text-gray-400 leading-tight mt-0.5">
            Para membranas, vasos e testes de impressibilidade — força infill=0.
          </div>
        </div>
      </label>

      {/* Botões de ação */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => setDraft(recommended)}
          className="px-2.5 py-1.5 rounded-md bg-black/40 hover:bg-black/60 border border-white/15 text-gray-200 hover:text-white text-[11px] font-semibold transition-colors flex items-center gap-1.5"
          title="Volta todos os sliders pro valor recomendado pela BIA"
        >
          <RotateCw className="w-3 h-3" /> Resetar
        </button>
        <button
          onClick={() => onApply(draft)}
          className="flex-1 px-3 py-1.5 rounded-md bg-violet-500 hover:bg-violet-400 text-white text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-violet-500/20"
          title="Aplica seus valores customizados e regenera o G-code"
        >
          <Wand2 className="w-3 h-3" /> Aplicar e Regerar G-code
        </button>
      </div>
    </div>
  )
}

function Slider({
  label, unit, value, onChange, min, max, step, recommended,
}: {
  label: string
  unit: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  recommended: number
}) {
  const isAtRecommended = Math.abs(value - recommended) < step / 2
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-[10px] text-gray-300 font-medium">{label}</label>
        <div className="flex items-baseline gap-1.5 text-[10px]">
          <span className={cn(
            "font-mono font-semibold",
            isAtRecommended ? "text-emerald-300" : "text-amber-300",
          )}>
            {value}{unit}
          </span>
          {!isAtRecommended && (
            <span className="text-gray-500 text-[9px]">
              (rec: {recommended}{unit})
            </span>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={cn(
          "w-full h-1.5 rounded-full appearance-none cursor-pointer",
          isAtRecommended
            ? "accent-emerald-400 bg-emerald-500/20"
            : "accent-amber-400 bg-amber-500/20",
        )}
      />
    </div>
  )
}

// ─── Constants ─────────────────────────────────────────────────────────

const DEFAULT_RANGES_PLACEHOLDER: ParamRanges = {
  layerHeightMm: { min: 0.05, max: 0.5, step: 0.05 },
  printSpeedMmS: { min: 2, max: 30, step: 1 },
  pressureKPa: { min: 5, max: 150, step: 5 },
  flowPercent: { min: 20, max: 100, step: 5 },
  infillPercent: { min: 0, max: 100, step: 5 },
  walls: { min: 1, max: 5, step: 1 },
  skirtLoops: { min: 0, max: 5, step: 1 },
  retractionMm: { min: 0, max: 5, step: 0.5 },
  cartridgeTempC: { min: 4, max: 40, step: 1 },
  bedTempC: { min: 4, max: 60, step: 1 },
}
