"use client"

/**
 * BIA v4 · R16.3 · Etapa 2 — Biotinta (versão simples)
 * ─────────────────────────────────────────────────────
 * Escolha rápida entre biotintas validadas + células → segue para o fatiamento.
 * O Laboratório de Biotintas guiado (/bioink/lab) e o modo clássico
 * (/bioink/classic) ficam atrás de "Opções avançadas", sem poluir a etapa.
 */

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Droplets, ArrowRight, Check, Sun, Thermometer, CircleDot, ChevronDown, FlaskConical, SlidersHorizontal, Microscope, Info } from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { useBioprintProcess } from "@/lib/bioprint/process-context"
import { RECIPES, CELL_LABELS, toBioinkPatch, getRecipe, type CellTypeId, type Recipe } from "@/lib/bioink-lab"

const ORDER: Record<Recipe["level"], number> = { starter: 0, intermediate: 1, advanced: 2 }
const CELL_ORDER: CellTypeId[] = ["none", "fibroblast", "keratinocyte", "chondrocyte", "osteoblast", "msc", "huvec", "hepatocyte", "cardiomyocyte", "neuron", "ipsc", "tumor"]
const PICK_KEY = "bia:bioink-pick"

export default function BioinkStepPage() {
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
  const visible = showAll ? recipes : recipes.filter((r) => r.level !== "advanced")
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
    <div className="bia-bioink-step flex flex-col min-h-full bg-[#0a0a0f] text-gray-200">
      <header className="px-4 sm:px-6 py-5 border-b border-white/5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-300/80 font-semibold mb-1">Fase 2 / 6 · Bioimpressão</div>
            <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2"><Droplets className="w-5 h-5 text-cyan-400" /> Biotinta</h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl">Escolha uma biotinta já testada e validada na literatura. Os parâmetros de impressão que funcionam vêm junto.</p>
          </div>
          {ready && (
            <Link href="/dashboard/bioprint/slice" className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 text-sm font-medium rounded-xl">
              Continuar para Fatiamento <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-6 max-w-5xl w-full mx-auto space-y-7">
        {ready && (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/5 px-4 py-3 text-sm flex items-center gap-2 flex-wrap">
            <Check className="w-4 h-4 text-emerald-300" />
            <span className="text-gray-200">Biotinta atual: <b>{state.bioink.material}</b>{state.bioink.cellType ? ` · ${state.bioink.cellType} ${state.bioink.cellDensityMillionMl ?? ""} M/mL` : " · acelular"}</span>
            <span className="text-gray-500 text-xs">— escolha outra abaixo para substituir</span>
          </div>
        )}

        {/* Receitas */}
        <section id="bioink-recipes">
          <h2 className="text-sm font-semibold text-white mb-3">1 · Qual biotinta?</h2>
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
          <button onClick={() => setShowAll(!showAll)} className="mt-2 text-xs text-gray-500 hover:text-gray-300 inline-flex items-center gap-1">
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showAll && "rotate-180")} /> {showAll ? "Ocultar receitas avançadas" : `Mostrar receitas avançadas (${recipes.length - visible.length})`}
          </button>
        </section>

        {/* Células */}
        <section id="bioink-cells">
          <h2 className="text-sm font-semibold text-white mb-1">2 · Com células?</h2>
          <p className="text-[11px] text-gray-500 mb-3">{canCells ? "Sem células é o melhor começo para validar a forma. Só aparecem as células compatíveis com a receita." : "Esta receita é acelular (treino ou tinta sacrificial)."}</p>
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
          <button onClick={confirm} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-400 text-black font-semibold text-sm hover:bg-cyan-300">Usar esta biotinta e continuar <ArrowRight className="w-4 h-4" /></button>
        </section>

        {/* Avançado — discreto */}
        <details className="group pt-2">
          <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-300 inline-flex items-center gap-1.5 list-none">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Opções avançadas <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 grid sm:grid-cols-2 gap-2">
            <Link href="/dashboard/bioprint/bioink/lab" className="p-3 rounded-xl border border-white/8 bg-white/2 hover:border-emerald-400/40 block">
              <div className="text-sm text-gray-100 font-medium flex items-center gap-1.5"><FlaskConical className="w-4 h-4 text-emerald-300" /> Laboratório de Biotintas</div>
              <div className="text-[11px] text-gray-500 mt-1">Recomendação por objetivo/células/equipamento, janela de biofabricação, quantidades de bancada calculadas, preparo passo a passo, troubleshooting e protocolo exportável.</div>
            </Link>
            <Link href="/dashboard/bioprint/bioink/classic" className="p-3 rounded-xl border border-white/8 bg-white/2 hover:border-white/25 block">
              <div className="text-sm text-gray-100 font-medium flex items-center gap-1.5"><Info className="w-4 h-4 text-gray-400" /> Formulação livre (clássico)</div>
              <div className="text-[11px] text-gray-500 mt-1">Material, concentração, crosslinker, aditivos e reologia em tempo real; catálogo de 807 biomateriais; multi-material.</div>
            </Link>
          </div>
        </details>
      </main>
    </div>
  )
}
