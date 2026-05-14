"use client"

/**
 * BIA — Controles Real-Time Profissionais para Bioimpressora
 * ═══════════════════════════════════════════════════════════
 * Painel de controle em TEMPO REAL para uso ao vivo com a máquina
 * já conectada via Web Serial. Cada slider/botão envia G-code Marlin
 * imediatamente ao bico.
 *
 * 4 painéis:
 *  A. TEMPERATURA — cartucho (M104/M109), leito (M140/M190), câmara
 *  B. EXTRUSÃO    — purgar, retrair, fluxo % (M221), velocidade de extrusão
 *  C. RETRAÇÃO    — distância (M207), velocidade, prime extra
 *  D. Z-OFFSET    — calibração viva (M851 + M290 babystep) + visualização
 *
 * Janaina Dernowsek / Quantis Biotechnology — 2026
 */

import { useState, useCallback } from "react"
import {
  Thermometer, Flame, Snowflake, Wind, Droplets, ArrowDown, ArrowUp,
  RotateCcw, Gauge, Target, Plus, Minus, Zap, ShieldAlert,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

interface RealtimeControlsProps {
  connected: boolean
  sendCommand: (cmd: string) => Promise<void>
  // Setpoints sugeridos vindo da Etapa 3 (slicer)
  suggestedCartridgeC?: number
  suggestedBedC?: number
  suggestedChamberC?: number
  suggestedRetractionMm?: number
}

export function RealtimeControls({
  connected,
  sendCommand,
  suggestedCartridgeC = 22,
  suggestedBedC = 6,
  suggestedChamberC = 20,
  suggestedRetractionMm = 0.5,
}: RealtimeControlsProps) {

  // ── Estados locais dos setpoints ──
  const [cartridgeC, setCartridgeC] = useState(suggestedCartridgeC)
  const [bedC, setBedC] = useState(suggestedBedC)
  const [chamberC, setChamberC] = useState(suggestedChamberC)

  // Extrusão
  const [flowPercent, setFlowPercent] = useState(100)
  const [purgeAmount, setPurgeAmount] = useState(1.0) // mm
  const [purgeSpeed, setPurgeSpeed] = useState(60)     // mm/min

  // Retração
  const [retractMm, setRetractMm] = useState(suggestedRetractionMm)
  const [retractSpeed, setRetractSpeed] = useState(2400) // mm/min (40 mm/s)

  // Z-offset
  const [zOffsetMm, setZOffsetMm] = useState(0)
  const [babystepMm, setBabystepMm] = useState(0.025) // micro-passo padrão

  // ── Helpers ──
  const send = useCallback((cmd: string) => {
    if (!connected) return
    sendCommand(cmd)
  }, [connected, sendCommand])

  const disabledClass = connected ? "" : "opacity-40 pointer-events-none"

  // ───── TEMP HANDLERS ─────
  const setCartridgeTemp   = () => send(`M104 S${cartridgeC} ; setpoint cartucho`)
  const setBedTemp         = () => send(`M140 S${bedC} ; setpoint leito`)
  const setChamberTemp     = () => send(`M141 S${chamberC} ; setpoint câmara`)
  const coolDownAll        = () => {
    send(`M104 S0 ; cooldown cartucho`)
    send(`M140 S0 ; cooldown leito`)
    send(`M141 S0 ; cooldown câmara`)
  }
  const preheatAll         = () => {
    send(`M140 S${bedC} ; preheat leito (não bloqueia)`)
    send(`M104 S${cartridgeC} ; preheat cartucho (não bloqueia)`)
    send(`M141 S${chamberC} ; preheat câmara`)
  }
  const readTemps          = () => send(`M105 ; ler temperaturas atuais`)

  // ───── EXTRUSION HANDLERS ─────
  const applyFlow          = () => send(`M221 S${flowPercent} ; flow ${flowPercent}%`)
  const purgeNow           = () => {
    send(`G91 ; modo relativo`)
    send(`G1 E${purgeAmount} F${purgeSpeed} ; purgar ${purgeAmount}mm a ${purgeSpeed}mm/min`)
    send(`G90 ; modo absoluto`)
  }
  const retractNow         = () => {
    send(`G91`)
    send(`G1 E-${retractMm} F${retractSpeed} ; retrair`)
    send(`G90`)
  }

  // ───── RETRACTION (firmware-level M207) ─────
  const applyRetractionFw  = () => {
    send(`M207 S${retractMm} F${retractSpeed} ; configurar retração firmware`)
    send(`M208 S0.5 F${Math.round(retractSpeed * 0.6)} ; recover (prime extra)`)
  }
  const triggerG10         = () => send(`G10 ; retract (usa M207)`)
  const triggerG11         = () => send(`G11 ; unretract / recover`)

  // ───── Z-OFFSET HANDLERS ─────
  const applyZOffset       = () => send(`M851 Z${zOffsetMm.toFixed(3)} ; novo Z-offset`)
  const saveToEEPROM       = () => send(`M500 ; salvar configurações em EEPROM`)
  const loadFromEEPROM     = () => send(`M501 ; carregar EEPROM`)
  const babystepUp         = () => send(`M290 Z+${babystepMm} ; babystep +${babystepMm}mm`)
  const babystepDown       = () => send(`M290 Z-${babystepMm} ; babystep -${babystepMm}mm`)
  const zeroAtCurrentZ     = () => {
    send(`G92 Z0 ; zera Z na altura atual`)
    setZOffsetMm(0)
  }
  const probeAutoLevel     = () => {
    send(`G28 ; home`)
    send(`G29 ; auto-bed-leveling (probe)`)
  }

  return (
    <div className="p-3 space-y-3">
      {/* Aviso quando desconectado */}
      {!connected && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 flex items-center gap-2 text-[11px] text-amber-200">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong>Controles desabilitados</strong> — Conecte a bioimpressora via USB acima para ativar todos os botões.
          </span>
        </div>
      )}

      {/* Grid de 4 painéis */}
      <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-3", disabledClass)}>

        {/* ═══════════════════════════════ A. TEMPERATURA ═══════════════════════════════ */}
        <div className="rounded-xl border border-rose-500/25 bg-gradient-to-br from-rose-950/30 to-orange-950/30 p-3">
          <div className="flex items-center gap-2 mb-3">
            <Thermometer className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-bold text-rose-200 uppercase tracking-wider">
              Triplo Controle Térmico
            </span>
          </div>

          {/* Cartucho */}
          <TempControl
            label="Cartucho (bioink)"
            icon={<Flame className="w-3.5 h-3.5 text-rose-400" />}
            value={cartridgeC}
            onChange={setCartridgeC}
            min={0} max={60} step={0.5}
            presets={[
              { label: "4°C", value: 4, note: "Colágeno" },
              { label: "22°C", value: 22, note: "GelMA" },
              { label: "37°C", value: 37, note: "Pluronic" },
            ]}
            onApply={setCartridgeTemp}
            gcodeM="M104"
            color="rose"
          />

          <div className="my-2 border-t border-rose-500/15" />

          {/* Leito */}
          <TempControl
            label="Leito (mesa)"
            icon={<Snowflake className="w-3.5 h-3.5 text-cyan-400" />}
            value={bedC}
            onChange={setBedC}
            min={0} max={80} step={1}
            presets={[
              { label: "4°C", value: 4, note: "Crio-bio" },
              { label: "20°C", value: 20, note: "Ambiente" },
              { label: "37°C", value: 37, note: "Fisiológico" },
            ]}
            onApply={setBedTemp}
            gcodeM="M140"
            color="cyan"
          />

          <div className="my-2 border-t border-rose-500/15" />

          {/* Câmara */}
          <TempControl
            label="Câmara (umidade/CO₂)"
            icon={<Wind className="w-3.5 h-3.5 text-emerald-400" />}
            value={chamberC}
            onChange={setChamberC}
            min={15} max={45} step={1}
            presets={[
              { label: "20°C", value: 20, note: "Lab" },
              { label: "37°C", value: 37, note: "Incubadora" },
            ]}
            onApply={setChamberTemp}
            gcodeM="M141"
            color="emerald"
          />

          {/* Ações globais */}
          <div className="mt-3 pt-3 border-t border-rose-500/20 flex flex-wrap gap-1.5">
            <button
              onClick={preheatAll}
              disabled={!connected}
              className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 transition-colors"
            >
              🔥 Pré-aquecer tudo
            </button>
            <button
              onClick={coolDownAll}
              disabled={!connected}
              className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-200 transition-colors"
            >
              ❄️ Resfriar tudo (M0)
            </button>
            <button
              onClick={readTemps}
              disabled={!connected}
              className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-white/5 hover:bg-white/10 border border-white/15 text-gray-200 transition-colors"
            >
              📊 Ler agora (M105)
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════ B. EXTRUSÃO ═══════════════════════════════ */}
        <div className="rounded-xl border border-cyan-500/25 bg-gradient-to-br from-cyan-950/30 to-blue-950/30 p-3">
          <div className="flex items-center gap-2 mb-3">
            <Droplets className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-cyan-200 uppercase tracking-wider">
              Extrusão Real-Time
            </span>
          </div>

          {/* Flow rate */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-cyan-100 flex items-center gap-1.5">
                <Gauge className="w-3 h-3 text-cyan-400" />
                Fluxo ({flowPercent}%)
              </label>
              <button
                onClick={applyFlow}
                disabled={!connected}
                className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-100"
              >
                Aplicar M221
              </button>
            </div>
            <input
              type="range"
              min={50} max={150} step={5}
              value={flowPercent}
              onChange={(e) => setFlowPercent(parseInt(e.target.value))}
              className="w-full accent-cyan-400"
            />
            <div className="flex justify-between text-[9px] text-gray-500 mt-0.5">
              <span>50%</span><span>100% (calibrado)</span><span>150%</span>
            </div>
          </div>

          {/* Purgar */}
          <div className="mb-3 p-2.5 rounded-lg bg-cyan-500/[0.05] border border-cyan-500/20">
            <p className="text-[11px] font-semibold text-cyan-200 mb-2 flex items-center gap-1.5">
              <Plus className="w-3 h-3" /> Purgar (extrude)
            </p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <NumField label="Quantidade (mm)" value={purgeAmount} step={0.1} min={0.1} max={10} onChange={setPurgeAmount} />
              <NumField label="Velocidade (mm/min)" value={purgeSpeed} step={10} min={10} max={300} onChange={setPurgeSpeed} />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={purgeNow}
                disabled={!connected}
                className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-cyan-500 hover:bg-cyan-400 text-cyan-950 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Purgar {purgeAmount}mm
              </button>
              {[1, 2, 5].map(v => (
                <button
                  key={v}
                  onClick={() => { setPurgeAmount(v); setTimeout(purgeNow, 0) }}
                  disabled={!connected}
                  className="px-2 py-1 rounded-md text-[10px] font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-200"
                >
                  +{v}mm
                </button>
              ))}
            </div>
          </div>

          {/* Retrair manual */}
          <div className="p-2.5 rounded-lg bg-blue-500/[0.05] border border-blue-500/20">
            <p className="text-[11px] font-semibold text-blue-200 mb-2 flex items-center gap-1.5">
              <Minus className="w-3 h-3" /> Retrair manual
            </p>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={retractNow}
                disabled={!connected}
                className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-500 hover:bg-blue-400 text-blue-950 transition-colors flex items-center gap-1"
              >
                <Minus className="w-3 h-3" /> Retrair {retractMm}mm
              </button>
            </div>
            <p className="text-[9px] text-gray-500 mt-1.5 italic">
              Usa retração configurada abaixo · ideal para evitar gotejamento entre poços
            </p>
          </div>
        </div>

        {/* ═══════════════════════════════ C. RETRAÇÃO ═══════════════════════════════ */}
        <div className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-950/30 to-yellow-950/30 p-3">
          <div className="flex items-center gap-2 mb-3">
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">
              Retração (Firmware M207)
            </span>
          </div>

          <p className="text-[10px] text-amber-100/70 mb-3 leading-relaxed">
            Configure retração nativa do firmware. Pode ser chamada por G10/G11 ou automaticamente
            pelo G-code. Para bioink celular use 0.3–0.8 mm a 30–60 mm/s. Sem células, 1–2 mm.
          </p>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <NumField label="Distância (mm)" value={retractMm} step={0.1} min={0} max={5} onChange={setRetractMm} />
            <NumField label="Velocidade (mm/min)" value={retractSpeed} step={100} min={300} max={6000} onChange={setRetractSpeed} />
          </div>

          {/* Presets */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            <button
              onClick={() => { setRetractMm(0.3); setRetractSpeed(1800) }}
              disabled={!connected}
              className="p-1.5 rounded-md text-[10px] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-200"
            >
              <div className="font-bold">Bio celular</div>
              <div className="text-[9px] opacity-70">0.3mm · 30mm/s</div>
            </button>
            <button
              onClick={() => { setRetractMm(0.8); setRetractSpeed(2400) }}
              disabled={!connected}
              className="p-1.5 rounded-md text-[10px] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-200"
            >
              <div className="font-bold">Hidrogel</div>
              <div className="text-[9px] opacity-70">0.8mm · 40mm/s</div>
            </button>
            <button
              onClick={() => { setRetractMm(2.0); setRetractSpeed(3000) }}
              disabled={!connected}
              className="p-1.5 rounded-md text-[10px] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-200"
            >
              <div className="font-bold">Acelular</div>
              <div className="text-[9px] opacity-70">2mm · 50mm/s</div>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={applyRetractionFw}
              disabled={!connected}
              className="px-3 py-1.5 rounded-md text-[10px] font-bold bg-amber-500 hover:bg-amber-400 text-amber-950 transition-colors"
            >
              💾 Aplicar (M207 + M208)
            </button>
            <button
              onClick={triggerG10}
              disabled={!connected}
              className="px-2.5 py-1.5 rounded-md text-[10px] font-semibold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200"
            >
              G10 (Retract)
            </button>
            <button
              onClick={triggerG11}
              disabled={!connected}
              className="px-2.5 py-1.5 rounded-md text-[10px] font-semibold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200"
            >
              G11 (Unretract)
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════ D. Z-OFFSET ═══════════════════════════════ */}
        <div className="rounded-xl border-2 border-violet-500/40 bg-gradient-to-br from-violet-950/30 to-purple-950/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-bold text-violet-200 uppercase tracking-wider">
                Z-Offset Live (Calibração CRÍTICA)
              </span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-rose-200 font-bold">
              ESSENCIAL
            </span>
          </div>

          <p className="text-[10px] text-violet-100/75 mb-3 leading-relaxed">
            Bioink precisa de Z ~0.05–0.10mm <strong>MAIS ALTO</strong> que filamento.
            Calibre ao vivo com a bioink no cartucho — sem ajuste, primeira camada falha.
          </p>

          {/* Z-Offset atual */}
          <div className="grid grid-cols-[1fr_auto] gap-2 mb-3">
            <NumField label="Z-Offset (mm)" value={zOffsetMm} step={0.01} min={-2} max={2} onChange={setZOffsetMm} />
            <div className="flex flex-col gap-1 justify-end pb-0.5">
              <button
                onClick={applyZOffset}
                disabled={!connected}
                className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-violet-500 hover:bg-violet-400 text-violet-950 transition-colors whitespace-nowrap"
              >
                Aplicar M851
              </button>
            </div>
          </div>

          {/* Babystep */}
          <div className="p-2.5 rounded-lg bg-violet-500/[0.05] border border-violet-500/20 mb-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-semibold text-violet-200">
                Babystep durante print (M290)
              </label>
              <select
                value={babystepMm}
                onChange={(e) => setBabystepMm(parseFloat(e.target.value))}
                className="text-[10px] bg-black/40 border border-violet-500/30 text-violet-100 rounded px-1.5 py-0.5 outline-none"
              >
                <option value={0.005}>±0.005mm (ultra-fino)</option>
                <option value={0.01}>±0.01mm</option>
                <option value={0.025}>±0.025mm (padrão bio)</option>
                <option value={0.05}>±0.05mm (rápido)</option>
                <option value={0.1}>±0.1mm</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={babystepUp}
                disabled={!connected}
                className="px-2 py-2 rounded-md text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowUp className="w-3.5 h-3.5" /> +{babystepMm}mm (afastar)
              </button>
              <button
                onClick={babystepDown}
                disabled={!connected}
                className="px-2 py-2 rounded-md text-xs font-bold bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowDown className="w-3.5 h-3.5" /> -{babystepMm}mm (aproximar)
              </button>
            </div>
            <p className="text-[9px] text-violet-200/60 italic mt-2">
              Use durante o print se a primeira camada estiver muito fina/grossa
            </p>
          </div>

          {/* Ações */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={probeAutoLevel}
              disabled={!connected}
              className="px-2.5 py-1.5 rounded-md text-[10px] font-bold bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-violet-100 transition-colors flex items-center gap-1"
            >
              <Zap className="w-3 h-3" /> Auto-level (G28+G29)
            </button>
            <button
              onClick={zeroAtCurrentZ}
              disabled={!connected}
              className="px-2.5 py-1.5 rounded-md text-[10px] font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-200 transition-colors"
            >
              G92 Z0 aqui
            </button>
            <button
              onClick={saveToEEPROM}
              disabled={!connected}
              className="px-2.5 py-1.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-200 transition-colors"
              title="Salva todos os settings de retração + Z-offset na EEPROM da impressora"
            >
              💾 M500 EEPROM
            </button>
            <button
              onClick={loadFromEEPROM}
              disabled={!connected}
              className="px-2.5 py-1.5 rounded-md text-[10px] font-semibold bg-white/5 hover:bg-white/10 border border-white/15 text-gray-200 transition-colors"
            >
              📂 M501 Load
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── TempControl: linha por temperatura com slider + presets + botão aplicar ───
function TempControl({
  label, icon, value, onChange, min, max, step, presets, onApply, gcodeM, color,
}: {
  label: string
  icon: React.ReactNode
  value: number
  onChange: (n: number) => void
  min: number; max: number; step: number
  presets: { label: string; value: number; note: string }[]
  onApply: () => void
  gcodeM: string
  color: "rose" | "cyan" | "emerald"
}) {
  const accentClass = {
    rose:    "accent-rose-400",
    cyan:    "accent-cyan-400",
    emerald: "accent-emerald-400",
  }[color]
  const btnClass = {
    rose:    "bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/40 text-rose-100",
    cyan:    "bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/40 text-cyan-100",
    emerald: "bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40 text-emerald-100",
  }[color]

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-semibold text-white flex items-center gap-1.5">
          {icon}{label}
        </label>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-white tabular-nums">{value.toFixed(1)}°C</span>
          <button
            onClick={onApply}
            className={cn("text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap", btnClass)}
          >
            {gcodeM} S{value.toFixed(0)}
          </button>
        </div>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={cn("w-full", accentClass)}
      />
      <div className="flex flex-wrap gap-1 mt-1">
        {presets.map(p => (
          <button
            key={p.label}
            onClick={() => onChange(p.value)}
            className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-colors"
            title={p.note}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── NumField: input numérico compacto com label ───
function NumField({
  label, value, step, min, max, onChange,
}: {
  label: string
  value: number
  step: number
  min: number
  max: number
  onChange: (n: number) => void
}) {
  return (
    <div>
      <label className="text-[10px] text-gray-400 block mb-0.5">{label}</label>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-2 py-1 rounded-md bg-black/30 border border-white/10 text-xs text-white tabular-nums focus:border-violet-400 outline-none"
      />
    </div>
  )
}
