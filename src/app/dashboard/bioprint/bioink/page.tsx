"use client"

/**
 * BIA v4 · R24.6 · Fase 2 — Biotinta (LUGAR ÚNICO de formulação)
 * ─────────────────────────────────────────────────────────────────
 * Antes havia 4 formuladores espalhados (/bioink, /bioink/lab, /bioink/classic,
 * /formulator-pro) + 1 dentro do toolpath. Agora é UMA página com 4 modos:
 *   · Receitas validadas (padrão)  — 18 biotintas da literatura + células
 *   · Laboratório guiado           — objetivo → receita → bancada (3 passos)
 *   · Formular do zero             — material/concentração/crosslinker, reologia,
 *                                    catálogo de 807 biomateriais, multi-material
 *   · Formulador Pro (IA)          — multi-componente com análise científica
 * As rotas antigas redirecionam para cá com ?mode=…
 */

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Droplets, ArrowRight, Check, Sun, Thermometer, CircleDot, ChevronDown, FlaskConical, Microscope, BookOpenCheck, Beaker, Atom } from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { useBioprintProcess } from "@/lib/bioprint/process-context"
import { RECIPES, CELL_LABELS, GOAL_LABELS, toBioinkPatch, getRecipe, type CellTypeId, type Recipe } from "@/lib/bioink-lab"
import { BioinkGuidedLab } from "@/components/bioink/BioinkGuidedLab"
import { BioinkFreeFormulator } from "@/components/bioink/BioinkFreeFormulator"
import { FormulatorPro } from "@/components/bioink/FormulatorPro"

export type BioinkMode = "recipes" | "lab" | "free" | "pro"
const MODES: Array<{ id: BioinkMode; label: string; hint: string; icon: typeof Droplets }> = [
  { id: "recipes", label: "Formulações validadas", hint: "18 formulações validadas na literatura, com parâmetros de impressão correspondentes. Ponto de partida recomendado.", icon: BookOpenCheck },
  { id: "lab",     label: "Laboratório guiado", hint: "Informe o objetivo; a BIA retorna a formulação, a janela de biofabricação e o protocolo de bancada.", icon: FlaskConical },
  { id: "free",    label: "Formulação livre",   hint: "Material, concentração, agente de reticulação, reologia em tempo real, catálogo de 807 biomateriais e configuração multimaterial.", icon: Beaker },
  { id: "pro",     label: "Formulador Pro (IA)", hint: "Formulação multicomponente (até 8) com análise científica assistida por IA. 10 créditos.", icon: Atom },
]
const MODE_KEY = "bia:bioink-mode"
function parseMode(v: string | null | undefined): BioinkMode | null {
  return v === "recipes" || v === "lab" || v === "free" || v === "pro" ? v : null
}

const ORDER: Record<Recipe["level"], number> = { starter: 0, intermediate: 1, advanced: 2 }
const CELL_ORDER: CellTypeId[] = ["none", "fibroblast", "keratinocyte", "chondrocyte", "osteoblast", "msc", "huvec", "hepatocyte", "cardiomyocyte", "neuron", "ipsc", "tumor"]
const PICK_KEY = "bia:bioink-pick"

export default function BioinkStepPage() {
  return <Suspense fallback={<div className="p-6 text-sm text-gray-400">Carregando Fase 2…</div>}><BioinkStepInner /></Suspense>
}

