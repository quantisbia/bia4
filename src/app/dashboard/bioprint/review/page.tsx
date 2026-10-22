"use client"

/**
 * BIA — Fase 5 / 6 · Análise da bioimpressão (R24)
 *
 * Fecha o laço entre a Fase 4 (Host) e a próxima impressão:
 *  - registrar uma análise (nota 1–5 + relato livre) da impressão que acabou
 *    de sair da bioimpressora — reutiliza o PrintFeedbackModal;
 *  - ver o histórico de análises com os sintomas interpretados e os ajustes
 *    que a BIA vai aplicar no próximo G-code da Fase 3;
 *  - ver o histórico estruturado de resultados (learning-store: qualidade,
 *    issues marcadas, notas);
 *  - decidir: repetir na Fase 3 (com os ajustes aprendidos) ou seguir para a
 *    Fase 6 (maturação & caracterizações).
 *
 * Esta fase NÃO tem estado próprio no BioprintProcessState: ela lê o laço
 * fechado (print-feedback, localStorage) e o learning-store (IndexedDB).
 */

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ClipboardCheck, Star, ArrowRight, ArrowLeft, Layers, Beaker, RotateCcw,
  Sparkles, Trash2, Info, Gamepad2,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { useBioprintProcess, STEP_ROUTES } from "@/lib/bioprint/process-context"
import {
  listFeedback, clearFeedback, pendingAdjustments, RATING_LABELS,
  type PrintFeedback, type LearnedAdjustment,
} from "@/lib/bioprint/print-feedback"
import {
  listAllResults, QUALITY_LABELS, ISSUE_LABELS, type PrintResult,
} from "@/lib/bioprint/learning-store"
import { inferTissueFromGeometry, type PresetParams } from "@/lib/bioprint/tissue-presets"
import { PrintFeedbackModal } from "@/components/bioprint/PrintFeedbackModal"

const TARGET_LABEL: Record<LearnedAdjustment["target"], string> = {
  flowMultiplier: "fluxo",
  speedPerimeter_mms: "velocidade",
  layerHeight_mm: "altura de camada",
  firstLayerHeight_mm: "1ª camada",
  retractVolume_uL: "retração",
  primeVolume_uL: "prime",
  wallCount: "paredes",
  infillDensity: "densidade de infill",
  zHop_mm: "z-hop",
  cartridgeTemp_C: "temperatura do cartucho",
  originCheck: "ponto zero",
  skirtLoops: "saia",
}

function fmtAdjustment(a: LearnedAdjustment): string {
  const name = TARGET_LABEL[a.target] ?? a.target
  if (a.target === "originCheck") return `${name}: reforçar G92 + pré-voo`
  if (a.op === "mul") return `${name} × ${a.value.toFixed(2)}`
  if (a.op === "add") return `${name} ${a.value >= 0 ? "+" : ""}${a.value}`
  return `${name} = ${a.value}`
}

function fmtDate(ts: number) {
  try { return new Date(ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) } catch { return String(ts) }
}

