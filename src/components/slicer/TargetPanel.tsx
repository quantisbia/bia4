"use client"

/**
 * BIA v4 · R20 · Painel "Onde imprimir" — Petri / lâmina / placa N poços
 * O bico começa no centro do alvo (G92). Placa: 1º poço selecionado = origem.
 */
import { useMemo } from "react"
import { Target, Grid3X3, Disc, Square } from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { type PrintTarget, type PlateFormat, PLATES, allWells, referenceWell, parseWellId } from "@/lib/slicer/target"

const PETRI: number[] = [30, 35, 60, 90, 100]
const FORMATS: PlateFormat[] = [6, 12, 24, 48, 96]

export function TargetPanel({ target, onChange, footprint_mm }: { target: PrintTarget; onChange: (t: PrintTarget) => void; footprint_mm?: number | null }) {
  const spec = target.kind === "plate" ? PLATES[target.format] : null
  const ref = spec && target.kind === "plate" && target.wells.length ? referenceWell(spec, target.wells) : null
  const fits = useMemo(() => {
    if (!footprint_mm) return null
    if (target.kind === "petri") return footprint_mm <= target.diameter_mm * 0.85
    if (target.kind === "plate") return footprint_mm <= PLATES[target.format].wellDiameter_mm * 0.85
    return true
  }, [footprint_mm, target])

  const toggleWell = (id: string) => {
    if (target.kind !== "plate") return
    const has = target.wells.includes(id)
    onChange({ ...target, wells: has ? target.wells.filter((w) => w !== id) : [...target.wells, id] })
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-3 gap-1.5">
        <KindBtn active={target.kind === "petri"} icon={<Disc className="w-4 h-4" />} label="Petri" onClick={() => onChange({ kind: "petri", diameter_mm: 60 })} />
        <KindBtn active={target.kind === "slide"} icon={<Square className="w-4 h-4" />} label="Lâmina / aberto" onClick={() => onChange({ kind: "slide" })} />
        <KindBtn active={target.kind === "plate"} icon={<Grid3X3 className="w-4 h-4" />} label="Placa de poços" onClick={() => onChange({ kind: "plate", format: 24, wells: ["A1"], zHop_mm: 5, pause_s: 0, purge_uL: 0 })} />
      </div>

      {target.kind === "petri" && (
        <div className="flex flex-wrap gap-1.5">
          {PETRI.map((d) => (
            <button key={d} type="button" onClick={() => onChange({ kind: "petri", diameter_mm: d })} className={cn("px-2.5 py-1 rounded-md text-xs border", target.diameter_mm === d ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-100" : "border-white/10 text-gray-300 hover:border-white/25")}>Ø {d} mm</button>
          ))}
        </div>
      )}

      {target.kind === "plate" && spec && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {FORMATS.map((fm) => (
              <button key={fm} type="button" onClick={() => onChange({ ...target, format: fm, wells: ["A1"] })} className={cn("px-2.5 py-1 rounded-md text-xs border", target.format === fm ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-100" : "border-white/10 text-gray-300 hover:border-white/25")}>{fm} poços</button>
            ))}
          </div>
          <div className="text-[11px] text-gray-400">Poço Ø {spec.wellDiameter_mm} mm · pitch {spec.pitch_mm} mm · profundidade {spec.wellDepth_mm} mm. Clique nos poços a imprimir.</div>
          <div className="inline-grid gap-0.5 p-2 rounded-lg bg-black/30 border border-white/10" style={{ gridTemplateColumns: `repeat(${spec.cols}, minmax(0, 1fr))` }}>
            {allWells(spec).map((id) => {
              const sel = target.wells.includes(id)
              const isRef = id === ref
              const { col } = parseWellId(spec, id)
              return (
                <button key={id} type="button" onClick={() => toggleWell(id)} title={id}
                  className={cn("rounded-full border text-[9px] font-mono flex items-center justify-center transition-colors",
                    spec.cols >= 12 ? "w-5 h-5" : spec.cols >= 8 ? "w-6 h-6" : spec.cols >= 6 ? "w-8 h-8" : "w-10 h-10",
                    isRef ? "bg-amber-400 text-black border-amber-300 font-bold" : sel ? "bg-emerald-500/40 border-emerald-300 text-white" : "bg-white/5 border-white/10 text-gray-500 hover:border-white/30")}>
                  {spec.cols <= 8 ? id : (col === 0 ? id[0] : "")}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => onChange({ ...target, wells: allWells(spec) })} className="text-[11px] px-2 py-0.5 rounded border border-white/10 text-gray-300 hover:border-white/25">Todos</button>
            <button type="button" onClick={() => onChange({ ...target, wells: ["A1"] })} className="text-[11px] px-2 py-0.5 rounded border border-white/10 text-gray-300 hover:border-white/25">Só A1</button>
            <button type="button" onClick={() => onChange({ ...target, wells: allWells(spec).filter((w) => w.startsWith("A")) })} className="text-[11px] px-2 py-0.5 rounded border border-white/10 text-gray-300 hover:border-white/25">Linha A</button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <label className="block"><span className="text-gray-400">Z-hop entre poços</span><input type="number" min={1} max={30} step={1} value={target.zHop_mm} onChange={(e) => onChange({ ...target, zHop_mm: +e.target.value || 5 })} className="mt-0.5 w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-white" /> <span className="text-gray-500">mm</span></label>
            <label className="block"><span className="text-gray-400">Pausa</span><input type="number" min={0} max={120} step={1} value={target.pause_s} onChange={(e) => onChange({ ...target, pause_s: +e.target.value || 0 })} className="mt-0.5 w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-white" /> <span className="text-gray-500">s</span></label>
            <label className="block"><span className="text-gray-400">Purga</span><input type="number" min={0} max={50} step={0.5} value={target.purge_uL} onChange={(e) => onChange({ ...target, purge_uL: +e.target.value || 0 })} className="mt-0.5 w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-white" /> <span className="text-gray-500">µL</span></label>
          </div>
        </>
      )}

      <div className={cn("rounded-lg border p-2.5 text-xs flex gap-2", fits === false ? "border-rose-400/40 bg-rose-500/10 text-rose-100" : "border-amber-400/30 bg-amber-500/5 text-amber-100")}>
        <Target className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <b>Ponto zero:</b>{" "}
          {target.kind === "plate" ? <>leve o bico ao <b>centro do poço {ref ?? "—"}</b> (amarelo), clique ⌂ G92 e inicie. Os outros poços são offsets de {spec?.pitch_mm} mm.</> : <>leve o bico ao <b>centro da {target.kind === "petri" ? "Petri" : "peça"}</b>, clique ⌂ G92 e inicie. A peça nasce exatamente ali.</>}
          {fits === false && footprint_mm && <div className="mt-1 font-semibold">⚠ A peça ({footprint_mm.toFixed(1)} mm) não cabe neste alvo. Reduza a escala ou troque o alvo.</div>}
        </div>
      </div>
    </div>
  )
}

function KindBtn({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex flex-col items-center gap-1 px-2 py-2 rounded-lg border text-xs transition-colors", active ? "bg-emerald-500/15 border-emerald-400/50 text-emerald-100" : "border-white/10 text-gray-300 hover:border-white/25")}>
      {icon}{label}
    </button>
  )
}
