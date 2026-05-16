"use client"

/**
 * BIA — Bioengineer Live Dock (R12.6)
 *
 * Painel FLUTUANTE de controle máximo da bioimpressora.
 * Resolve o problema de scroll jump: como usa position:fixed, NUNCA é
 * afetado por rolagem da página. O bioengenheiro pode clicar em -X, -Y, +Z
 * e ver o console reagir SEM perder o foco visual.
 *
 * UX:
 *   - Pode ser encaixado (docked) à direita OU destacado em modo janela
 *     com arrastar/redimensionar
 *   - 3 abas: Joystick · Temperaturas · Console
 *   - Headline com status de conexão sempre visível
 *   - Botão E-STOP (M112) sempre acessível
 *   - Botão "Resfriar Tudo" (M104/M140/M141 S0)
 *   - Atalhos de teclado: Esc fecha, J/T/C trocam aba, Space = pausa
 *
 * Como UX/bioengenheiro:
 *   - O painel se sobrepõe ao conteúdo da página, mas NÃO interage com
 *     o scroll dela. É um "controle remoto" da bioimpressora.
 *   - Tudo que importa em operação real (jog, temp, console) está aqui.
 *   - Os ajustes finos (extrusão, viabilidade) ficam na página principal.
 */

import { useEffect, useRef, useState, useCallback } from "react"
import {
  X, Gamepad2, Thermometer, Terminal,
  AlertOctagon, Snowflake, Radio, GripVertical,
  Minimize2, Maximize2, Move,
  Home as HomeIcon, Crosshair, ShieldAlert, Wind, Target,
  RotateCcw, ChevronUp, ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import type { JoystickPosition } from "@/components/bioprinter/Joystick3D"

// ─── Tipos exportados ────────────────────────────────────────────────────

export type DockTab = "joystick" | "temps" | "console"

export interface BioengineerLiveDockProps {
  /** Estado de visibilidade do dock */
  open: boolean
  onClose: () => void

  /** Conexão real com a impressora */
  connected: boolean
  sendCommand: (cmd: string) => Promise<void>

  /** Posição do cabeçote (compartilhada com o joystick da página) */
  position: JoystickPosition

  /** Handlers do joystick (reaproveitam os da página) */
  onMove: (axis: "X" | "Y" | "Z" | "E", delta: number) => void
  onHome: (axis: "all" | "X" | "Y" | "Z") => void
  onZero: () => void
  onProbeZ: () => void
  onPurge: () => void
  onSterilePause: () => void
  onGoToRest: () => void
  onCoolAll: () => void

  /** Console G-code compartilhado */
  consoleLog: string[]
  onClearLog: () => void

  /** Temperaturas atuais (sugestões) */
  cartridgeC: number
  bedC: number
  chamberC: number

  /** Aba inicial */
  defaultTab?: DockTab
}

// ─── Step sizes do joystick ─────────────────────────────────────────────
const STEP_SIZES: number[] = [0.05, 0.1, 0.5, 1, 5, 10]

// ─── Componente principal ───────────────────────────────────────────────

export function BioengineerLiveDock({
  open, onClose, connected, sendCommand, position,
  onMove, onHome, onZero, onProbeZ, onPurge, onSterilePause, onGoToRest,
  onCoolAll, consoleLog, onClearLog,
  cartridgeC, bedC, chamberC, defaultTab = "joystick",
}: BioengineerLiveDockProps) {
  const [tab, setTab] = useState<DockTab>(defaultTab)
  const [stepSize, setStepSize] = useState<number>(1)
  const [extrudeStep, setExtrudeStep] = useState<number>(0.5)
  const [minimized, setMinimized] = useState(false)
  const [confirmCool, setConfirmCool] = useState(false)
  const [confirmStop, setConfirmStop] = useState(false)

  // Temperaturas controladas
  const [targetCart, setTargetCart] = useState(cartridgeC)
  const [targetBed, setTargetBed] = useState(bedC)
  const [targetChamber, setTargetChamber] = useState(chamberC)

  const consoleRef = useRef<HTMLDivElement>(null)

  // Auto-scroll do console pra última linha
  useEffect(() => {
    if (tab === "console" && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [consoleLog, tab])

  // Atalhos de teclado: Esc fecha, J/T/C trocam aba
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      // Ignora se o foco está em input/textarea
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return

      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      } else if (e.key.toLowerCase() === "j") {
        setTab("joystick")
      } else if (e.key.toLowerCase() === "t") {
        setTab("temps")
      } else if (e.key.toLowerCase() === "c") {
        setTab("console")
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  // E-STOP — M112 (Emergency Stop)
  const handleEmergencyStop = useCallback(async () => {
    if (!confirmStop) {
      setConfirmStop(true)
      setTimeout(() => setConfirmStop(false), 3000)
      return
    }
    try {
      await sendCommand("M112")
    } catch (err) {
      console.error("[BioengineerDock] M112 falhou:", err)
    }
    setConfirmStop(false)
  }, [confirmStop, sendCommand])

  // Resfriar tudo — M104 S0 / M140 S0 / M141 S0
  const handleCoolAll = useCallback(() => {
    if (!confirmCool) {
      setConfirmCool(true)
      setTimeout(() => setConfirmCool(false), 3000)
      return
    }
    onCoolAll()
    setTargetCart(0)
    setTargetBed(0)
    setTargetChamber(0)
    setConfirmCool(false)
  }, [confirmCool, onCoolAll])

  // Aplicar temperaturas
  const applyTemp = useCallback(async (target: "cart" | "bed" | "chamber", value: number) => {
    const cmd = target === "cart"
      ? `M104 S${value}`
      : target === "bed"
        ? `M140 S${value}`
        : `M141 S${value}`
    try {
      await sendCommand(cmd)
    } catch (err) {
      console.error("[BioengineerDock] Falha ao aplicar temperatura:", err)
    }
  }, [sendCommand])

  if (!open) return null

  return (
    <>
      {/* ─── Backdrop sutil (clica fora fecha) ─── */}
      <div
        className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ─── Dock principal ─── */}
      <div
        className={cn(
          "bia-live-dock fixed z-[70] bg-[#0a0a0f] border-l border-violet-500/30",
          "shadow-[0_0_60px_rgba(124,58,237,0.35)]",
          "animate-in slide-in-from-right duration-200",
          "flex flex-col",
          // Tamanho: docked à direita ocupando 100% altura
          minimized
            ? "bottom-4 right-4 w-80 h-12 rounded-2xl border"
            : "top-0 right-0 bottom-0 w-full sm:w-[480px] md:w-[540px] lg:w-[600px]"
        )}
        role="dialog"
        aria-label="Painel Bioengenheiro - Controle ao Vivo"
        aria-modal="false"
      >
        {/* ─── Header sticky do dock ─── */}
        <header className={cn(
          "shrink-0 px-4 py-3 border-b border-violet-500/20 bg-gradient-to-r from-violet-950/60 to-[#0a0a0f]",
          "flex items-center gap-2",
          minimized && "border-b-0"
        )}>
          <GripVertical className="w-4 h-4 text-violet-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white truncate">
                Bioengenheiro · Painel ao Vivo
              </h2>
              {connected ? (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold uppercase tracking-wider inline-flex items-center gap-1 shrink-0">
                  <Radio className="w-2 h-2 animate-pulse" /> LIVE
                </span>
              ) : (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-500/20 border border-gray-500/40 text-gray-400 font-bold uppercase tracking-wider shrink-0">
                  SIM
                </span>
              )}
            </div>
            {!minimized && (
              <p className="text-[10px] text-violet-200/60 mt-0.5">
                Comandos em tempo real · imune a scroll · atalhos: J / T / C / Esc
              </p>
            )}
          </div>

          {/* Botão minimizar/maximizar */}
          <button
            onClick={() => setMinimized((m) => !m)}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-colors shrink-0"
            title={minimized ? "Expandir painel" : "Minimizar"}
          >
            {minimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Botão fechar */}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/40 flex items-center justify-center text-gray-300 hover:text-rose-300 transition-colors shrink-0"
            title="Fechar painel (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </header>

        {/* Quando minimizado, mostra apenas a header + linha de status compacta */}
        {minimized ? null : (
        <>
        {/* ─── Barra de status crítico + ações de emergência ─── */}
        <div className="shrink-0 px-4 py-2 bg-black/40 border-b border-white/[0.06] flex items-center gap-2 flex-wrap">
          {/* Posição compacta */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-violet-500/10 border border-violet-500/25 text-[10px] font-mono">
            <span className="text-violet-300">X</span>
            <span className="text-white font-semibold">{position.x.toFixed(2)}</span>
            <span className="text-violet-300 ml-1">Y</span>
            <span className="text-white font-semibold">{position.y.toFixed(2)}</span>
            <span className="text-violet-300 ml-1">Z</span>
            <span className="text-white font-semibold">{position.z.toFixed(2)}</span>
            <span className="text-violet-300 ml-1">E</span>
            <span className="text-white font-semibold">{position.e.toFixed(2)}</span>
          </div>

          <div className="flex-1" />

          {/* Resfriar TUDO */}
          <button
            onClick={handleCoolAll}
            className={cn(
              "text-[10px] px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 font-semibold",
              confirmCool
                ? "bg-cyan-500/30 border-cyan-400 text-cyan-100 animate-pulse"
                : "bg-cyan-500/10 border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/20"
            )}
            title="M104 S0 + M140 S0 + M141 S0 — Desliga todos os aquecedores"
          >
            <Snowflake className="w-3 h-3" />
            {confirmCool ? "Confirmar?" : "Resfriar Tudo"}
          </button>

          {/* E-STOP */}
          <button
            onClick={handleEmergencyStop}
            className={cn(
              "text-[10px] px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 font-bold uppercase tracking-wider",
              confirmStop
                ? "bg-rose-500/50 border-rose-300 text-white animate-pulse"
                : "bg-rose-500/20 border-rose-500/50 text-rose-200 hover:bg-rose-500/30"
            )}
            title="M112 — Parada de emergência (firmware reset necessário depois)"
          >
            <AlertOctagon className="w-3 h-3" />
            {confirmStop ? "Confirmar STOP" : "E-STOP"}
          </button>
        </div>

        {/* ─── Tabs ─── */}
        <nav className="shrink-0 flex border-b border-white/[0.06] bg-[#0a0a0f]">
          {[
            { key: "joystick" as DockTab, label: "Joystick", icon: Gamepad2, hint: "J" },
            { key: "temps"    as DockTab, label: "Temperaturas", icon: Thermometer, hint: "T" },
            { key: "console"  as DockTab, label: "Console", icon: Terminal, hint: "C" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 px-3 py-2.5 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border-b-2",
                tab === t.key
                  ? "text-violet-200 border-violet-500 bg-violet-500/[0.08]"
                  : "text-gray-400 border-transparent hover:text-gray-200 hover:bg-white/[0.03]"
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              <kbd className="hidden sm:inline-block ml-1 px-1 py-0.5 text-[8px] bg-white/[0.06] border border-white/10 rounded text-gray-500 font-mono">
                {t.hint}
              </kbd>
            </button>
          ))}
        </nav>

        {/* ─── Conteúdo da aba ─── */}
        <div className="flex-1 overflow-y-auto bg-[#0a0a0f]">
          {tab === "joystick" && (
            <JoystickTab
              stepSize={stepSize}
              setStepSize={setStepSize}
              extrudeStep={extrudeStep}
              setExtrudeStep={setExtrudeStep}
              onMove={onMove}
              onHome={onHome}
              onZero={onZero}
              onProbeZ={onProbeZ}
              onPurge={onPurge}
              onSterilePause={onSterilePause}
              onGoToRest={onGoToRest}
              connected={connected}
            />
          )}

          {tab === "temps" && (
            <TempsTab
              targetCart={targetCart} setTargetCart={setTargetCart}
              targetBed={targetBed}   setTargetBed={setTargetBed}
              targetChamber={targetChamber} setTargetChamber={setTargetChamber}
              currentCart={cartridgeC}
              currentBed={bedC}
              currentChamber={chamberC}
              applyTemp={applyTemp}
              connected={connected}
            />
          )}

          {tab === "console" && (
            <ConsoleTab
              consoleLog={consoleLog}
              consoleRef={consoleRef}
              onClearLog={onClearLog}
            />
          )}
        </div>
        </>
        )}
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ABA 1 — JOYSTICK
// ═══════════════════════════════════════════════════════════════════════════
function JoystickTab({
  stepSize, setStepSize, extrudeStep, setExtrudeStep,
  onMove, onHome, onZero, onProbeZ, onPurge, onSterilePause, onGoToRest,
  connected,
}: {
  stepSize: number
  setStepSize: (n: number) => void
  extrudeStep: number
  setExtrudeStep: (n: number) => void
  onMove: (axis: "X" | "Y" | "Z" | "E", delta: number) => void
  onHome: (axis: "all" | "X" | "Y" | "Z") => void
  onZero: () => void
  onProbeZ: () => void
  onPurge: () => void
  onSterilePause: () => void
  onGoToRest: () => void
  connected: boolean
}) {
  return (
    <div className="p-4 space-y-4">
      {/* Step size */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1.5">
          Passo XY/Z (mm)
        </p>
        <div className="grid grid-cols-6 gap-1">
          {STEP_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setStepSize(s)}
              className={cn(
                "py-1.5 text-[11px] font-bold rounded-lg border transition-all",
                stepSize === s
                  ? "bg-violet-500/30 border-violet-400 text-white"
                  : "bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08]"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* X/Y Pad */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1.5">
          Plano XY (vista superior)
        </p>
        <div className="relative w-full max-w-[220px] mx-auto aspect-square">
          {/* Crosshair central */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Crosshair className="w-6 h-6 text-violet-500/40" />
          </div>
          {/* +Y */}
          <button
            onClick={() => onMove("Y", stepSize)}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-14 rounded-xl bg-violet-500/15 hover:bg-violet-500/30 border border-violet-500/40 text-violet-100 font-bold flex items-center justify-center transition-all active:scale-95"
          >
            <ChevronUp className="w-6 h-6" />
            <span className="absolute bottom-0.5 right-1 text-[8px] font-mono opacity-60">+Y</span>
          </button>
          {/* -Y */}
          <button
            onClick={() => onMove("Y", -stepSize)}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-14 rounded-xl bg-violet-500/15 hover:bg-violet-500/30 border border-violet-500/40 text-violet-100 font-bold flex items-center justify-center transition-all active:scale-95"
          >
            <ChevronDown className="w-6 h-6" />
            <span className="absolute top-0.5 right-1 text-[8px] font-mono opacity-60">-Y</span>
          </button>
          {/* -X */}
          <button
            onClick={() => onMove("X", -stepSize)}
            className="absolute top-1/2 left-0 -translate-y-1/2 w-14 h-14 rounded-xl bg-violet-500/15 hover:bg-violet-500/30 border border-violet-500/40 text-violet-100 font-bold flex items-center justify-center transition-all active:scale-95"
          >
            <ChevronUp className="w-6 h-6 -rotate-90" />
            <span className="absolute bottom-0.5 right-1 text-[8px] font-mono opacity-60">-X</span>
          </button>
          {/* +X */}
          <button
            onClick={() => onMove("X", stepSize)}
            className="absolute top-1/2 right-0 -translate-y-1/2 w-14 h-14 rounded-xl bg-violet-500/15 hover:bg-violet-500/30 border border-violet-500/40 text-violet-100 font-bold flex items-center justify-center transition-all active:scale-95"
          >
            <ChevronUp className="w-6 h-6 rotate-90" />
            <span className="absolute bottom-0.5 right-1 text-[8px] font-mono opacity-60">+X</span>
          </button>
          {/* HOME center */}
          <button
            onClick={() => onHome("all")}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-amber-500/20 hover:bg-amber-500/35 border-2 border-amber-500/50 text-amber-200 font-bold flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-amber-900/50"
            title="G28 - Home todos os eixos"
          >
            <HomeIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Z + E side by side */}
      <div className="grid grid-cols-2 gap-3">
        {/* Z */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1.5">
            Eixo Z (vertical)
          </p>
          <div className="space-y-1.5">
            <button
              onClick={() => onMove("Z", stepSize)}
              className="w-full py-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-100 font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95"
            >
              <ChevronUp className="w-4 h-4" /> +Z
            </button>
            <button
              onClick={() => onMove("Z", -stepSize)}
              className="w-full py-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-100 font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95"
            >
              <ChevronDown className="w-4 h-4" /> -Z
            </button>
            <button
              onClick={() => onHome("Z")}
              className="w-full py-1.5 rounded-lg bg-cyan-500/[0.06] hover:bg-cyan-500/15 border border-cyan-500/25 text-cyan-300 font-medium text-[10px] transition-all"
            >
              HOME Z
            </button>
          </div>
        </div>

        {/* E (extrusor) */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1.5">
            Extrusor E
          </p>
          <div className="grid grid-cols-2 gap-1 mb-1.5">
            {[0.1, 0.5, 1, 5].map((s) => (
              <button
                key={s}
                onClick={() => setExtrudeStep(s)}
                className={cn(
                  "py-1 text-[10px] font-bold rounded border transition-all",
                  extrudeStep === s
                    ? "bg-emerald-500/30 border-emerald-400 text-white"
                    : "bg-white/[0.04] border-white/10 text-gray-300"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            onClick={() => onMove("E", extrudeStep)}
            className="w-full py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-100 font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95"
          >
            +E {extrudeStep}
          </button>
          <button
            onClick={() => onMove("E", -extrudeStep)}
            className="w-full mt-1.5 py-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-100 font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95"
          >
            -E {extrudeStep}
          </button>
        </div>
      </div>

      {/* Comandos biomédicos */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1.5">
          Comandos biomédicos
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onZero}
            className="px-2 py-2 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-200 text-[11px] font-semibold transition-all flex items-center gap-1.5"
            title="G92 X0 Y0 Z0 E0 - zera posições virtuais"
          >
            <Target className="w-3.5 h-3.5" />
            G92 · Zero
          </button>
          <button
            onClick={onProbeZ}
            className="px-2 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 text-[11px] font-semibold transition-all flex items-center gap-1.5"
            title="Z-probe suave 0.5N (não amassa gel)"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Z-probe suave
          </button>
          <button
            onClick={onPurge}
            className="px-2 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-200 text-[11px] font-semibold transition-all flex items-center gap-1.5"
            title="Pre-purge 1mm para tirar bolha de ar"
          >
            <Wind className="w-3.5 h-3.5" />
            Purga 1mm
          </button>
          <button
            onClick={onSterilePause}
            className="px-2 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-200 text-[11px] font-semibold transition-all flex items-center gap-1.5"
            title="M0 - pausa mantendo pressão pneumática"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Pausa estéril
          </button>
          <button
            onClick={onGoToRest}
            className="col-span-2 px-2 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5"
            title="Volta para posição de repouso (canto traseiro)"
          >
            <Move className="w-3.5 h-3.5" />
            Posição de repouso (troca de cartucho)
          </button>
        </div>
      </div>

      {!connected && (
        <p className="text-[10px] text-amber-400/80 text-center pt-1">
          Sem conexão USB: comandos gravados no console (modo simulação)
        </p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ABA 2 — TEMPERATURAS
// ═══════════════════════════════════════════════════════════════════════════
function TempsTab({
  targetCart, setTargetCart,
  targetBed, setTargetBed,
  targetChamber, setTargetChamber,
  currentCart, currentBed, currentChamber,
  applyTemp, connected,
}: {
  targetCart: number; setTargetCart: (n: number) => void
  targetBed: number; setTargetBed: (n: number) => void
  targetChamber: number; setTargetChamber: (n: number) => void
  currentCart: number; currentBed: number; currentChamber: number
  applyTemp: (target: "cart" | "bed" | "chamber", value: number) => void
  connected: boolean
}) {
  const tempControls = [
    {
      key: "cart" as const,
      label: "Cartucho (extrusor)",
      icon: Thermometer,
      color: "amber",
      target: targetCart,
      set: setTargetCart,
      current: currentCart,
      min: 0, max: 60, step: 1,
      hint: "Hidrogéis termorresponsivos (GelMA, agarose): 22-37°C",
      gcode: "M104",
    },
    {
      key: "bed" as const,
      label: "Cama (base)",
      icon: Snowflake,
      color: "cyan",
      target: targetBed,
      set: setTargetBed,
      current: currentBed,
      min: 0, max: 40, step: 1,
      hint: "Resfriada (4-8°C) preserva células ao depositar",
      gcode: "M140",
    },
    {
      key: "chamber" as const,
      label: "Câmara (ambiente)",
      icon: Thermometer,
      color: "emerald",
      target: targetChamber,
      set: setTargetChamber,
      current: currentChamber,
      min: 0, max: 45, step: 1,
      hint: "37°C ideal p/ células · controla evaporação",
      gcode: "M141",
    },
  ]

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-lg bg-cyan-500/[0.06] border border-cyan-500/25 p-3 flex items-start gap-2">
        <Snowflake className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
        <div className="text-[11px] text-gray-300 leading-relaxed">
          Use <strong className="text-cyan-200">Resfriar Tudo</strong> (topo do painel) antes de
          desligar a impressora ou trocar cartucho. Algumas placas crasham se você
          deixar S0 só em alguns aquecedores.
        </div>
      </div>

      {tempControls.map((t) => {
        const isOn = t.target > 0
        return (
          <div key={t.key} className="rounded-xl bg-black/30 border border-white/[0.06] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                  t.color === "amber" && "bg-amber-500/15 border border-amber-500/30",
                  t.color === "cyan"  && "bg-cyan-500/15 border border-cyan-500/30",
                  t.color === "emerald" && "bg-emerald-500/15 border border-emerald-500/30",
                )}>
                  <t.icon className={cn(
                    "w-3.5 h-3.5",
                    t.color === "amber" && "text-amber-300",
                    t.color === "cyan" && "text-cyan-300",
                    t.color === "emerald" && "text-emerald-300",
                  )} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{t.label}</p>
                  <p className="text-[10px] text-gray-500 truncate">{t.hint}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-gray-500">Atual</p>
                <p className="text-sm font-bold text-white font-mono">{t.current.toFixed(0)}°C</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="range"
                min={t.min}
                max={t.max}
                step={t.step}
                value={t.target}
                onChange={(e) => t.set(Number(e.target.value))}
                className="flex-1 accent-violet-500"
              />
              <input
                type="number"
                min={t.min}
                max={t.max}
                value={t.target}
                onChange={(e) => t.set(Number(e.target.value))}
                className="w-16 px-2 py-1 text-sm font-mono text-white bg-black/40 border border-white/10 rounded-md text-center"
              />
              <span className="text-xs text-gray-400 font-mono">°C</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-gray-500 font-mono">
                {t.gcode} S{t.target}
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => { t.set(0); applyTemp(t.key, 0) }}
                  className="px-2 py-1 text-[10px] font-semibold rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-colors"
                >
                  S0
                </button>
                <button
                  onClick={() => applyTemp(t.key, t.target)}
                  className={cn(
                    "px-3 py-1 text-[10px] font-bold rounded-md border transition-colors",
                    isOn
                      ? "bg-violet-500/20 hover:bg-violet-500/30 border-violet-500/40 text-violet-100"
                      : "bg-white/5 hover:bg-white/10 border-white/10 text-gray-400"
                  )}
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        )
      })}

      {!connected && (
        <p className="text-[10px] text-amber-400/80 text-center pt-1">
          Sem conexão USB: comandos gravados no console (modo simulação)
        </p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ABA 3 — CONSOLE
// ═══════════════════════════════════════════════════════════════════════════
function ConsoleTab({
  consoleLog, consoleRef, onClearLog,
}: {
  consoleLog: string[]
  consoleRef: React.RefObject<HTMLDivElement>
  onClearLog: () => void
}) {
  return (
    <div className="p-3 h-full flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 shrink-0">
        <p className="text-[10px] text-gray-500">
          {consoleLog.length} linhas · auto-scroll · Marlin compatível
        </p>
        <button
          onClick={onClearLog}
          className="px-2 py-1 text-[10px] font-semibold rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-colors"
        >
          Limpar
        </button>
      </div>

      <div
        ref={consoleRef}
        className="flex-1 overflow-y-auto rounded-lg bg-black/60 border border-white/[0.06] p-3 font-mono text-[11px] leading-relaxed"
      >
        {consoleLog.map((line, i) => (
          <div
            key={i}
            className={
              line.startsWith(";")
                ? "text-gray-500"
                : line.startsWith("G28")
                  ? "text-violet-300"
                  : line.startsWith("G92")
                    ? "text-cyan-300 font-semibold"
                    : line.startsWith("G29") || line.startsWith("M851")
                      ? "text-cyan-300"
                      : line.startsWith("M104") || line.startsWith("M140") || line.startsWith("M141")
                        ? "text-amber-300"
                        : line.startsWith("M112")
                          ? "text-rose-300 font-bold"
                          : line.startsWith("M0")
                            ? "text-amber-300"
                            : "text-emerald-200"
            }
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}
