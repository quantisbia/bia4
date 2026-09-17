"use client"

/**
 * BIA · Academy · LessonView — R13.03
 *
 * Client component da página de aula. Recebe todos os dados prontos do
 * server component pai e renderiza:
 *  - iframe YouTube (simples nesta sprint — R13.04 vai substituir por
 *    IFrame API com tracking automático de watchedSeconds)
 *  - Título / objetivo / resumo
 *  - Botão "Marcar como concluída" (decisão #3)
 *  - biaHook em botão que abre BIA em NOVA aba (decisão #5)
 *  - Lista de anexos (PDF/LINK/STL/GCODE/IMAGE)
 *  - Card de quiz (só link — funcional em R13.05)
 *  - Navegação prev/next
 *
 * Trackeia eventos via /api/academy/analytics (fire-and-forget):
 *   - lesson_opened     (no mount)
 *   - bia_hook_opened   (clique no botão biaHook — também grava no progress)
 *   - lesson_completed  (após PATCH progress com status=COMPLETED)
 */
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, ArrowRight, CheckCircle2, Circle, Play,
  Sparkles, FileText, Link as LinkIcon, Box, Cog, Image as ImageIcon,
  Loader2, Trophy, ChevronRight, HelpCircle, Target,
} from "lucide-react"
import { RichLessonContent } from "./RichLessonContent"

type BiaHook = { tool: string; label: string; params?: Record<string, unknown> } | null

type Attachment = {
  id: string
  kind: string
  title: string
  url: string
}

export type LessonViewProps = {
  lesson: {
    id: string
    slug: string
    order: number
    title: string
    objective: string | null
    summary: string | null
    youtubeId: string
    durationMin: number
    level: string
    biaHook: BiaHook
    attachments: Attachment[]
    hasQuiz: boolean
    quizPassingScore: number | null
  }
  module: {
    id: string
    slug: string
    order: number
    title: string
  }
  progress: {
    status: string
    watchedSeconds: number
    biaHookOpened: boolean
    completedAt: string | null
  }
  navigation: {
    previous: { moduleSlug: string; lessonSlug: string; title: string } | null
    next: { moduleSlug: string; lessonSlug: string; title: string } | null
  }
}

const ATTACHMENT_ICONS: Record<string, typeof FileText> = {
  PDF: FileText,
  LINK: LinkIcon,
  STL: Box,
  GCODE: Cog,
  IMAGE: ImageIcon,
}

function trackEvent(event: string, metadata?: Record<string, unknown>) {
  try {
    fetch("/api/academy/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
        metadata,
      }),
      keepalive: true,
    }).catch(() => {})
  } catch { /* silent */ }
}

/**
 * Converte o biaHook em URL absoluta:
 *   { tool: "formulator-pro", params: { template: "gelma_5" } }
 *   → "/dashboard/formulator-pro?template=gelma_5&from=academy&lessonId=xyz"
 */
function buildBiaHookUrl(hook: BiaHook, lessonId: string): string | null {
  if (!hook?.tool) return null
  const params = new URLSearchParams()
  if (hook.params && typeof hook.params === "object") {
    for (const [k, v] of Object.entries(hook.params)) {
      if (v == null) continue
      params.set(k, typeof v === "string" ? v : JSON.stringify(v))
    }
  }
  params.set("from", "academy")
  params.set("lessonId", lessonId)
  return `/dashboard/${hook.tool}?${params.toString()}`
}

