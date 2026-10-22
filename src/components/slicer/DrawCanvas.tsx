"use client"

/**
 * BIA v4 · R23 · DrawCanvas — tela de desenho touch/mouse sobre a mesa
 * ─────────────────────────────────────────────────────────────────────
 * Desenhe com o dedo (touch), caneta ou mouse/trackpad. Ferramentas:
 * livre, linha, círculo, retângulo, apagar. Cada traço pertence a um
 * cabeçote (cor). Coordenadas em mm; origem = ponto zero = bico (centro).
 * Pointer Events cobrem mouse + touch + caneta num só código.
 */

import { useEffect, useRef, useState, useCallback } from "react"
import { Pencil, Minus, Circle as CircleIcon, Square, Eraser, Undo2, Trash2, Grid3X3 } from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import type { Vec2 } from "@/lib/slicer/types"
import { type Stroke, type StrokeKind, newStrokeId, circlePoints, rectPoints, simplifyStroke } from "@/lib/slicer/draw-print"
import { TOOL_COLORS } from "@/lib/slicer/tools"

export type DrawTool = StrokeKind | "erase"

export interface DrawCanvasProps {
  strokes: Stroke[]
  onChange: (s: Stroke[]) => void
  /** cabeçote ativo (T0..T3) */
  activeTool: number
  /** nº de cabeçotes disponíveis */
  toolCount: number
  onActiveTool: (t: number) => void
  /** diâmetro útil do alvo (mm) para desenhar o contorno */
  bedDiameter_mm: number
  /** preencher formas fechadas por padrão */
  fillClosed: boolean
  onFillClosed: (v: boolean) => void
  className?: string
}

const SNAP_MM = 0.5

