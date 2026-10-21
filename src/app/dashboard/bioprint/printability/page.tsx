"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA — PRÉ-ETAPA · Testes de Imprimibilidade da Biotinta (R12.43)
 *  ───────────────────────────────────────────────────────────────────────
 *  Página DEDICADA, fora do fluxo grande de 5 etapas. Permite que o
 *  usuário teste o hidrogel ANTES de começar uma bioimpressão completa.
 *
 *  Objetivo: validar a biotinta com testes científicos consagrados
 *  (Ouyang 2016 Pf, Therriault 2018, Schwab 2020) gerando STL + G-code
 *  prontos para impressão direta — sem precisar configurar modelo,
 *  biotinta, fatiamento, etc. no fluxo robusto.
 *
 *  8 testes disponíveis:
 *    1. Linha (Line Test)          — calibração diâmetro bico
 *    2. Grade Pf (Ouyang 2016)     — métrica universal Pf=P²/(16A)
 *    3. Ponte de Colapso           — vão máximo sem suporte
 *    4. Estrela de Overhang        — anisotropia 360°
 *    5. Torre de Empilhamento      — altura máxima
 *    6. Escada Z                   — resolução vertical
 *    7. Leque de Ângulos           — overhang crítico
 *    8. Fidelidade da Biotinta     — mesh exato 15.4×15.4×0.8 mm
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import {
  Beaker, FlaskConical, ShieldCheck, Download, Loader2, Info,
  CheckCircle2, ArrowRight, Camera, Microscope, Ruler, BookOpen,
  Sparkles, AlertCircle, ChevronRight, Layers, FileCode2,
  Droplets, Printer,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import {
  generateGeometry, downloadSTL, type GeometryParams, type Triangle,
} from "@/lib/stl/generator"
import {
  BIOMIMETIC_GEOMETRIES, type BiomimeticGeometry,
} from "@/lib/stl/biomimetic-tissues"
import {
  sliceMesh, finalizeMesh, baseParams, singleTool, DEFAULT_TARGET,
  DEFAULT_EXTRUSION_SYRINGE_10ML, defaultLayerHeight,
  type TriMesh, type SliceResult, type InfillPattern,
} from "@/lib/slicer"
import { sendToExecute } from "@/lib/bioprint/execute-handoff"

/** R20: triângulos do gerador de STL → malha do BioSlicer (fatiamento REAL da peça de teste). */
function trianglesToMesh(tris: Triangle[], name: string): TriMesh {
  const v = new Float32Array(tris.length * 9)
  let k = 0
  for (const t of tris) {
    v[k++] = t.v1[0]; v[k++] = t.v1[1]; v[k++] = t.v1[2]
    v[k++] = t.v2[0]; v[k++] = t.v2[1]; v[k++] = t.v2[2]
    v[k++] = t.v3[0]; v[k++] = t.v3[1]; v[k++] = t.v3[2]
  }
  return finalizeMesh(v, tris.length, name)
}


// ─── Parâmetros de fatiamento por teste (R20: BioSlicer fatia o STL REAL) ──
// Antes (quick-gcode) cada teste era aproximado por caixa/disco/grade. Agora a
// malha gerada em "Gerar STL" é a mesma que vai pro fatiador — o que você vê é
// o que imprime. Aqui ficam só altura de camada / paredes / infill sugeridos.
interface QuickMapping {
  defaultLayerHeight_mm: number
  defaultWalls: number
  defaultInfillPattern: InfillPattern
  defaultInfillDensity_pct: number
  note: string  // explicação do que esse teste vai imprimir
}

const TEST_QUICK_MAPPING: Record<string, QuickMapping> = {
  // 1. Linha — 5 filamentos paralelos (STL real fatiado).
  test_line: {
    defaultLayerHeight_mm: 0.25,
    defaultWalls: 1,
    defaultInfillPattern: "rectilinear",
    defaultInfillDensity_pct: 50,
    note: "5 filamentos paralelos de larguras crescentes. Mede CV de largura.",
  },
  // 2. Grade Pf — Ouyang 2016
  test_grid: {
    defaultLayerHeight_mm: 0.2,
    defaultWalls: 1,
    defaultInfillPattern: "rectilinear",
    defaultInfillDensity_pct: 50,
    note: "Grade cruzada para cálculo de Pf = P²/(16·A). Padrão-ouro Ouyang 2016.",
  },
  // 3. Ponte de Colapso — torres+pontes (STL real).
  test_collapse_bridge: {
    defaultLayerHeight_mm: 0.25,
    defaultWalls: 1,
    defaultInfillPattern: "rectilinear",
    defaultInfillDensity_pct: 50,
    note: "Série de torres com vãos crescentes. Mede vão máximo sem colapso.",
  },
  // 4. Torre de Empilhamento — disco fino N camadas
  test_stacking_tower: {
    defaultLayerHeight_mm: 0.2,
    defaultWalls: 2,
    defaultInfillPattern: "concentric",
    defaultInfillDensity_pct: 40,
    note: "Torre cilíndrica. Mede altura máxima do bioink sem deformação.",
  },
  // 5. Escada Z — 5 degraus de altura decrescente (STL real).
  test_z_staircase: {
    defaultLayerHeight_mm: 0.1,
    defaultWalls: 1,
    defaultInfillPattern: "concentric",
    defaultInfillDensity_pct: 50,
    note: "Camada de 0.1 mm para determinar resolução vertical mínima.",
  },
  // 6. Leque de ângulos
  test_angle_fan: {
    defaultLayerHeight_mm: 0.25,
    defaultWalls: 1,
    defaultInfillPattern: "concentric",
    defaultInfillDensity_pct: 30,
    note: "Patch fino. Imprima e meça o ângulo crítico antes do colapso.",
  },
  // 7. Estrela — disco
  test_star: {
    defaultLayerHeight_mm: 0.25,
    defaultWalls: 1,
    defaultInfillPattern: "concentric",
    defaultInfillDensity_pct: 0,
    note: "Estrela com braços em balanço — fatiada a partir do STL real.",
  },
  // 8. Fidelidade — grade densa
  test_fidelity_biotinta: {
    defaultLayerHeight_mm: 0.1,
    defaultWalls: 1,
    defaultInfillPattern: "rectilinear",
    defaultInfillDensity_pct: 60,
    note: "Grade densa 15.4×15.4×0.8 mm. Mede fidelity index F.",
  },
}

// ─── Catálogo de testes (só category=printability_test) ────────────────────
const PRINTABILITY_TESTS: BiomimeticGeometry[] = BIOMIMETIC_GEOMETRIES.filter(
  (g) => g.category === "printability_test"
)

// Ícones por teste (mais bonitos que os emoji originais)
const TEST_ICON_MAP: Record<string, string> = {
  test_line:                "➖",
  test_grid:                "▦",
  test_collapse_bridge:     "🌉",
  test_star:                "✱",
  test_stacking_tower:      "🗼",
  test_z_staircase:         "🪜",
  test_angle_fan:           "📐",
  test_fidelity_biotinta:   "⬡",
}

// Ordem didática (mais simples → mais complexo)
const TEST_ORDER = [
  "test_line",
  "test_grid",
  "test_collapse_bridge",
  "test_stacking_tower",
  "test_z_staircase",
  "test_angle_fan",
  "test_star",
  "test_fidelity_biotinta",
]

const ORDERED_TESTS = TEST_ORDER
  .map((id) => PRINTABILITY_TESTS.find((t) => t.id === id))
  .filter((t): t is BiomimeticGeometry => t !== undefined)

// ─── Dificuldade visual ───────────────────────────────────────────────────
const TEST_DIFFICULTY: Record<string, { label: string; color: string }> = {
  test_line:              { label: "Iniciante",   color: "emerald" },
  test_grid:              { label: "Padrão-ouro", color: "amber"   },
  test_collapse_bridge:   { label: "Intermediário", color: "cyan"  },
  test_stacking_tower:    { label: "Intermediário", color: "cyan"  },
  test_z_staircase:       { label: "Intermediário", color: "cyan"  },
  test_angle_fan:         { label: "Avançado",    color: "violet"  },
  test_star:              { label: "Avançado",    color: "violet"  },
  test_fidelity_biotinta: { label: "Especialista", color: "rose"   },
}

const DIFFICULTY_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-500/15 border-emerald-500/40 text-emerald-200",
  amber:   "bg-amber-500/15 border-amber-500/40 text-amber-200",
  cyan:    "bg-cyan-500/15 border-cyan-500/40 text-cyan-200",
  violet:  "bg-violet-500/15 border-violet-500/40 text-violet-200",
  rose:    "bg-rose-500/15 border-rose-500/40 text-rose-200",
}

