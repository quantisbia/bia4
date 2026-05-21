"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · GcodeValidatorPanel — Painel unificado de validação visual de G-code
 *  ─────────────────────────────────────────────────────────────────────
 *  Componente PRO que combina, em um único bloco:
 *    1. Visualização 3D do toolpath (GcodeViewer3D)
 *    2. Validação estática (gcode-validator)
 *    3. Análise de complexidade com alertas acionáveis
 *    4. Estatísticas profissionais (camadas, moves, tempo, viability)
 *    5. Verdict final: SAFE / REVIEW / BLOCKED — antes de imprimir
 *
 *  Uso: <GcodeValidatorPanel gcode={text} title="..." compact={false} />
 *
 *  Pode ser usado em todas as páginas de geração de G-code para
 *  validação profissional ANTES de enviar à impressora.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026 · R12.12
 * ═══════════════════════════════════════════════════════════════════════
 */

import { useMemo, useState } from "react"
import {
  CheckCircle2, AlertTriangle, ShieldAlert, Info, Eye, EyeOff,
  Cpu, Layers, Activity, Clock, Maximize2, BarChart3,
  ChevronDown, ChevronRight, Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { parseGcode, type ParsedGcode } from "@/lib/bioprint/toolpath-engine"
import {
  validateGcode, verdictLabel, DEFAULT_BIO_LIMITS,
  type ValidationResult, type FirmwareKind, type PrinterLimits,
} from "@/lib/bioprint/gcode-validator"
import { GcodeViewer3D, type ColorMode } from "./GcodeViewer3D"

export interface GcodeValidatorPanelProps {
  /** G-code em texto puro */
  gcode: string
  /** Título do painel (default: "Validação visual do G-code") */
  title?: string
  /** Firmware-alvo (default: marlin) */
  firmware?: FirmwareKind
  /** Limites da impressora (default: DEFAULT_BIO_LIMITS) */
  limits?: PrinterLimits
  /** Versão compacta — sem stats expandidos, viewer menor */
  compact?: boolean
  /** Altura do viewer (default: 460px regular, 280px compact) */
  viewerHeight?: number
  /** Mostrar painel inteiro só se houver G-code */
  hideWhenEmpty?: boolean
  /** Callback quando verdict mudar — útil para gating do botão "Enviar" */
  onVerdictChange?: (verdict: "safe" | "review" | "blocked" | "empty") => void
  className?: string
}

interface ComplexityAlert {
  severity: "critical" | "warning" | "info"
  title: string
  detail: string
  suggestion: string
}

export function GcodeValidatorPanel({
  gcode,
  title = "Validação visual do G-code",
  firmware = "marlin",
  limits = DEFAULT_BIO_LIMITS,
  compact = false,
  viewerHeight,
  hideWhenEmpty = false,
  onVerdictChange,
  className,
}: GcodeValidatorPanelProps) {
  const [showViewer, setShowViewer] = useState(true)
  const [colorMode, setColorMode] = useState<ColorMode>("layer")
  const [showAllIssues, setShowAllIssues] = useState(false)
  const [showAllAlerts, setShowAllAlerts] = useState(false)
  const [tab, setTab] = useState<"viewer" | "validation" | "complexity">("viewer")

  // Parse G-code (uma vez)
  const parsed: ParsedGcode | null = useMemo(() => {
    if (!gcode || !gcode.trim()) return null
    try {
      return parseGcode(gcode)
    } catch (e) {
      // erro de parse será mostrado abaixo
      return null
    }
  }, [gcode])

  // Validação estática
  const validation: ValidationResult | null = useMemo(() => {
    if (!gcode || !gcode.trim()) return null
    try {
      return validateGcode(gcode, limits, firmware)
    } catch {
      return null
    }
  }, [gcode, firmware, limits])

  // Análise de complexidade (alertas acionáveis)
  const complexity = useMemo(() => {
    if (!parsed || !validation) return null
    const alerts: ComplexityAlert[] = []

    const moveCount = parsed.moves.length
    if (moveCount > 50000) {
      alerts.push({
        severity: "critical",
        title: "G-code muito longo (>50k moves)",
        detail: `${moveCount.toLocaleString()} moves — pode estourar buffer Marlin clássico ao enviar via USB.`,
        suggestion: "Aumente layer height (0.3–0.4mm), reduza infill, ou imprima via SD card.",
      })
    } else if (moveCount > 20000) {
      alerts.push({
        severity: "warning",
        title: "G-code longo (>20k moves)",
        detail: `${moveCount.toLocaleString()} moves — USB streaming pode ter pequenos delays.`,
        suggestion: "Use SD card para máxima estabilidade.",
      })
    }

    const layerCount = parsed.layers.length
    if (layerCount > 500) {
      alerts.push({
        severity: "warning",
        title: "Muitas camadas (>500)",
        detail: `${layerCount} camadas — tempo total alto, risco de desidratação da bioink.`,
        suggestion: "Aumente layer height para 0.3mm+ ou use câmara umidificada.",
      })
    }

    const { bbox } = validation.stats
    const sizeX = bbox.maxX - bbox.minX
    const sizeY = bbox.maxY - bbox.minY
    const sizeZ = bbox.maxZ - bbox.minZ

    if (bbox.maxX > limits.xMaxMm || bbox.maxY > limits.yMaxMm || bbox.maxZ > limits.zMaxMm) {
      alerts.push({
        severity: "critical",
        title: "Geometria excede build volume",
        detail: `Bbox ${sizeX.toFixed(0)}×${sizeY.toFixed(0)}×${sizeZ.toFixed(0)}mm vs limite ${limits.xMaxMm}×${limits.yMaxMm}×${limits.zMaxMm}mm`,
        suggestion: "Reduza dimensões do modelo ou escolha bioimpressora com mesa maior.",
      })
    }

    if (bbox.minX < 0 || bbox.minY < 0 || bbox.minZ < limits.zMinMm) {
      alerts.push({
        severity: "warning",
        title: "Coordenadas negativas detectadas",
        detail: `Min: X=${bbox.minX.toFixed(2)} Y=${bbox.minY.toFixed(2)} Z=${bbox.minZ.toFixed(2)}mm — risco de colisão.`,
        suggestion: "Adicione G92 X0 Y0 Z0 no início para zerar a origem corretamente.",
      })
    }

    const feedrates = parsed.moves.filter((m) => m.type === "G1").map((m) => m.feedrate)
    const maxF = feedrates.length ? Math.max(...feedrates) : 0
    if (maxF > 1800) {
      alerts.push({
        severity: "warning",
        title: "Velocidade alta para bioimpressão",
        detail: `Feedrate máximo: ${maxF.toFixed(0)} mm/min (${(maxF / 60).toFixed(1)} mm/s).`,
        suggestion: "Para células vivas, mantenha ≤ 600 mm/min (10 mm/s) — preserva viabilidade.",
      })
    }

    if (validation.stats.estTotalTimeMin > 240) {
      alerts.push({
        severity: "warning",
        title: "Tempo de impressão > 4 horas",
        detail: `Estimativa: ${(validation.stats.estTotalTimeMin / 60).toFixed(1)} horas.`,
        suggestion: "Bioinks com células perdem viabilidade após 2–3h fora da incubadora.",
      })
    }

    const travelCount = parsed.moves.filter((m) => m.type === "G0").length
    const travelRatio = moveCount > 0 ? travelCount / moveCount : 0
    if (travelRatio > 0.4) {
      alerts.push({
        severity: "info",
        title: "Muitos travels (movimentos sem extrusão)",
        detail: `${(travelRatio * 100).toFixed(1)}% dos moves são travels — slicing pode estar ineficiente.`,
        suggestion: "Tente otimizar o slicer (combine infill, evite ilhas pequenas).",
      })
    }

    const hasHeat = validation.stats.uniqueCommands.some((c) =>
      c === "M104" || c === "M109" || c === "M140" || c === "M190"
    )
    if (!hasHeat && validation.stats.uniqueCommands.includes("G1")) {
      alerts.push({
        severity: "info",
        title: "Sem comandos de aquecimento",
        detail: "Não há M104/M109/M140/M190 — bico/mesa não serão aquecidos pelo G-code.",
        suggestion: "OK se a bioink polimeriza a temperatura ambiente ou se a impressora já está pré-aquecida.",
      })
    }

    if (!validation.stats.uniqueCommands.includes("G92")) {
      alerts.push({
        severity: "warning",
        title: "Sem G92 (zero relativo)",
        detail: "Não há G92 — a impressora usará a origem atual da máquina.",
        suggestion: "Adicione G92 X0 Y0 Z0 E0 no início para garantir posicionamento correto.",
      })
    }

    if (!validation.stats.uniqueCommands.some((c) => c === "G21")) {
      alerts.push({
        severity: "info",
        title: "Sem G21 (unidades em mm)",
        detail: "Não há G21 explícito — Marlin assume mm por padrão, mas é boa prática declarar.",
        suggestion: "Adicione G21 no header para garantir unidades em mm (não polegadas).",
      })
    }

    if (!validation.stats.uniqueCommands.some((c) => c === "G90" || c === "G91")) {
      alerts.push({
        severity: "info",
        title: "Sem G90/G91 (modo de coordenadas)",
        detail: "Não há G90 (absoluto) ou G91 (relativo) — comportamento depende do firmware.",
        suggestion: "Adicione G90 no header para usar coordenadas absolutas.",
      })
    }

    // Score 0-100
    const score =
      Math.min(50, moveCount / 1000) +
      Math.min(20, layerCount / 25) +
      alerts.filter((a) => a.severity === "critical").length * 15 +
      alerts.filter((a) => a.severity === "warning").length * 5

    const label =
      score < 20 ? "Baixa" : score < 50 ? "Média" : score < 80 ? "Alta" : "Muito alta"

    const color =
      score < 20 ? "emerald" : score < 50 ? "cyan" : score < 80 ? "amber" : "rose"

    return {
      alerts,
      score: Math.min(100, score),
      label,
      color,
      moveCount,
      layerCount,
      travelCount,
      maxFeedrate: maxF,
    }
  }, [parsed, validation, limits])

  // Determinar verdict combinado (validation + complexity)
  const overallVerdict: "safe" | "review" | "blocked" | "empty" = useMemo(() => {
    if (!gcode || !gcode.trim()) return "empty"
    if (!validation) return "empty"
    if (validation.verdict === "blocked") return "blocked"
    if (complexity?.alerts.some((a) => a.severity === "critical")) return "blocked"
    if (validation.verdict === "review") return "review"
    if (complexity?.alerts.some((a) => a.severity === "warning")) return "review"
    return "safe"
  }, [gcode, validation, complexity])

  // Notificar parent quando verdict mudar
  useMemo(() => {
    onVerdictChange?.(overallVerdict)
  }, [overallVerdict, onVerdictChange])

  // Early return se vazio + hideWhenEmpty
  if (hideWhenEmpty && (!gcode || !gcode.trim())) {
    return null
  }

  const vH = viewerHeight ?? (compact ? 280 : 460)

  // ── EMPTY STATE ──
  if (!gcode || !gcode.trim()) {
    return (
      <div className={cn("rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 p-6", className)}>
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-5 h-5 text-violet-400" />
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        <div className="rounded-xl border border-dashed border-white/15 p-8 text-center">
          <Eye className="w-8 h-8 text-violet-400/40 mx-auto mb-3" />
          <p className="text-sm text-gray-400 mb-1">Aguardando G-code para validar.</p>
          <p className="text-[11px] text-gray-500">
            Quando gerar, este painel mostra: toolpath 3D · validação estática · alertas de complexidade · estimativa de viabilidade.
          </p>
        </div>
      </div>
    )
  }

  // ── PARSE ERROR ──
  if (!parsed) {
    return (
      <div className={cn("rounded-2xl border border-rose-500/40 bg-rose-500/5 p-6", className)}>
        <div className="flex items-center gap-3 mb-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <h3 className="text-sm font-semibold text-rose-100">{title}</h3>
        </div>
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-rose-100 font-semibold mb-1">G-code inválido ou corrompido</p>
            <p className="text-xs text-rose-200/80">
              Não foi possível interpretar o G-code. Verifique se há comandos não-reconhecidos, encoding correto (UTF-8) e formato Marlin/RepRap padrão.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── MAIN UI ──
  const verdictBadge =
    overallVerdict === "safe"
      ? { text: "✓ Pronto para imprimir", color: "emerald", icon: CheckCircle2 }
      : overallVerdict === "review"
      ? { text: "⚠ Revisar antes de imprimir", color: "amber", icon: AlertTriangle }
      : { text: "✕ Bloqueado — corrija erros", color: "rose", icon: ShieldAlert }

  const VBIcon = verdictBadge.icon

  return (
    <div
      className={cn(
        "rounded-2xl border bg-gradient-to-br p-5 transition-all",
        overallVerdict === "safe" && "border-emerald-500/30 from-emerald-500/5 to-cyan-500/5",
        overallVerdict === "review" && "border-amber-500/30 from-amber-500/5 to-yellow-500/5",
        overallVerdict === "blocked" && "border-rose-500/40 from-rose-500/5 to-red-500/5",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className={cn(
            "w-5 h-5",
            overallVerdict === "safe" && "text-emerald-400",
            overallVerdict === "review" && "text-amber-400",
            overallVerdict === "blocked" && "text-rose-400",
          )} />
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>

        <div className={cn(
          "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border",
          verdictBadge.color === "emerald" && "bg-emerald-500/20 border-emerald-500/40 text-emerald-200",
          verdictBadge.color === "amber" && "bg-amber-500/20 border-amber-500/40 text-amber-200",
          verdictBadge.color === "rose" && "bg-rose-500/20 border-rose-500/40 text-rose-200",
        )}>
          <VBIcon className="w-3.5 h-3.5" />
          {verdictBadge.text}
        </div>
      </div>

      {/* Stats summary — sempre visível */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <StatChip
          icon={Layers}
          label="Camadas"
          value={parsed.layers.length.toString()}
          tone="violet"
        />
        <StatChip
          icon={Activity}
          label="Moves"
          value={parsed.moves.length.toLocaleString()}
          tone="cyan"
        />
        <StatChip
          icon={Clock}
          label="Tempo est."
          value={`${validation?.stats.estTotalTimeMin.toFixed(0) ?? "—"} min`}
          tone="emerald"
        />
        <StatChip
          icon={Maximize2}
          label="Bbox X×Y×Z"
          value={
            validation
              ? `${(validation.stats.bbox.maxX - validation.stats.bbox.minX).toFixed(0)}×${(validation.stats.bbox.maxY - validation.stats.bbox.minY).toFixed(0)}×${(validation.stats.bbox.maxZ - validation.stats.bbox.minZ).toFixed(0)}`
              : "—"
          }
          tone="amber"
        />
      </div>

      {/* Tabs (viewer / validation / complexity) */}
      <div className="flex items-center gap-1 mb-3 bg-black/30 rounded-lg p-1 w-fit">
        <TabBtn
          active={tab === "viewer"}
          onClick={() => setTab("viewer")}
          icon={Eye}
          label="Toolpath 3D"
          badge={`${parsed.moves.length.toLocaleString()}`}
        />
        <TabBtn
          active={tab === "validation"}
          onClick={() => setTab("validation")}
          icon={ShieldAlert}
          label="Validação"
          badge={
            validation
              ? `${validation.errorCount}E·${validation.warningCount}A`
              : undefined
          }
          badgeColor={
            validation && validation.errorCount > 0
              ? "rose"
              : validation && validation.warningCount > 0
              ? "amber"
              : "emerald"
          }
        />
        <TabBtn
          active={tab === "complexity"}
          onClick={() => setTab("complexity")}
          icon={Cpu}
          label="Complexidade"
          badge={complexity?.label}
          badgeColor={complexity?.color}
        />
      </div>

      {/* Tab content */}
      {tab === "viewer" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <select
              value={colorMode}
              onChange={(e) => setColorMode(e.target.value as ColorMode)}
              className="px-2 py-1 rounded text-[11px] bg-black/40 border border-white/10 text-gray-300"
            >
              <option value="layer">Cor por camada</option>
              <option value="velocity">Cor por velocidade</option>
              <option value="shear">Cor por shear stress</option>
              <option value="type">Cor por tipo (move/travel)</option>
              <option value="tool">Cor por tool (T0/T1/T2)</option>
            </select>
            <button
              onClick={() => setShowViewer(!showViewer)}
              className="px-2 py-1 rounded text-[11px] bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 flex items-center gap-1"
            >
              {showViewer ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showViewer ? "Ocultar" : "Mostrar"} viewer
            </button>
          </div>
          {showViewer && (
            <div className="rounded-lg overflow-hidden border border-white/10 bg-black/40" style={{ height: vH }}>
              <GcodeViewer3D
                parsed={parsed}
                initialColorMode={colorMode}
                className="w-full h-full"
              />
            </div>
          )}
          <p className="text-[10px] text-gray-500 leading-relaxed">
            🖱️ Arraste = rotacionar · shift+drag ou botão direito = arrastar mesa · scroll = zoom · botão "Camadas" = análise camada-a-camada
          </p>
        </div>
      )}

      {tab === "validation" && validation && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
            <Stat label="Linhas código" value={validation.stats.codeLines.toLocaleString()} />
            <Stat label="Comentários" value={validation.stats.commentLines.toLocaleString()} />
            <Stat label="Cmds únicos" value={validation.stats.uniqueCommands.length.toString()} />
            <Stat label="Extrusão E" value={`${validation.stats.totalExtrusionE.toFixed(1)} mm`} />
            <Stat label="X range" value={`${validation.stats.bbox.minX.toFixed(1)}→${validation.stats.bbox.maxX.toFixed(1)}`} />
            <Stat label="Y range" value={`${validation.stats.bbox.minY.toFixed(1)}→${validation.stats.bbox.maxY.toFixed(1)}`} />
            <Stat label="Z range" value={`${validation.stats.bbox.minZ.toFixed(1)}→${validation.stats.bbox.maxZ.toFixed(1)}`} />
            <Stat label="G28 (home)" value={validation.stats.hasG28 ? "sim" : "—"} />
          </div>

          {validation.issues.length === 0 ? (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-100">
                <strong>G-code estaticamente válido.</strong> Nenhum erro, aviso ou comando suspeito detectado.
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                  {validation.errorCount} erro{validation.errorCount !== 1 ? "s" : ""} ·{" "}
                  {validation.warningCount} aviso{validation.warningCount !== 1 ? "s" : ""} ·{" "}
                  {validation.infoCount} info
                </span>
                {validation.issues.length > 8 && (
                  <button
                    onClick={() => setShowAllIssues(!showAllIssues)}
                    className="text-[10px] text-cyan-300 hover:text-cyan-100"
                  >
                    {showAllIssues ? "Mostrar menos" : `Mostrar todos (${validation.issues.length})`}
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1 text-[10px] font-mono pr-1">
                {(showAllIssues ? validation.issues : validation.issues.slice(0, 8)).map((iss, i) => (
                  <div
                    key={i}
                    className={cn(
                      "px-2 py-1.5 rounded border",
                      iss.severity === "error" && "bg-rose-500/10 border-rose-500/30 text-rose-100",
                      iss.severity === "warning" && "bg-amber-500/10 border-amber-500/30 text-amber-100",
                      iss.severity === "info" && "bg-cyan-500/10 border-cyan-500/30 text-cyan-100",
                    )}
                  >
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold">L{iss.line}</span>
                      <span className="text-[9px] uppercase opacity-60">[{iss.code}]</span>
                    </div>
                    <div className="ml-1 mt-0.5">{iss.message}</div>
                    {iss.raw && (
                      <div className="ml-1 mt-0.5 text-[9px] opacity-60 truncate">
                        → <code>{iss.raw}</code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "complexity" && complexity && (
        <div className="space-y-3">
          {/* Score visual */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                Complexidade geral
              </span>
              <span className={cn(
                "text-xs font-bold",
                complexity.color === "emerald" && "text-emerald-300",
                complexity.color === "cyan" && "text-cyan-300",
                complexity.color === "amber" && "text-amber-300",
                complexity.color === "rose" && "text-rose-300",
              )}>
                {complexity.score.toFixed(0)}/100 · {complexity.label}
              </span>
            </div>
            <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  complexity.color === "emerald" && "bg-gradient-to-r from-emerald-500 to-cyan-500",
                  complexity.color === "cyan" && "bg-gradient-to-r from-cyan-500 to-violet-500",
                  complexity.color === "amber" && "bg-gradient-to-r from-amber-500 to-orange-500",
                  complexity.color === "rose" && "bg-gradient-to-r from-rose-500 to-red-500",
                )}
                style={{ width: `${complexity.score}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Moves" value={complexity.moveCount.toLocaleString()} />
            <Stat label="Camadas" value={complexity.layerCount.toString()} />
            <Stat label="Travels" value={complexity.travelCount.toLocaleString()} />
            <Stat label="Feedrate max" value={`${complexity.maxFeedrate.toFixed(0)} mm/min`} />
          </div>

          {complexity.alerts.length === 0 ? (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-100">
                <strong>Sem alertas de complexidade.</strong> G-code dentro de parâmetros recomendados.
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                  {complexity.alerts.length} alerta{complexity.alerts.length > 1 ? "s" : ""} ·{" "}
                  {complexity.alerts.filter(a => a.severity === "critical").length} crítico,{" "}
                  {complexity.alerts.filter(a => a.severity === "warning").length} aviso,{" "}
                  {complexity.alerts.filter(a => a.severity === "info").length} info
                </span>
                {complexity.alerts.length > 4 && (
                  <button
                    onClick={() => setShowAllAlerts(!showAllAlerts)}
                    className="text-[10px] text-cyan-300 hover:text-cyan-100"
                  >
                    {showAllAlerts ? "Menos" : `Todos (${complexity.alerts.length})`}
                  </button>
                )}
              </div>
              {(showAllAlerts ? complexity.alerts : complexity.alerts.slice(0, 4)).map((alert, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg border p-2.5 text-xs",
                    alert.severity === "critical" && "bg-rose-500/10 border-rose-500/40",
                    alert.severity === "warning" && "bg-amber-500/10 border-amber-500/30",
                    alert.severity === "info" && "bg-cyan-500/10 border-cyan-500/30",
                  )}
                >
                  <div className="flex items-start gap-2">
                    {alert.severity === "critical" && <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                    {alert.severity === "warning" && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                    {alert.severity === "info" && <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "font-semibold mb-0.5",
                        alert.severity === "critical" && "text-rose-100",
                        alert.severity === "warning" && "text-amber-100",
                        alert.severity === "info" && "text-cyan-100",
                      )}>
                        {alert.title}
                      </div>
                      <div className="text-gray-300 text-[11px] mb-1 leading-relaxed">{alert.detail}</div>
                      <div className={cn(
                        "text-[11px] italic flex items-start gap-1",
                        alert.severity === "critical" && "text-rose-200/80",
                        alert.severity === "warning" && "text-amber-200/80",
                        alert.severity === "info" && "text-cyan-200/80",
                      )}>
                        <span>💡</span> <span>{alert.suggestion}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Subcomponents ────────────────────────────────────────────────────────

function StatChip({
  icon: Icon, label, value, tone,
}: {
  icon: typeof Layers
  label: string
  value: string
  tone: "violet" | "cyan" | "emerald" | "amber"
}) {
  const tones = {
    violet: "bg-violet-500/10 border-violet-500/25 text-violet-300",
    cyan: "bg-cyan-500/10 border-cyan-500/25 text-cyan-300",
    emerald: "bg-emerald-500/10 border-emerald-500/25 text-emerald-300",
    amber: "bg-amber-500/10 border-amber-500/25 text-amber-300",
  }
  return (
    <div className={cn("rounded-lg border p-2", tones[tone])}>
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider opacity-80 mb-0.5">
        <Icon className="w-2.5 h-2.5" />
        {label}
      </div>
      <div className="text-sm font-bold font-mono text-white">{value}</div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white/[0.03] border border-white/8 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-[11px] font-mono text-white truncate">{value}</div>
    </div>
  )
}

function TabBtn({
  active, onClick, icon: Icon, label, badge, badgeColor,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Eye
  label: string
  badge?: string
  badgeColor?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors",
        active
          ? "bg-white/10 text-white"
          : "text-gray-400 hover:text-gray-200 hover:bg-white/5",
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      {badge && (
        <span className={cn(
          "text-[9px] font-mono px-1.5 py-0.5 rounded",
          !badgeColor && "bg-white/10 text-white/70",
          badgeColor === "emerald" && "bg-emerald-500/20 text-emerald-200",
          badgeColor === "cyan" && "bg-cyan-500/20 text-cyan-200",
          badgeColor === "amber" && "bg-amber-500/20 text-amber-200",
          badgeColor === "rose" && "bg-rose-500/20 text-rose-200",
        )}>
          {badge}
        </span>
      )}
    </button>
  )
}
