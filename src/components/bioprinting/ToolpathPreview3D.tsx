/**
 * BIA v4.2 — Toolpath 3D Preview (Three.js via CDN)
 *
 * Renderiza caminho de ferramenta 3D camada-por-camada.
 * Usa Three.js via CDN dinâmico (sem aumentar bundle).
 *
 * Modos:
 *   - "all": todas as camadas visíveis
 *   - "slice": só camada atual + slider Z
 *   - "animate": animação camada-a-camada
 *
 * Cores:
 *   - Branco: estrutura base (infill)
 *   - Vermelho: macrocanais (vasculatura)
 *   - Azul: microcanais (difusão)
 *   - Cinza: perimetros (walls)
 */

"use client"

import { useEffect, useRef, useState } from "react"

// ═══════════════════════════════════════════════════════════════
// TIPOS (sem depender de three diretamente — tudo via any safe)
// ═══════════════════════════════════════════════════════════════
export interface PreviewSegment {
  ax: number
  ay: number
  bx: number
  by: number
  z: number
  kind: "perimeter" | "base" | "macro" | "micro"
}

export interface ToolpathPreview3DProps {
  segments: PreviewSegment[]
  bboxXY: { minX: number; minY: number; maxX: number; maxY: number }
  zRange: [number, number]
  height?: number
  mode?: "all" | "slice" | "animate"
  currentLayer?: number
  showAxes?: boolean
}

// ═══════════════════════════════════════════════════════════════
// CARREGAMENTO DINÂMICO DO THREE.JS
// ═══════════════════════════════════════════════════════════════
let threeLoadPromise: Promise<unknown> | null = null