export function LessonView({ lesson, module: mod, progress, navigation }: LessonViewProps) {
  const router = useRouter()
  const [status, setStatus] = useState(progress.status)
  const [busy, setBusy] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)

  // Track lesson_opened uma vez no mount
  useEffect(() => {
    trackEvent("lesson_opened", { lessonId: lesson.id, moduleId: mod.id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isCompleted = status === "COMPLETED"
  const biaHookUrl = buildBiaHookUrl(lesson.biaHook, lesson.id)

  const patchProgress = useCallback(async (newStatus: "IN_PROGRESS" | "COMPLETED") => {
    setBusy(true)
    try {
      const res = await fetch("/api/academy/progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, status: newStatus }),
      })
      if (res.ok) {
        setStatus(newStatus)
        if (newStatus === "COMPLETED") {
          setJustCompleted(true)
          trackEvent("lesson_completed", { lessonId: lesson.id, moduleId: mod.id })
          // Refresh sidebar/data em background
          router.refresh()
        }
      }
    } catch { /* silent */ }
    setBusy(false)
  }, [lesson.id, mod.id, router])

  const handleBiaHookClick = useCallback(() => {
    trackEvent("bia_hook_opened", {
      lessonId: lesson.id,
      tool: lesson.biaHook?.tool,
    })
    // Registra no progress também (biaHookOpened=true)
    fetch("/api/academy/progress", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId: lesson.id, biaHookOpened: true }),
      keepalive: true,
    }).catch(() => {})
    // Se está NOT_STARTED, promove pra IN_PROGRESS ao clicar no biaHook
    if (status === "NOT_STARTED") {
      patchProgress("IN_PROGRESS")
    }
  }, [lesson.id, lesson.biaHook?.tool, status, patchProgress])

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8" data-testid="academy-lesson-page-root">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/academy/journey" className="hover:text-fuchsia-300 flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" />
          Jornada
        </Link>
        <ChevronRight className="w-3 h-3 text-gray-700" />
        <Link href={`/academy/modules/${mod.slug}`} className="hover:text-fuchsia-300">
          Módulo {mod.order} · {mod.title}
        </Link>
        <ChevronRight className="w-3 h-3 text-gray-700" />
        <span className="text-gray-400">Aula {mod.order}.{lesson.order}</span>
      </nav>

      {/* Header da aula */}
      <header className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-200">
            <Sparkles className="w-3 h-3" />
            Aula {mod.order}.{lesson.order}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-200">
            {lesson.durationMin} min
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.10] text-gray-300 capitalize">
            {lesson.level}
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight tracking-tight">
          {lesson.title}
        </h1>
        {lesson.objective && (
          <div
            data-testid="lesson-objective-card"
            className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.08] to-fuchsia-500/[0.04] p-5"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5 text-violet-200" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300 mb-1.5">
                  Objetivo desta aula
                </p>
                <p className="text-[15px] text-gray-100 leading-relaxed whitespace-pre-line">
                  {lesson.objective}
                </p>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Player YouTube (iframe simples — R13.04 vira IFrame API) */}
      <div
        data-testid="lesson-video-frame"
        className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/[0.08]"
      >
        <iframe
          src={`https://www.youtube.com/embed/${lesson.youtubeId}?rel=0&modestbranding=1`}
          title={lesson.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>

      {/* Barra de ações */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 text-sm">
          {isCompleted ? (
            <span className="inline-flex items-center gap-2 text-emerald-300 font-medium" data-testid="lesson-status-badge">
              <CheckCircle2 className="w-4 h-4" />
              Aula concluída
              {progress.completedAt && (
                <span className="text-[10px] text-gray-500">
                  · {new Date(progress.completedAt).toLocaleDateString("pt-BR")}
                </span>
              )}
            </span>
          ) : status === "IN_PROGRESS" ? (
            <span className="inline-flex items-center gap-2 text-fuchsia-300 font-medium" data-testid="lesson-status-badge">
              <Play className="w-4 h-4" />
              Em andamento
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-gray-400 font-medium" data-testid="lesson-status-badge">
              <Circle className="w-4 h-4" />
              Não iniciada
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {!isCompleted && (
            <button
              type="button"
              onClick={() => patchProgress("COMPLETED")}
              disabled={busy}
              data-testid="lesson-mark-complete"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-900/30"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Marcar como concluída
            </button>
          )}
          {isCompleted && (
            <button
              type="button"
              onClick={() => patchProgress("IN_PROGRESS")}
              disabled={busy}
              data-testid="lesson-mark-incomplete"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-300 border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.04] disabled:opacity-50 transition-all"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Circle className="w-4 h-4" />}
              Marcar como não concluída
            </button>
          )}
        </div>
      </div>

      {/* Confete visual quando acabou de concluir */}
      {justCompleted && (
        <div
          data-testid="lesson-just-completed-banner"
          className="rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-4 flex items-center gap-3"
        >
          <Trophy className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="text-emerald-200 font-semibold">Aula concluída! 🎓</p>
            <p className="text-xs text-emerald-100/70 mt-0.5">
              {navigation.next
                ? "Continue para a próxima aula ou faça uma pausa — seu progresso está salvo."
                : "Você completou a última aula do programa! Aguarde o certificado."}
            </p>
          </div>
          {navigation.next && (
            <Link
              href={`/academy/modules/${navigation.next.moduleSlug}/${navigation.next.lessonSlug}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 hover:text-emerald-200"
            >
              Próxima aula
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      )}

      {/* biaHook — botão de abrir a BIA */}
      {biaHookUrl && lesson.biaHook && (
        <div className="rounded-2xl border border-fuchsia-500/25 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300/80 mb-1">
                Aplique agora na BIA
              </p>
              <p className="text-sm text-gray-200 mb-3">
                {lesson.biaHook.label ?? "Abrir a BIA com o contexto desta aula"}
              </p>
              <Link
                href={biaHookUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleBiaHookClick}
                data-testid="lesson-bia-hook-button"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all shadow-lg shadow-fuchsia-900/30"
              >
                <Sparkles className="w-4 h-4" />
                Abrir na BIA
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo denso da aula — renderização educacional rica (R13.13) */}
      {lesson.summary && (
        <section
          data-testid="lesson-rich-content-section"
          className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5 sm:p-8"
        >
          <RichLessonContent markdown={lesson.summary} />
        </section>
      )}

      {/* Anexos */}
      {lesson.attachments.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300/80">
            Materiais desta aula
          </h2>
          <ul className="space-y-2" data-testid="lesson-attachments-list">
            {lesson.attachments.map(a => {
              const Icon = ATTACHMENT_ICONS[a.kind] ?? FileText
              return (
                <li key={a.id}>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`lesson-attachment-${a.kind.toLowerCase()}`}
                    className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-fuchsia-500/20 hover:bg-white/[0.03] transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-fuchsia-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{a.title}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{a.kind}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-fuchsia-300 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </a>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Quiz */}
      {lesson.hasQuiz && (
        <section
          data-testid="lesson-quiz-card"
          className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center shrink-0">
            <HelpCircle className="w-4 h-4 text-fuchsia-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Quiz desta aula</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Nota mínima para aprovação: {lesson.quizPassingScore ?? 70}%. Interface interativa chega em R13.05.
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-white/[0.06] text-gray-400">
            Em breve
          </span>
        </section>
      )}

      {/* Navegação prev/next */}
      <div className="pt-6 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-3">
        {navigation.previous ? (
          <Link
            href={`/academy/modules/${navigation.previous.moduleSlug}/${navigation.previous.lessonSlug}`}
            data-testid="lesson-nav-previous"
            className="group rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04] px-4 py-3 transition-all"
          >
            <p className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
              Aula anterior
            </p>
            <p className="text-sm text-white mt-1 line-clamp-1">{navigation.previous.title}</p>
          </Link>
        ) : <div />}
        {navigation.next ? (
          <Link
            href={`/academy/modules/${navigation.next.moduleSlug}/${navigation.next.lessonSlug}`}
            data-testid="lesson-nav-next"
            className="group rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/[0.04] hover:border-fuchsia-500/40 hover:bg-fuchsia-500/[0.08] px-4 py-3 transition-all text-right"
          >
            <p className="text-[10px] text-fuchsia-300 uppercase tracking-wider flex items-center justify-end gap-1">
              Próxima aula
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </p>
            <p className="text-sm text-white mt-1 line-clamp-1">{navigation.next.title}</p>
          </Link>
        ) : <div />}
      </div>
    </div>
  )
}
