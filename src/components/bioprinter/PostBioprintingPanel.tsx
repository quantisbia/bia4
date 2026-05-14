"use client"

/**
 * BIA — Painel de Pós-Bioimpressão
 *
 * Depois que o construct sai da impressora, o trabalho biológico começa.
 * Este painel guia o usuário pelos 3 estágios:
 *   1. CULTURA imediata (meio, CO₂, temperatura, schedule de trocas)
 *   2. MATURAÇÃO em biorreator (estímulo elétrico/mecânico/fluxo/etc)
 *   3. VALIDAÇÃO (ensaios morfológicos e funcionais)
 *
 * Cada tipo de tecido (cardíaco, ósseo, cartilagem, vaso, pele, nervo,
 * hepático) tem protocolo distinto vindo de POST_PROCESSING.
 *
 * Inclui timeline visual de quando esperar cada marco biológico.
 */

import {
  Beaker, Heart, Bone, Activity, Droplets, ScanLine,
  Brain, Microscope, CalendarClock, FlaskConical, CheckCircle2,
  Sparkles, ArrowRight, AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import {
  POST_PROCESSING,
  type PostProcessingProtocol,
} from "@/lib/bioprinter/biomedical-params"

// ─── Tipos exportados ──────────────────────────────────────────────────

export interface PostBioState {
  tissueType: string  // chave em POST_PROCESSING
}

export interface PostBioprintingPanelProps {
  state: PostBioState
  onChange: (next: PostBioState) => void
}

// ─── Ícone por tipo de tecido ──────────────────────────────────────────

const TISSUE_ICON: Record<string, React.ElementType> = {
  "Cardíaco (patch)":         Heart,
  "Ósseo":                    Bone,
  "Cartilagem":               Activity,
  "Vaso sanguíneo":           Droplets,
  "Pele":                     ScanLine,
  "Nervo periférico":         Brain,
  "Hepático (mini-fígado)":   FlaskConical,
}

const TISSUE_COLOR: Record<string, "rose" | "amber" | "cyan" | "rose2" | "emerald" | "purple" | "yellow"> = {
  "Cardíaco (patch)":         "rose",
  "Ósseo":                    "amber",
  "Cartilagem":               "cyan",
  "Vaso sanguíneo":           "rose2",
  "Pele":                     "emerald",
  "Nervo periférico":         "purple",
  "Hepático (mini-fígado)":   "yellow",
}

const STIMULUS_ICON: Record<string, React.ElementType> = {
  "electrical":               Activity,
  "mechanical-compression":   Bone,
  "perfusion-flow":           Droplets,
  "stretch":                  ArrowRight,
  "torsion":                  Activity,
  "static":                   CheckCircle2,
}

const STIMULUS_LABEL: Record<string, string> = {
  "electrical":               "Elétrico",
  "mechanical-compression":   "Compressão mecânica",
  "perfusion-flow":           "Perfusão (fluxo)",
  "stretch":                  "Estiramento",
  "torsion":                  "Torção",
  "static":                   "Estático",
}

// ─── Componente principal ───────────────────────────────────────────────

export function PostBioprintingPanel({ state, onChange }: PostBioprintingPanelProps) {
  const protocol: PostProcessingProtocol =
    POST_PROCESSING.find((p) => p.tissueType === state.tissueType) ?? POST_PROCESSING[0]

  const Icon = TISSUE_ICON[protocol.tissueType] ?? Microscope
  const color = TISSUE_COLOR[protocol.tissueType] ?? "emerald"

  return (
    <div className="space-y-5">
      {/* ─── SELETOR DE TIPO DE TECIDO ──────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
        {POST_PROCESSING.map((p) => {
          const TIcon = TISSUE_ICON[p.tissueType] ?? Microscope
          const isSelected = state.tissueType === p.tissueType
          return (
            <button
              key={p.tissueType}
              onClick={() => onChange({ tissueType: p.tissueType })}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all",
                isSelected
                  ? "bg-emerald-500/15 border-emerald-400 ring-1 ring-emerald-400/30"
                  : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/15"
              )}
            >
              <TIcon className={cn("w-5 h-5", isSelected ? "text-emerald-200" : "text-gray-400")} />
              <span className={cn(
                "text-[10px] font-semibold text-center leading-tight",
                isSelected ? "text-emerald-100" : "text-gray-300"
              )}>
                {p.tissueType.split(" (")[0]}
              </span>
            </button>
          )
        })}
      </div>

      {/* ─── HEADER DO TECIDO SELECIONADO ──────────────────────────── */}
      <div className={cn(
        "rounded-xl border p-4 flex items-start gap-3",
        toneBg(color)
      )}>
        <div className={cn(
          "w-12 h-12 rounded-xl border flex items-center justify-center shrink-0",
          toneIconBg(color)
        )}>
          <Icon className={cn("w-6 h-6", toneIconColor(color))} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-white">{protocol.tissueType}</h3>
          <p className="text-[11px] text-gray-300 mt-0.5">{protocol.expectedTimeline}</p>
          <div className="text-[10px] text-gray-500 mt-1">Ref: {protocol.ref}</div>
        </div>
      </div>

      {/* ─── ETAPA 1: CULTURA IMEDIATA ──────────────────────────────── */}
      <Stage
        number={1}
        title="Cultura imediata"
        subtitle="Logo após retirar o construct da impressora"
        icon={Beaker}
        tone="emerald"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg bg-black/30 border border-white/5 p-3 space-y-2">
            <div className="text-[10px] text-emerald-300 uppercase tracking-wider font-semibold">Meio de cultura</div>
            <div className="text-xs text-white leading-relaxed">{protocol.cultureMedium}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <KV label="Temperatura" value={`${protocol.cultureTempC}°C`} tone="rose" />
            <KV label="CO₂" value={`${protocol.cultureCO2Percent}%`} tone="cyan" />
            <KV label="Trocas de meio" value={protocol.mediumChangeSchedule} tone="amber" full />
          </div>
        </div>
      </Stage>

      {/* ─── ETAPA 2: MATURAÇÃO EM BIORREATOR ───────────────────────── */}
      {protocol.bioreactorStimulus && (
        <Stage
          number={2}
          title="Maturação em biorreator"
          subtitle="Estímulo biofísico para amadurecer o tecido"
          icon={Sparkles}
          tone="cyan"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/25 p-3 text-center md:col-span-1">
              {(() => {
                const SIcon = STIMULUS_ICON[protocol.bioreactorStimulus!.type] ?? Activity
                return <SIcon className="w-7 h-7 text-cyan-300 mx-auto mb-1.5" />
              })()}
              <div className="text-[10px] text-cyan-300 uppercase tracking-wider mb-0.5">Tipo de estímulo</div>
              <div className="text-sm font-bold text-cyan-100">
                {STIMULUS_LABEL[protocol.bioreactorStimulus.type] ?? protocol.bioreactorStimulus.type}
              </div>
            </div>
            <div className="rounded-lg bg-black/30 border border-white/5 p-3 md:col-span-2">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Parâmetros do estímulo</div>
              <div className="text-xs text-white leading-relaxed font-mono bg-black/40 rounded p-2 border border-white/5">
                {protocol.bioreactorStimulus.parameters}
              </div>
              <div className="text-[10px] text-gray-400 mt-2 flex items-center gap-1.5">
                <CalendarClock className="w-3 h-3" />
                Duração: <span className="text-cyan-300 font-semibold">{protocol.bioreactorStimulus.durationDays} dias</span>
              </div>
            </div>
          </div>
        </Stage>
      )}

      {/* ─── ETAPA 3: VALIDAÇÃO ────────────────────────────────────── */}
      <Stage
        number={3}
        title="Validação morfológica e funcional"
        subtitle="Como provar que seu construct virou tecido"
        icon={Microscope}
        tone="purple"
      >
        <div className="space-y-2">
          {protocol.validationAssays.map((assay, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg bg-black/30 border border-white/5 p-2.5"
            >
              <div className="w-6 h-6 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-purple-200">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0 text-[11px] text-gray-200 leading-relaxed pt-0.5">
                {assay}
              </div>
            </div>
          ))}
        </div>
      </Stage>

      {/* ─── TIMELINE VISUAL ────────────────────────────────────────── */}
      <Stage
        number={4}
        title="Linha do tempo esperada"
        subtitle="Marcos biológicos da diferenciação à maturação"
        icon={CalendarClock}
        tone="amber"
      >
        <div className="rounded-lg bg-gradient-to-r from-amber-500/5 via-emerald-500/5 to-cyan-500/5 border border-white/10 p-4">
          <div className="relative">
            {/* Linha base */}
            <div className="absolute top-3 left-0 right-0 h-0.5 bg-white/10" />

            {/* Marcos */}
            <div className="relative grid grid-cols-4 gap-2">
              <Milestone day="D0" label="Print" tone="rose" />
              <Milestone day="D1-3" label="Adesão / sobrevida" tone="amber" />
              <Milestone day="D7-14" label="Diferenciação" tone="cyan" />
              <Milestone day="D14-28+" label="Maturação funcional" tone="emerald" />
            </div>

            <div className="mt-4 rounded bg-black/40 border border-white/5 p-2.5 text-[11px] text-gray-300 italic leading-relaxed">
              <strong className="text-amber-300 not-italic">Esperado:</strong> {protocol.expectedTimeline}
            </div>
          </div>
        </div>
      </Stage>

      {/* ─── ALERTAS GERAIS DE BIOSSEGURANÇA ───────────────────────── */}
      <div className="rounded-xl bg-rose-500/5 border border-rose-500/20 p-3 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
        <div className="flex-1 text-[11px] text-rose-100/90 leading-relaxed">
          <strong className="text-rose-200">Checklist de biossegurança pós-print:</strong>{" "}
          fluxo laminar para transferir construct ao biorreator · meio pré-aquecido a 37°C ·
          troca de luvas a cada manipulação · monitorar contaminação visual (turbidez/pH) a cada
          troca de meio · congelar amostra de meio para teste micoplasma D7 e D14.
        </div>
      </div>
    </div>
  )
}

// ─── Sub-componentes ────────────────────────────────────────────────────

function Stage({
  number, title, subtitle, icon: Icon, tone, children,
}: {
  number: number
  title: string
  subtitle: string
  icon: React.ElementType
  tone: "emerald" | "cyan" | "amber" | "purple"
  children: React.ReactNode
}) {
  const t = {
    emerald: { num: "bg-emerald-500/15 border-emerald-500/30 text-emerald-200", icon: "text-emerald-300", title: "text-emerald-100" },
    cyan:    { num: "bg-cyan-500/15 border-cyan-500/30 text-cyan-200",          icon: "text-cyan-300",    title: "text-cyan-100" },
    amber:   { num: "bg-amber-500/15 border-amber-500/30 text-amber-200",       icon: "text-amber-300",   title: "text-amber-100" },
    purple:  { num: "bg-purple-500/15 border-purple-500/30 text-purple-200",    icon: "text-purple-300",  title: "text-purple-100" },
  }[tone]
  return (
    <div className="rounded-xl bg-black/30 border border-white/5 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 font-bold text-sm", t.num)}>
          {number}
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <Icon className={cn("w-4 h-4", t.icon)} />
          <div>
            <h4 className={cn("text-sm font-semibold", t.title)}>{title}</h4>
            <p className="text-[10px] text-gray-500">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="pl-12">{children}</div>
    </div>
  )
}

