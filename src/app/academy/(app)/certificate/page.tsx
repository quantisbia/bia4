/**
 * BIA · Academy · R13.14 · Página de certificados do aluno
 *
 * Rota: /academy/certificate
 *
 * Mostra:
 *   1. Progresso geral (X/Y aulas concluídas, % completo)
 *   2. Botão "Baixar certificado de conclusão" (habilita se 100%)
 *   3. Botão "Baixar declaração de progresso parcial" (habilita se ≥ 1 aula)
 *   4. Lista de todas as aulas CONCLUÍDAS com botão de download
 *      individual por aula ("Baixar certificado desta aula")
 *   5. Lista de aulas NÃO concluídas (bloqueadas, com cadeado)
 */
import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { hasAccess } from "@/lib/academy/enrollment"
import {
  CheckCircle2, Lock, Trophy, ChevronRight,
  FileText, Sparkles, ArrowLeft, Clock, GraduationCap,
} from "lucide-react"
import { CertificateDownloadButton, ProgramDownloadButton } from "./_components/CertificateButtons"

export const dynamic = "force-dynamic"
export const metadata = { title: "Meus certificados — BIA Academy" }

export default async function CertificatePage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/academy/certificate")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { academyEnrollment: true },
  })
  if (!user?.academyEnrollment || !hasAccess(user.academyEnrollment)) {
    redirect("/academy/welcome")
  }
  const enrollment = user.academyEnrollment

  // Buscar progresso + todas as aulas publicadas
  const [progress, modules] = await Promise.all([
    prisma.academyProgress.findMany({
      where: { enrollmentId: enrollment.id, status: "COMPLETED" },
      include: { lesson: { include: { module: true } } },
      orderBy: { completedAt: "asc" },
    }),
    prisma.academyModule.findMany({
      where: { isPublished: true },
      include: {
        lessons: { where: { isPublished: true }, orderBy: { order: "asc" } },
      },
      orderBy: { order: "asc" },
    }),
  ])

  const totalPublishedLessons = modules.reduce((s, m) => s + m.lessons.length, 0)
  const completedCount = progress.length
  const percentDone = totalPublishedLessons === 0
    ? 0
    : Math.round((completedCount / totalPublishedLessons) * 100)
  const totalHours = completedCount * 2 // 2h por aula

  const isProgramComplete = completedCount === totalPublishedLessons && totalPublishedLessons > 0

  // Lista plana de todas as aulas publicadas, enriquecida com status
  const allLessonsFlat = modules.flatMap((m) =>
    m.lessons.map((l) => {
      const prog = progress.find((p) => p.lessonId === l.id)
      return {
        id: l.id,
        order: l.order,
        title: l.title,
        slug: l.slug,
        moduleOrder: m.order,
        moduleTitle: m.title,
        moduleSlug: m.slug,
        isCompleted: !!prog,
        completedAt: prog?.completedAt ?? null,
      }
    }),
  )

  const completedLessons = allLessonsFlat.filter((l) => l.isCompleted)
  const pendingLessons = allLessonsFlat.filter((l) => !l.isCompleted)

  return (
    <div
      className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8"
      data-testid="academy-certificate-root"
    >
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/academy/dashboard" className="hover:text-fuchsia-300 flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" />
          Dashboard
        </Link>
        <ChevronRight className="w-3 h-3 text-gray-700" />
        <span className="text-gray-400">Certificados</span>
      </nav>

      {/* Header */}
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-200">
          <Trophy className="w-3.5 h-3.5" />
          Meus Certificados
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
          Certificados conquistados
        </h1>
        <p className="text-[15px] text-gray-300 leading-relaxed max-w-3xl">
          Baixe o certificado individual de cada aula que você concluiu, uma declaração parcial
          com todas as aulas feitas até agora, ou o certificado de conclusão do programa inteiro
          (120h) quando terminar os 12 módulos.
        </p>
      </header>

      {/* Progresso geral */}
      <section
        data-testid="certificate-progress-card"
        className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.08] to-fuchsia-500/[0.04] p-6"
      >
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0 shadow-lg shadow-fuchsia-900/30">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-fuchsia-300 mb-1">
              Seu progresso no programa
            </p>
            <p className="text-sm text-gray-300">
              <strong className="text-white">{completedCount}</strong> de{" "}
              <strong className="text-white">{totalPublishedLessons}</strong> aulas publicadas concluídas
              {" · "}
              <strong className="text-white">{totalHours}h</strong> de carga horária acumulada
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-bold text-white">{percentDone}%</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Completo</div>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400 transition-all"
            style={{ width: `${percentDone}%` }}
          />
        </div>
      </section>

      {/* Certificados do programa (parcial + conclusão) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Parcial */}
        <div
          data-testid="certificate-partial-card"
          className="rounded-2xl border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-500/[0.08] to-pink-500/[0.03] p-5 flex flex-col"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-fuchsia-200" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-white mb-1">
                Declaração de Progresso
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Documento parcial que lista as aulas concluídas até o momento.
                Útil para colocar no LinkedIn ou enviar para o RH durante o curso.
              </p>
            </div>
          </div>
          <ProgramDownloadButton
            variant="partial"
            disabled={completedCount === 0}
            label="Baixar declaração parcial"
            testid="btn-download-partial"
          />
          {completedCount === 0 && (
            <p className="text-[10px] text-gray-500 mt-2 text-center">
              Conclua pelo menos 1 aula para desbloquear
            </p>
          )}
        </div>

        {/* Conclusão */}
        <div
          data-testid="certificate-full-card"
          className={`rounded-2xl border p-5 flex flex-col ${
            isProgramComplete
              ? "border-amber-500/35 bg-gradient-to-br from-amber-500/[0.10] to-yellow-500/[0.05]"
              : "border-white/[0.08] bg-white/[0.02]"
          }`}
        >
          <div className="flex items-start gap-3 mb-4">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isProgramComplete
                  ? "bg-amber-500/20 border border-amber-500/40"
                  : "bg-white/[0.04] border border-white/[0.10]"
              }`}
            >
              <Trophy className={`w-5 h-5 ${isProgramComplete ? "text-amber-200" : "text-gray-500"}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-white mb-1">
                Certificado de Conclusão
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Certificado completo do programa BIA Academy (120h). Desbloqueado quando
                você concluir as {totalPublishedLessons} aulas publicadas.
              </p>
            </div>
          </div>
          <ProgramDownloadButton
            variant="full"
            disabled={!isProgramComplete}
            label={isProgramComplete ? "Baixar certificado de conclusão" : "Programa não concluído"}
            testid="btn-download-full"
          />
          {!isProgramComplete && totalPublishedLessons > 0 && (
            <p className="text-[10px] text-gray-500 mt-2 text-center">
              Faltam {totalPublishedLessons - completedCount} aula
              {totalPublishedLessons - completedCount === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </section>

      {/* Aulas concluídas (certificado individual) */}
      {completedLessons.length > 0 && (
        <section data-testid="completed-lessons-section">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Aulas concluídas — certificados individuais
              </h2>
              <p className="text-xs text-gray-500">
                {completedLessons.length} aula{completedLessons.length === 1 ? "" : "s"} ·
                baixe o certificado de cada uma
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {completedLessons.map((l) => (
              <div
                key={l.id}
                data-testid={`completed-lesson-${l.moduleOrder}-${l.order}`}
                className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] hover:border-emerald-500/35 transition-all p-4"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-emerald-500/15 text-emerald-200 border border-emerald-500/30 shrink-0">
                    M{String(l.moduleOrder).padStart(2, "0")}.{l.order}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white leading-snug">{l.title}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                      {l.moduleTitle}
                    </p>
                    {l.completedAt && (
                      <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        Concluída em {new Date(l.completedAt).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                </div>
                <CertificateDownloadButton
                  lessonId={l.id}
                  label="Baixar certificado desta aula"
                  testid={`btn-download-lesson-${l.moduleOrder}-${l.order}`}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Aulas pendentes (bloqueadas) */}
      {pendingLessons.length > 0 && (
        <section data-testid="pending-lessons-section">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.10] flex items-center justify-center">
              <Lock className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Ainda não concluídas
              </h2>
              <p className="text-xs text-gray-500">
                {pendingLessons.length} aula{pendingLessons.length === 1 ? "" : "s"} ·
                conclua para gerar o certificado
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {pendingLessons.slice(0, 15).map((l) => (
              <Link
                key={l.id}
                href={`/academy/modules/${l.moduleSlug}/${l.slug}`}
                className="group rounded-xl border border-white/[0.06] bg-white/[0.015] hover:border-fuchsia-500/25 hover:bg-fuchsia-500/[0.04] px-3 py-2.5 flex items-center gap-2 transition-all"
              >
                <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/[0.04] text-gray-500 shrink-0">
                  M{String(l.moduleOrder).padStart(2, "0")}.{l.order}
                </span>
                <span className="text-xs text-gray-400 flex-1 truncate group-hover:text-gray-200 transition-colors">
                  {l.title}
                </span>
                <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-fuchsia-300 shrink-0" />
              </Link>
            ))}
            {pendingLessons.length > 15 && (
              <p className="text-[11px] text-gray-500 col-span-full text-center py-2">
                + {pendingLessons.length - 15} outras aulas pendentes
              </p>
            )}
          </div>
        </section>
      )}

      {/* Info sobre certificados */}
      <section className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.05] p-5 flex gap-4">
        <Sparkles className="w-5 h-5 text-indigo-300 shrink-0 mt-0.5" />
        <div className="text-sm text-gray-300 space-y-2">
          <p>
            <strong className="text-white">Como funciona:</strong> cada certificado tem um código único (ex:
            <code className="mx-1 px-1.5 py-0.5 rounded bg-violet-500/15 border border-violet-500/25 font-mono text-xs text-fuchsia-200">
              BIA-AULA-2027-000042
            </code>
            ) que pode ser verificado publicamente no site. RH, orientadores e verificadores
            podem conferir a autenticidade em qualquer momento.
          </p>
          <p className="text-xs text-gray-400">
            Carga horária: 2h por aula · 10h por módulo · 120h no programa completo.
            Baseada em vídeo + leitura do conteúdo didático + prática na plataforma BIA.
          </p>
        </div>
      </section>
    </div>
  )
}
