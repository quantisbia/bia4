"use client"

/**
 * R37 · Visualizador 3D do módulo básico (sem dependências).
 * Projeção ortográfica orbital em SVG: arraste para girar, roda do mouse para zoom,
 * slider de camadas, cores por cabeçote, superfície/poços desenhados no plano z=0.
 */

import { useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react"
import { Layers, RotateCcw, Box, Eye, Grid2X2 } from "lucide-react"
import { type BasicState, type ToolLayer, type Pt, surfaceExtent, wellOffsets, allWells, MULTIWELL, lineWidthOf, shapeRegion, shapePts, circlePts, rectPts } from "@/lib/print-basic/engine"

type V3 = { x: number; y: number; z: number }

function project(p: V3, yaw: number, pitch: number): { x: number; y: number; d: number } {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch)
  const x1 = p.x * cy - p.y * sy, y1 = p.x * sy + p.y * cy
  const y2 = y1 * cp - p.z * sp, z2 = y1 * sp + p.z * cp
  return { x: x1, y: -z2, d: y2 }
}

export function View3D({ state, layers, layerIdx, onLayerIdx, className }: {
  state: BasicState; layers: ToolLayer[] | null; layerIdx: number; onLayerIdx: (i: number) => void; className?: string
}) {
  const [yaw, setYaw] = useState(-0.6)
  const [pitch, setPitch] = useState(0.95)
  const [zoom, setZoom] = useState(1)
  const [mode, setMode] = useState<"all" | "upto" | "single">("upto")
  const [showPaths, setShowPaths] = useState(true)
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null)

  const ext = surfaceExtent(state.surface)
  const offs = wellOffsets(state.surface)
  const sp = state.surface.kind === "multiwell" ? MULTIWELL.find((m) => m.id === state.surface.wells) : null
  const H = Math.max(0.5, state.shapes.reduce((h, s) => Math.max(h, s.height), 0))
  const R = Math.max(ext.w, ext.h) / 2
  const scale = (170 / (R * 1.25)) * zoom
  const zExag = 1 // 1:1 — real
  const P = (x: number, y: number, z: number) => { const q = project({ x, y, z: z * zExag }, yaw, pitch); return { x: q.x * scale, y: q.y * scale, d: q.d } }
  const path = (pts: Pt[], z: number, closed = false) => pts.map((p, i) => { const q = P(p.x, p.y, z); return `${i ? "L" : "M"}${q.x.toFixed(1)} ${q.y.toFixed(1)}` }).join(" ") + (closed ? " Z" : "")

  const n = layers?.length ?? 0
  const cur = Math.min(layerIdx, Math.max(0, n - 1))
  const visible = useMemo(() => {
    if (!layers) return []
    if (mode === "all") return layers.map((L, i) => ({ L, i }))
    if (mode === "single") return [{ L: layers[cur], i: cur }]
    return layers.slice(0, cur + 1).map((L, i) => ({ L, i }))
  }, [layers, mode, cur])

  // perfil do sólido (contornos extrudados) quando não há toolpaths
  const silhouettes = useMemo(() => state.shapes.filter((s) => s.height > 0).map((s) => {
    const reg = shapeRegion(s)
    const outline = reg.length ? reg : s.type === "lattice" ? [rectPts(s.x, s.y, s.size, s.size)] : []
    return { s, outline }
  }), [state.shapes])

  const onDown = (e: PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY, yaw, pitch }; (e.target as Element).setPointerCapture?.(e.pointerId) }
  const onMove = (e: PointerEvent) => { if (!drag.current) return; setYaw(drag.current.yaw + (e.clientX - drag.current.x) * 0.01); setPitch(Math.max(0.05, Math.min(1.5, drag.current.pitch + (e.clientY - drag.current.y) * 0.01))) }
  const onUp = () => { drag.current = null }
  const onWheel = (e: WheelEvent) => { setZoom((z) => Math.max(0.4, Math.min(4, z * (e.deltaY > 0 ? 0.9 : 1.1)))) }

  // light shading by layer height (more opaque at top)
  const alphaFor = (i: number) => 0.35 + 0.65 * ((i + 1) / Math.max(1, n))
  const topLayerZ = layers && visible.length ? visible[visible.length - 1].L.z : H

  return (
    <div className={className} data-testid="pb-view3d">
      <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-[#0e0e1c] to-[#07070d] overflow-hidden">
        <svg viewBox="-220 -200 440 400" className="w-full touch-none select-none cursor-grab active:cursor-grabbing" style={{ aspectRatio: "11/10" }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} onWheel={onWheel}>
          <defs>
            <radialGradient id="pb3d-bed" cx="50%" cy="50%" r="60%"><stop offset="0%" stopColor="#1b1b33" /><stop offset="100%" stopColor="#101020" /></radialGradient>
            <filter id="pb3d-glow"><feGaussianBlur stdDeviation="1.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {/* superfície */}
          <g>
            {ext.round
              ? <path d={path(circlePts(0, 0, ext.w / 2, 72), 0, true)} fill="url(#pb3d-bed)" stroke="#55557a" strokeWidth={0.8} />
              : <path d={path(rectPts(0, 0, ext.w, ext.h), 0, true)} fill="url(#pb3d-bed)" stroke="#55557a" strokeWidth={0.8} />}
            {/* grade 10 mm */}
            <g stroke="#26263f" strokeWidth={0.4}>
              {Array.from({ length: Math.floor(ext.w / 10) + 1 }, (_, i) => -ext.w / 2 + i * 10).map((x) => { const a = P(x, -ext.h / 2, 0), b = P(x, ext.h / 2, 0); return <line key={"x" + x} x1={a.x} y1={a.y} x2={b.x} y2={b.y} /> })}
              {Array.from({ length: Math.floor(ext.h / 10) + 1 }, (_, i) => -ext.h / 2 + i * 10).map((y) => { const a = P(-ext.w / 2, y, 0), b = P(ext.w / 2, y, 0); return <line key={"y" + y} x1={a.x} y1={a.y} x2={b.x} y2={b.y} /> })}
            </g>
            {sp && allWells(sp).map((w) => { const sel = offs.some((o) => o.name === w.name); return <path key={w.name} d={path(circlePts(w.x, w.y, sp.wellD / 2, 36), 0, true)} fill={sel ? "#1f1f3a" : "#0f0f1c"} stroke={sel ? "#8b5cf6" : "#30304a"} strokeWidth={sel ? 0.7 : 0.4} /> })}
            {!sp && (ext.usableRound
              ? <path d={path(circlePts(0, 0, ext.usableW / 2, 72), 0, true)} fill="none" stroke="#8b5cf6" strokeWidth={0.5} strokeDasharray="3 2" />
              : <path d={path(rectPts(0, 0, ext.usableW, ext.usableH), 0, true)} fill="none" stroke="#8b5cf6" strokeWidth={0.5} strokeDasharray="3 2" />)}
            {/* eixos */}
            {(() => { const o = P(-ext.w / 2 - 4, -ext.h / 2 - 4, 0), x = P(-ext.w / 2 + 6, -ext.h / 2 - 4, 0), y = P(-ext.w / 2 - 4, -ext.h / 2 + 6, 0), z = P(-ext.w / 2 - 4, -ext.h / 2 - 4, 10)
              return <g strokeWidth={1.2} fontSize={6} fontWeight={700}><line x1={o.x} y1={o.y} x2={x.x} y2={x.y} stroke="#f87171" /><text x={x.x + 2} y={x.y} fill="#f87171">X</text><line x1={o.x} y1={o.y} x2={y.x} y2={y.y} stroke="#4ade80" /><text x={y.x + 2} y={y.y} fill="#4ade80">Y</text><line x1={o.x} y1={o.y} x2={z.x} y2={z.y} stroke="#60a5fa" /><text x={z.x + 2} y={z.y} fill="#60a5fa">Z</text></g> })()}
          </g>

          {/* objetos — por poço */}
          {offs.map((o) => (
            <g key={o.name || "c"}>
              {layers && showPaths ? (
                visible.map(({ L, i }) => (
                  <g key={i} opacity={alphaFor(i)} filter={i === cur && mode !== "all" ? "url(#pb3d-glow)" : undefined}>
                    {L.paths.map((p, k) => {
                      const hd = state.heads[p.head - 1]; const col = hd?.color ?? "#fff"
                      const pts = p.pts.map((q) => ({ x: q.x + o.x, y: q.y + o.y }))
                      return <path key={k} d={path(pts, L.z, p.closed)} fill="none" stroke={col} strokeWidth={Math.max(0.6, lineWidthOf(hd) * scale * 0.9)} strokeLinecap="round" strokeLinejoin="round" opacity={p.kind === "skirt" ? 0.35 : p.kind === "infill" ? 0.85 : 1} strokeDasharray={p.kind === "skirt" ? "3 2" : undefined} />
                    })}
                  </g>
                ))
              ) : (
                // silhueta extrudada (sem fatiamento ainda)
                silhouettes.map(({ s, outline }) => {
                  const col = state.heads[s.head - 1]?.color ?? "#fff"
                  const top = Math.min(s.height, topLayerZ)
                  return <g key={s.id}>
                    {outline.map((poly, k) => {
                      const pts = poly.map((q) => ({ x: q.x + o.x, y: q.y + o.y }))
                      // paredes: faixas entre base e topo (amostradas)
                      const step = Math.max(1, Math.floor(pts.length / 48))
                      return <g key={k}>
                        <path d={path(pts, 0, true)} fill={col + "22"} stroke={col} strokeWidth={0.6} />
                        {pts.filter((_, i) => i % step === 0).map((q, i) => { const a = P(q.x, q.y, 0), b = P(q.x, q.y, top); return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={col} strokeWidth={0.35} opacity={0.5} /> })}
                        <path d={path(pts, top, true)} fill={col + "55"} stroke={col} strokeWidth={0.8} />
                      </g>
                    })}
                    {s.type === "lattice" && (() => { const pitch = Math.max(0.4, s.size2); const nL = Math.floor(s.size / pitch); const start = -((nL - 1) * pitch) / 2; const lines: JSX.Element[] = []
                      const nz = Math.max(1, Math.round(top / state.layerSettings.layerHeight))
                      for (let L = 0; L < nz; L++) { const z = (L + 1) * state.layerSettings.layerHeight; const v = L % 2 === 1; for (let i = 0; i < nL; i++) { const off = start + i * pitch; const a = v ? { x: s.x + off + o.x, y: s.y - s.size / 2 + o.y } : { x: s.x - s.size / 2 + o.x, y: s.y + off + o.y }; const b = v ? { x: s.x + off + o.x, y: s.y + s.size / 2 + o.y } : { x: s.x + s.size / 2 + o.x, y: s.y + off + o.y }; lines.push(<path key={`${L}-${i}`} d={path([a, b], z)} stroke={col} strokeWidth={0.6} opacity={0.5 + 0.5 * (L + 1) / nz} />) } }
                      return <g fill="none">{lines}</g> })()}
                  </g>
                })
              )}
              {/* linhas/traços (sem altura) */}
              {!layers && state.shapes.filter((s) => s.type === "lines" || s.type === "path").map((s) => {
                const col = state.heads[s.head - 1]?.color ?? "#fff"
                if (s.type === "path") { const p = shapePts(s).map((q) => ({ x: q.x + o.x, y: q.y + o.y })); return <path key={s.id} d={path(p, state.layerSettings.layerHeight)} fill="none" stroke={col} strokeWidth={0.8} /> }
                return <g key={s.id}>{Array.from({ length: s.count }).map((_, i) => { const y = s.y + (-((s.count - 1) * s.size2) / 2) + i * s.size2; return <path key={i} d={path([{ x: s.x - s.size / 2 + o.x, y: y + o.y }, { x: s.x + s.size / 2 + o.x, y: y + o.y }], state.layerSettings.layerHeight)} stroke={col} strokeWidth={0.8} fill="none" /> })}</g>
              })}
            </g>
          ))}
        </svg>

        {/* HUD */}
        <div className="absolute top-2 left-2 flex gap-1">
          <button onClick={() => { setYaw(-0.6); setPitch(0.95); setZoom(1) }} title="Resetar vista" className="w-7 h-7 rounded-lg bg-black/40 border border-white/10 text-gray-300 hover:text-white flex items-center justify-center"><RotateCcw className="w-3.5 h-3.5" /></button>
          <button onClick={() => { setYaw(0); setPitch(1.5) }} title="Vista de topo" className="w-7 h-7 rounded-lg bg-black/40 border border-white/10 text-gray-300 hover:text-white flex items-center justify-center"><Grid2X2 className="w-3.5 h-3.5" /></button>
          <button onClick={() => { setYaw(0); setPitch(0.08) }} title="Vista lateral" className="w-7 h-7 rounded-lg bg-black/40 border border-white/10 text-gray-300 hover:text-white flex items-center justify-center"><Box className="w-3.5 h-3.5" /></button>
          {layers && <button onClick={() => setShowPaths((v) => !v)} title={showPaths ? "Mostrar sólido" : "Mostrar trajetórias"} className={`w-7 h-7 rounded-lg border flex items-center justify-center ${showPaths ? "bg-violet-500/30 border-violet-400/50 text-white" : "bg-black/40 border-white/10 text-gray-300"}`}><Eye className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="absolute top-2 right-2 text-[10px] text-gray-500 bg-black/40 rounded-md px-1.5 py-0.5">arraste · gire &nbsp;|&nbsp; roda · zoom</div>
        <div className="absolute bottom-2 left-2 flex items-center gap-2 text-[10px]">
          {state.heads.filter((h) => h.enabled).map((h) => <span key={h.id} className="flex items-center gap-1 text-gray-300"><span className="w-2 h-2 rounded-full" style={{ background: h.color }} />T{h.id - 1}</span>)}
          <span className="text-gray-500">· {ext.usableRound ? `Ø ${ext.usableW.toFixed(0)}` : `${ext.usableW.toFixed(0)}×${ext.usableH.toFixed(0)}`} mm · alt. {H.toFixed(1)} mm</span>
        </div>
      </div>

      {/* camadas */}
      {layers && n > 0 && (
        <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2" data-testid="pb-layer-slider">
          <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
            <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-violet-300" /> Camada <b className="text-white">{cur + 1}</b> / {n} · z = {layers[cur].z.toFixed(2)} mm</span>
            <div className="flex gap-0.5">{([["upto", "Até aqui"], ["single", "Só esta"], ["all", "Todas"]] as const).map(([m, l]) => <button key={m} onClick={() => setMode(m)} className={`px-1.5 py-0.5 rounded text-[10px] ${mode === m ? "bg-violet-500/30 text-white" : "text-gray-500 hover:text-gray-300"}`}>{l}</button>)}</div>
          </div>
          <input type="range" min={0} max={n - 1} value={cur} onChange={(e) => onLayerIdx(+e.target.value)} className="w-full accent-violet-400" />
        </div>
      )}
    </div>
  )
}
