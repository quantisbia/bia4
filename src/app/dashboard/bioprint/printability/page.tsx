"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA — PRÉ-ETAPA · Testes de Imprimibilidade da Biotinta (R12.43)
 *  ───────────────────────────────────────────────────────────────────────
 *  Página DEDICADA, fora do fluxo grande de 5 etapas. Permite que o
 *  usuário teste o hidrogel ANTES de começar uma bioimpressão completa.
 *
 *  Objetivo: validar a biotinta com testes científicos consagrados
 *  (Ouyang 2016 Pf, Therriault 2018, Schwab 2020) gerando STL + G-code
 *  prontos para impressão direta — sem precisar configurar modelo,
 *  biotinta, fatiamento, etc. no fluxo robusto.
 *
 *  8 testes disponíveis:
 *    1. Linha (Line Test)          — calibração diâmetro bico
 *    2. Grade Pf (Ouyang 2016)     — métrica universal Pf=P²/(16A)
 *    3. Ponte de Colapso           — vão máximo sem suporte
 *    4. Estrela de Overhang        — anisotropia 360°
 *    5. Torre de Empilhamento      — altura máxima
 *    6. Escada Z                   — resolução vertical
 *    7. Leque de Ângulos           — overhang crítico
 *    8. Fidelidade da Biotinta     — mesh exato 15.4×15.4×0.8 mm
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import {
  Beaker, FlaskConical, ShieldCheck, Download, Loader2, Info,
  CheckCircle2, ArrowRight, Camera, Microscope, Ruler, BookOpen,
  Sparkles, AlertCircle, ChevronRight, Layers, Zap, FileCode2,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import {
  generateGeometry, downloadSTL, type GeometryParams, type Triangle,
} from "@/lib/stl/generator"
import {
  BIOMIMETIC_GEOMETRIES, type BiomimeticGeometry,
} from "@/lib/stl/biomimetic-tissues"

// ─── Catálogo de testes (só category=printability_test) ────────────────────
const PRINTABILITY_TESTS: BiomimeticGeometry[] = BIOMIMETIC_GEOMETRIES.filter(
  (g) => g.category === "printability_test"
)

// Ícones por teste (mais bonitos que os emoji originais)
const TEST_ICON_MAP: Record<string, string> = {
  test_line:                "➖",
  test_grid:                "▦",
  test_collapse_bridge:     "🌉",
  test_star:                "✱",
  test_stacking_tower:      "🗼",
  test_z_staircase:         "🪜",
  test_angle_fan:           "📐",
  test_fidelity_biotinta:   "⬡",
}

// Ordem didática (mais simples → mais complexo)
const TEST_ORDER = [
  "test_line",
  "test_grid",
  "test_collapse_bridge",
  "test_stacking_tower",
  "test_z_staircase",
  "test_angle_fan",
  "test_star",
  "test_fidelity_biotinta",
]

const ORDERED_TESTS = TEST_ORDER
  .map((id) => PRINTABILITY_TESTS.find((t) => t.id === id))
  .filter((t): t is BiomimeticGeometry => t !== undefined)

// ─── Dificuldade visual ───────────────────────────────────────────────────
const TEST_DIFFICULTY: Record<string, { label: string; color: string }> = {
  test_line:              { label: "Iniciante",   color: "emerald" },
  test_grid:              { label: "Padrão-ouro", color: "amber"   },
  test_collapse_bridge:   { label: "Intermediário", color: "cyan"  },
  test_stacking_tower:    { label: "Intermediário", color: "cyan"  },
  test_z_staircase:       { label: "Intermediário", color: "cyan"  },
  test_angle_fan:         { label: "Avançado",    color: "violet"  },
  test_star:              { label: "Avançado",    color: "violet"  },
  test_fidelity_biotinta: { label: "Especialista", color: "rose"   },
}

const DIFFICULTY_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-500/15 border-emerald-500/40 text-emerald-200",
  amber:   "bg-amber-500/15 border-amber-500/40 text-amber-200",
  cyan:    "bg-cyan-500/15 border-cyan-500/40 text-cyan-200",
  violet:  "bg-violet-500/15 border-violet-500/40 text-violet-200",
  rose:    "bg-rose-500/15 border-rose-500/40 text-rose-200",
}

