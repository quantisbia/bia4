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
import { Pencil, Minus, Circle as CircleIcon, Square, Eraser, Undo2, Trash2, Grid3X3, Layers, Check, X as XIcon, ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
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
  /** R24.3 · camadas padrão do desenho e altura de camada — para a pergunta ao fechar uma forma */
  defaultLayers?: number
  layerHeight_mm?: number
  /** se false, não pergunta: usa defaultLayers direto */
  askLayersOnClose?: boolean
  className?: string
}

const SNAP_MM = 0.5

export function DrawCanvas({ strokes, onChange, activeTool, toolCount, onActiveTool, bedDiameter_mm, fillClosed, onFillClosed, defaultLayers = 3, layerHeight_mm = 0.3, askLayersOnClose = true, className }: DrawCanvasProps) {
  const cvRef = useRef<HTMLCanvasElement>(null)
  // R24.3 · forma fechada aguardando resposta "quantas camadas?"
  const [pending, setPending] = useState<Stroke | null>(null)
  const [pendingLayers, setPendingLayers] = useState(defaultLayers)
  const [pendingFill, setPendingFill] = useState(fillClosed)
  const [editing, setEditing] = useState<Stroke | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [tool, setTool] = useState<DrawTool>("freehand")
  const [snap, setSnap] = useState(true)
  const [size, setSize] = useState(420)
  const drawing = useRef<{ start: Vec2; pts: Vec2[] } | null>(null)
  const [preview, setPreview] = useState<Vec2[] | null>(null)

  // responsivo — tamanho em px limitado pelo container E pela altura da janela
  // (R24.4: nunca maior que a tela → não "estoura" ao mostrar o resultado)
  useEffect(() => {
    const el = wrapRef.current; if (!el) return
    const measure = () => {
      const maxH = typeof window !== "undefined" ? Math.max(260, window.innerHeight - 260) : 640
      setSize(Math.max(260, Math.min(el.clientWidth, 640, maxH)))
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el); measure()
    window.addEventListener("resize", measure)
    return () => { ro.disconnect(); window.removeEventListener("resize", measure) }
  }, [])

  // R24.5 · lupa: zoom 0.5×–4× sobre a mesa (scroll do mouse / botões)
  const [zoom, setZoom] = useState(1)
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return
    // listener nativo não-passivo: React registra onWheel como passive e não deixa preventDefault
    const onWheel = (e: WheelEvent) => { e.preventDefault(); setZoom((z) => Math.max(0.5, Math.min(4, +(z * (e.deltaY < 0 ? 1.1 : 1 / 1.1)).toFixed(2)))) }
    cv.addEventListener("wheel", onWheel, { passive: false })
    return () => cv.removeEventListener("wheel", onWheel)
  }, [])
  const extent = Math.max(bedDiameter_mm * 1.15, 40) / zoom
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
    const gStep = extent > 120 ? 10 : extent < 25 ? 1 : 5
    for (let g = -Math.ceil(extent / 2 / gStep) * gStep; g <= extent / 2; g += gStep) {
      ctx.strokeStyle = (g / gStep) % 2 === 0 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.035)"; ctx.lineWidth = 1
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
      const p0 = s.points[0]; ctx.fillStyle = color; ctx.font = "10px ui-sans-serif"
      const lab = `${strokes.indexOf(s) + 1}·T${s.tool}${s.closed ? ` · ${s.layers ?? defaultLayers}cam` : ""}`
      ctx.fillText(lab, X(p0.x) + 4, Y(p0.y) - 4)
    }
    if (preview && preview.length >= 2) drawPath(preview, tool === "circle" || tool === "rect", TOOL_COLORS[activeTool % TOOL_COLORS.length], 2, true)
    // ponto zero
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(size / 2 - 8, size / 2); ctx.lineTo(size / 2 + 8, size / 2); ctx.moveTo(size / 2, size / 2 - 8); ctx.lineTo(size / 2, size / 2 + 8); ctx.stroke()
    ctx.fillStyle = "#fbbf24"; ctx.font = "10px ui-sans-serif"; ctx.fillText("ponto zero", size / 2 + 10, size / 2 - 6)
    ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.fillText("+X →", size - 36, size - 8); ctx.fillText("+Y ↑", 6, 14); ctx.fillText(`grade ${gStep} mm · Ø${bedDiameter_mm.toFixed(0)} mm · zoom ${zoom.toFixed(1)}×`, 6, size - 8)
    if (pending && pending.points.length >= 2) drawPath(pending.points, true, "#ffffff", 2, true)
  }, [strokes, preview, pending, size, sc, extent, bedDiameter_mm, X, Y, tool, activeTool, defaultLayers, zoom])

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
    if (!s) return
    if (s.closed && askLayersOnClose) {
      // Fechou uma forma → pergunta quantas camadas (vira volume) antes de salvar
      setPendingLayers(Math.max(1, Math.round(defaultLayers))); setPendingFill(s.fill); setPending(s)
      return
    }
    onChange([...strokes, s])
  }
  const commitPending = () => {
    if (!pending) return
    onChange([...strokes, { ...pending, layers: Math.max(1, Math.round(pendingLayers)), fill: pendingFill }])
    setPending(null)
  }
  const commitEditing = () => {
    if (!editing) return
    onChange(strokes.map((x) => x.id === editing.id ? { ...x, layers: Math.max(1, Math.round(pendingLayers)), fill: pendingFill } : x))
    setEditing(null)
  }
  // duplo clique/toque em uma forma fechada → reabre a pergunta para editar camadas
  const onDouble = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const p = toMm(e)
    let best: Stroke | null = null, bestD = 1.5
    for (const st of strokes) { if (!st.closed) continue; const pts = [...st.points, st.points[0]]; for (let k = 1; k < pts.length; k++) { const d = segDist(p, pts[k - 1], pts[k]); if (d < bestD) { bestD = d; best = st } } }
    if (best) { setPendingLayers(best.layers ?? defaultLayers); setPendingFill(best.fill); setEditing(best) }
  }

  const ToolBtn = ({ id, icon: Icon, label }: { id: DrawTool; icon: React.ElementType; label: string }) => (
    <button type="button" onClick={() => setTool(id)} title={label} className={cn("px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5", tool === id ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100" : "border-white/10 text-gray-300 hover:border-white/25")}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  )

  return (
    <div className={cn("space-y-2 min-w-0 max-w-full", className)} ref={wrapRef}>
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
        <span className="mx-1 h-5 w-px bg-white/10" />
        <div className="flex items-center gap-1" title="Lupa — zoom sobre a mesa (ou use o scroll do mouse no desenho)">
          <button type="button" onClick={() => setZoom((z) => Math.max(0.5, +(z / 1.25).toFixed(2)))} className="p-1.5 rounded-lg border border-white/10 text-gray-300 hover:border-white/25" aria-label="Diminuir zoom"><ZoomOut className="w-3.5 h-3.5" /></button>
          <span className="text-[11px] font-mono text-gray-400 w-10 text-center">{zoom.toFixed(1)}×</span>
          <button type="button" onClick={() => setZoom((z) => Math.min(4, +(z * 1.25).toFixed(2)))} className="p-1.5 rounded-lg border border-white/10 text-gray-300 hover:border-white/25" aria-label="Aumentar zoom"><ZoomIn className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={() => setZoom(1)} className="p-1.5 rounded-lg border border-white/10 text-gray-300 hover:border-white/25" aria-label="Ajustar à mesa" title="Ajustar à mesa (1×)"><Maximize2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-gray-400">Desenhando com:</span>
        {Array.from({ length: toolCount }, (_, i) => (
          <button key={i} type="button" onClick={() => onActiveTool(i)} className={cn("px-2.5 py-1 rounded-lg border font-mono", activeTool === i ? "border-white/40 bg-white/10 text-white" : "border-white/10 text-gray-300")} style={{ borderColor: activeTool === i ? TOOL_COLORS[i % TOOL_COLORS.length] : undefined }}>
            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: TOOL_COLORS[i % TOOL_COLORS.length] }} />T{i}
          </button>
        ))}
      </div>
      <div className="relative mx-auto" style={{ width: size, maxWidth: "100%" }}>
        <canvas
          ref={cvRef} width={size} height={size}
          onPointerDown={pending || editing ? undefined : onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          onDoubleClick={onDouble}
          className={cn("block rounded-xl border border-white/10 touch-none select-none", pending || editing ? "cursor-default opacity-90" : "cursor-crosshair")}
          style={{ touchAction: "none", width: size, height: size, maxWidth: "100%" }}
        />
        {(pending || editing) && (
          <LayersPrompt
            title={editing ? "Editar forma fechada" : "Forma fechada! Quantas camadas?"}
            kind={(editing ?? pending)!.kind}
            layers={pendingLayers} onLayers={setPendingLayers}
            fill={pendingFill} onFill={setPendingFill}
            layerHeight_mm={layerHeight_mm}
            onOk={editing ? commitEditing : commitPending}
            onCancel={() => { setPending(null); setEditing(null) }}
            canDelete={!!editing}
            onDelete={() => { if (editing) onChange(strokes.filter((x) => x.id !== editing.id)); setEditing(null) }}
          />
        )}
      </div>
      <div className="text-[11px] text-gray-500">Toque/arraste para desenhar. Cada traço vira um caminho de extrusão do cabeçote escolhido. Traço livre que termina perto de onde começou fecha a forma — e a BIA pergunta quantas camadas ela deve ter (vira volume). Duplo toque numa forma fechada para mudar as camadas.</div>
    </div>
  )
}

function segDist(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x, dy = b.y - a.y; const L2 = dx * dx + dy * dy || 1e-9
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

// ─── R24.3 · Pergunta "quantas camadas?" ao fechar uma forma ─────────────
const QUICK_LAYERS = [1, 3, 5, 10, 20, 40]
function LayersPrompt({ title, kind, layers, onLayers, fill, onFill, layerHeight_mm, onOk, onCancel, canDelete, onDelete }: {
  title: string; kind: StrokeKind
  layers: number; onLayers: (n: number) => void
  fill: boolean; onFill: (v: boolean) => void
  layerHeight_mm: number
  onOk: () => void; onCancel: () => void
  canDelete?: boolean; onDelete?: () => void
}) {
  const h = (Math.max(1, layers) * layerHeight_mm)
  const kindLabel = kind === "circle" ? "círculo" : kind === "rect" ? "retângulo" : "laço livre"
  return (
    <div className="absolute inset-0 flex items-center justify-center p-3 rounded-xl bg-black/55 backdrop-blur-[2px]" role="dialog" aria-label={title}>
      <div className="w-full max-w-sm rounded-2xl border border-emerald-400/40 bg-[#0b1412] shadow-2xl p-4 space-y-3" onPointerDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 text-white font-semibold text-sm"><Layers className="w-4 h-4 text-emerald-300" /> {title}</div>
        <p className="text-[11.5px] text-gray-300">
          Você fechou um <b className="text-white">{kindLabel}</b>. Quantas camadas essa forma deve ter? Cada camada repete o contorno
          {fill ? " e o preenchimento" : ""} em Z, criando volume.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_LAYERS.map((n) => (
            <button key={n} type="button" onClick={() => onLayers(n)} className={cn("px-2.5 py-1 rounded-lg border text-xs font-mono", layers === n ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-100" : "border-white/10 text-gray-300 hover:border-white/25")}>{n}</button>
          ))}
          <input type="number" min={1} max={200} value={layers} onChange={(e) => onLayers(Math.max(1, Math.min(200, Math.round(+e.target.value || 1))))} className="w-20 rounded-lg bg-black/30 border border-white/10 focus:border-emerald-400/50 px-2 py-1 text-xs font-mono text-white" aria-label="Número de camadas" />
        </div>
        <input type="range" min={1} max={60} value={Math.min(60, layers)} onChange={(e) => onLayers(+e.target.value)} className="w-full accent-emerald-400" />
        <div className="flex items-center justify-between text-[11px] text-gray-400">
          <span>Altura resultante: <b className="text-emerald-200">{h.toFixed(2)} mm</b> ({layers} × {layerHeight_mm} mm)</span>
          <label className="flex items-center gap-1.5 text-gray-300"><input type="checkbox" checked={fill} onChange={(e) => onFill(e.target.checked)} /> preencher o interior</label>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          {canDelete && <button type="button" onClick={onDelete} className="mr-auto px-3 py-1.5 rounded-lg text-xs text-rose-300 hover:bg-rose-500/10 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Apagar forma</button>}
          <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs text-gray-300 hover:bg-white/10 flex items-center gap-1"><XIcon className="w-3.5 h-3.5" /> {canDelete ? "Cancelar" : "Descartar"}</button>
          <button type="button" onClick={onOk} className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-400 text-black hover:bg-emerald-300 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Usar {layers} camada{layers === 1 ? "" : "s"}</button>
        </div>
      </div>
    </div>
  )
}
