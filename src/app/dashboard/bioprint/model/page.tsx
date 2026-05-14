"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA — Etapa 1 / 4 · Modelo 3D
 *  ───────────────────────────────────────────────────────────────────────
 *  Unifica três fontes para o arquivo 3D que será bioimpresso:
 *    A. UPLOAD     — STL/OBJ/PLY com validação topológica do mesh
 *    B. GERAÇÃO    — biblioteca paramétrica organizada em 5 categorias
 *    C. IA (beta)  — prompt textual (placeholder, descrito como roadmap)
 *
 *  Esta página substitui /dashboard/stl + /dashboard/bioprinting/dual-porosity
 *  e escreve no `state.model` do BioprintProcessContext.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import Link from "next/link"
import {
  Upload, Sparkles, FlaskConical, Heart, Bone, Activity, Hexagon,
  ShieldCheck, Brain, CheckCircle2, AlertTriangle, ArrowRight, Box,
  Download, Loader2, FileCode2, Info, XCircle
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import {
  GEOMETRIES, generateGeometry, downloadSTL, downloadOBJ, downloadPLY,
  estimateFileSize, type GeometryParams, type STLGeometry, type Triangle
} from "@/lib/stl/generator"
import { BIOMIMETIC_GEOMETRIES } from "@/lib/stl/biomimetic-tissues"
import {
  validateMesh, formatVolume, formatArea, type ValidationReport
} from "@/lib/stl/mesh-validator"
import {
  useBioprintProcess,
  type ModelCategory,
} from "@/lib/bioprint/process-context"

// ─── Mapeamento das 5 categorias ──────────────────────────────────────────
//
// Distribui as 25 geometrias da biblioteca BIA nas 5 categorias do processo.
// O usuário enxerga só uma categoria por vez (clean) — sem perder nada do
// que já existia em /dashboard/stl.

interface CategoryDef {
  id: ModelCategory
  label: string
  description: string
  icon: typeof Heart
  accent: "rose" | "stone" | "violet" | "amber" | "cyan"
  geometryIds: string[]
}

const CATEGORY_DEFS: CategoryDef[] = [
  {
    id: "soft-tissue",
    label: "Tecidos moles",
    description: "Pele, vaso, miocárdio, hepático, córnea, cartilagem, rim, fígado anatômico",
    icon: Heart,
    accent: "rose",
    geometryIds: [
      "membrane", "disk", "cube_tissue", "vessel", "hexagonal_liver",
      "nose", "meniscus", "cornea", "lens", "ear", "heart", "kidney",
      "liver_anatomical",
      "skin_3layer", "cardiac_patch", "cornea_curved", "cartilage_zonal",
    ],
  },
  {
    id: "rigid-tissue",
    label: "Tecidos rígidos",
    description: "Osso trabecular, fêmur, cortical+trabecular, mão (esqueleto)",
    icon: Bone,
    accent: "stone",
    geometryIds: [
      "bone_block", "femur", "hand",
      "bone_cortical_trabecular",
    ],
  },
  {
    id: "biomimetic-tpms",
    label: "Biomiméticos (TPMS)",
    description: "Gyroid, Schwarz P, Diamond — superfícies mínimas triplamente periódicas",
    icon: Hexagon,
    accent: "violet",
    geometryIds: ["tpms_gyroid", "tpms_schwarz", "tpms_diamond"],
  },
  {
    id: "printability-test",
    label: "Testes de imprimibilidade",
    description: "Linha, grade, ponte, estrela, torre, escada Z, leque de ângulos — calibração da biotinta",
    icon: ShieldCheck,
    accent: "amber",
    geometryIds: [
      "test_line", "test_grid", "test_collapse_bridge", "test_star",
      "test_stacking_tower", "test_z_staircase", "test_angle_fan",
    ],
  },
  {
    id: "organoid-vascular",
    label: "Organoides e vascularização",
    description: "Esferoide, cápsula porosa, vaso bifurcado, conduíte nervoso multicanal, dual-porosity",
    icon: Brain,
    accent: "cyan",
    geometryIds: [
      "organoid_sphere", "spheroid_capsule", "vessel_y_branch", "nerve_conduit",
    ],
  },
]

const ALL_GEOMETRIES: STLGeometry[] = [...GEOMETRIES, ...BIOMIMETIC_GEOMETRIES]

function getGeometryById(id: string): STLGeometry | undefined {
  return ALL_GEOMETRIES.find(g => g.id === id)
}

const ACCENT_CLASSES: Record<CategoryDef["accent"], { ring: string; text: string; bg: string; border: string }> = {
  rose:   { ring: "ring-rose-500/40",   text: "text-rose-300",   bg: "bg-rose-500/10",   border: "border-rose-500/30"   },
  stone:  { ring: "ring-stone-400/40",  text: "text-stone-300",  bg: "bg-stone-500/10",  border: "border-stone-500/30"  },
  violet: { ring: "ring-violet-500/40", text: "text-violet-300", bg: "bg-violet-500/10", border: "border-violet-500/30" },
  amber:  { ring: "ring-amber-500/40",  text: "text-amber-300",  bg: "bg-amber-500/10",  border: "border-amber-500/30"  },
  cyan:   { ring: "ring-cyan-500/40",   text: "text-cyan-300",   bg: "bg-cyan-500/10",   border: "border-cyan-500/30"   },
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function BioprintModelPage() {
  const { state, updateModel } = useBioprintProcess()
  const [source, setSource] = useState<"upload" | "generate" | "ai">(
    state.model.source === "upload" ? "upload" :
    state.model.source === "ai-prompt" ? "ai" :
    "generate"
  )

  return (
    <div className="flex flex-col min-h-full bg-[#0a0a0f]">
      {/* Cabeçalho da etapa */}
      <header className="px-4 sm:px-6 py-5 border-b border-white/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-300/80 font-semibold mb-1">
              Etapa 1 / 4 · Bioimpressão
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
              <Box className="w-5 h-5 text-emerald-400" />
              Modelo 3D
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl">
              Defina o arquivo 3D que será bioimpresso — escolha entre fazer upload de um STL próprio,
              gerar uma das 25 geometrias paramétricas, ou descrever via IA (em breve).
            </p>
          </div>

          {state.model.status === "ready" && (
            <Link
              href="/dashboard/bioprint/bioink"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25
                border border-emerald-500/40 text-emerald-200 text-sm font-medium rounded-xl transition-colors"
            >
              Continuar para Biotinta <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Tabs de fonte */}
        <div className="mt-5 flex gap-1.5 bg-white/3 border border-white/8 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
          <SourceTab id="upload"   label="Upload"       icon={Upload}      active={source === "upload"}   onClick={() => setSource("upload")} />
          <SourceTab id="generate" label="Gerar"        icon={FlaskConical} active={source === "generate"} onClick={() => setSource("generate")} />
          <SourceTab id="ai"       label="IA (beta)"    icon={Sparkles}    active={source === "ai"}       onClick={() => setSource("ai")} />
        </div>
      </header>

      {/* Conteúdo dinâmico por fonte */}
      <main className="flex-1 px-4 sm:px-6 py-6">
        {source === "upload"   && <UploadPanel   onSelected={updateModel} currentName={state.model.name} />}
        {source === "generate" && <GeneratePanel onSelected={updateModel} currentGeometry={state.model.geometryId} currentParams={state.model.params} />}
        {source === "ai"       && <AIPanel />}
      </main>

      {/* Rodapé fixo com status + CTA quando pronto */}
      {state.model.status === "ready" && (
        <footer className="sticky bottom-0 z-10 bg-[#0a0a0f]/95 backdrop-blur border-t border-emerald-500/20 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-300 font-medium">Modelo pronto:</span>
            <span className="text-gray-300 truncate max-w-[40vw]">{state.model.name ?? "—"}</span>
          </div>
          <Link
            href="/dashboard/bioprint/bioink"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-sm font-semibold rounded-lg transition-colors"
          >
            Etapa 2 · Biotinta <ArrowRight className="w-4 h-4" />
          </Link>
        </footer>
      )}
    </div>
  )
}

// ─── Tab da fonte ─────────────────────────────────────────────────────────
function SourceTab({
  label, icon: Icon, active, onClick,
}: {
  id: string; label: string; icon: typeof Upload; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap",
        active
          ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/40"
          : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PAINEL A — UPLOAD
// ═══════════════════════════════════════════════════════════════════════════
function UploadPanel({
  onSelected,
  currentName,
}: {
  onSelected: ReturnType<typeof useBioprintProcess>["updateModel"]
  currentName: string | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing] = useState(false)
  const [fileName, setFileName] = useState<string | null>(currentName)
  const [fileSizeKb, setFileSizeKb] = useState<number>(0)
  const [triangles, setTriangles] = useState<Triangle[] | null>(null)
  const [validation, setValidation] = useState<ValidationReport | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    setErrorMsg(null)
    setParsing(true)
    setFileName(file.name)
    setFileSizeKb(Math.round(file.size / 1024))
    setTriangles(null)
    setValidation(null)

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
      if (!["stl", "obj", "ply"].includes(ext)) {
        throw new Error("Formato não suportado. Use STL, OBJ ou PLY.")
      }
      const buffer = await file.arrayBuffer()
      const tris = parseUploadedMesh(buffer, ext)
      if (tris.length === 0) {
        throw new Error("O arquivo não contém triângulos válidos.")
      }
      setTriangles(tris)
      // Validar mesh (skip se muito grande pra evitar travar UI)
      const report = tris.length > 200_000
        ? null
        : validateMesh(tris, { nozzleDiameterMm: 0.4, application: "bioprinting" })
      setValidation(report)

      // Persiste no context
      onSelected({
        status: "ready",
        source: "upload",
        name: file.name,
        category: null,
        geometryId: null,
        params: null,
        stats: {
          triangles: tris.length,
          volumeMm3: report?.stats.volumeMm3,
          surfaceMm2: report?.stats.surfaceAreaMm2,
          bboxMm: report ? {
            x: report.stats.bbox.size[0],
            y: report.stats.bbox.size[1],
            z: report.stats.bbox.size[2],
          } : undefined,
        },
        validation: report ? {
          isManifold: report.stats.isManifold,
          hasDegenerate: report.stats.boundaryEdges > 0,
          issues: report.issues.map(i => i.title),
        } : null,
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao processar arquivo."
      setErrorMsg(msg)
      onSelected({ status: "empty", source: null, name: null })
    } finally {
      setParsing(false)
    }
  }, [onSelected])

  const handleClick = () => inputRef.current?.click()
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }
  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={cn(
          "rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all",
          fileName
            ? "border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/8"
            : "border-white/10 bg-white/3 hover:border-emerald-500/30 hover:bg-emerald-500/5"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".stl,.obj,.ply"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
        {parsing ? (
          <div className="flex flex-col items-center gap-3 text-gray-300">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
            <div className="text-sm">Processando mesh…</div>
          </div>
        ) : fileName ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            <div className="text-sm font-medium text-white">{fileName}</div>
            <div className="text-xs text-gray-500">{fileSizeKb} KB · clique para trocar</div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-10 h-10 text-gray-500" />
            <div className="text-sm font-medium text-gray-200">Solte um arquivo STL, OBJ ou PLY aqui</div>
            <div className="text-xs text-gray-500">ou clique para selecionar do disco</div>
            <div className="text-[11px] text-gray-600 mt-2">
              Aceita STL binário/ASCII · OBJ Wavefront · PLY ASCII · max ~50 MB
            </div>
          </div>
        )}
      </div>

      {/* Erro */}
      {errorMsg && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-rose-300">Não foi possível processar o arquivo</div>
            <div className="text-xs text-rose-200/80 mt-0.5">{errorMsg}</div>
          </div>
        </div>
      )}

      {/* Validação */}
      {triangles && validation && (
        <div className={cn(
          "rounded-2xl border p-5",
          validation.printable
            ? "bg-emerald-500/[0.04] border-emerald-500/20"
            : "bg-amber-500/[0.04] border-amber-500/30"
        )}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {validation.printable
                ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                : <AlertTriangle className="w-5 h-5 text-amber-400" />}
              <h3 className="text-sm font-semibold text-white">
                {validation.printable ? "Mesh válido para bioimpressão" : "Mesh tem avisos"}
              </h3>
            </div>
            <div className={cn(
              "text-sm font-bold",
              validation.qualityScore >= 90 ? "text-emerald-400" :
              validation.qualityScore >= 70 ? "text-amber-400" : "text-rose-400"
            )}>
              {validation.qualityScore}/100
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Stat label="Triângulos"  value={triangles.length.toLocaleString("pt-BR")} />
            <Stat label="Volume"      value={formatVolume(validation.stats.volumeMm3)} />
            <Stat label="Área"        value={formatArea(validation.stats.surfaceAreaMm2)} />
            <Stat label="BBox (mm)"   value={`${validation.stats.bbox.size[0].toFixed(0)}×${validation.stats.bbox.size[1].toFixed(0)}×${validation.stats.bbox.size[2].toFixed(0)}`} mono />
          </div>

          {validation.issues.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-white/5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Avisos</div>
              {validation.issues.slice(0, 4).map((issue, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                    issue.severity === "error"   ? "bg-rose-400" :
                    issue.severity === "warning" ? "bg-amber-400" : "bg-blue-400"
                  )} />
                  <div className="flex-1">
                    <span className="text-gray-200 font-medium">{issue.title}</span>
                    <span className="text-gray-500"> — {issue.suggestion}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Skip de validação para meshes grandes */}
      {triangles && !validation && (
        <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-100/90">
            Mesh muito grande ({triangles.length.toLocaleString("pt-BR")} triângulos) — validação topológica pulada
            para preservar performance. Você pode prosseguir para a próxima etapa.
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PAINEL B — GERAR (5 categorias)
// ═══════════════════════════════════════════════════════════════════════════
function GeneratePanel({
  onSelected,
  currentGeometry,
  currentParams,
}: {
  onSelected: ReturnType<typeof useBioprintProcess>["updateModel"]
  currentGeometry: string | null
  currentParams: Record<string, number | string | boolean> | null
}) {
  // Determinar categoria inicial baseada na seleção atual (se houver)
  const initialCategory: ModelCategory = useMemo(() => {
    if (currentGeometry) {
      const cat = CATEGORY_DEFS.find(c => c.geometryIds.includes(currentGeometry))
      if (cat) return cat.id
    }
    return "soft-tissue"
  }, [currentGeometry])

  const [category, setCategory] = useState<ModelCategory>(initialCategory)
  const [selectedGeoId, setSelectedGeoId] = useState<string | null>(currentGeometry)
  const [params, setParams] = useState<GeometryParams>(() => {
    if (currentGeometry && currentParams) return currentParams as GeometryParams
    const firstGeo = getGeometryById(CATEGORY_DEFS[0].geometryIds[0])
    return firstGeo ? { ...firstGeo.defaultParams } : {}
  })
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [triangleCount, setTriangleCount] = useState(0)
  const [validation, setValidation] = useState<ValidationReport | null>(null)
  const [cachedTris, setCachedTris] = useState<Triangle[]>([])

  const currentCategoryDef = CATEGORY_DEFS.find(c => c.id === category)!
  const accent = ACCENT_CLASSES[currentCategoryDef.accent]
  const categoryGeometries = currentCategoryDef.geometryIds
    .map(id => getGeometryById(id))
    .filter((g): g is STLGeometry => g !== undefined)

  const selectedGeo = selectedGeoId ? getGeometryById(selectedGeoId) : null

  // Quando muda categoria, limpa seleção
  const handleCategoryChange = (cat: ModelCategory) => {
    setCategory(cat)
    setSelectedGeoId(null)
    setGenerated(false)
    setTriangleCount(0)
    setValidation(null)
    setCachedTris([])
  }

  const handleSelectGeo = (geo: STLGeometry) => {
    setSelectedGeoId(geo.id)
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
    if (!selectedGeo) return
    setGenerating(true)
    setTimeout(() => {
      const tris = generateGeometry(selectedGeo.id, params)
      setCachedTris(tris)
      setTriangleCount(tris.length)
      // Validar (skip se muito grande)
      let report: ValidationReport | null = null
      try {
        report = tris.length > 200_000
          ? null
          : validateMesh(tris, { nozzleDiameterMm: 0.4, application: "bioprinting" })
      } catch (e) {
        console.error("[BIA] Validation error", e)
      }
      setValidation(report)
      setGenerated(true)
      setGenerating(false)

      // Persiste no context
      onSelected({
        status: "ready",
        source: "generated",
        name: `${selectedGeo.label} (${selectedGeo.id})`,
        category,
        geometryId: selectedGeo.id,
        params: params as Record<string, number | string | boolean>,
        stats: {
          triangles: tris.length,
          volumeMm3: report?.stats.volumeMm3,
          surfaceMm2: report?.stats.surfaceAreaMm2,
          bboxMm: report ? {
            x: report.stats.bbox.size[0],
            y: report.stats.bbox.size[1],
            z: report.stats.bbox.size[2],
          } : undefined,
        },
        validation: report ? {
          isManifold: report.stats.isManifold,
          hasDegenerate: report.stats.boundaryEdges > 0,
          issues: report.issues.map(i => i.title),
        } : null,
      })
    }, 80)
  }, [selectedGeo, params, category, onSelected])

  const handleDownload = (kind: "stl-bin" | "stl-ascii" | "obj" | "ply") => {
    if (!selectedGeo) return
    const tris = cachedTris.length > 0 ? cachedTris : generateGeometry(selectedGeo.id, params)
    const fname = `BIA_${selectedGeo.id}_${Date.now()}`
    if (kind === "stl-bin")   downloadSTL(tris, `${fname}.stl`, true)
    if (kind === "stl-ascii") downloadSTL(tris, `${fname}.stl`, false)
    if (kind === "obj")       downloadOBJ(tris, `${fname}.obj`)
    if (kind === "ply")       downloadPLY(tris, `${fname}.ply`)
  }

  const sizes = useMemo(() => estimateFileSize(cachedTris), [cachedTris])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5 max-w-6xl mx-auto">
      {/* Sidebar de categorias */}
      <aside className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-semibold mb-2 px-1">
          Categoria
        </div>
        {CATEGORY_DEFS.map(cat => {
          const Ic = cat.icon
          const isActive = cat.id === category
          const a = ACCENT_CLASSES[cat.accent]
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={cn(
                "w-full text-left rounded-xl border p-3 transition-all flex items-start gap-3",
                isActive
                  ? `${a.bg} ${a.border} ring-1 ${a.ring}`
                  : "bg-white/3 border-white/8 hover:bg-white/5 hover:border-white/15"
              )}
            >
              <Ic className={cn("w-5 h-5 mt-0.5 shrink-0", isActive ? a.text : "text-gray-500")} />
              <div className="min-w-0 flex-1">
                <div className={cn("text-sm font-semibold", isActive ? a.text : "text-gray-200")}>
                  {cat.label}
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                  {cat.description}
                </div>
                <div className="text-[10px] text-gray-600 mt-1">
                  {cat.geometryIds.length} geometria{cat.geometryIds.length === 1 ? "" : "s"}
                </div>
              </div>
            </button>
          )
        })}

        {/* Estratégia avançada — dual-porosity (consolidada nesta página, categoria organoid-vascular) */}
        {category === "organoid-vascular" && (
          <div className="block mt-2 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
              <Activity className="w-4 h-4" />
              Dual-porosity (avançado)
            </div>
            <div className="text-[11px] text-cyan-100/70 mt-1 leading-snug">
              Estratégia de vascularização com poros macro+micro para organoides perfundíveis.
              Disponível nas geometrias <strong>Vascular Tree</strong> e <strong>Organoid Cluster</strong> abaixo.
            </div>
          </div>
        )}
      </aside>

      {/* Main area: lista de geometrias + config + preview */}
      <div className="space-y-4">
        {/* Lista de geometrias da categoria */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-semibold mb-2 px-1 flex items-center gap-1.5">
            <span>{currentCategoryDef.label}</span>
            <span className="text-gray-700">·</span>
            <span>{categoryGeometries.length} disponíve{categoryGeometries.length === 1 ? "l" : "is"}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {categoryGeometries.map(geo => (
              <button
                key={geo.id}
                onClick={() => handleSelectGeo(geo)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-all",
                  selectedGeoId === geo.id
                    ? `${accent.bg} ${accent.border} ring-1 ${accent.ring}`
                    : "bg-white/3 border-white/8 hover:border-white/20 hover:bg-white/5"
                )}
              >
                <div className="text-2xl mb-1.5">{geo.icon}</div>
                <div className={cn(
                  "text-xs font-semibold leading-tight",
                  selectedGeoId === geo.id ? accent.text : "text-gray-200"
                )}>
                  {geo.label}
                </div>
                <div className="text-[10px] text-gray-500 mt-1 leading-tight line-clamp-2">
                  {geo.tissue}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Configuração + gerar */}
        {selectedGeo && (
          <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
            <div className="flex items-start gap-4 mb-4">
              <div className="text-3xl">{selectedGeo.icon}</div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white">{selectedGeo.label}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{selectedGeo.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", accent.border, accent.bg, accent.text)}>
                    {selectedGeo.tissue}
                  </span>
                  <span className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-full">
                    {selectedGeo.application}
                  </span>
                </div>
              </div>
            </div>

            {/* Parâmetros */}
            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Parâmetros</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(selectedGeo.paramLabels).map(([key, label]) => (
                  <div key={key}>
                    <label className="text-[11px] text-gray-400 block mb-1">{label}</label>
                    <input
                      type="number"
                      value={(params as Record<string, number>)[key] ?? selectedGeo.defaultParams[key as keyof GeometryParams] ?? 0}
                      onChange={e => handleParamChange(key, parseFloat(e.target.value) || 0)}
                      step={key.includes("Percent") || key.includes("infill") ? 5 : 0.5}
                      min={key.includes("Percent") ? 10 : 0.1}
                      max={key.includes("Percent") ? 100 : key.includes("segments") ? 128 : 500}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white
                        focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Botão gerar */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className={cn(
                "w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2",
                "bg-emerald-500 hover:bg-emerald-400 text-emerald-950",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando geometria…
                </>
              ) : generated ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Regenerar
                </>
              ) : (
                <>
                  <FlaskConical className="w-4 h-4" />
                  Gerar geometria
                </>
              )}
            </button>
          </div>
        )}

        {/* Resultado / validação / download */}
        {generated && (
          <div className={cn(
            "rounded-2xl border p-5",
            validation?.printable !== false
              ? "bg-emerald-500/[0.04] border-emerald-500/20"
              : "bg-amber-500/[0.04] border-amber-500/30"
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-300">Geometria gerada</span>
              </div>
              {validation && (
                <div className={cn(
                  "text-sm font-bold",
                  validation.qualityScore >= 90 ? "text-emerald-400" :
                  validation.qualityScore >= 70 ? "text-amber-400" : "text-rose-400"
                )}>
                  {validation.qualityScore}/100
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <Stat label="Triângulos" value={triangleCount.toLocaleString("pt-BR")} />
              <Stat label="STL binário" value={`${sizes.stlBinary} KB`} />
              <Stat label="OBJ"        value={`${sizes.obj} KB`} />
              <Stat label="PLY"        value={`${sizes.ply} KB`} />
            </div>

            {validation && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 pt-3 border-t border-white/5">
                <Stat label="Volume" value={formatVolume(validation.stats.volumeMm3)} />
                <Stat label="Área"   value={formatArea(validation.stats.surfaceAreaMm2)} />
                <Stat label="BBox"   value={`${validation.stats.bbox.size[0].toFixed(0)}×${validation.stats.bbox.size[1].toFixed(0)}×${validation.stats.bbox.size[2].toFixed(0)} mm`} mono />
              </div>
            )}

            {/* Downloads */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
              <DownloadBtn label="STL Bin"   onClick={() => handleDownload("stl-bin")} />
              <DownloadBtn label="STL ASCII" onClick={() => handleDownload("stl-ascii")} />
              <DownloadBtn label="OBJ"       onClick={() => handleDownload("obj")} />
              <DownloadBtn label="PLY"       onClick={() => handleDownload("ply")} />
            </div>

            {validation && validation.issues.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Avisos</div>
                {validation.issues.slice(0, 3).map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                      issue.severity === "error" ? "bg-rose-400" :
                      issue.severity === "warning" ? "bg-amber-400" : "bg-blue-400"
                    )} />
                    <div className="flex-1">
                      <span className="text-gray-200 font-medium">{issue.title}</span>
                      <span className="text-gray-500"> — {issue.suggestion}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PAINEL C — IA (placeholder)
// ═══════════════════════════════════════════════════════════════════════════
function AIPanel() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500/8 to-fuchsia-500/8 border border-violet-500/20 p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-violet-300" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-white">Geração por IA</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Descreva o tecido alvo em linguagem natural — a BIA vai propor a geometria, parâmetros e racional científico.
            </p>
          </div>
          <span className="text-[10px] font-semibold bg-violet-500/20 text-violet-200 px-2 py-1 rounded-full border border-violet-500/30">
            EM BREVE
          </span>
        </div>

        <textarea
          disabled
          placeholder="Ex: Quero um scaffold poroso para regeneração óssea cortical de 20×15×10 mm, porosidade ≥70%, com canais para vascularização passiva…"
          className="w-full h-32 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-400
            placeholder:text-gray-600 resize-none focus:outline-none disabled:cursor-not-allowed"
        />

        <div className="flex items-center justify-between mt-3">
          <div className="text-[11px] text-gray-500">
            Funcionalidade prevista para liberação após validação experimental do banco BIA.
          </div>
          <button
            disabled
            className="px-4 py-2 bg-violet-500/30 text-violet-200/60 text-sm rounded-lg font-medium disabled:cursor-not-allowed"
          >
            Gerar com IA
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white/3 border border-white/8 p-4">
        <div className="text-xs font-semibold text-gray-300 mb-2 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400" />
          Por enquanto
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          Use a aba <strong className="text-emerald-300">Gerar</strong> para escolher entre as 25 geometrias paramétricas
          já validadas (5 categorias) — todas com base científica documentada. Quando a IA estiver liberada, ela vai
          orquestrar exatamente esses mesmos motores.
        </p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS DE UI
// ═══════════════════════════════════════════════════════════════════════════
function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className={cn("text-sm font-semibold text-white", mono && "font-mono text-xs")}>{value}</div>
    </div>
  )
}

function DownloadBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
        text-xs font-medium text-gray-200 rounded-lg transition-all flex items-center gap-1.5"
    >
      <Download className="w-3 h-3" />
      {label}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PARSERS DE UPLOAD (STL / OBJ / PLY)
// ═══════════════════════════════════════════════════════════════════════════

function parseUploadedMesh(buffer: ArrayBuffer, ext: string): Triangle[] {
  if (ext === "stl") return parseSTL(buffer)
  if (ext === "obj") return parseOBJ(new TextDecoder().decode(buffer))
  if (ext === "ply") return parsePLY(new TextDecoder().decode(buffer))
  return []
}

/** STL parser — detecta automaticamente binário vs ASCII */
function parseSTL(buffer: ArrayBuffer): Triangle[] {
  // STL binário: header 80 bytes + uint32 count + 50 bytes/triangle
  // Heurística: se size == 84 + count*50 → binário; caso contrário tenta ASCII
  if (buffer.byteLength > 84) {
    const view = new DataView(buffer)
    const count = view.getUint32(80, true)
    const expected = 84 + count * 50
    if (count > 0 && expected === buffer.byteLength) {
      return parseSTLBinary(buffer, count)
    }
  }
  // ASCII fallback
  try {
    return parseSTLAscii(new TextDecoder().decode(buffer))
  } catch {
    return []
  }
}

function parseSTLBinary(buffer: ArrayBuffer, count: number): Triangle[] {
  const view = new DataView(buffer)
  const tris: Triangle[] = []
  let offset = 84
  for (let i = 0; i < count; i++) {
    const nx = view.getFloat32(offset, true); offset += 4
    const ny = view.getFloat32(offset, true); offset += 4
    const nz = view.getFloat32(offset, true); offset += 4
    const v1x = view.getFloat32(offset, true); offset += 4
    const v1y = view.getFloat32(offset, true); offset += 4
    const v1z = view.getFloat32(offset, true); offset += 4
    const v2x = view.getFloat32(offset, true); offset += 4
    const v2y = view.getFloat32(offset, true); offset += 4
    const v2z = view.getFloat32(offset, true); offset += 4
    const v3x = view.getFloat32(offset, true); offset += 4
    const v3y = view.getFloat32(offset, true); offset += 4
    const v3z = view.getFloat32(offset, true); offset += 4
    offset += 2 // attribute byte count
    tris.push({
      normal: [nx, ny, nz],
      v1: [v1x, v1y, v1z],
      v2: [v2x, v2y, v2z],
      v3: [v3x, v3y, v3z],
    })
  }
  return tris
}

function parseSTLAscii(text: string): Triangle[] {
  const tris: Triangle[] = []
  const lines = text.split(/\r?\n/)
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    if (line.startsWith("facet normal")) {
      const nParts = line.split(/\s+/)
      const nx = parseFloat(nParts[2]) || 0
      const ny = parseFloat(nParts[3]) || 0
      const nz = parseFloat(nParts[4]) || 0
      // expect: outer loop, vertex×3, endloop, endfacet
      const verts: number[][] = []
      for (let k = 0; k < 5; k++) {
        i++
        const l = lines[i]?.trim() ?? ""
        if (l.startsWith("vertex")) {
          const vParts = l.split(/\s+/)
          verts.push([
            parseFloat(vParts[1]) || 0,
            parseFloat(vParts[2]) || 0,
            parseFloat(vParts[3]) || 0,
          ])
        }
        if (verts.length === 3) break
      }
      if (verts.length === 3) {
        tris.push({
          normal: [nx, ny, nz],
          v1: verts[0] as [number, number, number],
          v2: verts[1] as [number, number, number],
          v3: verts[2] as [number, number, number],
        })
      }
    }
    i++
  }
  return tris
}

/** OBJ parser (apenas vertices+faces — ignora texturas/normais) */
function parseOBJ(text: string): Triangle[] {
  const vertices: [number, number, number][] = []
  const tris: Triangle[] = []
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    const t = line.trim()
    if (t.startsWith("v ")) {
      const p = t.split(/\s+/)
      vertices.push([parseFloat(p[1]) || 0, parseFloat(p[2]) || 0, parseFloat(p[3]) || 0])
    } else if (t.startsWith("f ")) {
      const p = t.split(/\s+/).slice(1)
      // Triangulação em fan a partir do primeiro vértice
      const idxs = p.map(s => parseInt(s.split("/")[0], 10) - 1) // OBJ é 1-based
      for (let k = 1; k < idxs.length - 1; k++) {
        const a = vertices[idxs[0]]
        const b = vertices[idxs[k]]
        const c = vertices[idxs[k + 1]]
        if (a && b && c) {
          tris.push({ normal: computeNormal(a, b, c), v1: a, v2: b, v3: c })
        }
      }
    }
  }
  return tris
}

/** PLY parser ASCII (apenas vertices+face com vertex_indices) */
function parsePLY(text: string): Triangle[] {
  const lines = text.split(/\r?\n/)
  let vertexCount = 0
  let faceCount = 0
  let headerEnd = 0
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim()
    if (l.startsWith("element vertex")) vertexCount = parseInt(l.split(/\s+/)[2], 10) || 0
    if (l.startsWith("element face"))   faceCount   = parseInt(l.split(/\s+/)[2], 10) || 0
    if (l === "end_header") { headerEnd = i + 1; break }
  }
  const vertices: [number, number, number][] = []
  for (let i = 0; i < vertexCount; i++) {
    const p = (lines[headerEnd + i] ?? "").trim().split(/\s+/)
    vertices.push([parseFloat(p[0]) || 0, parseFloat(p[1]) || 0, parseFloat(p[2]) || 0])
  }
  const tris: Triangle[] = []
  for (let i = 0; i < faceCount; i++) {
    const p = (lines[headerEnd + vertexCount + i] ?? "").trim().split(/\s+/)
    const n = parseInt(p[0], 10) || 0
    if (n < 3) continue
    const idxs = p.slice(1, 1 + n).map(s => parseInt(s, 10))
    // Triangulação em fan
    for (let k = 1; k < idxs.length - 1; k++) {
      const a = vertices[idxs[0]]
      const b = vertices[idxs[k]]
      const c = vertices[idxs[k + 1]]
      if (a && b && c) {
        tris.push({ normal: computeNormal(a, b, c), v1: a, v2: b, v3: c })
      }
    }
  }
  return tris
}

function computeNormal(
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number]
): [number, number, number] {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2]
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]
  const nx = uy * vz - uz * vy
  const ny = uz * vx - ux * vz
  const nz = ux * vy - uy * vx
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
  return [nx / len, ny / len, nz / len]
}

// Nota: modelCategoryLabel é importado direto de @/lib/bioprint/process-context
// (não pode ser re-exportado daqui — Next.js só aceita default/metadata em pages)
