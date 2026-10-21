"use client"

/**
 * BIA v4 · R20 · Painel "Cabeçotes / biotintas" (multi-material em 1 G-code)
 * A usuária informa quantos cabeçotes tem; cada cabeçote recebe uma biotinta
 * (das formulações da Etapa 2 ou manual) e cada papel do caminho é atribuído.
 */
import { Syringe, Palette, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { type ToolsConfig, type ToolHead, TOOL_COLORS } from "@/lib/slicer/tools"
import { SYRINGE_CATALOG } from "@/lib/slicer/extrusion"
import type { ExtrusionModel, PathRole } from "@/lib/slicer/types"

export interface BioinkOption { label: string; materialId?: string; role?: string }

const ROLE_LABELS: Array<{ role: PathRole; label: string; hint: string }> = [
  { role: "wall_outer", label: "Parede externa", hint: "contorno visível — biotinta estrutural" },
  { role: "wall_inner", label: "Parede interna", hint: "reforço do contorno" },
  { role: "infill", label: "Preenchimento", hint: "interior — normalmente a biotinta com células" },
  { role: "support", label: "Suporte / sacrificial", hint: "Pluronic, canais, banho — removido depois" },
]

export function ToolsPanel({ tools, onChange, bioinks, baseExtrusion }: {
  tools: ToolsConfig
  onChange: (t: ToolsConfig) => void
  /** biotintas disponíveis (Etapa 2) */
  bioinks: BioinkOption[]
  baseExtrusion: ExtrusionModel
}) {
  const n = tools.heads.length
  const setCount = (count: number) => {
    const heads: ToolHead[] = []
    for (let i = 0; i < count; i++) {
      const prev = tools.heads[i]
      const ink = bioinks[i]
      heads.push(prev ?? {
        index: i as 0 | 1 | 2 | 3, label: ink?.label ?? `Biotinta ${i + 1}`, materialId: ink?.materialId,
        extrusion: { ...baseExtrusion }, offsetX_mm: 0, offsetY_mm: 0, temp_C: null, color: TOOL_COLORS[i],
      })
    }
    const assign = count <= 1 ? {} : { ...tools.assign }
    if (count > 1 && Object.keys(assign).length === 0) {
      // sugestão: paredes T0, infill T1, suporte último
      Object.assign(assign, { wall_outer: 0, wall_inner: 0, infill: 1, bottom: 0, top: 0, skirt: 0, purge: 0, support: (count - 1) as 0 | 1 | 2 | 3 })
    }
    // remove atribuições a cabeçotes que não existem mais
    for (const k of Object.keys(assign) as PathRole[]) if ((assign[k] ?? 0) >= count) delete assign[k]
    onChange({ ...tools, heads, assign })
  }
  const setHead = (i: number, patch: Partial<ToolHead>) => onChange({ ...tools, heads: tools.heads.map((h, k) => (k === i ? { ...h, ...patch } : h)) })
  const setAssign = (role: PathRole, t: number) => onChange({ ...tools, assign: { ...tools.assign, [role]: t as 0 | 1 | 2 | 3 } })

  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Quantos cabeçotes (seringas) a sua bioimpressora tem?</div>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((c) => (
            <button key={c} type="button" onClick={() => setCount(c)} className={cn("flex-1 py-2 rounded-lg border text-sm font-semibold", n === c ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-100" : "border-white/10 text-gray-300 hover:border-white/25")}>{c}</button>
          ))}
        </div>
        <div className="text-[11px] text-gray-500 mt-1">{n === 1 ? "1 cabeçote: todas as biotintas da Etapa 2 viram UMA formulação (mistura) — G-code sem trocas." : `${n} cabeçotes: G-code único com trocas T0–T${n - 1}; cada papel do caminho sai do cabeçote certo.`}</div>
      </div>

      <div className="space-y-2">
        {tools.heads.map((h, i) => (
          <div key={h.index} className="rounded-lg border border-white/10 bg-black/20 p-2.5">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-md text-[11px] font-bold flex items-center justify-center text-black" style={{ background: h.color }}>T{h.index}</span>
              <select value={h.label} onChange={(e) => { const ink = bioinks.find((b) => b.label === e.target.value); setHead(i, { label: e.target.value, materialId: ink?.materialId }) }} className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white">
                {!bioinks.some((b) => b.label === h.label) && <option value={h.label}>{h.label}</option>}
                {bioinks.map((b) => <option key={b.label} value={b.label}>{b.label}{b.role ? ` · ${b.role}` : ""}</option>)}
                <option value={`Biotinta ${i + 1}`}>— manual —</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <label className="block"><span className="text-gray-400 flex items-center gap-1"><Syringe className="w-3 h-3" /> Seringa</span>
                <select value={h.extrusion.syringe ? `${h.extrusion.syringe.volume_mL}|${h.extrusion.syringe.innerDiameter_mm}` : "10|14.5"} onChange={(e) => { const [v, d] = e.target.value.split("|").map(Number); setHead(i, { extrusion: { ...h.extrusion, kind: "syringe_stepper", syringe: { volume_mL: v, innerDiameter_mm: d } } }) }} className="mt-0.5 w-full bg-black/40 border border-white/10 rounded px-1.5 py-1 text-white">
                  {SYRINGE_CATALOG.map((s) => <option key={s.volume_mL} value={`${s.volume_mL}|${s.innerDiameter_mm}`}>{s.volume_mL} mL</option>)}
                </select>
              </label>
              <label className="block"><span className="text-gray-400">Temp. (°C)</span><input type="number" value={h.temp_C ?? ""} placeholder="—" onChange={(e) => setHead(i, { temp_C: e.target.value === "" ? null : +e.target.value })} className="mt-0.5 w-full bg-black/40 border border-white/10 rounded px-1.5 py-1 text-white" /></label>
              <label className="block"><span className="text-gray-400">Fluxo ×</span><input type="number" step={0.05} min={0.3} max={3} value={h.extrusion.flowMultiplier} onChange={(e) => setHead(i, { extrusion: { ...h.extrusion, flowMultiplier: +e.target.value || 1 } })} className="mt-0.5 w-full bg-black/40 border border-white/10 rounded px-1.5 py-1 text-white" /></label>
            </div>
            {i > 0 && (
              <div className="grid grid-cols-2 gap-2 text-[11px] mt-2">
                <label className="block"><span className="text-gray-400">Offset X vs T0 (mm)</span><input type="number" step={0.1} value={h.offsetX_mm} onChange={(e) => setHead(i, { offsetX_mm: +e.target.value || 0 })} className="mt-0.5 w-full bg-black/40 border border-white/10 rounded px-1.5 py-1 text-white" /></label>
                <label className="block"><span className="text-gray-400">Offset Y vs T0 (mm)</span><input type="number" step={0.1} value={h.offsetY_mm} onChange={(e) => setHead(i, { offsetY_mm: +e.target.value || 0 })} className="mt-0.5 w-full bg-black/40 border border-white/10 rounded px-1.5 py-1 text-white" /></label>
              </div>
            )}
          </div>
        ))}
      </div>

      {n > 1 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1 flex items-center gap-1"><Palette className="w-3 h-3" /> Qual cabeçote imprime o quê</div>
          <div className="space-y-1">
            {ROLE_LABELS.map(({ role, label, hint }) => (
              <div key={role} className="flex items-center gap-2 text-xs">
                <span className="w-32 text-gray-200 shrink-0" title={hint}>{label}</span>
                <ArrowRight className="w-3 h-3 text-gray-600" />
                <div className="flex gap-1">
                  {tools.heads.map((h) => (
                    <button key={h.index} type="button" onClick={() => setAssign(role, h.index)} className={cn("px-2 py-0.5 rounded border text-[11px] font-mono", (tools.assign[role] ?? 0) === h.index ? "text-black border-transparent" : "border-white/10 text-gray-400 hover:border-white/30")} style={(tools.assign[role] ?? 0) === h.index ? { background: h.color } : undefined}>T{h.index}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[11px] text-gray-400 mt-2">
            <input type="checkbox" checked={tools.applyOffsetInPath} onChange={(e) => onChange({ ...tools, applyOffsetInPath: e.target.checked })} className="accent-emerald-400" />
            Aplicar offset dos cabeçotes nas coordenadas (desmarque se o firmware já tem M218 configurado)
          </label>
        </div>
      )}
    </div>
  )
}
