"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA — Quick G-Code (R12.12)
 *  ───────────────────────────────────────────────────────────────────────
 *  Fluxo simplificado, fluido e SÍNCRONO de geração de G-code.
 *
 *  Resolve a queixa do usuário: a página /slice rodava o motor pesado
 *  (precomputeVoronoi3D + 11 algoritmos de infill + LLM) com timeout
 *  de 45s e travava com geometrias complexas.
 *
 *  Aqui o usuário escolhe:
 *    1. BIOTINTA — preset rápido OU vinda do Formulator Pro OU custom
 *    2. MODELO   — 5 geometrias paramétricas básicas
 *    3. OPÇÕES   — altura de camada, infill, densidade, paredes
 *
 *  Resultado: G-code em <100 ms · viewer 3D · racional em português.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import {
  Zap, Droplets, Box, Settings2, Play, Download, ArrowRight, Send,
  Sparkles, FlaskConical, CheckCircle2, Info, AlertTriangle, Eye,
  BookOpen, Clock, Layers as LayersIcon, FileCode, ChevronRight,
  Activity, Microscope,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { sendToExecute } from "@/lib/bioprint/execute-handoff"
import {
  generateQuickGcode,
  GEOMETRY_PRESETS,
  BIOINK_QUICK_PRESETS,
  geometryLabel,
  infillLabel,
  type QuickGeometry,
  type QuickGeometryId,
  type QuickBioinkParams,
  type QuickInfillPattern,
  type QuickGcodeOptions,
  type QuickGcodeResult,
} from "@/lib/bioprint/quick-gcode"
import {
  verdictColor, NELSON_2021_CITATION, NELSON_OPTIMAL_WINDOWS,
} from "@/lib/bioprint/printability-nelson2021"
import { parseGcode, type ParsedGcode } from "@/lib/bioprint/toolpath-engine"
import { GcodeViewer3D } from "@/components/bioprinter/GcodeViewer3D"

// ─── Tipo de "carga" vinda do Formulator Pro ──────────────────────────────

interface FormulatorBioinkPayload {
  materialLabel: string
  nozzleDiameter_mm?: number
  viscosity_PaS?: number
  printSpeed_mms?: number
  travelSpeed_mms?: number
  pressure_kpa?: number
  crosslinker?: string | null
  hasCells?: boolean
  cellType?: string | null
  cellDensity_M_per_mL?: number | null
  /** Vindo do Formulator Pro PRO — guardado p/ exibir no header */
  source?: "formulator-pro" | "manual" | "preset"
  sourceTag?: string
}

const SESSION_KEY = "bia.quickgcode.bioink"

// ═══════════════════════════════════════════════════════════════════════════
//   PÁGINA
// ═══════════════════════════════════════════════════════════════════════════

export default function QuickGCodePage() {
  // ─── Estado: Bioink ─────────────────────────────────────────────────────
  const [bioinkPresetId, setBioinkPresetId] = useState<string>("gelma-10")
  const [bioink, setBioink] = useState<QuickBioinkParams>(() => {
    const p = BIOINK_QUICK_PRESETS[0]
    return {
      materialLabel: p.materialLabel,
      nozzleDiameter_mm: p.nozzleDiameter_mm,
      viscosity_PaS: p.viscosity_PaS,
      printSpeed_mms: p.printSpeed_mms,
      travelSpeed_mms: p.travelSpeed_mms,
      pressure_kpa: p.pressure_kpa,
      crosslinker: p.crosslinker ?? null,
      hasCells: false,
      cellType: null,
      cellDensity_M_per_mL: null,
    }
  })
  const [bioinkSource, setBioinkSource] = useState<"preset" | "formulator-pro" | "manual">("preset")
  const [bioinkSourceTag, setBioinkSourceTag] = useState<string>("GelMA 10% w/v (preset)")

  // ─── Estado: Geometria ──────────────────────────────────────────────────
  const [geomId, setGeomId] = useState<QuickGeometryId>("cube")
  const [geom, setGeom] = useState<QuickGeometry>(() => {
    const p = GEOMETRY_PRESETS[0]
    return { id: p.id, ...p.defaultParams }
  })

  // ─── Estado: Opções ─────────────────────────────────────────────────────
  const [opts, setOpts] = useState<QuickGcodeOptions>({
    layerHeight_mm: 0.3,
    infillPattern: "rectilinear",
    infillDensity_pct: 30,
    walls: 2,
    jobName: "quick_print",
  })

  // ─── Estado: Resultado ──────────────────────────────────────────────────
  const [result, setResult] = useState<QuickGcodeResult | null>(null)
  const [parsedViz, setParsedViz] = useState<ParsedGcode | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [didImportFromFormulator, setDidImportFromFormulator] = useState(false)

  // ─── Hidratar do sessionStorage (vindo do Formulator Pro) ──────────────
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.sessionStorage.getItem(SESSION_KEY)
      if (!raw) return
      const data = JSON.parse(raw) as FormulatorBioinkPayload
      if (!data || !data.materialLabel) return
      setBioink({
        materialLabel: data.materialLabel,
        nozzleDiameter_mm: data.nozzleDiameter_mm ?? 0.41,
        viscosity_PaS: data.viscosity_PaS ?? 5,
        printSpeed_mms: data.printSpeed_mms ?? 8,
        travelSpeed_mms: data.travelSpeed_mms ?? 25,
        pressure_kpa: data.pressure_kpa,
        crosslinker: data.crosslinker ?? null,
        hasCells: data.hasCells ?? false,
        cellType: data.cellType ?? null,
        cellDensity_M_per_mL: data.cellDensity_M_per_mL ?? null,
      })
      setBioinkSource(data.source ?? "formulator-pro")
      setBioinkSourceTag(data.sourceTag ?? data.materialLabel)
      setBioinkPresetId("custom")
      setDidImportFromFormulator(true)
      // Consume — não queremos sobrescrever em refresh
      window.sessionStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  // ─── Quando troca de preset ────────────────────────────────────────────
  const handlePickPreset = useCallback((id: string) => {
    if (id === "custom") {
      setBioinkPresetId("custom")
      setBioinkSource("manual")
      setBioinkSourceTag(bioink.materialLabel || "Custom")
      return
    }
    const p = BIOINK_QUICK_PRESETS.find((x) => x.id === id)
    if (!p) return
    setBioinkPresetId(id)
    setBioink({
      materialLabel: p.materialLabel,
      nozzleDiameter_mm: p.nozzleDiameter_mm,
      viscosity_PaS: p.viscosity_PaS,
      printSpeed_mms: p.printSpeed_mms,
      travelSpeed_mms: p.travelSpeed_mms,
      pressure_kpa: p.pressure_kpa,
      crosslinker: p.crosslinker ?? null,
      hasCells: false,
      cellType: null,
      cellDensity_M_per_mL: null,
    })
    setBioinkSource("preset")
    setBioinkSourceTag(`${p.label} (preset)`)
  }, [bioink.materialLabel])

  // ─── Quando troca de geometria ─────────────────────────────────────────
  const handlePickGeometry = useCallback((id: QuickGeometryId) => {
    const p = GEOMETRY_PRESETS.find((x) => x.id === id)
    if (!p) return
    setGeomId(id)
    setGeom({ id, ...p.defaultParams })
  }, [])

  // ─── GERAR ─────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    setErrorMsg(null)
    try {
      const t0 = performance.now()
      const r = generateQuickGcode(geom, bioink, opts)
      const dt = performance.now() - t0
      setResult(r)
      // Parse para o viewer 3D
      try {
        const parsed = parseGcode(r.gcode)
        setParsedViz(parsed)
      } catch (e) {
        setParsedViz(null)
        console.warn("parseGcode falhou (não-crítico):", e)
      }
      // eslint-disable-next-line no-console
      console.log(`[quick-gcode] gerado em ${dt.toFixed(1)} ms · ${r.moveCount} moves · ${r.layerCount} camadas`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setErrorMsg(msg)
      setResult(null)
      setParsedViz(null)
    }
  }, [geom, bioink, opts])

  // ─── DOWNLOAD ──────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    if (!result) return
    const blob = new Blob([result.gcode], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const name = (opts.jobName || "quick_print").replace(/[^a-z0-9_-]+/gi, "_")
    a.download = `${name}.gcode`
    a.click()
    URL.revokeObjectURL(url)
  }, [result, opts.jobName])

  // ─── Stats do resultado ────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!result) return null
    return {
      moves: result.moveCount.toLocaleString("pt-BR"),
      layers: result.layerCount,
      volume: result.bioinkVolume_uL.toFixed(1),
      timeMin: result.estimatedTime_min.toFixed(1),
      gcodeKb: (result.gcode.length / 1024).toFixed(1),
    }
  }, [result])

  const geomPreset = GEOMETRY_PRESETS.find((g) => g.id === geomId) ?? GEOMETRY_PRESETS[0]

  // ═══════════════════════════════════════════════════════════════════════
  //   RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-5">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <header className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.08] via-cyan-500/[0.04] to-emerald-500/[0.04] p-5">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="w-11 h-11 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-violet-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider text-violet-300/80 font-semibold">
                Engine síncrono · R12.12
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 font-semibold uppercase tracking-wider">
                &lt; 100 ms
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-semibold uppercase tracking-wider">
                Sem timeout
              </span>
            </div>
            <h1 className="text-lg font-bold text-white mt-0.5">
              Quick G-Code · biotinta + modelo simples → código pronto
            </h1>
            <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">
              Geração determinística, sem LLM, sem pré-processamento pesado. Use quando
              você quer um G-code rápido para validar parâmetros, treinar a bioimpressora ou
              imprimir geometrias paramétricas simples. Para algoritmos científicos avançados
              (Voronoi, Gyroid, Vascular FRESH), use a etapa <Link href="/dashboard/bioprint/slice" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">Fatiamento</Link> ou o <Link href="/dashboard/bioprint/toolpath" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">Painel Profissional</Link>.
            </p>
          </div>
        </div>

        {/* Aviso de import vindo do Formulator Pro */}
        {didImportFromFormulator && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-emerald-100">
              <span className="font-semibold">Biotinta importada do Formulator Pro</span>
              <div className="text-[11px] text-emerald-200/80 mt-0.5">
                Parâmetros reológicos e de impressão foram pré-preenchidos. Ajuste se precisar.
              </div>
            </div>
            <button
              onClick={() => setDidImportFromFormulator(false)}
              className="text-[10px] text-emerald-300/70 hover:text-emerald-200 px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}
      </header>

      {/* ─── Grid principal — 2 colunas em desktop ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-5 items-start">
        {/* ════════════ COLUNA ESQUERDA — Inputs ═════════════════════════ */}
        <div className="space-y-5">
          {/* ─── PASSO 1: BIOTINTA ──────────────────────────────────────── */}
          <section className="rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.03] overflow-hidden">
            <header className="flex items-center gap-3 px-4 py-3 border-b border-cyan-500/15 bg-cyan-500/[0.04]">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <Droplets className="w-4 h-4 text-cyan-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-cyan-300/80 font-semibold">
                  Passo 1
                </div>
                <h2 className="text-sm font-bold text-white">Escolha a biotinta</h2>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-200">
                {bioinkSourceTag}
              </span>
            </header>

            <div className="p-4 space-y-3">
              {/* Botão Formulator Pro */}
              <Link
                href={`/dashboard/formulator-pro?return=${encodeURIComponent("/dashboard/bioprint/quick-gcode")}`}
                className="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/[0.06] hover:bg-blue-500/[0.10] hover:border-blue-400/50 transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FlaskConical className="w-4 h-4 text-blue-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white">
                    Vir do Formulator Pro
                  </div>
                  <div className="text-[10.5px] text-blue-200/80">
                    Formulação científica completa com componentes, crosslinking e protocolo
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-300/60 group-hover:text-blue-200 group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>

              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-gray-500">
                <div className="h-px flex-1 bg-white/5" />
                ou escolha um preset rápido
                <div className="h-px flex-1 bg-white/5" />
              </div>

              {/* Presets de biotinta */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {BIOINK_QUICK_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePickPreset(p.id)}
                    className={cn(
                      "text-left rounded-lg border px-2.5 py-2 transition-all",
                      bioinkPresetId === p.id
                        ? "border-cyan-400 bg-cyan-500/15"
                        : "border-white/10 bg-white/[0.02] hover:border-cyan-500/30 hover:bg-cyan-500/[0.05]"
                    )}
                  >
                    <div className="text-[11px] font-semibold text-white truncate">{p.label}</div>
                    <div className="text-[9.5px] text-gray-400 leading-snug mt-0.5 line-clamp-2">
                      {p.hint}
                    </div>
                  </button>
                ))}
              </div>

              {/* Parâmetros editáveis */}
              <details className="rounded-lg border border-white/8 bg-white/[0.02] overflow-hidden" open={bioinkSource === "manual" || bioinkSource === "formulator-pro"}>
                <summary className="px-3 py-2 cursor-pointer text-[11px] font-semibold text-cyan-200 flex items-center gap-1.5 hover:bg-white/[0.02]">
                  <Settings2 className="w-3.5 h-3.5" /> Parâmetros reológicos / impressão
                </summary>
                <div className="px-3 pb-3 pt-1 space-y-2.5">
                  <LabeledInput
                    label="Material"
                    value={bioink.materialLabel}
                    onChange={(v) => setBioink({ ...bioink, materialLabel: v })}
                    hint="Nome do material (livre)"
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    <LabeledNumber
                      label="Bico Ø (mm)"
                      value={bioink.nozzleDiameter_mm}
                      onChange={(v) => setBioink({ ...bioink, nozzleDiameter_mm: v })}
                      min={0.1} max={2} step={0.05}
                      hint="Diâmetro interno"
                    />
                    <LabeledNumber
                      label="Viscosidade (Pa·s)"
                      value={bioink.viscosity_PaS}
                      onChange={(v) => setBioink({ ...bioink, viscosity_PaS: v })}
                      min={0.1} max={500} step={0.5}
                    />
                    <LabeledNumber
                      label="Velocidade impressão (mm/s)"
                      value={bioink.printSpeed_mms}
                      onChange={(v) => setBioink({ ...bioink, printSpeed_mms: v })}
                      min={0.5} max={50} step={0.5}
                    />
                    <LabeledNumber
                      label="Velocidade travel (mm/s)"
                      value={bioink.travelSpeed_mms}
                      onChange={(v) => setBioink({ ...bioink, travelSpeed_mms: v })}
                      min={5} max={120} step={5}
                    />
                    <LabeledNumber
                      label="Pressão (kPa, opcional)"
                      value={bioink.pressure_kpa ?? 0}
                      onChange={(v) => setBioink({ ...bioink, pressure_kpa: v || undefined })}
                      min={0} max={600} step={10}
                    />
                    <LabeledInput
                      label="Crosslinker"
                      value={bioink.crosslinker ?? ""}
                      onChange={(v) => setBioink({ ...bioink, crosslinker: v || null })}
                      hint="ex: UV 365nm + LAP 0.3%"
                    />
                  </div>
                  {/* Células */}
                  <div className="rounded-lg bg-emerald-500/[0.04] border border-emerald-500/20 p-2.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bioink.hasCells ?? false}
                        onChange={(e) => setBioink({ ...bioink, hasCells: e.target.checked })}
                        className="accent-emerald-500"
                      />
                      <span className="text-[11px] text-emerald-200 font-medium">Contém células</span>
                    </label>
                    {bioink.hasCells && (
                      <div className="grid grid-cols-2 gap-2.5 mt-2">
                        <LabeledInput
                          label="Tipo celular"
                          value={bioink.cellType ?? ""}
                          onChange={(v) => setBioink({ ...bioink, cellType: v || null })}
                          hint="ex: hMSC, HUVEC, fibroblasto"
                          dense
                        />
                        <LabeledNumber
                          label="Densidade (×10⁶/mL)"
                          value={bioink.cellDensity_M_per_mL ?? 0}
                          onChange={(v) => setBioink({ ...bioink, cellDensity_M_per_mL: v || null })}
                          min={0} max={50} step={0.5}
                          dense
                        />
                      </div>
                    )}
                  </div>
                </div>
              </details>
            </div>
          </section>

          {/* ─── PASSO 2: GEOMETRIA ─────────────────────────────────────── */}
          <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.03] overflow-hidden">
            <header className="flex items-center gap-3 px-4 py-3 border-b border-emerald-500/15 bg-emerald-500/[0.04]">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Box className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-emerald-300/80 font-semibold">
                  Passo 2
                </div>
                <h2 className="text-sm font-bold text-white">Escolha o modelo 3D</h2>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
                {geometryLabel(geomId)}
              </span>
            </header>

            <div className="p-4 space-y-3">
              {/* Aviso STL upload futuro */}
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                <div className="text-[10.5px] text-amber-200/90 leading-relaxed">
                  <strong>STL/Modelo 3D externo:</strong> use a etapa{" "}
                  <Link href="/dashboard/bioprint/model" className="text-amber-200 underline underline-offset-2 hover:text-amber-100">
                    Modelo 3D
                  </Link>{" "}
                  para upload/preview de STL. Aqui você parametriza geometrias básicas para impressão rápida.
                </div>
              </div>

              {/* Chips de geometrias */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {GEOMETRY_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePickGeometry(p.id)}
                    className={cn(
                      "text-left rounded-lg border px-2.5 py-2 transition-all",
                      geomId === p.id
                        ? "border-emerald-400 bg-emerald-500/15"
                        : "border-white/10 bg-white/[0.02] hover:border-emerald-500/30 hover:bg-emerald-500/[0.05]"
                    )}
                  >
                    <div className="text-[11px] font-semibold text-white">{p.label}</div>
                    <div className="text-[9.5px] text-gray-400 leading-snug mt-0.5 line-clamp-2">
                      {p.description}
                    </div>
                  </button>
                ))}
              </div>

              {/* Slider de dimensões — depende da geometria */}
              <div className="space-y-2.5 pt-1">
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  💡 <strong>Bom para:</strong> {geomPreset.goodFor.join(" · ")}
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  <LabeledSlider
                    label="Largura X (mm)"
                    value={geom.width}
                    onChange={(v) => setGeom({ ...geom, width: v })}
                    min={2} max={80} step={0.5}
                  />
                  <LabeledSlider
                    label="Profund. Y (mm)"
                    value={geom.depth}
                    onChange={(v) => setGeom({ ...geom, depth: v })}
                    min={2} max={80} step={0.5}
                  />
                  <LabeledSlider
                    label="Altura Z (mm)"
                    value={geom.height}
                    onChange={(v) => setGeom({ ...geom, height: v })}
                    min={0.3} max={50} step={0.1}
                  />
                </div>
                {geomId === "grid" && (
                  <LabeledSlider
                    label="Passo do grid (mm)"
                    value={geom.pitch ?? 1.5}
                    onChange={(v) => setGeom({ ...geom, pitch: v })}
                    min={0.4} max={5} step={0.1}
                    hint="Distância entre linhas — porosidade do scaffold"
                  />
                )}
                {geomId === "hollow-sphere" && (
                  <LabeledSlider
                    label="Espessura da parede (mm)"
                    value={geom.wallThickness ?? 1.5}
                    onChange={(v) => setGeom({ ...geom, wallThickness: v })}
                    min={0.4} max={5} step={0.1}
                    hint="Espessura da casca esférica"
                  />
                )}
              </div>
            </div>
          </section>

          {/* ─── PASSO 3: OPÇÕES ────────────────────────────────────────── */}
          <section className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.03] overflow-hidden">
            <header className="flex items-center gap-3 px-4 py-3 border-b border-violet-500/15 bg-violet-500/[0.04]">
              <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
                <Settings2 className="w-4 h-4 text-violet-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-violet-300/80 font-semibold">
                  Passo 3
                </div>
                <h2 className="text-sm font-bold text-white">Opções de impressão</h2>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-200">
                {infillLabel(opts.infillPattern)} · {opts.walls}w
              </span>
            </header>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <LabeledSlider
                  label="Altura de camada (mm)"
                  value={opts.layerHeight_mm}
                  onChange={(v) => setOpts({ ...opts, layerHeight_mm: v })}
                  min={0.1} max={0.6} step={0.05}
                  hint="Típico 0.2–0.4"
                />
                <LabeledSlider
                  label="Paredes (perímetros)"
                  value={opts.walls}
                  onChange={(v) => setOpts({ ...opts, walls: Math.round(v) })}
                  min={1} max={4} step={1}
                />
              </div>

              {/* Infill */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider">
                  Padrão de infill
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "rectilinear", label: "Rectilinear", hint: "Linhas cruzadas 0°/90°" },
                    { id: "concentric",  label: "Concêntrico", hint: "Espirais (ideal p/ disco)" },
                    { id: "none",        label: "Sem infill",  hint: "Apenas paredes (oco)" },
                  ].map((it) => (
                    <button
                      key={it.id}
                      onClick={() => setOpts({ ...opts, infillPattern: it.id as QuickInfillPattern })}
                      className={cn(
                        "rounded-lg border p-2 text-left transition-all",
                        opts.infillPattern === it.id
                          ? "border-violet-400 bg-violet-500/15"
                          : "border-white/10 bg-white/[0.02] hover:border-violet-500/30"
                      )}
                    >
                      <div className="text-[11px] font-semibold text-white">{it.label}</div>
                      <div className="text-[9.5px] text-gray-400 leading-snug mt-0.5">{it.hint}</div>
                    </button>
                  ))}
                </div>
              </div>

              {opts.infillPattern !== "none" && (
                <LabeledSlider
                  label={`Densidade de infill: ${opts.infillDensity_pct}%`}
                  value={opts.infillDensity_pct}
                  onChange={(v) => setOpts({ ...opts, infillDensity_pct: Math.round(v) })}
                  min={5} max={100} step={5}
                  hint="Quanto mais alto, mais material"
                />
              )}

              {/* Nome do job */}
              <LabeledInput
                label="Nome do job (header do G-code)"
                value={opts.jobName ?? ""}
                onChange={(v) => setOpts({ ...opts, jobName: v })}
                hint="usado no nome do arquivo .gcode"
              />
            </div>
          </section>

          {/* ─── BOTÃO GERAR ────────────────────────────────────────────── */}
          <button
            onClick={handleGenerate}
            className="w-full rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 hover:from-violet-400 hover:via-fuchsia-400 hover:to-cyan-400 text-white font-bold text-sm px-5 py-4 transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
          >
            <Play className="w-4 h-4" /> Gerar G-code agora
            <ChevronRight className="w-4 h-4 opacity-80" />
          </button>

          {errorMsg && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-100">
                <div className="font-semibold">Erro na geração</div>
                <div className="text-[11px] text-rose-200/80 mt-0.5">{errorMsg}</div>
              </div>
            </div>
          )}
        </div>

        {/* ════════════ COLUNA DIREITA — Resultado ═══════════════════════ */}
        <div className="space-y-4 lg:sticky lg:top-4">
          {/* Viewer 3D */}
          <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
            <header className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-white/[0.02]">
              <Eye className="w-3.5 h-3.5 text-cyan-300" />
              <span className="text-[11px] font-semibold text-white">Visualização 3D</span>
              {result && (
                <span className="ml-auto text-[10px] text-gray-400">
                  {stats?.moves} moves · {stats?.layers} camadas
                </span>
              )}
            </header>
            <div className="h-[360px] sm:h-[420px] relative">
              {parsedViz ? (
                <GcodeViewer3D parsed={parsedViz} initialColorMode="layer" className="h-full" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500">
                  <Sparkles className="w-6 h-6 opacity-40" />
                  <p className="text-xs">Clique em <strong>Gerar G-code</strong> para visualizar</p>
                </div>
              )}
            </div>
          </div>

          {/* Estatísticas */}
          {result && stats && (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4">
              <h3 className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> G-code pronto
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatCard icon={<LayersIcon className="w-3 h-3" />} label="Camadas" value={String(stats.layers)} />
                <StatCard icon={<FileCode className="w-3 h-3" />} label="Moves" value={stats.moves} />
                <StatCard icon={<Droplets className="w-3 h-3" />} label="Biotinta (µL)" value={stats.volume} />
                <StatCard icon={<Clock className="w-3 h-3" />} label="Tempo (min)" value={stats.timeMin} />
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={handleDownload}
                  className="rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-100 text-xs font-semibold px-4 py-2.5 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar .gcode ({stats.gcodeKb} kB)
                </button>
                <button
                  onClick={() => {
                    if (!result) return
                    sendToExecute({
                      gcode: result.gcode,
                      name: `${(opts.jobName || "quick_print").replace(/[^a-z0-9_-]+/gi, "_")}.gcode`,
                      from: "quick-gcode",
                    })
                  }}
                  className="rounded-xl bg-gradient-to-r from-amber-500/20 to-cyan-500/20 hover:from-amber-500/30 hover:to-cyan-500/30 border border-amber-500/40 text-amber-100 text-xs font-bold px-4 py-2.5 transition-all flex items-center justify-center gap-1.5"
                  title="Carrega este G-code na tela de Execução (USB / Web Serial / Mock)"
                >
                  <Send className="w-3.5 h-3.5" /> Enviar para Execução →
                </button>
              </div>
            </div>
          )}

          {/* R12.13: Análise Nelson 2021 — Printability Score */}
          {result && result.printability && (() => {
            const p = result.printability
            const c = verdictColor(p.verdict)
            return (
              <div className={cn("rounded-2xl border p-4", c.border, c.bg)}>
                <header className="flex items-center justify-between gap-2 mb-3">
                  <h3 className={cn("text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5", c.text)}>
                    <Microscope className="w-3.5 h-3.5" />
                    Análise de Imprimibilidade
                  </h3>
                  <span className={cn("text-[9px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider", c.border, c.bg, c.text)}>
                    {c.label}
                  </span>
                </header>

                {/* Score grande + circular */}
                <div className="flex items-center gap-4 mb-3">
                  <div className={cn(
                    "w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center",
                    c.border, c.bg,
                  )}>
                    <span className={cn("text-3xl font-bold leading-none", c.text)}>{p.score}</span>
                    <span className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-wide">/100</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Score Nelson</div>
                    <div className={cn("text-sm font-semibold", c.text)}>
                      {p.closestReference.label}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      Pr={p.closestReference.Pr.toFixed(2)} · altura máx {p.closestReference.maxBuildHeight_mm} mm
                    </div>
                  </div>
                </div>

                {/* Wall shear + risco celular */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="rounded-lg bg-black/20 border border-white/8 px-2.5 py-1.5">
                    <div className="text-[9px] text-gray-400 uppercase tracking-wide flex items-center gap-1">
                      <Activity className="w-3 h-3" /> Wall shear
                    </div>
                    <div className="text-xs text-white font-mono font-semibold mt-0.5">
                      {(p.wallShearStress_Pa / 1000).toFixed(2)} kPa
                    </div>
                  </div>
                  <div className={cn(
                    "rounded-lg border px-2.5 py-1.5",
                    p.cellShearRisk === "safe" ? "bg-emerald-500/10 border-emerald-500/30"
                    : p.cellShearRisk === "warning" ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-rose-500/10 border-rose-500/30",
                  )}>
                    <div className="text-[9px] text-gray-400 uppercase tracking-wide">Risco celular</div>
                    <div className={cn(
                      "text-xs font-semibold mt-0.5 uppercase",
                      p.cellShearRisk === "safe" ? "text-emerald-200"
                      : p.cellShearRisk === "warning" ? "text-amber-200"
                      : "text-rose-200",
                    )}>
                      {p.cellShearRisk === "safe" ? "🟢 Seguro" : p.cellShearRisk === "warning" ? "🟡 Atenção" : "🔴 Crítico"}
                    </div>
                  </div>
                </div>

                {/* Janelas Nelson — barras visuais */}
                <details className="rounded-lg bg-black/15 border border-white/8 overflow-hidden">
                  <summary className="px-2.5 py-1.5 cursor-pointer text-[10.5px] font-semibold text-gray-300 hover:text-white flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3" /> Janelas ótimas do paper
                  </summary>
                  <div className="px-2.5 pb-2.5 pt-1 space-y-1.5">
                    <WindowBar
                      label="Viscosidade @ 1 s⁻¹"
                      value={bioink.viscosity_PaS}
                      min={NELSON_OPTIMAL_WINDOWS.initialViscosity_PaS.min}
                      max={NELSON_OPTIMAL_WINDOWS.initialViscosity_PaS.max}
                      ideal={NELSON_OPTIMAL_WINDOWS.initialViscosity_PaS.ideal}
                      unit="Pa·s"
                    />
                    <WindowBar
                      label="Wall shear stress"
                      value={p.wallShearStress_Pa / 1000}
                      min={0}
                      max={NELSON_OPTIMAL_WINDOWS.wallShearStress_Pa.warning / 1000}
                      ideal={NELSON_OPTIMAL_WINDOWS.wallShearStress_Pa.safe / 1000}
                      unit="kPa"
                      inverse
                    />
                  </div>
                </details>

                <p className="text-[9.5px] text-gray-500 mt-2.5 leading-relaxed">
                  Baseado em <a href={`https://doi.org/${NELSON_2021_CITATION.doi}`} target="_blank" rel="noreferrer" className="text-blue-300 hover:underline font-mono">
                    {NELSON_2021_CITATION.short}
                  </a> · {NELSON_2021_CITATION.journal} · DOI {NELSON_2021_CITATION.doi}
                </p>
              </div>
            )
          })()}

          {/* Racional */}
          {result && result.rationale.length > 0 && (
            <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.04] p-4">
              <h3 className="text-[11px] font-semibold text-violet-200 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Por que esses parâmetros?
              </h3>
              <ol className="space-y-1.5">
                {result.rationale.map((r, i) => (
                  <li key={i} className="text-[11.5px] text-violet-50/90 leading-relaxed flex gap-2">
                    <span className="text-violet-300/70 font-mono text-[10px] pt-0.5">{(i + 1).toString().padStart(2, "0")}.</span>
                    <span className="flex-1">{r}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Warnings */}
          {result && result.warnings.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-4">
              <h3 className="text-[11px] font-semibold text-amber-200 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Avisos
              </h3>
              <ul className="space-y-1.5">
                {result.warnings.map((w, i) => (
                  <li key={i} className="text-[11px] text-amber-100/90 leading-relaxed flex gap-2">
                    <span className="text-amber-300">⚠</span>
                    <span className="flex-1">{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Aviso de uso */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
            <p className="text-[10.5px] text-gray-400 leading-relaxed">
              O G-code NÃO inclui aquecimento nem <code className="text-gray-300">G28</code>.
              Posicione o bico manualmente sobre o substrato antes de enviar. Use a
              etapa <Link href="/dashboard/bioprint/control" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">Execução</Link> para
              streamar o código para a bioimpressora.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//   Sub-componentes
// ═══════════════════════════════════════════════════════════════════════════

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/20 border border-white/8 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[9px] text-gray-400 uppercase tracking-wide">
        {icon} {label}
      </div>
      <div className="text-xs text-white font-mono font-semibold mt-0.5">{value}</div>
    </div>
  )
}

function LabeledInput({
  label, value, onChange, hint, dense = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
  dense?: boolean
}) {
  return (
    <label className="block">
      <span className={cn("block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5", dense && "text-[9px]")}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-md bg-black/30 border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono",
          "focus:outline-none focus:border-cyan-500/50 focus:bg-black/40",
          dense && "py-1 text-[11px]"
        )}
      />
      {hint && <span className="block text-[9.5px] text-gray-500 mt-0.5">{hint}</span>}
    </label>
  )
}

function LabeledNumber({
  label, value, onChange, min, max, step, hint, dense = false,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  hint?: string
  dense?: boolean
}) {
  return (
    <label className="block">
      <span className={cn("block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5", dense && "text-[9px]")}>{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min} max={max} step={step}
        className={cn(
          "w-full rounded-md bg-black/30 border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono",
          "focus:outline-none focus:border-cyan-500/50 focus:bg-black/40",
          dense && "py-1 text-[11px]"
        )}
      />
      {hint && <span className="block text-[9.5px] text-gray-500 mt-0.5">{hint}</span>}
    </label>
  )
}

/**
 * R12.13: Barra visual mostrando onde o valor cai na janela ótima Nelson.
 * Verde se dentro da janela, amarelo se próximo, vermelho se fora.
 * inverse=true significa "menor é melhor" (ex: shear stress).
 */
function WindowBar({
  label, value, min, max, ideal, unit, inverse = false,
}: {
  label: string
  value: number
  min: number
  max: number
  ideal: number
  unit: string
  inverse?: boolean
}) {
  const span = Math.max(max - min, 1)
  const pos = Math.max(0, Math.min(100, ((value - min) / span) * 100))
  const idealPos = Math.max(0, Math.min(100, ((ideal - min) / span) * 100))
  const inWindow = inverse
    ? value <= max
    : value >= min && value <= max
  const color = inWindow ? "bg-emerald-500" : value > max ? "bg-rose-500" : "bg-amber-500"
  return (
    <div>
      <div className="flex items-center justify-between text-[9.5px]">
        <span className="text-gray-400">{label}</span>
        <span className={cn("font-mono", inWindow ? "text-emerald-300" : "text-amber-300")}>
          {value.toFixed(2)} {unit}
        </span>
      </div>
      <div className="relative h-1.5 mt-0.5 rounded-full bg-white/5 overflow-visible">
        {/* zona ideal — verde claro */}
        <div className="absolute inset-y-0 bg-emerald-500/15"
             style={{ left: `${Math.max(0, idealPos - 10)}%`, right: `${Math.max(0, 100 - idealPos - 10)}%` }} />
        {/* marcador do valor */}
        <div className={cn("absolute -top-0.5 w-1 h-2.5 rounded-sm", color)}
             style={{ left: `calc(${pos}% - 2px)` }} />
        {/* tick do ideal */}
        <div className="absolute -bottom-0.5 w-px h-2 bg-white/30"
             style={{ left: `${idealPos}%` }} />
      </div>
      <div className="flex justify-between text-[8.5px] text-gray-500 mt-0.5">
        <span>{min}</span>
        <span className="text-emerald-400/60">★{ideal}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

function LabeledSlider({
  label, value, onChange, min, max, step, hint,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  hint?: string
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</span>
        <span className="text-[11px] text-white font-mono">{value.toFixed(step < 1 ? 2 : 0)}</span>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min} max={max} step={step}
        className="w-full accent-violet-500 mt-1"
      />
      {hint && <span className="block text-[9.5px] text-gray-500">{hint}</span>}
    </label>
  )
}
