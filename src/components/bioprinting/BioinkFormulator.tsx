"use client"

/**
 * BIA — Formulador de Biotinta Multi-Material
 * =============================================
 * Permite ao usuário formular uma biotinta combinando até 10 biomateriais
 * diferentes, com concentrações independentes e validação automática de
 * compatibilidade (ex.: GelMA + alginato, Col-I + fibrina, etc).
 */

import { useState, useMemo } from "react"
import {
  FlaskConical, Plus, X, AlertTriangle, CheckCircle2, Beaker, Search,
  Info, Sparkles, Droplets, BookOpen,
} from "lucide-react"
import {
  BIOMATERIALS, BIOMATERIAL_CATEGORIES, BIOINK_PRESETS,
  type Biomaterial,
} from "@/lib/bioprinting/biomaterials"
import { cn } from "@/lib/utils/helpers"

export interface BioinkComponent {
  biomaterialId: string
  concentration: number    // valor numérico
  unit: string            // "% m/v", "% v/v", "mg/mL", "mM"
  role?: string            // papel na formulação
}

export interface BioinkFormulation {
  name: string
  components: BioinkComponent[]
  totalConcentration: number  // soma % m/v equivalente
  crosslinkStrategy: string
  warnings: string[]
  bioactivityScore: number   // 0-100, estimativa
  printabilityScore: number  // 0-100
}

interface BioinkFormulatorProps {
  value: BioinkComponent[]
  onChange: (components: BioinkComponent[]) => void
  maxComponents?: number
  className?: string
}

