"use client"

/**
 * BIA · Academy · R29 · QuizPanel — teste de aprendizagem interativo da aula
 *
 * Fluxo: carrega perguntas (sem gabarito) → aluno responde → envia → servidor
 * corrige → mostra nota, aprovação e explicação por questão → pode refazer.
 * Grava o melhor resultado em AcademyProgress.quizScore via /api/academy/quiz/[lessonId].
 */
import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, XCircle, HelpCircle, Loader2, RotateCcw, Trophy, ChevronRight } from "lucide-react"

type Q = { id: string; order: number; prompt: string; options: string[] }
type Item = { id: string; order: number; selected: number | null; correctIndex: number; correct: boolean; explanation: string | null }
type Grade = { score: number; correct: number; total: number; passed: boolean; passingScore: number; items: Item[]; bestScore: number }

const LETTERS = ["A", "B", "C", "D", "E", "F"]

export function QuizPanel({ lessonId, passingScore }: { lessonId: string; passingScore: number }) {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "submitting" | "graded" | "error">("idle")
  const [questions, setQuestions] = useState<Q[]>([])
  const [bestScore, setBestScore] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [grade, setGrade] = useState<Grade | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState("loading"); setError(null)
    try {
      const r = await fetch(`/api/academy/quiz/${lessonId}`, { cache: "no-store" })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json()
      setQuestions(d.questions); setBestScore(d.bestScore ?? null); setAnswers({}); setGrade(null)
      setState("ready")
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); setState("error") }
  }, [lessonId])

  useEffect(() => { if (state === "idle") void load() }, [state, load])

  const answered = Object.keys(answers).length
  const allAnswered = questions.length > 0 && answered === questions.length

  async function submit() {
    setState("submitting")
    try {
      const r = await fetch(`/api/academy/quiz/${lessonId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }) })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const g: Grade = await r.json()
      setGrade(g); setBestScore(g.bestScore); setState("graded")
      fetch("/api/academy/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "quiz_submitted", lessonId, meta: { score: g.score, passed: g.passed } }) }).catch(() => {})
      document.getElementById("quiz-result")?.scrollIntoView({ behavior: "smooth", block: "start" })
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); setState("error") }
  }

  if (state === "loading" || state === "idle") {
    return <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 flex items-center gap-3 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Carregando teste de aprendizagem…</div>
  }
  if (state === "error") {
    return <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-200 flex items-center justify-between gap-3"><span>Não foi possível carregar o quiz ({error}).</span><button onClick={() => setState("idle")} className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1]">Tentar de novo</button></div>
  }

  const itemById = new Map(grade?.items.map((i) => [i.id, i]) ?? [])

  return (
    <section data-testid="lesson-quiz-panel" className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-b from-fuchsia-500/[0.06] to-transparent p-5 sm:p-6 space-y-5">
      <header className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center shrink-0">
          <HelpCircle className="w-5 h-5 text-fuchsia-300" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-white">Teste de aprendizagem</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {questions.length} questões · nota mínima {passingScore}% · pode refazer quantas vezes quiser — vale a melhor nota.
          </p>
        </div>
        {bestScore !== null && (
          <div className={`text-right shrink-0 px-3 py-1.5 rounded-lg border text-xs ${bestScore >= passingScore ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-white/[0.08] bg-white/[0.03] text-gray-300"}`} data-testid="quiz-best-score">
            <div className="text-[9px] uppercase tracking-widest opacity-70">Melhor nota</div>
            <div className="font-bold text-sm">{bestScore}%</div>
          </div>
        )}
      </header>

      {grade && (
        <div id="quiz-result" data-testid="quiz-result" className={`rounded-xl border p-4 flex items-center gap-4 ${grade.passed ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
          {grade.passed ? <Trophy className="w-8 h-8 text-emerald-300 shrink-0" /> : <RotateCcw className="w-8 h-8 text-amber-300 shrink-0" />}
          <div className="flex-1">
            <p className="text-lg font-bold text-white">{grade.score}% · {grade.correct} de {grade.total} corretas</p>
            <p className="text-xs text-gray-300 mt-0.5">
              {grade.passed ? "Aprovado(a)! Você domina os conceitos centrais desta aula." : `Ainda não atingiu ${grade.passingScore}%. Releia as explicações abaixo e tente de novo.`}
            </p>
          </div>
          <button onClick={() => void load()} className="text-xs font-semibold px-3 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-white flex items-center gap-1.5 shrink-0">
            <RotateCcw className="w-3.5 h-3.5" /> Refazer
          </button>
        </div>
      )}

      <ol className="space-y-4">
        {questions.map((q, qi) => {
          const res = itemById.get(q.id)
          const sel = answers[q.id]
          return (
            <li key={q.id} data-testid={`quiz-q-${q.order}`} className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
              <p className="text-sm text-white font-medium leading-relaxed"><span className="text-fuchsia-300 font-bold mr-2">{qi + 1}.</span>{q.prompt}</p>
              <div className="mt-3 grid gap-2">
                {q.options.map((opt, oi) => {
                  const chosen = sel === oi
                  let cls = "border-white/[0.08] bg-white/[0.02] hover:border-fuchsia-500/40 hover:bg-fuchsia-500/[0.06]"
                  if (res) {
                    if (oi === res.correctIndex) cls = "border-emerald-500/50 bg-emerald-500/10"
                    else if (chosen) cls = "border-red-500/50 bg-red-500/10"
                    else cls = "border-white/[0.05] bg-white/[0.01] opacity-60"
                  } else if (chosen) cls = "border-fuchsia-500/60 bg-fuchsia-500/10"
                  return (
                    <button key={oi} type="button" disabled={!!res || state === "submitting"}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                      className={`text-left rounded-lg border px-3 py-2.5 text-sm text-gray-200 transition-all flex items-start gap-3 disabled:cursor-default ${cls}`}>
                      <span className={`w-6 h-6 rounded-md text-[11px] font-bold flex items-center justify-center shrink-0 ${chosen && !res ? "bg-fuchsia-500 text-white" : "bg-white/[0.06] text-gray-400"}`}>{LETTERS[oi]}</span>
                      <span className="flex-1">{opt}</span>
                      {res && oi === res.correctIndex && <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />}
                      {res && chosen && oi !== res.correctIndex && <XCircle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />}
                    </button>
                  )
                })}
              </div>
              {res?.explanation && (
                <p className={`mt-3 text-xs leading-relaxed rounded-lg px-3 py-2 ${res.correct ? "bg-emerald-500/[0.07] text-emerald-100" : "bg-amber-500/[0.07] text-amber-100"}`}>
                  <span className="font-bold">{res.correct ? "Correto. " : res.selected === null ? "Em branco. " : "Não é essa. "}</span>{res.explanation}
                </p>
              )}
            </li>
          )
        })}
      </ol>

      {!grade && (
        <footer className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs text-gray-400">{answered} de {questions.length} respondidas</p>
          <button type="button" onClick={() => void submit()} disabled={!allAnswered || state === "submitting"} data-testid="quiz-submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            {state === "submitting" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
            Enviar respostas
          </button>
        </footer>
      )}
    </section>
  )
}
