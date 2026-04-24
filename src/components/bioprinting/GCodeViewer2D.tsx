"use client"

/**
 * BIA — Visualizador 2D de G-code (estilo Pronterface)
 * ======================================================
 * Renderiza toolpath camada-por-camada em canvas 2D, com:
 *  - Vista de topo (XY) da camada atual
 *  - Controle de layer (slider)
 *  - Diferenciação de movimentos: extrusão (verde) vs viagem (azul tracejado)
 *  - Mesa de impressão (build plate) desenhada em escala real
 *  - Zoom, pan e métricas (distância, tempo estimado)
 */

import { useState, useMemo, useRef, useEffect } from "react"
import {
  Eye, EyeOff, Layers, ZoomIn, ZoomOut, Home, Move, Ruler,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

interface GCodeViewer2DProps {
  gcode: string
  buildPlate?: { x: number; y: number }  // dimensões da mesa em mm
  className?: string
}

interface Segment {
  x1: number; y1: number; z1: number
  x2: number; y2: number; z2: number
  extrudes: boolean
  layer: number
}

function parseGCode(gcode: string): { segments: Segment[]; maxLayer: number; stats: { totalExtrude: number; totalTravel: number } } {
  const segments: Segment[] = []
  let x = 0, y = 0, z = 0, e = 0
  let lastE = 0
  let currentLayer = 0
  let lastZ = 0
  let totalExtrude = 0
  let totalTravel = 0
  let relative = false
  let eRelative = false

  const lines = gcode.split("\n")
  for (const raw of lines) {
    const line = raw.split(";")[0].trim()   // remove comentários
    if (!line) continue
    const parts = line.toUpperCase().split(/\s+/)
    const cmd = parts[0]

    if (cmd === "G90") { relative = false; continue }
    if (cmd === "G91") { relative = true; continue }
    if (cmd === "M82") { eRelative = false; continue }
    if (cmd === "M83") { eRelative = true; continue }
    if (cmd === "G92") {
      for (const p of parts.slice(1)) {
        if (p.startsWith("X")) x = parseFloat(p.slice(1)) || 0
        else if (p.startsWith("Y")) y = parseFloat(p.slice(1)) || 0
        else if (p.startsWith("Z")) z = parseFloat(p.slice(1)) || 0
        else if (p.startsWith("E")) { e = parseFloat(p.slice(1)) || 0; lastE = e }
      }
      continue
    }
    if (cmd === "G28") { x = 0; y = 0; z = 0; continue }

    if (cmd === "G0" || cmd === "G1") {
      const prevX = x, prevY = y, prevZ = z
      let newE = e
      let hasMotion = false
      for (const p of parts.slice(1)) {
        if (p.startsWith("X")) { x = relative ? x + (parseFloat(p.slice(1)) || 0) : parseFloat(p.slice(1)) || 0; hasMotion = true }
        else if (p.startsWith("Y")) { y = relative ? y + (parseFloat(p.slice(1)) || 0) : parseFloat(p.slice(1)) || 0; hasMotion = true }
        else if (p.startsWith("Z")) { z = relative ? z + (parseFloat(p.slice(1)) || 0) : parseFloat(p.slice(1)) || 0; hasMotion = true }
        else if (p.startsWith("E")) {
          const v = parseFloat(p.slice(1)) || 0
          newE = eRelative ? e + v : v
        }
      }
      const extrudes = newE > e + 0.0001
      if (hasMotion) {
        // Detecta nova camada
        if (z > lastZ + 0.01) {
          currentLayer++
          lastZ = z
        }
        const dx = x - prevX, dy = y - prevY, dz = z - prevZ
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (extrudes) totalExtrude += dist
        else totalTravel += dist
        segments.push({
          x1: prevX, y1: prevY, z1: prevZ,
          x2: x, y2: y, z2: z,
          extrudes,
          layer: currentLayer,
        })
      }
      e = newE
      lastE = e
      continue
    }
  }

  return {
    segments,
    maxLayer: currentLayer,
    stats: { totalExtrude, totalTravel },
  }
}

export function GCodeViewer2D({
  gcode,
  buildPlate = { x: 200, y: 200 },
  className,
}: GCodeViewer2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentLayer, setCurrentLayer] = useState(0)
  const [showAllLayers, setShowAllLayers] = useState(false)
  const [showTravel, setShowTravel] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  const { segments, maxLayer, stats } = useMemo(() => parseGCode(gcode), [gcode])

  // Clamp layer
  useEffect(() => {
    if (currentLayer > maxLayer) setCurrentLayer(maxLayer)
  }, [maxLayer, currentLayer])

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Resize to container
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const W = rect.width
    const H = rect.height

    // Clear
    ctx.fillStyle = "#0a0a0f"
    ctx.fillRect(0, 0, W, H)

    // Escala base (fit na mesa)
    const margin = 20
    const scaleBase = Math.min((W - 2 * margin) / buildPlate.x, (H - 2 * margin) / buildPlate.y)
    const scale = scaleBase * zoom

    const cx = W / 2 + pan.x
    const cy = H / 2 + pan.y
    const x2px = (mm: number) => cx + (mm - buildPlate.x / 2) * scale
    const y2px = (mm: number) => cy - (mm - buildPlate.y / 2) * scale  // Y invertido no canvas

    // Grade de fundo (mesa)
    ctx.strokeStyle = "#1e293b"
    ctx.lineWidth = 0.5
    for (let i = 0; i <= buildPlate.x; i += 10) {
      const px = x2px(i)
      ctx.beginPath()
      ctx.moveTo(px, y2px(0))
      ctx.lineTo(px, y2px(buildPlate.y))
      ctx.stroke()
    }
    for (let i = 0; i <= buildPlate.y; i += 10) {
      const py = y2px(i)
      ctx.beginPath()
      ctx.moveTo(x2px(0), py)
      ctx.lineTo(x2px(buildPlate.x), py)
      ctx.stroke()
    }

    // Borda da mesa
    ctx.strokeStyle = "#f59e0b"
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.strokeRect(x2px(0), y2px(buildPlate.y), buildPlate.x * scale, buildPlate.y * scale)
    ctx.setLineDash([])

    // Origem
    ctx.fillStyle = "#f59e0b"
    ctx.beginPath()
    ctx.arc(x2px(0), y2px(0), 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#f59e0b"
    ctx.font = "10px monospace"
    ctx.fillText("(0,0)", x2px(0) + 6, y2px(0) + 4)

    // Label mesa
    ctx.fillStyle = "#f59e0b99"
    ctx.font = "11px monospace"
    ctx.fillText(`Mesa ${buildPlate.x}×${buildPlate.y} mm`, x2px(0) + 4, y2px(buildPlate.y) + 12)

    // Segments
    const visibleSegments = showAllLayers
      ? segments
      : segments.filter((s) => s.layer === currentLayer)

    // Travel primeiro (atrás)
    if (showTravel) {
      ctx.strokeStyle = "#3b82f6"
      ctx.lineWidth = 0.8
      ctx.setLineDash([2, 3])
      for (const s of visibleSegments) {
        if (s.extrudes) continue
        ctx.beginPath()
        ctx.moveTo(x2px(s.x1), y2px(s.y1))
        ctx.lineTo(x2px(s.x2), y2px(s.y2))
        ctx.stroke()
      }
      ctx.setLineDash([])
    }

    // Extrusão em cima
    ctx.strokeStyle = "#10b981"
    ctx.lineWidth = 1.5
    ctx.lineCap = "round"
    for (const s of visibleSegments) {
      if (!s.extrudes) continue
      ctx.beginPath()
      ctx.moveTo(x2px(s.x1), y2px(s.y1))
      ctx.lineTo(x2px(s.x2), y2px(s.y2))
      ctx.stroke()
    }

    // Escala
    ctx.fillStyle = "#64748b"
    ctx.font = "10px monospace"
    ctx.fillText(`1mm = ${scale.toFixed(2)}px  ·  zoom ${(zoom * 100).toFixed(0)}%`, 8, H - 8)
  }, [segments, currentLayer, showAllLayers, showTravel, zoom, pan, buildPlate])

  // Handlers mouse
  function handleMouseDown(e: React.MouseEvent) {
    setIsDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }
  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging) return
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    })
  }
  function handleMouseUp() { setIsDragging(false) }
  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    setZoom((z) => Math.min(10, Math.max(0.2, z * factor)))
  }
  function resetView() { setZoom(1); setPan({ x: 0, y: 0 }) }

  const currentLayerSegments = segments.filter((s) => s.layer === currentLayer)
  const extrudeCount = currentLayerSegments.filter((s) => s.extrudes).length
  const travelCount = currentLayerSegments.filter((s) => !s.extrudes).length

  return (
    <div className={cn("rounded-xl border border-white/10 bg-black/60 overflow-hidden", className)}>
      {/* HEADER */}
      <div className="px-3 py-2 bg-gradient-to-r from-emerald-950/60 to-green-950/60 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white text-sm">Preview 2D (Vista de Topo)</span>
          <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 px-1.5 py-0.5 rounded uppercase tracking-wide">
            Pronterface-style
          </span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setShowAllLayers(!showAllLayers)}
            className={cn(
              "px-2 py-1 rounded text-[10px] font-semibold border transition-all flex items-center gap-1",
              showAllLayers
                ? "bg-violet-500/30 border-violet-400 text-violet-100"
                : "bg-black/30 border-white/10 text-gray-400 hover:border-white/30",
            )}
            title="Mostrar todas as camadas"
          >
            <Layers className="w-3 h-3" />
            {showAllLayers ? "Todas as camadas" : "Só atual"}
          </button>
          <button
            onClick={() => setShowTravel(!showTravel)}
            className={cn(
              "px-2 py-1 rounded text-[10px] font-semibold border transition-all flex items-center gap-1",
              showTravel
                ? "bg-blue-500/30 border-blue-400 text-blue-100"
                : "bg-black/30 border-white/10 text-gray-400 hover:border-white/30",
            )}
            title="Mostrar movimentos de viagem"
          >
            {showTravel ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            Travel
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(10, z * 1.2))}
            className="px-2 py-1 rounded text-[10px] bg-black/30 border border-white/10 text-gray-300 hover:border-white/30 transition-all"
            title="Zoom +"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.2, z / 1.2))}
            className="px-2 py-1 rounded text-[10px] bg-black/30 border border-white/10 text-gray-300 hover:border-white/30 transition-all"
            title="Zoom -"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <button
            onClick={resetView}
            className="px-2 py-1 rounded text-[10px] bg-black/30 border border-white/10 text-gray-300 hover:border-white/30 transition-all"
            title="Reset view"
          >
            <Home className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* CANVAS */}
      <div className="relative bg-black">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className={cn(
            "w-full h-[400px] block",
            isDragging ? "cursor-grabbing" : "cursor-grab",
          )}
        />
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur px-2 py-1 rounded text-[10px] text-gray-400 border border-white/10 flex items-center gap-1.5">
          <Move className="w-3 h-3" />
          Arraste p/ pan · scroll p/ zoom
        </div>
      </div>

      {/* LAYER CONTROL */}
      <div className="p-3 border-t border-white/10 bg-gray-950/60 space-y-2">
        <div className="flex items-center gap-3">
          <Layers className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-emerald-300 whitespace-nowrap">
            Camada {currentLayer + 1} / {maxLayer + 1}
          </span>
          <input
            type="range"
            min={0}
            max={maxLayer}
            value={currentLayer}
            onChange={(e) => setCurrentLayer(parseInt(e.target.value))}
            disabled={showAllLayers}
            className="flex-1 accent-emerald-500 disabled:opacity-40"
          />
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentLayer((l) => Math.max(0, l - 1))}
              disabled={showAllLayers || currentLayer === 0}
              className="px-2 py-0.5 rounded text-[10px] bg-black/40 border border-white/10 text-gray-300 hover:border-white/30 transition-all disabled:opacity-30"
            >
              ◀
            </button>
            <button
              onClick={() => setCurrentLayer((l) => Math.min(maxLayer, l + 1))}
              disabled={showAllLayers || currentLayer === maxLayer}
              className="px-2 py-0.5 rounded text-[10px] bg-black/40 border border-white/10 text-gray-300 hover:border-white/30 transition-all disabled:opacity-30"
            >
              ▶
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat label="Extrusão camada" value={`${extrudeCount} segs`} color="emerald" />
          <Stat label="Viagem camada" value={`${travelCount} segs`} color="blue" />
          <Stat
            label="Distância total extrusão"
            value={`${(stats.totalExtrude / 1000).toFixed(2)} m`}
            color="emerald"
            icon={<Ruler className="w-3 h-3" />}
          />
          <Stat
            label="Distância total viagem"
            value={`${(stats.totalTravel / 1000).toFixed(2)} m`}
            color="blue"
            icon={<Ruler className="w-3 h-3" />}
          />
        </div>

        {/* LEGENDA */}
        <div className="flex gap-4 text-[10px] text-gray-400 pt-1 border-t border-white/5 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 bg-emerald-500 rounded" />
            <span>Extrusão (deposita bioink)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 border-t border-dashed border-blue-500" />
            <span>Viagem (sem extrusão)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Origem (0,0)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({
  label, value, color, icon,
}: {
  label: string
  value: string
  color: "emerald" | "blue" | "amber"
  icon?: React.ReactNode
}) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-300 border-emerald-500/30 bg-emerald-950/30",
    blue: "text-blue-300 border-blue-500/30 bg-blue-950/30",
    amber: "text-amber-300 border-amber-500/30 bg-amber-950/30",
  }
  return (
    <div className={cn("rounded-lg border px-2 py-1.5", colorMap[color])}>
      <div className="text-[9px] uppercase tracking-wider opacity-70 flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="text-sm font-bold font-mono">{value}</div>
    </div>
  )
}
