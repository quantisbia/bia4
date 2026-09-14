/**
 * BIA · Academy · Admin — Lista de módulos (R13.10.1)
 *
 * Server component com gate de autorização.
 * Lista os 12 módulos com contagem de aulas e status de publicação.
 * Cada card leva para /dashboard/admin/academy/[moduleSlug] para editar.
 */
import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db/prisma"
import { checkAcademyAdminOrRedirect } from "@/lib/academy/admin-auth"
import {
  GraduationCap, BookOpen, CheckCircle2, Circle, ArrowRight, ChevronLeft,
  Sparkles, FileText, Video,
} from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AcademyAdminHomePage() {
  const redirectTo = await checkAcademyAdminOrRedirect()
  if (redirectTo) redirect(redirectTo)

  const modules = await prisma.academyModule.findMany({
    orderBy: { order: "asc" },
    include: {
      _count: { select: { lessons: true } },
      lessons: {
        select: { id: true, isPublished: true },
      },
    },
  })

  // Total geral
  let totalLessons = 0
  let publishedLessons = 0
  let publishedModules = 0
  for (const m of modules) {
    totalLessons += m._count.lessons
    publishedLessons += m.lessons.filter(l => l.isPublished).length
    if (m.isPublished) publishedModules++
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8" data-testid="admin-academy-root">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/dashboard/admin" className="hover:text-fuchsia-300 flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" />
          Admin
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-400">BIA Academy</span>
      </nav>

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-fuchsia-300/80">
            <GraduationCap className="w-3.5 h-3.5" />
            Admin · Academy
          </div>
          <h1 className="text-3xl font-bold text-white">Gerenciar o programa</h1>
          <p className="text-sm text-gray-400 max-w-2xl">
            Edite módulos e aulas, publique conteúdo, adicione anexos e configure biaHooks
            (integração com as ferramentas da BIA).
          </p>
        </div>

        {/* Stats compactos */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2">
            <div className="text-xl font-bold text-fuchsia-300">
              {publishedModules}<span className="text-sm text-gray-600">/{modules.length}</span>
            </div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Módulos pub.</div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2">
            <div className="text-xl font-bold text-fuchsia-300">
              {publishedLessons}<span className="text-sm text-gray-600">/{totalLessons}</span>
            </div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Aulas pub.</div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2">
            <div className="text-xl font-bold text-fuchsia-300">12</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Meta</div>
          </div>
        </div>
      </header>

      {/* Ajuda inline */}
      <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/[0.04] p-4 text-sm text-gray-300 flex gap-3">
        <Sparkles className="w-4 h-4 text-fuchsia-300 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-fuchsia-200 font-medium">Fluxo recomendado para lançar uma aula</p>
          <ol className="text-xs text-gray-400 list-decimal list-inside space-y-0.5">
            <li>Clique no módulo → &quot;Nova aula&quot; para criar em rascunho</li>
            <li>Cole a URL do YouTube (aceita várias formas — youtu.be, watch?v=…, embed)</li>
            <li>Preencha título, objetivo, resumo e duração; anexe PDFs e links úteis</li>
            <li>Configure biaHook se a aula tem prática na BIA (Formulator Pro, Bioimpressão…)</li>
            <li>Marque &quot;Publicar&quot; quando estiver pronto — aluno passa a ver imediatamente</li>
          </ol>
        </div>
      </div>

      {/* Lista de módulos */}
      <div className="space-y-3" data-testid="admin-academy-modules-list">
        {modules.map(mod => {
          const modPublished = mod.lessons.filter(l => l.isPublished).length
          const modTotal = mod._count.lessons
          const modPct = modTotal === 0 ? 0 : Math.round((modPublished / modTotal) * 100)

          return (
            <Link
              key={mod.id}
              href={`/dashboard/admin/academy/${mod.slug}`}
              data-testid={`admin-academy-module-${mod.order}`}
              className={`group flex items-center gap-4 rounded-xl border p-4 transition-all ${
                mod.isPublished
                  ? "border-fuchsia-500/20 bg-fuchsia-500/[0.03] hover:border-fuchsia-500/40 hover:bg-fuchsia-500/[0.06]"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                mod.isPublished
                  ? "bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border-fuchsia-500/30"
                  : "bg-white/[0.04] border-white/10"
              }`}>
                <span className={`text-lg font-bold ${
                  mod.isPublished ? "text-fuchsia-300" : "text-gray-500"
                }`}>
                  {mod.order.toString().padStart(2, "0")}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-base font-bold text-white">{mod.title}</h2>
                  {mod.isPublished ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Publicado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/[0.06] text-gray-500 border border-white/[0.08]">
                      <Circle className="w-2.5 h-2.5" />
                      Rascunho
                    </span>
                  )}
                </div>
                {mod.description && (
                  <p className="text-xs text-gray-400 line-clamp-1 mb-2">{mod.description}</p>
                )}
                <div className="flex items-center gap-4 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    {modTotal} {modTotal === 1 ? "aula" : "aulas"}
                  </span>
                  {modTotal > 0 && (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {modPublished} publicada{modPublished === 1 ? "" : "s"} ({modPct}%)
                    </span>
                  )}
                  <span className="text-gray-700">slug: <code className="text-gray-500">{mod.slug}</code></span>
                </div>
              </div>

              <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-fuchsia-300 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
