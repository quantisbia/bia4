/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  MultiBioinkSelector — Seletor compacto multi-biotinta (R12.55)
 *
 *  Widget enxuto para o Modo BÁSICO do /slice. Permite ao usuário adicionar
 *  1..N formulações (bioink/hidrogel) e definir a fração de cada uma. Todos
 *  os presets vêm do MATERIAL_SUMMARY (parseado do CSV CECT — 128 materiais
 *  únicos, 803 entradas de literatura).
 *
 *  Diferente do BioinkMultiMaterialFormulator.tsx (mais completo, com
 *  tools T0..T3 e cores), este é focado em blend homogêneo pré-misturado
 *  numa única ponta — que é o caso mais comum em bioimpressão de pesquisa.
 *
 *  Output: QuickMultiBioink (compatível com generateQuickGcodeMulti).
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

"use client"

import { useMemo, useState } from "react"
import {
  Beaker, Plus, Trash2, Info, AlertTriangle, Check, Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import {
  MATERIAL_SUMMARY,
  getRecommendedParams,
  needleToDiameterUm,
  pressureToKPa,
  type MaterialSummary,
} from "@/lib/bioprint/material-database"
import type {
  QuickBioinkFormulation, QuickMultiBioink,
} from "@/lib/bioprint/quick-gcode"

// ─── Props ──────────────────────────────────────────────────────────────

export interface MultiBioinkSelectorProps {
  value: QuickMultiBioink
  onChange: (blend: QuickMultiBioink) => void
  /** Máximo de formulações simultâneas (default 4) */
  maxFormulations?: number
  /** Compacto: mostra menos texto explicativo */
  compact?: boolean
  className?: string
}

// ─── Presets rápidos (mixes clássicos da literatura) ────────────────────

interface QuickBlendPreset {
  id: string
  label: string
  hint: string
  formulations: Array<{
    materialName: string   // nome que existe em MATERIAL_SUMMARY (após alias canonicalization)
    fraction: number
    materialLabel: string
    nozzleDiameter_mm: number
    viscosity_PaS: number
    printSpeed_mms: number
    travelSpeed_mms: number
    pressure_kpa?: number
    crosslinker?: string
  }>
}

/**
 * Blends comuns da literatura (validados por DOI real no CSV).
 * A ordem prioriza: 1× GelMA (versátil), 2× Alginato (barato), 3× Colágeno (viável)
 * e blends multi-componente clássicos.
 */
export const QUICK_BLEND_PRESETS: QuickBlendPreset[] = [
  {
    id: "gelma-10-solo",
    label: "GelMA 10% (solo)",
    hint: "Versátil · foto-crosslink · maioria dos tecidos",
    formulations: [
      {
        materialName: "GelMA", fraction: 1.0,
        materialLabel: "GelMA 10% w/v",
        nozzleDiameter_mm: 0.41, viscosity_PaS: 5,
        printSpeed_mms: 8, travelSpeed_mms: 30,
        pressure_kpa: 80, crosslinker: "UV 365nm + LAP 0.3%",
      },
    ],
  },
  {
    id: "alginate-3-solo",
    label: "Alginato 3% (solo)",
    hint: "Iônico · gelifica em CaCl₂ · barato",
    formulations: [
      {
        materialName: "Alginate", fraction: 1.0,
        materialLabel: "Alginato de Sódio 3% w/v",
        nozzleDiameter_mm: 0.41, viscosity_PaS: 3,
        printSpeed_mms: 6, travelSpeed_mms: 25,
        pressure_kpa: 60, crosslinker: "CaCl₂ 100 mM",
      },
    ],
  },
  {
    id: "fibrin-gelatin-ha",
    label: "Fibrinogênio + Gelatina + HA",
    hint: "Blend clássico Nature Biotech · pele/músculo",
    formulations: [
      {
        materialName: "Fibrinogen", fraction: 0.6,
        materialLabel: "Fibrinogênio 20 mg/mL",
        nozzleDiameter_mm: 0.30, viscosity_PaS: 0.5,
        printSpeed_mms: 3, travelSpeed_mms: 15,
        pressure_kpa: 60, crosslinker: "Trombina 2 U/mL",
      },
      {
        materialName: "Gelatin", fraction: 0.35,
        materialLabel: "Gelatina 35 mg/mL",
        nozzleDiameter_mm: 0.30, viscosity_PaS: 2,
        printSpeed_mms: 3, travelSpeed_mms: 15,
        pressure_kpa: 60,
      },
      {
        materialName: "Hyaluronic Acid", fraction: 0.05,
        materialLabel: "Ácido Hialurônico 3 mg/mL",
        nozzleDiameter_mm: 0.30, viscosity_PaS: 8,
        printSpeed_mms: 3, travelSpeed_mms: 15,
        pressure_kpa: 60,
      },
    ],
  },
  {
    id: "gelma-alginate-blend",
    label: "GelMA 8% + Alginato 2%",
    hint: "Blend duplo · rigidez + viabilidade celular",
    formulations: [
      {
        materialName: "GelMA", fraction: 0.8,
        materialLabel: "GelMA 8% w/v",
        nozzleDiameter_mm: 0.41, viscosity_PaS: 4,
        printSpeed_mms: 7, travelSpeed_mms: 30,
        pressure_kpa: 70, crosslinker: "UV 365nm + LAP 0.3%",
      },
      {
        materialName: "Alginate", fraction: 0.2,
        materialLabel: "Alginato 2% w/v",
        nozzleDiameter_mm: 0.41, viscosity_PaS: 2,
        printSpeed_mms: 7, travelSpeed_mms: 30,
        pressure_kpa: 70, crosslinker: "CaCl₂ 100 mM",
      },
    ],
  },
  {
    id: "collagen-solo",
    label: "Colágeno I (solo)",
    hint: "Imprime a 4°C · gelifica a 37°C · pele/tendão",
    formulations: [
      {
        materialName: "Collagen", fraction: 1.0,
        materialLabel: "Colágeno Tipo I 3 mg/mL",
        nozzleDiameter_mm: 0.41, viscosity_PaS: 1,
        printSpeed_mms: 5, travelSpeed_mms: 20,
        pressure_kpa: 40, crosslinker: "Térmico 37°C",
      },
    ],
  },
  {
    id: "pcl-solo",
    label: "PCL 100% (rígido)",
    hint: "Osso · scaffolds duros · 90-160°C",
    formulations: [
      {
        materialName: "PCL", fraction: 1.0,
        materialLabel: "PCL 100% w/w (fusão)",
        nozzleDiameter_mm: 0.41, viscosity_PaS: 200,
        printSpeed_mms: 3, travelSpeed_mms: 15,
        pressure_kpa: 500,
      },
    ],
  },
  {
    id: "pcl-ha-composite",
    label: "PCL 85% + Hidroxiapatita 15%",
    hint: "Compósito osso · scaffolds mineralizados",
    formulations: [
      {
        materialName: "PCL", fraction: 0.85,
        materialLabel: "PCL 85% w/w",
        nozzleDiameter_mm: 0.41, viscosity_PaS: 200,
        printSpeed_mms: 1.2, travelSpeed_mms: 15,
        pressure_kpa: 450,
      },
      {
        materialName: "Hydroxyapatite", fraction: 0.15,
        materialLabel: "Hidroxiapatita 15% w/w",
        nozzleDiameter_mm: 0.41, viscosity_PaS: 300,
        printSpeed_mms: 1.2, travelSpeed_mms: 15,
        pressure_kpa: 450,
      },
    ],
  },
]

// ─── Helper: material picker (dropdown do CSV) ──────────────────────────

const TOP_MATERIALS_LIMIT = 30 // primeiros 30 do MATERIAL_SUMMARY (ordenado por freq)

function MaterialPicker({
  value, onChange, disabled,
}: {
  value: string
  onChange: (mat: string) => void
  disabled?: boolean
}) {
  const materials = MATERIAL_SUMMARY.slice(0, TOP_MATERIALS_LIMIT)

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
    >
      <option value="">— escolher material —</option>
      {materials.map((m) => (
        <option key={m.material} value={m.material}>
          {m.material} ({m.count} refs)
        </option>
      ))}
    </select>
  )
}

