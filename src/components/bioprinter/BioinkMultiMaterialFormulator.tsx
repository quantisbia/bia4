/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BioinkMultiMaterialFormulator — Formulação rápida multi-material (R12.10)
 *
 *  Permite ao bioengenheiro montar 1 a 4 formulações ANTES de ir para a
 *  bioimpressão. Cada formulação é vinculada a um tool slot (T0..T3) e
 *  visualizada por cor distinta no viewer 3D.
 *
 *  Filosofia: "antes de imprimir, defina o que vai sair de cada cabeça".
 *  Pode ser usado standalone (toolpath page) ou integrado a outras telas.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

"use client"

import { useState, useCallback, useMemo } from "react"
import {
  Droplets, Plus, Trash2, FlaskConical, Beaker, AlertTriangle,
  CheckCircle2, ChevronDown, ChevronUp, Layers, Palette,
  Heart, Bone, Brain, Activity, Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import {
  type BioinkFormulation, type BioinkRole,
  ROLE_LABELS, TOOL_LABELS, TOOL_COLORS,
  makeDefaultFormulation,
} from "@/lib/bioprint/process-context"
import { InfoButton } from "@/components/ui/InfoButton"

// ─── Catálogo de materiais (compacto) ────────────────────────────────────

const MATERIAL_PRESETS: Array<{
  id: string
  label: string
  defaultConc: number
  defaultCrosslinker: string
  defaultCrosslinkerConc: number
  defaultViscosity: number      // Pa·s
  defaultYield: number          // Pa
  goodFor: BioinkRole[]
  hint: string
}> = [
  { id: "gelma",    label: "GelMA 10%",          defaultConc: 10,  defaultCrosslinker: "UV 365nm + LAP", defaultCrosslinkerConc: 0.3, defaultViscosity: 5,    defaultYield: 15,  goodFor: ["structural","cellular"],    hint: "Foto-crosslink · versátil" },
  { id: "alginate", label: "Alginato de Sódio",  defaultConc: 3,   defaultCrosslinker: "CaCl₂",          defaultCrosslinkerConc: 100, defaultViscosity: 3,    defaultYield: 50,  goodFor: ["structural","cellular"],    hint: "Iônico CaCl₂ · barato" },
  { id: "collagen", label: "Colágeno Tipo I",    defaultConc: 3,   defaultCrosslinker: "Térmico 37°C",   defaultCrosslinkerConc: 0,   defaultViscosity: 1,    defaultYield: 5,   goodFor: ["cellular"],                 hint: "Imprime a 4°C · gelifica a 37°C" },
  { id: "fibrin",   label: "Fibrina",            defaultConc: 20,  defaultCrosslinker: "Trombina",        defaultCrosslinkerConc: 2,   defaultViscosity: 0.5,  defaultYield: 2,   goodFor: ["cellular","vascular"],      hint: "Gelifica 5-10min · vascular" },
  { id: "pluronic", label: "Pluronic F127",      defaultConc: 30,  defaultCrosslinker: "Lavagem 4°C",     defaultCrosslinkerConc: 0,   defaultViscosity: 50,   defaultYield: 200, goodFor: ["sacrificial","vascular"],   hint: "Sacrificial · gel reversível" },
  { id: "pcl",      label: "PCL (90-100°C)",     defaultConc: 100, defaultCrosslinker: "Solidificação",   defaultCrosslinkerConc: 0,   defaultViscosity: 200,  defaultYield: 500, goodFor: ["structural"],               hint: "Rígido · scaffolds duros" },
  { id: "hama",     label: "HA-MA (Hialurônico)", defaultConc: 3,  defaultCrosslinker: "UV 365nm + LAP", defaultCrosslinkerConc: 0.3, defaultViscosity: 8,    defaultYield: 25,  goodFor: ["cellular","structural"],    hint: "G' 100-2000 Pa · cartilagem" },
  { id: "decm",     label: "dECM",               defaultConc: 2,   defaultCrosslinker: "Térmico 37°C",   defaultCrosslinkerConc: 0,   defaultViscosity: 2,    defaultYield: 8,   goodFor: ["cellular"],                 hint: "Matriz descelular · biomimético" },
  { id: "gelatin-bath", label: "Gelatina (banho FRESH)", defaultConc: 4.5, defaultCrosslinker: "Térmico 37°C", defaultCrosslinkerConc: 0, defaultViscosity: 100, defaultYield: 100, goodFor: ["support-bath"],         hint: "Banho de suporte FRESH" },
  { id: "pegda",    label: "PEGDA",              defaultConc: 15,  defaultCrosslinker: "UV 365nm + LAP", defaultCrosslinkerConc: 0.3, defaultViscosity: 0.5,  defaultYield: 0,   goodFor: ["structural"],               hint: "Foto-crosslink · rígido" },
  { id: "carbopol", label: "Carbopol (banho)",   defaultConc: 0.5, defaultCrosslinker: "—",               defaultCrosslinkerConc: 0,   defaultViscosity: 80,   defaultYield: 80,  goodFor: ["support-bath"],             hint: "Banho transparente" },
  { id: "custom",   label: "Custom",             defaultConc: 5,   defaultCrosslinker: "—",               defaultCrosslinkerConc: 0,   defaultViscosity: 5,    defaultYield: 10,  goodFor: ["structural","cellular","sacrificial","vascular","support-bath"], hint: "Definir manualmente" },
]

const CELL_TYPES = [
  { id: "hMSC",         label: "hMSC",         icon: Bone,  hint: "Tolerante" },
  { id: "iPSC",         label: "iPSC",         icon: Sparkles, hint: "Sensível" },
  { id: "Cardiomyocyte",label: "Cardiomiócito",icon: Heart, hint: "Sensível" },
  { id: "Chondrocyte",  label: "Condrócito",   icon: Bone,  hint: "Tolerante" },
  { id: "Osteoblast",   label: "Osteoblasto",  icon: Bone,  hint: "Tolerante" },
  { id: "Fibroblast",   label: "Fibroblasto",  icon: Activity, hint: "Muito tolerante" },
  { id: "Endothelial",  label: "HUVEC",        icon: Heart, hint: "Vascular" },
  { id: "Hepatocyte",   label: "Hepatócito",   icon: Activity, hint: "Sensível" },
  { id: "Neuron",       label: "Neurônio",     icon: Brain, hint: "Muito sensível" },
  { id: "Keratinocyte", label: "Queratinócito",icon: Activity, hint: "Tolerante" },
]

// ─── Templates pré-prontos (atalhos comuns) ─────────────────────────────

interface MultiMatTemplate {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  formulations: BioinkFormulation[]
}

const TEMPLATES: MultiMatTemplate[] = [
  {
    id: "vascular-dual",
    name: "Vascular Dual",
    description: "GelMA estrutural + Pluronic sacrificial p/ canal vascular",
    icon: Heart,
    formulations: [
      { ...makeDefaultFormulation(0, "structural"), label: "GelMA estrutural" },
      {
        ...makeDefaultFormulation(1, "sacrificial"),
        material: "Pluronic F127", materialId: "pluronic", concentration: 30,
        crosslinker: "Lavagem 4°C", crosslinkerConc: 0,
        rheology: { viscosityPaS: 50, yieldStressPa: 200, flowIndex: 0.4 },
        label: "Pluronic sacrificial",
      },
    ],
  },
  {
    id: "osteochondral-dual",
    name: "Osteocondral Dual",
    description: "GelMA + HA-MA condrócito · PEGDA + hMSC osteoblasto",
    icon: Bone,
    formulations: [
      {
        ...makeDefaultFormulation(0, "cellular"),
        material: "HA-MA (Hialurônico)", materialId: "hama", concentration: 3,
        cellType: "Chondrocyte", cellDensityMillionMl: 5,
        label: "Camada cartilagem",
      },
      {
        ...makeDefaultFormulation(1, "structural"),
        material: "PEGDA", materialId: "pegda", concentration: 15,
        cellType: "Osteoblast", cellDensityMillionMl: 3,
        label: "Camada óssea",
      },
    ],
  },
  {
    id: "fresh-cardiac",
    name: "FRESH Cardíaco",
    description: "Colágeno + Cardiomiócito em banho de gelatina (Shiwarski 2025)",
    icon: Heart,
    formulations: [
      {
        ...makeDefaultFormulation(0, "cellular"),
        material: "Colágeno Tipo I", materialId: "collagen", concentration: 3,
        cellType: "Cardiomyocyte", cellDensityMillionMl: 20,
        label: "Tecido cardíaco",
      },
      {
        ...makeDefaultFormulation(1, "support-bath"),
        material: "Gelatina (banho FRESH)", materialId: "gelatin-bath", concentration: 4.5,
        crosslinker: "Térmico 37°C", crosslinkerConc: 0,
        label: "Banho FRESH 4.5%",
      },
    ],
  },
  {
    id: "skin-triple",
    name: "Pele Trilamelar",
    description: "Fibroblasto · queratinócito · endotelial (3 cabeças)",
    icon: Activity,
    formulations: [
      { ...makeDefaultFormulation(0, "cellular"), material: "GelMA", materialId: "gelma", concentration: 8, cellType: "Fibroblast", cellDensityMillionMl: 3, label: "Derme (fibroblasto)" },
      { ...makeDefaultFormulation(1, "cellular"), material: "Colágeno Tipo I", materialId: "collagen", concentration: 3, cellType: "Keratinocyte", cellDensityMillionMl: 5, label: "Epiderme (queratinócito)" },
      { ...makeDefaultFormulation(2, "vascular"), material: "Fibrina", materialId: "fibrin", concentration: 20, cellType: "Endothelial", cellDensityMillionMl: 4, label: "Microvasculatura (HUVEC)" },
    ],
  },
]

// ─── Props ──────────────────────────────────────────────────────────────

export interface BioinkMultiMaterialFormulatorProps {
  formulations: BioinkFormulation[]
  onChange: (formulations: BioinkFormulation[]) => void
  /** Compacto para sidebar (true) ou full (false) */
  compact?: boolean
  className?: string
}

export function BioinkMultiMaterialFormulator({
  formulations,
  onChange,
  compact = false,
  className,
}: BioinkMultiMaterialFormulatorProps) {
  const [expanded, setExpanded] = useState<number | null>(0)
  const [showTemplates, setShowTemplates] = useState(formulations.length === 0)

  // ─── Mutators ─────────────────────────────────────────────────────────

  const addFormulation = useCallback(() => {
    if (formulations.length >= 4) return
    const nextTool = formulations.length as 0 | 1 | 2 | 3
    onChange([
      ...formulations,
      makeDefaultFormulation(nextTool, formulations.length === 0 ? "structural" : "cellular"),
    ])
    setExpanded(formulations.length)
    setShowTemplates(false)
  }, [formulations, onChange])

  const removeFormulation = useCallback((idx: number) => {
    const next = formulations.filter((_, i) => i !== idx)
    // re-atribui tool index de forma sequencial
    const renumbered = next.map((f, i) => ({
      ...f,
      tool: i as 0 | 1 | 2 | 3,
      color: TOOL_COLORS[i as 0 | 1 | 2 | 3],
    }))
    onChange(renumbered)
    if (expanded === idx) setExpanded(null)
  }, [formulations, onChange, expanded])

  const updateFormulation = useCallback((idx: number, patch: Partial<BioinkFormulation>) => {
    const next = formulations.map((f, i) => i === idx ? { ...f, ...patch } : f)
    onChange(next)
  }, [formulations, onChange])

  const applyTemplate = useCallback((tmpl: MultiMatTemplate) => {
    onChange(tmpl.formulations.map((f, i) => ({
      ...f,
      tool: i as 0 | 1 | 2 | 3,
      color: TOOL_COLORS[i as 0 | 1 | 2 | 3],
    })))
    setShowTemplates(false)
    setExpanded(0)
  }, [onChange])

  // ─── Validação ─────────────────────────────────────────────────────────

  const validation = useMemo(() => {
    const issues: string[] = []
    if (formulations.length === 0) issues.push("Nenhuma formulação adicionada")
    formulations.forEach((f, i) => {
      if (!f.material) issues.push(`T${i}: material vazio`)
      if (f.concentration <= 0) issues.push(`T${i}: concentração inválida`)
    })
    // Strategy
    const hasSupportBath = formulations.some(f => f.role === "support-bath")
    const hasVascular = formulations.some(f => f.role === "vascular" || f.role === "sacrificial")
    const cellCount = formulations.filter(f => f.cellType).length
    return { issues, isReady: issues.length === 0, hasSupportBath, hasVascular, cellCount }
  }, [formulations])

  return (
    <div className={cn("space-y-3", className)}>
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
            <Droplets className="w-4 h-4 text-cyan-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              Formulação Multi-Material
              <span className={cn(
                "text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider border",
                formulations.length === 0
                  ? "bg-gray-500/15 border-gray-500/30 text-gray-400"
                  : formulations.length === 1
                  ? "bg-violet-500/15 border-violet-500/30 text-violet-200"
                  : formulations.length === 2
                  ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-200"
                  : "bg-emerald-500/15 border-emerald-500/30 text-emerald-200",
              )}>
                {formulations.length === 0 ? "vazia" : formulations.length === 1 ? "single" : formulations.length === 2 ? "dual" : "multi"}
                {formulations.length > 0 && ` · ${formulations.length} cabeça${formulations.length > 1 ? "s" : ""}`}
              </span>
              <InfoButton title="Multi-material em bioimpressão" align="left">
                <p>Cada formulação é vinculada a uma <strong>cabeça (tool slot T0..T3)</strong> da bioimpressora.</p>
                <p className="mt-1.5">No G-code, as trocas usam <code className="bg-black/40 px-1 rounded">T0</code>, <code className="bg-black/40 px-1 rounded">T1</code>, etc. — comando Marlin universal.</p>
                <p className="mt-1.5"><strong>Usos comuns:</strong></p>
                <ul className="list-disc list-inside text-[10.5px] mt-1 space-y-0.5">
                  <li>Estrutural + sacrificial (vasos)</li>
                  <li>Células diferentes em camadas distintas</li>
                  <li>FRESH: tinta + banho de suporte</li>
                  <li>Gradient: rígido → mole (osteocondral)</li>
                </ul>
              </InfoButton>
            </h3>
            <p className="text-[10px] text-gray-500">
              {validation.isReady
                ? `✓ Pronta para bioimpressão · ${validation.cellCount} células · ${validation.hasVascular ? "vascular" : "sem canal"}${validation.hasSupportBath ? " · FRESH" : ""}`
                : "Adicione pelo menos 1 formulação"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {formulations.length > 0 && (
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-gray-300 transition-colors"
            >
              {showTemplates ? "Ocultar templates" : "Templates"}
            </button>
          )}
          <button
            onClick={addFormulation}
            disabled={formulations.length >= 4}
            className="text-[10px] px-2 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-100 font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Adicionar cabeça
          </button>
        </div>
      </div>

      {/* ═══ TEMPLATES (toggleable) ═══ */}
      {showTemplates && (
        <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.05] to-cyan-500/[0.02] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3 h-3 text-violet-300" />
            <span className="text-[10px] uppercase tracking-wider text-violet-200 font-semibold">
              Templates pré-prontos · clique p/ aplicar
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {TEMPLATES.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  className="text-left rounded-lg border border-white/10 hover:border-violet-400/40 bg-black/30 hover:bg-violet-500/[0.05] p-2 transition-all group"
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-violet-300 group-hover:text-violet-200" />
                    <span className="text-[11px] font-semibold text-white">{t.name}</span>
                    <span className="ml-auto text-[8.5px] px-1 py-0 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-200">
                      {t.formulations.length} cabeças
                    </span>
                  </div>
                  <p className="text-[9.5px] text-gray-400 mt-0.5 leading-snug">{t.description}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══ LISTA DE FORMULAÇÕES ═══ */}
      {formulations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-6 text-center">
          <FlaskConical className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-[12px] text-gray-400 font-semibold">Sem formulações</p>
          <p className="text-[10.5px] text-gray-500 mt-1">
            Adicione uma cabeça ou aplique um template acima.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {formulations.map((f, idx) => (
            <FormulationCard
              key={`${f.tool}-${idx}`}
              formulation={f}
              isExpanded={expanded === idx}
              onToggle={() => setExpanded(expanded === idx ? null : idx)}
              onChange={(patch) => updateFormulation(idx, patch)}
              onRemove={() => removeFormulation(idx)}
              canRemove={formulations.length > 1}
              compact={compact}
            />
          ))}
        </div>
      )}

      {/* ═══ VALIDAÇÃO RESUMO ═══ */}
      {formulations.length > 0 && (
        <div className={cn(
          "rounded-xl border p-2.5",
          validation.isReady
            ? "border-emerald-500/30 bg-emerald-500/[0.05]"
            : "border-amber-500/30 bg-amber-500/[0.05]",
        )}>
          <div className="flex items-start gap-2">
            {validation.isReady
              ? <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              : <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />}
            <div className="flex-1 text-[10.5px]">
              {validation.isReady ? (
                <>
                  <span className="text-emerald-200 font-semibold">Formulação válida.</span>
                  <span className="text-gray-400 ml-1">
                    Pronta para fatiar / gerar toolpath / bioimprimir.
                  </span>
                </>
              ) : (
                <>
                  <span className="text-amber-200 font-semibold">Pendências:</span>
                  <ul className="list-disc list-inside text-gray-400 mt-0.5">
                    {validation.issues.map((iss, i) => <li key={i}>{iss}</li>)}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Card de UMA formulação ──────────────────────────────────────────────

function FormulationCard({
  formulation, isExpanded, onToggle, onChange, onRemove, canRemove, compact,
}: {
  formulation: BioinkFormulation
  isExpanded: boolean
  onToggle: () => void
  onChange: (patch: Partial<BioinkFormulation>) => void
  onRemove: () => void
  canRemove: boolean
  compact: boolean
}) {
  const f = formulation
  const preset = MATERIAL_PRESETS.find(p => p.id === f.materialId) ?? MATERIAL_PRESETS[MATERIAL_PRESETS.length - 1]

  return (
    <div
      className="rounded-xl border bg-black/30 overflow-hidden transition-all"
      style={{ borderColor: isExpanded ? f.color + "66" : "rgba(255,255,255,0.08)" }}
    >
      {/* ─── Header colapsado ─── */}
      <button
        onClick={onToggle}
        className="w-full text-left p-2.5 flex items-center gap-2.5 hover:bg-white/[0.02] transition-colors"
      >
        {/* Chip da cor + Tool # */}
        <div
          className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 font-mono text-[10px] font-bold text-white"
          style={{
            backgroundColor: f.color + "26",
            borderColor: f.color + "66",
            color: f.color,
          }}
        >
          T{f.tool}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11.5px] font-semibold text-white truncate">
              {f.label ?? `${f.material} ${f.concentration}%`}
            </span>
            <span
              className="text-[8.5px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider border"
              style={{
                backgroundColor: f.color + "15",
                borderColor: f.color + "40",
                color: f.color,
              }}
            >
              {ROLE_LABELS[f.role]}
            </span>
          </div>
          <p className="text-[10px] text-gray-500 mt-0.5 truncate">
            {f.material} {f.concentration}%
            {f.crosslinker && ` · ${f.crosslinker}`}
            {f.cellType && ` · ${f.cellType} ${f.cellDensityMillionMl}M/mL`}
            {!f.cellType && f.role === "cellular" && " · ⚠ sem células"}
          </p>
        </div>

        {canRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="p-1 rounded hover:bg-rose-500/20 text-rose-300/60 hover:text-rose-300 transition-colors"
            title="Remover esta cabeça"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        {isExpanded
          ? <ChevronUp className="w-4 h-4 text-gray-500" />
          : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>

      {/* ─── Body expandido ─── */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-2.5">
          {/* Label custom */}
          <div>
            <label className="text-[9.5px] text-gray-500 uppercase tracking-wider block mb-1">
              Label (opcional)
            </label>
            <input
              type="text"
              value={f.label ?? ""}
              onChange={(e) => onChange({ label: e.target.value })}
              placeholder={`Ex: ${f.role === "structural" ? "GelMA estrutural" : f.role === "cellular" ? "Hepatócito GelMA" : "Sacrificial Pluronic"}`}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:border-cyan-500/50 outline-none"
            />
          </div>

          {/* Role */}
          <div>
            <label className="text-[9.5px] text-gray-500 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
              <Layers className="w-2.5 h-2.5" /> Papel funcional
            </label>
            <div className="grid grid-cols-5 gap-1">
              {(["structural","cellular","vascular","sacrificial","support-bath"] as BioinkRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => onChange({ role })}
                  className={cn(
                    "text-[9px] py-1 px-1 rounded border transition-all",
                    f.role === role
                      ? "bg-cyan-500/20 border-cyan-500/50 text-white font-semibold"
                      : "bg-white/[0.02] border-white/10 text-gray-400 hover:text-white hover:border-white/25",
                  )}
                  title={ROLE_LABELS[role]}
                >
                  {ROLE_LABELS[role].split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Material */}
          <div>
            <label className="text-[9.5px] text-gray-500 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
              <Beaker className="w-2.5 h-2.5" /> Material base
            </label>
            <select
              value={f.materialId}
              onChange={(e) => {
                const newPreset = MATERIAL_PRESETS.find(p => p.id === e.target.value)
                if (!newPreset) return
                onChange({
                  materialId: newPreset.id,
                  material: newPreset.label,
                  concentration: newPreset.defaultConc,
                  crosslinker: newPreset.defaultCrosslinker,
                  crosslinkerConc: newPreset.defaultCrosslinkerConc,
                  rheology: {
                    viscosityPaS: newPreset.defaultViscosity,
                    yieldStressPa: newPreset.defaultYield,
                    flowIndex: 0.5,
                  },
                })
              }}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:border-cyan-500/50 outline-none"
            >
              {MATERIAL_PRESETS.map(p => (
                <option key={p.id} value={p.id}>{p.label} — {p.hint}</option>
              ))}
            </select>
          </div>

          {/* Concentração */}
          <div>
            <label className="text-[9.5px] text-gray-500 uppercase tracking-wider block mb-1">
              Concentração: <span className="text-white font-mono">{f.concentration}%</span>
            </label>
            <input
              type="range"
              min={0.5}
              max={100}
              step={0.5}
              value={f.concentration}
              onChange={(e) => onChange({ concentration: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500"
            />
          </div>

          {/* Células (só se role === "cellular" ou "vascular") */}
          {(f.role === "cellular" || f.role === "vascular") && (
            <div className="space-y-1.5">
              <label className="text-[9.5px] text-gray-500 uppercase tracking-wider block flex items-center gap-1.5">
                <Activity className="w-2.5 h-2.5" /> Tipo celular
              </label>
              <select
                value={f.cellType ?? ""}
                onChange={(e) => onChange({
                  cellType: e.target.value || null,
                  cellDensityMillionMl: e.target.value ? (f.cellDensityMillionMl ?? 2) : null,
                })}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:border-cyan-500/50 outline-none"
              >
                <option value="">— Acelular —</option>
                {CELL_TYPES.map(c => (
                  <option key={c.id} value={c.id}>{c.label} · {c.hint}</option>
                ))}
              </select>
              {f.cellType && (
                <div>
                  <label className="text-[9.5px] text-gray-500 block">
                    Densidade: <span className="text-white font-mono">{f.cellDensityMillionMl} ×10⁶ cells/mL</span>
                  </label>
                  <input
                    type="range"
                    min={0.5}
                    max={50}
                    step={0.5}
                    value={f.cellDensityMillionMl ?? 2}
                    onChange={(e) => onChange({ cellDensityMillionMl: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Crosslinker + Reologia (compact two columns) */}
          {!compact && (
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
              <div>
                <label className="text-[9.5px] text-gray-500 uppercase tracking-wider block mb-0.5">Crosslinker</label>
                <input
                  type="text"
                  value={f.crosslinker ?? ""}
                  onChange={(e) => onChange({ crosslinker: e.target.value || null })}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-0.5 text-[10.5px] text-white"
                />
              </div>
              <div>
                <label className="text-[9.5px] text-gray-500 uppercase tracking-wider block mb-0.5">μ (Pa·s)</label>
                <input
                  type="number"
                  step={0.5}
                  value={f.rheology?.viscosityPaS ?? 5}
                  onChange={(e) => onChange({
                    rheology: { ...(f.rheology ?? {}), viscosityPaS: parseFloat(e.target.value) || 0 },
                  })}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-0.5 text-[10.5px] text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[9.5px] text-gray-500 uppercase tracking-wider block mb-0.5">τ₀ (Pa)</label>
                <input
                  type="number"
                  step={5}
                  value={f.rheology?.yieldStressPa ?? 0}
                  onChange={(e) => onChange({
                    rheology: { ...(f.rheology ?? {}), yieldStressPa: parseFloat(e.target.value) || 0 },
                  })}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-0.5 text-[10.5px] text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[9.5px] text-gray-500 uppercase tracking-wider block mb-0.5">Cor (hex)</label>
                <input
                  type="color"
                  value={f.color}
                  onChange={(e) => onChange({ color: e.target.value })}
                  className="w-full h-6 rounded cursor-pointer bg-transparent"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
