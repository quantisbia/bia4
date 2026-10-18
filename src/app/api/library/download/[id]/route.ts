/**
 * BIA · Library · R13.15.2 · Download autenticado de materiais exclusivos
 *
 * GET /api/library/download/[id]
 *
 * Fluxo de autorização (defense in depth):
 *   1. Autentica via NextAuth (session.user.email obrigatório)
 *   2. Localiza o material em QUANTIS_WHITE_PAPERS; precisa ser
 *      restrictedToStudents=true + privateFilePath definido
 *   3. Busca a matrícula do usuário em AcademyEnrollment pelo userId
 *   4. Verifica hasAccess (ACTIVE ou COMPLETED); PENDING/EXPIRED = 403
 *   5. Lê o arquivo de /private-library/ via fs e faz stream pro cliente
 *      com Content-Type: application/pdf e Content-Disposition inline
 *
 * Falhas possíveis:
 *   - 401 Unauthorized → não logado → redirect pra /login?callbackUrl=/academy
 *   - 403 Forbidden → logado mas sem matrícula ativa → redirect pra /academy#ebooks
 *   - 404 Not Found → material não existe OU não é restricted
 *   - 500 → arquivo físico sumiu do disco (configuração)
 *
 * Decisões:
 *   - Admins (SUPERADMIN_EMAILS + role=ADMIN) sempre têm acesso (defesa em
 *     profundidade: mesmo sem matrícula, admin pode baixar pra validar).
 *   - Logs mínimos — não gravamos tabela de downloads (menos LGPD risk).
 *   - Edge runtime NÃO funciona aqui (precisa fs.readFile), por isso
 *     runtime="nodejs" explícito.
 */
import { NextRequest, NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { getStudentOnlyMaterialById } from "@/lib/academy/library-content"
import { hasAccess } from "@/lib/academy/enrollment"
import { isSuperAdmin } from "@/lib/auth/admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// R13.15.6 · Next 14.2: params é objeto síncrono, não Promise.
// (A assinatura Promise só vale em Next 15+)
type RouteParams = { params: { id: string } }

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = params

  // ── (1) Autenticação ─────────────────────────────────────────
  const session = await auth()
  const email = session?.user?.email?.toLowerCase().trim()
  if (!email) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", `/academy#ebooks`)
    loginUrl.searchParams.set("intent", "download-ebook")
    return NextResponse.redirect(loginUrl)
  }

  // ── (2) Material existe e é restrito a alunos? ──────────────
  const material = getStudentOnlyMaterialById(id)
  if (!material) {
    return NextResponse.json(
      { error: "Material não encontrado ou não disponível para download autenticado." },
      { status: 404 },
    )
  }

  // ── (3) Carrega usuário + matrícula ─────────────────────────
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, email: true, name: true },
  })
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 403 })
  }

  // ── (4) Admin bypass OU matrícula ACTIVE/COMPLETED ──────────
  const isAdmin = user.role === "ADMIN" || isSuperAdmin(user.email)

  if (!isAdmin) {
    const enrollment = await prisma.academyEnrollment.findUnique({
      where: { userId: user.id },
      select: { accessUntil: true, completedAt: true },
    })

    if (!enrollment || !hasAccess(enrollment)) {
      // Redireciona pra landing com âncora na seção de ebooks + mensagem
      const redirectUrl = new URL("/academy", req.url)
      redirectUrl.hash = "ebooks"
      redirectUrl.searchParams.set("gate", "student-only")
      redirectUrl.searchParams.set("resource", id)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // ── (5) Lê o arquivo do diretório privado ───────────────────
  // R13.15.4: PDFs agora ficam em /src/content/ebooks/ (dentro de /src),
  // o que garante inclusão no bundle Vercel sem depender de configuração
  // específica. process.cwd() na Vercel é a raiz do bundle.
  const absPath = resolve(process.cwd(), material.privateFilePath!)
  let fileBuf: Buffer
  try {
    fileBuf = await readFile(absPath)
  } catch (err) {
    console.error(`[library/download] Arquivo não encontrado no disco: ${absPath}`, err)
    return NextResponse.json(
      { error: "Arquivo temporariamente indisponível. Contate o suporte." },
      { status: 500 },
    )
  }

  // Nome do arquivo que aparece no download do browser
  const downloadName = `${id}.pdf`

  return new NextResponse(fileBuf as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": fileBuf.length.toString(),
      // inline → abre no browser; se usuário quiser salvar, usa botão
      "Content-Disposition": `inline; filename="${downloadName}"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      "X-Frame-Options": "SAMEORIGIN",
    },
  })
}
