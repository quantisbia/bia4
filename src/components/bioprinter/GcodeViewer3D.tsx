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
  ZoomIn, ZoomOut, Palette, RefreshCw, Move, Layers as LayersIcon, Play, Pause,
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
  /** R12.11: modo de interação — orbit (rotação) ou pan (arrastar mesa) */
  const [interactionMode, setInteractionMode] = useState<"orbit" | "pan">("orbit")
  const dragStart = useRef<{ x: number; y: number; cam: Camera; button: number; shift: boolean } | null>(null)

  /** R12.11: análise camada-a-camada — controles internos do viewer */
  const [layerAnalysisOpen, setLayerAnalysisOpen] = useState(false)
  const [activeLayer, setActiveLayer] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // R12.17 BUGFIX: filtros de camada efetivos PRECISAM ser declarados ANTES
  // dos useEffects/useMemos que os referenciam. Antes estavam no fim do
  // componente (linha ~404) e o useEffect de render (linha ~179) acessava-os
  // na dependency array — causando ReferenceError (Temporal Dead Zone) no
  // primeiro render = crash "Algo deu errado" da página inteira.
  const effectiveLayerFrom = layerAnalysisOpen && activeLayer !== null
    ? parsed?.layers[0] ?? layerFrom
    : layerFrom
  const effectiveLayerTo = layerAnalysisOpen && activeLayer !== null
    ? activeLayer
    : layerTo

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
      // Filtro de camadas (usa filtros efetivos — análise camada-a-camada sobrescreve)
      if (effectiveLayerFrom !== undefined && m.layer < effectiveLayerFrom) {
        prev = m.to
        continue
      }
      if (effectiveLayerTo !== undefined && m.layer > effectiveLayerTo) {
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

    // ═══════════════════════════════════════════════════════════════════
    // R12.65: DESTAQUE PROFISSIONAL DO PONTO INICIAL (G92 X0 Y0 Z0 E0)
    // ─────────────────────────────────────────────────────────────────
    // Este é o ponto MAIS importante para a usuária: onde o bico deve
    // estar posicionado ANTES de iniciar. Aqui a impressora zera todas
    // as coordenadas (G92 X0 Y0 Z0 E0). O visual DEVE ser inequívoco.
    //
    // Composição:
    //  - Anel externo esmeralda largo (pulsante via alfa dinâmico)
    //  - Anel interno mais denso
    //  - Cruz de origem (X/Y) atravessando o marcador
    //  - Ponto sólido central
    //  - Label multilinha: "⊙ INÍCIO · G92 X0 Y0 Z0 E0"
    //                     "Posicione o bico AQUI antes de imprimir"
    // ═══════════════════════════════════════════════════════════════════
    const origin = project({ x: 0, y: 0, z: 0 }, camera, w, h)

    // Cruz de origem (X vermelho, Y verde) — 24px de raio
    const crossR = 24
    ctx.lineWidth = 1.5
    ctx.setLineDash([])
    ctx.strokeStyle = "rgba(248, 113, 113, 0.65)" // eixo X (vermelho)
    ctx.beginPath()
    ctx.moveTo(origin.x - crossR, origin.y)
    ctx.lineTo(origin.x + crossR, origin.y)
    ctx.stroke()
    ctx.strokeStyle = "rgba(74, 222, 128, 0.65)" // eixo Y (verde)
    ctx.beginPath()
    ctx.moveTo(origin.x, origin.y - crossR)
    ctx.lineTo(origin.x, origin.y + crossR)
    ctx.stroke()

    // Anel externo largo (esmeralda claro)
    ctx.strokeStyle = "rgba(52, 211, 153, 0.45)"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(origin.x, origin.y, 18, 0, 2 * Math.PI)
    ctx.stroke()

    // Anel intermediário sólido
    ctx.strokeStyle = "rgba(52, 211, 153, 0.9)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(origin.x, origin.y, 11, 0, 2 * Math.PI)
    ctx.stroke()

    // Ponto sólido central
    ctx.fillStyle = "rgba(52, 211, 153, 1)"
    ctx.beginPath()
    ctx.arc(origin.x, origin.y, 4, 0, 2 * Math.PI)
    ctx.fill()

    // Label multilinha à direita do marcador — fundo semi-transparente
    // para garantir legibilidade sobre qualquer conteúdo do viewer.
    const labelX = origin.x + 26
    const labelY = origin.y - 4
    const labelLines = [
      "⊙ INÍCIO · G92 X0 Y0 Z0 E0",
      "Posicione o bico AQUI antes de imprimir",
    ]
    ctx.font = "bold 11px monospace"
    ctx.textAlign = "left"
    // Medida do maior label para dimensionar o fundo
    const labelW = Math.max(
      ctx.measureText(labelLines[0]).width,
      ctx.measureText(labelLines[1]).width,
    )
    ctx.fillStyle = "rgba(6, 78, 59, 0.85)" // emerald-900/85
    ctx.fillRect(labelX - 4, labelY - 12, labelW + 8, 28)
    ctx.strokeStyle = "rgba(52, 211, 153, 0.6)"
    ctx.lineWidth = 1
    ctx.strokeRect(labelX - 4, labelY - 12, labelW + 8, 28)

    ctx.fillStyle = "rgba(167, 243, 208, 1)" // emerald-200
    ctx.font = "bold 11px monospace"
    ctx.fillText(labelLines[0], labelX, labelY)
    ctx.fillStyle = "rgba(110, 231, 183, 0.85)" // emerald-300
    ctx.font = "9px monospace"
    ctx.fillText(labelLines[1], labelX, labelY + 12)

    // ═══════════════════════════════════════════════════════════════════
    // R12.65: MARCADOR DO PRIMEIRO FILAMENTO REAL (primeiro G1 com E>0)
    // ─────────────────────────────────────────────────────────────────
    // Onde a extrusão começa de fato — geralmente após um travel inicial
    // do zero até o ponto de partida do skirt/perímetro. Ajuda a usuária
    // a entender que o bico VAI se mover do G92 zero até aqui antes de
    // depositar biotinta. Círculo laranja + linha tracejada do zero.
    // ═══════════════════════════════════════════════════════════════════
    const firstExtrude = parsed.moves.find((m) => m.type === "G1" && m.e > 0)
    if (firstExtrude) {
      const fe = project(firstExtrude.to, camera, w, h)

      // Linha tracejada do zero até o primeiro filamento
      ctx.strokeStyle = "rgba(251, 146, 60, 0.55)" // orange-400
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(origin.x, origin.y)
      ctx.lineTo(fe.x, fe.y)
      ctx.stroke()
      ctx.setLineDash([])

      // Anel externo laranja
      ctx.strokeStyle = "rgba(251, 146, 60, 0.85)"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(fe.x, fe.y, 9, 0, 2 * Math.PI)
      ctx.stroke()

      // Ponto interno
      ctx.fillStyle = "rgba(251, 146, 60, 1)"
      ctx.beginPath()
      ctx.arc(fe.x, fe.y, 3, 0, 2 * Math.PI)
      ctx.fill()

      // Label com coordenadas do primeiro filamento
      const feLabel = `▶ 1º filamento (${firstExtrude.to.x.toFixed(1)}, ${firstExtrude.to.y.toFixed(1)}, ${firstExtrude.to.z.toFixed(1)}) mm`
      ctx.font = "9px monospace"
      const feLabelW = ctx.measureText(feLabel).width
      ctx.fillStyle = "rgba(124, 45, 18, 0.85)" // orange-900
      ctx.fillRect(fe.x + 12, fe.y - 6, feLabelW + 8, 14)
      ctx.strokeStyle = "rgba(251, 146, 60, 0.6)"
      ctx.lineWidth = 1
      ctx.strokeRect(fe.x + 12, fe.y - 6, feLabelW + 8, 14)
      ctx.fillStyle = "rgba(254, 215, 170, 1)" // orange-200
      ctx.fillText(feLabel, fe.x + 16, fe.y + 4)
    }

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
  }, [parsed, camera, colorMode, effectiveLayerFrom, effectiveLayerTo, showTravels, shearValues, center, formulations])

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
  // R12.11: suporta tanto orbit (rotação) quanto pan (arrastar mesa)
  // - Botão esquerdo padrão: usa modo ativo (orbit OU pan)
  // - Botão do meio (1) OU shift+esquerdo: força pan
  // - Botão direito (2): força pan
  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      cam: { ...camera },
      button: e.button,
      shift: e.shiftKey,
    }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    const forcePan =
      dragStart.current.button === 1 ||
      dragStart.current.button === 2 ||
      dragStart.current.shift
    const doPan = forcePan || interactionMode === "pan"

    if (doPan) {
      // Modo PAN — arrasta a mesa/painel
      setCamera({
        ...dragStart.current.cam,
        panX: dragStart.current.cam.panX + dx,
        panY: dragStart.current.cam.panY + dy,
      })
    } else {
      // Modo ORBIT — rotaciona
      setCamera({
        ...dragStart.current.cam,
        rotY: dragStart.current.cam.rotY + dx * 0.01,
        rotX: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, dragStart.current.cam.rotX + dy * 0.01)),
      })
    }
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
  const onContextMenu = (e: React.MouseEvent) => {
    // Bloqueia menu de contexto para liberar botão direito para pan
    e.preventDefault()
  }

  // R12.11: stats por camada — para o painel de análise
  const layerStats = useMemo(() => {
    if (!parsed) return []
    return parsed.layers.map((layerZ) => {
      const moves = parsed.moves.filter((m) => m.layer === layerZ)
      const extrudes = moves.filter((m) => m.type === "G1" && m.e > 0)
      const travels = moves.filter((m) => m.type === "G0")
      const totalExtrudeLen = extrudes.reduce((acc, m) => {
        const dx = m.to.x - 0 // simplificado
        const dy = m.to.y - 0
        return acc + Math.sqrt(dx * dx + dy * dy)
      }, 0)
      const avgFeedrate = extrudes.length
        ? extrudes.reduce((a, m) => a + m.feedrate, 0) / extrudes.length
        : 0
      return {
        z: layerZ,
        moveCount: moves.length,
        extrudeCount: extrudes.length,
        travelCount: travels.length,
        totalExtrudeLen,
        avgFeedrate,
      }
    })
  }, [parsed])

  // R12.11: animação play/pause — avança a camada ativa
  useEffect(() => {
    if (!isPlaying || !parsed) return
    playIntervalRef.current = setInterval(() => {
      setActiveLayer((curr) => {
        if (curr === null) return parsed.layers[0] ?? null
        const idx = parsed.layers.indexOf(curr)
        if (idx === -1 || idx >= parsed.layers.length - 1) {
          setIsPlaying(false)
          return curr
        }
        return parsed.layers[idx + 1]
      })
    }, 400)
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current)
    }
  }, [isPlaying, parsed])

  // (declarações de effectiveLayerFrom/To movidas para o topo do componente em R12.17 — vide bugfix comment)

  return (
    <div className={cn("relative w-full h-full bg-[#05050c] rounded-xl overflow-hidden border border-violet-500/15", className)}>
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className={cn(
          "w-full h-full",
          interactionMode === "pan"
            ? "cursor-move active:cursor-grabbing"
            : "cursor-grab active:cursor-grabbing"
        )}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onContextMenu={onContextMenu}
      />

      {/* Toolbar topo-direita */}
      <div className="absolute top-2 right-2 flex flex-col gap-1.5">
        {/* Toggle Orbit/Pan */}
        <div className="flex flex-col gap-0.5 bg-black/60 border border-white/10 rounded-lg p-0.5">
          <button
            onClick={() => setInteractionMode("orbit")}
            className={cn(
              "px-2 py-1.5 rounded text-[10px] flex items-center gap-1 transition-colors",
              interactionMode === "orbit"
                ? "bg-violet-500/40 text-white"
                : "text-white/70 hover:bg-white/10"
            )}
            title="Modo rotação (orbit)"
          >
            <RefreshCw className="w-3 h-3" /> Orbit
          </button>
          <button
            onClick={() => setInteractionMode("pan")}
            className={cn(
              "px-2 py-1.5 rounded text-[10px] flex items-center gap-1 transition-colors",
              interactionMode === "pan"
                ? "bg-violet-500/40 text-white"
                : "text-white/70 hover:bg-white/10"
            )}
            title="Modo arrastar (pan) — também: shift+drag ou botão direito"
          >
            <Move className="w-3 h-3" /> Pan
          </button>
        </div>
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
        <button
          onClick={() => {
            setLayerAnalysisOpen(!layerAnalysisOpen)
            if (!layerAnalysisOpen && parsed) {
              setActiveLayer(parsed.layers[parsed.layers.length - 1] ?? null)
            } else {
              setIsPlaying(false)
            }
          }}
          className={cn(
            "px-2 py-1.5 rounded-lg border text-[10px] flex items-center gap-1 transition-colors",
            layerAnalysisOpen
              ? "bg-violet-500/40 text-white border-violet-400/50"
              : "bg-black/60 hover:bg-violet-500/30 border-white/10 text-white/80"
          )}
          title="Análise camada-a-camada"
        >
          <LayersIcon className="w-3 h-3" /> Camadas
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
        🖱️ {interactionMode === "orbit" ? "arraste = rotacionar" : "arraste = mover mesa"} · shift+drag ou btn direito = pan · scroll = zoom
      </div>

      {/* R12.11: Painel de análise camada-a-camada — bottom */}
      {layerAnalysisOpen && parsed && parsed.layers.length > 0 && (
        <div className="absolute bottom-10 left-2 right-2 bg-black/85 border border-violet-400/40 rounded-xl p-3 backdrop-blur-md max-w-md">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold flex items-center gap-1">
              <LayersIcon className="w-3 h-3" /> Análise camada-a-camada
            </div>
            <button
              onClick={() => setLayerAnalysisOpen(false)}
              className="text-white/40 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
          {/* Controles de player */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-2 py-1 rounded bg-violet-500/30 hover:bg-violet-500/50 border border-violet-400/40 text-white text-[10px] flex items-center gap-1"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isPlaying ? "Pausar" : "Reproduzir"}
            </button>
            <button
              onClick={() => setActiveLayer(parsed.layers[0])}
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-white text-[10px]"
              title="Primeira camada"
            >
              ⏮
            </button>
            <button
              onClick={() => setActiveLayer(parsed.layers[parsed.layers.length - 1])}
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-white text-[10px]"
              title="Última camada"
            >
              ⏭
            </button>
            <div className="flex-1 text-right text-[10px] text-white/80 font-mono">
              {activeLayer !== null
                ? `Camada ${parsed.layers.indexOf(activeLayer) + 1}/${parsed.layers.length} · Z=${activeLayer.toFixed(3)}mm`
                : "—"}
            </div>
          </div>
          {/* Slider de camada */}
          <input
            type="range"
            min={0}
            max={parsed.layers.length - 1}
            step={1}
            value={activeLayer !== null ? parsed.layers.indexOf(activeLayer) : 0}
            onChange={(e) => {
              const idx = parseInt(e.target.value)
              setActiveLayer(parsed.layers[idx])
              setIsPlaying(false)
            }}
            className="w-full accent-violet-500"
          />
          {/* Stats da camada ativa */}
          {activeLayer !== null && (() => {
            const stats = layerStats.find((s) => s.z === activeLayer)
            if (!stats) return null
            return (
              <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                <div className="rounded bg-violet-500/10 border border-violet-400/20 p-1.5">
                  <div className="text-violet-300/70">Moves</div>
                  <div className="text-white font-mono font-bold">{stats.moveCount}</div>
                </div>
                <div className="rounded bg-emerald-500/10 border border-emerald-400/20 p-1.5">
                  <div className="text-emerald-300/70">Extrudes</div>
                  <div className="text-white font-mono font-bold">{stats.extrudeCount}</div>
                </div>
                <div className="rounded bg-amber-500/10 border border-amber-400/20 p-1.5">
                  <div className="text-amber-300/70">Travels</div>
                  <div className="text-white font-mono font-bold">{stats.travelCount}</div>
                </div>
                <div className="rounded bg-cyan-500/10 border border-cyan-400/20 p-1.5 col-span-3">
                  <div className="text-cyan-300/70">Feedrate médio</div>
                  <div className="text-white font-mono font-bold">{stats.avgFeedrate.toFixed(0)} mm/min</div>
                </div>
              </div>
            )
          })()}
          <p className="mt-2 text-[9px] text-violet-200/60 leading-tight">
            🔬 Visualiza como a peça é construída camada a camada — útil para detectar problemas de adesão, voids, ou trajetos longos.
          </p>
        </div>
      )}
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

  // R12.64: MESA REDONDA — desenha o contorno circular da plataforma
  // de bioimpressão sobreposto ao grid. O diâmetro útil é a MENOR das
  // dimensões do bounding box (a peça precisa caber dentro do círculo).
  // Origem física: (0,0,0) é o CENTRO da mesa em bioimpressão (não canto).
  //
  // Para renderizar o círculo em projeção 3D, amostramos N pontos no
  // círculo em Z=0 e ligamos como polyline (bom o suficiente pra 64
  // segmentos de subdivisão).
  const bedDiameter = Math.min(
    bounds.max.x - bounds.min.x + 20, // +padding pra visualização
    bounds.max.y - bounds.min.y + 20,
  )
  const bedRadius = Math.max(50, bedDiameter / 2) // mínimo 50mm para visualização
  const bedCx = (bounds.min.x + bounds.max.x) / 2
  const bedCy = (bounds.min.y + bounds.max.y) / 2
  const segments = 64

  // Círculo em traço destacado (azul-ciano — combina com identidade Bio)
  ctx.strokeStyle = "rgba(34, 211, 238, 0.35)" // cyan-400 @ 35%
  ctx.lineWidth = 1.4
  ctx.setLineDash([])
  ctx.beginPath()
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * 2 * Math.PI
    const px = bedCx + bedRadius * Math.cos(theta)
    const py = bedCy + bedRadius * Math.sin(theta)
    const proj = project({ x: px, y: py, z: 0 }, cam, w, h)
    if (i === 0) ctx.moveTo(proj.x, proj.y)
    else ctx.lineTo(proj.x, proj.y)
  }
  ctx.stroke()

  // Preenchimento sutil dentro do círculo (efeito "bandeja iluminada")
  ctx.fillStyle = "rgba(34, 211, 238, 0.04)"
  ctx.beginPath()
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * 2 * Math.PI
    const px = bedCx + bedRadius * Math.cos(theta)
    const py = bedCy + bedRadius * Math.sin(theta)
    const proj = project({ x: px, y: py, z: 0 }, cam, w, h)
    if (i === 0) ctx.moveTo(proj.x, proj.y)
    else ctx.lineTo(proj.x, proj.y)
  }
  ctx.closePath()
  ctx.fill()

  // Marca central da mesa (indica origem física da plataforma)
  const centerProj = project({ x: bedCx, y: bedCy, z: 0 }, cam, w, h)
  ctx.strokeStyle = "rgba(34, 211, 238, 0.45)"
  ctx.lineWidth = 0.8
  ctx.setLineDash([2, 2])
  // Cruz central
  ctx.beginPath()
  ctx.moveTo(centerProj.x - 6, centerProj.y)
  ctx.lineTo(centerProj.x + 6, centerProj.y)
  ctx.moveTo(centerProj.x, centerProj.y - 6)
  ctx.lineTo(centerProj.x, centerProj.y + 6)
  ctx.stroke()
  ctx.setLineDash([])

  // Rótulo "Mesa REDONDA · Ø{d}mm"
  ctx.fillStyle = "rgba(34, 211, 238, 0.7)"
  ctx.font = "9px monospace"
  ctx.textAlign = "left"
  ctx.fillText(
    `⊙ Mesa redonda Ø${(bedRadius * 2).toFixed(0)} mm`,
    centerProj.x + 10,
    centerProj.y + 12,
  )
}