function BioinkStepInner() {
  const searchParams = useSearchParams()
  const [mode, setModeState] = useState<BioinkMode>(() => parseMode(searchParams?.get("mode")) ?? "recipes")
  useEffect(() => {
    const q = parseMode(searchParams?.get("mode"))
    if (q) { setModeState(q); return }
    try { const saved = parseMode(sessionStorage.getItem(MODE_KEY)); if (saved) setModeState(saved) } catch { /* noop */ }
  }, [searchParams])
  const setMode = (m: BioinkMode) => {
    setModeState(m)
    try { sessionStorage.setItem(MODE_KEY, m) } catch { /* noop */ }
    try { window.history.replaceState(null, "", m === "recipes" ? "/dashboard/bioprint/bioink" : `/dashboard/bioprint/bioink?mode=${m}`) } catch { /* noop */ }
  }
  const { state } = useBioprintProcess()
  const ready = state.bioink.status === "ready" && state.bioink.material

  return (
    <div className="bia-bioink-step flex flex-col min-h-full bg-[#0a0a0f] text-gray-200">
      {/* Seletor de modo — único lugar de formulação de biotintas */}
      <nav aria-label="Modo de formulação" className="px-4 sm:px-6 pt-4 flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-[0.25em] text-cyan-300/80 font-semibold mr-1">Fase 2 / 6 · Biotinta</span>
        {MODES.map((m) => {
          const Icon = m.icon
          return (
            <button key={m.id} onClick={() => setMode(m.id)} title={m.hint}
              className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors",
                mode === m.id ? "bg-cyan-500/15 border-cyan-400/50 text-cyan-100" : "border-white/10 text-gray-300 hover:border-white/25")}>
              <Icon className="w-3.5 h-3.5" /> {m.label}
            </button>
          )
        })}
        <span className="flex-1" />
        {ready && mode !== "recipes" && (
          <Link href="/dashboard/bioprint/slice" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 text-xs">
            Fase 3 · Fatiar <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </nav>
      <p className="px-4 sm:px-6 pt-1.5 text-[11px] text-gray-500">{MODES.find((m) => m.id === mode)?.hint}</p>

      {mode === "recipes" && <RecipesMode onOpenMode={setMode} />}
      {mode === "lab" && <BioinkGuidedLab />}
      {mode === "free" && <BioinkFreeFormulator />}
      {mode === "pro" && <FormulatorPro />}
    </div>
  )
}

