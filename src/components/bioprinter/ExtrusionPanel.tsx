"use client"

/**
 * BIA — Painel de Extrusão Fluida + Sensores
 *
 * Controla os 3 mecanismos de extrusão (pneumático/mecânico/screw) +
 * monitora temperatura cartucho/cama/câmara + umidade.
 *
 * Mostra zonas seguras / atenção / crítica baseadas em EXTRUSION_CONFIGS
 * e TEMPERATURE_PROFILES do knowledge base.
 */

import { useState } from "react"
import {
  Thermometer, Droplets, Wind, AlertTriangle, CheckCircle2,
  Gauge, Zap, Minus, Plus, Activity, Flame, Snowflake,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import {
  EXTRUSION_CONFIGS, TEMPERATURE_PROFILES,
  type ExtrusionMechanism,
} from "@/lib/bioprinter/biomedical-params"

export interface ExtrusionState {
  mechanism: ExtrusionMechanism
  setpoint: number          // valor alvo (kPa/µL·s/rpm)
  actual: number            // valor real (sensor simulado)
  cartridgeTempC: number
  bedTempC: number
  chamberTempC: number
  humidityPercent: number
  bioink: string            // do TEMPERATURE_PROFILES
}

export interface ExtrusionPanelProps {
  state: ExtrusionState
  onChange: (next: ExtrusionState) => void
  onGcode: (gcode: string) => void
}

export function ExtrusionPanel({ state, onChange, onGcode }: ExtrusionPanelProps) {
  const config = EXTRUSION_CONFIGS[state.mechanism]
  const tempProfile = TEMPERATURE_PROFILES.find((t) => t.bioinkType === state.bioink) ?? TEMPERATURE_PROFILES[0]

  const adjustSetpoint = (delta: number) => {
    const next = Math.max(config.min, Math.min(config.max, state.setpoint + delta))
    onChange({ ...state, setpoint: +next.toFixed(2) })
    // Gcode customizado por mecanismo
    if (state.mechanism === "pneumatic") {
      onGcode(`M755 P${next.toFixed(1)} ; pressão pneumática ${next.toFixed(1)} kPa`)
    } else if (state.mechanism === "mechanical") {
      onGcode(`M203 E${next.toFixed(3)} ; vazão pistão ${next.toFixed(3)} µL/s`)
    } else {
      onGcode(`M3 S${next.toFixed(1)} ; rotação rosca ${next.toFixed(1)} rpm`)
    }
  }

  // Determina zona de segurança para o setpoint
  const zone: "safe" | "warn" | "critical" =
    state.setpoint >= config.criticalAbove ? "critical" :
    state.setpoint >= config.warnAbove ? "warn" : "safe"

  const setTemp = (target: "cartridge" | "bed" | "chamber", value: number) => {
    if (target === "cartridge") {
      onChange({ ...state, cartridgeTempC: value })
      onGcode(`M104 T0 S${value} ; cartucho ${value}°C`)
    } else if (target === "bed") {
      onChange({ ...state, bedTempC: value })
      onGcode(`M140 S${value} ; cama ${value}°C`)
    } else {
      onChange({ ...state, chamberTempC: value })
      onGcode(`M141 S${value} ; câmara ${value}°C`)
    }
  }

  return (
    <div className="space-y-5">
      {/* Seletor de mecanismo */}
      <div>
        <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 block">
          Mecanismo de extrusão
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {(Object.keys(EXTRUSION_CONFIGS) as ExtrusionMechanism[]).map((m) => {
            const cfg = EXTRUSION_CONFIGS[m]
            const active = state.mechanism === m
            return (
              <button
                key={m}
                onClick={() => onChange({ ...state, mechanism: m, setpoint: cfg.default })}
                title={cfg.description}
                className={cn(
                  "px-2 py-2 rounded-lg border text-[11px] transition-all",
                  active
                    ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-100"
                    : "bg-white/3 border-white/5 text-gray-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="font-semibold">{cfg.label.split(" ")[0]}</div>
                <div className="text-[9px] opacity-70 mt-0.5">{cfg.unit}</div>
              </button>
            )
          })}
        </div>
        <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
          {config.description}
        </p>
      </div>

      {/* Setpoint principal */}
      <div className="rounded-xl border border-white/8 bg-black/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-cyan-300" />
            <span className="text-xs font-semibold text-white">{config.label}</span>
          </div>
          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded-full border font-semibold",
            zone === "safe"     && "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
            zone === "warn"     && "bg-amber-500/10 border-amber-500/30 text-amber-300",
            zone === "critical" && "bg-rose-500/15 border-rose-500/40 text-rose-300",
          )}>
            {zone === "safe" ? "Zona segura" : zone === "warn" ? "Atenção" : "CRÍTICO"}
          </span>
        </div>

        {/* Valor numérico grande */}
        <div className="flex items-baseline gap-2 justify-center py-2">
          <div className={cn(
            "text-4xl font-mono font-bold tabular-nums",
            zone === "safe"     ? "text-cyan-200" :
            zone === "warn"     ? "text-amber-200" :
                                  "text-rose-200"
          )}>
            {state.setpoint.toFixed(state.mechanism === "mechanical" ? 3 : 1)}
          </div>
          <div className="text-xs text-gray-400">{config.unit}</div>
        </div>

        {/* Barra de range visual */}
        <div className="relative h-2 rounded-full bg-white/5 overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-emerald-500/30" style={{
            width: `${(config.warnAbove / config.max) * 100}%`,
          }} />
          <div className="absolute inset-y-0 bg-amber-500/30" style={{
            left: `${(config.warnAbove / config.max) * 100}%`,
            width: `${((config.criticalAbove - config.warnAbove) / config.max) * 100}%`,
          }} />
          <div className="absolute inset-y-0 bg-rose-500/30" style={{
            left: `${(config.criticalAbove / config.max) * 100}%`,
            right: 0,
          }} />
          {/* Indicador do setpoint atual */}
          <div className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-white shadow-lg rounded-full" style={{
            left: `${Math.min(100, (state.setpoint / config.max) * 100)}%`,
            transform: "translate(-50%, -50%)",
          }} />
        </div>
        <div className="flex justify-between text-[9px] text-gray-500">
          <span>{config.min}</span>
          <span className="text-emerald-400">seguro &lt; {config.warnAbove}</span>
          <span className="text-amber-400">atenção &lt; {config.criticalAbove}</span>
          <span className="text-rose-400">crítico</span>
          <span>{config.max}</span>
        </div>

        {/* Botões +/- */}
        <div className="grid grid-cols-4 gap-1.5">
          <button onClick={() => adjustSetpoint(-config.coarseStep)}
            className="px-2 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 text-[11px] font-semibold transition-all flex items-center justify-center gap-1">
            <Minus className="w-3 h-3" /> {config.coarseStep}
          </button>
          <button onClick={() => adjustSetpoint(-config.fineStep)}
            className="px-2 py-2 rounded-lg border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/15 text-rose-200/80 text-[11px] font-mono transition-all flex items-center justify-center gap-1">
            <Minus className="w-3 h-3" /> {config.fineStep}
          </button>
          <button onClick={() => adjustSetpoint(+config.fineStep)}
            className="px-2 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-200/80 text-[11px] font-mono transition-all flex items-center justify-center gap-1">
            <Plus className="w-3 h-3" /> {config.fineStep}
          </button>
          <button onClick={() => adjustSetpoint(+config.coarseStep)}
            className="px-2 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 text-[11px] font-semibold transition-all flex items-center justify-center gap-1">
            <Plus className="w-3 h-3" /> {config.coarseStep}
          </button>
        </div>

        {/* Aviso quando em zona crítica */}
        {zone !== "safe" && (
          <div className={cn(
            "rounded-lg p-2.5 text-[10px] leading-relaxed flex gap-2",
            zone === "warn"     && "bg-amber-500/10 border border-amber-500/20 text-amber-200",
            zone === "critical" && "bg-rose-500/10 border border-rose-500/30 text-rose-200",
          )}>
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              {zone === "warn"
                ? `Próximo do limite seguro para células. Considere reduzir.`
                : `Risco de morte celular >50%. Reduza ${state.mechanism === "screw" ? "RPM" : state.mechanism === "pneumatic" ? "pressão" : "vazão"} imediatamente.`}
            </span>
          </div>
        )}
      </div>

      {/* Bioink + temperaturas */}
      <div>
        <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 block">
          Bioink em uso (define janelas térmicas)
        </label>
        <select
          value={state.bioink}
          onChange={(e) => onChange({ ...state, bioink: e.target.value })}
          className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500/40"
        >
          {TEMPERATURE_PROFILES.map((p) => (
            <option key={p.bioinkType} value={p.bioinkType}>{p.bioinkType}</option>
          ))}
        </select>
        <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
          <strong className="text-cyan-300">Por quê?</strong> {tempProfile.rationale}
        </p>
        <p className="text-[9px] text-gray-600 mt-1">ref: {tempProfile.ref}</p>
      </div>

      {/* Triplo controle de temperatura */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <TempControl
          icon={Snowflake}
          label="Cartucho"
          value={state.cartridgeTempC}
          ideal={tempProfile.cartridgeTempC.ideal}
          min={tempProfile.cartridgeTempC.min}
          max={tempProfile.cartridgeTempC.max}
          onAdjust={(d) => setTemp("cartridge", +(state.cartridgeTempC + d).toFixed(1))}
          color="sky"
        />
        <TempControl
          icon={Flame}
          label="Cama"
          value={state.bedTempC}
          ideal={tempProfile.bedTempC.ideal}
          min={tempProfile.bedTempC.min}
          max={tempProfile.bedTempC.max}
          onAdjust={(d) => setTemp("bed", +(state.bedTempC + d).toFixed(1))}
          color="rose"
        />
        <TempControl
          icon={Thermometer}
          label="Câmara"
          value={state.chamberTempC}
          ideal={tempProfile.chamberTempC.ideal}
          min={tempProfile.chamberTempC.min}
          max={tempProfile.chamberTempC.max}
          onAdjust={(d) => setTemp("chamber", +(state.chamberTempC + d).toFixed(1))}
          color="violet"
        />
      </div>

      {/* Umidade */}
      <div className="rounded-xl border border-white/8 bg-black/30 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-cyan-300" />
            <span className="text-xs font-semibold text-white">Umidade da câmara</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={cn(
              "text-lg font-mono font-bold tabular-nums",
              state.humidityPercent >= tempProfile.humidityPercent.ideal ? "text-emerald-300" :
              state.humidityPercent >= tempProfile.humidityPercent.min ? "text-amber-300" :
                                                                          "text-rose-300"
            )}>
              {state.humidityPercent}%
            </span>
            <span className="text-[10px] text-gray-500">UR</span>
          </div>
        </div>
        <input
          type="range"
          min={30}
          max={99}
          value={state.humidityPercent}
          onChange={(e) => onChange({ ...state, humidityPercent: parseInt(e.target.value) })}
          className="w-full accent-cyan-500"
        />
        <div className="flex justify-between text-[9px] text-gray-500 mt-1">
          <span>30% (seco — evapora)</span>
          <span className="text-emerald-400">ideal: {tempProfile.humidityPercent.ideal}%</span>
          <span>99% (saturado)</span>
        </div>
        {state.humidityPercent < tempProfile.humidityPercent.min && (
          <div className="mt-2 text-[10px] text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 flex gap-2">
            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
            <span>Umidade muito baixa para {state.bioink}. O bioink vai formar pele e entupir o bico.</span>
          </div>
        )}
      </div>

      {/* Sensor "real" simulado: setpoint vs. actual */}
      <div className="rounded-xl border border-white/8 bg-black/30 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-emerald-300" />
          <span className="text-xs font-semibold text-white">Leitura do sensor (vs. setpoint)</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-[10px] text-gray-500 uppercase">Alvo</div>
            <div className="text-cyan-300 font-mono">{state.setpoint.toFixed(1)} {config.unit}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 uppercase">Lido</div>
            <div className="text-emerald-300 font-mono">{state.actual.toFixed(1)} {config.unit}</div>
          </div>
        </div>
        {Math.abs(state.setpoint - state.actual) / Math.max(state.setpoint, 1) > 0.1 && state.setpoint > 0 && (
          <div className="mt-2 text-[10px] text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 flex gap-2">
            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
            <span>Gap &gt;10% entre alvo e lido: possível entupimento, ar no cartucho ou vazamento.</span>
          </div>
        )}
        <p className="text-[9px] text-gray-600 mt-2">
          (modo simulação · com impressora conectada, este valor virá do sensor real)
        </p>
      </div>

      {/* Resumo de segurança */}
      <div className="rounded-xl bg-gradient-to-br from-emerald-500/[0.03] to-cyan-500/[0.03] border border-emerald-500/15 p-3">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span className="text-xs font-semibold text-emerald-100">Resumo · {state.bioink}</span>
        </div>
        <ul className="space-y-1 text-[11px] text-gray-300">
          <li>• Mecanismo: <strong className="text-white">{config.label}</strong> @ {state.setpoint} {config.unit}</li>
          <li>• Temperaturas: cartucho {state.cartridgeTempC}°C · cama {state.bedTempC}°C · câmara {state.chamberTempC}°C</li>
          <li>• Umidade: {state.humidityPercent}% (ideal {tempProfile.humidityPercent.ideal}%)</li>
          <li>• Impressoras compatíveis: <span className="text-gray-400">{config.printerExamples.slice(0, 2).join(", ")}</span></li>
        </ul>
      </div>
    </div>
  )
}

