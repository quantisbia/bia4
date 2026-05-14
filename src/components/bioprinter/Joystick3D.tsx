"use client"

/**
 * BIA — Joystick 3D Biomédico
 *
 * Controle X/Y/Z + extrusora estilo Pronterface, mas adaptado para bioimpressão.
 * Genera G-code Marlin em tempo real e envia via callback.
 *
 * Diferenças vs. Pronterface comum:
 *  - Z-probe SUAVE (0.5N em vez de 5N): proteção de células
 *  - Pre-purge (1mm) antes de mover: remove ar do cartucho
 *  - Retração mínima (1.5mm): evita rasgar filamento de hidrogel
 *  - Pausa estéril (mantém pressão): não despressuriza = não contamina
 *  - Posição "repouso" customizável (canto seguro fora do construct)
 */

import { useState } from "react"
import {
  Home, MoveUp, MoveDown, MoveLeft, MoveRight,
  RotateCcw, ChevronUp, ChevronDown, Target, ShieldAlert,
  Crosshair, Snowflake, Wind, AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

export type StepSize = 0.05 | 0.1 | 0.5 | 1 | 5 | 10

export interface JoystickPosition {
  x: number
  y: number
  z: number
  e: number  // extrusora (mm avançado)
}

export interface Joystick3DProps {
  position: JoystickPosition
  onMove: (axis: "X" | "Y" | "Z" | "E", deltaMm: number) => void
  onHome: (axis: "all" | "X" | "Y" | "Z") => void
  onZero: () => void  // G92 X0 Y0 Z0 E0
  onProbeZ: () => void // Z-probe suave
  onPurge: () => void // pre-purge de ar
  onSterilePause: () => void // pausa mantendo pressão
  onGoToRest: () => void // volta para posição de repouso
  disabled?: boolean
  // Quando conectado a impressora real (futuro), pode ser true
  connected?: boolean
}

export function Joystick3D({
  position, onMove, onHome, onZero, onProbeZ, onPurge,
  onSterilePause, onGoToRest, disabled = false, connected = false,
}: Joystick3DProps) {
  const [step, setStep] = useState<StepSize>(1)
  const [extrudeStep, setExtrudeStep] = useState<number>(0.1) // mm de extrusão por click

  const steps: StepSize[] = [0.05, 0.1, 0.5, 1, 5, 10]
  const extrudeSteps: number[] = [0.01, 0.05, 0.1, 0.5, 1.0]

  return (
    <div className="space-y-4">
      {/* Status / Connection */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-black/40 border border-white/8">
        <div className="flex items-center gap-2 text-xs">
          <span className={cn(
            "w-2 h-2 rounded-full",
            connected ? "bg-emerald-400 animate-pulse" : "bg-gray-500"
          )} />
          <span className={connected ? "text-emerald-300" : "text-gray-400"}>
            {connected ? "Impressora conectada (live)" : "Modo simulação (offline)"}
          </span>
        </div>
        <div className="text-[10px] text-gray-500">
          {connected ? "G-code enviado em tempo real" : "G-code construído offline"}
        </div>
      </div>

      {/* Posição atual */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        {(["X", "Y", "Z", "E"] as const).map((axis) => {
          const value = position[axis.toLowerCase() as "x" | "y" | "z" | "e"]
          const color =
            axis === "X" ? "text-rose-300 border-rose-500/30 bg-rose-500/10" :
            axis === "Y" ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" :
            axis === "Z" ? "text-sky-300 border-sky-500/30 bg-sky-500/10" :
                           "text-amber-300 border-amber-500/30 bg-amber-500/10"
          return (
            <div key={axis} className={cn("rounded-lg border px-2 py-1.5", color)}>
              <div className="text-[10px] uppercase tracking-wider opacity-70">{axis}</div>
              <div className="font-mono text-sm font-semibold tabular-nums">
                {value.toFixed(2)} <span className="text-[9px] opacity-60">mm</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Step selector */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 flex items-center justify-between">
          <span>Passo X/Y/Z</span>
          <span className="text-gray-400">{step} mm</span>
        </div>
        <div className="flex gap-1">
          {steps.map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              disabled={disabled}
              className={cn(
                "flex-1 px-2 py-1.5 rounded text-[11px] font-mono transition-all border",
                step === s
                  ? "bg-violet-500/20 border-violet-500/40 text-violet-100"
                  : "bg-white/3 border-white/5 text-gray-400 hover:bg-white/5 hover:text-white",
                disabled && "opacity-40 cursor-not-allowed"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Joystick X/Y */}
      <div className="grid grid-cols-[1fr_auto_1fr] grid-rows-3 gap-1 max-w-[260px] mx-auto">
        <div />
        <JoyBtn icon={MoveUp} label="+Y" color="emerald" onClick={() => onMove("Y", +step)} disabled={disabled} />
        <div />
        <JoyBtn icon={MoveLeft} label="-X" color="rose" onClick={() => onMove("X", -step)} disabled={disabled} />
        <JoyHome onClick={() => onHome("all")} disabled={disabled} />
        <JoyBtn icon={MoveRight} label="+X" color="rose" onClick={() => onMove("X", +step)} disabled={disabled} />
        <div />
        <JoyBtn icon={MoveDown} label="-Y" color="emerald" onClick={() => onMove("Y", -step)} disabled={disabled} />
        <div />
      </div>

      {/* Z axis isolado */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">
          Eixo Z (altura)
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => onMove("Z", +step)}
            disabled={disabled}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-200 text-xs font-semibold transition-all disabled:opacity-40"
          >
            <ChevronUp className="w-4 h-4" /> +Z {step}
          </button>
          <button
            onClick={onProbeZ}
            disabled={disabled}
            title="Toca a superfície com força suave (0.5N) — preserva células"
            className="flex flex-col items-center justify-center px-2 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 text-[10px] font-semibold transition-all disabled:opacity-40"
          >
            <Crosshair className="w-3.5 h-3.5 mb-0.5" />
            <span>Z-Probe</span>
            <span className="text-[8px] opacity-70">suave 0.5N</span>
          </button>
          <button
            onClick={() => onMove("Z", -step)}
            disabled={disabled}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-200 text-xs font-semibold transition-all disabled:opacity-40"
          >
            <ChevronDown className="w-4 h-4" /> -Z {step}
          </button>
        </div>
      </div>

      {/* Extrusora E */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 flex items-center justify-between">
          <span>Extrusora (bioink)</span>
          <span className="text-amber-300">{extrudeStep} mm</span>
        </div>
        <div className="flex gap-1 mb-2">
          {extrudeSteps.map((s) => (
            <button
              key={s}
              onClick={() => setExtrudeStep(s)}
              disabled={disabled}
              className={cn(
                "flex-1 px-1.5 py-1 rounded text-[10px] font-mono transition-all border",
                extrudeStep === s
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-100"
                  : "bg-white/3 border-white/5 text-gray-400 hover:bg-white/5 hover:text-white"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onMove("E", -extrudeStep)}
            disabled={disabled}
            title="Retração — puxa o material de volta. Use valor MÍNIMO (1.5mm) para hidrogéis."
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 text-xs font-semibold transition-all disabled:opacity-40"
          >
            <RotateCcw className="w-4 h-4" /> Retrair −{extrudeStep}
          </button>
          <button
            onClick={() => onMove("E", +extrudeStep)}
            disabled={disabled}
            title="Extrude bioink. Use micro-passos (0.01-0.1mm) para precisão volumétrica."
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 text-xs font-semibold transition-all disabled:opacity-40"
          >
            <Wind className="w-4 h-4" /> Extrudir +{extrudeStep}
          </button>
        </div>
      </div>

      {/* Comandos críticos bio-específicos */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">
          Comandos bio-específicos
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={onZero}
            disabled={disabled}
            title="G92 X0 Y0 Z0 E0 — zera todas as posições no local atual. Crítico após troca de cartucho."
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-200 text-[11px] font-semibold transition-all disabled:opacity-40"
          >
            <Target className="w-3.5 h-3.5" /> G92 zerar
          </button>
          <button
            onClick={onPurge}
            disabled={disabled}
            title="Pre-purge: extrude 1mm para fora do construct para tirar bolha de ar (que mata células)"
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 text-[11px] font-semibold transition-all disabled:opacity-40"
          >
            <Wind className="w-3.5 h-3.5" /> Purga ar
          </button>
          <button
            onClick={onSterilePause}
            disabled={disabled}
            title="Pausa MANTENDO a pressão pneumática — evita refluxo e contaminação"
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 text-[11px] font-semibold transition-all disabled:opacity-40"
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Pausa estéril
          </button>
          <button
            onClick={onGoToRest}
            disabled={disabled}
            title="Move para posição de repouso (canto seguro, fora do construct) para troca de cartucho"
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 text-[11px] font-semibold transition-all disabled:opacity-40"
          >
            <Snowflake className="w-3.5 h-3.5" /> Repouso
          </button>
        </div>
      </div>

      {/* Aviso de segurança */}
      <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 flex gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
        <div className="text-[11px] text-gray-300 leading-relaxed">
          <strong className="text-amber-200">Modo bio:</strong> use Z-probe suave antes de imprimir.
          Após trocar cartucho com células, sempre faça <strong>Purga (1mm)</strong> + <strong>G92</strong>.
          Retração nunca &gt; 2mm para hidrogéis (rasga o filamento).
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Botões internos
// ─────────────────────────────────────────────────────────────────────────

function JoyBtn({
  icon: Icon, label, color, onClick, disabled,
}: {
  icon: React.ElementType
  label: string
  color: "rose" | "emerald" | "sky"
  onClick: () => void
  disabled: boolean
}) {
  const cls =
    color === "rose"    ? "border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-100" :
    color === "emerald" ? "border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100" :
                          "border-sky-500/40 bg-sky-500/15 hover:bg-sky-500/25 text-sky-100"

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-14 h-14 rounded-2xl border-2 flex flex-col items-center justify-center transition-all disabled:opacity-40",
        cls
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-semibold mt-0.5">{label}</span>
    </button>
  )
}

function JoyHome({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title="Home All (G28) — vai para origem"
      className="w-14 h-14 rounded-2xl border-2 border-violet-500/40 bg-violet-500/15 hover:bg-violet-500/25 text-violet-100 flex flex-col items-center justify-center transition-all disabled:opacity-40"
    >
      <Home className="w-5 h-5" />
      <span className="text-[9px] font-semibold mt-0.5">HOME</span>
    </button>
  )
}
