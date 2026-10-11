/**
 * BIA · Library · R13.14.1 · Captura de leads do brinde (open-access)
 *
 * POST /api/library/lead
 *   body: { resourceId, name, email, institution, role?, consentMarketing?,
 *           referrer?, utmSource?, utmMedium?, utmCampaign? }
 *
 * Fluxo:
 *   1. Visitante preenche form no modal da landing /academy
 *   2. Esta API valida + salva/atualiza LibraryLead (upsert por email+resource)
 *   3. Retorna { downloadUrl } apontando para o PDF estático em /library/*.pdf
 *      (o PDF segue público — o gate é por UX, não cripto)
 *
 * Decisões:
 *   - UPSERT: mesmo email baixando de novo = incrementa downloadCount
 *   - resourceId precisa existir em QUANTIS_WHITE_PAPERS (defesa contra abuso)
 *   - email passa por normalização lowercase + trim
 *   - sem auth: landing é pública, lead vem de visitante anônimo
 *   - sem rate limit explícito (volume baixo, upsert absorve retries)
 *   - userAgent capturado do header, nunca IP (LGPD-friendly)
 */
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db/prisma"
import { getWhitePaperById } from "@/lib/academy/library-content"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  resourceId:       z.string().min(1).max(100),
  name:             z.string().trim().min(2, "Nome muito curto").max(120),
  email:            z.string().trim().toLowerCase().email("E-mail inválido").max(200),
  institution:      z.string().trim().min(2, "Instituição muito curta").max(200),
  role:             z.string().trim().max(50).optional().nullable(),
  consentMarketing: z.boolean().optional().default(false),
  referrer:         z.string().max(500).optional().nullable(),
  utmSource:        z.string().max(100).optional().nullable(),
  utmMedium:        z.string().max(100).optional().nullable(),
  utmCampaign:      z.string().max(100).optional().nullable(),
})

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => null)
  if (!raw) {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }
  const data = parsed.data

  // Verifica se o white paper existe (defesa contra IDs forjados)
  const wp = getWhitePaperById(data.resourceId)
  if (!wp) {
    return NextResponse.json({ error: "Recurso não encontrado" }, { status: 404 })
  }
  if (!wp.openAccess) {
    return NextResponse.json({ error: "Recurso não é open-access" }, { status: 403 })
  }

  // Metadados leves (sem IP)
  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null

  try {
    const lead = await prisma.libraryLead.upsert({
      where: {
        email_resourceId: {
          email: data.email,
          resourceId: data.resourceId,
        },
      },
      create: {
        resourceId:       data.resourceId,
        resourceTitle:    wp.title,
        name:             data.name,
        email:            data.email,
        institution:      data.institution,
        role:             data.role ?? null,
        consentMarketing: data.consentMarketing,
        userAgent,
        referrer:         data.referrer ?? null,
        utmSource:        data.utmSource ?? null,
        utmMedium:        data.utmMedium ?? null,
        utmCampaign:      data.utmCampaign ?? null,
      },
      update: {
        // Atualiza os dados mais recentes (caso o lead tenha mudado de nome/instituição)
        name:             data.name,
        institution:      data.institution,
        role:             data.role ?? null,
        // Só eleva consent para true, nunca rebaixa (opt-in LGPD)
        consentMarketing: data.consentMarketing ? true : undefined,
        downloadCount:    { increment: 1 },
        lastDownloadAt:   new Date(),
        userAgent,
      },
    })

    return NextResponse.json({
      ok: true,
      downloadUrl: wp.pdfUrl,
      leadId: lead.id,
      downloadCount: lead.downloadCount,
    })
  } catch (err) {
    console.error("[library/lead] erro ao salvar lead:", err)
    return NextResponse.json(
      { error: "Erro interno ao registrar o download" },
      { status: 500 },
    )
  }
}