function RecipesMode({ onOpenMode }: { onOpenMode: (m: BioinkMode) => void }) {
  const router = useRouter()
  const { state, updateBioink } = useBioprintProcess()
  const [recipeId, setRecipeId] = useState<string>("alg_gel_starter")
  const [cell, setCell] = useState<CellTypeId>("none")
  const [density, setDensity] = useState<number>(2)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PICK_KEY)
      if (raw) { const p = JSON.parse(raw); if (p.recipeId) setRecipeId(p.recipeId); if (p.cell) setCell(p.cell); if (p.density) setDensity(p.density) }
    } catch { /* noop */ }
  }, [])
  useEffect(() => { try { sessionStorage.setItem(PICK_KEY, JSON.stringify({ recipeId, cell, density })) } catch { /* noop */ } }, [recipeId, cell, density])

  const recipes = useMemo(() => [...RECIPES].sort((a, b) => ORDER[a.level] - ORDER[b.level]), [])
  // R24.5 · catálogo ampliado (18 receitas): filtro por objetivo/tecido; o brief da Fase 1 pré-seleciona
  const [goal, setGoal] = useState<string>("all")
  useEffect(() => {
    const t = state.model.brief?.tissue?.toLowerCase() ?? ""
    const map: Array<[RegExp, string]> = [[/pele/, "skin"], [/cartil/, "cartilage"], [/osso|óss/, "bone"], [/vasc/, "vascular"], [/mioc|card/, "cardiac"], [/hep|fíg/, "liver"], [/neur/, "neural"], [/renal|rim/, "generic_cells"], [/teste/, "learn"]]
    const hit = map.find(([re]) => re.test(t)); if (hit) setGoal(hit[1])
  }, [state.model.brief?.tissue])
  const byGoal = goal === "all" ? recipes : recipes.filter((r) => r.goals.includes(goal as Recipe["goals"][number]))
  const visible = showAll || goal !== "all" ? byGoal : byGoal.filter((r) => r.level !== "advanced")
  const recipe = getRecipe(recipeId) ?? recipes[0]
  const canCells = recipe.cellDensity_Mml[1] > 0
  const cellOk = canCells && cell !== "none" && recipe.cellsOk.includes(cell)
  const [lo, hi] = recipe.cellDensity_Mml
  const dens = Math.min(hi || 0, Math.max(lo || 0, density))

  const confirm = () => {
    const patch = toBioinkPatch(recipe, cellOk ? cell : "none", cellOk ? dens : null)
    const { labRecipeId, labPrintTemp_C, labStartParams, ...ctx } = patch
    updateBioink(ctx)
    try { sessionStorage.setItem("bia:slicer-hint", JSON.stringify({ recipeId: labRecipeId, printTemp_C: labPrintTemp_C, startParams: labStartParams, materialId: recipe.pipelineMaterialId, from: "bioink-step" })) } catch { /* noop */ }
    router.push("/dashboard/bioprint/slice")
  }

  const ready = state.bioink.status === "ready" && state.bioink.material

  return (
    <div className="flex flex-col min-h-full">
      <header className="px-4 sm:px-6 py-5 border-b border-white/5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2"><Droplets className="w-5 h-5 text-cyan-400" /> Biotinta</h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl">Selecione uma formulação validada na literatura científica. Os parâmetros de impressão correspondentes são carregados automaticamente.</p>
          </div>
          {ready && (
            <Link href="/dashboard/bioprint/slice" className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 text-sm font-medium rounded-xl">
              Avançar para o Fatiamento <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-6 max-w-5xl w-full mx-auto space-y-7">
        {ready && (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/5 px-4 py-3 text-sm flex items-center gap-2 flex-wrap">
            <Check className="w-4 h-4 text-emerald-300" />
            <span className="text-gray-200">Biotinta atual: <b>{state.bioink.material}</b>{state.bioink.cellType ? ` · ${state.bioink.cellType} ${state.bioink.cellDensityMillionMl ?? ""} M/mL` : " · acelular"}</span>
            <span className="text-gray-500 text-xs">— selecione outra formulação abaixo para substituí-la</span>
          </div>
        )}

        {/* Receitas */}
        <section id="bioink-recipes">
          <h2 className="text-sm font-semibold text-white mb-2">1. Qual formulação de biotinta será utilizada? <span className="text-xs font-normal text-gray-500">({recipes.length} receitas validadas)</span></h2>
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button onClick={() => setGoal("all")} className={cn("px-2.5 py-1 rounded-lg border text-xs", goal === "all" ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100" : "border-white/10 text-gray-300 hover:border-white/25")}>Todas</button>
            {Object.entries(GOAL_LABELS).map(([id, g]) => (
              <button key={id} onClick={() => setGoal(id)} title={g.hint} className={cn("px-2.5 py-1 rounded-lg border text-xs", goal === id ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100" : "border-white/10 text-gray-300 hover:border-white/25")}>{g.emoji} {g.label} <span className="text-gray-500">({recipes.filter((r) => r.goals.includes(id as Recipe["goals"][number])).length})</span></button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {visible.map((r) => {
              const active = r.id === recipe.id
              return (
                <button key={r.id} onClick={() => { setRecipeId(r.id); setDensity(Math.round((r.cellDensity_Mml[0] + r.cellDensity_Mml[1]) / 2 * 10) / 10 || 2); if (!r.cellsOk.includes(cell)) setCell("none") }}
                  className={cn("text-left p-3 rounded-xl border transition-all", active ? "bg-cyan-500/12 border-cyan-400/50 ring-1 ring-cyan-400/30" : "bg-white/3 border-white/8 hover:border-white/20")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className={cn("text-sm font-semibold leading-snug", active ? "text-cyan-100" : "text-gray-100")}>{r.name}</div>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded shrink-0", r.level === "starter" ? "bg-emerald-500/15 text-emerald-200" : r.level === "intermediate" ? "bg-amber-500/15 text-amber-200" : "bg-rose-500/15 text-rose-200")}>{r.level === "starter" ? "começar aqui" : r.level === "intermediate" ? "intermediário" : "avançado"}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1 line-clamp-2">{r.short}</div>
                  <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-gray-400">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/30 border border-white/8"><Thermometer className="w-3 h-3" />{r.printTemp_C} °C</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/30 border border-white/8"><CircleDot className="w-3 h-3" />{r.startParams.nozzle_mm} mm</span>
                    {r.requires.hasLight && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-400/20 text-violet-200"><Sun className="w-3 h-3" />luz 405 nm</span>}
                    {r.requires.hasTempHead && <span className="px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-400/20 text-sky-200">cabeçote frio</span>}
                  </div>
                </button>
              )
            })}
          </div>
          {goal === "all" && byGoal.length > visible.length + (showAll ? 0 : -1) && (
            <button onClick={() => setShowAll(!showAll)} className="mt-2 text-xs text-gray-500 hover:text-gray-300 inline-flex items-center gap-1">
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showAll && "rotate-180")} /> {showAll ? "Ocultar receitas avançadas" : `Mostrar receitas avançadas (${byGoal.length - visible.length})`}
            </button>
          )}
          {visible.length === 0 && <div className="text-xs text-gray-500 mt-2">Nenhuma receita para este objetivo — escolha “Todas” ou monte a sua no Laboratório guiado / Formular do zero (modos acima).</div>}
        </section>

        {/* Células */}
        <section id="bioink-cells">
          <h2 className="text-sm font-semibold text-white mb-1">2. O construto será celularizado?</h2>
          <p className="text-[11px] text-gray-500 mb-3">{canCells ? "A impressão acelular é recomendada para validar a geometria. São exibidos apenas os tipos celulares compatíveis com a formulação." : "Esta formulação é acelular (calibração ou tinta sacrificial)."}</p>
          <div className="flex flex-wrap gap-2">
            {CELL_ORDER.filter((c) => c === "none" || (canCells && recipe.cellsOk.includes(c))).map((c) => (
              <button key={c} onClick={() => setCell(c)} title={CELL_LABELS[c].note} className={cn("px-3 py-1.5 rounded-full border text-xs", cell === c ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-100" : "bg-white/3 border-white/10 text-gray-300 hover:border-white/25")}>{CELL_LABELS[c].label}</button>
            ))}
          </div>
          {cellOk && (
            <label className="block mt-4 max-w-sm">
              <span className="text-xs text-gray-400 flex items-center gap-1.5"><Microscope className="w-3.5 h-3.5" /> Densidade celular</span>
              <input type="range" min={lo} max={hi} step={0.5} value={dens} onChange={(e) => setDensity(parseFloat(e.target.value))} className="mt-2 w-full accent-cyan-400" />
              <span className="text-[11px] text-gray-300 font-mono">{dens} × 10⁶ cel/mL <span className="text-gray-500">(validado {lo}–{hi})</span></span>
            </label>
          )}
        </section>

        {/* Resumo + confirmar */}
        <section className="rounded-2xl border border-cyan-400/30 bg-[#0b1419] p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm min-w-0">
            <div className="text-white font-semibold truncate">{recipe.name}</div>
            <div className="text-xs text-gray-400">{cellOk ? `${CELL_LABELS[cell].label} · ${dens} M/mL` : "acelular"} · {recipe.pipelineCrosslinker} · agulha {recipe.startParams.nozzle_mm} mm · {recipe.startParams.speed_mms} mm/s · camada {recipe.startParams.layerHeight_mm} mm</div>
          </div>
          <button onClick={confirm} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-400 text-black font-semibold text-sm hover:bg-cyan-300">Confirmar biotinta e avançar <ArrowRight className="w-4 h-4" /></button>
        </section>

        {/* Outros modos — mesma página, sem duplicar ferramentas */}
        <div className="pt-2 text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1 items-center">
          <span>Não encontrou a formulação desejada?</span>
          <button onClick={() => onOpenMode("lab")} className="text-emerald-300 hover:underline inline-flex items-center gap-1"><FlaskConical className="w-3.5 h-3.5" /> Laboratório guiado</button>
          <span className="text-white/15">·</span>
          <button onClick={() => onOpenMode("free")} className="text-gray-300 hover:underline inline-flex items-center gap-1"><Beaker className="w-3.5 h-3.5" /> Formulação livre (807 biomateriais)</button>
          <span className="text-white/15">·</span>
          <button onClick={() => onOpenMode("pro")} className="text-blue-300 hover:underline inline-flex items-center gap-1"><Atom className="w-3.5 h-3.5" /> Formulador Pro (IA)</button>
        </div>
      </main>
    </div>
  )
}