export default function PrintabilityTestsPage() {
  const [selectedId, setSelectedId] = useState<string>("test_grid") // default: Pf (mais útil)
  const [params, setParams] = useState<GeometryParams>(() => {
    const def = ORDERED_TESTS.find((t) => t.id === "test_grid")
    return { ...(def?.defaultParams || {}) } as GeometryParams
  })
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [triCount, setTriCount] = useState<number>(0)
  const [cachedTris, setCachedTris] = useState<Triangle[]>([])

  const selected = useMemo(
    () => ORDERED_TESTS.find((t) => t.id === selectedId),
    [selectedId]
  )

  const handleSelectTest = (id: string) => {
    const t = ORDERED_TESTS.find((x) => x.id === id)
    if (!t) return
    setSelectedId(id)
    setParams({ ...(t.defaultParams || {}) } as GeometryParams)
    setGenerated(false)
    setTriCount(0)
    setCachedTris([])
  }

  const handleParamChange = (key: string, val: number) => {
    setParams((prev) => ({ ...prev, [key]: val }))
    setGenerated(false)
    setCachedTris([])
  }

  const handleGenerate = useCallback(() => {
    if (!selected) return
    setGenerating(true)
    setTimeout(() => {
      try {
        const tris = generateGeometry(selected.id, params)
        setCachedTris(tris)
        setTriCount(tris.length)
        setGenerated(true)
      } catch (e) {
        console.error("[BIA printability] erro gerando STL:", e)
      }
      setGenerating(false)
    }, 80)
  }, [selected, params])

  const handleDownloadSTL = () => {
    if (!selected || cachedTris.length === 0) return
    const fname = `BIA_${selected.id}_${Date.now()}.stl`
    downloadSTL(cachedTris, fname, true)
  }

  // URL com prefill para a página /slice (G-code rápido)
  const sliceURLWithPrefill = useMemo(() => {
    if (!selected) return "/dashboard/bioprint/slice"
    // Passa o geometry id na query string. /slice já lê isso na próxima sessão.
    const qs = new URLSearchParams({
      geometry: selected.id,
      ...Object.fromEntries(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ),
    })
    return `/dashboard/bioprint/slice?${qs.toString()}`
  }, [selected, params])

  const difficulty = selected ? TEST_DIFFICULTY[selected.id] : null
  const diffClass = difficulty ? DIFFICULTY_CLASSES[difficulty.color] : ""

  return (
    <div className="bia-printability-page space-y-6 max-w-7xl mx-auto">
      {/* ─── Banner explicativo ─────────────────────────────────────── */}
      <section className="rounded-2xl bg-gradient-to-br from-amber-500/[0.10] via-emerald-500/[0.06] to-cyan-500/[0.08] border border-amber-500/30 p-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-amber-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] uppercase tracking-[0.2em] text-amber-300/90 font-semibold">
                Pré-etapa · R12.43
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 font-semibold uppercase tracking-wider">
                Standalone
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 font-semibold uppercase tracking-wider">
                Sem 5 etapas
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-bold text-white mb-1.5">
              Testes de imprimibilidade da biotinta
            </h1>
            <p className="text-xs text-gray-300 leading-relaxed">
              <strong className="text-amber-200">Comece por aqui antes de bioimprimir um constructo.</strong> 8 testes
              científicos validados (Ouyang 2016, Therriault 2018, Schwab 2020) para qualificar o seu hidrogel:
              calibrar diâmetro real do bico, medir o índice <em>Pf</em>, encontrar o vão máximo sem colapso,
              determinar o ângulo crítico de overhang. Cada teste vem com{" "}
              <strong className="text-emerald-200">protocolo de análise</strong> (fotos, ImageJ, paquímetro).
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
              <span className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-200">
                🧪 Sem precisar configurar modelo / biotinta / slicer
              </span>
              <span className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
                📥 STL pronto em 1 clique
              </span>
              <span className="px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-200">
                ⚡ G-code rápido (prefill no /slice)
              </span>
              <span className="px-2 py-1 rounded bg-violet-500/10 border border-violet-500/30 text-violet-200">
                🔬 Protocolo de análise junto
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Recomendação de fluxo ──────────────────────────────────── */}
      <section className="rounded-2xl bg-violet-500/[0.06] border border-violet-500/25 p-4">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-violet-300 shrink-0 mt-0.5" />
          <div className="flex-1 text-[11.5px] text-gray-300 leading-relaxed">
            <strong className="text-violet-200">Fluxo recomendado:</strong>
            {" "}
            <span className="inline-flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-[10px] font-mono">1</span>
              Teste de Linha
            </span>
            {" → "}
            <span className="inline-flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[10px] font-mono">2</span>
              Grade Pf
            </span>
            {" → "}
            <span className="inline-flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 text-[10px] font-mono">3</span>
              Torre + Escada Z
            </span>
            {" → "}
            <span className="inline-flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-violet-500/15 border border-violet-500/30 text-violet-200 text-[10px] font-mono">4</span>
              Ponte / Leque / Estrela
            </span>
            {" → "}
            <span className="inline-flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-200 text-[10px] font-mono">5</span>
              Fidelidade
            </span>
            . Aprovou? Vá para o <Link href="/dashboard/bioprint" className="text-violet-300 hover:text-violet-200 underline">processo completo de bioimpressão</Link>.
          </div>
        </div>
      </section>

      {/* ─── Grid principal ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
        {/* ── Coluna A: lista de testes ────────────────────────────── */}
        <aside className="space-y-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-semibold px-1 mb-2 flex items-center gap-1.5">
            <FlaskConical className="w-3 h-3" />
            Escolha o teste ({ORDERED_TESTS.length})
          </div>
          {ORDERED_TESTS.map((test, idx) => {
            const isActive = test.id === selectedId
            const d = TEST_DIFFICULTY[test.id]
            const dCls = DIFFICULTY_CLASSES[d?.color || "cyan"]
            return (
              <button
                key={test.id}
                onClick={() => handleSelectTest(test.id)}
                className={cn(
                  "w-full text-left rounded-xl p-3 border transition-all",
                  isActive
                    ? "bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30"
                    : "bg-white/[0.02] border-white/10 hover:bg-white/[0.04] hover:border-white/20"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div className="text-2xl shrink-0 leading-none mt-0.5">
                    {TEST_ICON_MAP[test.id] || "🧪"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className="text-[9.5px] text-gray-500 font-mono">
                        #{idx + 1}
                      </span>
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wider",
                        dCls
                      )}>
                        {d?.label}
                      </span>
                    </div>
                    <div className={cn(
                      "text-xs font-semibold leading-tight",
                      isActive ? "text-amber-100" : "text-white"
                    )}>
                      {test.label}
                    </div>
                    <div className="text-[10.5px] text-gray-400 mt-1 leading-snug line-clamp-2">
                      {test.description}
                    </div>
                  </div>
                  {isActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-1" />
                  )}
                </div>
              </button>
            )
          })}
        </aside>

        {/* ── Coluna B: painel do teste selecionado ────────────────── */}
        <main className="space-y-4 min-w-0">
          {!selected && (
            <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-8 text-center">
              <p className="text-sm text-gray-400">Selecione um teste à esquerda.</p>
            </div>
          )}

          {selected && (
            <>
              {/* Header do teste */}
              <section className="rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 p-5">
                <div className="flex items-start gap-4 mb-3">
                  <div className="text-5xl leading-none shrink-0">
                    {TEST_ICON_MAP[selected.id] || "🧪"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {difficulty && (
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider",
                          diffClass
                        )}>
                          {difficulty.label}
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300">
                        {selected.tissue}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        Custo: {selected.creditCost} créditos
                      </span>
                    </div>
                    <h2 className="text-base md:text-lg font-bold text-white">
                      {selected.label}
                    </h2>
                    <p className="text-[12px] text-gray-300 mt-1.5 leading-relaxed">
                      {selected.description}
                    </p>
                  </div>
                </div>

                {/* Aplicação */}
                <div className="mt-3 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20">
                  <div className="text-[10px] uppercase tracking-wider text-emerald-300/90 font-semibold mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    Para que serve
                  </div>
                  <p className="text-[11.5px] text-gray-200 leading-relaxed">
                    {selected.application}
                  </p>
                </div>
              </section>

              {/* Parâmetros (se houver) */}
              {Object.keys(selected.paramLabels || {}).length > 0 && (
                <section className="rounded-2xl bg-white/[0.02] border border-white/10 p-5">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-semibold mb-3 flex items-center gap-1.5">
                    <Layers className="w-3 h-3" />
                    Parâmetros
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(selected.paramLabels).map(([key, label]) => {
                      const currentVal = Number(
                        (params as Record<string, unknown>)[key] ?? 0
                      )
                      return (
                        <label key={key} className="block">
                          <div className="text-[10.5px] text-gray-400 mb-1">
                            {label}
                          </div>
                          <input
                            type="number"
                            value={currentVal}
                            onChange={(e) => handleParamChange(key, Number(e.target.value))}
                            step="0.5"
                            min="0"
                            className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 focus:border-amber-500/50 focus:bg-white/[0.06] text-white text-sm outline-none transition-colors"
                          />
                        </label>
                      )
                    })}
                  </div>
                </section>
              )}

              {Object.keys(selected.paramLabels || {}).length === 0 && (
                <section className="rounded-2xl bg-rose-500/[0.05] border border-rose-500/20 p-3 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                  <p className="text-[11px] text-rose-100/90">
                    <strong>Dimensões travadas</strong> — este teste usa mesh exato (sem ajustes) para garantir comparabilidade entre laboratórios.
                  </p>
                </section>
              )}

              {/* Botões de ação */}
              <section className="rounded-2xl bg-white/[0.02] border border-white/10 p-5 space-y-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-semibold flex items-center gap-1.5">
                  <Zap className="w-3 h-3" />
                  Ações
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2",
                    generating
                      ? "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
                      : "bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-100"
                  )}
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gerando STL…
                    </>
                  ) : (
                    <>
                      <Beaker className="w-4 h-4" />
                      {generated ? "Gerar novamente" : "Gerar STL do teste"}
                    </>
                  )}
                </button>

                {generated && (
                  <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/30 p-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    <div className="flex-1 text-[11px] text-emerald-100">
                      <strong>STL pronto.</strong> {triCount.toLocaleString("pt-BR")} triângulos.
                    </div>
                  </div>
                )}

                {generated && cachedTris.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={handleDownloadSTL}
                      className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar STL (binário)
                    </button>
                    <Link
                      href={sliceURLWithPrefill}
                      className="px-3 py-2 rounded-xl bg-violet-500/15 border border-violet-500/40 hover:bg-violet-500/25 text-violet-100 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <FileCode2 className="w-3.5 h-3.5" />
                      Gerar G-code rápido
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}

                {generated && (
                  <Link
                    href="/dashboard/bioprint/execute"
                    className="block px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/25 text-emerald-100 text-xs font-semibold transition-colors text-center flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Imprimir agora (USB / Web Serial)
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </section>

              {/* Racional científico */}
              {selected.rationale && (
                <section className="rounded-2xl bg-cyan-500/[0.04] border border-cyan-500/20 p-5">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/90 font-semibold mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3" />
                    Racional científico
                  </div>
                  <p className="text-[11.5px] text-gray-200 leading-relaxed">
                    {selected.rationale}
                  </p>
                </section>
              )}

              {/* Protocolo de análise */}
              {selected.analysisProtocol && (
                <section className="rounded-2xl bg-violet-500/[0.05] border border-violet-500/25 p-5">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-violet-300/90 font-semibold mb-2 flex items-center gap-1.5">
                    <Microscope className="w-3 h-3" />
                    Como analisar o resultado
                  </div>
                  <p className="text-[11.5px] text-gray-200 leading-relaxed">
                    {selected.analysisProtocol}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-300 inline-flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      Foto top-down/lateral
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-300 inline-flex items-center gap-1">
                      <Ruler className="w-3 h-3" />
                      Régua/paquímetro
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-300 inline-flex items-center gap-1">
                      <Microscope className="w-3 h-3" />
                      ImageJ (free)
                    </span>
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>

      {/* ─── Rodapé com link para fluxo grande ──────────────────────── */}
      <section className="rounded-2xl bg-gradient-to-br from-emerald-500/[0.06] via-cyan-500/[0.04] to-violet-500/[0.06] border border-emerald-500/25 p-5">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white mb-1">
              Biotinta aprovada nos testes? Próximo passo:
            </h3>
            <p className="text-[11.5px] text-gray-300 leading-relaxed">
              Vá para o <strong className="text-emerald-200">processo completo de bioimpressão</strong> em 5 etapas: modelo 3D do tecido → biotinta otimizada → fatiamento G-code → execução → pós-bioimpressão.
            </p>
          </div>
          <Link
            href="/dashboard/bioprint"
            className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400 hover:bg-emerald-500/30 text-emerald-100 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            Ir para bioimpressão completa
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>
    </div>
  )
}
