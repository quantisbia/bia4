"use client"

import { useState, useCallback } from "react"
import {
  Download, Box, RefreshCw, Settings, ChevronDown, ChevronUp,
  FileCode2, Layers, Ruler, CheckCircle2, Info, AlertTriangle,
  ShieldCheck, Activity, BarChart3
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import {
  GEOMETRIES, generateGeometry, downloadSTL, downloadOBJ, downloadPLY,
  estimateFileSize, type GeometryParams, type STLGeometry, type Triangle
} from "@/lib/stl/generator"
import { BIOMIMETIC_GEOMETRIES } from "@/lib/stl/biomimetic-tissues"
import { validateMesh, formatVolume, formatArea, type ValidationReport } from "@/lib/stl/mesh-validator"

// Lista combinada apresentada ao usuário em 3 grupos: Clássicos + Biomiméticos + Testes
const ALL_GEOMETRIES: STLGeometry[] = [...GEOMETRIES, ...BIOMIMETIC_GEOMETRIES]
const BIOMIMETIC_IDS = new Set(BIOMIMETIC_GEOMETRIES.filter(g => g.category === "biomimetic").map(g => g.id))
const PRINTABILITY_IDS = new Set(BIOMIMETIC_GEOMETRIES.filter(g => g.category === "printability_test").map(g => g.id))

// ─── Preview 3D simples via SVG isométrico ─────────────────────────────────
function IsoPreview({ id }: { id: string }) {
  const previews: Record<string, React.ReactNode> = {
    membrane: (
      <svg viewBox="0 0 120 80" className="w-full h-full">
        <defs><linearGradient id="gm" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#6366f1"/></linearGradient></defs>
        <polygon points="20,60 100,60 100,68 20,68" fill="#818cf8" opacity="0.8"/>
        <polygon points="20,60 100,60 105,52 25,52" fill="#a5b4fc" opacity="0.9"/>
        <polygon points="100,60 105,52 105,60 100,68" fill="#4338ca" opacity="0.7"/>
      </svg>
    ),
    disk: (
      <svg viewBox="0 0 120 100" className="w-full h-full">
        <ellipse cx="60" cy="70" rx="40" ry="12" fill="#6366f1" opacity="0.8"/>
        <ellipse cx="60" cy="58" rx="40" ry="12" fill="#818cf8" opacity="0.9"/>
        <rect x="20" y="58" width="80" height="12" fill="#4f46e5" opacity="0.8"/>
        <ellipse cx="60" cy="58" rx="40" ry="12" fill="#a5b4fc" opacity="0.85"/>
      </svg>
    ),
    bone_block: (
      <svg viewBox="0 0 120 100" className="w-full h-full">
        <polygon points="20,75 70,75 70,30 20,30" fill="#818cf8" opacity="0.7"/>
        <polygon points="70,75 100,60 100,15 70,30" fill="#4338ca" opacity="0.8"/>
        <polygon points="20,30 70,30 100,15 50,15" fill="#a5b4fc" opacity="0.9"/>
        <circle cx="35" cy="50" r="5" fill="#0f0f1a" opacity="0.6"/>
        <circle cx="55" cy="50" r="5" fill="#0f0f1a" opacity="0.6"/>
        <circle cx="35" cy="65" r="5" fill="#0f0f1a" opacity="0.6"/>
        <circle cx="55" cy="65" r="5" fill="#0f0f1a" opacity="0.6"/>
      </svg>
    ),
    cube_tissue: (
      <svg viewBox="0 0 120 100" className="w-full h-full">
        <polygon points="20,75 70,75 70,30 20,30" fill="#34d399" opacity="0.7"/>
        <polygon points="70,75 95,60 95,15 70,30" fill="#059669" opacity="0.8"/>
        <polygon points="20,30 70,30 95,15 45,15" fill="#6ee7b7" opacity="0.9"/>
        <circle cx="38" cy="52" r="4" fill="#0f0f1a" opacity="0.5"/>
        <circle cx="55" cy="52" r="4" fill="#0f0f1a" opacity="0.5"/>
      </svg>
    ),
    vessel: (
      <svg viewBox="0 0 120 100" className="w-full h-full">
        <ellipse cx="60" cy="75" rx="18" ry="6" fill="#f43f5e" opacity="0.8"/>
        <rect x="42" y="25" width="36" height="50" fill="#fb7185" opacity="0.7"/>
        <rect x="46" y="25" width="28" height="50" fill="#0f0f1a" opacity="0.4"/>
        <ellipse cx="60" cy="25" rx="18" ry="6" fill="#fda4af" opacity="0.9"/>
        <ellipse cx="60" cy="25" rx="14" ry="4" fill="#0f0f1a" opacity="0.6"/>
      </svg>
    ),
    hexagonal_liver: (
      <svg viewBox="0 0 120 100" className="w-full h-full">
        <polygon points="60,15 90,32 90,68 60,85 30,68 30,32" fill="#fbbf24" opacity="0.7"/>
        <polygon points="60,22 84,36 84,64 60,78 36,64 36,36" fill="#fde68a" opacity="0.5"/>
        <circle cx="60" cy="50" r="8" fill="#d97706" opacity="0.8"/>
      </svg>
    ),
    femur: (
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <ellipse cx="55" cy="20" rx="20" ry="14" fill="#a78bfa" opacity="0.8"/>
        <rect x="48" y="20" width="14" height="65" fill="#818cf8" opacity="0.8"/>
        <ellipse cx="55" cy="85" rx="16" ry="10" fill="#6d28d9" opacity="0.8"/>
        <ellipse cx="55" cy="20" rx="20" ry="14" fill="#c4b5fd" opacity="0.7"/>
      </svg>
    ),
    nose: (
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <path d="M 60 15 L 85 85 Q 60 100 35 85 Z" fill="#f9a8d4" opacity="0.8"/>
        <path d="M 60 15 L 85 85 Q 72 78 60 80 Z" fill="#ec4899" opacity="0.7"/>
        <ellipse cx="47" cy="87" rx="14" ry="7" fill="#f472b6" opacity="0.8"/>
        <ellipse cx="73" cy="87" rx="14" ry="7" fill="#f472b6" opacity="0.8"/>
      </svg>
    ),
    meniscus: (
      <svg viewBox="0 0 120 80" className="w-full h-full">
        <path d="M 10 50 A 50 30 0 0 1 110 50 L 100 55 A 40 20 0 0 0 20 55 Z" fill="#22d3ee" opacity="0.8"/>
        <path d="M 10 42 A 50 30 0 0 1 110 42" fill="none" stroke="#67e8f9" strokeWidth="8" strokeLinecap="round"/>
      </svg>
    ),
    cornea: (
      <svg viewBox="0 0 120 80" className="w-full h-full">
        <path d="M 30 55 A 30 20 0 0 1 90 55 L 84 60 A 24 15 0 0 0 36 60 Z" fill="#06b6d4" opacity="0.85"/>
        <path d="M 30 48 A 30 20 0 0 1 90 48" fill="none" stroke="#67e8f9" strokeWidth="5" strokeLinecap="round"/>
        <ellipse cx="60" cy="48" rx="12" ry="8" fill="#0e7490" opacity="0.7"/>
      </svg>
    ),
    lens: (
      <svg viewBox="0 0 120 80" className="w-full h-full">
        <ellipse cx="60" cy="55" rx="35" ry="12" fill="#60a5fa" opacity="0.8"/>
        <ellipse cx="60" cy="43" rx="35" ry="12" fill="#93c5fd" opacity="0.9"/>
        <rect x="25" y="43" width="70" height="12" fill="#3b82f6" opacity="0.7"/>
      </svg>
    ),
    organoid_sphere: (
      <svg viewBox="0 0 120 100" className="w-full h-full">
        <ellipse cx="60" cy="75" rx="35" ry="10" fill="#1f2937" opacity="0.5"/>
        <circle cx="60" cy="50" r="32" fill="#d97706" opacity="0.15"/>
        <circle cx="60" cy="50" r="32" fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.6"/>
        <circle cx="60" cy="50" r="22" fill="#fbbf24" opacity="0.7"/>
        <circle cx="52" cy="43" r="5" fill="#fde68a" opacity="0.8"/>
      </svg>
    ),
    tpms_gyroid: (
      <svg viewBox="0 0 120 100" className="w-full h-full">
        <defs>
          <pattern id="gyr" patternUnits="userSpaceOnUse" width="20" height="20">
            <path d="M 0 10 Q 5 0 10 10 T 20 10" fill="none" stroke="#a78bfa" strokeWidth="2" opacity="0.8"/>
            <path d="M 10 0 Q 0 5 10 10 T 10 20" fill="none" stroke="#7c3aed" strokeWidth="2" opacity="0.6"/>
          </pattern>
        </defs>
        <rect x="20" y="20" width="80" height="60" fill="url(#gyr)" rx="4"/>
        <rect x="20" y="20" width="80" height="60" fill="none" stroke="#a78bfa" strokeWidth="2" opacity="0.4" rx="4"/>
      </svg>
    ),
    tpms_schwarz: (
      <svg viewBox="0 0 120 100" className="w-full h-full">
        <g opacity="0.85">
          <circle cx="35" cy="35" r="10" fill="none" stroke="#60a5fa" strokeWidth="2.5"/>
          <circle cx="65" cy="35" r="10" fill="none" stroke="#60a5fa" strokeWidth="2.5"/>
          <circle cx="95" cy="35" r="10" fill="none" stroke="#60a5fa" strokeWidth="2.5"/>
          <circle cx="35" cy="65" r="10" fill="none" stroke="#60a5fa" strokeWidth="2.5"/>
          <circle cx="65" cy="65" r="10" fill="none" stroke="#60a5fa" strokeWidth="2.5"/>
          <circle cx="95" cy="65" r="10" fill="none" stroke="#60a5fa" strokeWidth="2.5"/>
          <line x1="20" y1="20" x2="110" y2="20" stroke="#3b82f6" strokeWidth="1" opacity="0.4"/>
          <line x1="20" y1="80" x2="110" y2="80" stroke="#3b82f6" strokeWidth="1" opacity="0.4"/>
        </g>
      </svg>
    ),
    tpms_diamond: (
      <svg viewBox="0 0 120 100" className="w-full h-full">
        <g opacity="0.9" fill="none" strokeWidth="2">
          <polygon points="60,20 80,50 60,80 40,50" stroke="#06b6d4"/>
          <polygon points="30,30 50,50 30,70 10,50" stroke="#0891b2"/>
          <polygon points="90,30 110,50 90,70 70,50" stroke="#0891b2"/>
          <line x1="60" y1="20" x2="30" y2="30" stroke="#22d3ee" opacity="0.5"/>
          <line x1="60" y1="20" x2="90" y2="30" stroke="#22d3ee" opacity="0.5"/>
          <line x1="60" y1="80" x2="30" y2="70" stroke="#22d3ee" opacity="0.5"/>
          <line x1="60" y1="80" x2="90" y2="70" stroke="#22d3ee" opacity="0.5"/>
        </g>
      </svg>
    ),
  }
  return (
    <div className="w-full h-28 flex items-center justify-center">
      {previews[id] ?? <Box className="w-12 h-12 text-gray-600" />}
    </div>
  )
}

// ─── Param Editor ─────────────────────────────────────────────────────────────
function ParamEditor({
  geo, params, onChange
}: { geo: STLGeometry; params: GeometryParams; onChange: (k: string, v: number) => void }) {
  const fields = Object.entries(geo.paramLabels)
  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map(([key, label]) => (
        <div key={key}>
          <label className="text-xs text-gray-400 block mb-1">{label}</label>
          <input
            type="number"
            value={(params as Record<string, number>)[key] ?? geo.defaultParams[key as keyof GeometryParams] ?? 0}
            onChange={e => onChange(key, parseFloat(e.target.value) || 0)}
            step={key.includes("Percent") || key.includes("infill") ? 5 : 0.5}
            min={key.includes("Percent") ? 10 : 0.5}
            max={key.includes("Percent") ? 100 : key.includes("segments") ? 128 : 500}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white 
              focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20"
          />
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function STLGeneratorPage() {
  const [selected, setSelected] = useState<STLGeometry>(GEOMETRIES[0])
  const [params, setParams] = useState<GeometryParams>({ ...GEOMETRIES[0].defaultParams })
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [showParams, setShowParams] = useState(true)
  const [triangleCount, setTriangleCount] = useState(0)
  const [sizes, setSizes] = useState({ stlBinary: 0, stlAscii: 0, obj: 0, ply: 0 })
  const [validation, setValidation] = useState<ValidationReport | null>(null)
  const [cachedTris, setCachedTris] = useState<Triangle[]>([])

  const handleSelectGeo = (geo: STLGeometry) => {
    setSelected(geo)
    setParams({ ...geo.defaultParams })
    setGenerated(false)
    setTriangleCount(0)
    setValidation(null)
    setCachedTris([])
  }

  const handleParamChange = (key: string, val: number) => {
    setParams(prev => ({ ...prev, [key]: val }))
    setGenerated(false)
    setValidation(null)
  }

  const handleGenerate = useCallback(() => {
    setGenerating(true)
    setTimeout(() => {
      const tris = generateGeometry(selected.id, params)
      setCachedTris(tris)
      setTriangleCount(tris.length)
      setSizes(estimateFileSize(tris))
      // Validar mesh — apenas para meshes pequenos a médios (TPMS pode ser lento)
      try {
        const report = tris.length > 200_000
          ? null
          : validateMesh(tris, { nozzleDiameterMm: 0.4, application: "bioprinting" })
        setValidation(report)
      } catch (e) {
        console.error("Validation error", e)
        setValidation(null)
      }
      setGenerated(true)
      setGenerating(false)
    }, 80)
  }, [selected.id, params])

  const handleDownloadSTL = useCallback((binary: boolean) => {
    const tris = cachedTris.length > 0 ? cachedTris : generateGeometry(selected.id, params)
    const fname = `BIA_${selected.id}_${Date.now()}.stl`
    downloadSTL(tris, fname, binary)
  }, [selected.id, params, cachedTris])

  const handleDownloadOBJ = useCallback(() => {
    const tris = cachedTris.length > 0 ? cachedTris : generateGeometry(selected.id, params)
    const fname = `BIA_${selected.id}_${Date.now()}.obj`
    downloadOBJ(tris, fname)
  }, [selected.id, params, cachedTris])

  const handleDownloadPLY = useCallback(() => {
    const tris = cachedTris.length > 0 ? cachedTris : generateGeometry(selected.id, params)
    const fname = `BIA_${selected.id}_${Date.now()}.ply`
    downloadPLY(tris, fname)
  }, [selected.id, params, cachedTris])

  return (
    <div className="flex flex-col h-full overflow-auto bg-[#0a0a0f]">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-white/5 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
              <Box className="w-5 h-5 text-violet-400" />
              Gerador de Geometrias 3D
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              STL / OBJ / PLY para bioimpressão · {ALL_GEOMETRIES.length} geometrias ({GEOMETRIES.length} clássicas + {BIOMIMETIC_IDS.size} biomiméticas + {PRINTABILITY_IDS.size} testes)
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs bg-violet-500/10 border border-violet-500/20 text-violet-300 px-3 py-1.5 rounded-full">
              <i className="fas fa-coins mr-1" /> 6 créditos / geometria
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-0 flex-1 overflow-auto">

        {/* ── Left: Geometry Selector (3 grupos) ── */}
        <div className="lg:w-64 xl:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-white/5 overflow-y-auto">
          <div className="p-3 space-y-4">
            {/* Grupo 1: Clássicos */}
            <div>
              <div className="text-xs font-semibold text-violet-300 uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5">
                <Box className="w-3 h-3" /> Clássicas ({GEOMETRIES.length})
              </div>
              <div className="space-y-1">
                {GEOMETRIES.map(geo => (
                  <GeoButton key={geo.id} geo={geo} selected={selected.id === geo.id} onClick={() => handleSelectGeo(geo)} />
                ))}
              </div>
            </div>

            {/* Grupo 2: Biomiméticas */}
            <div>
              <div className="text-xs font-semibold text-emerald-300 uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5">
                <Activity className="w-3 h-3" /> Biomiméticas ({BIOMIMETIC_IDS.size})
              </div>
              <div className="text-[10px] text-gray-500 px-1 mb-1">Multicamada · anatômico · biológico</div>
              <div className="space-y-1">
                {BIOMIMETIC_GEOMETRIES.filter(g => g.category === "biomimetic").map(geo => (
                  <GeoButton key={geo.id} geo={geo} selected={selected.id === geo.id} onClick={() => handleSelectGeo(geo)} accent="emerald" />
                ))}
              </div>
            </div>

            {/* Grupo 3: Testes de printabilidade */}
            <div>
              <div className="text-xs font-semibold text-amber-300 uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" /> Testes Printabilidade ({PRINTABILITY_IDS.size})
              </div>
              <div className="text-[10px] text-gray-500 px-1 mb-1">Calibração · validação de bioink</div>
              <div className="space-y-1">
                {BIOMIMETIC_GEOMETRIES.filter(g => g.category === "printability_test").map(geo => (
                  <GeoButton key={geo.id} geo={geo} selected={selected.id === geo.id} onClick={() => handleSelectGeo(geo)} accent="amber" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Center: Preview + Config ── */}
        <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-auto">

          {/* Preview panel */}
          <div className="lg:flex-1 p-4 sm:p-6 flex flex-col gap-4">

            {/* Geometry info card */}
            <div className="bg-white/3 border border-white/6 rounded-2xl p-5">
              <div className="flex items-start gap-4 mb-4">
                <div className="text-4xl">{selected.icon}</div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-white">{selected.label}</h2>
                  <p className="text-sm text-gray-400 mt-1">{selected.description}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-xs bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2.5 py-1 rounded-full">
                      🩺 {selected.tissue}
                    </span>
                    <span className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                      🏥 {selected.application}
                    </span>
                  </div>
                </div>
              </div>
              <IsoPreview id={selected.id} />
            </div>

            {/* Racional científico + protocolo de análise (apenas para biomiméticas/testes) */}
            {(() => {
              const bio = BIOMIMETIC_GEOMETRIES.find(g => g.id === selected.id)
              if (!bio) return null
              const isTest = bio.category === "printability_test"
              const toneCls = isTest
                ? "from-amber-500/8 to-orange-500/8 border-amber-500/20"
                : "from-emerald-500/8 to-teal-500/8 border-emerald-500/20"
              return (
                <div className={cn("rounded-2xl border bg-gradient-to-br p-4 space-y-3", toneCls)}>
                  <div className="flex items-start gap-2.5">
                    <Info className={cn("w-4 h-4 mt-0.5 shrink-0", isTest ? "text-amber-300" : "text-emerald-300")} />
                    <div className="flex-1 min-w-0">
                      <div className={cn("text-xs font-semibold uppercase tracking-wider mb-1", isTest ? "text-amber-300" : "text-emerald-300")}>
                        Racional científico
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">{bio.rationale}</p>
                    </div>
                  </div>
                  {bio.analysisProtocol && (
                    <div className="flex items-start gap-2.5 pt-2 border-t border-white/5">
                      <BarChart3 className={cn("w-4 h-4 mt-0.5 shrink-0", isTest ? "text-amber-300" : "text-emerald-300")} />
                      <div className="flex-1 min-w-0">
                        <div className={cn("text-xs font-semibold uppercase tracking-wider mb-1", isTest ? "text-amber-300" : "text-emerald-300")}>
                          Como analisar o impresso
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed">{bio.analysisProtocol}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Stats when generated */}
            {generated && (
              <div className="bg-white/3 border border-emerald-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">Geometria gerada!</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center mb-3">
                  <div>
                    <div className="text-lg font-bold text-white">{triangleCount.toLocaleString("pt-BR")}</div>
                    <div className="text-xs text-gray-400">triângulos</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-violet-300">{sizes.stlBinary} KB</div>
                    <div className="text-xs text-gray-400">STL Binário</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-300">{sizes.obj} KB</div>
                    <div className="text-xs text-gray-400">OBJ</div>
                  </div>
                </div>
                {validation && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-white/5 text-center">
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5 flex items-center justify-center gap-1">
                        <BarChart3 className="w-3 h-3" /> Volume
                      </div>
                      <div className="text-sm font-semibold text-cyan-300">{formatVolume(validation.stats.volumeMm3)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5 flex items-center justify-center gap-1">
                        <Activity className="w-3 h-3" /> Área
                      </div>
                      <div className="text-sm font-semibold text-cyan-300">{formatArea(validation.stats.surfaceAreaMm2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">BBox (mm)</div>
                      <div className="text-xs font-mono text-gray-300">
                        {validation.stats.bbox.size[0].toFixed(0)}×{validation.stats.bbox.size[1].toFixed(0)}×{validation.stats.bbox.size[2].toFixed(0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5 flex items-center justify-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Qualidade
                      </div>
                      <div className={cn(
                        "text-sm font-bold",
                        validation.qualityScore >= 90 ? "text-emerald-400" :
                        validation.qualityScore >= 70 ? "text-amber-400" :
                        "text-rose-400"
                      )}>
                        {validation.qualityScore}/100
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Validation Report */}
            {generated && validation && (
              <div className={cn(
                "rounded-2xl p-4 border",
                validation.printable
                  ? "bg-emerald-500/[0.04] border-emerald-500/20"
                  : "bg-rose-500/[0.04] border-rose-500/20"
              )}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={cn("w-4 h-4", validation.printable ? "text-emerald-400" : "text-rose-400")} />
                    <span className="text-sm font-semibold text-white">Validação do Mesh</span>
                  </div>
                  <div className="flex gap-1.5">
                    {validation.stats.isManifold && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/15 text-emerald-300 rounded font-mono">MANIFOLD</span>
                    )}
                    {validation.stats.isWatertight && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/15 text-emerald-300 rounded font-mono">WATERTIGHT</span>
                    )}
                    {validation.stats.hasConsistentNormals && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/15 text-emerald-300 rounded font-mono">NORMALS-OK</span>
                    )}
                  </div>
                </div>
                {validation.issues.length === 0 ? (
                  <p className="text-xs text-emerald-300/80 leading-relaxed">
                    Mesh perfeito para bioimpressão — geometria fechada, sem buracos, normais corretas e arestas ≥ 0.4 mm.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {validation.issues.slice(0, 5).map((issue, i) => (
                      <div
                        key={i}
                        className={cn(
                          "rounded-lg p-2.5 text-xs",
                          issue.severity === "error" ? "bg-rose-500/10 border border-rose-500/20" :
                          issue.severity === "warning" ? "bg-amber-500/10 border border-amber-500/20" :
                          "bg-blue-500/10 border border-blue-500/20"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {issue.severity === "error" && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />}
                          {issue.severity === "warning" && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />}
                          {issue.severity === "info" && <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />}
                          <div className="flex-1 min-w-0">
                            <div className={cn(
                              "font-semibold",
                              issue.severity === "error" ? "text-rose-300" :
                              issue.severity === "warning" ? "text-amber-300" :
                              "text-blue-300"
                            )}>
                              {issue.title}
                            </div>
                            <div className="text-gray-400 mt-0.5">{issue.detail}</div>
                            <div className="text-gray-500 mt-1 italic">→ {issue.suggestion}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Info tip */}
            <div className="bg-amber-500/8 border border-amber-500/15 rounded-xl p-3 flex gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-300 leading-relaxed">
                <strong className="text-amber-300">Compatibilidade:</strong> STL binário funciona em 
                Simplify3D, Slic3r, Cura, PrusaSlicer e maioria dos slicers de bioimpressão. 
                OBJ para MeshLab, Blender e Meshmixer. Unidades em <strong>mm</strong>.
              </p>
            </div>

          </div>

          {/* Right: Parameters + Download */}
          <div className="lg:w-80 xl:w-96 shrink-0 border-t lg:border-t-0 lg:border-l border-white/5 p-4 sm:p-6 flex flex-col gap-4">

            {/* Parameters */}
            <div className="bg-white/3 border border-white/6 rounded-2xl">
              <button
                onClick={() => setShowParams(!showParams)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-semibold text-white">Parâmetros da Geometria</span>
                </div>
                {showParams ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {showParams && (
                <div className="px-4 pb-4 border-t border-white/5 pt-3">
                  <ParamEditor geo={selected} params={params} onChange={handleParamChange} />
                  <button
                    onClick={() => setParams({ ...selected.defaultParams })}
                    className="mt-3 text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Restaurar padrões
                  </button>
                </div>
              )}
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all",
                generating
                  ? "bg-violet-500/20 text-violet-400 cursor-wait"
                  : "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20"
              )}
            >
              {generating ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Calculando malha...</>
              ) : (
                <><Layers className="w-4 h-4" /> Gerar Geometria</>
              )}
            </button>

            {/* Downloads */}
            <div className="bg-white/3 border border-white/6 rounded-2xl p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Download
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => handleDownloadSTL(true)}
                  disabled={!generated}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    generated
                      ? "bg-violet-500/12 border border-violet-500/25 text-violet-300 hover:bg-violet-500/20"
                      : "bg-white/3 border border-white/6 text-gray-600 cursor-not-allowed"
                  )}
                >
                  <Download className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-semibold">STL Binário</div>
                    <div className="text-xs opacity-70">Slic3r · Cura · Simplify3D</div>
                  </div>
                  {generated && <span className="ml-auto text-xs text-gray-400">{sizes.stlBinary} KB</span>}
                </button>

                <button
                  onClick={() => handleDownloadSTL(false)}
                  disabled={!generated}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    generated
                      ? "bg-blue-500/12 border border-blue-500/25 text-blue-300 hover:bg-blue-500/20"
                      : "bg-white/3 border border-white/6 text-gray-600 cursor-not-allowed"
                  )}
                >
                  <FileCode2 className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-semibold">STL ASCII</div>
                    <div className="text-xs opacity-70">Compatível · Editável · Legível</div>
                  </div>
                  {generated && <span className="ml-auto text-xs text-gray-400">{sizes.stlAscii} KB</span>}
                </button>

                <button
                  onClick={handleDownloadOBJ}
                  disabled={!generated}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    generated
                      ? "bg-emerald-500/12 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20"
                      : "bg-white/3 border border-white/6 text-gray-600 cursor-not-allowed"
                  )}
                >
                  <Box className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-semibold">OBJ Wavefront</div>
                    <div className="text-xs opacity-70">MeshLab · Blender · Meshmixer</div>
                  </div>
                  {generated && <span className="ml-auto text-xs text-gray-400">{sizes.obj} KB</span>}
                </button>

                <button
                  onClick={handleDownloadPLY}
                  disabled={!generated}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    generated
                      ? "bg-cyan-500/12 border border-cyan-500/25 text-cyan-300 hover:bg-cyan-500/20"
                      : "bg-white/3 border border-white/6 text-gray-600 cursor-not-allowed"
                  )}
                >
                  <FileCode2 className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-semibold">PLY (Polygon Format)</div>
                    <div className="text-xs opacity-70">CloudCompare · MeshLab · Pesquisa</div>
                  </div>
                  {generated && <span className="ml-auto text-xs text-gray-400">{sizes.ply} KB</span>}
                </button>
              </div>
            </div>

            {/* Slicer info */}
            <div className="bg-white/3 border border-white/6 rounded-2xl p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5" /> Parâmetros de Impressão Sugeridos
              </div>
              <div className="space-y-1.5 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Altura de camada</span>
                  <span className="text-white font-mono">150–200 µm</span>
                </div>
                <div className="flex justify-between">
                  <span>Diâmetro bico</span>
                  <span className="text-white font-mono">200–400 µm</span>
                </div>
                <div className="flex justify-between">
                  <span>Velocidade</span>
                  <span className="text-white font-mono">5–15 mm/s</span>
                </div>
                <div className="flex justify-between">
                  <span>Pressão extrusão</span>
                  <span className="text-white font-mono">50–250 kPa</span>
                </div>
                <div className="flex justify-between">
                  <span>Viabilidade pós-impressão</span>
                  <span className="text-emerald-400 font-mono">≥80%</span>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-amber-500/8 border border-amber-500/15 rounded-xl p-3 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400">
                Geometrias são simplificadas para bioimpressão. Para uso clínico, 
                valide dimensões com profissional qualificado e equipamento de imagem médica (DICOM).
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Botão de geometria reutilizável com cor de destaque (clássico/bio/teste)
// ────────────────────────────────────────────────────────────────────────────
function GeoButton({
  geo, selected, onClick, accent,
}: {
  geo: STLGeometry
  selected: boolean
  onClick: () => void
  accent?: "violet" | "emerald" | "amber"
}) {
  const tone = accent ?? "violet"
  const cls = selected
    ? tone === "emerald" ? "bg-emerald-500/15 border-emerald-500/25 text-white"
    : tone === "amber"   ? "bg-amber-500/15 border-amber-500/25 text-white"
                         : "bg-violet-500/15 border-violet-500/25 text-white"
    : "hover:bg-white/4 text-gray-400 hover:text-white border-transparent"
  return (
    <button
      onClick={onClick}
      className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border", cls)}
    >
      <span className="text-xl w-7 text-center shrink-0">{geo.icon}</span>
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{geo.label}</div>
        <div className="text-xs text-gray-500 truncate">{geo.tissue}</div>
      </div>
    </button>
  )
}