export default function PrintabilityTestsPage() {

  // ─── Estado: teste selecionado + params do STL ──
  const [selectedId, setSelectedId] = useState<string>("test_grid") // default: Pf (mais útil)
  const [params, setParams] = useState<GeometryParams>(() => {
    const def = ORDERED_TESTS.find((t) => t.id === "test_grid")
    return { ...(def?.defaultParams || {}) } as GeometryParams
  })

  // ─── Estado: biotinta para gerar G-code ──
  // Valores típicos de GelMA 10% — usuário pode ajustar
  const [bioinkMaterial, setBioinkMaterial] = useState<string>("GelMA 10%")
  const [nozzleDiameterMm, setNozzleDiameterMm] = useState<number>(0.41) // 22G
  const [printSpeedMmS, setPrintSpeedMmS] = useState<number>(8)
  const [pressureKPa, setPressureKPa] = useState<number>(80)
  const [viscosityPaS, setViscosityPaS] = useState<number>(15)

  // ─── Estado: STL geração ──
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [triCount, setTriCount] = useState<number>(0)
  const [cachedTris, setCachedTris] = useState<Triangle[]>([])

  // ─── Estado: G-code geração ──
  const [generatingGcode, setGeneratingGcode] = useState(false)
  const [gcodeResult, setGcodeResult] = useState<SliceResult | null>(null)
  const [gcodeError, setGcodeError] = useState<string | null>(null)

  const selected = useMemo(
    () => ORDERED_TESTS.find((t) => t.id === selectedId),
    [selectedId]
  )

  const handleSelectTest = (id: string) => {
    const t = ORDERED_TESTS.find((x) => x.id === id)
    if (!t) return
    setSelectedId(id)
    setParams({ ...(t.defaultParams || {}) } as GeometryParams)
    setGenerated(false)
    setTriCount(0)
    setCachedTris([])
    setGcodeResult(null)
    setGcodeError(null)
  }

  const handleParamChange = (key: string, val: number) => {
    setParams((prev) => ({ ...prev, [key]: val }))
    setGenerated(false)
    setCachedTris([])
    setGcodeResult(null)
  }

  const handleGenerate = useCallback(() => {
    if (!selected) return
    setGenerating(true)
    setTimeout(() => {
      try {
        const tris = generateGeometry(selected.id, params)
        setCachedTris(tris)
        setTriCount(tris.length)
        setGenerated(true)
      } catch (e) {
        console.error("[BIA printability] erro gerando STL:", e)
      }
      setGenerating(false)
    }, 80)
  }, [selected, params])

  const handleDownloadSTL = () => {
    if (!selected || cachedTris.length === 0) return
    const fname = `BIA_${selected.id}_${Date.now()}.stl`
    downloadSTL(cachedTris, fname, true)
  }

  // ─── Geração de G-code direto — R20: mesma base BioSlicer do /slice ──
  // Fatia o STL REAL do teste (gera se ainda não gerou). Origem = ponto zero
  // (bico), Petri 60 default, 1 cabeçote. Sem cobrança aqui? NÃO: todo G-code
  // gerado cobra 6 créditos (decisão R20) — ver /api/gcode/charge abaixo.
  const [chargeMsg, setChargeMsg] = useState<string | null>(null)
  const [chargeOk, setChargeOk] = useState<boolean>(false)
  const handleGenerateGcode = useCallback(() => {
    if (!selected) return
    const mapping = TEST_QUICK_MAPPING[selected.id]
    if (!mapping) {
      setGcodeError(`Sem parâmetros de fatiamento para ${selected.id}`)
      return
    }

    setGeneratingGcode(true)
    setGcodeError(null)
    setChargeMsg(null)
    setChargeOk(false)

    setTimeout(async () => {
      try {
        const tris = cachedTris.length > 0 ? cachedTris : generateGeometry(selected.id, params)
        if (cachedTris.length === 0) { setCachedTris(tris); setTriCount(tris.length); setGenerated(true) }
        const mesh = trianglesToMesh(tris, `printability_${selected.id}`)

        const P = baseParams(nozzleDiameterMm)
        P.layerHeight_mm = Math.min(mapping.defaultLayerHeight_mm, defaultLayerHeight(nozzleDiameterMm))
        P.firstLayerHeight_mm = Math.round(P.layerHeight_mm * 0.9 * 100) / 100
        P.wallCount = mapping.defaultWalls
        P.infillPattern = mapping.defaultInfillPattern
        P.infillDensity = mapping.defaultInfillDensity_pct
        P.speedPerimeter_mms = printSpeedMmS
        P.speedInfill_mms = printSpeedMmS
        P.speedFirstLayer_mms = Math.max(2, printSpeedMmS * 0.7)
        P.skirtLoops = 0 // R19: 1º cordão nasce no ponto zero

        const X = { ...DEFAULT_EXTRUSION_SYRINGE_10ML, flowMultiplier: 1.0, pressure_kPa: pressureKPa }
        const result = sliceMesh({
          mesh, params: P, extrusion: X,
          profileId: "printability", profileName: `Teste · ${selected.label}`,
          jobName: `printability_${selected.id}`,
          rheology: { viscosity_PaS: viscosityPaS },
          meta: { material: bioinkMaterial, test: selected.id },
          target: DEFAULT_TARGET,
          tools: singleTool(X, bioinkMaterial),
        })
        const fatal = result.warnings.find((w) => w.level === "error")
        if (fatal) throw new Error(fatal.message)
        setGcodeResult(result)

        // Cobrança por G-code gerado (R20) — gate de download / handoff
        try {
          const res = await fetch("/api/gcode/charge", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ summary: {
              jobName: `printability_${selected.id}`, profileId: "printability",
              infill: P.infillPattern, infillDensity: P.infillDensity,
              layerCount: result.stats.layerCount, volume_uL: result.stats.volume_uL,
              time_s: result.stats.estimatedTime_s, target: "petri60", wells: 1, tools: 1,
              geometryId: selected.id, gcodeLines: result.gcode.split("\n").length,
            } }),
          })
          if (res.ok) {
            const j = await res.json()
            setChargeOk(true)
            setChargeMsg(j.charged ? `${j.charged} créditos debitados` : "sem cobrança (admin)")
          } else {
            const j = await res.json().catch(() => ({}))
            setChargeOk(false)
            setChargeMsg(j.error ?? (res.status === 402 ? "Créditos insuficientes" : `Falha na cobrança (${res.status})`))
          }
        } catch {
          setChargeOk(false)
          setChargeMsg("Sem conexão para cobrar o G-code — tente novamente")
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setGcodeError(msg)
        setGcodeResult(null)
      } finally {
        setGeneratingGcode(false)
      }
    }, 40)
  }, [
    selected, params, cachedTris, bioinkMaterial, nozzleDiameterMm,
    viscosityPaS, printSpeedMmS, pressureKPa,
  ])

  const handleDownloadGcode = () => {
    if (!selected || !gcodeResult) return
    if (!chargeOk) { setGcodeError(chargeMsg ?? "G-code não cobrado — gere novamente"); return }
    const blob = new Blob([gcodeResult.gcode], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `BIA_${selected.id}_${Date.now()}.gcode`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── ENVIO direto pro /execute (sem passar pelo /slice ou pelas etapas) ──
  const handleSendToExecute = () => {
    if (!selected || !gcodeResult) return
    if (!chargeOk) { setGcodeError(chargeMsg ?? "G-code não cobrado — gere novamente"); return }
    try {
      sendToExecute({
        gcode: gcodeResult.gcode,
        name: `Teste de imprimibilidade · ${selected.label}`,
        from: "/dashboard/bioprint/printability",
      }) // já navega para /execute
    } catch (e) {
      console.error("[BIA printability] falha enviando pro /execute:", e)
    }
  }

  const difficulty = selected ? TEST_DIFFICULTY[selected.id] : null
  const diffClass = difficulty ? DIFFICULTY_CLASSES[difficulty.color] : ""

  return (
    <div className="bia-printability-page space-y-6 max-w-7xl mx-auto">
      {/* ─── Banner explicativo ─────────────────────────────────────── */}
      <section className="rounded-2xl bg-gradient-to-br from-amber-500/[0.10] via-emerald-500/[0.06] to-cyan-500/[0.08] border border-amber-500/30 p-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-amber-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] uppercase tracking-[0.2em] text-amber-300/90 font-semibold">
                Pré-etapa · R12.43
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 font-semibold uppercase tracking-wider">
                Standalone
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 font-semibold uppercase tracking-wider">
                Sem 5 etapas
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-bold text-white mb-1.5">
              Testes de imprimibilidade da biotinta
            </h1>
            <p className="text-xs text-gray-300 leading-relaxed">
              <strong className="text-amber-200">Comece por aqui antes de bioimprimir um constructo.</strong> 8 testes
              científicos validados (Ouyang 2016, Therriault 2018, Schwab 2020) para qualificar o seu hidrogel:
              calibrar diâmetro real do bico, medir o índice <em>Pf</em>, encontrar o vão máximo sem colapso,
              determinar o ângulo crítico de overhang. Cada teste vem com{" "}
              <strong className="text-emerald-200">protocolo de análise</strong> (fotos, ImageJ, paquímetro).
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
              <span className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-200">
                🧪 Sem precisar configurar modelo / biotinta / slicer
              </span>
              <span className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
                📥 STL pronto em 1 clique
              </span>
              <span className="px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-200">
                ⚡ G-code pela base BioSlicer (6 créditos)
              </span>
              <span className="px-2 py-1 rounded bg-violet-500/10 border border-violet-500/30 text-violet-200">
                🔬 Protocolo de análise junto
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Recomendação de fluxo ──────────────────────────────────── */}
      <section className="rounded-2xl bg-violet-500/[0.06] border border-violet-500/25 p-4">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-violet-300 shrink-0 mt-0.5" />
          <div className="flex-1 text-[11.5px] text-gray-300 leading-relaxed">
            <strong className="text-violet-200">Fluxo recomendado:</strong>
            {" "}
            <span className="inline-flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-[10px] font-mono">1</span>
              Teste de Linha
            </span>
            {" → "}
            <span className="inline-flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[10px] font-mono">2</span>
              Grade Pf
            </span>
            {" → "}
            <span className="inline-flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 text-[10px] font-mono">3</span>
              Torre + Escada Z
            </span>
            {" → "}
            <span className="inline-flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-violet-500/15 border border-violet-500/30 text-violet-200 text-[10px] font-mono">4</span>
              Ponte / Leque / Estrela
            </span>
            {" → "}
            <span className="inline-flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-200 text-[10px] font-mono">5</span>
              Fidelidade
            </span>
            . Aprovou? Vá para o <Link href="/dashboard/bioprint" className="text-violet-300 hover:text-violet-200 underline">processo completo de bioimpressão</Link>.
          </div>
        </div>
      </section>

      {/* ─── Grid principal ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
        {/* ── Coluna A: lista de testes ────────────────────────────── */}
        <aside className="space-y-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-semibold px-1 mb-2 flex items-center gap-1.5">
            <FlaskConical className="w-3 h-3" />
            Escolha o teste ({ORDERED_TESTS.length})
          </div>
          {ORDERED_TESTS.map((test, idx) => {
            const isActive = test.id === selectedId
            const d = TEST_DIFFICULTY[test.id]
            const dCls = DIFFICULTY_CLASSES[d?.color || "cyan"]
            return (
              <button
                key={test.id}
                onClick={() => handleSelectTest(test.id)}
                className={cn(
                  "w-full text-left rounded-xl p-3 border transition-all",
                  isActive
                    ? "bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30"
                    : "bg-white/[0.02] border-white/10 hover:bg-white/[0.04] hover:border-white/20"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div className="text-2xl shrink-0 leading-none mt-0.5">
                    {TEST_ICON_MAP[test.id] || "🧪"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className="text-[9.5px] text-gray-500 font-mono">
                        #{idx + 1}
                      </span>
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wider",
                        dCls
                      )}>
                        {d?.label}
                      </span>
                    </div>
                    <div className={cn(
                      "text-xs font-semibold leading-tight",
                      isActive ? "text-amber-100" : "text-white"
                    )}>
                      {test.label}
                    </div>
                    <div className="text-[10.5px] text-gray-400 mt-1 leading-snug line-clamp-2">
                      {test.description}
                    </div>
                  </div>
                  {isActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-1" />
                  )}
                </div>
              </button>
            )
          })}
        </aside>

        {/* ── Coluna B: painel do teste selecionado ────────────────── */}
        <main className="space-y-4 min-w-0">
          {!selected && (
            <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-8 text-center">
              <p className="text-sm text-gray-400">Selecione um teste à esquerda.</p>
            </div>
          )}

          {selected && (
            <>
              {/* Header do teste */}
              <section className="rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 p-5">
                <div className="flex items-start gap-4 mb-3">
                  <div className="text-5xl leading-none shrink-0">
                    {TEST_ICON_MAP[selected.id] || "🧪"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {difficulty && (
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider",
                          diffClass
                        )}>
                          {difficulty.label}
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300">
                        {selected.tissue}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        Custo: {selected.creditCost} créditos
                      </span>
                    </div>
                    <h2 className="text-base md:text-lg font-bold text-white">
                      {selected.label}
                    </h2>
                    <p className="text-[12px] text-gray-300 mt-1.5 leading-relaxed">
                      {selected.description}
                    </p>
                  </div>
                </div>

                {/* Aplicação */}
                <div className="mt-3 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20">
                  <div className="text-[10px] uppercase tracking-wider text-emerald-300/90 font-semibold mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    Para que serve
                  </div>
                  <p className="text-[11.5px] text-gray-200 leading-relaxed">
                    {selected.application}
                  </p>
                </div>
              </section>

              {/* Parâmetros (se houver) */}
              {Object.keys(selected.paramLabels || {}).length > 0 && (
                <section className="rounded-2xl bg-white/[0.02] border border-white/10 p-5">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-semibold mb-3 flex items-center gap-1.5">
                    <Layers className="w-3 h-3" />
                    Parâmetros
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(selected.paramLabels).map(([key, label]) => {
                      const currentVal = Number(
                        (params as Record<string, unknown>)[key] ?? 0
                      )
                      return (
                        <label key={key} className="block">
                          <div className="text-[10.5px] text-gray-400 mb-1">
                            {label}
                          </div>
                          <input
                            type="number"
                            value={currentVal}
                            onChange={(e) => handleParamChange(key, Number(e.target.value))}
                            step="0.5"
                            min="0"
                            className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 focus:border-amber-500/50 focus:bg-white/[0.06] text-white text-sm outline-none transition-colors"
                          />
                        </label>
                      )
                    })}
                  </div>
                </section>
              )}

              {Object.keys(selected.paramLabels || {}).length === 0 && (
                <section className="rounded-2xl bg-rose-500/[0.05] border border-rose-500/20 p-3 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                  <p className="text-[11px] text-rose-100/90">
                    <strong>Dimensões travadas</strong> — este teste usa mesh exato (sem ajustes) para garantir comparabilidade entre laboratórios.
                  </p>
                </section>
              )}

              {/* ═══ ETAPA 1 · Visualizar e baixar STL (opcional) ═══ */}
              <section className="rounded-2xl bg-white/[0.02] border border-white/10 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[11px] text-amber-200 font-bold">
                    1
                  </div>
                  <div className="text-[12px] uppercase tracking-[0.15em] text-amber-300 font-semibold">
                    Visualizar / Baixar STL (opcional)
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2",
                    generating
                      ? "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
                      : "bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-100"
                  )}
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gerando STL…
                    </>
                  ) : (
                    <>
                      <Beaker className="w-4 h-4" />
                      {generated ? "Gerar STL novamente" : "Gerar STL do teste"}
                    </>
                  )}
                </button>

                {generated && (
                  <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/30 p-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    <div className="flex-1 text-[11px] text-emerald-100">
                      <strong>STL pronto.</strong> {triCount.toLocaleString("pt-BR")} triângulos.
                    </div>
                    <button
                      onClick={handleDownloadSTL}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/15 hover:bg-white/[0.10] text-white text-[10.5px] font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <Download className="w-3 h-3" />
                      Baixar .stl
                    </button>
                  </div>
                )}
              </section>

              {/* ═══ ETAPA 2 · Biotinta ═══ */}
              <section className="rounded-2xl bg-white/[0.02] border border-white/10 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-[11px] text-cyan-200 font-bold">
                    2
                  </div>
                  <div className="text-[12px] uppercase tracking-[0.15em] text-cyan-300 font-semibold flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5" />
                    Parâmetros da biotinta (testando)
                  </div>
                </div>
                <p className="text-[10.5px] text-gray-400 leading-snug">
                  Os mesmos parâmetros que você normalmente configura na biotinta —
                  só que aqui são <strong className="text-cyan-200">apenas para o teste</strong>,
                  sem precisar salvar nada no fluxo grande.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <div className="text-[10.5px] text-gray-400 mb-1">Material (livre)</div>
                    <input
                      type="text"
                      value={bioinkMaterial}
                      onChange={(e) => setBioinkMaterial(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 focus:border-cyan-500/50 focus:bg-white/[0.06] text-white text-sm outline-none transition-colors"
                    />
                  </label>
                  <label className="block">
                    <div className="text-[10.5px] text-gray-400 mb-1">Bico Ø (mm)</div>
                    <input
                      type="number" step="0.01" min="0.1" max="2"
                      value={nozzleDiameterMm}
                      onChange={(e) => setNozzleDiameterMm(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 focus:border-cyan-500/50 focus:bg-white/[0.06] text-white text-sm outline-none transition-colors"
                    />
                  </label>
                  <label className="block">
                    <div className="text-[10.5px] text-gray-400 mb-1">Velocidade (mm/s)</div>
                    <input
                      type="number" step="0.5" min="1" max="100"
                      value={printSpeedMmS}
                      onChange={(e) => setPrintSpeedMmS(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 focus:border-cyan-500/50 focus:bg-white/[0.06] text-white text-sm outline-none transition-colors"
                    />
                  </label>
                  <label className="block">
                    <div className="text-[10.5px] text-gray-400 mb-1">Pressão (kPa)</div>
                    <input
                      type="number" step="5" min="10" max="600"
                      value={pressureKPa}
                      onChange={(e) => setPressureKPa(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 focus:border-cyan-500/50 focus:bg-white/[0.06] text-white text-sm outline-none transition-colors"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <div className="text-[10.5px] text-gray-400 mb-1">Viscosidade (Pa·s)</div>
                    <input
                      type="number" step="0.5" min="0.1" max="500"
                      value={viscosityPaS}
                      onChange={(e) => setViscosityPaS(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 focus:border-cyan-500/50 focus:bg-white/[0.06] text-white text-sm outline-none transition-colors"
                    />
                  </label>
                </div>
              </section>

              {/* ═══ ETAPA 3 · Gerar G-code direto ═══ */}
              <section className="rounded-2xl bg-violet-500/[0.05] border border-violet-500/25 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-[11px] text-violet-200 font-bold">
                    3
                  </div>
                  <div className="text-[12px] uppercase tracking-[0.15em] text-violet-300 font-semibold flex items-center gap-1.5">
                    <FileCode2 className="w-3.5 h-3.5" />
                    Gerar G-code do teste
                  </div>
                </div>
                <p className="text-[10.5px] text-gray-400 leading-snug">
                  Fatiamento <strong className="text-violet-200">direto</strong> do STL do teste pela mesma base
                  BioSlicer da Etapa 3 — origem no bico (ponto zero), Petri 60, 1 cabeçote. Cobra 6 créditos por G-code.
                  {TEST_QUICK_MAPPING[selectedId]?.note && (
                    <span className="block mt-1 text-violet-200/80 italic">
                      ℹ️ {TEST_QUICK_MAPPING[selectedId].note}
                    </span>
                  )}
                </p>

                <button
                  onClick={handleGenerateGcode}
                  disabled={generatingGcode}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2",
                    generatingGcode
                      ? "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
                      : "bg-violet-500/20 border border-violet-500/50 hover:bg-violet-500/30 text-violet-100"
                  )}
                >
                  {generatingGcode ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gerando G-code…
                    </>
                  ) : (
                    <>
                      <FileCode2 className="w-4 h-4" />
                      {gcodeResult ? "Gerar G-code novamente" : "Gerar G-code do teste"}
                    </>
                  )}
                </button>

                {gcodeError && (
                  <div className="rounded-xl bg-rose-500/[0.08] border border-rose-500/30 p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                    <div className="flex-1 text-[11px] text-rose-100">
                      <strong>Erro ao gerar G-code:</strong> {gcodeError}
                    </div>
                  </div>
                )}

                {gcodeResult && (
                  <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/30 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                      <div className="flex-1 text-[11px] text-emerald-100">
                        <strong>G-code pronto (BioSlicer).</strong> {gcodeResult.stats.layerCount} camadas ·{" "}
                        {gcodeResult.stats.extrudeLength_mm.toFixed(0)} mm de cordão ·{" "}
                        {gcodeResult.stats.volume_uL.toFixed(1)} µL ·{" "}
                        ~{(gcodeResult.stats.estimatedTime_s / 60).toFixed(1)} min
                        {chargeMsg && (
                          <span className={cn("ml-2 px-1.5 py-0.5 rounded border text-[10px]", chargeOk ? "border-emerald-400/30 text-emerald-200" : "border-rose-400/30 text-rose-200 bg-rose-500/10")}>
                            {chargeMsg}
                          </span>
                        )}
                      </div>
                    </div>
                    {gcodeResult.warnings.length > 0 && (
                      <div className="text-[10px] text-amber-200/90 leading-snug pl-6 border-l border-amber-500/30 ml-2">
                        {gcodeResult.warnings.slice(0, 2).map((w, i) => (
                          <div key={i}>⚠️ {w.message}</div>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={handleDownloadGcode}
                        className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Baixar .gcode
                      </button>
                      <button
                        onClick={handleSendToExecute}
                        className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/50 hover:bg-emerald-500/30 text-emerald-100 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Imprimir agora
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* ═══ ETAPA 4 · Imprimir (atalho independente) ═══ */}
              {gcodeResult && (
                <section className="rounded-2xl bg-gradient-to-br from-emerald-500/[0.10] to-cyan-500/[0.06] border border-emerald-500/40 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/25 border border-emerald-500/50 flex items-center justify-center shrink-0">
                      <Printer className="w-5 h-5 text-emerald-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-emerald-300/90 font-semibold">
                        Pronto para imprimir
                      </div>
                      <div className="text-xs text-white font-semibold">
                        Conecte a bioimpressora via USB / Web Serial e execute o teste.
                      </div>
                    </div>
                    <button
                      onClick={handleSendToExecute}
                      className="px-4 py-2 rounded-xl bg-emerald-500/25 border border-emerald-400 hover:bg-emerald-500/35 text-emerald-50 text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      Abrir Executar
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </section>
              )}

              {/* Racional científico */}
              {selected.rationale && (
                <section className="rounded-2xl bg-cyan-500/[0.04] border border-cyan-500/20 p-5">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/90 font-semibold mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3" />
                    Racional científico
                  </div>
                  <p className="text-[11.5px] text-gray-200 leading-relaxed">
                    {selected.rationale}
                  </p>
                </section>
              )}

              {/* Protocolo de análise */}
              {selected.analysisProtocol && (
                <section className="rounded-2xl bg-violet-500/[0.05] border border-violet-500/25 p-5">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-violet-300/90 font-semibold mb-2 flex items-center gap-1.5">
                    <Microscope className="w-3 h-3" />
                    Como analisar o resultado
                  </div>
                  <p className="text-[11.5px] text-gray-200 leading-relaxed">
                    {selected.analysisProtocol}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-300 inline-flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      Foto top-down/lateral
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-300 inline-flex items-center gap-1">
                      <Ruler className="w-3 h-3" />
                      Régua/paquímetro
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-300 inline-flex items-center gap-1">
                      <Microscope className="w-3 h-3" />
                      ImageJ (free)
                    </span>
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>

      {/* ─── Rodapé com link para fluxo grande ──────────────────────── */}
      <section className="rounded-2xl bg-gradient-to-br from-emerald-500/[0.06] via-cyan-500/[0.04] to-violet-500/[0.06] border border-emerald-500/25 p-5">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white mb-1">
              Biotinta aprovada nos testes? Próximo passo:
            </h3>
            <p className="text-[11.5px] text-gray-300 leading-relaxed">
              Vá para o <strong className="text-emerald-200">processo completo de bioimpressão</strong> em 5 etapas: modelo 3D do tecido → biotinta otimizada → fatiamento G-code → execução → pós-bioimpressão.
            </p>
          </div>
          <Link
            href="/dashboard/bioprint"
            className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400 hover:bg-emerald-500/30 text-emerald-100 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            Ir para bioimpressão completa
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>
    </div>
  )
}