export default function ReviewPage() {
  const { state } = useBioprintProcess()
  const [feedback, setFeedback] = useState<PrintFeedback[]>([])
  const [results, setResults] = useState<PrintResult[]>([])
  const [modalOpen, setModalOpen] = useState(false)

  const reload = useCallback(() => {
    setFeedback(listFeedback().slice().sort((a, b) => b.createdAt - a.createdAt))
    listAllResults().then((r) => setResults(r.slice().sort((a, b) => b.createdAt - a.createdAt))).catch(() => setResults([]))
  }, [])
  useEffect(() => { reload() }, [reload])

  // Contexto da impressão atual (para o modal e para "o que vai mudar")
  const materialId = state.bioink.material ?? null
  const geometryId = state.model.geometryId ?? null
  const [pending, setPending] = useState<ReturnType<typeof pendingAdjustments>>({ feedback: null, adjustments: [] })
  useEffect(() => { setPending(pendingAdjustments({ materialId, geometryId })) }, [materialId, geometryId, feedback])

  const tissueId = useMemo(() => inferTissueFromGeometry(geometryId) ?? "membrana", [geometryId])
  const bioinkId = useMemo(() => {
    const first = state.bioink.formulations?.[0]
    if (first?.materialId) return first.materialId
    const mat = (state.bioink.material ?? "").toLowerCase()
    if (mat.includes("gelma")) return "gelma"
    return "alginate"
  }, [state.bioink])
  const params = useMemo<PresetParams>(() => {
    const s = state.slice
    return {
      layerHeightMm: s.layerHeightMm ?? 0.25,
      printSpeedMmS: s.printSpeedMmS ?? 8,
      pressureKPa: s.pressureKPa ?? 80,
      flowPercent: Math.round((s.extrusionMultiplier ?? 1.0) * 100),
      infillPercent: s.infillPercent ?? 30,
      infillPatternId: s.infillPatternId ?? "classic-lines",
      walls: 2,
      skirtLoops: s.skirtLoops ?? 2,
      retractionMm: s.retractionMm ?? 0,
      cartridgeTempC: s.cartridgeTempC ?? 25,
      bedTempC: s.bedTempC ?? 20,
      chamberTempC: s.chamberTempC ?? null,
      perimeterOnly: s.perimeterOnly ?? false,
    }
  }, [state.slice])

  const stats = useMemo(() => {
    const n = feedback.length
    const avg = n ? feedback.reduce((a, f) => a + f.rating, 0) / n : 0
    const good = feedback.filter((f) => f.rating >= 4).length
    return { n, avg, good }
  }, [feedback])

  const printed = state.control.status === "ready"

  return (
    <div className="bia-review-page space-y-6">
      {/* Cabeçalho */}
      <header className="rounded-2xl bg-gradient-to-br from-sky-500/10 via-violet-500/5 to-transparent border border-sky-500/25 p-5">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-5 h-5 text-sky-300" />
          </div>
          <div className="flex-1 min-w-[240px]">
            <div className="text-[10px] uppercase tracking-wider text-sky-300/80 font-semibold">
              Fase 5 / 6 · Bioimpressão
            </div>
            <h1 className="text-lg font-bold text-white">Análise da bioimpressão — o laço fechado</h1>
            <p className="text-xs text-gray-300 mt-1 leading-relaxed max-w-3xl">
              Olhe para o que saiu da bioimpressora e conte para a BIA: nota de 1 a 5 e um relato livre
              (“fios entre as paredes”, “a primeira camada descolou”, “ficou borrado”…). A BIA interpreta
              os sintomas, decide ajustes explicáveis (fluxo, velocidade, camada, retração, paredes, infill,
              ponto zero) e aplica no <strong className="text-violet-200">próximo G-code da Fase 3</strong>.
              Se ficou bom, siga para a <strong className="text-rose-200">Fase 6 · Maturação</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-sky-500/20 border border-sky-400 hover:bg-sky-500/30 text-sky-100 text-xs font-semibold flex items-center gap-1.5"
          >
            <Star className="w-3.5 h-3.5" /> Registrar análise desta impressão
          </button>
        </div>

        {!printed && (
          <div className="mt-3 text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 shrink-0" />
            Você ainda não concluiu uma bioimpressão nesta sessão. Pode registrar análises de impressões
            anteriores mesmo assim, ou ir para a{" "}
            <Link href={STEP_ROUTES.control} className="underline text-amber-100">Fase 4 · Host</Link>.
          </div>
        )}
      </header>

      {/* Resumo + o que vai mudar */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-4">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Histórico</div>
          <div className="flex items-end gap-4">
            <div>
              <div className="text-2xl font-bold text-white">{stats.n}</div>
              <div className="text-[10px] text-gray-400">análises</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.n ? stats.avg.toFixed(1) : "–"}</div>
              <div className="text-[10px] text-gray-400">nota média</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-200">{stats.good}</div>
              <div className="text-[10px] text-gray-400">boas (4–5 ★)</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl bg-violet-500/5 border border-violet-500/25 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-violet-300" />
            <div className="text-[10px] uppercase tracking-wider text-violet-200/90 font-semibold">
              No próximo G-code (Fase 3) a BIA vai…
            </div>
          </div>
          {pending.adjustments.length === 0 ? (
            <p className="text-xs text-gray-400">
              Nenhum ajuste pendente para {materialId ? <>a biotinta <strong className="text-gray-200">{materialId}</strong></> : "este contexto"}.
              Registre uma análise com nota ≤ 3 e um relato para a BIA aprender.
            </p>
          ) : (
            <ul className="space-y-1">
              {pending.adjustments.map((a, i) => (
                <li key={i} className="text-xs text-gray-200 flex items-start gap-2">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-violet-300 shrink-0" />
                  <span><strong className="text-violet-100">{fmtAdjustment(a)}</strong> — {a.reason} <span className="text-gray-500">({a.symptom})</span></span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={STEP_ROUTES.slice}
              className="px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-400/60 hover:bg-violet-500/30 text-violet-100 text-[11px] font-semibold flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" /> Repetir na Fase 3 com os ajustes
            </Link>
            <Link
              href={STEP_ROUTES.postBio}
              className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-400/50 hover:bg-rose-500/25 text-rose-100 text-[11px] font-semibold flex items-center gap-1.5"
            >
              <Beaker className="w-3 h-3" /> Ficou bom — ir para a Fase 6 · Maturação
            </Link>
          </div>
        </div>
      </section>

      {/* Lista de análises (laço fechado) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Star className="w-4 h-4 text-sky-300" /> Análises (nota + relato → ajustes)
          </h2>
          {feedback.length > 0 && (
            <button
              type="button"
              onClick={() => { if (confirm("Apagar todas as análises salvas neste navegador?")) { clearFeedback(); reload() } }}
              className="text-[10px] text-rose-300 hover:text-rose-200 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Limpar histórico
            </button>
          )}
        </div>

        {feedback.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-gray-500">
            Nenhuma análise ainda. Ao terminar uma impressão na Fase 4 o modal abre sozinho — ou clique em
            “Registrar análise desta impressão”.
          </div>
        ) : (
          <ul className="space-y-2">
            {feedback.map((f) => (
              <li key={f.id} className="rounded-2xl bg-white/[0.02] border border-white/10 p-4">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex items-center gap-0.5 shrink-0">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={cn("w-3.5 h-3.5", n <= f.rating ? "text-amber-300 fill-amber-300" : "text-gray-600")} />
                    ))}
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="text-xs font-semibold text-white">{RATING_LABELS[f.rating]}</div>
                    {f.text && <p className="text-xs text-gray-300 mt-0.5 whitespace-pre-wrap">“{f.text}”</p>}
                    <div className="text-[10px] text-gray-500 mt-1">
                      {fmtDate(f.createdAt)}
                      {f.materialId ? ` · ${f.materialId}` : ""}
                      {f.geometryId ? ` · ${f.geometryId}` : ""}
                      {f.profileId ? ` · perfil ${f.profileId}` : ""}
                      {f.params ? ` · fluxo ${f.params.flow ?? "–"} · ${f.params.speed ?? "–"} mm/s · camada ${f.params.layer ?? "–"} mm` : ""}
                    </div>
                  </div>
                </div>
                {f.adjustments.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/5">
                    <div className="text-[10px] uppercase tracking-wider text-violet-300/80 mb-1">Ajustes derivados</div>
                    <div className="flex flex-wrap gap-1.5">
                      {f.adjustments.map((a, i) => (
                        <span key={i} title={`${a.reason} (${a.symptom})`} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-100">
                          {fmtAdjustment(a)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Resultados estruturados (learning-store) */}
      {results.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-300" /> Resultados registrados (qualidade + issues)
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {results.slice(0, 20).map((r) => {
              const q = QUALITY_LABELS[r.quality]
              return (
                <li key={r.id} className="rounded-xl bg-white/[0.02] border border-white/10 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-xs font-semibold", q.color === "emerald" ? "text-emerald-200" : q.color === "amber" ? "text-amber-200" : "text-rose-200")}>
                      {q.emoji} {q.label}
                    </span>
                    <span className="text-[10px] text-gray-500">{fmtDate(r.createdAt)}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {r.tissueId} · {r.bioinkId} · {r.geometryId} · {r.params.layerHeightMm} mm · {r.params.printSpeedMmS} mm/s · fluxo {r.params.flowPercent}%
                  </div>
                  {r.issues.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {r.issues.map((i) => (
                        <span key={i} className="text-[9.5px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300">{ISSUE_LABELS[i]}</span>
                      ))}
                    </div>
                  )}
                  {r.notes && <p className="text-[11px] text-gray-300 mt-1">“{r.notes}”</p>}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Navegação */}
      <nav className="flex items-center justify-between flex-wrap gap-2 pt-2">
        <Link href={STEP_ROUTES.control} className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> <Gamepad2 className="w-3.5 h-3.5" /> Fase 4 · Bioimpressão (Host)
        </Link>
        <Link href={STEP_ROUTES.postBio} className="text-xs text-rose-200 hover:text-white flex items-center gap-1.5">
          Fase 6 · Maturação & caracterizações <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </nav>

      <PrintFeedbackModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); reload() }}
        tissueId={tissueId}
        bioinkId={bioinkId}
        geometryId={geometryId}
        params={params}
        materialId={materialId}
        onSaved={() => reload()}
      />
    </div>
  )
}
