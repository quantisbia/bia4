/**
 * BIA · Academy · Admin · Leads da biblioteca — R13.14.1
 *
 * Rota: /dashboard/admin/academy/leads
 *
 * Lista todas as pessoas que baixaram brindes (white papers open-access)
 * da biblioteca, agrupadas em uma tabela com busca por email/nome e
 * exportação CSV (link direto para /api/library/leads/export).
 *
 * Permissão: SUPERADMIN (hardcoded) ou role ∈ {ADMIN, INSTRUCTOR}.
 */
import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db/prisma"
import { checkAcademyAdminOrRedirect } from "@/lib/academy/admin-auth"
import {
  ChevronLeft, Users, Download, Gift, Building2, Mail, Calendar,
  TrendingUp, BarChart3, CheckCircle2,
} from "lucide-react"

export const dynamic = "force-dynamic"

type SearchParams = Promise<{ q?: string; resource?: string }>

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(d)
}

export default async function LibraryLeadsAdminPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const redirectTo = await checkAcademyAdminOrRedirect()
  if (redirectTo) redirect(redirectTo)

  const { q, resource } = await searchParams
  const search = (q ?? "").trim()

  // Query com filtros
  const where: Parameters<typeof prisma.libraryLead.findMany>[0]["where"] = {}
  if (search) {
    where.OR = [
      { email:       { contains: search, mode: "insensitive" } },
      { name:        { contains: search, mode: "insensitive" } },
      { institution: { contains: search, mode: "insensitive" } },
    ]
  }
  if (resource) {
    where.resourceId = resource
  }

  const [leads, totalLeads, totalDownloads, byResource, byInstitutionRaw, uniqueInstitutions, withConsent] =
    await Promise.all([
      prisma.libraryLead.findMany({
        where,
        orderBy: { lastDownloadAt: "desc" },
        take: 500, // paginação virá se precisar
      }),
      prisma.libraryLead.count(),
      prisma.libraryLead.aggregate({ _sum: { downloadCount: true } }),
      prisma.libraryLead.groupBy({
        by: ["resourceId", "resourceTitle"],
        _count:  { _all: true },
        _sum:    { downloadCount: true },
        orderBy: { _count: { _all: "desc" } },
      }),
      prisma.libraryLead.groupBy({
        by: ["institution"],
        _count: { _all: true },
        orderBy: { _count: { institution: "desc" } },
        take: 10,
      }),
      prisma.libraryLead.findMany({
        distinct: ["institution"],
        select:   { institution: true },
      }).then((rows) => rows.length),
      prisma.libraryLead.count({ where: { consentMarketing: true } }),
    ])

  const totalDownloadsSum = totalDownloads._sum.downloadCount ?? 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8" data-testid="admin-leads-root">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/dashboard/admin" className="hover:text-fuchsia-300 flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" />
          Admin
        </Link>
        <span className="text-gray-700">/</span>
        <Link href="/dashboard/admin/academy" className="hover:text-fuchsia-300">
          BIA Academy
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-400">Leads da biblioteca</span>
      </nav>

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-300/80">
            <Gift className="w-3.5 h-3.5" />
            Captura de leads
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Leads da biblioteca</h1>
          <p className="text-sm text-gray-400 max-w-2xl">
            Pessoas que preencheram o formulário antes de baixar os white papers
            open-access da Quantis. Ordenado pelo download mais recente.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/library/leads/export${search || resource ? `?${new URLSearchParams({ ...(search && { q: search }), ...(resource && { resource }) })}` : ""}`}
            data-testid="leads-export-csv"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/[0.08] hover:bg-emerald-500/[0.15] text-emerald-200 text-sm font-medium transition-all"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </a>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={Users}       label="Leads únicos"            value={totalLeads}            tone="violet" testid="stat-total-leads" />
        <StatCard icon={Download}    label="Downloads totais"        value={totalDownloadsSum}     tone="amber"  testid="stat-total-downloads" />
        <StatCard icon={Building2}   label="Instituições distintas"  value={uniqueInstitutions}    tone="fuchsia" testid="stat-institutions" />
        <StatCard icon={CheckCircle2} label="Opt-in marketing"       value={withConsent}           tone="emerald" testid="stat-consent" />
      </div>

      {/* Downloads por recurso */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5" data-testid="section-by-resource">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-fuchsia-300" />
          <h2 className="text-sm font-semibold text-gray-200">Downloads por recurso</h2>
        </div>
        {byResource.length === 0 ? (
          <p className="text-xs text-gray-500 italic">Nenhum download registrado ainda.</p>
        ) : (
          <ul className="space-y-2">
            {byResource.map((r) => (
              <li
                key={r.resourceId}
                className="flex items-center justify-between gap-4 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/5"
              >
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate" title={r.resourceTitle}>
                    {r.resourceTitle}
                  </p>
                  <p className="text-[11px] text-gray-500 font-mono truncate">{r.resourceId}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-xs">
                  <div className="text-right">
                    <span className="text-gray-400">Leads: </span>
                    <span className="text-white font-semibold">{r._count._all}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400">Downloads: </span>
                    <span className="text-amber-300 font-semibold">{r._sum.downloadCount ?? 0}</span>
                  </div>
                  <Link
                    href={`/dashboard/admin/academy/leads?resource=${encodeURIComponent(r.resourceId)}`}
                    className="text-fuchsia-300 hover:text-fuchsia-200 underline underline-offset-2"
                  >
                    Filtrar
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Top instituições */}
      {byInstitutionRaw.length > 0 && (
        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5" data-testid="section-top-institutions">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-300" />
            <h2 className="text-sm font-semibold text-gray-200">Top 10 instituições</h2>
          </div>
          <ul className="grid sm:grid-cols-2 gap-2">
            {byInstitutionRaw.map((inst, i) => (
              <li
                key={inst.institution}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 text-xs"
              >
                <span className="text-gray-300 truncate flex items-center gap-2">
                  <span className="text-[10px] font-mono text-gray-600 w-5">#{i + 1}</span>
                  <Building2 className="w-3 h-3 text-gray-500 shrink-0" />
                  <span className="truncate">{inst.institution}</span>
                </span>
                <span className="text-emerald-300 font-semibold shrink-0">
                  {inst._count._all}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tabela de leads */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02]" data-testid="section-leads-table">
        {/* Toolbar: busca */}
        <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <form className="flex-1 max-w-md" method="GET">
            {resource && <input type="hidden" name="resource" value={resource} />}
            <div className="relative">
              <input
                type="search"
                name="q"
                defaultValue={search}
                placeholder="Buscar por nome, email ou instituição…"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 focus:border-fuchsia-500/60 text-sm text-white placeholder-gray-600 outline-none"
                data-testid="leads-search-input"
              />
              <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </form>
          <div className="text-xs text-gray-500">
            Mostrando <span className="text-white font-semibold">{leads.length}</span>
            {leads.length === 500 && " (máx. 500 — refine a busca)"}
            {(search || resource) && (
              <>
                {" · "}
                <Link href="/dashboard/admin/academy/leads" className="text-fuchsia-300 hover:text-fuchsia-200">
                  limpar filtros
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="leads-table">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-white/5">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Instituição</th>
                <th className="px-4 py-3 font-medium">Atuação</th>
                <th className="px-4 py-3 font-medium">Recurso</th>
                <th className="px-4 py-3 font-medium text-right">Downloads</th>
                <th className="px-4 py-3 font-medium">Opt-in</th>
                <th className="px-4 py-3 font-medium">Último download</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500 italic">
                    {search || resource
                      ? "Nenhum lead corresponde aos filtros."
                      : "Nenhum lead ainda. Compartilhe o link do brinde para capturar os primeiros!"}
                  </td>
                </tr>
              ) : (
                leads.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-white/5 hover:bg-white/[0.02]"
                    data-testid={`lead-row-${l.id}`}
                  >
                    <td className="px-4 py-3 text-white font-medium">{l.name}</td>
                    <td className="px-4 py-3 text-gray-300">
                      <a href={`mailto:${l.email}`} className="hover:text-fuchsia-300">
                        {l.email}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{l.institution}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{l.role ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="font-mono text-gray-400" title={l.resourceTitle}>
                        {l.resourceId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-amber-300 font-semibold">
                      {l.downloadCount}
                    </td>
                    <td className="px-4 py-3">
                      {l.consentMarketing ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-[10px] font-semibold">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Sim
                        </span>
                      ) : (
                        <span className="text-gray-600 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {fmtDate(l.lastDownloadAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Observação */}
      <p className="text-xs text-gray-500 italic">
        Dados coletados em conformidade com a LGPD. O PDF do brinde continua público
        em <span className="font-mono text-gray-400">/library/*.pdf</span> — o
        formulário é um gate de UX para capturar leads qualificados antes do download.
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────── */

function StatCard({
  icon: Icon, label, value, tone, testid,
}: {
  icon: typeof Users
  label: string
  value: number
  tone: "violet" | "fuchsia" | "amber" | "emerald"
  testid: string
}) {
  const styles = {
    violet:  "from-violet-500/10 border-violet-500/30 text-violet-200",
    fuchsia: "from-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-200",
    amber:   "from-amber-500/10 border-amber-500/30 text-amber-200",
    emerald: "from-emerald-500/10 border-emerald-500/30 text-emerald-200",
  }[tone]

  return (
    <div
      data-testid={testid}
      className={`rounded-xl border bg-gradient-to-br to-transparent p-4 ${styles}`}
    >
      <Icon className="w-5 h-5 mb-2 opacity-80" />
      <p className="text-[11px] uppercase tracking-wider opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value.toLocaleString("pt-BR")}</p>
    </div>
  )
}