// ─── Card de uma formulação ──────────────────────────────────────────────

function FormulationRow({
  formulation, index, canRemove, onChange, onRemove,
}: {
  formulation: QuickBioinkFormulation
  index: number
  canRemove: boolean
  onChange: (patch: Partial<QuickBioinkFormulation>) => void
  onRemove: () => void
}) {
  // Extrai nome do material (primeira palavra do label, sem %)
  const materialGuess = formulation.materialLabel.split(/\s+/)[0]
  const [selectedMaterial, setSelectedMaterial] = useState<string>(materialGuess)

  const summary = useMemo<MaterialSummary | undefined>(
    () => MATERIAL_SUMMARY.find(m => m.material === selectedMaterial),
    [selectedMaterial]
  )

  // Se um material da BD é selecionado, aplica valores recomendados
  function applyMaterialDefaults(matName: string) {
    setSelectedMaterial(matName)
    const rec = getRecommendedParams(matName)
    if (!rec) return
    const pressureMid = rec.pressureKPa
      ? (rec.pressureKPa.min + rec.pressureKPa.max) / 2
      : undefined
    const speedMid = rec.speedMmS
      ? (rec.speedMmS.min + rec.speedMmS.max) / 2
      : undefined
    onChange({
      materialLabel: matName,
      pressure_kpa: pressureMid !== undefined ? Math.round(pressureMid) : formulation.pressure_kpa,
      printSpeed_mms: speedMid !== undefined ? Math.round(speedMid * 10) / 10 : formulation.printSpeed_mms,
    })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-3 shadow-sm dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
      {/* Header do card */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
            {index + 1}
          </div>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Componente {index + 1}
          </span>
          {summary && (
            <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              📖 {summary.count} refs CSV
            </span>
          )}
        </div>
        {canRemove && (
          <button
            onClick={onRemove}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
            title="Remover componente"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Linha 1: material + label */}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <label className="text-xs">
          <span className="mb-0.5 block font-medium text-gray-600 dark:text-gray-400">
            Material (BD literatura)
          </span>
          <MaterialPicker
            value={selectedMaterial}
            onChange={applyMaterialDefaults}
          />
        </label>
        <label className="text-xs">
          <span className="mb-0.5 block font-medium text-gray-600 dark:text-gray-400">
            Descrição livre (concentração/spec)
          </span>
          <input
            type="text"
            value={formulation.materialLabel}
            onChange={(e) => onChange({ materialLabel: e.target.value })}
            placeholder="ex: GelMA 10% w/v"
            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
        </label>
      </div>

      {/* Linha 2: fração + nozzle + viscosidade + velocidade + pressão */}
      <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-5">
        <label className="text-xs">
          <span className="mb-0.5 block font-medium text-gray-600 dark:text-gray-400">
            Fração
          </span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={formulation.fraction}
              onChange={(e) => onChange({ fraction: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
            <span className="text-xs text-gray-500">
              ({(formulation.fraction * 100).toFixed(0)}%)
            </span>
          </div>
        </label>
        <label className="text-xs">
          <span className="mb-0.5 block font-medium text-gray-600 dark:text-gray-400">
            Ø bico (mm)
          </span>
          <input
            type="number"
            min={0.1}
            max={2.0}
            step={0.05}
            value={formulation.nozzleDiameter_mm}
            onChange={(e) => onChange({ nozzleDiameter_mm: parseFloat(e.target.value) || 0.41 })}
            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
        </label>
        <label className="text-xs">
          <span className="mb-0.5 block font-medium text-gray-600 dark:text-gray-400">
            η (Pa·s)
          </span>
          <input
            type="number"
            min={0.1}
            step={0.5}
            value={formulation.viscosity_PaS}
            onChange={(e) => onChange({ viscosity_PaS: parseFloat(e.target.value) || 5 })}
            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
        </label>
        <label className="text-xs">
          <span className="mb-0.5 block font-medium text-gray-600 dark:text-gray-400">
            v (mm/s)
          </span>
          <input
            type="number"
            min={0.1}
            step={0.5}
            value={formulation.printSpeed_mms}
            onChange={(e) => onChange({ printSpeed_mms: parseFloat(e.target.value) || 5 })}
            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
        </label>
        <label className="text-xs">
          <span className="mb-0.5 block font-medium text-gray-600 dark:text-gray-400">
            P (kPa)
          </span>
          <input
            type="number"
            min={0}
            step={5}
            value={formulation.pressure_kpa ?? ""}
            onChange={(e) => onChange({ pressure_kpa: e.target.value ? parseFloat(e.target.value) : undefined })}
            placeholder="—"
            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
        </label>
      </div>

      {/* Range validation contra CSV */}
      {summary && (
        <div className="mt-2 rounded-md bg-blue-50 px-2 py-1.5 text-[11px] text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
          <Info className="mr-1 inline h-3 w-3" />
          <b>Faixas típicas na literatura:</b>{" "}
          {summary.pressureKPa && (
            <>P {summary.pressureKPa.min.toFixed(0)}-{summary.pressureKPa.max.toFixed(0)} kPa · </>
          )}
          {summary.speedMmS && (
            <>v {summary.speedMmS.min.toFixed(1)}-{summary.speedMmS.max.toFixed(1)} mm/s · </>
          )}
          {summary.temperatureC && (
            <>T {summary.temperatureC.min.toFixed(0)}-{summary.temperatureC.max.toFixed(0)}°C</>
          )}
        </div>
      )}

      {/* Crosslinker (linha opcional) */}
      <label className="mt-2 block text-xs">
        <span className="mb-0.5 block font-medium text-gray-600 dark:text-gray-400">
          Crosslinker (opcional)
        </span>
        <input
          type="text"
          value={formulation.crosslinker ?? ""}
          onChange={(e) => onChange({ crosslinker: e.target.value || null })}
          placeholder="ex: UV 365nm + LAP 0.3%"
          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />
      </label>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────

export function MultiBioinkSelector({
  value,
  onChange,
  maxFormulations = 4,
  compact = false,
  className,
}: MultiBioinkSelectorProps) {
  const fractionSum = value.reduce((s, b) => s + (b.fraction || 0), 0)
  const fractionOk = Math.abs(fractionSum - 1.0) <= 0.05
  const cellsTotal = value.filter(b => b.hasCells).length

  function addFormulation() {
    if (value.length >= maxFormulations) return
    const newForm: QuickBioinkFormulation = {
      fraction: value.length === 0 ? 1.0 : 0.1,
      materialLabel: "Novo componente",
      nozzleDiameter_mm: 0.41,
      viscosity_PaS: 5,
      printSpeed_mms: 8,
      travelSpeed_mms: 30,
      pressure_kpa: 80,
      hasCells: false,
    }
    // Rebalance existing fractions to make room
    if (value.length > 0 && value.length < maxFormulations) {
      const newFractionForNew = 1.0 / (value.length + 1)
      const scale = (1.0 - newFractionForNew) / fractionSum
      const rebalanced = value.map(b => ({ ...b, fraction: b.fraction * scale }))
      onChange([...rebalanced, { ...newForm, fraction: newFractionForNew }])
    } else {
      onChange([...value, newForm])
    }
  }

  function removeFormulation(idx: number) {
    if (value.length <= 1) return
    const remaining = value.filter((_, i) => i !== idx)
    // Renormaliza
    const s = remaining.reduce((a, b) => a + b.fraction, 0)
    const normalized = remaining.map(b => ({ ...b, fraction: b.fraction / s }))
    onChange(normalized)
  }

  function updateFormulation(idx: number, patch: Partial<QuickBioinkFormulation>) {
    const next = value.map((b, i) => (i === idx ? { ...b, ...patch } : b))
    onChange(next)
  }

  function normalizeFractions() {
    if (fractionSum <= 0) return
    onChange(value.map(b => ({ ...b, fraction: b.fraction / fractionSum })))
  }

  function loadPreset(presetId: string) {
    const preset = QUICK_BLEND_PRESETS.find(p => p.id === presetId)
    if (!preset) return
    const forms: QuickBioinkFormulation[] = preset.formulations.map(f => ({
      fraction: f.fraction,
      materialLabel: f.materialLabel,
      nozzleDiameter_mm: f.nozzleDiameter_mm,
      viscosity_PaS: f.viscosity_PaS,
      printSpeed_mms: f.printSpeed_mms,
      travelSpeed_mms: f.travelSpeed_mms,
      pressure_kpa: f.pressure_kpa,
      crosslinker: f.crosslinker ?? null,
      hasCells: false,
    }))
    onChange(forms)
  }

  return (
    <section className={cn("space-y-3", className)}>
      {/* Header */}
      <header className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
              Biotinta / Blend Multi-material
            </h3>
            <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
              {value.length} componente{value.length !== 1 ? "s" : ""}
            </span>
          </div>
          {!compact && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Bioimpressão prática mistura vários componentes numa mesma ponta.
              Adicione 1..{maxFormulations} formulações; as frações somam 100%.
            </p>
          )}
        </div>
        <button
          onClick={addFormulation}
          disabled={value.length >= maxFormulations}
          className={cn(
            "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium shadow-sm transition",
            value.length < maxFormulations
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </button>
      </header>

      {/* Presets rápidos */}
      {!compact && (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            <Sparkles className="mr-1 inline h-3 w-3" />
            Blend pronto (opcional)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_BLEND_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => loadPreset(preset.id)}
                title={preset.hint}
                className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
              >
                {preset.label}
                {preset.formulations.length > 1 && (
                  <span className="ml-1 opacity-60">
                    ({preset.formulations.length}×)
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista de formulações */}
      <div className="space-y-2">
        {value.map((f, idx) => (
          <FormulationRow
            key={idx}
            formulation={f}
            index={idx}
            canRemove={value.length > 1}
            onChange={(patch) => updateFormulation(idx, patch)}
            onRemove={() => removeFormulation(idx)}
          />
        ))}
      </div>

      {/* Sumário: soma das frações + validação */}
      <div
        className={cn(
          "flex items-center justify-between rounded-lg border px-3 py-2 text-xs",
          fractionOk
            ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
            : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
        )}
      >
        <div className="flex items-center gap-1.5">
          {fractionOk ? (
            <Check className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <span>
            <b>Soma das frações:</b> {(fractionSum * 100).toFixed(1)}%
            {fractionOk ? " · pronto para gerar G-code" : " · ajuste ou normalize"}
          </span>
        </div>
        {!fractionOk && (
          <button
            onClick={normalizeFractions}
            className="rounded-md bg-amber-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-amber-700"
          >
            Normalizar
          </button>
        )}
      </div>
    </section>
  )
}

// ─── Helper de default (para consumer conveniência) ─────────────────────

export function defaultMultiBioink(): QuickMultiBioink {
  return [
    {
      fraction: 1.0,
      materialLabel: "GelMA 10% w/v",
      nozzleDiameter_mm: 0.41,
      viscosity_PaS: 5,
      printSpeed_mms: 8,
      travelSpeed_mms: 30,
      pressure_kpa: 80,
      crosslinker: "UV 365nm + LAP 0.3%",
      hasCells: false,
    },
  ]
}
