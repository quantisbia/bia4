"use client"

/**
 * BIA v4 · R21 · BedStage — a MESA de impressão (preview + arrumar a peça)
 * ─────────────────────────────────────────────────────────────────────
 * Mostra a peça sobre o alvo (Petri / lâmina / placa) em duas vistas:
 * topo (XY, como a usuária vê olhando para a mesa) e isométrica (relevo).
 * Controles: rotação X/Y/Z (±15° / ±90°), "Deitar na mesa" (auto),
 * zerar, e a dimensão principal (escala uniforme). Ponto zero = bico =
 * centro da peça (ou centro do 1º poço).
 *
 * Renderização em canvas 2D (sem WebGL) — leve para a sandbox e Vercel.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { RotateCw, RotateCcw, Move3d, RefreshCw, ArrowDownToLine } from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import type { TriMesh } from "@/lib/slicer/types"
import { type Orientation, IDENTITY_ORIENTATION, orientMesh, suggestLayFlat } from "@/lib/slicer/mesh-slice"
import { type PrintTarget, targetUsableDiameter, PLATES } from "@/lib/slicer/target"

export interface BedStageProps {
  mesh: TriMesh | null
  orientation: Orientation
  onOrientation: (o: Orientation) => void
  target: PrintTarget
  /** Dimensão principal (mm) e rótulo — quando informado, mostra o controle */
  primary?: { label: string; value_mm: number; min: number; max: number; onChange: (v: number) => void }
  className?: string
}

