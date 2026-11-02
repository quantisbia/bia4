/**
 * BIA · Academy · R28 — Descadastro de e-mails de material novo (link do e-mail)
 * GET/POST /api/academy/notifications/unsubscribe?e=<enrollmentId>&t=<hmac>
 * Sem login (token HMAC assinado). Só desliga notifyEmail — o aluno continua
 * vendo os avisos dentro da plataforma e pode religar em /academy/notifications.
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { verifyUnsubscribeToken } from "@/lib/academy/notifications"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function page(title: string, msg: string, ok: boolean) {
  return new NextResponse(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${title}</title><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#0a0514;color:#e8e4ff;font-family:-apple-system,Segoe UI,Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;">
<div style="max-width:460px;padding:32px;text-align:center;">
<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c084fc;font-weight:700;">BIA Academy</div>
<h1 style="font-size:22px;color:#fff;margin:10px 0 12px;">${title}</h1>
<p style="color:#c7bfe6;line-height:1.6;font-size:15px;">${msg}</p>
<a href="/academy/notifications" style="display:inline-block;margin-top:18px;color:#fff;text-decoration:none;background:${ok ? "linear-gradient(90deg,#a855f7,#ec4899)" : "#3b3650"};padding:11px 20px;border-radius:10px;font-weight:700;font-size:14px;">Abrir minhas notificações</a>
</div></body></html>`, { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } })
}

async function handle(req: NextRequest) {
  const e = req.nextUrl.searchParams.get("e") ?? ""
  const t = req.nextUrl.searchParams.get("t") ?? ""
  if (!e || !t || !verifyUnsubscribeToken(e, t)) return page("Link inválido", "Este link de descadastro não é válido ou já expirou. Você pode ajustar a preferência dentro da plataforma, em Notificações.", false)
  const r = await prisma.academyEnrollment.updateMany({ where: { id: e }, data: { notifyEmail: false } })
  if (r.count === 0) return page("Matrícula não encontrada", "Não encontramos esta matrícula. Se o problema persistir, fale com suporte@quantis.bio.", false)
  return page("E-mails desativados", "Você não vai mais receber e-mails de material novo da BIA Academy. Os avisos continuam disponíveis no sininho da plataforma, e você pode religar quando quiser.", true)
}
export const GET = handle
export const POST = handle
