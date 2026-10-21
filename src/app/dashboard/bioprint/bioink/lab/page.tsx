"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R16 · Laboratório de Biotintas (guiado)
 *  ─────────────────────────────────────────────────────────────────────
 *  3 passos, zero parâmetros soltos:
 *   1. Decisões — objetivo, células, equipamento, experiência
 *   2. Receita — recomendação + janela de biofabricação + alternativas
 *   3. Bancada — quantidades calculadas, preparo, reticulação, se der errado
 *  Modo Básico (padrão) esconde reologia/explicações; Avançado mostra tudo.
 *  Rota: /dashboard/bioprint/bioink/lab (avançado). Etapa 2 simples: /dashboard/bioprint/bioink
 * ═══════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  FlaskConical, ArrowRight, ArrowLeft, Check, Sparkles, Lightbulb, Thermometer, Syringe,
  AlertTriangle, Info, BookOpen, Download, Copy, Wrench, Layers, Target, Beaker, SlidersHorizontal,
  Sun, Snowflake, CircleDot, Microscope, ExternalLink, RotateCcw,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { useBioprintProcess } from "@/lib/bioprint/process-context"
import {
  RECIPES, GOAL_LABELS, CELL_LABELS, ZONE_LABELS, DEFAULT_EQUIPMENT,
  recommend, pickAlternatives, evaluateRecipeWindow, planBench, relevantTroubles,
  protocolMarkdown, toBioinkPatch, slicerHint, getRecipe,
  type Goal, type CellTypeId, type Equipment, type Experience, type Recipe, type Recommendation,
} from "@/lib/bioink-lab"

type Step = 1 | 2 | 3
const LAB_KEY = "bia:bioink-lab"
const SLICER_HINT_KEY = "bia:slicer-hint"
const NOZZLES = [0.2, 0.26, 0.33, 0.41, 0.51, 0.6, 0.84]
const GOAL_ORDER: Goal[] = ["learn", "skin", "cartilage", "bone", "vascular", "liver", "cardiac", "neural", "organoid", "generic_cells"]
const CELL_ORDER: CellTypeId[] = ["none", "fibroblast", "keratinocyte", "chondrocyte", "osteoblast", "msc", "huvec", "hepatocyte", "cardiomyocyte", "neuron", "ipsc", "tumor"]

interface LabState {
  goal: Goal
  cell: CellTypeId
  equipment: Equipment
  experience: Experience
  recipeId: string | null
  cellDensity: number
  printVolume_mL: number
  advanced: boolean
}

const DEFAULT_LAB: LabState = {
  goal: "learn", cell: "none", equipment: DEFAULT_EQUIPMENT, experience: "first",
  recipeId: null, cellDensity: 2, printVolume_mL: 1, advanced: false,
}