export function BedStage({ mesh, orientation, onOrientation, target, primary, className }: BedStageProps) {
  const topRef = useRef<HTMLCanvasElement>(null)
  const isoRef = useRef<HTMLCanvasElement>(null)
  const [busy, setBusy] = useState(false)

  // Malha orientada (o que vai para o fatiador)
  const oriented = useMemo(() => (mesh ? orientMesh(mesh, orientation) : null), [mesh, orientation])

  const bedDiameter = targetUsableDiameter(target) ?? 60
  const bedKind = target.kind === "plate" ? `poço ${target.format} (Ø${PLATES[target.format].wellDiameter_mm} mm)` : target.kind === "slide" ? "lâmina 25×75 mm" : `Petri Ø${target.diameter_mm} mm`
  const fits = oriented ? Math.max(oriented.bbox.maxX - oriented.bbox.minX, oriented.bbox.maxY - oriented.bbox.minY) <= bedDiameter : true

  // ── vista de topo ──
  useEffect(() => {
    const cv = topRef.current
    if (!cv) return
    const ctx = cv.getContext("2d")
    if (!ctx) return
    const W = cv.width, H = cv.height
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = "#0a0f0e"; ctx.fillRect(0, 0, W, H)
    const pad = 16
    const extent = Math.max(bedDiameter * 1.15, oriented ? Math.max(oriented.bbox.maxX - oriented.bbox.minX, oriented.bbox.maxY - oriented.bbox.minY) * 1.2 : 0)
    const sc = (Math.min(W, H) - pad * 2) / extent
    const ox = W / 2, oy = H / 2
    const X = (x: number) => ox + x * sc, Y = (y: number) => oy - y * sc

    // alvo
    ctx.save()
    if (target.kind === "slide") {
      ctx.strokeStyle = "rgba(125,211,252,0.6)"; ctx.lineWidth = 1.5
      ctx.strokeRect(X(-12.5), Y(37.5), 25 * sc, 75 * sc)
    } else {
      const R = (target.kind === "plate" ? PLATES[target.format].wellDiameter_mm : target.diameter_mm) / 2
      ctx.beginPath(); ctx.arc(ox, oy, R * sc, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(125,211,252,0.6)"; ctx.lineWidth = 1.5; ctx.stroke()
      ctx.beginPath(); ctx.arc(ox, oy, (bedDiameter / 2) * sc, 0, Math.PI * 2)
      ctx.setLineDash([3, 4]); ctx.strokeStyle = "rgba(125,211,252,0.3)"; ctx.stroke(); ctx.setLineDash([])
    }
    // grade 10 mm
    ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1
    for (let g = -Math.ceil(extent / 20) * 10; g <= extent / 2; g += 10) {
      ctx.beginPath(); ctx.moveTo(X(g), 0); ctx.lineTo(X(g), H); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, Y(g)); ctx.lineTo(W, Y(g)); ctx.stroke()
    }
    ctx.restore()

    // peça: triângulos pintados por altura (z) — vista de cima
    if (oriented) {
      const v = oriented.vertices, n = oriented.triangleCount
      const zMax = Math.max(1e-6, oriented.bbox.maxZ)
      const step = Math.max(1, Math.floor(n / 60000))
      for (let t = 0; t < n; t += step) {
        const k = t * 9
        const z = (v[k + 2] + v[k + 5] + v[k + 8]) / 3
        const tone = 0.35 + 0.65 * (z / zMax)
        ctx.fillStyle = fits ? `rgba(52,211,153,${(0.25 + 0.6 * tone).toFixed(2)})` : `rgba(251,113,133,${(0.25 + 0.6 * tone).toFixed(2)})`
        ctx.beginPath(); ctx.moveTo(X(v[k]), Y(v[k + 1])); ctx.lineTo(X(v[k + 3]), Y(v[k + 4])); ctx.lineTo(X(v[k + 6]), Y(v[k + 7])); ctx.closePath(); ctx.fill()
      }
    }
    // ponto zero (bico)
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(ox - 8, oy); ctx.lineTo(ox + 8, oy); ctx.moveTo(ox, oy - 8); ctx.lineTo(ox, oy + 8); ctx.stroke()
    ctx.fillStyle = "#fbbf24"; ctx.font = "10px ui-sans-serif"; ctx.fillText("ponto zero (bico)", ox + 10, oy - 6)
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillText("+X →", W - 40, H - 8); ctx.fillText("+Y ↑", 6, 14)
  }, [oriented, target, bedDiameter, fits])

  // ── vista isométrica ──
  useEffect(() => {
    const cv = isoRef.current
    if (!cv) return
    const ctx = cv.getContext("2d")
    if (!ctx) return
    const W = cv.width, H = cv.height
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = "#0a0f0e"; ctx.fillRect(0, 0, W, H)
    const sizeXY = Math.max(bedDiameter, oriented ? Math.max(oriented.bbox.maxX - oriented.bbox.minX, oriented.bbox.maxY - oriented.bbox.minY) : 0)
    const sizeZ = oriented ? oriented.bbox.maxZ : 10
    const sc = Math.min(W / (sizeXY * 1.9), H / (sizeXY * 0.9 + sizeZ * 1.2))
    const ox = W / 2, oy = H * 0.72
    const P = (x: number, y: number, z: number) => ({ px: ox + (x - y) * 0.866 * sc, py: oy + (x + y) * 0.5 * sc - z * sc })
    // mesa
    ctx.save()
    const R = bedDiameter / 2
    ctx.beginPath()
    for (let a = 0; a <= 64; a++) { const t = (a / 64) * Math.PI * 2; const p = P(R * Math.cos(t), R * Math.sin(t), 0); if (a === 0) ctx.moveTo(p.px, p.py); else ctx.lineTo(p.px, p.py) }
    ctx.closePath(); ctx.fillStyle = "rgba(125,211,252,0.08)"; ctx.fill(); ctx.strokeStyle = "rgba(125,211,252,0.5)"; ctx.stroke()
    ctx.restore()
    if (oriented) {
      const v = oriented.vertices, n = oriented.triangleCount
      // painter's: ordena por profundidade (x+y+z) grosseira em buckets
      const step = Math.max(1, Math.floor(n / 40000))
      const idx: number[] = []
      for (let t = 0; t < n; t += step) idx.push(t)
      idx.sort((a, b) => {
        const ka = a * 9, kb = b * 9
        const da = (v[ka] + v[ka + 3] + v[ka + 6]) + (v[ka + 1] + v[ka + 4] + v[ka + 7]) - (v[ka + 2] + v[ka + 5] + v[ka + 8]) * 0.5
        const db = (v[kb] + v[kb + 3] + v[kb + 6]) + (v[kb + 1] + v[kb + 4] + v[kb + 7]) - (v[kb + 2] + v[kb + 5] + v[kb + 8]) * 0.5
        return da - db
      })
      const light = { x: -0.4, y: -0.5, z: 0.77 }
      for (const t of idx) {
        const k = t * 9
        const ax = v[k + 3] - v[k], ay = v[k + 4] - v[k + 1], az = v[k + 5] - v[k + 2]
        const bx = v[k + 6] - v[k], by = v[k + 7] - v[k + 1], bz = v[k + 8] - v[k + 2]
        let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx
        const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L
        const lam = Math.max(0, nx * light.x + ny * light.y + nz * light.z)
        const shade = 0.25 + 0.75 * lam
        ctx.fillStyle = fits ? `rgb(${Math.round(30 + 40 * shade)},${Math.round(120 + 110 * shade)},${Math.round(100 + 60 * shade)})` : `rgb(${Math.round(150 + 100 * shade)},${Math.round(60 + 50 * shade)},${Math.round(80 + 40 * shade)})`
        const p0 = P(v[k], v[k + 1], v[k + 2]), p1 = P(v[k + 3], v[k + 4], v[k + 5]), p2 = P(v[k + 6], v[k + 7], v[k + 8])
        ctx.beginPath(); ctx.moveTo(p0.px, p0.py); ctx.lineTo(p1.px, p1.py); ctx.lineTo(p2.px, p2.py); ctx.closePath(); ctx.fill()
      }
    }
    const z0 = P(0, 0, 0)
    ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(z0.px, z0.py, 3, 0, Math.PI * 2); ctx.fill()
  }, [oriented, bedDiameter, fits])

  const rot = (axis: "rotX_deg" | "rotY_deg" | "rotZ_deg", d: number) => onOrientation({ ...orientation, [axis]: ((orientation[axis] + d) % 360 + 360) % 360 })
  const layFlat = () => {
    if (!mesh) return
    setBusy(true)
    setTimeout(() => { const s = suggestLayFlat(orientMesh(mesh, { ...orientation, rotX_deg: 0, rotY_deg: 0, rotZ_deg: 0 })); onOrientation({ ...orientation, rotX_deg: s.rotX_deg, rotY_deg: s.rotY_deg }); setBusy(false) }, 10)
  }

  const size = oriented ? { x: oriented.bbox.maxX - oriented.bbox.minX, y: oriented.bbox.maxY - oriented.bbox.minY, z: oriented.bbox.maxZ - oriented.bbox.minZ } : null

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-gray-400 bg-white/[0.03] border-b border-white/10">Vista de cima — mesa: {bedKind}</div>
          <canvas ref={topRef} width={360} height={300} className="w-full h-auto block" />
        </div>
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-gray-400 bg-white/[0.03] border-b border-white/10">Vista 3D (relevo)</div>
          <canvas ref={isoRef} width={360} height={300} className="w-full h-auto block" />
        </div>
      </div>

      {size && (
        <div className={cn("text-xs flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2", fits ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-100" : "border-rose-500/40 bg-rose-500/10 text-rose-100")}>
          <span>📐 {size.x.toFixed(1)} × {size.y.toFixed(1)} × <b>{size.z.toFixed(1)} mm</b> de altura</span>
          <span>{fits ? `✓ cabe na ${bedKind}` : `✗ não cabe na ${bedKind} (útil ≈ ${bedDiameter.toFixed(0)} mm) — reduza a dimensão ou troque o alvo`}</span>
        </div>
      )}

      {primary && (
        <div className="rounded-lg border border-white/10 p-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs"><span className="text-gray-300">{primary.label}</span><span className="font-mono text-gray-100">{primary.value_mm.toFixed(1)} mm</span></div>
          <input type="range" min={primary.min} max={primary.max} step={0.5} value={primary.value_mm} disabled={primary.min === primary.max} onChange={(e) => primary.onChange(+e.target.value)} className="w-full accent-emerald-400" />
          <div className="text-[10px] text-gray-500">Escala uniforme — a anatomia é preservada; só o tamanho muda.</div>
        </div>
      )}

      <div className="rounded-lg border border-white/10 p-3 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-gray-400 flex items-center gap-1.5"><Move3d className="w-3.5 h-3.5" /> Arrumar na mesa (rotação)</div>
        {(["rotX_deg", "rotY_deg", "rotZ_deg"] as const).map((ax) => (
          <div key={ax} className="flex items-center gap-2 text-xs">
            <span className="w-14 text-gray-400">{ax === "rotX_deg" ? "Tombar X" : ax === "rotY_deg" ? "Tombar Y" : "Girar Z"}</span>
            <button onClick={() => rot(ax, -90)} className="px-2 py-1 rounded border border-white/10 hover:border-white/30">−90°</button>
            <button onClick={() => rot(ax, -15)} className="px-2 py-1 rounded border border-white/10 hover:border-white/30"><RotateCcw className="w-3 h-3" /></button>
            <span className="w-12 text-center font-mono text-gray-100">{orientation[ax]}°</span>
            <button onClick={() => rot(ax, 15)} className="px-2 py-1 rounded border border-white/10 hover:border-white/30"><RotateCw className="w-3 h-3" /></button>
            <button onClick={() => rot(ax, 90)} className="px-2 py-1 rounded border border-white/10 hover:border-white/30">+90°</button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2 pt-1">
          <button onClick={layFlat} disabled={!mesh || busy} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-100 text-xs flex items-center gap-1.5 disabled:opacity-40"><ArrowDownToLine className="w-3.5 h-3.5" /> {busy ? "Calculando…" : "Deitar na mesa (maior apoio)"}</button>
          <button onClick={() => onOrientation({ ...IDENTITY_ORIENTATION, scale: orientation.scale })} className="px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 text-xs flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Zerar rotação</button>
        </div>
        <div className="text-[10px] text-gray-500">A peça é sempre re-centrada no ponto zero e apoiada em Z = 0 após girar.</div>
      </div>
    </div>
  )
}
