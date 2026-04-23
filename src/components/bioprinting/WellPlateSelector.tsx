"use client"

/**
 * BIA v4.2 — Well Plate Selector (SVG interativo)
 *
 * Componente visual para selecionar poços em placas SBS (6/12/24/48/96/384).
 * - Clique no poço para selecionar/desselecionar
 * - Shift+Clique para selecionar um intervalo (range)
 * - Botões: All | None | Row | Column | Checkerboard
 * - Exibe contagem e preview de trajetória
 */

import { useState, useMemo, useCallback } from "react"
import { cn } from "@/lib/utils/helpers"

// ═══════════════════════════════════════════════════════════════
// Especificações de placa (espelha src/lib/gcode/wellplates/catalog.ts)
// ═══════════════════════════════════════════════════════════════
export type WellPlateFormat = 6 | 12 | 24 | 48 | 96 | 384

interface PlateSpec {
  rows: number
  cols: number
  rowLabels: string[]
  diam: number       // diâmetro do poço em unidades SVG
  spacing: number    // pitch (distância entre centros) em unidades SVG
  offsetX: number
  offsetY: number
}

const PLATES: Record<WellPlateFormat, PlateSpec> = {
  6:   { rows: 2,  cols: 3,  rowLabels: ["A","B"],                                                  diam: 48, spacing: 54, offsetX: 40, offsetY: 40 },
  12:  { rows: 3,  cols: 4,  rowLabels: ["A","B","C"],                                              diam: 34, spacing: 40, offsetX: 38, offsetY: 30 },
  24:  { rows: 4,  cols: 6,  rowLabels: ["A","B","C","D"],                                          diam: 26, spacing: 32, offsetX: 34, offsetY: 26 },
  48:  { rows: 6,  cols: 8,  rowLabels: ["A","B","C","D","E","F"],                                  diam: 20, spacing: 24, offsetX: 30, offsetY: 22 },
  96:  { rows: 8,  cols: 12, rowLabels: ["A","B","C","D","E","F","G","H"],                          diam: 15, spacing: 18, offsetX: 28, offsetY: 20 },
  384: { rows: 16, cols: 24, rowLabels: ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P"], diam: 8,  spacing: 10, offsetX: 22, offsetY: 18 },
}

interface WellPlateSelectorProps {
  format: WellPlateFormat
  selected: string[]
  onChange: (wells: string[]) => void
  trajectory?: string[]            // ordem otimizada (para preview)
  maxSelectable?: number
  readOnly?: boolean
  className?: string
}

export function WellPlateSelector({
  format,
  selected,
  onChange,
  trajectory,
  maxSelectable,
  readOnly,
  className,
}: WellPlateSelectorProps) {
  const spec = PLATES[format]
  const [hoverWell, setHoverWell] = useState<string | null>(null)
  const [lastClicked, setLastClicked] = useState<string | null>(null)

  // SVG viewport size
  const width = spec.offsetX * 2 + spec.cols * spec.spacing
  const height = spec.offsetY * 2 + spec.rows * spec.spacing + 30

  const selectedSet = useMemo(() => new Set(selected), [selected])

  const toggleWell = useCallback(
    (id: string, shiftKey: boolean) => {
      if (readOnly) return
      let next: string[]

      if (shiftKey && lastClicked) {
        // Range selection
        const allWells: string[] = []
        for (let r = 0; r < spec.rows; r++) {
          for (let c = 0; c < spec.cols; c++) {
            allWells.push(`${spec.rowLabels[r]}${c + 1}`)
          }
        }
        const i1 = allWells.indexOf(lastClicked)
        const i2 = allWells.indexOf(id)
        if (i1 >= 0 && i2 >= 0) {
          const [start, end] = i1 < i2 ? [i1, i2] : [i2, i1]
          const range = allWells.slice(start, end + 1)
          next = Array.from(new Set([...selected, ...range]))
        } else {
          next = selected.includes(id) ? selected.filter((w) => w !== id) : [...selected, id]
        }
      } else {
        next = selected.includes(id) ? selected.filter((w) => w !== id) : [...selected, id]
      }
      if (maxSelectable && next.length > maxSelectable) next = next.slice(0, maxSelectable)
      onChange(next)
      setLastClicked(id)
    },
    [selected, onChange, lastClicked, spec, maxSelectable, readOnly],
  )

  // Ações rápidas
  const selectAll = () => {
    const all: string[] = []
    for (let r = 0; r < spec.rows; r++)
      for (let c = 0; c < spec.cols; c++)
        all.push(`${spec.rowLabels[r]}${c + 1}`)
    onChange(maxSelectable ? all.slice(0, maxSelectable) : all)
  }
  const selectNone = () => onChange([])
  const selectCheckerboard = () => {
    const pts: string[] = []
    for (let r = 0; r < spec.rows; r++)
      for (let c = 0; c < spec.cols; c++)
        if ((r + c) % 2 === 0) pts.push(`${spec.rowLabels[r]}${c + 1}`)
    onChange(maxSelectable ? pts.slice(0, maxSelectable) : pts)
  }
  const selectRow = (rowIdx: number) => {
    const pts: string[] = []
    for (let c = 0; c < spec.cols; c++) pts.push(`${spec.rowLabels[rowIdx]}${c + 1}`)
    onChange(Array.from(new Set([...selected, ...pts])))
  }
  const selectCol = (colIdx: number) => {
    const pts: string[] = []
    for (let r = 0; r < spec.rows; r++) pts.push(`${spec.rowLabels[r]}${colIdx + 1}`)
    onChange(Array.from(new Set([...selected, ...pts])))
  }

  // Trajectory path (linhas SVG)
  const trajectoryPath = useMemo(() => {
    if (!trajectory || trajectory.length < 2) return ""
    const points = trajectory.map((id) => {
      const match = id.match(/^([A-P])(\d+)$/i)
      if (!match) return null
      const row = spec.rowLabels.indexOf(match[1].toUpperCase())
      const col = parseInt(match[2], 10) - 1
      if (row < 0 || col < 0) return null
      return {
        x: spec.offsetX + col * spec.spacing,
        y: spec.offsetY + row * spec.spacing,
      }
    }).filter(Boolean) as { x: number; y: number }[]
    if (points.length < 2) return ""
    return "M " + points.map((p) => `${p.x} ${p.y}`).join(" L ")
  }, [trajectory, spec])

  const total = spec.rows * spec.cols
  const maxText = maxSelectable ? ` / ${maxSelectable}` : ""

  return (
    <div className={cn("space-y-3", className)}>
      {/* Info header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-gray-200">
            Placa de <span className="text-emerald-400">{format} poços</span>
          </div>
          <div className="text-xs text-gray-400">
            Selecionados: <span className="text-emerald-400 font-mono">{selected.length}</span>
            <span className="text-gray-600">{maxText} de {total}</span>
          </div>
        </div>

        {!readOnly && (
          <div className="flex flex-wrap gap-1.5 text-xs">
            <button onClick={selectAll} className="px-2 py-1 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-700 hover:bg-emerald-600/30">Todos</button>
            <button onClick={selectNone} className="px-2 py-1 rounded bg-gray-700/30 text-gray-300 border border-gray-600 hover:bg-gray-700/50">Limpar</button>
            <button onClick={selectCheckerboard} className="px-2 py-1 rounded bg-blue-600/20 text-blue-400 border border-blue-700 hover:bg-blue-600/30">Xadrez</button>
          </div>
        )}
      </div>

      {/* SVG Plate */}
      <div className="relative overflow-auto rounded-xl border border-gray-700 bg-gradient-to-br from-gray-900/60 to-gray-950/80 p-2">
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", maxHeight: 500 }}>
          {/* Contorno da placa (footprint SBS) */}
          <rect
            x={4} y={4}
            width={width - 8} height={height - 8}
            rx={8} ry={8}
            fill="#0f172a"
            stroke="#334155"
            strokeWidth={1.5}
          />

          {/* Labels de coluna (1..N) */}
          {Array.from({ length: spec.cols }).map((_, c) => (
            <text
              key={`col-${c}`}
              x={spec.offsetX + c * spec.spacing}
              y={spec.offsetY - spec.diam / 2 - 6}
              textAnchor="middle"
              fill="#64748b"
              fontSize={format === 384 ? 5 : format === 96 ? 7 : 10}
              fontWeight={600}
              style={!readOnly ? { cursor: "pointer" } : undefined}
              onClick={() => !readOnly && selectCol(c)}
            >
              {c + 1}
            </text>
          ))}

          {/* Labels de linha (A..H) */}
          {spec.rowLabels.map((label, r) => (
            <text
              key={`row-${label}`}
              x={spec.offsetX - spec.diam / 2 - 6}
              y={spec.offsetY + r * spec.spacing + 3}
              textAnchor="end"
              fill="#64748b"
              fontSize={format === 384 ? 5 : format === 96 ? 7 : 10}
              fontWeight={600}
              style={!readOnly ? { cursor: "pointer" } : undefined}
              onClick={() => !readOnly && selectRow(r)}
            >
              {label}
            </text>
          ))}

          {/* Trajetória */}
          {trajectoryPath && (
            <path
              d={trajectoryPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={Math.max(0.8, spec.diam * 0.05)}
              strokeDasharray="2 2"
              opacity={0.7}
            />
          )}

          {/* Poços */}
          {spec.rowLabels.map((rowLabel, r) =>
            Array.from({ length: spec.cols }).map((_, c) => {
              const id = `${rowLabel}${c + 1}`
              const isSelected = selectedSet.has(id)
              const isHover = hoverWell === id
              const trajIdx = trajectory ? trajectory.indexOf(id) : -1
              const cx = spec.offsetX + c * spec.spacing
              const cy = spec.offsetY + r * spec.spacing

              return (
                <g key={id}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={spec.diam / 2}
                    fill={
                      isSelected
                        ? "url(#gradSelected)"
                        : isHover
                          ? "#1e3a8a"
                          : "#1e293b"
                    }
                    stroke={
                      isSelected ? "#10b981"
                      : isHover ? "#60a5fa"
                      : "#475569"
                    }
                    strokeWidth={isSelected ? 1.5 : 1}
                    style={readOnly ? {} : { cursor: "pointer", transition: "all 0.1s" }}
                    onMouseEnter={() => setHoverWell(id)}
                    onMouseLeave={() => setHoverWell(null)}
                    onClick={(e) => toggleWell(id, e.shiftKey)}
                  />
                  {isSelected && trajectory && trajIdx >= 0 && format !== 384 && (
                    <text
                      x={cx}
                      y={cy + 2}
                      textAnchor="middle"
                      fontSize={format === 96 ? 5 : Math.max(6, spec.diam / 3)}
                      fill="#fef3c7"
                      fontWeight={700}
                      pointerEvents="none"
                    >
                      {trajIdx + 1}
                    </text>
                  )}
                  {!trajectory && isSelected && format !== 384 && format !== 96 && (
                    <text
                      x={cx}
                      y={cy + 2}
                      textAnchor="middle"
                      fontSize={Math.max(6, spec.diam / 4)}
                      fill="#ecfdf5"
                      fontWeight={600}
                      pointerEvents="none"
                    >
                      {id}
                    </text>
                  )}
                </g>
              )
            }),
          )}

          {/* Gradient definição */}
          <defs>
            <radialGradient id="gradSelected" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.7" />
            </radialGradient>
          </defs>

          {/* Hover tooltip */}
          {hoverWell && (
            <text
              x={width / 2}
              y={height - 8}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={11}
              fontWeight={600}
            >
              {hoverWell}
              {trajectory && trajectory.indexOf(hoverWell) >= 0 &&
                ` — ordem: ${trajectory.indexOf(hoverWell) + 1}`}
            </text>
          )}
        </svg>
      </div>

      {!readOnly && (
        <p className="text-[11px] text-gray-500">
          💡 <strong>Dica:</strong> clique para (des)selecionar • Shift+clique para intervalo • clique nos rótulos A-H / 1-12 para linha/coluna inteira.
        </p>
      )}
    </div>
  )
}