function loadThree(): Promise<unknown> {
  if (threeLoadPromise) return threeLoadPromise
  threeLoadPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Three.js só pode ser carregado no cliente"))
      return
    }
    const w = window as unknown as { THREE?: unknown }
    if (w.THREE) {
      resolve(w.THREE)
      return
    }
    const script = document.createElement("script")
    script.src = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"
    script.async = true
    script.onload = () => {
      const w2 = window as unknown as { THREE?: unknown }
      if (w2.THREE) resolve(w2.THREE)
      else reject(new Error("THREE não disponível após script load"))
    }
    script.onerror = () => reject(new Error("Falha ao carregar Three.js CDN"))
    document.head.appendChild(script)
  })
  return threeLoadPromise
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function ToolpathPreview3D({
  segments,
  bboxXY,
  zRange,
  height = 420,
  mode = "all",
  currentLayer,
  showAxes = true,
}: ToolpathPreview3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const animRef = useRef<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ linesDrawn: 0, layerCount: 0 })

  // Extrair valores do bbox/zRange para deps estáveis (evita complex expression warning)
  const bboxMinX = bboxXY.minX, bboxMinY = bboxXY.minY
  const bboxMaxX = bboxXY.maxX, bboxMaxY = bboxXY.maxY
  const zMin = zRange[0], zMax = zRange[1]

  useEffect(() => {
    let disposed = false
    const mount = mountRef.current
    if (!mount) return

    ;(async () => {
      try {
        const T = (await loadThree()) as any  // eslint-disable-line @typescript-eslint/no-explicit-any
        if (disposed || !mount) return

        setLoading(false)

        // ─── Cena ──────────────────────────────────────────────
        const scene = new T.Scene()
        scene.background = new T.Color(0x0a0e1a)  // fundo escuro

        // ─── Câmera ─────────────────────────────────────────────
        const width = mount.clientWidth
        const camera = new T.PerspectiveCamera(
          40, width / height, 0.1, 1000,
        )
        const cx = (bboxXY.minX + bboxXY.maxX) / 2
        const cy = (bboxXY.minY + bboxXY.maxY) / 2
        const cz = (zRange[0] + zRange[1]) / 2
        const dx = bboxXY.maxX - bboxXY.minX
        const dy = bboxXY.maxY - bboxXY.minY
        const dz = zRange[1] - zRange[0]
        const diag = Math.sqrt(dx * dx + dy * dy + dz * dz)
        camera.position.set(cx + diag * 1.2, cy - diag * 1.2, cz + diag * 0.9)
        camera.up.set(0, 0, 1)
        camera.lookAt(cx, cy, cz)

        // ─── Renderer ───────────────────────────────────────────
        const renderer = new T.WebGLRenderer({ antialias: true, alpha: false })
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.setSize(width, height)
        mount.innerHTML = ""
        mount.appendChild(renderer.domElement)

        // ─── Grid e eixos ───────────────────────────────────────
        if (showAxes) {
          const gridSize = Math.max(dx, dy) * 1.2
          const grid = new T.GridHelper(
            gridSize, 20, 0x1e293b, 0x111827,
          )
          grid.rotation.x = Math.PI / 2
          grid.position.set(cx, cy, zRange[0])
          scene.add(grid)
          const axesSize = Math.min(dx, dy, dz) * 0.3
          const axes = new T.AxesHelper(axesSize)
          axes.position.set(bboxXY.minX, bboxXY.minY, zRange[0])
          scene.add(axes)
        }

        // ─── Criar segmentos como linhas ───────────────────────
        const COLORS: Record<PreviewSegment["kind"], number> = {
          perimeter: 0xa8a8a8,  // cinza
          base: 0xe7e7f0,       // branco
          macro: 0xef4444,      // vermelho — vasos
          micro: 0x3b82f6,      // azul — capilares
        }

        // Agrupar segmentos por kind para performance (1 linegeom por kind)
        const byKind = new Map<PreviewSegment["kind"], PreviewSegment[]>()
        for (const s of segments) {
          const arr = byKind.get(s.kind) ?? []
          arr.push(s)
          byKind.set(s.kind, arr)
        }

        const allLayers = new Set<number>()
        segments.forEach(s => allLayers.add(Math.round(s.z * 1000)))
        const layerList = Array.from(allLayers).sort((a, b) => a - b)
        const maxLayer = layerList.length

        let linesDrawn = 0
        byKind.forEach((segs, kind) => {
          // Filtrar por modo slice
          const filtered = mode === "slice" && currentLayer !== undefined
            ? segs.filter(s => {
                const lidx = layerList.indexOf(Math.round(s.z * 1000))
                return lidx <= currentLayer
              })
            : segs

          if (filtered.length === 0) return

          const positions = new Float32Array(filtered.length * 6)
          for (let i = 0; i < filtered.length; i++) {
            const s = filtered[i]
            positions[i * 6 + 0] = s.ax
            positions[i * 6 + 1] = s.ay
            positions[i * 6 + 2] = s.z
            positions[i * 6 + 3] = s.bx
            positions[i * 6 + 4] = s.by
            positions[i * 6 + 5] = s.z
          }
          linesDrawn += filtered.length

          const geom = new T.BufferGeometry()
          geom.setAttribute("position", new T.BufferAttribute(positions, 3))
          const mat = new T.LineBasicMaterial({
            color: COLORS[kind],
            transparent: true,
            opacity: kind === "perimeter" ? 0.55 : kind === "micro" ? 0.7 : 0.95,
            linewidth: 1,
          })
          const lines = new T.LineSegments(geom, mat)
          scene.add(lines)
        })

        setStats({ linesDrawn, layerCount: maxLayer })

        // ─── Iluminação (para debug de sólidos) ───────────────
        const amb = new T.AmbientLight(0xffffff, 0.6)
        scene.add(amb)
        const dir = new T.DirectionalLight(0xffffff, 0.5)
        dir.position.set(cx + diag, cy + diag, cz + diag)
        scene.add(dir)

        // ─── Controles de órbita manuais (sem OrbitControls dependency) ──
        let isDragging = false
        let lastX = 0, lastY = 0
        let theta = Math.atan2(camera.position.y - cy, camera.position.x - cx)
        let phi = Math.atan2(
          Math.sqrt((camera.position.x - cx) ** 2 + (camera.position.y - cy) ** 2),
          camera.position.z - cz,
        )
        let radius = diag * 1.5

        const onDown = (e: MouseEvent) => {
          isDragging = true
          lastX = e.clientX
          lastY = e.clientY
        }
        const onUp = () => { isDragging = false }
        const onMove = (e: MouseEvent) => {
          if (!isDragging) return
          const dx2 = e.clientX - lastX
          const dy2 = e.clientY - lastY
          lastX = e.clientX
          lastY = e.clientY
          theta -= dx2 * 0.01
          phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi - dy2 * 0.01))
          camera.position.set(
            cx + radius * Math.sin(phi) * Math.cos(theta),
            cy + radius * Math.sin(phi) * Math.sin(theta),
            cz + radius * Math.cos(phi),
          )
          camera.lookAt(cx, cy, cz)
        }
        const onWheel = (e: WheelEvent) => {
          e.preventDefault()
          const scale = Math.exp(e.deltaY * 0.001)
          radius = Math.max(diag * 0.3, Math.min(diag * 6, radius * scale))
          camera.position.set(
            cx + radius * Math.sin(phi) * Math.cos(theta),
            cy + radius * Math.sin(phi) * Math.sin(theta),
            cz + radius * Math.cos(phi),
          )
          camera.lookAt(cx, cy, cz)
        }
        renderer.domElement.addEventListener("mousedown", onDown)
        window.addEventListener("mouseup", onUp)
        window.addEventListener("mousemove", onMove)
        renderer.domElement.addEventListener("wheel", onWheel, { passive: false })

        // ─── Loop de animação ──────────────────────────────────
        const render = () => {
          renderer.render(scene, camera)
          animRef.current = requestAnimationFrame(render)
        }
        render()

        // ─── Cleanup ───────────────────────────────────────────
        const cleanup = () => {
          if (animRef.current) cancelAnimationFrame(animRef.current)
          renderer.domElement.removeEventListener("mousedown", onDown)
          window.removeEventListener("mouseup", onUp)
          window.removeEventListener("mousemove", onMove)
          renderer.domElement.removeEventListener("wheel", onWheel)
          renderer.dispose()
          if (mount && renderer.domElement.parentNode === mount) {
            mount.removeChild(renderer.domElement)
          }
        }
        ;(mount as unknown as { __cleanup?: () => void }).__cleanup = cleanup
      } catch (err) {
        const msg = err instanceof Error ? err.message : "erro desconhecido"
        setError(msg)
        setLoading(false)
      }
    })()

    // Copiamos mountRef.current localmente para uso seguro no cleanup
    const mountForCleanup = mount
    return () => {
      disposed = true
      const m = mountForCleanup as unknown as { __cleanup?: () => void } | null
      if (m?.__cleanup) m.__cleanup()
    }
  // ref values bboxMinX/Y, zMin/Max são cópias estáveis de bboxXY/zRange props
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, bboxMinX, bboxMinY, bboxMaxX, bboxMaxY,
      zMin, zMax, height, mode, currentLayer, showAxes])

  return (
    <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
      <div ref={mountRef} style={{ width: "100%", height }} />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
          <div className="text-sm text-slate-300">
            <div className="animate-pulse">Carregando Three.js…</div>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-950/80">
          <div className="text-sm text-red-200 p-4">
            <div className="font-semibold mb-1">Erro no preview 3D</div>
            <div className="text-xs opacity-80">{error}</div>
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-2 text-[10px] text-slate-400 bg-slate-900/70 px-2 py-1 rounded font-mono">
        {stats.linesDrawn.toLocaleString()} segs • {stats.layerCount} layers
      </div>
      <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 bg-slate-900/70 px-2 py-1 rounded font-mono">
        drag: rotate • wheel: zoom
      </div>
      <div className="absolute top-2 left-2 flex flex-col gap-1 text-[10px] font-mono">
        <div className="flex items-center gap-1.5 bg-slate-900/70 px-2 py-0.5 rounded">
          <span className="w-2 h-2 bg-white rounded-sm"></span><span className="text-slate-300">base</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900/70 px-2 py-0.5 rounded">
          <span className="w-2 h-2 bg-red-500 rounded-sm"></span><span className="text-slate-300">macro</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900/70 px-2 py-0.5 rounded">
          <span className="w-2 h-2 bg-blue-500 rounded-sm"></span><span className="text-slate-300">micro</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900/70 px-2 py-0.5 rounded">
          <span className="w-2 h-2 bg-slate-400 rounded-sm"></span><span className="text-slate-300">wall</span>
        </div>
      </div>
    </div>
  )
}
