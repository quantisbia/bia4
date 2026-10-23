"use client"

/**
 * BIA v4 · R27.2 · Calibrador de E-steps do êmbolo
 * ─────────────────────────────────────────────────
 * "Cliquei E+10 e o fuso andou 1 mm" = E-steps de filamento num extrusor de
 * seringa. Fluxo em 3 passos: ler (M503) → mover 10 mm → medir → gravar
 * (M92 + M500) e reaplicar os limites do êmbolo. Usado no /execute e no Host.
 */

import { useMemo, useState } from "react"
import { Ruler, Save, Play, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { calibrateEsteps, SYRINGE_EXTRUDER_PRESETS, plungerLimits } from "@/lib/slicer/flow-science"

export interface EstepsCalibratorProps {
  connected: boolean
  busy?: boolean
  /** E-steps atuais lidos do firmware (null = desconhecidos) */
  currentEsteps: number | null
  /** envia linhas em sequência aguardando ok */
  onSend: (lines: string[]) => Promise<void> | void
  /** chamado após gravar, com o novo valor (para atualizar estado/limites) */
  onApplied?: (newEsteps: number) => void
  compact?: boolean
}

const inp = "w-full px-2 py-1.5 rounded-md bg-black/40 border border-white/15 text-xs text-gray-100 focus:border-emerald-400/50 outline-none disabled:opacity-40"

export function EstepsCalibrator({ connected, busy, currentEsteps, onSend, onApplied, compact }: EstepsCalibratorProps) {
  const [requested, setRequested] = useState(10)
  const [measured, setMeasured] = useState<string>("")
  const [preset, setPreset] = useState<string>("")
  const [moved, setMoved] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const meas = parseFloat(measured.replace(",", "."))
  const calib = useMemo(() => (Number.isFinite(meas) && meas > 0 ? calibrateEsteps(currentEsteps, requested, meas) : null), [currentEsteps, requested, meas])
  const curLim = plungerLimits(currentEsteps)
  // feed do teste: ~0,5 mm/s ou o teto atual — se os E-steps estão 10× baixos,
  // o teto calculado está 10× alto, então também limitamos a 0,5 mm/s absoluto.
  const testF = Math.max(3, Math.round(Math.min(curLim.maxFeed_mms, 0.5) * 60))
  const testSeconds = Math.round(requested / (testF / 60))

  const read = async () => { setStatus("Lendo configuração (M503)…"); await onSend(["M503"]); setStatus("Procure a linha M92 … E<valor> no terminal — ela preenche o campo acima automaticamente.") }
  const move = async () => {
    setMoved(false); setStatus(`Movendo o êmbolo ${requested} mm (~${testSeconds} s). Marque a posição antes e meça depois.`)
    await onSend(["M83", "M302 S0 P1", `G1 E${requested} F${testF}`, "M400"])
    setMoved(true); setStatus(`Movimento enviado. Meça quanto o êmbolo/fuso realmente andou e digite abaixo.`)
  }
  const apply = async () => {
    if (!calib) return
    setStatus(`Gravando M92 E${calib.newEsteps} + M500 (só os passos — velocidade/aceleração do firmware não mudam)…`)
    await onSend(calib.gcode)
    onApplied?.(calib.newEsteps)
    setStatus(`✓ Gravado: ${calib.newEsteps} steps/mm. Repita o teste de ${requested} mm para confirmar (deve andar ${requested} mm).`)
    setMeasured(""); setMoved(false)
  }
  const applyPreset = async () => {
    const p = SYRINGE_EXTRUDER_PRESETS.find((x) => x.id === preset); if (!p) return
    setStatus(`Gravando preset ${p.label}: M92 E${p.esteps} + M500…`)
    await onSend([`M92 E${p.esteps}`, "M500"])
    onApplied?.(p.esteps)
    setStatus(`✓ Preset gravado (${p.esteps} steps/mm). Confirme com o teste de ${requested} mm.`)
  }

  const suspicious = currentEsteps !== null && currentEsteps < 400
  const dis = !connected || !!busy

  return (
    <section id="esteps-calibrator" className={cn("rounded-xl border", suspicious ? "border-amber-400/50 bg-amber-500/[0.06]" : "border-white/10 bg-white/[0.02]")}>
      <header className="px-3 py-2 border-b border-white/5 flex items-center gap-2">
        <Ruler className="w-4 h-4 text-amber-300" />
        <h3 className="text-xs font-bold text-white">Calibrar E-steps do êmbolo</h3>
        <span className={cn("ml-auto text-[10px] px-2 py-0.5 rounded-full border font-mono", suspicious ? "border-amber-400/50 text-amber-200" : currentEsteps ? "border-emerald-400/40 text-emerald-200" : "border-white/10 text-gray-400")}>
          {currentEsteps ? `${currentEsteps} steps/mm` : "não lidos"}
        </span>
      </header>
      <div className={cn("p-3 space-y-2.5", compact && "text-[11px]")}>
        {suspicious && (
          <p className="text-[11px] text-amber-100 flex gap-1.5 leading-snug"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {currentEsteps} steps/mm é valor de <b>filamento</b>. Um extrusor de seringa precisa de 400–8 000. É por isso que "E+10" anda ~{(10 * (currentEsteps ?? 93) / 3200).toFixed(1)}–{(10 * (currentEsteps ?? 93) / 1000).toFixed(1)} mm.
          </p>
        )}
        {!suspicious && currentEsteps === null && (
          <p className="text-[11px] text-gray-400 leading-snug">Se o êmbolo anda menos do que o pedido (ex.: pede 10 mm, anda 1 mm), os E-steps estão errados. Siga os 3 passos.</p>
        )}

        {/* passo 1 */}
        <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
          <span className="text-[10px] font-bold text-gray-400 uppercase">1</span>
          <button onClick={read} disabled={dis} className="py-1.5 rounded-md border border-white/15 hover:border-emerald-400/40 text-xs text-gray-200 disabled:opacity-40 flex items-center justify-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Ler E-steps atuais (M503)</button>
        </div>
        {/* passo 2 */}
        <div className="grid grid-cols-[auto_1fr] gap-2 items-start">
          <span className="text-[10px] font-bold text-gray-400 uppercase mt-2">2</span>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-300">
              Marque o êmbolo e mova
              <select value={requested} onChange={(e) => setRequested(+e.target.value)} className={cn(inp, "w-20")} disabled={dis}>{[5, 10, 20].map((v) => <option key={v} value={v}>{v} mm</option>)}</select>
            </div>
            <button onClick={move} disabled={dis} className="w-full py-1.5 rounded-md bg-emerald-500/15 border border-emerald-400/40 hover:bg-emerald-500/25 text-xs text-emerald-100 disabled:opacity-40 flex items-center justify-center gap-1.5">
              <Play className="w-3.5 h-3.5" /> Mover E+{requested} mm (~{testSeconds} s, {(testF / 60).toFixed(2)} mm/s)
            </button>
          </div>
        </div>
        {/* passo 3 */}
        <div className="grid grid-cols-[auto_1fr] gap-2 items-start">
          <span className="text-[10px] font-bold text-gray-400 uppercase mt-2">3</span>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-300">
              Andou de verdade
              <input type="number" step={0.1} min={0.05} value={measured} onChange={(e) => setMeasured(e.target.value)} placeholder="ex. 1.0" className={cn(inp, "w-24 font-mono")} disabled={dis} />
              mm
            </div>
            {calib && (
              <div className={cn("rounded-md px-2.5 py-2 text-[11px] leading-snug border", calib.plausible ? "bg-black/30 border-white/10 text-gray-200" : "bg-amber-500/10 border-amber-400/40 text-amber-100")}>
                {calib.note}
                <div className="mt-1 font-mono text-[10.5px] text-gray-400">{calib.gcode.join(" · ")}</div>
              </div>
            )}
            <button onClick={apply} disabled={dis || !calib || Math.abs(calib.ratio - 1) < 0.05} className="w-full py-2 rounded-md bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
              <Save className="w-3.5 h-3.5" /> Gravar {calib ? `M92 E${calib.newEsteps}` : "M92"} + M500
            </button>
            {!moved && !calib && <p className="text-[10px] text-gray-500">Só grava depois de mover e medir.</p>}
          </div>
        </div>

        <details className="text-[11px]">
          <summary className="cursor-pointer text-gray-400 hover:text-gray-200">Sei o fuso/redução — usar valor teórico</summary>
          <div className="mt-1.5 flex gap-1.5">
            <select value={preset} onChange={(e) => setPreset(e.target.value)} className={inp} disabled={dis}>
              <option value="">escolha o extrusor…</option>
              {SYRINGE_EXTRUDER_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label} → {p.esteps}</option>)}
            </select>
            <button onClick={applyPreset} disabled={dis || !preset} className="px-2.5 rounded-md border border-amber-400/40 text-amber-200 hover:bg-amber-500/15 disabled:opacity-40 whitespace-nowrap">Gravar</button>
          </div>
          <p className="mt-1 text-[10px] text-gray-500">steps/mm = 200 × 16 µsteps × redução ÷ passo do fuso (mm/volta). Depois confirme com o teste de 10 mm.</p>
        </details>

        {status && <p className="text-[11px] text-cyan-200/90 flex gap-1.5 leading-snug">{status.startsWith("✓") ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-300" /> : null}{status}</p>}
      </div>
    </section>
  )
}
