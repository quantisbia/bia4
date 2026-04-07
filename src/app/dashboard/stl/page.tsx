"use client"

import { useState, useCallback } from "react"
import {
  Download, Box, RefreshCw, Settings, ChevronDown, ChevronUp,
  FileCode2, Layers, Ruler, CheckCircle2, Info, AlertTriangle
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import {
  GEOMETRIES, generateGeometry, downloadSTL, downloadOBJ,
  estimateFileSize, type GeometryParams, type STLGeometry
} from "@/lib/stl/generator"

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
  const [sizes, setSizes] = useState({ stlBinary: 0, stlAscii: 0, obj: 0 })

  const handleSelectGeo = (geo: STLGeometry) => {
    setSelected(geo)
    setParams({ ...geo.defaultParams })
    setGenerated(false)
    setTriangleCount(0)
  }

  const handleParamChange = (key: string, val: number) => {
    setParams(prev => ({ ...prev, [key]: val }))
    setGenerated(false)
  }

  const handleGenerate = useCallback(() => {
    setGenerating(true)
    setTimeout(() => {
      const tris = generateGeometry(selected.id, params)
      setTriangleCount(tris.length)
      setSizes(estimateFileSize(tris))
      setGenerated(true)
      setGenerating(false)
    }, 80)
  }, [selected.id, params])

  const handleDownloadSTL = useCallback((binary: boolean) => {
    const tris = generateGeometry(selected.id, params)
    const ext = binary ? "stl" : "stl"
    const fname = `BIA_${selected.id}_${Date.now()}.${ext}`
    downloadSTL(tris, fname, binary)
  }, [selected.id, params])

  const handleDownloadOBJ = useCallback(() => {
    const tris = generateGeometry(selected.id, params)
    const fname = `BIA_${selected.id}_${Date.now()}.obj`
    downloadOBJ(tris, fname)
  }, [selected.id, params])

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
              STL / OBJ para bioimpressão · {GEOMETRIES.length} geometrias biológicas validadas
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

        {/* ── Left: Geometry Selector ── */}
        <div className="lg:w-64 xl:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-white/5 overflow-y-auto">
          <div className="p-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2 px-1">
              Geometrias ({GEOMETRIES.length})
            </div>
            <div className="space-y-1">
              {GEOMETRIES.map(geo => (
                <button
                  key={geo.id}
                  onClick={() => handleSelectGeo(geo)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                    selected.id === geo.id
                      ? "bg-violet-500/15 border border-violet-500/25 text-white"
                      : "hover:bg-white/4 text-gray-400 hover:text-white border border-transparent"
                  )}
                >
                  <span className="text-xl w-7 text-center shrink-0">{geo.icon}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{geo.label}</div>
                    <div className="text-xs text-gray-500 truncate">{geo.tissue}</div>
                  </div>
                </button>
              ))}
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

            {/* Stats when generated */}
            {generated && (
              <div className="bg-white/3 border border-emerald-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">Geometria gerada!</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
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