export function DrawCanvas({ strokes, onChange, activeTool, toolCount, onActiveTool, bedDiameter_mm, fillClosed, onFillClosed, className }: DrawCanvasProps) {
  const cvRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [tool, setTool] = useState<DrawTool>("freehand")
  const [snap, setSnap] = useState(true)
  const [size, setSize] = useState(420)
  const drawing = useRef<{ start: Vec2; pts: Vec2[] } | null>(null)
  const [preview, setPreview] = useState<Vec2[] | null>(null)

  // responsivo
  useEffect(() => {
    const el = wrapRef.current; if (!el) return
    const ro = new ResizeObserver(() => setSize(Math.max(260, Math.min(el.clientWidth, 640))))
    ro.observe(el); setSize(Math.max(260, Math.min(el.clientWidth, 640)))
    return () => ro.disconnect()
  }, [])

  const extent = Math.max(bedDiameter_mm * 1.15, 40)
  const sc = size / extent
  const toMm = useCallback((e: { clientX: number; clientY: number }): Vec2 => {
    const cv = cvRef.current!; const r = cv.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * size, y = ((e.clientY - r.top) / r.height) * size
    let mx = (x - size / 2) / sc, my = -(y - size / 2) / sc
    if (snap) { mx = Math.round(mx / SNAP_MM) * SNAP_MM; my = Math.round(my / SNAP_MM) * SNAP_MM }
    return { x: +mx.toFixed(2), y: +my.toFixed(2) }
  }, [size, sc, snap])
  const X = useCallback((x: number) => size / 2 + x * sc, [size, sc])
  const Y = useCallback((y: number) => size / 2 - y * sc, [size, sc])

  // render
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return
    const ctx = cv.getContext("2d"); if (!ctx) return
    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = "#0a0f0e"; ctx.fillRect(0, 0, size, size)
    // grade 5 mm / 10 mm
    for (let g = -Math.ceil(extent / 2); g <= extent / 2; g += 5) {
      ctx.strokeStyle = g % 10 === 0 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.035)"; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(X(g), 0); ctx.lineTo(X(g), size); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, Y(g)); ctx.lineTo(size, Y(g)); ctx.stroke()
    }
    // alvo
    ctx.beginPath(); ctx.arc(size / 2, size / 2, (bedDiameter_mm / 2) * sc, 0, Math.PI * 2)
    ctx.strokeStyle = "rgba(125,211,252,0.55)"; ctx.lineWidth = 1.5; ctx.stroke()
    // traços
    const drawPath = (pts: Vec2[], closed: boolean, color: string, width: number, dashed = false) => {
      if (pts.length < 2) return
      ctx.beginPath(); ctx.moveTo(X(pts[0].x), Y(pts[0].y))
      for (let i = 1; i < pts.length; i++) ctx.lineTo(X(pts[i].x), Y(pts[i].y))
      if (closed) ctx.closePath()
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round"
      ctx.setLineDash(dashed ? [4, 4] : []); ctx.stroke(); ctx.setLineDash([])
    }
    for (const s of strokes) {
      const color = s.color ?? TOOL_COLORS[s.tool % TOOL_COLORS.length]
      if (s.closed && s.fill) { ctx.beginPath(); ctx.moveTo(X(s.points[0].x), Y(s.points[0].y)); for (const p of s.points.slice(1)) ctx.lineTo(X(p.x), Y(p.y)); ctx.closePath(); ctx.fillStyle = color + "33"; ctx.fill() }
      drawPath(s.points, s.closed, color, 3)
      // numeração
      const p0 = s.points[0]; ctx.fillStyle = color; ctx.font = "10px ui-sans-serif"; ctx.fillText(`${strokes.indexOf(s) + 1}·T${s.tool}`, X(p0.x) + 4, Y(p0.y) - 4)
    }
    if (preview && preview.length >= 2) drawPath(preview, tool === "circle" || tool === "rect", TOOL_COLORS[activeTool % TOOL_COLORS.length], 2, true)
    // ponto zero
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(size / 2 - 8, size / 2); ctx.lineTo(size / 2 + 8, size / 2); ctx.moveTo(size / 2, size / 2 - 8); ctx.lineTo(size / 2, size / 2 + 8); ctx.stroke()
    ctx.fillStyle = "#fbbf24"; ctx.font = "10px ui-sans-serif"; ctx.fillText("ponto zero", size / 2 + 10, size / 2 - 6)
    ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.fillText("+X →", size - 36, size - 8); ctx.fillText("+Y ↑", 6, 14); ctx.fillText(`grade 5 mm · Ø${bedDiameter_mm.toFixed(0)} mm`, 6, size - 8)
  }, [strokes, preview, size, sc, extent, bedDiameter_mm, X, Y, tool, activeTool])

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault(); (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
    const p = toMm(e)
    if (tool === "erase") {
      // apaga o traço mais próximo (distância ponto–segmento < 1.5 mm)
      let best = -1, bestD = 1.5
      strokes.forEach((s, i) => { for (let k = 1; k < s.points.length; k++) { const d = segDist(p, s.points[k - 1], s.points[k]); if (d < bestD) { bestD = d; best = i } } })
      if (best >= 0) onChange(strokes.filter((_, i) => i !== best))
      return
    }
    drawing.current = { start: p, pts: [p] }
    setPreview([p])
  }
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    e.preventDefault()
    const p = toMm(e); const d = drawing.current
    if (tool === "freehand" || tool === "polyline") { const last = d.pts[d.pts.length - 1]; if (Math.hypot(p.x - last.x, p.y - last.y) >= 0.3) d.pts.push(p); setPreview([...d.pts]) }
    else if (tool === "line") setPreview([d.start, p])
    else if (tool === "circle") setPreview(circlePoints(d.start, Math.hypot(p.x - d.start.x, p.y - d.start.y)))
    else if (tool === "rect") setPreview(rectPoints(d.start, p))
  }
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const p = toMm(e); const d = drawing.current; drawing.current = null; setPreview(null)
    let s: Stroke | null = null
    const color = TOOL_COLORS[activeTool % TOOL_COLORS.length]
    if (tool === "freehand" || tool === "polyline") {
      const pts = simplifyStroke(d.pts, 0.15)
      if (pts.length >= 2) {
        const closeLoop = pts.length >= 6 && Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) < 2
        s = { id: newStrokeId(), kind: "freehand", points: closeLoop ? pts.slice(0, -1) : pts, closed: closeLoop, tool: activeTool, fill: closeLoop && fillClosed, color }
      }
    } else if (tool === "line") {
      if (Math.hypot(p.x - d.start.x, p.y - d.start.y) >= 0.5) s = { id: newStrokeId(), kind: "line", points: [d.start, p], closed: false, tool: activeTool, fill: false, color }
    } else if (tool === "circle") {
      const r = Math.hypot(p.x - d.start.x, p.y - d.start.y)
      if (r >= 0.5) s = { id: newStrokeId(), kind: "circle", points: circlePoints(d.start, r), closed: true, tool: activeTool, fill: fillClosed, color }
    } else if (tool === "rect") {
      if (Math.abs(p.x - d.start.x) >= 0.5 && Math.abs(p.y - d.start.y) >= 0.5) s = { id: newStrokeId(), kind: "rect", points: rectPoints(d.start, p), closed: true, tool: activeTool, fill: fillClosed, color }
    }
    if (s) onChange([...strokes, s])
  }

  const ToolBtn = ({ id, icon: Icon, label }: { id: DrawTool; icon: React.ElementType; label: string }) => (
    <button type="button" onClick={() => setTool(id)} title={label} className={cn("px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5", tool === id ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100" : "border-white/10 text-gray-300 hover:border-white/25")}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  )

  return (
    <div className={cn("space-y-2", className)} ref={wrapRef}>
      <div className="flex flex-wrap items-center gap-1.5">
        <ToolBtn id="freehand" icon={Pencil} label="Livre" />
        <ToolBtn id="line" icon={Minus} label="Linha" />
        <ToolBtn id="circle" icon={CircleIcon} label="Círculo" />
        <ToolBtn id="rect" icon={Square} label="Retângulo" />
        <ToolBtn id="erase" icon={Eraser} label="Apagar" />
        <span className="mx-1 h-5 w-px bg-white/10" />
        <button type="button" onClick={() => onChange(strokes.slice(0, -1))} disabled={!strokes.length} className="px-2 py-1.5 rounded-lg border border-white/10 text-xs text-gray-300 flex items-center gap-1 disabled:opacity-40"><Undo2 className="w-3.5 h-3.5" /> Desfazer</button>
        <button type="button" onClick={() => onChange([])} disabled={!strokes.length} className="px-2 py-1.5 rounded-lg border border-white/10 text-xs text-gray-300 flex items-center gap-1 disabled:opacity-40"><Trash2 className="w-3.5 h-3.5" /> Limpar</button>
        <label className="ml-auto text-[11px] text-gray-400 flex items-center gap-1"><Grid3X3 className="w-3 h-3" /><input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} /> imã 0,5 mm</label>
        <label className="text-[11px] text-gray-400 flex items-center gap-1"><input type="checkbox" checked={fillClosed} onChange={(e) => onFillClosed(e.target.checked)} /> preencher formas fechadas</label>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-gray-400">Desenhando com:</span>
        {Array.from({ length: toolCount }, (_, i) => (
          <button key={i} type="button" onClick={() => onActiveTool(i)} className={cn("px-2.5 py-1 rounded-lg border font-mono", activeTool === i ? "border-white/40 bg-white/10 text-white" : "border-white/10 text-gray-300")} style={{ borderColor: activeTool === i ? TOOL_COLORS[i % TOOL_COLORS.length] : undefined }}>
            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: TOOL_COLORS[i % TOOL_COLORS.length] }} />T{i}
          </button>
        ))}
      </div>
      <canvas
        ref={cvRef} width={size} height={size}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        className="w-full h-auto rounded-xl border border-white/10 touch-none select-none cursor-crosshair"
        style={{ touchAction: "none" }}
      />
      <div className="text-[11px] text-gray-500">Toque/arraste para desenhar. Cada traço vira um caminho de extrusão do cabeçote escolhido. Traço livre que termina perto de onde começou fecha a forma.</div>
    </div>
  )
}

function segDist(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x, dy = b.y - a.y; const L2 = dx * dx + dy * dy || 1e-9
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}
