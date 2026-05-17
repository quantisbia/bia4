/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  GcodeViewer3D — Viewer científico proprietário BIA (R12.8)
 *
 *  Renderiza toolpath G-code em canvas 2D usando projeção isométrica
 *  rotativa (sem Three.js — bundle leve). Suporta:
 *    - Rotação interativa (mouse drag)
 *    - Zoom (scroll)
 *    - Camada por camada (range filter)
 *    - Diferenciação por tool (T0/T1/T2)
 *    - Colormap por shear/velocidade/temperatura
 *    - Highlight de travels vs extrudes
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { GcodeMove, ParsedGcode, Vec3 } from "@/lib/bioprint/toolpath-engine"
import type { BioinkFormulation } from "@/lib/bioprint/process-context"
import {
  ZoomIn, ZoomOut, Palette, RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

export type ColorMode = "tool" | "shear" | "velocity" | "layer" | "type"

export interface GcodeViewer3DProps {
  parsed: ParsedGcode | null
  shearValues?: number[]
  layerFrom?: number
  layerTo?: number
  showTravels?: boolean
  /** R12.10: multi-material formulations — quando presente, modo "tool" usa f.color */
  formulations?: BioinkFormulation[]
  /** Modo de cor inicial (default: "layer") */
  initialColorMode?: ColorMode
  className?: string
}

interface Camera {
  rotX: number  // pitch (rad)
  rotY: number  // yaw (rad)
  zoom: number  // pixel per mm
  panX: number
  panY: number
}

const DEFAULT_CAMERA: Camera = {
  rotX: -Math.PI / 6,
  rotY: Math.PI / 4,
  zoom: 8,
  panX: 0,
  panY: 0,
}

export function GcodeViewer3D({
  parsed,
  shearValues,
  layerFrom,
  layerTo,
  showTravels = false,
  formulations,
  initialColorMode = "layer",
  className,
}: GcodeViewer3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [camera, setCamera] = useState<Camera>(DEFAULT_CAMERA)
  const [colorMode, setColorMode] = useState<ColorMode>(initialColorMode)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef<{ x: number; y: number; cam: Camera } | null>(null)

  // Centro do bounding box (para centralizar a rotação)
  const center = useMemo<Vec3>(() => {
    if (!parsed) return { x: 0, y: 0, z: 0 }
    const { min, max } = parsed.stats.bounds
    return {
      x: (min.x + max.x) / 2,
      y: (min.y + max.y) / 2,
      z: (min.z + max.z) / 2,
    }
  }, [parsed])

  // Auto-fit zoom inicial
  useEffect(() => {
    if (!parsed) return
    const { min, max } = parsed.stats.bounds
    const dx = max.x - min.x
    const dy = max.y - min.y
    const dz = max.z - min.z
    const maxDim = Math.max(dx, dy, dz, 10)
    const canvas = canvasRef.current
    if (!canvas) return
    const fitZoom = Math.min(canvas.width, canvas.height) / (maxDim * 1.8)
    setCamera((c) => ({ ...c, zoom: fitZoom }))
  }, [parsed])

  // Projeção 3D → 2D
  const project = (p: Vec3, cam: Camera, w: number, h: number): { x: number; y: number; depth: number } => {
    // Translada para o centro
    const tx = p.x - center.x
    const ty = p.y - center.y
    const tz = p.z - center.z

    // Rotação Y (yaw)
    const cy = Math.cos(cam.rotY), sy = Math.sin(cam.rotY)
    const rx = tx * cy + tz * sy
    const rz = -tx * sy + tz * cy

    // Rotação X (pitch)
    const cx = Math.cos(cam.rotX), sx = Math.sin(cam.rotX)
    const ry = ty * cx - rz * sx
    const finalZ = ty * sx + rz * cx

    return {
      x: w / 2 + rx * cam.zoom + cam.panX,
      y: h / 2 - ry * cam.zoom + cam.panY,
      depth: finalZ,
    }
  }

  // Cor por modo
  const colorFor = (m: GcodeMove, idx: number, shearMax: number): string => {
    if (m.type === "G0") return "rgba(255,255,255,0.08)" // travels muito sutil

    switch (colorMode) {
      case "tool": {
        // R12.10: usa cor da formulation correspondente ao tool slot (se disponível)
        if (formulations && formulations.length > 0) {
          const f = formulations.find((x) => x.tool === m.tool)
          if (f?.color) return f.color
        }
        const palette = ["#a78bfa", "#60a5fa", "#34d399", "#fbbf24", "#f87171"]
        return palette[m.tool % palette.length]
      }
      case "shear": {
        if (!shearValues || shearValues.length === 0) return "#a78bfa"
        const s = shearValues[idx] ?? 0
        const t = Math.min(1, s / (shearMax || 1))
        // verde → amarelo → vermelho
        if (t < 0.5) {
          const k = t * 2
          return `rgb(${Math.round(52 + 200 * k)}, ${Math.round(211 - 30 * k)}, ${Math.round(153 - 100 * k)})`
        }
        const k = (t - 0.5) * 2
        return `rgb(${Math.round(252)}, ${Math.round(181 - 130 * k)}, ${Math.round(53)})`
      }
      case "velocity": {
        const maxF = 4000
        const t = Math.min(1, m.feedrate / maxF)
        return `rgb(${Math.round(96 + 159 * t)}, ${Math.round(165 - 60 * t)}, ${Math.round(250 - 100 * t)})`
      }
      case "layer": {
        if (!parsed) return "#a78bfa"
        const total = parsed.layers.length || 1
        const idxLayer = parsed.layers.indexOf(m.layer)
        const t = idxLayer / total
        // gradiente roxo → ciano
        return `rgb(${Math.round(167 - 100 * t)}, ${Math.round(139 + 100 * t)}, ${Math.round(250 - 50 * t)})`
      }
      case "type":
        return m.e > 0 ? "#34d399" : "#a78bfa"
      default:
        return "#a78bfa"
    }
  }

  // Render principal
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    // Fundo (gradiente sutil)
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 1.2)
    grad.addColorStop(0, "rgba(15, 18, 32, 1)")
    grad.addColorStop(1, "rgba(5, 5, 12, 1)")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    if (!parsed || parsed.moves.length === 0) {
      ctx.fillStyle = "rgba(167, 139, 250, 0.4)"
      ctx.font = "12px system-ui"
      ctx.textAlign = "center"
      ctx.fillText("Sem G-code carregado", w / 2, h / 2)
      return
    }

    // Eixos de referência (origem do print)
    drawAxes(ctx, project, camera, w, h, center)

    // Plano de bandeja (grid)
    drawBed(ctx, project, camera, w, h, parsed.stats.bounds, center)

    // Ordena moves por profundidade média (painter's algorithm simples)
    const shearMax = shearValues ? Math.max(...shearValues, 1) : 1
    const items: Array<{ move: GcodeMove; idx: number; from: Vec3; midDepth: number }> = []
    let prev: Vec3 = { x: 0, y: 0, z: 0 }
    for (let i = 0; i < parsed.moves.length; i++) {
      const m = parsed.moves[i]
      // Filtro de camadas
      if (layerFrom !== undefined && m.layer < layerFrom) {
        prev = m.to
        continue
      }
      if (layerTo !== undefined && m.layer > layerTo) {
        prev = m.to
        continue
      }
      if (m.type === "G0" && !showTravels) {
        prev = m.to
        continue
      }
      const mid = {
        x: (prev.x + m.to.x) / 2,
        y: (prev.y + m.to.y) / 2,
        z: (prev.z + m.to.z) / 2,
      }
      const projMid = project(mid, camera, w, h)
      items.push({ move: m, idx: i, from: { ...prev }, midDepth: projMid.depth })
      prev = m.to
    }

    items.sort((a, b) => a.midDepth - b.midDepth)

    for (const item of items) {
      const { move, idx, from } = item
      const a = project(from, camera, w, h)
      const b = project(move.to, camera, w, h)
      ctx.strokeStyle = colorFor(move, idx, shearMax)
      ctx.lineWidth = move.type === "G0" ? 0.6 : 1.4
      if (move.type === "G0") {
        ctx.setLineDash([3, 3])
      } else {
        ctx.setLineDash([])
      }
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }

    // Indicador de origem (G92)
    const origin = project({ x: 0, y: 0, z: 0 }, camera, w, h)
    ctx.fillStyle = "rgba(52, 211, 153, 0.8)"
    ctx.beginPath()
    ctx.arc(origin.x, origin.y, 5, 0, 2 * Math.PI)
    ctx.fill()
    ctx.fillStyle = "rgba(52, 211, 153, 1)"
    ctx.font = "10px monospace"
    ctx.textAlign = "left"
    ctx.fillText("G92 zero", origin.x + 8, origin.y - 6)

    // Stats overlay
    ctx.fillStyle = "rgba(255,255,255,0.5)"
    ctx.font = "9px monospace"
    ctx.textAlign = "left"
    ctx.fillText(
      `${parsed.stats.moveCount} moves · ${parsed.layers.length} layers · ${parsed.stats.totalExtrudeLength.toFixed(0)} mm extrude`,
      8,
      h - 8,
    )
    ctx.textAlign = "right"
    ctx.fillText(`zoom: ${camera.zoom.toFixed(1)}px/mm`, w - 8, h - 8)
  }, [parsed, camera, colorMode, layerFrom, layerTo, showTravels, shearValues, center, formulations])

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (!rect) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      const ctx = canvas.getContext("2d")
      ctx?.scale(dpr, dpr)
      setCamera((c) => ({ ...c }))  // trigger re-render
    }
    resize()
    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
  }, [])

  // Mouse interactions
  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, cam: { ...camera } }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setCamera({
      ...dragStart.current.cam,
      rotY: dragStart.current.cam.rotY + dx * 0.01,
      rotX: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, dragStart.current.cam.rotX + dy * 0.01)),
    })
  }
  const onMouseUp = () => {
    setIsDragging(false)
    dragStart.current = null
  }
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    setCamera((c) => ({ ...c, zoom: Math.max(0.5, Math.min(100, c.zoom * factor)) }))
  }

  return (
    <div className={cn("relative w-full h-full bg-[#05050c] rounded-xl overflow-hidden border border-violet-500/15", className)}>
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      />

      {/* Toolbar topo-direita */}
      <div className="absolute top-2 right-2 flex flex-col gap-1.5">
        <button
          onClick={() => setCamera(DEFAULT_CAMERA)}
          className="px-2 py-1.5 rounded-lg bg-black/60 hover:bg-violet-500/30 border border-white/10 text-white/80 text-[10px] flex items-center gap-1 transition-colors"
          title="Resetar câmera"
        >
          <RefreshCw className="w-3 h-3" /> Reset
        </button>
        <button
          onClick={() => setCamera((c) => ({ ...c, zoom: c.zoom * 1.25 }))}
          className="px-2 py-1.5 rounded-lg bg-black/60 hover:bg-violet-500/30 border border-white/10 text-white/80 text-[10px] flex items-center gap-1 transition-colors"
        >
          <ZoomIn className="w-3 h-3" />
        </button>
        <button
          onClick={() => setCamera((c) => ({ ...c, zoom: c.zoom * 0.8 }))}
          className="px-2 py-1.5 rounded-lg bg-black/60 hover:bg-violet-500/30 border border-white/10 text-white/80 text-[10px] flex items-center gap-1 transition-colors"
        >
          <ZoomOut className="w-3 h-3" />
        </button>
      </div>

      {/* Colormode selector — topo-esquerda */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 border border-white/10 rounded-lg p-1.5">
        <Palette className="w-3 h-3 text-violet-300 ml-1" />
        {(["layer", "tool", "shear", "velocity", "type"] as ColorMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setColorMode(m)}
            className={cn(
              "px-2 py-0.5 rounded text-[10px] transition-colors capitalize",
              colorMode === m
                ? "bg-violet-500/40 text-white font-semibold"
                : "text-white/60 hover:text-white",
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Legenda multi-material (R12.10) — só aparece em colorMode="tool" + formulations */}
      {colorMode === "tool" && formulations && formulations.length > 0 && (
        <div className="absolute bottom-10 right-2 bg-black/70 border border-violet-500/30 rounded-lg p-2 backdrop-blur-sm">
          <div className="text-[9px] uppercase tracking-wider text-violet-300 font-semibold mb-1.5 flex items-center gap-1">
            <Palette className="w-2.5 h-2.5" /> Multi-material
          </div>
          <div className="space-y-1">
            {formulations.map((f) => (
              <div key={f.tool} className="flex items-center gap-1.5 text-[10px]">
                <span
                  className="w-3 h-3 rounded-sm border border-white/20"
                  style={{ backgroundColor: f.color }}
                />
                <span className="text-white/90 font-mono">T{f.tool}</span>
                <span className="text-white/60">·</span>
                <span className="text-white/80">{f.material}</span>
                {f.cellType && (
                  <span className="text-emerald-300/80 text-[9px]">+{f.cellType}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hint inferior */}
      <div className="absolute bottom-2 left-2 text-[9px] text-white/40 font-mono pointer-events-none">
        🖱️ arraste = rotacionar · scroll = zoom
      </div>
    </div>
  )
}

// ─── Helpers de desenho ────────────────────────────────────────────────────

function drawAxes(
  ctx: CanvasRenderingContext2D,
  project: (p: Vec3, c: Camera, w: number, h: number) => { x: number; y: number; depth: number },
  cam: Camera,
  w: number,
  h: number,
  _center: Vec3,
) {
  const o = project({ x: 0, y: 0, z: 0 }, cam, w, h)
  const len = 20

  const drawAx = (to: Vec3, color: string, label: string) => {
    const t = project(to, cam, w, h)
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(o.x, o.y)
    ctx.lineTo(t.x, t.y)
    ctx.stroke()
    ctx.fillStyle = color
    ctx.font = "bold 11px monospace"
    ctx.fillText(label, t.x + 4, t.y + 4)
  }

  drawAx({ x: len, y: 0, z: 0 }, "#ef4444", "X")
  drawAx({ x: 0, y: len, z: 0 }, "#22c55e", "Y")
  drawAx({ x: 0, y: 0, z: len }, "#3b82f6", "Z")
}

function drawBed(
  ctx: CanvasRenderingContext2D,
  project: (p: Vec3, c: Camera, w: number, h: number) => { x: number; y: number; depth: number },
  cam: Camera,
  w: number,
  h: number,
  bounds: { min: Vec3; max: Vec3 },
  _center: Vec3,
) {
  // Grid no plano XY (z=0), pad de 10mm em cada direção
  const pad = 10
  const xMin = Math.floor((bounds.min.x - pad) / 10) * 10
  const xMax = Math.ceil((bounds.max.x + pad) / 10) * 10
  const yMin = Math.floor((bounds.min.y - pad) / 10) * 10
  const yMax = Math.ceil((bounds.max.y + pad) / 10) * 10

  ctx.strokeStyle = "rgba(255,255,255,0.08)"
  ctx.lineWidth = 0.5
  ctx.setLineDash([])

  for (let x = xMin; x <= xMax; x += 10) {
    const a = project({ x, y: yMin, z: 0 }, cam, w, h)
    const b = project({ x, y: yMax, z: 0 }, cam, w, h)
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
  for (let y = yMin; y <= yMax; y += 10) {
    const a = project({ x: xMin, y, z: 0 }, cam, w, h)
    const b = project({ x: xMax, y, z: 0 }, cam, w, h)
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
}
