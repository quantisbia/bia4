"use client"

/**
 * R36 · Canvas de desenho do módulo básico.
 * Desenhe com o mouse/dedo sobre a área útil (mm). Traço fechado → sólido (recebe perímetros +
 * preenchimento e altura); traço aberto → filete único. Também há ferramentas de retângulo e círculo.
 */

import { useRef, useState } from "react"
import { Pencil, Spline, Square, Circle, Eraser, Undo2 } from "lucide-react"
import { type BasicState, type Pt, type Shape, shapeFromStroke, defaultShape, surfaceExtent, bbox, shapePts, circlePts } from "@/lib/print-basic/engine"

export type DrawTool = "solid" | "line" | "rect" | "circle"

export function DrawCanvas({ state, onAdd, onRemoveLast, head, height }: {
  state: BasicState; onAdd: (s: Shape) => void; onRemoveLast: () => void; head: number; height: number
}) {
  const ext = surfaceExtent(state.surface)
  const W = ext.usableW, H = ext.usableH
  const svgRef = useRef<SVGSVGElement>(null)
  const [tool, setTool] = useState<DrawTool>("solid")
  const [stroke, setStroke] = useState<Pt[] | null>(null)
  const [drag, setDrag] = useState<{ a: Pt; b: Pt } | null>(null)

  const toMM = (e: React.PointerEvent): Pt | null => {
    const svg = svgRef.current; if (!svg) return null
    const ctm = svg.getScreenCTM(); if (!ctm) return null
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY
    const q = p.matrixTransform(ctm.inverse())
    return { x: +q.x.toFixed(2), y: +(-q.y).toFixed(2) } // Y para cima
  }
  const down = (e: React.PointerEvent) => {
    const p = toMM(e); if (!p) return
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    if (tool === "rect" || tool === "circle") setDrag({ a: p, b: p }); else setStroke([p])
  }
  const move = (e: React.PointerEvent) => {
    const p = toMM(e); if (!p) return
    if (drag) setDrag({ ...drag, b: p })
    else if (stroke) setStroke((s) => (s ? [...s, p] : s))
  }
  const up = () => {
    if (drag) {
      const { a, b } = drag; setDrag(null)
      const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2
      if (w < 0.5 && h < 0.5) return
      if (tool === "circle") { const d = Math.max(w, h); onAdd({ ...defaultShape("disc", head), x: +cx.toFixed(2), y: +cy.toFixed(2), size: +d.toFixed(2), height }) }
      else {
        const pts = [{ x: cx - w / 2, y: cy - h / 2 }, { x: cx + w / 2, y: cy - h / 2 }, { x: cx + w / 2, y: cy + h / 2 }, { x: cx - w / 2, y: cy + h / 2 }]
        onAdd({ ...defaultShape("polygon", head), name: "Retângulo", pts, size: Math.max(w, h), height })
      }
      return
    }
    if (stroke) {
      const s = stroke; setStroke(null)
      const shp = shapeFromStroke(s, tool === "solid", head, height)
      if (shp) onAdd(shp)
    }
  }

  const toSvg = (p: Pt) => ({ x: p.x, y: -p.y })
  const grid = 5
  const gx: number[] = []; for (let x = Math.ceil(-W / 2 / grid) * grid; x <= W / 2; x += grid) gx.push(x)
  const gy: number[] = []; for (let y = Math.ceil(-H / 2 / grid) * grid; y <= H / 2; y += grid) gy.push(y)
  const pad = 2

  const tools: [DrawTool, string, typeof Pencil, string][] = [
    ["solid", "Sólido", Pencil, "Desenhe um contorno fechado — vira peça com perímetro, preenchimento e altura."],
    ["line", "Filete", Spline, "Desenhe um traço — vira uma linha de extrusão (1 camada)."],
    ["rect", "Retângulo", Square, "Arraste para criar um retângulo sólido."],
    ["circle", "Círculo", Circle, "Arraste para criar um disco sólido."],
  ]
  const cur = tools.find((t) => t[0] === tool)!

  return (
    <div className="space-y-2" data-testid="pb-draw">
      <div className="flex flex-wrap items-center gap-1.5">
        {tools.map(([id, label, Icon]) => (
          <button key={id} data-testid={`pb-tool-${id}`} onClick={() => setTool(id)} className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border transition-colors ${tool === id ? "bg-violet-500/25 border-violet-400/60 text-white" : "border-white/10 text-gray-300 hover:border-white/25"}`}><Icon className="w-3.5 h-3.5" />{label}</button>
        ))}
        <span className="flex-1" />
        <button onClick={onRemoveLast} className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border border-white/10 text-gray-300 hover:border-amber-400/40"><Undo2 className="w-3.5 h-3.5" /> Desfazer</button>
      </div>
      <p className="text-[11px] text-gray-500 flex items-center gap-1.5"><Eraser className="w-3 h-3 opacity-0" />{cur[3]}</p>
      <svg ref={svgRef} viewBox={`${-W / 2 - pad} ${-H / 2 - pad} ${W + 2 * pad} ${H + 2 * pad}`} className="w-full touch-none select-none rounded-2xl border border-white/10 bg-[#0b0b14] cursor-crosshair" style={{ maxHeight: 420, aspectRatio: `${W + 2 * pad} / ${H + 2 * pad}` }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}>
        {/* área útil */}
        {ext.usableRound ? <circle cx={0} cy={0} r={W / 2} fill="#121224" stroke="#8b5cf6" strokeWidth={0.3} /> : <rect x={-W / 2} y={-H / 2} width={W} height={H} fill="#121224" stroke="#8b5cf6" strokeWidth={0.3} />}
        {/* grade 5 mm */}
        <g stroke="#2a2a44" strokeWidth={0.12}>
          {gx.map((x) => <line key={"x" + x} x1={x} x2={x} y1={-H / 2} y2={H / 2} />)}
          {gy.map((y) => <line key={"y" + y} x1={-W / 2} x2={W / 2} y1={-y} y2={-y} />)}
        </g>
        <g stroke="#55557a" strokeWidth={0.2}><line x1={-W / 2} x2={W / 2} y1={0} y2={0} /><line x1={0} x2={0} y1={-H / 2} y2={H / 2} /></g>
        {/* formas existentes */}
        {state.shapes.map((s) => {
          const col = state.heads[s.head - 1]?.color ?? "#fff"
          if (s.type === "polygon" || s.type === "path") {
            const p = shapePts(s); if (p.length < 2) return null
            const d = p.map((q, i) => `${i ? "L" : "M"}${q.x} ${-q.y}`).join(" ") + (s.type === "polygon" ? " Z" : "")
            return <path key={s.id} d={d} fill={s.type === "polygon" && s.solid ? col + "33" : "none"} stroke={col} strokeWidth={0.4} strokeLinejoin="round" strokeLinecap="round" />
          }
          if (s.type === "disc" || s.type === "ring") return <g key={s.id}><circle cx={s.x} cy={-s.y} r={s.size / 2} fill={s.type === "disc" && s.solid ? col + "33" : "none"} stroke={col} strokeWidth={0.4} />{s.type === "ring" && <circle cx={s.x} cy={-s.y} r={s.size2 / 2} fill="#0b0b14" stroke={col} strokeWidth={0.4} />}</g>
          if (s.type === "lines") return <g key={s.id}>{Array.from({ length: s.count }).map((_, i) => { const y = s.y + (-((s.count - 1) * s.size2) / 2) + i * s.size2; return <line key={i} x1={s.x - s.size / 2} x2={s.x + s.size / 2} y1={-y} y2={-y} stroke={col} strokeWidth={0.4} /> })}</g>
          return <rect key={s.id} x={s.x - s.size / 2} y={-s.y - s.size / 2} width={s.size} height={s.size} fill={s.type === "square" && s.solid ? col + "33" : "none"} stroke={col} strokeWidth={0.4} strokeDasharray={s.type === "lattice" ? "1 0.6" : undefined} />
        })}
        {/* traço em andamento */}
        {stroke && stroke.length > 1 && <path d={stroke.map((q, i) => `${i ? "L" : "M"}${q.x} ${-q.y}`).join(" ") + (tool === "solid" ? " Z" : "")} fill={tool === "solid" ? "#ffffff22" : "none"} stroke="#fff" strokeWidth={0.4} strokeDasharray="1 0.5" strokeLinecap="round" />}
        {drag && (() => { const a = toSvg(drag.a), b = toSvg(drag.b); const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2
          return tool === "circle" ? <circle cx={cx} cy={cy} r={Math.max(w, h) / 2} fill="#ffffff22" stroke="#fff" strokeWidth={0.4} strokeDasharray="1 0.5" /> : <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} fill="#ffffff22" stroke="#fff" strokeWidth={0.4} strokeDasharray="1 0.5" /> })()}
        <text x={-W / 2 + 1} y={-H / 2 + 3} fontSize={2.4} fill="#6b6b8a">{ext.usableRound ? `Ø ${W.toFixed(0)} mm` : `${W.toFixed(0)} × ${H.toFixed(0)} mm`} · grade 5 mm</text>
      </svg>
    </div>
  )
}

/** mini-ícone de uma forma para listas */
export function ShapeThumb({ s, color }: { s: Shape; color: string }) {
  const pts = s.type === "polygon" || s.type === "path" ? shapePts(s) : s.type === "disc" || s.type === "ring" ? circlePts(s.x, s.y, s.size / 2, 36) : [{ x: s.x - s.size / 2, y: s.y - s.size / 2 }, { x: s.x + s.size / 2, y: s.y + s.size / 2 }]
  const b = bbox(pts); const m = Math.max(b.w, b.h, 1) * 1.15
  const d = s.type === "polygon" || s.type === "path" ? pts.map((q, i) => `${i ? "L" : "M"}${q.x} ${-q.y}`).join(" ") + (s.type === "polygon" ? "Z" : "") : ""
  return (
    <svg viewBox={`${b.cx - m / 2} ${-b.cy - m / 2} ${m} ${m}`} className="w-9 h-9 rounded-lg bg-black/30 border border-white/10 shrink-0">
      {d ? <path d={d} fill={s.type === "polygon" && s.solid ? color + "44" : "none"} stroke={color} strokeWidth={m / 40} /> :
        s.type === "disc" || s.type === "ring" ? <><circle cx={s.x} cy={-s.y} r={s.size / 2} fill={s.type === "disc" && s.solid ? color + "44" : "none"} stroke={color} strokeWidth={m / 40} />{s.type === "ring" && <circle cx={s.x} cy={-s.y} r={s.size2 / 2} fill="none" stroke={color} strokeWidth={m / 40} />}</> :
        s.type === "lines" ? <>{Array.from({ length: s.count }).map((_, i) => { const y = s.y + (-((s.count - 1) * s.size2) / 2) + i * s.size2; return <line key={i} x1={s.x - s.size / 2} x2={s.x + s.size / 2} y1={-y} y2={-y} stroke={color} strokeWidth={m / 40} /> })}</> :
        <rect x={s.x - s.size / 2} y={-s.y - s.size / 2} width={s.size} height={s.size} fill={s.type === "square" && s.solid ? color + "44" : "none"} stroke={color} strokeWidth={m / 40} strokeDasharray={s.type === "lattice" ? `${m / 20} ${m / 30}` : undefined} />}
    </svg>
  )
}
