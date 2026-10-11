/**
 * BIA · Academy · Admin · Exportação de leads (CSV) — R13.14.1
 *
 * GET /api/library/leads/export?q=&resource=
 *
 * Retorna CSV com todos os leads capturados pela biblioteca brinde.
 * Só ADMIN / INSTRUCTOR / SUPERADMIN. Respeita os mesmos filtros da UI.
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { isSuperAdmin } from "@/lib/auth/admin-shared"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function escapeCsv(v: unknown): string {
  if (v === null || v === undefined) return ""
  const s = String(v)
  // Se contém vírgula, aspas ou quebra de linha → envolve em aspas e dobra aspas internas
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function fmtIso(d: Date | null | undefined): string {
  if (!d) return ""
  return d.toISOString()
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const email = session.user.email ?? ""
  const role = (session.user as { role?: string }).role ?? "USER"
  const superAdmin = isSuperAdmin(email)
  const hasElevatedRole = role === "ADMIN" || role === "INSTRUCTOR"
  if (!superAdmin && !hasElevatedRole) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
  }

  const url = new URL(req.url)
  const search = (url.searchParams.get("q") ?? "").trim()
  const resource = url.searchParams.get("resource")

  const where: Parameters<typeof prisma.libraryLead.findMany>[0]["where"] = {}
  if (search) {
    where.OR = [
      { email:       { contains: search, mode: "insensitive" } },
      { name:        { contains: search, mode: "insensitive" } },
      { institution: { contains: search, mode: "insensitive" } },
    ]
  }
  if (resource) where.resourceId = resource

  const leads = await prisma.libraryLead.findMany({
    where,
    orderBy: { lastDownloadAt: "desc" },
  })

  // Monta CSV com BOM (para Excel reconhecer UTF-8)
  const headers = [
    "nome", "email", "instituicao", "atuacao",
    "recurso_id", "recurso_titulo",
    "downloads", "primeiro_download", "ultimo_download",
    "opt_in_marketing",
    "utm_source", "utm_medium", "utm_campaign", "referrer",
    "criado_em",
  ]
  const rows = leads.map((l) => [
    l.name,
    l.email,
    l.institution,
    l.role ?? "",
    l.resourceId,
    l.resourceTitle,
    l.downloadCount,
    fmtIso(l.firstDownloadAt),
    fmtIso(l.lastDownloadAt),
    l.consentMarketing ? "sim" : "nao",
    l.utmSource ?? "",
    l.utmMedium ?? "",
    l.utmCampaign ?? "",
    l.referrer ?? "",
    fmtIso(l.createdAt),
  ])

  const BOM = "\uFEFF"
  const csv = BOM + [
    headers.join(","),
    ...rows.map((r) => r.map(escapeCsv).join(",")),
  ].join("\r\n")

  const stamp = new Date().toISOString().slice(0, 10)
  const filename = `library-leads-${stamp}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  })
}
