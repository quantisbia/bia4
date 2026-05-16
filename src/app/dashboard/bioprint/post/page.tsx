"use client"

/**
 * BIA — Etapa 5 / 5 · Pós-Bioimpressão
 *
 * Cultura → Crosslink → Biorreator → Validação (assays)
 *
 * Esta página agora contém o que antes vivia na Etapa 4 (control/page.tsx):
 *   - Seletor de tipo de tecido alvo (espelhado em control.tissueType)
 *   - PostBioprintingPanel (protocolos de cultura, biorreator, assays)
 *   - Checklist de confirmação por estágio biológico
 *   - Atalhos para o hub e para a Etapa 4 (re-imprimir, se necessário)
 *
 * Pré-requisito: state.control.status === "ready"
 */

import Link from "next/link"
import { useMemo, useEffect } from "react"
import {
  Beaker, ArrowLeft, ArrowRight, Sparkles, CheckCircle2,
  Lock, Info, AlertTriangle, Microscope, FlaskConical,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { useBioprintProcess, isStepUnlocked } from "@/lib/bioprint/process-context"
import { POST_PROCESSING } from "@/lib/bioprinter/biomedical-params"
import {
  PostBioprintingPanel,
  type PostBioState,
} from "@/components/bioprinter/PostBioprintingPanel"
import { InfoButton } from "@/components/ui/InfoButton"

// ═══════════════════════════════════════════════════════════════════════════
// Tipos de tecido — mesma lista que existia antes na Etapa 4
// ═══════════════════════════════════════════════════════════════════════════
const TISSUE_TYPES: string[] = POST_PROCESSING.map((p) => p.tissueType)

// state.model.category → sugestão de tecido alvo
function mapCategoryToTissue(category: string | null): string {
  if (!category) return "Cardíaco (patch)"
  switch (category) {
    case "rigid-tissue":      return "Ósseo"
    case "biomimetic-tpms":   return "Ósseo"
    case "organoid-vascular": return "Vaso sanguíneo"
    case "printability-test": return "Cardíaco (patch)"
    case "soft-tissue":
    default:                  return "Cardíaco (patch)"
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
export default function BioprintPostPage() {
  const { state, updateControl, updatePostBio } = useBioprintProcess()

  // ── Pré-requisito ──
  const isUnlocked = isStepUnlocked("postBio", state)
  const controlReady = state.control.status === "ready"

  // Tecido alvo efetivo (prioriza postBio → control → inferido pelo modelo)
  const effectiveTissue: string =
    state.postBio.tissueType ??
    state.control.tissueType ??
    mapCategoryToTissue(state.model.category)

  // Garantir que postBio.tissueType esteja preenchido na primeira visita
  useEffect(() => {
    if (state.postBio.tissueType == null) {
      updatePostBio({ tissueType: effectiveTissue })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Callback do painel — atualiza ambos os slices (control para retrocompat)
  const handleTissueChange = (next: PostBioState) => {
    updatePostBio({ tissueType: next.tissueType })
    updateControl({ tissueType: next.tissueType })
  }

  // Progresso da etapa
  const stagesConfirmed = [
    state.postBio.cultureConfirmed,
    state.postBio.bioreactorConfirmed,
    state.postBio.assaysConfirmed,
  ].filter(Boolean).length

  const allConfirmed = stagesConfirmed === 3

  // Marcar etapa como "ready" quando os 3 estágios estiverem confirmados
  useEffect(() => {
    if (allConfirmed && state.postBio.status !== "ready") {
      updatePostBio({ status: "ready" })
    } else if (!allConfirmed && state.postBio.status === "ready") {
      updatePostBio({ status: "draft" })
    } else if (stagesConfirmed > 0 && state.postBio.status === "empty") {
      updatePostBio({ status: "draft" })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allConfirmed])

  // ═══════════════════════════════════════════════════════════════════════
  // GATE: Etapa 4 não concluída
  // ═══════════════════════════════════════════════════════════════════════
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
        <header className="border-b border-rose-500/20 bg-black/30 px-4 sm:px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Beaker className="w-5 h-5 text-rose-300" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-semibold text-white truncate">
                  Etapa 5 / 5 · Pós-Bioimpressão
                </h1>
                <p className="text-xs text-gray-400 truncate">
                  Cultura → Biorreator → Validação
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/bioprint"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-medium rounded-lg transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Hub
            </Link>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-6 text-center">
            <Lock className="w-10 h-10 text-amber-300 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-amber-100 mb-2">
              Etapa 4 (Execução) ainda não concluída
            </h2>
            <p className="text-sm text-amber-200/80 mb-5">
              Você precisa executar a bioimpressão antes de configurar a
              pós-bioimpressão (cultura, biorreator e ensaios).
            </p>
            <Link
              href="/dashboard/bioprint/control"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-100 text-sm font-semibold rounded-lg transition-colors"
            >
              <ArrowRight className="w-4 h-4" /> Ir para Etapa 4 (Execução)
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER PRINCIPAL
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="bia-post-page min-h-screen bg-[#0a0a0f] text-gray-100">
      {/* ─── Cabeçalho ─── */}
      <header className="border-b border-rose-500/20 bg-black/30 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
              <Beaker className="w-5 h-5 text-rose-300" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-white truncate">
                Etapa 5 / 5 · Pós-Bioimpressão
              </h1>
              <p className="text-xs text-gray-400 truncate">
                Cultura → Biorreator → Validação · construct → tecido funcional
              </p>
            </div>
            <InfoButton title="O que é a Pós-Bioimpressão?" size="sm">
              <p className="mb-2">
                Quando o construct sai da bioimpressora ele <strong>não é
                tecido ainda</strong> — é um andaime com células dispersas.
                O trabalho biológico real começa aqui.
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Cultura imediata</strong>: meio, CO₂, temperatura,
                  schedule de trocas.</li>
                <li><strong>Maturação em biorreator</strong>: estímulo
                  elétrico/mecânico/fluxo conforme o tecido.</li>
                <li><strong>Validação</strong>: ensaios morfológicos
                  (histologia, IF) e funcionais (contratilidade, força,
                  permeabilidade).</li>
              </ul>
              <p className="mt-2 text-xs text-gray-400">
                Cada tipo de tecido tem protocolo específico — selecione abaixo.
              </p>
            </InfoButton>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/dashboard/bioprint/control"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-medium rounded-lg transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Etapa 4
            </Link>
            <Link
              href="/dashboard/bioprint"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-medium rounded-lg transition-colors"
            >
              Hub
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-24">
        {/* ─── Status de progresso ─── */}
        <div className="rounded-xl bg-rose-500/5 border border-rose-500/20 p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Sparkles className="w-5 h-5 text-rose-300 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-rose-100">
                Tecido alvo: <span className="text-white">{effectiveTissue}</span>
              </p>
              <p className="text-xs text-gray-400">
                {stagesConfirmed}/3 estágios confirmados ·{" "}
                {allConfirmed
                  ? "Etapa 5 pronta · processo completo"
                  : "Confirme cada estágio abaixo conforme avança em laboratório"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[
              { label: "Cultura", ok: state.postBio.cultureConfirmed },
              { label: "Biorreator", ok: state.postBio.bioreactorConfirmed },
              { label: "Ensaios", ok: state.postBio.assaysConfirmed },
            ].map((s) => (
              <span
                key={s.label}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border",
                  s.ok
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
                    : "bg-white/5 border-white/10 text-gray-400"
                )}
              >
                {s.ok ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <Info className="w-3 h-3" />
                )}
                {s.label}
              </span>
            ))}
          </div>
        </div>

        {/* ─── Seletor de tecido alvo (que estava na Etapa 4) ─── */}
        <section className="rounded-xl bg-black/40 border border-white/10 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Microscope className="w-5 h-5 text-rose-300" />
            <h2 className="text-base font-semibold text-white">
              Tipo de tecido alvo
            </h2>
            <InfoButton title="Por que selecionar o tecido?" size="sm">
              <p className="mb-2">
                Cada tecido tem requisitos biológicos próprios:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Cardíaco</strong>: estimulação elétrica
                  ~1&nbsp;Hz para alinhamento de cardiomiócitos.</li>
                <li><strong>Ósseo</strong>: compressão mecânica cíclica
                  + meio osteogênico (β-glicerofosfato, ascorbato, dexa).</li>
                <li><strong>Cartilagem</strong>: hipóxia 5% O₂ +
                  TGF-β3 + compressão dinâmica.</li>
                <li><strong>Vaso</strong>: shear stress por fluxo
                  (15–20&nbsp;dyn/cm²).</li>
                <li><strong>Pele</strong>: interface ar-líquido para
                  cornificação.</li>
              </ul>
              <p className="mt-2 text-xs text-gray-400">
                Sugestão automática vem da categoria do modelo
                (Etapa 1). Pode ser sobrescrita aqui.
              </p>
            </InfoButton>
          </div>

          <p className="text-xs text-gray-400">
            Sugestão a partir da Etapa 1 (Modelo 3D):{" "}
            <span className="text-gray-200 font-medium">
              {mapCategoryToTissue(state.model.category)}
            </span>
            {state.postBio.tissueType && state.postBio.tissueType !== mapCategoryToTissue(state.model.category) && (
              <>
                {" "}· Selecionado:{" "}
                <span className="text-rose-200 font-medium">
                  {state.postBio.tissueType}
                </span>
              </>
            )}
          </p>

          {/* Painel completo de protocolos */}
          <PostBioprintingPanel
            state={{ tissueType: effectiveTissue }}
            onChange={handleTissueChange}
          />
        </section>

        {/* ─── Checklist de confirmação ─── */}
        <section className="rounded-xl bg-black/40 border border-white/10 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-emerald-300" />
            <h2 className="text-base font-semibold text-white">
              Checklist de execução biológica
            </h2>
            <InfoButton title="Para que serve esse checklist?" size="sm">
              <p>
                Marque cada estágio à medida que ele for executado em
                laboratório. Isso registra o progresso real do construct
                (não é apenas decoração) e libera o status final do processo.
              </p>
              <p className="mt-2 text-xs text-gray-400">
                Quando os 3 estágios estiverem confirmados, a Etapa 5 fica
                marcada como concluída no hub.
              </p>
            </InfoButton>
          </div>

          <div className="space-y-2">
            {[
              {
                key: "cultureConfirmed" as const,
                label: "Cultura imediata configurada",
                hint: "Meio de cultura adequado, incubadora a 37 °C / 5% CO₂, schedule de trocas definido.",
                value: state.postBio.cultureConfirmed,
              },
              {
                key: "bioreactorConfirmed" as const,
                label: "Maturação em biorreator iniciada",
                hint: "Estímulo apropriado (elétrico/mecânico/fluxo) conforme tecido alvo.",
                value: state.postBio.bioreactorConfirmed,
              },
              {
                key: "assaysConfirmed" as const,
                label: "Ensaios de validação planejados",
                hint: "Ensaios morfológicos (H&E, IF) e funcionais (contratilidade, força, etc.) agendados.",
                value: state.postBio.assaysConfirmed,
              },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => updatePostBio({ [item.key]: !item.value } as any)}
                className={cn(
                  "w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-colors",
                  item.value
                    ? "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15"
                    : "bg-white/[0.02] border-white/10 hover:bg-white/[0.05]"
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors",
                    item.value
                      ? "bg-emerald-500 border-emerald-400"
                      : "bg-transparent border-gray-500"
                  )}
                >
                  {item.value && <CheckCircle2 className="w-4 h-4 text-black" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      item.value ? "text-emerald-100" : "text-gray-200"
                    )}
                  >
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.hint}</p>
                </div>
              </button>
            ))}
          </div>

          {!controlReady && (
            <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200">
                A Etapa 4 (Execução) ainda não está marcada como concluída.
                Você pode planejar a pós-bioimpressão aqui, mas o construct
                precisa estar realmente impresso para que o checklist faça sentido.
              </p>
            </div>
          )}
        </section>

        {/* ─── Rodapé com próximos passos ─── */}
        <section className="rounded-xl bg-gradient-to-br from-rose-500/10 to-emerald-500/10 border border-rose-500/20 p-5">
          {allConfirmed ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-300 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-100">
                  Processo completo · 5/5 etapas concluídas
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  Modelo → Biotinta → Fatiamento → Execução → Pós-Bioimpressão.
                  Documente os resultados dos ensaios na Base de Conhecimento
                  para fechar o ciclo.
                </p>
                <div className="flex gap-2 mt-3">
                  <Link
                    href="/dashboard/knowledge"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-100 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Base de Conhecimento <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href="/dashboard/bioprint"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-medium rounded-lg transition-colors"
                  >
                    Hub do processo
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-rose-300 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-rose-100">
                  Avance pelos 3 estágios biológicos
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  Use o protocolo gerado acima como guia em laboratório.
                  Marque cada estágio à medida que ele for sendo executado.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* ─── Rodapé sticky ─── */}
      <footer className="sticky bottom-0 z-10 bg-[#0a0a0f]/95 backdrop-blur border-t border-rose-500/20 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm min-w-0">
          {allConfirmed ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-emerald-300 font-medium shrink-0">
                Etapa 5/5:
              </span>
              <span className="text-gray-300 truncate">
                Pós-bioimpressão concluída · {effectiveTissue}
              </span>
            </>
          ) : (
            <>
              <Info className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="text-gray-400 text-xs">
                Etapa 5 · {stagesConfirmed}/3 estágios confirmados ·{" "}
                Tecido alvo: {effectiveTissue}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/bioprint"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-200 text-xs font-medium rounded-lg transition-colors"
          >
            Voltar ao hub
          </Link>
        </div>
      </footer>
    </div>
  )
}
