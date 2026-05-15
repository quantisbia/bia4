"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · TissueDesigner — Painel inteligente de design de tecido (R10)
 *  ─────────────────────────────────────────────────────────────────────
 *  Interface CLEAN com caixas expansíveis. O usuário seleciona o tipo
 *  de tecido (família mecânica) e a BIA sugere automaticamente:
 *    · Geometria STL recomendada
 *    · Tamanho de poro alvo
 *    · Padrão biomimetico de preenchimento
 *    · Densidade de infill
 *    · Bioink + concentração
 *    · Densidade celular
 *    · Parâmetros de impressão (nozzle, velocidade, pressão, etc)
 *    · Score de biomimicidade live
 *
 *  Quando o usuário expande uma caixa, vê:
 *    - Range científico (min/optimal/max)
 *    - Referências bibliográficas
 *    - Slider/input para ajustar
 *    - Feedback visual de "dentro do range" ou não
 *
 *  Paleta: Quantis (lilás/roxo/azul/vinho + dourado)
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useCallback } from "react"
import { ChevronDown, ChevronRight, Sparkles, Beaker, Layers, Activity, Microscope, Thermometer, Droplets, Zap, BookOpen, CheckCircle2, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import {
  TISSUE_PROFILES,
  FAMILY_LABELS,
  getProfilesByFamily,
  calculateBiomimicScore,
  detectIssues,
  suggestGeometryForTissue,
  type TissueProfile,
  type TissueFamily,
  type BiomimeticPattern,
} from "@/lib/bioprint/tissue-parameters"

// ─── Pattern label map ──────────────────────────────────────────────────
const PATTERN_LABELS: Record<BiomimeticPattern, { label: string; icon: string; desc: string }> = {
  "hexagonal-dense":     { label: "Hexagonal Denso",        icon: "⬡⬡⬡", desc: "Favo de mel justaposto — osso cortical, alta rigidez" },
  "gyroid-tpms":         { label: "Gyroid TPMS",            icon: "∞",   desc: "Superfície mínima triplamente periódica — osso esponjoso, cartilagem" },
  "schwarz-p-tpms":      { label: "Schwarz-P TPMS",         icon: "⊞",   desc: "Cúbica primitiva — load-bearing, isotrópica" },
  "diamond-tpms":        { label: "Diamond TPMS",           icon: "◆",   desc: "Alta tortuosidade — cartilagem articular" },
  "voronoi-3d":          { label: "Voronoi 3D",             icon: "⬢",   desc: "Células orgânicas randomizadas — fígado, parênquima" },
  "voronoi-anisotropic": { label: "Voronoi Anisotrópico",   icon: "⬗",   desc: "Voronoi alongado — tendão direcionado" },
  "parallel-aligned":    { label: "Paralelo Alinhado",      icon: "≡",   desc: "Linhas paralelas — músculo, fibra" },
  "concentric-spiral":   { label: "Espiral Concêntrica",    icon: "◎",   desc: "Camadas anulares — vaso, mucosa" },
  "grid-orthogonal":     { label: "Grade Ortogonal 0/90",   icon: "⊞",   desc: "Grade alternada — derme básica" },
  "alveolar":            { label: "Alveolar",               icon: "⌬",   desc: "Câmaras alveolares — pulmão, hepático" },
  "honeycomb-cardiac":   { label: "Honeycomb Cardíaco",     icon: "⬡",   desc: "Hexagonal anisotrópico — patch cardíaco" },
  "fascicular":          { label: "Fascicular",             icon: "‖",   desc: "Feixes paralelos — nervo periférico" },
}

// ─── Props ──────────────────────────────────────────────────────────────

export interface TissueDesignerValue {
  profileId: string | null
  pattern: BiomimeticPattern | null
  // Parâmetros ajustáveis (com base no perfil mas modificáveis)
  poreSize?: number
  infillDensity?: number
  nozzleDiameter?: number
  printSpeed?: number
  pressure?: number
  layerHeight?: number
  bioinkConc?: number
  cellDensity?: number
}

export interface TissueDesignerProps {
  value: TissueDesignerValue
  onChange: (value: TissueDesignerValue) => void
  /** Indica se a biotinta tem células (para detect issues) */
  hasCells?: boolean
  className?: string
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════

export function TissueDesigner({ value, onChange, hasCells = true, className }: TissueDesignerProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["family", "porosity"]))

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const profile = value.profileId ? TISSUE_PROFILES[value.profileId] : null
  const profilesByFamily = useMemo(() => getProfilesByFamily(), [])

  // Score de biomimicidade live
  const biomimicResult = useMemo(() => {
    if (!profile) return null
    return calculateBiomimicScore(profile, {
      poreSize:       value.poreSize,
      infillDensity:  value.infillDensity,
      nozzleDiameter: value.nozzleDiameter,
      printSpeed:     value.printSpeed,
      pressure:       value.pressure,
      layerHeight:    value.layerHeight,
      bioinkConc:     value.bioinkConc,
      cellDensity:    value.cellDensity,
    })
  }, [profile, value])

  // Issues live
  const issues = useMemo(() => {
    if (!profile) return []
    return detectIssues(profile, {
      pressure:       value.pressure,
      printSpeed:     value.printSpeed,
      nozzleDiameter: value.nozzleDiameter,
      cellDensity:    value.cellDensity,
      hasCells,
    })
  }, [profile, value, hasCells])

  // ── Aplicar perfil completo (auto-fill) ──
  const applyProfile = useCallback((profileId: string) => {
    const p = TISSUE_PROFILES[profileId]
    if (!p) return
    onChange({
      profileId,
      pattern: p.defaultPattern,
      poreSize:       p.poreSize.optimal,
      infillDensity:  p.infillDensity.optimal,
      nozzleDiameter: p.nozzleDiameter.optimal,
      printSpeed:     p.printSpeed.optimal,
      pressure:       p.pressure.optimal,
      layerHeight:    p.layerHeight.optimal,
      bioinkConc:     p.bioinkConcentration.optimal,
      cellDensity:    p.cellDensity.optimal,
    })
  }, [onChange])

  return (
    <div className={cn("space-y-3", className)}>
      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  HEADER — Score live + perfil ativo                          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl bg-gradient-to-br from-quantis-purple-900/40 via-quantis-lilac-900/30 to-quantis-blue-900/40 border border-quantis-lilac-500/30 p-5 shadow-quantis-card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-quantis-lilac-500/30 to-quantis-purple-600/40 border border-quantis-lilac-400/50 flex items-center justify-center shrink-0 shadow-quantis-glow">
              <Sparkles className="w-6 h-6 text-quantis-lilac-200" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-white">Designer de Tecido Inteligente</h3>
              <p className="text-sm text-quantis-lilac-200/80 mt-0.5 leading-relaxed">
                Selecione o tipo de tecido e a BIA sugere automaticamente parâmetros validados por literatura científica.
              </p>
              {profile && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-quantis-purple-500/20 border border-quantis-purple-400/40">
                  <span className="text-lg">{profile.emoji}</span>
                  <span className="text-sm font-semibold text-quantis-lilac-100">{profile.label}</span>
                </div>
              )}
            </div>
          </div>

          {biomimicResult && (
            <BiomimicScoreCard score={biomimicResult.score} />
          )}
        </div>

        {/* Issues warning */}
        {issues.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {issues.map((issue, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-xl px-3 py-2 flex items-start gap-2 border text-sm",
                  issue.severity === "error" && "bg-quantis-wine-500/15 border-quantis-wine-400/40 text-quantis-wine-100",
                  issue.severity === "warning" && "bg-quantis-gold-500/10 border-quantis-gold-400/40 text-quantis-gold-100",
                  issue.severity === "info" && "bg-quantis-blue-500/10 border-quantis-blue-400/40 text-quantis-blue-100",
                )}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{issue.message}</div>
                  {issue.suggestion && (
                    <div className="text-xs opacity-90 mt-0.5">💡 {issue.suggestion}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  CAIXA 1 — Família mecânica & Tipo de tecido                 */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <ExpandableSection
        id="family"
        title="Família Mecânica & Tecido Alvo"
        subtitle={profile ? `${FAMILY_LABELS[profile.family].label} · ${profile.label}` : "Comece selecionando um tipo de tecido"}
        icon={<Microscope className="w-5 h-5" />}
        accent="purple"
        expanded={expandedSections.has("family")}
        onToggle={() => toggleSection("family")}
        badge={profile ? "✓" : undefined}
      >
        <div className="space-y-3">
          {(Object.keys(FAMILY_LABELS) as TissueFamily[]).map((family) => {
            const familyProfiles = profilesByFamily[family] ?? []
            if (familyProfiles.length === 0) return null

            return (
              <div key={family} className="rounded-xl bg-quantis-ink-900/40 border border-quantis-ink-700/50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{FAMILY_LABELS[family].icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-quantis-lilac-100">{FAMILY_LABELS[family].label}</div>
                    <div className="text-xs text-quantis-ink-200/70">{FAMILY_LABELS[family].description}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {familyProfiles.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => applyProfile(p.id)}
                      className={cn(
                        "text-left p-3 rounded-xl border transition-all",
                        value.profileId === p.id
                          ? "border-quantis-lilac-400/70 bg-quantis-lilac-500/15 ring-2 ring-quantis-lilac-400/30 shadow-quantis-glow"
                          : "border-quantis-ink-600/50 bg-quantis-ink-800/30 hover:border-quantis-lilac-400/40 hover:bg-quantis-lilac-500/8"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-2xl shrink-0">{p.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-white">{p.label}</div>
                          <div className="text-xs text-quantis-ink-200/80 mt-0.5 line-clamp-2 leading-snug">{p.description}</div>
                          <div className="text-[11px] text-quantis-gold-300/80 mt-1 font-mono">
                            Poro {p.poreSize.optimal}µm · {p.infillDensity.optimal}% infill
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </ExpandableSection>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  CAIXA 2 — Porosidade & Microestrutura                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {profile && (
        <ExpandableSection
          id="porosity"
          title="Porosidade & Microestrutura"
          subtitle={`Tamanho de poro alvo: ${value.poreSize ?? profile.poreSize.optimal}µm · porosidade ~${profile.porosity.optimal}%`}
          icon={<Layers className="w-5 h-5" />}
          accent="lilac"
          expanded={expandedSections.has("porosity")}
          onToggle={() => toggleSection("porosity")}
        >
          <div className="space-y-4">
            <ScientificRange
              label="Tamanho de poro"
              value={value.poreSize ?? profile.poreSize.optimal}
              min={profile.poreSize.min}
              max={profile.poreSize.max}
              optimal={profile.poreSize.optimal}
              unit="µm"
              onChange={(v) => onChange({ ...value, poreSize: v })}
              hint={
                profile.poreSize.optimal >= 300
                  ? "Poros grandes (>300µm) favorecem vascularização e migração celular."
                  : "Poros menores (<200µm) favorecem adesão celular e proliferação inicial."
              }
            />

            <ScientificRange
              label="Densidade de preenchimento"
              value={value.infillDensity ?? profile.infillDensity.optimal}
              min={profile.infillDensity.min}
              max={profile.infillDensity.max}
              optimal={profile.infillDensity.optimal}
              unit="%"
              onChange={(v) => onChange({ ...value, infillDensity: v })}
              hint={
                profile.family === "rigid" || profile.family === "connective-dense"
                  ? "Tecidos rígidos/densos exigem alta densidade (>50%) para sustentar carga."
                  : "Tecidos moles toleram baixa densidade (<40%) para difusão e celularização."
              }
            />

            <div className="rounded-xl bg-quantis-blue-500/8 border border-quantis-blue-400/30 p-3 text-xs">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-quantis-blue-300 shrink-0 mt-0.5" />
                <div className="text-quantis-blue-100/90 leading-relaxed">
                  <strong className="text-quantis-blue-200">Módulo elástico alvo:</strong> {profile.elasticModulus.min}–{profile.elasticModulus.max} {profile.elasticModulus.unit}
                  {profile.compressiveStrength && (
                    <span> · <strong>Resistência compressiva:</strong> {profile.compressiveStrength.min}–{profile.compressiveStrength.max} {profile.compressiveStrength.unit}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ExpandableSection>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  CAIXA 3 — Padrão biomimetico de preenchimento               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {profile && (
        <ExpandableSection
          id="pattern"
          title="Padrão Biomimetico"
          subtitle={value.pattern ? PATTERN_LABELS[value.pattern].label : "Selecione um padrão"}
          icon={<Activity className="w-5 h-5" />}
          accent="blue"
          expanded={expandedSections.has("pattern")}
          onToggle={() => toggleSection("pattern")}
        >
          <div className="space-y-3">
            <div className="text-xs text-quantis-ink-200/80">
              Padrões recomendados para <strong className="text-quantis-lilac-200">{profile.label}</strong>:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {profile.recommendedPatterns.map((pat) => {
                const info = PATTERN_LABELS[pat]
                const isDefault = pat === profile.defaultPattern
                const isSelected = value.pattern === pat
                return (
                  <button
                    key={pat}
                    onClick={() => onChange({ ...value, pattern: pat })}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all relative",
                      isSelected
                        ? "border-quantis-blue-400/70 bg-quantis-blue-500/15 ring-2 ring-quantis-blue-400/30"
                        : "border-quantis-ink-600/50 bg-quantis-ink-800/30 hover:border-quantis-blue-400/40 hover:bg-quantis-blue-500/8"
                    )}
                  >
                    {isDefault && (
                      <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded bg-quantis-gold-500/20 border border-quantis-gold-400/40 text-quantis-gold-200 font-bold uppercase tracking-wider">
                        Recomendado
                      </span>
                    )}
                    <div className="flex items-start gap-2">
                      <span className="text-2xl shrink-0 font-mono leading-none mt-0.5">{info.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white">{info.label}</div>
                        <div className="text-xs text-quantis-ink-200/80 mt-0.5 leading-snug">{info.desc}</div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Outros padrões (não recomendados, mas disponíveis) */}
            <details className="text-xs">
              <summary className="text-quantis-ink-200/60 cursor-pointer hover:text-quantis-lilac-200 transition-colors py-2">
                Mostrar todos os padrões disponíveis ({Object.keys(PATTERN_LABELS).length - profile.recommendedPatterns.length} adicionais)
              </summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {(Object.keys(PATTERN_LABELS) as BiomimeticPattern[])
                  .filter((p) => !profile.recommendedPatterns.includes(p))
                  .map((pat) => {
                    const info = PATTERN_LABELS[pat]
                    return (
                      <button
                        key={pat}
                        onClick={() => onChange({ ...value, pattern: pat })}
                        className={cn(
                          "p-2.5 rounded-lg border text-left transition-all opacity-70 hover:opacity-100",
                          value.pattern === pat
                            ? "border-quantis-lilac-400/50 bg-quantis-lilac-500/10"
                            : "border-quantis-ink-700/50 bg-quantis-ink-800/20 hover:border-quantis-lilac-400/30"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-mono">{info.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-quantis-ink-100">{info.label}</div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
              </div>
            </details>
          </div>
        </ExpandableSection>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  CAIXA 4 — Biotinta & Células                                */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {profile && (
        <ExpandableSection
          id="bioink"
          title="Biotinta & Células"
          subtitle={`${profile.recommendedBioinks[0]} · ${value.bioinkConc ?? profile.bioinkConcentration.optimal}% w/v`}
          icon={<Droplets className="w-5 h-5" />}
          accent="wine"
          expanded={expandedSections.has("bioink")}
          onToggle={() => toggleSection("bioink")}
        >
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-quantis-wine-200 mb-2 uppercase tracking-wider">Biotintas recomendadas</div>
              <div className="flex flex-wrap gap-1.5">
                {profile.recommendedBioinks.map((ink) => (
                  <span key={ink} className="text-xs px-2.5 py-1 rounded-full bg-quantis-wine-500/15 border border-quantis-wine-400/40 text-quantis-wine-100">
                    {ink}
                  </span>
                ))}
              </div>
            </div>

            <ScientificRange
              label="Concentração da biotinta"
              value={value.bioinkConc ?? profile.bioinkConcentration.optimal}
              min={profile.bioinkConcentration.min}
              max={profile.bioinkConcentration.max}
              optimal={profile.bioinkConcentration.optimal}
              unit="% w/v"
              step={0.5}
              onChange={(v) => onChange({ ...value, bioinkConc: v })}
              hint="Concentração alta = mais rigidez e printabilidade, mas reduz viabilidade celular."
              accent="wine"
            />

            <ScientificRange
              label="Densidade celular"
              value={value.cellDensity ?? profile.cellDensity.optimal}
              min={profile.cellDensity.min}
              max={profile.cellDensity.max}
              optimal={profile.cellDensity.optimal}
              unit="×10⁶/mL"
              step={0.5}
              onChange={(v) => onChange({ ...value, cellDensity: v })}
              hint={hasCells ? "Alta densidade favorece função tecidual; baixa favorece migração." : "Sem células (construto acelular)"}
              accent="wine"
              disabled={!hasCells}
            />

            <div>
              <div className="text-xs font-semibold text-quantis-wine-200 mb-2 uppercase tracking-wider">Tipos celulares</div>
              <div className="flex flex-wrap gap-1.5">
                {profile.recommendedCellTypes.map((cell) => (
                  <span key={cell} className="text-xs px-2.5 py-1 rounded-full bg-quantis-purple-500/15 border border-quantis-purple-400/40 text-quantis-purple-100">
                    {cell}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-quantis-gold-500/8 border border-quantis-gold-400/30 p-3 text-xs">
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-quantis-gold-300 shrink-0 mt-0.5" />
                <div className="text-quantis-gold-100/90 leading-relaxed">
                  <strong className="text-quantis-gold-200">Estratégia de crosslink:</strong> {profile.crosslinkStrategy}
                </div>
              </div>
            </div>
          </div>
        </ExpandableSection>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  CAIXA 5 — Parâmetros de impressão                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {profile && (
        <ExpandableSection
          id="print"
          title="Parâmetros de Impressão"
          subtitle={`Bico ${value.nozzleDiameter ?? profile.nozzleDiameter.optimal}µm · ${value.printSpeed ?? profile.printSpeed.optimal}mm/s · ${value.pressure ?? profile.pressure.optimal}kPa`}
          icon={<Beaker className="w-5 h-5" />}
          accent="gold"
          expanded={expandedSections.has("print")}
          onToggle={() => toggleSection("print")}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ScientificRange
              label="Diâmetro do bico"
              value={value.nozzleDiameter ?? profile.nozzleDiameter.optimal}
              min={profile.nozzleDiameter.min}
              max={profile.nozzleDiameter.max}
              optimal={profile.nozzleDiameter.optimal}
              unit="µm"
              step={50}
              onChange={(v) => onChange({ ...value, nozzleDiameter: v })}
              accent="gold"
            />
            <ScientificRange
              label="Velocidade"
              value={value.printSpeed ?? profile.printSpeed.optimal}
              min={profile.printSpeed.min}
              max={profile.printSpeed.max}
              optimal={profile.printSpeed.optimal}
              unit="mm/s"
              onChange={(v) => onChange({ ...value, printSpeed: v })}
              accent="gold"
            />
            <ScientificRange
              label="Pressão pneumática"
              value={value.pressure ?? profile.pressure.optimal}
              min={profile.pressure.min}
              max={profile.pressure.max}
              optimal={profile.pressure.optimal}
              unit="kPa"
              onChange={(v) => onChange({ ...value, pressure: v })}
              accent="gold"
            />
            <ScientificRange
              label="Altura de camada"
              value={value.layerHeight ?? profile.layerHeight.optimal}
              min={profile.layerHeight.min}
              max={profile.layerHeight.max}
              optimal={profile.layerHeight.optimal}
              unit="mm"
              step={0.05}
              onChange={(v) => onChange({ ...value, layerHeight: v })}
              accent="gold"
            />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <ThermStat label="Cartucho" value={profile.temperature.cartridgeC} unit="°C" />
            <ThermStat label="Cama" value={profile.temperature.bedC} unit="°C" />
            <ThermStat label="Câmara" value={profile.temperature.chamberC} unit="°C" />
          </div>
        </ExpandableSection>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  CAIXA 6 — Pós-impressão & Cultura                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {profile && (
        <ExpandableSection
          id="post"
          title="Pós-Impressão & Maturação"
          subtitle={`${profile.postProcessing.cultureDaysToMaturation ?? "—"} dias até maturação`}
          icon={<Thermometer className="w-5 h-5" />}
          accent="purple"
          expanded={expandedSections.has("post")}
          onToggle={() => toggleSection("post")}
        >
          <div className="space-y-3 text-sm">
            {profile.postProcessing.crosslinkTimeS && (
              <Field label="Tempo de crosslink" value={`${profile.postProcessing.crosslinkTimeS}s`} />
            )}
            {profile.postProcessing.crosslinkPowerMwCm2 && (
              <Field label="Potência UV (365nm)" value={`${profile.postProcessing.crosslinkPowerMwCm2} mW/cm²`} />
            )}
            {profile.postProcessing.cultureMedium && (
              <Field label="Meio de cultura" value={profile.postProcessing.cultureMedium} />
            )}
            {profile.postProcessing.cultureDaysToMaturation && (
              <Field label="Dias até maturação" value={`${profile.postProcessing.cultureDaysToMaturation} dias`} />
            )}
            {profile.postProcessing.bioreactorRequired && (
              <div className="rounded-xl bg-quantis-purple-500/10 border border-quantis-purple-400/40 p-3 text-xs text-quantis-purple-100 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-quantis-purple-300 shrink-0 mt-0.5" />
                <span>
                  <strong>Biorreator necessário</strong> — estimulação mecânica/perfusão obrigatória para maturação funcional.
                </span>
              </div>
            )}
          </div>
        </ExpandableSection>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  CAIXA 7 — Referências científicas                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {profile && (
        <ExpandableSection
          id="refs"
          title="Base Científica"
          subtitle={`${profile.references.length} referências bibliográficas`}
          icon={<BookOpen className="w-5 h-5" />}
          accent="ink"
          expanded={expandedSections.has("refs")}
          onToggle={() => toggleSection("refs")}
        >
          <div className="space-y-1.5">
            {profile.references.map((ref, i) => (
              <div key={i} className="text-xs text-quantis-ink-200/90 px-3 py-2 rounded-lg bg-quantis-ink-800/40 border border-quantis-ink-600/30 font-mono">
                [{i + 1}] {ref}
              </div>
            ))}
          </div>
        </ExpandableSection>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════

interface ExpandableSectionProps {
  id: string
  title: string
  subtitle?: string
  icon: React.ReactNode
  accent: "purple" | "lilac" | "blue" | "wine" | "gold" | "ink"
  expanded: boolean
  onToggle: () => void
  badge?: string
  children: React.ReactNode
}

function ExpandableSection({ title, subtitle, icon, accent, expanded, onToggle, badge, children }: ExpandableSectionProps) {
  const accentClasses = {
    purple: { bg: "from-quantis-purple-500/8 to-quantis-purple-700/4", border: "border-quantis-purple-500/30", iconBg: "bg-quantis-purple-500/20 border-quantis-purple-400/40", iconText: "text-quantis-purple-200" },
    lilac:  { bg: "from-quantis-lilac-500/8 to-quantis-lilac-700/4",   border: "border-quantis-lilac-500/30",  iconBg: "bg-quantis-lilac-500/20 border-quantis-lilac-400/40",   iconText: "text-quantis-lilac-200" },
    blue:   { bg: "from-quantis-blue-500/8 to-quantis-blue-700/4",     border: "border-quantis-blue-500/30",   iconBg: "bg-quantis-blue-500/20 border-quantis-blue-400/40",     iconText: "text-quantis-blue-200" },
    wine:   { bg: "from-quantis-wine-500/8 to-quantis-wine-700/4",     border: "border-quantis-wine-500/30",   iconBg: "bg-quantis-wine-500/20 border-quantis-wine-400/40",     iconText: "text-quantis-wine-200" },
    gold:   { bg: "from-quantis-gold-500/8 to-quantis-gold-700/4",     border: "border-quantis-gold-500/30",   iconBg: "bg-quantis-gold-500/20 border-quantis-gold-400/40",     iconText: "text-quantis-gold-200" },
    ink:    { bg: "from-quantis-ink-700/30 to-quantis-ink-800/20",     border: "border-quantis-ink-500/30",    iconBg: "bg-quantis-ink-600/30 border-quantis-ink-400/40",       iconText: "text-quantis-ink-100" },
  }[accent]

  return (
    <section
      className={cn(
        "rounded-2xl bg-gradient-to-br border transition-all overflow-hidden",
        accentClasses.bg,
        accentClasses.border,
        expanded && "shadow-quantis-card"
      )}
    >
      <button
        onClick={onToggle}
        className="w-full px-4 sm:px-5 py-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center shrink-0", accentClasses.iconBg)}>
          <div className={accentClasses.iconText}>{icon}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-white truncate">{title}</h4>
            {badge && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-quantis-gold-500/20 border border-quantis-gold-400/40 text-quantis-gold-200 font-bold">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <div className="text-sm text-quantis-ink-200/80 truncate mt-0.5">{subtitle}</div>}
        </div>
        {expanded ? <ChevronDown className="w-5 h-5 text-quantis-lilac-300 shrink-0" /> : <ChevronRight className="w-5 h-5 text-quantis-lilac-300 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-white/5">
          {children}
        </div>
      )}
    </section>
  )
}

interface ScientificRangeProps {
  label: string
  value: number
  min: number
  max: number
  optimal: number
  unit: string
  step?: number
  onChange: (v: number) => void
  hint?: string
  accent?: "purple" | "lilac" | "blue" | "wine" | "gold"
  disabled?: boolean
}

function ScientificRange({ label, value, min, max, optimal, unit, step = 1, onChange, hint, accent = "lilac", disabled = false }: ScientificRangeProps) {
  const inRange = value >= min && value <= max
  const pctOptimal = ((optimal - min) / (max - min)) * 100
  const pctValue = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))

  const accentBg = {
    purple: "bg-quantis-purple-500",
    lilac:  "bg-quantis-lilac-500",
    blue:   "bg-quantis-blue-500",
    wine:   "bg-quantis-wine-500",
    gold:   "bg-quantis-gold-500",
  }[accent]

  return (
    <div className={cn("space-y-1.5", disabled && "opacity-50 pointer-events-none")}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-quantis-lilac-100">{label}</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className="w-20 text-sm px-2 py-1 rounded-lg bg-quantis-ink-900/60 border border-quantis-ink-500/40 text-white font-mono text-right focus:outline-none focus:ring-2 focus:ring-quantis-lilac-400/50"
          />
          <span className="text-xs text-quantis-ink-200/70 font-mono w-12">{unit}</span>
        </div>
      </div>

      {/* Slider visual com marca de ótimo */}
      <div className="relative h-7 rounded-lg bg-quantis-ink-900/60 border border-quantis-ink-600/40 overflow-hidden">
        {/* Range válido (entre min e max) */}
        <div className="absolute inset-0 bg-gradient-to-r from-quantis-gold-500/10 via-quantis-gold-500/20 to-quantis-gold-500/10" />
        {/* Marca do ótimo */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-quantis-gold-300"
          style={{ left: `${pctOptimal}%` }}
          title={`Ótimo: ${optimal}${unit}`}
        />
        {/* Valor atual */}
        <div
          className={cn("absolute top-0 bottom-0 w-1.5 rounded-full transition-all", accentBg, !inRange && "bg-quantis-wine-500")}
          style={{ left: `calc(${pctValue}% - 3px)` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={disabled}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-quantis-ink-200/60 font-mono">
        <span>min {min}</span>
        <span className="text-quantis-gold-300">★ ótimo {optimal}</span>
        <span>max {max}</span>
      </div>

      {hint && (
        <p className="text-xs text-quantis-ink-200/70 leading-relaxed flex items-start gap-1.5 mt-1">
          <Info className="w-3 h-3 shrink-0 mt-0.5 text-quantis-lilac-300/70" />
          <span>{hint}</span>
        </p>
      )}
    </div>
  )
}

function BiomimicScoreCard({ score }: { score: number }) {
  const tone =
    score >= 80 ? "emerald" :
    score >= 60 ? "gold" :
    score >= 40 ? "wine" : "wine"

  const colors = {
    emerald: { ring: "ring-emerald-400/50", text: "text-emerald-300", bg: "from-emerald-500/20 to-emerald-700/10", label: "Excelente" },
    gold:    { ring: "ring-quantis-gold-400/50", text: "text-quantis-gold-300", bg: "from-quantis-gold-500/20 to-quantis-gold-700/10", label: "Bom" },
    wine:    { ring: "ring-quantis-wine-400/50", text: "text-quantis-wine-300", bg: "from-quantis-wine-500/20 to-quantis-wine-700/10", label: "Ajustar" },
  }[tone]

  return (
    <div className={cn(
      "shrink-0 w-32 rounded-2xl bg-gradient-to-br p-3 ring-2 border border-white/5",
      colors.bg,
      colors.ring
    )}>
      <div className="text-[10px] uppercase tracking-wider text-quantis-ink-200/80 font-bold">Biomimicidade</div>
      <div className={cn("text-3xl font-black mt-0.5 tabular-nums", colors.text)}>{score}<span className="text-base">%</span></div>
      <div className={cn("text-xs font-semibold mt-0.5", colors.text)}>{colors.label}</div>
    </div>
  )
}

function ThermStat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-xl bg-quantis-ink-800/50 border border-quantis-ink-600/40 p-2.5 text-center">
      <div className="text-[10px] text-quantis-ink-200/70 uppercase tracking-wider font-semibold">{label}</div>
      <div className="text-lg font-bold text-quantis-gold-200 tabular-nums">{value}<span className="text-xs ml-0.5">{unit}</span></div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-quantis-ink-700/30 last:border-0">
      <span className="text-quantis-ink-200/80">{label}</span>
      <span className="text-quantis-lilac-100 font-medium text-right">{value}</span>
    </div>
  )
}