// ─── Sub-componente de controle de temperatura ──────────────────────────

function TempControl({
  icon: Icon, label, value, ideal, min, max, onAdjust, color,
}: {
  icon: React.ElementType
  label: string
  value: number
  ideal: number
  min: number
  max: number
  onAdjust: (delta: number) => void
  color: "sky" | "rose" | "violet"
}) {
  const inRange = value >= min && value <= max
  const colorCls =
    color === "sky"    ? { border: "border-sky-500/25", bg: "bg-sky-500/5", text: "text-sky-300", btn: "border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-200" } :
    color === "rose"   ? { border: "border-rose-500/25", bg: "bg-rose-500/5", text: "text-rose-300", btn: "border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-200" } :
                         { border: "border-violet-500/25", bg: "bg-violet-500/5", text: "text-violet-300", btn: "border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-200" }

  return (
    <div className={cn("rounded-lg border p-2.5", colorCls.border, colorCls.bg)}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={cn("w-3.5 h-3.5", colorCls.text)} />
        <span className="text-[10px] uppercase tracking-wider text-gray-400">{label}</span>
      </div>
      <div className={cn("text-xl font-mono font-bold tabular-nums", inRange ? colorCls.text : "text-amber-300")}>
        {value.toFixed(1)}<span className="text-[10px] opacity-60">°C</span>
      </div>
      <div className="text-[9px] text-gray-500 mb-2">
        ideal {ideal}°C · faixa {min}-{max}
      </div>
      <div className="grid grid-cols-4 gap-1">
        <button onClick={() => onAdjust(-5)} className={cn("text-[10px] py-1 rounded border transition-all", colorCls.btn)}>-5</button>
        <button onClick={() => onAdjust(-1)} className={cn("text-[10px] py-1 rounded border transition-all", colorCls.btn)}>-1</button>
        <button onClick={() => onAdjust(+1)} className={cn("text-[10px] py-1 rounded border transition-all", colorCls.btn)}>+1</button>
        <button onClick={() => onAdjust(+5)} className={cn("text-[10px] py-1 rounded border transition-all", colorCls.btn)}>+5</button>
      </div>
    </div>
  )
}