export function BioinkFormulator({
  value,
  onChange,
  maxComponents = 10,
  className,
}: BioinkFormulatorProps) {
  const [showCatalog, setShowCatalog] = useState(false)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [showPresets, setShowPresets] = useState(false)

  const usedIds = useMemo(() => new Set(value.map((c) => c.biomaterialId)), [value])

  const filteredMaterials = useMemo(() => {
    return BIOMATERIALS.filter((m) => {
      if (usedIds.has(m.id)) return false
      if (categoryFilter !== "all" && m.category !== categoryFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          m.name.toLowerCase().includes(q) ||
          m.shortName.toLowerCase().includes(q) ||
          m.family.toLowerCase().includes(q) ||
          m.tissueApplications.some((t) => t.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [search, categoryFilter, usedIds])

  function addBiomaterial(m: Biomaterial) {
    if (value.length >= maxComponents) return
    const newComp: BioinkComponent = {
      biomaterialId: m.id,
      concentration: m.concentrationRange.typical,
      unit: m.concentrationRange.unit,
    }
    onChange([...value, newComp])
    setShowCatalog(false)
    setSearch("")
  }

  function removeComponent(index: number) {
    const next = [...value]
    next.splice(index, 1)
    onChange(next)
  }

  function updateComponent(index: number, patch: Partial<BioinkComponent>) {
    const next = [...value]
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  function applyPreset(preset: (typeof BIOINK_PRESETS)[number]) {
    onChange(
      preset.components.map((c) => ({
        biomaterialId: c.biomaterialId,
        concentration: c.concentration,
        unit: c.unit,
        role: c.role,
      })),
    )
    setShowPresets(false)
  }

  // Validação automática
  const warnings = useMemo(() => {
    const w: string[] = []
    if (value.length === 0) return w

    // total de concentração
    const totalPct = value.reduce((s, c) => {
      if (c.unit.includes("%")) return s + c.concentration
      return s
    }, 0)
    if (totalPct > 40) {
      w.push(`⚠️ Concentração total ${totalPct.toFixed(1)}% pode ser alta demais para extrusão (ideal ≤ 30%)`)
    }

    // Crosslinks incompatíveis
    const mats = value.map((c) => BIOMATERIALS.find((m) => m.id === c.biomaterialId)).filter(Boolean) as Biomaterial[]
    const allCrosslinks = new Set(mats.flatMap((m) => m.crosslink))
    if (allCrosslinks.has("ionic") && allCrosslinks.has("photo_UV") && mats.length > 2) {
      w.push("💡 Estratégia dupla de crosslink (iônico + fotocura) — garanta ordem correta na pós-impressão")
    }

    // Bioatividade
    const hasAdhesion = mats.some(
      (m) =>
        m.id === "gelma" ||
        m.id === "gelatin" ||
        m.id === "collagen_I" ||
        m.id === "collagen_II" ||
        m.id === "collagen_IV" ||
        m.id === "fibrinogen" ||
        m.id === "laminin" ||
        m.id === "rgd_peptide" ||
        m.id === "matrigel" ||
        m.id.startsWith("decm_"),
    )
    if (!hasAdhesion && mats.length > 0) {
      w.push("🧬 Nenhum motivo de adesão celular — considere adicionar RGD, GelMA ou Colágeno I")
    }

    // Viabilidade média baixa
    const avgViab = mats.reduce((s, m) => s + m.cellViability_24h_pct, 0) / Math.max(mats.length, 1)
    if (avgViab < 70) {
      w.push(`⚠️ Viabilidade média estimada: ${avgViab.toFixed(0)}% (baixa — revise componentes)`)
    }

    return w
  }, [value])

  const bioactivityScore = useMemo(() => {
    const mats = value
      .map((c) => BIOMATERIALS.find((m) => m.id === c.biomaterialId))
      .filter(Boolean) as Biomaterial[]
    if (mats.length === 0) return 0
    const naturalCount = mats.filter((m) => m.category === "natural" || m.category === "decellularized").length
    const hasAdhesion = mats.some(
      (m) => m.id === "gelma" || m.id === "collagen_I" || m.id === "gelatin" || m.id === "rgd_peptide",
    )
    const base = (naturalCount / mats.length) * 60 + (hasAdhesion ? 40 : 0)
    return Math.min(100, Math.round(base))
  }, [value])

  const printabilityScore = useMemo(() => {
    const mats = value
      .map((c) => BIOMATERIALS.find((m) => m.id === c.biomaterialId))
      .filter(Boolean) as Biomaterial[]
    if (mats.length === 0) return 0
    const allPrintable = mats.every((m) => m.printability.includes("extrusion"))
    const totalPct = value.reduce((s, c) => (c.unit.includes("%") ? s + c.concentration : s), 0)
    const tooDilute = totalPct < 3
    const tooConcentrated = totalPct > 35
    let score = 100
    if (!allPrintable) score -= 20
    if (tooDilute) score -= 30
    if (tooConcentrated) score -= 25
    if (mats.length > 5) score -= 10
    return Math.max(0, Math.round(score))
  }, [value])

  return (
    <div className={cn("space-y-4", className)}>
      {/* HEADER */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-emerald-400" />
            Formulação Multi-Material ({value.length}/{maxComponents})
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Combine até {maxComponents} biomateriais para criar uma biotinta otimizada para o seu tecido-alvo.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 border border-amber-500/40 text-amber-200 hover:bg-amber-500/30 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {showPresets ? "Fechar presets" : "Presets clássicos"}
          </button>
          {value.length < maxComponents && (
            <button
              onClick={() => setShowCatalog(!showCatalog)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {showCatalog ? "Fechar catálogo" : "Adicionar biomaterial"}
            </button>
          )}
        </div>
      </div>

      {/* PRESETS */}
      {showPresets && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 space-y-2">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            Formulações clássicas (literatura validada)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {BIOINK_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className="text-left p-3 rounded-lg bg-black/30 border border-white/10 hover:border-amber-400/50 hover:bg-amber-500/10 transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-sm text-white">{p.name}</div>
                  <span className="text-[10px] bg-amber-500/20 border border-amber-500/40 text-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wide">
                    {p.tissue}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mb-1.5 line-clamp-2">{p.description}</div>
                <div className="flex flex-wrap gap-1">
                  {p.components.map((c, i) => {
                    const m = BIOMATERIALS.find((b) => b.id === c.biomaterialId)
                    return (
                      <span key={i} className="text-[10px] bg-white/10 border border-white/20 text-gray-300 px-1.5 py-0.5 rounded">
                        {m?.icon} {m?.shortName} {c.concentration}
                        {c.unit.includes("%") ? "%" : ""}
                      </span>
                    )
                  })}
                </div>
                <div className="text-[10px] text-gray-500 mt-1.5">
                  📖 Ref: {p.reference}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CATÁLOGO DE BIOMATERIAIS */}
      {showCatalog && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, família ou tecido..."
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-black/40 border border-white/20 text-white placeholder-gray-500 focus:border-emerald-400 outline-none"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {BIOMATERIAL_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all",
                    categoryFilter === cat.id
                      ? "bg-emerald-500/30 border-emerald-400 text-emerald-100"
                      : "bg-black/30 border-white/10 text-gray-400 hover:border-white/30",
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
            {filteredMaterials.map((m) => (
              <button
                key={m.id}
                onClick={() => addBiomaterial(m)}
                className="text-left p-2.5 rounded-lg bg-black/40 border border-white/10 hover:border-emerald-400/50 hover:bg-emerald-500/10 transition-all group"
              >
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-lg flex-shrink-0">{m.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-white truncate">{m.name}</div>
                    <div className="text-[10px] text-emerald-400 uppercase tracking-wider">
                      {m.family} · {m.category}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-gray-400 line-clamp-2 mb-1.5">{m.description}</div>
                <div className="flex flex-wrap gap-1 text-[10px]">
                  <span className="bg-white/10 border border-white/20 text-gray-300 px-1.5 py-0.5 rounded">
                    {m.concentrationRange.min}–{m.concentrationRange.max} {m.concentrationRange.unit.replace(" m/v", "")}
                  </span>
                  <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 px-1.5 py-0.5 rounded">
                    Viab. {m.cellViability_24h_pct}%
                  </span>
                  <span className="bg-blue-500/20 border border-blue-500/40 text-blue-200 px-1.5 py-0.5 rounded">
                    {m.modulus_kPa.min}–{m.modulus_kPa.max} kPa
                  </span>
                </div>
              </button>
            ))}
            {filteredMaterials.length === 0 && (
              <div className="col-span-full p-4 text-center text-gray-500 text-sm">
                Nenhum biomaterial encontrado com os filtros atuais.
              </div>
            )}
          </div>
        </div>
      )}

      {/* LISTA DE COMPONENTES ATIVOS */}
      {value.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-white/10 bg-black/20 p-6 text-center">
          <Beaker className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            Nenhum biomaterial adicionado. Clique em <b className="text-emerald-400">&quot;Adicionar biomaterial&quot;</b> ou escolha um preset.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {value.map((comp, idx) => {
            const mat = BIOMATERIALS.find((m) => m.id === comp.biomaterialId)
            if (!mat) return null
            const outOfRange =
              comp.concentration < mat.concentrationRange.min ||
              comp.concentration > mat.concentrationRange.max
            return (
              <div
                key={idx}
                className={cn(
                  "rounded-xl border p-3",
                  outOfRange
                    ? "bg-amber-950/20 border-amber-500/40"
                    : "bg-black/40 border-white/10",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">{mat.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white">{mat.name}</span>
                          <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 px-1.5 py-0.5 rounded uppercase tracking-wide">
                            {mat.category}
                          </span>
                          <span className="text-[10px] text-gray-500">{mat.family}</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{mat.description}</p>
                      </div>
                      <button
                        onClick={() => removeComponent(idx)}
                        className="p-1 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
                        aria-label="Remover"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                      {/* Concentração */}
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                          Concentração
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step={0.1}
                            min={0}
                            value={comp.concentration}
                            onChange={(e) =>
                              updateComponent(idx, {
                                concentration: parseFloat(e.target.value) || 0,
                              })
                            }
                            className={cn(
                              "w-20 px-2 py-1 rounded-md bg-black/40 border text-sm text-white focus:outline-none",
                              outOfRange
                                ? "border-amber-400 focus:border-amber-300"
                                : "border-white/20 focus:border-emerald-400",
                            )}
                          />
                          <span className="text-[11px] text-gray-400">{comp.unit}</span>
                        </div>
                        <div className="text-[9px] text-gray-500 mt-0.5">
                          Típico: {mat.concentrationRange.typical} · Range: {mat.concentrationRange.min}–
                          {mat.concentrationRange.max}
                        </div>
                      </div>

                      {/* Papel na formulação */}
                      <div className="md:col-span-2">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                          Papel na formulação (opcional)
                        </label>
                        <input
                          type="text"
                          value={comp.role ?? ""}
                          onChange={(e) => updateComponent(idx, { role: e.target.value })}
                          placeholder="ex.: estrutura, bioatividade, reforço mecânico..."
                          className="w-full px-2 py-1 rounded-md bg-black/40 border border-white/20 text-sm text-white placeholder-gray-600 focus:border-emerald-400 outline-none"
                        />
                      </div>
                    </div>

                    {/* Info quick */}
                    <div className="flex flex-wrap gap-1.5 mt-2 text-[10px]">
                      <span className="bg-black/40 border border-white/10 text-gray-300 px-1.5 py-0.5 rounded">
                        Viab: {mat.cellViability_24h_pct}%
                      </span>
                      <span className="bg-black/40 border border-white/10 text-gray-300 px-1.5 py-0.5 rounded">
                        Módulo: {mat.modulus_kPa.min}–{mat.modulus_kPa.max} kPa
                      </span>
                      <span className="bg-black/40 border border-white/10 text-gray-300 px-1.5 py-0.5 rounded">
                        Crosslink: {mat.crosslink.join(", ")}
                      </span>
                      {mat.regulatoryStatus && (
                        <span className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded">
                          ✓ {mat.regulatoryStatus}
                        </span>
                      )}
                      {outOfRange && (
                        <span className="bg-amber-950/40 border border-amber-500/40 text-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Fora do range típico
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* SCORE DA FORMULAÇÃO */}
      {value.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ScoreCard
            label="Bioatividade"
            score={bioactivityScore}
            icon={<Droplets className="w-4 h-4" />}
            colorOk="emerald"
            tooltip="Presença de motivos de adesão celular (RGD, colágeno, laminina) e componentes da MEC"
          />
          <ScoreCard
            label="Printabilidade"
            score={printabilityScore}
            icon={<FlaskConical className="w-4 h-4" />}
            colorOk="blue"
            tooltip="Viscosidade, shear-thinning, estabilidade de forma pós-impressão"
          />
        </div>
      )}

      {/* WARNINGS */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            Avisos da Formulação
          </div>
          {warnings.map((w, i) => (
            <div key={i} className="text-xs text-amber-100/90 flex items-start gap-2">
              <span className="mt-0.5">•</span>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {value.length > 0 && warnings.length === 0 && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3 flex items-center gap-2 text-sm text-emerald-200">
          <CheckCircle2 className="w-4 h-4" />
          Formulação validada — todos os parâmetros dentro de ranges recomendados.
        </div>
      )}
    </div>
  )
}

function ScoreCard({
  label,
  score,
  icon,
  colorOk,
  tooltip,
}: {
  label: string
  score: number
  icon: React.ReactNode
  colorOk: "emerald" | "blue"
  tooltip: string
}) {
  const color =
    score >= 70
      ? colorOk === "emerald"
        ? "emerald"
        : "blue"
      : score >= 40
        ? "amber"
        : "red"
  const colorMap: Record<string, string> = {
    emerald: "from-emerald-600 to-green-500 border-emerald-500/50 text-emerald-200",
    blue: "from-blue-600 to-cyan-500 border-blue-500/50 text-blue-200",
    amber: "from-amber-600 to-orange-500 border-amber-500/50 text-amber-200",
    red: "from-red-600 to-rose-500 border-red-500/50 text-red-200",
  }
  return (
    <div className={cn("rounded-xl border p-3 bg-gradient-to-br", colorMap[color])} title={tooltip}>
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
        <Info className="w-3 h-3 opacity-50 ml-auto" />
      </div>
      <div className="flex items-end justify-between">
        <div className="text-3xl font-black">{score}</div>
        <div className="text-xs opacity-75">/100</div>
      </div>
      <div className="w-full h-1.5 bg-black/30 rounded-full mt-2 overflow-hidden">
        <div
          className="h-full bg-white/60 rounded-full transition-all duration-500"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}
