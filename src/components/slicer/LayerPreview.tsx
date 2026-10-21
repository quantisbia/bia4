"use client"

/**
 * BIA v4 · R15 · LayerPreview — visualização 2D por camada (canvas).
 * Paredes/infill/skirt coloridos, camada anterior em cinza (confere 0/90),
 * travels opcionais, grade 5 mm e origem = ponto do G92.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import type { SlicedLayer, BBox3 } from "@/lib/slicer/types"

const COLORS: Record<string, string> = {
  wall_outer: "#34d399", wall_inner: "#6ee7b7", infill: "#60a5fa",
  skirt: "#a78bfa", purge: "#a78bfa", bottom: "#60a5fa", top: "#60a5fa",
}

export function LayerPreview({ layers, bbox, lineWidth_mm, height = 420 }: { layers: SlicedLayer[]; bbox: BBox3; lineWidth_mm: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [idx, setIdx] = useState(0)
  const [showPrev, setShowPrev] = useState(true)
  const [showTravel, setShowTravel] = useState(false)
  const [width, setWidth] = useState(600)

  useEffect(() => { setIdx((i) => Math.min(i, Math.max(0, layers.length - 1))) }, [layers.length])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const view = useMemo(() => {
    const pad = 4
    const w = Math.max(1, bbox.maxX - bbox.minX) + pad * 2
    const h = Math.max(1, bbox.maxY - bbox.minY) + pad * 2
    const scale = Math.min(width / w, height / h)
    const ox = (width - w * scale) / 2 - (bbox.minX - pad) * scale
    const oy = (height + h * scale) / 2 + (bbox.minY - pad) * scale
    return { scale, ox, oy }
  }, [bbox, width, height])

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    cv.width = width * dpr
    cv.height = height * dpr
    const ctx = cv.getContext("2d")
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = "#0b0f14"
    ctx.fillRect(0, 0, width, height)

    const toX = (x: number) => view.ox + x * view.scale
    const toY = (y: number) => view.oy - y * view.scale

    ctx.strokeStyle = "rgba(255,255,255,0.05)"
    ctx.lineWidth = 1
    const gx0 = Math.floor((bbox.minX - 5) / 5) * 5, gx1 = Math.ceil((bbox.maxX + 5) / 5) * 5
    const gy0 = Math.floor((bbox.minY - 5) / 5) * 5, gy1 = Math.ceil((bbox.maxY + 5) / 5) * 5
    for (let x = gx0; x <= gx1; x += 5) { ctx.beginPath(); ctx.moveTo(toX(x), 0); ctx.lineTo(toX(x), height); ctx.stroke() }
    for (let y = gy0; y <= gy1; y += 5) { ctx.beginPath(); ctx.moveTo(0, toY(y)); ctx.lineTo(width, toY(y)); ctx.stroke() }
    ctx.strokeStyle = "rgba(255,255,255,0.18)"
    ctx.beginPath(); ctx.moveTo(toX(0), 0); ctx.lineTo(toX(0), height); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, toY(0)); ctx.lineTo(width, toY(0)); ctx.stroke()

    const lw = Math.max(1, lineWidth_mm * view.scale)
    const L = layers[idx]
    if (!L) return

    const drawLayer = (layer: SlicedLayer, alpha: number, forceColor?: string) => {
      ctx.lineCap = "round"; ctx.lineJoin = "round"
      let last: { x: number; y: number } | null = null
      for (const p of layer.paths) {
        if (p.points.length < 2) continue
        ctx.globalAlpha = alpha
        ctx.lineWidth = lw
        ctx.strokeStyle = forceColor ?? COLORS[p.role] ?? "#fff"
        if (showTravel && last && !forceColor) {
          ctx.save(); ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.strokeStyle = "#f87171"
          ctx.beginPath(); ctx.moveTo(toX(last.x), toY(last.y)); ctx.lineTo(toX(p.points[0].x), toY(p.points[0].y)); ctx.stroke(); ctx.restore()
        }
        ctx.beginPath()
        ctx.moveTo(toX(p.points[0].x), toY(p.points[0].y))
        for (let i = 1; i < p.points.length; i++) ctx.lineTo(toX(p.points[i].x), toY(p.points[i].y))
        if (p.closed) ctx.closePath()
        ctx.stroke()
        last = p.closed ? p.points[0] : p.points[p.points.length - 1]
      }
      ctx.globalAlpha = 1
    }

    if (showPrev && idx > 0) drawLayer(layers[idx - 1], 0.35, "#64748b")
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1; ctx.setLineDash([2, 2])
    for (const c of L.contours) {
      ctx.beginPath(); ctx.moveTo(toX(c[0].x), toY(c[0].y))
      for (let i = 1; i < c.length; i++) ctx.lineTo(toX(c[i].x), toY(c[i].y))
      ctx.closePath(); ctx.stroke()
    }
    ctx.setLineDash([])
    drawLayer(L, 0.95)

    ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = "11px ui-monospace, monospace"
    ctx.fillText("grade 5 mm · origem (0,0) = ponto do G92", 8, height - 8)
  }, [layers, idx, view, width, height, lineWidth_mm, showPrev, showTravel, bbox])

  const L = layers[idx]
  const counts = useMemo(() => {
    const c = { walls: 0, infill: 0, skirt: 0 }
    for (const p of L?.paths ?? []) {
      if (p.role.startsWith("wall")) c.walls++
      else if (p.role === "infill") c.infill++
      else c.skirt++
    }
    return c
  }, [L])

  return (
    <div ref={wrapRef} className="w-full">
      <canvas ref={canvasRef} style={{ width, height }} className="rounded-lg border border-white/10 block" />
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-300">
        <input type="range" min={0} max={Math.max(0, layers.length - 1)} value={idx} onChange={(e) => setIdx(+e.target.value)} className="flex-1 min-w-[160px] accent-emerald-400" />
        <span className="font-mono">camada {idx + 1}/{layers.length} · z={L ? (L.z_mm + L.height_mm / 2).toFixed(2) : "–"} mm</span>
        <label className="flex items-center gap-1"><input type="checkbox" checked={showPrev} onChange={(e) => setShowPrev(e.target.checked)} /> anterior</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={showTravel} onChange={(e) => setShowTravel(e.target.checked)} /> travels</label>
      </div>
      <div className="mt-1 flex gap-3 text-[11px] text-gray-400">
        <span><i className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: COLORS.wall_outer }} />paredes {counts.walls}</span>
        <span><i className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: COLORS.infill }} />infill {counts.infill}</span>
        <span><i className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: COLORS.skirt }} />skirt {counts.skirt}</span>
        <span><i className="inline-block w-2 h-2 rounded-sm mr-1 bg-slate-500" />camada anterior</span>
      </div>
    </div>
  )
}
