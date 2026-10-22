"use client"

/**
 * BIA v4 · R24 · Fase 1 / 6 — Modelo de tecido (o QUÊ)
 * ─────────────────────────────────────────────────────────────────────
 * Aqui NÃO há STL. A usuária define o tecido, a aplicação, a dimensão-alvo
 * e se vai com células. Recomendação da BIA o modelo da Fase 3 (biblioteca
 * anatômica real / primitiva), a biotinta validada da Fase 2, o infill
 * honesto e o alvo. Um só lugar de malhas 3D: a Fase 3 (BioSlicer).
 *
 * Legado (upload/catálogo paramétrico/IA) foi movido para _legacy e
 * continua acessível pela Fase 3 como "Malhas salvas" / "Catálogo".
 */

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, CheckCircle2, Info, Microscope, Ruler, Sparkles, Target as TargetIcon } from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { useBioprintProcess } from "@/lib/bioprint/process-context"
import { TISSUES, getTissue, fase3HrefFor } from "@/lib/bioprint/tissue-brief"

export default function TissueModelPage() {
  const { state, updateModel } = useBioprintProcess()
  const saved = state.model.brief ?? null
  const [tissueId, setTissueId] = useState<string>(saved?.tissue ?? "cartilagem")
  const t = useMemo(() => getTissue(tissueId) ?? TISSUES[0], [tissueId])
  const [application, setApplication] = useState<string>(saved?.application ?? t.applications[0])
  const [size, setSize] = useState<number>(saved?.targetSize_mm ?? t.size.default)
  const [withCells, setWithCells] = useState<boolean>(saved?.withCells ?? t.cells.length > 0)
  const [notes, setNotes] = useState<string>(saved?.notes ?? "")

  // ao trocar o tecido, reposiciona defaults
  useEffect(() => { setApplication(t.applications[0]); setSize(t.size.default); setWithCells(t.cells.length > 0) }, [t])

  const confirm = () => {
    updateModel({
      status: "ready", source: "tissue-brief", name: `${t.label} · ${application}`, category: null, geometryId: null, params: null, stats: null, validation: null,
      brief: { tissue: t.id, application, targetSize_mm: size, withCells, suggestedModelId: t.suggestedModel, notes: notes.trim() || undefined },
    })
  }
  const ready = state.model.status === "ready" && state.model.brief?.tissue === t.id

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-300/80 font-semibold mb-1">Fase 1 / 6 · Processo de bioimpressão</div>
        <h2 className="text-xl font-bold flex items-center gap-2"><Microscope className="w-5 h-5 text-emerald-300" /> Modelo de tecido — definição do construto</h2>
        <p className="text-sm text-gray-400 mt-1 max-w-3xl">
          Defina a <b className="text-gray-200">intenção biológica</b> do projeto: tecido-alvo, aplicação, dimensão e população celular. Com base nela, a BIA recomenda a biotinta validada (Fase 2) e o modelo tridimensional (Fase 3).
          <b className="text-gray-200"> Esta fase não envolve geometria</b> — toda malha 3D (anatômica, primitiva, upload ou desenho) é tratada exclusivamente na Fase 3 · Fatiamento.
        </p>
      </header>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <section className="space-y-5">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="text-sm font-semibold text-gray-100 mb-3">1. Qual é o tecido-alvo do seu projeto?</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TISSUES.map((x) => (
                <button key={x.id} onClick={() => setTissueId(x.id)} className={cn("text-left rounded-xl border p-3 transition", tissueId === x.id ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/10 hover:border-white/25")}>
                  <div className="text-xl leading-none mb-1">{x.icon}</div>
                  <div className="text-sm text-gray-100 leading-tight">{x.label}</div>
                  <div className="text-[11px] text-gray-500 mt-1">{x.cells.length ? x.cells.join(" · ") : "sem células"}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
            <div className="text-sm font-semibold text-gray-100">2. Qual é a aplicação pretendida e a dimensão do construto?</div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Aplicação pretendida</div>
              <div className="flex flex-wrap gap-1.5">{t.applications.map((a) => <button key={a} onClick={() => setApplication(a)} className={cn("px-2.5 py-1 rounded-lg border text-xs", application === a ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-100" : "border-white/10 text-gray-300")}>{a}</button>)}</div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs"><span className="text-gray-400 flex items-center gap-1"><Ruler className="w-3.5 h-3.5" /> {t.size.label}</span><span className="font-mono text-gray-100">{size} mm</span></div>
              <input type="range" min={t.size.min} max={t.size.max} step={0.5} value={size} disabled={t.size.min === t.size.max} onChange={(e) => setSize(+e.target.value)} className="w-full accent-emerald-400" />
              <div className="text-[10px] text-gray-500">O modelo anatômico é escalado uniformemente, preservando as proporções. Orientação e ajustes finos são realizados na mesa de impressão da Fase 3.</div>
            </div>
            {t.cells.length > 0 && (
              <label className="flex items-center gap-2 text-xs text-gray-300"><input type="checkbox" checked={withCells} onChange={(e) => setWithCells(e.target.checked)} className="accent-emerald-400" /> Com células ({t.cells.join(", ")}) — a Fase 2 vai sugerir densidade e a Fase 3 limita o shear no bico</label>
            )}
            <div>
              <div className="text-xs text-gray-400 mb-1">Observações do projeto (opcional)</div>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Ex.: lateralidade esquerda, paciente pediátrico, impressão em insert Transwell…" className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600" />
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.05] p-4 space-y-3 text-sm">
            <div className="text-xs uppercase tracking-wider text-emerald-300 font-semibold flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Recomendação da BIA</div>
            <KV k="Modelo 3D (Fase 3)" v={t.suggestedModelLabel} />
            <KV k="Biotinta (Fase 2)" v={t.suggestedBioink} />
            <KV k="Padrão de preenchimento" v={t.suggestedInfill} />
            <KV k="Substrato de impressão" v={{ petri: "Petri 60 mm", plate24: "Placa 24 poços", plate96: "Placa 96 poços", slide: "Lâmina" }[t.suggestedTarget]} />
            <div className="text-[11px] text-gray-400 flex gap-1.5"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />{t.rationale}</div>
          </div>

          <button onClick={confirm} className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-cyan-500 text-black flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {ready ? "Atualizar definição do construto" : "Confirmar definição do construto"}
          </button>
          {ready && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2 text-xs">
              <div className="text-emerald-200 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Fase 1 concluída: {state.model.name}</div>
              <Link href="/dashboard/bioprint/bioink" className="flex items-center justify-between rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-cyan-100 hover:bg-cyan-500/20"><span>Fase 2 · Biotinta (sugerida: {t.suggestedBioink})</span><ArrowRight className="w-4 h-4" /></Link>
              <Link href={fase3HrefFor(t, size)} className="flex items-center justify-between rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-violet-100 hover:bg-violet-500/20"><span className="flex items-center gap-1.5"><TargetIcon className="w-3.5 h-3.5" /> Pular para a Fase 3 com o modelo sugerido</span><ArrowRight className="w-4 h-4" /></Link>
            </div>
          )}
          <div className="text-[11px] text-gray-500 rounded-lg border border-white/5 p-3">
            Possui um arquivo STL próprio? Realize o upload <b className="text-gray-300">na Fase 3</b> (área “Modelo 3D”). Prefere definir a geometria manualmente? <Link href="/dashboard/bioprint/draw" className="text-emerald-300 hover:underline">Desenhar & Imprimir</Link> também é um caminho da Fase 3.
          </div>
        </aside>
      </div>
    </div>
  )
}

function KV({ k, v }: { k: string; v: string }) {
  return <div><div className="text-[10px] uppercase tracking-wider text-gray-500">{k}</div><div className="text-gray-100">{v}</div></div>
}