export default function BioinkLabPage() {
  const router = useRouter()
  const { state, updateBioink } = useBioprintProcess()
  const [lab, setLab] = useState<LabState>(DEFAULT_LAB)
  const [step, setStep] = useState<Step>(1)
  const [hydrated, setHydrated] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // ── persistência leve ────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(LAB_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<LabState & { step: Step }>
        setLab((p) => ({ ...p, ...parsed, equipment: { ...p.equipment, ...(parsed.equipment ?? {}) } }))
        if (parsed.step) setStep(parsed.step)
      }
    } catch { /* noop */ }
    setHydrated(true)
  }, [])
  useEffect(() => {
    if (!hydrated) return
    try { sessionStorage.setItem(LAB_KEY, JSON.stringify({ ...lab, step })) } catch { /* noop */ }
  }, [lab, step, hydrated])

  const set = useCallback(<K extends keyof LabState>(k: K, v: LabState[K]) => setLab((p) => ({ ...p, [k]: v })), [])
  const setEq = useCallback(<K extends keyof Equipment>(k: K, v: Equipment[K]) => setLab((p) => ({ ...p, equipment: { ...p.equipment, [k]: v } })), [])

  // volume vem do modelo (Etapa 1) se já houver STL/geometria com stats
  const modelVolumeMm3 = state.model.stats?.volumeMm3 ?? null
  useEffect(() => {
    if (!hydrated || !modelVolumeMm3 || modelVolumeMm3 <= 0) return
    const ml = modelVolumeMm3 / 1000
    setLab((p) => (p.recipeId ? p : { ...p, printVolume_mL: Math.max(0.2, Math.round(ml * 10) / 10) }))
  }, [modelVolumeMm3, hydrated])

  // ── recomendação ─────────────────────────────────────────────────────
  const recs = useMemo(() => recommend({ goal: lab.goal, cell: lab.cell, equipment: lab.equipment, experience: lab.experience }), [lab.goal, lab.cell, lab.equipment, lab.experience])
  const top = recs[0]
  const alternatives = useMemo(() => pickAlternatives(recs, 3), [recs])
  const chosen: Recipe | null = useMemo(() => (lab.recipeId ? getRecipe(lab.recipeId) ?? null : null), [lab.recipeId])
  const chosenRec: Recommendation | null = useMemo(() => recs.find((r) => r.recipe.id === lab.recipeId) ?? null, [recs, lab.recipeId])

  const hasCells = lab.cell !== "none" && chosen ? chosen.cellDensity_Mml[1] > 0 : false
  const cellDensityClamped = useMemo(() => {
    if (!chosen || !hasCells) return 0
    const [lo, hi] = chosen.cellDensity_Mml
    return Math.min(hi, Math.max(lo, lab.cellDensity))
  }, [chosen, hasCells, lab.cellDensity])

  const win = useMemo(() => (chosen ? evaluateRecipeWindow(chosen, lab.cell, { nozzle_mm: lab.equipment.nozzle_mm }) : null), [chosen, lab.cell, lab.equipment.nozzle_mm])
  const bench = useMemo(() => (chosen ? planBench({ recipe: chosen, printVolume_mL: lab.printVolume_mL, cellDensity_Mml: hasCells ? cellDensityClamped : null }) : null), [chosen, lab.printVolume_mL, hasCells, cellDensityClamped])
  const troubles = useMemo(() => (chosen ? relevantTroubles(chosen.crosslink, hasCells, chosen.components.some((c) => c.role === "bioactive")) : []), [chosen, hasCells])

  const goStep2 = () => { setStep(2); if (!lab.recipeId || !recs.some((r) => r.recipe.id === lab.recipeId)) set("recipeId", top.recipe.id); window.scrollTo({ top: 0, behavior: "smooth" }) }
  const pickRecipe = (id: string) => { set("recipeId", id); const r = getRecipe(id); if (r) set("cellDensity", Math.round((r.cellDensity_Mml[0] + r.cellDensity_Mml[1]) / 2 * 10) / 10) }
  const goStep3 = () => { setStep(3); window.scrollTo({ top: 0, behavior: "smooth" }) }

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2600) }

  // ── ações finais ─────────────────────────────────────────────────────
  const markdown = useMemo(() => (chosen && bench && win ? protocolMarkdown({ recipe: chosen, cell: lab.cell, cellDensity_Mml: hasCells ? cellDensityClamped : null, bench, window: win }) : ""), [chosen, bench, win, lab.cell, hasCells, cellDensityClamped])

  const downloadMd = () => {
    if (!chosen) return
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `protocolo-${chosen.id}.md`; a.click(); URL.revokeObjectURL(a.href)
    flash("Protocolo baixado (.md)")
  }
  const copyMd = async () => { try { await navigator.clipboard.writeText(markdown); flash("Protocolo copiado") } catch { flash("Não foi possível copiar") } }

  const sendToPipeline = (dest: "slice" | "slicer") => {
    if (!chosen) return
    const patch = toBioinkPatch(chosen, lab.cell, hasCells ? cellDensityClamped : null)
    const { labRecipeId, labPrintTemp_C, labStartParams, ...ctxPatch } = patch
    updateBioink(ctxPatch)
    try {
      sessionStorage.setItem(SLICER_HINT_KEY, JSON.stringify({
        text: slicerHint(chosen, lab.cell, GOAL_LABELS[lab.goal].label),
        recipeId: labRecipeId, printTemp_C: labPrintTemp_C, startParams: labStartParams, materialId: chosen.pipelineMaterialId, from: "bioink-lab",
      }))
    } catch { /* noop */ }
    router.push(dest === "slicer" ? "/dashboard/bioprint/slicer" : "/dashboard/bioprint/slice")
  }

  return (
    <div className="bia-bioink-lab flex flex-col min-h-full bg-[#0a0a0f] text-gray-200">
      {/* Cabeçalho */}
      <header className="px-4 sm:px-6 py-5 border-b border-white/5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-300/80 font-semibold mb-1">Etapa 2 · Biotinta · Avançado</div>
            <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-emerald-400" /> Laboratório de Biotintas
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl">
              Você escolhe <b className="text-gray-200">o que quer imprimir</b>; a BIA devolve uma receita validada, a posição na janela de biofabricação e o protocolo de bancada com quantidades.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => set("advanced", !lab.advanced)} className={cn("inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors", lab.advanced ? "bg-violet-500/15 border-violet-400/40 text-violet-200" : "bg-white/5 border-white/10 text-gray-300 hover:border-white/20")} title="Mostrar reologia, explicações e parâmetros">
              <SlidersHorizontal className="w-3.5 h-3.5" /> {lab.advanced ? "Avançado" : "Básico"}
            </button>
            <Link href="/dashboard/bioprint/bioink" className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20">← Etapa 2 simples</Link>
          </div>
        </div>

        {/* Stepper */}
        <nav className="mt-5 grid grid-cols-3 gap-2 max-w-2xl" aria-label="Passos">
          {([1, 2, 3] as Step[]).map((s) => {
            const labels = { 1: ["Decisões", Target], 2: ["Receita", Beaker], 3: ["Bancada", Syringe] } as const
            const [label, Icon] = labels[s]
            const done = s < step
            const active = s === step
            return (
              <button key={s} onClick={() => { if (s < step || (s === 2) || (s === 3 && lab.recipeId)) setStep(s) }} className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-xs transition-colors", active ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-100" : done ? "bg-white/5 border-white/10 text-gray-300 hover:border-white/20" : "bg-white/3 border-white/5 text-gray-500")}>
                <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0", active ? "bg-emerald-400 text-black" : done ? "bg-white/15 text-white" : "bg-white/5")}>{done ? <Check className="w-3.5 h-3.5" /> : s}</span>
                <span className="flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" /> {label}</span>
              </button>
            )
          })}
        </nav>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-6 max-w-6xl w-full mx-auto">
        {step === 1 && <StepDecisions lab={lab} set={set} setEq={setEq} top={top} onNext={goStep2} />}
        {step === 2 && chosen && chosenRec && win && (
          <StepRecipe lab={lab} chosen={chosen} chosenRec={chosenRec} recs={recs} alternatives={alternatives} win={win} onPick={pickRecipe} onBack={() => setStep(1)} onNext={goStep3} />
        )}
        {step === 3 && chosen && bench && win && (
          <StepBench lab={lab} set={set} chosen={chosen} bench={bench} win={win} hasCells={hasCells} cellDensity={cellDensityClamped} troubles={troubles} onBack={() => setStep(2)} onDownload={downloadMd} onCopy={copyMd} onSend={sendToPipeline} />
        )}
      </main>

      {toast && <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-emerald-500/90 text-black text-sm font-medium px-4 py-2 rounded-xl shadow-lg z-50">{toast}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
//  PASSO 1 · Decisões
// ─────────────────────────────────────────────────────────────────────────
function StepDecisions({ lab, set, setEq, top, onNext }: {
  lab: LabState
  set: <K extends keyof LabState>(k: K, v: LabState[K]) => void
  setEq: <K extends keyof Equipment>(k: K, v: Equipment[K]) => void
  top: Recommendation
  onNext: () => void
}) {
  const cellsForGoal = useMemo(() => {
    const ok = new Set<CellTypeId>()
    RECIPES.filter((r) => r.goals.includes(lab.goal)).forEach((r) => r.cellsOk.forEach((c) => ok.add(c)))
    return ok
  }, [lab.goal])

  return (
    <div className="space-y-8">
      {/* Objetivo */}
      <section id="lab-goal">
        <SectionTitle n={1} title="O que você quer imprimir?" hint="Escolha o objetivo biológico — isso define a família de materiais." />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-3">
          {GOAL_ORDER.map((g) => {
            const L = GOAL_LABELS[g]
            const active = lab.goal === g
            return (
              <button key={g} onClick={() => { set("goal", g); if (!cellsForGoal.has(lab.cell)) set("cell", "none") }} className={cn("text-left p-3 rounded-xl border transition-all", active ? "bg-emerald-500/15 border-emerald-400/50 ring-1 ring-emerald-400/30" : "bg-white/3 border-white/8 hover:border-white/20")}>
                <div className="text-xl leading-none mb-1.5">{L.emoji}</div>
                <div className={cn("text-sm font-semibold", active ? "text-emerald-100" : "text-gray-200")}>{L.label}</div>
                <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">{L.hint}</div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Células */}
      <section id="lab-cells">
        <SectionTitle n={2} title="Com quais células?" hint="Sem células é o melhor começo: valide forma e parâmetros antes de gastar células." />
        <div className="flex flex-wrap gap-2 mt-3">
          {CELL_ORDER.map((c) => {
            const L = CELL_LABELS[c]
            const active = lab.cell === c
            const fits = cellsForGoal.has(c)
            return (
              <button key={c} onClick={() => set("cell", c)} title={L.note} className={cn("px-3 py-1.5 rounded-full border text-xs transition-colors flex items-center gap-1.5", active ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-100" : fits ? "bg-white/3 border-white/10 text-gray-300 hover:border-white/25" : "bg-white/2 border-white/5 text-gray-600 hover:text-gray-400")}>
                {L.label}
                {c !== "none" && <span className={cn("w-1.5 h-1.5 rounded-full", L.sensitivity === "high" ? "bg-rose-400" : L.sensitivity === "mid" ? "bg-amber-400" : "bg-emerald-400")} title={`sensibilidade ao shear: ${L.sensitivity}`} />}
              </button>
            )
          })}
        </div>
        {lab.cell !== "none" && (
          <p className="text-[11px] text-gray-500 mt-2 flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> {CELL_LABELS[lab.cell].note}. {!cellsForGoal.has(lab.cell) && <span className="text-amber-300">Pouco usual para este objetivo — a BIA vai avisar.</span>}</p>
        )}
      </section>

      {/* Equipamento */}
      <section id="lab-equipment">
        <SectionTitle n={3} title="O que você tem na bancada?" hint="Só o que muda a receita. Nada de pressão, fluxo ou reologia aqui." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
          <Toggle icon={Sun} label="Luz 365/405 nm" desc="Lanterna UV, módulo da impressora ou caixa de cura" on={lab.equipment.hasLight} onChange={(v) => setEq("hasLight", v)} />
          <Toggle icon={Thermometer} label="Cabeçote com temperatura" desc="Seringa aquecida ou refrigerada" on={lab.equipment.hasTempHead} onChange={(v) => setEq("hasTempHead", v)} />
          <Toggle icon={Snowflake} label="Mesa com temperatura" desc="Mesa fria/quente ou placa Peltier" on={lab.equipment.hasTempBed} onChange={(v) => setEq("hasTempBed", v)} />
          <div className="p-3 rounded-xl border border-white/8 bg-white/3">
            <div className="text-xs font-semibold text-gray-200 flex items-center gap-1.5 mb-2"><CircleDot className="w-3.5 h-3.5 text-cyan-300" /> Agulha disponível</div>
            <div className="flex flex-wrap gap-1">
              {NOZZLES.map((n) => (
                <button key={n} onClick={() => setEq("nozzle_mm", n)} className={cn("text-[11px] px-2 py-1 rounded-md border", lab.equipment.nozzle_mm === n ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-100" : "border-white/10 text-gray-400 hover:border-white/25")}>{n} mm</button>
              ))}
            </div>
            <div className="text-[10px] text-gray-500 mt-1.5">{gaugeLabel(lab.equipment.nozzle_mm)}</div>
          </div>
        </div>
      </section>

      {/* Experiência */}
      <section id="lab-experience">
        <SectionTitle n={4} title="Sua experiência com biotintas" hint="Ajusta o quanto a BIA prioriza receitas tolerantes a erro." />
        <div className="flex flex-wrap gap-2 mt-3">
          {([["first", "Primeira vez", "Quero algo que dá certo"], ["some", "Já imprimi algumas", "Posso seguir protocolos de 1 h"], ["expert", "Rotina no lab", "Mostre o estado da arte"]] as const).map(([k, l, d]) => (
            <button key={k} onClick={() => set("experience", k)} className={cn("text-left px-4 py-2.5 rounded-xl border transition-colors min-w-[180px]", lab.experience === k ? "bg-emerald-500/15 border-emerald-400/50" : "bg-white/3 border-white/8 hover:border-white/20")}>
              <div className={cn("text-sm font-semibold", lab.experience === k ? "text-emerald-100" : "text-gray-200")}>{l}</div>
              <div className="text-[11px] text-gray-500">{d}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Prévia + avançar */}
      <div className="sticky bottom-3 z-10">
        <div className="rounded-2xl border border-emerald-400/30 bg-[#0d1512]/95 backdrop-blur p-4 flex items-center justify-between gap-3 flex-wrap shadow-xl">
          <div className="flex items-center gap-3 min-w-0">
            <Sparkles className="w-5 h-5 text-emerald-300 shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] text-emerald-300/80 uppercase tracking-wider">Recomendação da BIA</div>
              <div className="text-sm font-semibold text-white truncate">{top.recipe.name}</div>
              <div className="text-[11px] text-gray-400 truncate">{top.blockers.length ? <span className="text-amber-300">{top.blockers[0]}</span> : top.reasons[0]}</div>
            </div>
          </div>
          <button onClick={onNext} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-400 text-black font-semibold text-sm hover:bg-emerald-300 transition-colors">
            Ver receita <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function gaugeLabel(mm: number): string {
  const map: Record<string, string> = { "0.2": "27G — muito fina, só géis fluidos", "0.26": "25G — alta resolução, shear alto", "0.33": "23G — resolução/viabilidade equilibradas", "0.41": "22G — padrão da bioimpressão", "0.51": "21G — células sensíveis", "0.6": "20G — partículas (HAp), alta viabilidade", "0.84": "18G — treino e pastas" }
  return map[String(mm)] ?? ""
}

// ─────────────────────────────────────────────────────────────────────────
//  PASSO 2 · Receita
// ─────────────────────────────────────────────────────────────────────────
function StepRecipe({ lab, chosen, chosenRec, recs, alternatives, win, onPick, onBack, onNext }: {
  lab: LabState; chosen: Recipe; chosenRec: Recommendation; recs: Recommendation[]; alternatives: Recommendation[]
  win: ReturnType<typeof evaluateRecipeWindow>
  onPick: (id: string) => void; onBack: () => void; onNext: () => void
}) {
  const isTop = recs[0]?.recipe.id === chosen.id
  const zone = ZONE_LABELS[win.zone]
  const [showAll, setShowAll] = useState(false)
  const list = showAll ? recs.filter((r) => r.recipe.id !== chosen.id) : alternatives.filter((r) => r.recipe.id !== chosen.id)

  return (
    <div className="space-y-6">
      {/* Cartão principal */}
      <section className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/5 p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-emerald-300/80 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> {isTop ? "Melhor receita para você" : "Receita escolhida"} · nível {levelLabel(chosen.level)}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">{chosen.name}</h2>
            <p className="text-sm text-gray-300 mt-1 max-w-2xl">{chosen.short}</p>
          </div>
          <div className="flex gap-2 text-[11px]">
            <Pill icon={Thermometer} label={`${chosen.printTemp_C} °C${chosen.bedTemp_C != null ? ` · mesa ${chosen.bedTemp_C} °C` : ""}`} />
            <Pill icon={CircleDot} label={`agulha ${chosen.startParams.nozzle_mm} mm`} />
            <Pill icon={Layers} label={crosslinkLabel(chosen.crosslink)} />
          </div>
        </div>

        {/* bloqueios / avisos */}
        {(chosenRec.blockers.length > 0 || chosenRec.warnings.length > 0) && (
          <div className="mt-4 space-y-1.5">
            {chosenRec.blockers.map((b, i) => <div key={`b${i}`} className="flex gap-2 text-xs text-rose-200 bg-rose-500/10 border border-rose-400/30 rounded-lg px-3 py-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {b}</div>)}
            {chosenRec.warnings.map((w, i) => <div key={`w${i}`} className="flex gap-2 text-xs text-amber-200 bg-amber-500/10 border border-amber-400/30 rounded-lg px-3 py-2"><Info className="w-4 h-4 shrink-0" /> {w}</div>)}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_320px] gap-5 mt-5">
          {/* Por quê + componentes */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-2">Por que esta receita</h3>
              <ul className="space-y-1">
                {chosenRec.reasons.map((r, i) => <li key={i} className="text-sm text-gray-200 flex gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> {r}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-2">O que vai na biotinta</h3>
              <div className="rounded-xl border border-white/8 divide-y divide-white/5 overflow-hidden">
                {chosen.components.map((c, i) => (
                  <div key={i} className="px-3 py-2.5 flex items-start gap-3 bg-white/2">
                    <span className={cn("mt-1 w-2 h-2 rounded-full shrink-0", roleColor(c.role))} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-100 flex items-baseline gap-2 flex-wrap">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-emerald-300 font-mono text-xs">{c.amount} {c.unit}</span>
                      </div>
                      {lab.advanced && <div className="text-[11px] text-gray-400 mt-0.5">{c.why}{c.substitute && <span className="text-gray-500"> · Alternativa: {c.substitute}</span>}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3">
                <div className="text-emerald-300 font-semibold mb-1">Prós</div>
                <ul className="space-y-0.5 text-gray-300">{chosen.pros.map((p, i) => <li key={i}>• {p}</li>)}</ul>
              </div>
              <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3">
                <div className="text-amber-300 font-semibold mb-1">Limitações</div>
                <ul className="space-y-0.5 text-gray-300">{chosen.cons.map((p, i) => <li key={i}>• {p}</li>)}</ul>
              </div>
            </div>
          </div>

          {/* Janela de biofabricação */}
          <aside className="rounded-xl border border-white/10 bg-black/30 p-4">
            <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Janela de biofabricação</h3>
            <p className="text-[11px] text-gray-500 mb-3">Fidelidade de forma × viabilidade celular com {CELL_LABELS[lab.cell].label.toLowerCase()} e agulha {lab.equipment.nozzle_mm} mm.</p>
            <WindowChart fidelity={win.fidelity} viability={win.viability} inWindow={win.inWindow} />
            <div className={cn("mt-3 text-xs font-semibold px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1.5", zone.tone === "good" ? "bg-emerald-500/15 text-emerald-200" : zone.tone === "warn" ? "bg-amber-500/15 text-amber-200" : "bg-rose-500/15 text-rose-200")}>
              {zone.tone === "good" ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />} {zone.label}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-center">
              <Stat label="Fidelidade" value={`${win.fidelity}`} />
              <Stat label="Viabilidade" value={`${win.viability}`} />
            </div>
            {lab.advanced && (
              <>
                <ul className="mt-3 space-y-1 text-[11px] text-gray-400">{win.notes.map((n, i) => <li key={i}>· {n}</li>)}</ul>
                <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-gray-400 space-y-0.5 font-mono">
                  <div>η ≈ {chosen.rheology.viscosity_PaS} Pa·s · τy ≈ {chosen.rheology.yieldStress_Pa} Pa</div>
                  <div>G′ ≈ {chosen.rheology.gPrime_Pa} Pa · tan δ ≈ {chosen.rheology.tanDelta} · n ≈ {chosen.rheology.powerLawN}</div>
                </div>
              </>
            )}
          </aside>
        </div>

        {lab.advanced && (
          <details className="mt-4 text-xs">
            <summary className="cursor-pointer text-gray-400 hover:text-gray-200 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> {chosen.references.length} referências</summary>
            <ul className="mt-2 space-y-1 text-gray-400">
              {chosen.references.map((r, i) => (
                <li key={i} className="flex gap-1.5">
                  <span>•</span>
                  <span>{r.label}{(r.doi || r.url) && <a className="text-cyan-300 hover:underline ml-1 inline-flex items-center gap-0.5" href={r.doi ? `https://doi.org/${r.doi}` : r.url} target="_blank" rel="noreferrer">abrir <ExternalLink className="w-3 h-3" /></a>}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* Alternativas */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-1.5"><Lightbulb className="w-4 h-4 text-amber-300" /> {showAll ? "Todas as receitas" : "Alternativas"}</h3>
          <button onClick={() => setShowAll(!showAll)} className="text-xs text-gray-400 hover:text-gray-200">{showAll ? "Mostrar só as compatíveis" : `Ver todas (${recs.length})`}</button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {list.map((r) => (
            <button key={r.recipe.id} onClick={() => onPick(r.recipe.id)} className={cn("text-left p-3 rounded-xl border transition-colors", r.blockers.length ? "border-white/5 bg-white/2 opacity-70 hover:opacity-100" : "border-white/10 bg-white/3 hover:border-emerald-400/40")}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-gray-100 truncate">{r.recipe.name}</div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 shrink-0">{levelLabel(r.recipe.level)}</span>
              </div>
              <div className="text-[11px] text-gray-500 mt-1 line-clamp-2">{r.recipe.short}</div>
              <div className="mt-2 flex items-center gap-2 text-[10px]">
                <span className="text-gray-400">F {r.fidelity}</span><span className="text-gray-600">·</span><span className="text-gray-400">V {r.viability}</span>
                {r.blockers.length > 0 && <span className="ml-auto text-rose-300 truncate">{r.blockers[0]}</span>}
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 pt-2">
        <button onClick={onBack} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-gray-300 text-sm hover:border-white/25"><ArrowLeft className="w-4 h-4" /> Decisões</button>
        <button onClick={onNext} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-400 text-black font-semibold text-sm hover:bg-emerald-300">Ir para a bancada <ArrowRight className="w-4 h-4" /></button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
//  PASSO 3 · Bancada
// ─────────────────────────────────────────────────────────────────────────
function StepBench({ lab, set, chosen, bench, win, hasCells, cellDensity, troubles, onBack, onDownload, onCopy, onSend }: {
  lab: LabState
  set: <K extends keyof LabState>(k: K, v: LabState[K]) => void
  chosen: Recipe
  bench: ReturnType<typeof planBench>
  win: ReturnType<typeof evaluateRecipeWindow>
  hasCells: boolean
  cellDensity: number
  troubles: ReturnType<typeof relevantTroubles>
  onBack: () => void; onDownload: () => void; onCopy: () => void; onSend: (d: "slice" | "slicer") => void
}) {
  const [openTrouble, setOpenTrouble] = useState<string | null>(null)
  const canCells = lab.cell !== "none" && chosen.cellDensity_Mml[1] > 0
  return (
    <div className="space-y-6">
      {/* Entradas mínimas */}
      <section className="rounded-2xl border border-white/10 bg-white/3 p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <label className="block">
          <span className="text-xs text-gray-400 flex items-center gap-1.5"><Syringe className="w-3.5 h-3.5" /> Volume a imprimir (mL)</span>
          <input type="number" min={0.1} step={0.1} value={lab.printVolume_mL} onChange={(e) => set("printVolume_mL", Math.max(0.1, parseFloat(e.target.value) || 0.1))} className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-400/50 outline-none" />
          <span className="text-[10px] text-gray-500">Vem do fatiamento quando disponível. 1 mL ≈ cubo de 10 mm sólido.</span>
        </label>
        <label className={cn("block", !canCells && "opacity-50")}>
          <span className="text-xs text-gray-400 flex items-center gap-1.5"><Microscope className="w-3.5 h-3.5" /> Densidade celular (×10⁶/mL)</span>
          <input type="range" disabled={!canCells} min={chosen.cellDensity_Mml[0] || 0} max={chosen.cellDensity_Mml[1] || 1} step={0.5} value={cellDensity} onChange={(e) => set("cellDensity", parseFloat(e.target.value))} className="mt-2 w-full accent-emerald-400" />
          <span className="text-[11px] text-gray-300 font-mono">{canCells ? `${cellDensity} × 10⁶/mL` : "acelular"} <span className="text-gray-500">(faixa validada {chosen.cellDensity_Mml[0]}–{chosen.cellDensity_Mml[1]})</span></span>
        </label>
        <div className="rounded-xl border border-white/8 bg-black/30 p-3 text-xs">
          <div className="text-gray-400 mb-1">Resumo</div>
          <div className="text-gray-100 font-semibold">{chosen.name}</div>
          <div className="text-gray-400">{CELL_LABELS[lab.cell].label}{hasCells ? ` · ${cellDensity} M/mL` : ""} · {GOAL_LABELS[lab.goal].label}</div>
          <div className="text-gray-400 mt-1">Janela: F {win.fidelity} · V {win.viability} · <span className={win.inWindow ? "text-emerald-300" : "text-amber-300"}>{ZONE_LABELS[win.zone].label}</span></div>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Quantidades */}
        <section className="rounded-2xl border border-emerald-400/25 bg-emerald-500/5 p-4">
          <h3 className="text-sm font-semibold text-emerald-200 flex items-center gap-1.5 mb-1"><Beaker className="w-4 h-4" /> Quantidades para {bench.totalVolume_mL} mL</h3>
          <p className="text-[11px] text-gray-400 mb-3">{lab.printVolume_mL} mL de impressão + {bench.deadVolume_mL} mL de volume morto + 30 % de margem → {bench.syringes} seringa(s) de {bench.perSyringe_mL} mL.</p>
          <table className="w-full text-xs">
            <tbody className="divide-y divide-white/5">
              {bench.lines.map((l, i) => (
                <tr key={i}>
                  <td className="py-2 pr-2 text-gray-200 align-top">{l.name}</td>
                  <td className="py-2 text-right font-mono text-emerald-200 whitespace-nowrap align-top">{l.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {lab.advanced && bench.lines.some((l) => l.note) && (
            <ul className="mt-2 text-[10px] text-gray-500 space-y-0.5">{bench.lines.filter((l) => l.note).map((l, i) => <li key={i}>· {l.name.split("(")[0].trim()}: {l.note}</li>)}</ul>
          )}
          {hasCells && (
            <div className="mt-3 text-[11px] text-gray-300 bg-black/30 rounded-lg p-2.5 flex gap-2"><Info className="w-4 h-4 text-cyan-300 shrink-0" /> {chosen.cellMixRatio}</div>
          )}
        </section>

        {/* Preparo */}
        <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
          <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-1.5 mb-3"><FlaskConical className="w-4 h-4 text-cyan-300" /> Preparo passo a passo</h3>
          <ol className="space-y-2.5">
            {chosen.prep.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0", s.critical ? "bg-amber-400/20 text-amber-200 border border-amber-400/40" : "bg-white/8 text-gray-200")}>{i + 1}</span>
                <div className="min-w-0">
                  <div className="text-sm text-gray-100 font-medium flex items-center gap-2 flex-wrap">{s.title}{s.critical && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-200">crítico</span>}{(s.minutes || s.temp_C != null) && <span className="text-[10px] text-gray-500 font-mono">{s.minutes ? `${s.minutes} min` : ""}{s.temp_C != null ? ` · ${s.temp_C} °C` : ""}</span>}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{s.detail}</div>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-gray-400 space-y-1">
            <div><b className="text-gray-300">Esterilização:</b> {chosen.sterilization}</div>
            <div><b className="text-gray-300">Validade:</b> {chosen.shelfLife}</div>
            <div><b className="text-gray-300">Imprimível por:</b> {chosen.printWindow_min[0]}–{chosen.printWindow_min[1]} min após o preparo{hasCells && ` · células fora da incubadora ≤ ${chosen.cellWindow_min} min`}</div>
          </div>
        </section>

        {/* Parâmetros iniciais + reticulação */}
        <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
          <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-1.5 mb-3"><Layers className="w-4 h-4 text-violet-300" /> Parâmetros que dão certo</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Agulha" value={`${chosen.startParams.nozzle_mm} mm`} />
            <Stat label="Velocidade" value={`${chosen.startParams.speed_mms} mm/s`} />
            <Stat label="Camada" value={`${chosen.startParams.layerHeight_mm} mm`} />
            <Stat label="Fluxo" value={`${chosen.startParams.flowPercent} %`} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Stat label="Seringa" value={`${chosen.printTemp_C} °C`} />
            <Stat label="Mesa" value={chosen.bedTemp_C != null ? `${chosen.bedTemp_C} °C` : "ambiente"} />
          </div>
          {chosen.startParams.pressure_kPa && <div className="text-[11px] text-gray-500 mt-2">Equivalente pneumático: {chosen.startParams.pressure_kPa[0]}–{chosen.startParams.pressure_kPa[1]} kPa.</div>}
          <div className="mt-3 text-[11px] text-gray-300 bg-black/30 rounded-lg p-2.5 flex gap-2"><Lightbulb className="w-4 h-4 text-amber-300 shrink-0" /> Antes do G-code: extrude 1 linha reta de 20 mm e 1 ângulo de 90°. Cordão contínuo, sem gota e sem fio → pode imprimir.</div>

          <h4 className="text-xs font-semibold text-gray-200 mt-4 mb-2 flex items-center gap-1.5"><Sun className="w-3.5 h-3.5 text-amber-300" /> Reticulação · {crosslinkLabel(chosen.crosslink)}</h4>
          <ol className="space-y-1.5">
            {chosen.crosslinkProtocol.map((s, i) => (
              <li key={i} className="text-xs text-gray-300 flex gap-2"><span className="text-gray-500 font-mono">{i + 1}.</span><span><b className="text-gray-100">{s.title}</b> — {s.detail}{s.minutes ? <span className="text-gray-500"> ({s.minutes} min)</span> : null}</span></li>
            ))}
          </ol>
        </section>

        {/* Troubleshooting */}
        <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
          <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-1.5 mb-3"><Wrench className="w-4 h-4 text-rose-300" /> Se der errado</h3>
          <div className="divide-y divide-white/5">
            {troubles.map((t) => {
              const open = openTrouble === t.id
              return (
                <div key={t.id}>
                  <button onClick={() => setOpenTrouble(open ? null : t.id)} className="w-full text-left py-2 text-sm text-gray-200 flex items-center justify-between gap-2 hover:text-white">
                    <span>{t.symptom}</span><span className="text-gray-500 text-xs">{open ? "−" : "+"}</span>
                  </button>
                  {open && (
                    <div className="pb-3 text-xs space-y-2">
                      <div><div className="text-gray-500 mb-0.5">Causas prováveis</div><ul className="text-gray-300 space-y-0.5">{t.likelyCauses.map((c, i) => <li key={i}>• {c}</li>)}</ul></div>
                      <div><div className="text-gray-500 mb-0.5">Correções</div><ul className="text-emerald-200 space-y-0.5">{t.fixes.map((c, i) => <li key={i}>✓ {c}</li>)}</ul></div>
                      {t.knob && <div className="text-[11px] text-violet-200 bg-violet-500/10 border border-violet-400/20 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1.5"><SlidersHorizontal className="w-3.5 h-3.5" /> No BioSlicer/Host: {t.knob.param} {t.knob.direction === "up" ? "↑" : "↓"} {t.knob.amount}</div>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* Ações */}
      <div className="sticky bottom-3 z-10">
        <div className="rounded-2xl border border-emerald-400/30 bg-[#0d1512]/95 backdrop-blur p-4 flex items-center justify-between gap-3 flex-wrap shadow-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={onBack} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-gray-300 text-xs hover:border-white/25"><ArrowLeft className="w-3.5 h-3.5" /> Receita</button>
            <button onClick={onDownload} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-gray-200 text-xs hover:border-white/25"><Download className="w-3.5 h-3.5" /> Protocolo .md</button>
            <button onClick={onCopy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-gray-200 text-xs hover:border-white/25"><Copy className="w-3.5 h-3.5" /> Copiar</button>
            <button onClick={() => { sessionStorage.removeItem(LAB_KEY); location.reload() }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-gray-400 text-xs hover:border-white/25" title="Recomeçar"><RotateCcw className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onSend("slice")} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-400/40 text-emerald-100 text-sm hover:bg-emerald-500/10">Fatiamento (Etapa 3) <ArrowRight className="w-4 h-4" /></button>
            <button onClick={() => onSend("slicer")} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-400 text-black font-semibold text-sm hover:bg-emerald-300"><Layers className="w-4 h-4" /> Enviar ao BioSlicer</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
//  Componentes auxiliares
// ─────────────────────────────────────────────────────────────────────────
function SectionTitle({ n, title, hint }: { n: number; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-sm font-bold flex items-center justify-center shrink-0">{n}</span>
      <div><h2 className="text-base font-semibold text-white">{title}</h2><p className="text-xs text-gray-500">{hint}</p></div>
    </div>
  )
}

function Toggle({ icon: Icon, label, desc, on, onChange }: { icon: typeof Sun; label: string; desc: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} role="switch" aria-checked={on} className={cn("text-left p-3 rounded-xl border transition-colors", on ? "bg-cyan-500/10 border-cyan-400/40" : "bg-white/3 border-white/8 hover:border-white/20")}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-gray-200 flex items-center gap-1.5"><Icon className={cn("w-3.5 h-3.5", on ? "text-cyan-300" : "text-gray-500")} /> {label}</div>
        <span className={cn("w-8 h-4.5 rounded-full relative transition-colors", on ? "bg-cyan-400" : "bg-white/10")} style={{ height: 18 }}><span className={cn("absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all", on ? "left-4" : "left-0.5")} /></span>
      </div>
      <div className="text-[11px] text-gray-500 mt-1">{desc}</div>
    </button>
  )
}

function Pill({ icon: Icon, label }: { icon: typeof Sun; label: string }) {
  return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/30 border border-white/10 text-gray-300 whitespace-nowrap"><Icon className="w-3 h-3" /> {label}</span>
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-black/30 border border-white/8 px-2 py-1.5 text-center"><div className="text-[10px] text-gray-500">{label}</div><div className="text-sm font-mono text-gray-100">{value}</div></div>
}

/** Gráfico SVG da janela de biofabricação (x = viabilidade, y = fidelidade) */
function WindowChart({ fidelity, viability, inWindow }: { fidelity: number; viability: number; inWindow: boolean }) {
  const W = 260, H = 180, pad = 26
  const x = pad + (viability / 100) * (W - 2 * pad)
  const y = H - pad - (fidelity / 100) * (H - 2 * pad)
  // janela: viabilidade ≥ 65, fidelidade ≥ 45
  const wx = pad + 0.65 * (W - 2 * pad)
  const wy = H - pad - 0.45 * (H - 2 * pad)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <defs>
        <linearGradient id="winbg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#f43f5e" stopOpacity="0.18" /><stop offset="0.5" stopColor="#f59e0b" stopOpacity="0.12" /><stop offset="1" stopColor="#10b981" stopOpacity="0.25" /></linearGradient>
      </defs>
      <rect x={pad} y={pad} width={W - 2 * pad} height={H - 2 * pad} fill="url(#winbg)" rx="6" />
      <rect x={wx} y={pad} width={W - pad - wx} height={wy - pad} fill="#10b981" fillOpacity="0.18" stroke="#34d399" strokeOpacity="0.6" strokeDasharray="3 3" rx="4" />
      <text x={wx + 4} y={pad + 12} fontSize="9" fill="#6ee7b7">janela</text>
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#ffffff22" />
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="#ffffff22" />
      <text x={W / 2} y={H - 8} fontSize="9" fill="#9ca3af" textAnchor="middle">viabilidade celular →</text>
      <text x={10} y={H / 2} fontSize="9" fill="#9ca3af" textAnchor="middle" transform={`rotate(-90 10 ${H / 2})`}>fidelidade de forma →</text>
      <circle cx={x} cy={y} r="9" fill={inWindow ? "#10b981" : "#f59e0b"} fillOpacity="0.25" />
      <circle cx={x} cy={y} r="4.5" fill={inWindow ? "#34d399" : "#fbbf24"} stroke="#000" strokeWidth="1" />
    </svg>
  )
}

function levelLabel(l: Recipe["level"]) { return l === "starter" ? "iniciante" : l === "intermediate" ? "intermediário" : "avançado" }
function crosslinkLabel(k: Recipe["crosslink"]) {
  return { ionic: "reticulação iônica (CaCl₂)", photo: "fotorreticulação 405 nm", thermal: "gelificação térmica", enzymatic: "reticulação enzimática", none: "sem reticulação", sacrificial: "tinta sacrificial" }[k]
}
function roleColor(r: string) {
  return { polymer: "bg-emerald-400", crosslinker: "bg-amber-400", photoinitiator: "bg-violet-400", thickener: "bg-cyan-400", bioactive: "bg-rose-400", solvent: "bg-gray-500", cells: "bg-pink-400" }[r] ?? "bg-gray-500"
}