function KV({
  label, value, tone, full = false,
}: {
  label: string
  value: string
  tone: "rose" | "cyan" | "amber"
  full?: boolean
}) {
  const t = {
    rose:  "bg-rose-500/10 border-rose-500/25 text-rose-200",
    cyan:  "bg-cyan-500/10 border-cyan-500/25 text-cyan-200",
    amber: "bg-amber-500/10 border-amber-500/25 text-amber-200",
  }[tone]
  return (
    <div className={cn("rounded-lg border px-2.5 py-2", t, full && "col-span-2")}>
      <div className="text-[9px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-xs font-semibold mt-0.5">{value}</div>
    </div>
  )
}

function Milestone({
  day, label, tone,
}: {
  day: string
  label: string
  tone: "rose" | "amber" | "cyan" | "emerald"
}) {
  const t = {
    rose:    { dot: "bg-rose-400 ring-rose-400/30",       text: "text-rose-200" },
    amber:   { dot: "bg-amber-400 ring-amber-400/30",     text: "text-amber-200" },
    cyan:    { dot: "bg-cyan-400 ring-cyan-400/30",       text: "text-cyan-200" },
    emerald: { dot: "bg-emerald-400 ring-emerald-400/30", text: "text-emerald-200" },
  }[tone]
  return (
    <div className="flex flex-col items-center">
      <div className={cn("w-6 h-6 rounded-full ring-4 ring-offset-0", t.dot)} />
      <div className={cn("text-[10px] font-bold mt-2", t.text)}>{day}</div>
      <div className="text-[9px] text-gray-400 text-center mt-0.5 leading-tight">{label}</div>
    </div>
  )
}

