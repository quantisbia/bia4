"use client"

/**
 * BIA v4 · R26 · LearningTable — a memória de bioimpressão da BIA
 * Mostra, por biotinta, o que já foi aprendido (impressões, % que fluiu,
 * nota média, fator que funcionou) e as linhas individuais.
 */

import { useEffect, useMemo, useState } from "react"
import { Brain, Check, Download, RefreshCw, X } from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { learningStats, listLearning, syncLearning, type LearningRow } from "@/lib/bioprint/learning-table"

export function LearningTable() {
  const [rows, setRows] = useState<LearningRow[]>([])
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState<string>("")
  const refresh = async () => { setBusy(true); try { setRows((await syncLearning()).sort((a, b) => b.createdAt - a.createdAt)) } finally { setBusy(false) } }
  useEffect(() => { setRows(listLearning()); void refresh() }, [])
  const stats = useMemo(() => learningStats(rows), [rows])
  const visible = filter ? rows.filter((r) => r.materialKey === filter) : rows

  const exportCsv = () => {
    const head = ["data", "material", "aplicacao", "geometria", "agulha_mm", "camada_mm", "velocidade_mms", "fator", "M221_pct", "fator_efetivo", "infill", "densidade_pct", "paredes", "seringa_mL", "fluiu", "nota", "sintomas", "relato"]
    const lines = rows.map((r) => [new Date(r.createdAt).toISOString(), r.material, r.application, r.geometryId ?? "", r.params.nozzle_mm, r.params.layerHeight_mm, r.params.speed_mms, r.params.flowFactor, r.params.flowPercentM221, r.effectiveFactor, r.params.infillPattern, r.params.infillDensity, r.params.wallCount, r.params.syringe_mL, r.flowed ? "sim" : "nao", r.rating, r.symptoms.join("|"), JSON.stringify(r.text)].join(","))
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `bia-tabela-aprendizado-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }

  return (
    <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4 space-y-3" aria-label="Tabela de aprendizado">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Brain className="w-4 h-4 text-emerald-300" /> Tabela de aprendizado da BIA</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Cada impressão avaliada vira uma linha: biotinta × aplicação × geometria → parâmetros, se fluiu, nota. A Fase 2 e a Fase 3 consultam esta tabela antes de recomendar.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} disabled={busy} className="text-xs px-2.5 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:border-white/25 inline-flex items-center gap-1.5 disabled:opacity-50"><RefreshCw className={cn("w-3.5 h-3.5", busy && "animate-spin")} /> Sincronizar</button>
          <button onClick={exportCsv} disabled={!rows.length} className="text-xs px-2.5 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:border-white/25 inline-flex items-center gap-1.5 disabled:opacity-50"><Download className="w-3.5 h-3.5" /> CSV</button>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="text-xs text-gray-500 rounded-lg border border-dashed border-white/10 p-4 text-center">Ainda não há impressões avaliadas. Ao terminar uma bioimpressão (Fase 4), responda “a biotinta fluiu?” e dê a nota — a tabela começa aqui.</div>
      ) : (
        <>
          {/* resumo por biotinta */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {stats.map((s) => (
              <button key={s.material} onClick={() => setFilter(filter === s.material.toLowerCase() ? "" : rows.find((r) => r.material === s.material)?.materialKey ?? "")}
                className={cn("text-left rounded-xl border p-3 transition", filter && rows.find((r) => r.materialKey === filter)?.material === s.material ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/10 bg-black/20 hover:border-white/25")}>
                <div className="text-sm text-gray-100 font-medium truncate">{s.material}</div>
                <div className="mt-1 grid grid-cols-3 gap-1 text-[10px] text-gray-400">
                  <div><div className="text-gray-500 uppercase tracking-wider">impressões</div><div className="text-gray-100 text-xs font-mono">{s.n}</div></div>
                  <div><div className="text-gray-500 uppercase tracking-wider">fluiu</div><div className={cn("text-xs font-mono", s.flowRate >= 80 ? "text-emerald-300" : s.flowRate >= 50 ? "text-amber-300" : "text-rose-300")}>{s.flowRate} %</div></div>
                  <div><div className="text-gray-500 uppercase tracking-wider">nota média</div><div className="text-gray-100 text-xs font-mono">{s.avgRating}</div></div>
                </div>
                {s.bestFactor && <div className="mt-1 text-[10px] text-emerald-200">fator que funcionou: {s.bestFactor.toFixed(2)}×</div>}
              </button>
            ))}
          </div>

          {/* linhas */}
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-[11px]">
              <thead className="bg-black/40 text-gray-400 uppercase tracking-wider text-[9.5px]">
                <tr>{["Data", "Biotinta", "Aplicação", "Geometria", "Agulha", "Camada", "Vel.", "Fator", "M221", "Efetivo", "Infill", "Paredes", "Seringa", "Fluiu", "Nota", "Sintomas"].map((h) => <th key={h} className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {visible.slice(0, 60).map((r) => (
                  <tr key={r.id} className="border-t border-white/5 text-gray-300">
                    <td className="px-2 py-1.5 whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td className="px-2 py-1.5 max-w-[180px] truncate text-gray-100">{r.material}</td>
                    <td className="px-2 py-1.5">{r.application}</td>
                    <td className="px-2 py-1.5 max-w-[120px] truncate">{r.geometryId ?? "—"}</td>
                    <td className="px-2 py-1.5 font-mono">{r.params.nozzle_mm}</td>
                    <td className="px-2 py-1.5 font-mono">{r.params.layerHeight_mm}</td>
                    <td className="px-2 py-1.5 font-mono">{r.params.speed_mms}</td>
                    <td className="px-2 py-1.5 font-mono">{r.params.flowFactor.toFixed(2)}×</td>
                    <td className="px-2 py-1.5 font-mono">{r.params.flowPercentM221} %</td>
                    <td className="px-2 py-1.5 font-mono text-emerald-200">{r.effectiveFactor.toFixed(2)}×</td>
                    <td className="px-2 py-1.5">{r.params.infillPattern} {r.params.infillDensity} %</td>
                    <td className="px-2 py-1.5 font-mono">{r.params.wallCount}</td>
                    <td className="px-2 py-1.5 font-mono">{r.params.syringe_mL} mL</td>
                    <td className="px-2 py-1.5">{r.flowed ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <X className="w-3.5 h-3.5 text-rose-300" />}</td>
                    <td className="px-2 py-1.5 font-mono">{r.rating}/5</td>
                    <td className="px-2 py-1.5 max-w-[220px] truncate" title={r.text}>{r.symptoms.join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