// ─── Helpers de tonalidade do header ───────────────────────────────────

type Tone = "rose" | "amber" | "cyan" | "rose2" | "emerald" | "purple" | "yellow"

function toneBg(tone: Tone): string {
  return {
    rose:    "bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/30",
    rose2:   "bg-gradient-to-br from-pink-500/10 to-pink-500/5 border-pink-500/30",
    amber:   "bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/30",
    cyan:    "bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/30",
    emerald: "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30",
    purple:  "bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/30",
    yellow:  "bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/30",
  }[tone]
}
function toneIconBg(tone: Tone): string {
  return {
    rose:    "bg-rose-500/15 border-rose-500/30",
    rose2:   "bg-pink-500/15 border-pink-500/30",
    amber:   "bg-amber-500/15 border-amber-500/30",
    cyan:    "bg-cyan-500/15 border-cyan-500/30",
    emerald: "bg-emerald-500/15 border-emerald-500/30",
    purple:  "bg-purple-500/15 border-purple-500/30",
    yellow:  "bg-yellow-500/15 border-yellow-500/30",
  }[tone]
}
function toneIconColor(tone: Tone): string {
  return {
    rose:    "text-rose-300",
    rose2:   "text-pink-300",
    amber:   "text-amber-300",
    cyan:    "text-cyan-300",
    emerald: "text-emerald-300",
    purple:  "text-purple-300",
    yellow:  "text-yellow-300",
  }[tone]
}
