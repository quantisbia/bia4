/**
 * BIA · Academy · R13.14
 *
 * GET /api/academy/certificates/lesson/[lessonId]
 *
 * Gera (ou re-gera) o PDF de certificado da aula para o aluno logado.
 * Requer:
 *   - Sessão válida (401 se não)
 *   - AcademyEnrollment ativa (403 se não)
 *   - Aula com progresso COMPLETED (403 se não)
 *
 * Cria AcademyLessonCertificate lazily (só na primeira vez).
 * Código único: BIA-AULA-{YEAR}-{SEQ6} (ex: BIA-AULA-2027-000001).
 *
 * Resposta: PDF binário (Content-Type: application/pdf) com nome
 * amigável para download.
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { hasAccess } from "@/lib/academy/enrollment"
import {
  generateLessonCertificatePdf,
  generateLessonCertCode,
  DEFAULT_HOURS_PER_LESSON,
} from "@/lib/academy/certificate-generator"

export const dynamic = "force-dynamic"

export async function GET(
  req: Request,
  context: { params: Promise<{ lessonId: string }> | { lessonId: string } },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  const params = context.params instanceof Promise ? await context.params : context.params
  const lessonId = params.lessonId

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { academyEnrollment: true },
  })
  if (!user?.academyEnrollment || !hasAccess(user.academyEnrollment)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Matrícula inválida ou expirada." },
      { status: 403 },
    )
  }

  const enrollment = user.academyEnrollment

  // Buscar aula + verificar que o aluno concluiu
  const lesson = await prisma.academyLesson.findUnique({
    where: { id: lessonId },
    include: { module: true },
  })
  if (!lesson) {
    return NextResponse.json({ error: "LESSON_NOT_FOUND" }, { status: 404 })
  }

  const progress = await prisma.academyProgress.findUnique({
    where: {
      enrollmentId_lessonId: {
        enrollmentId: enrollment.id,
        lessonId: lesson.id,
      },
    },
  })
  if (!progress || progress.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "LESSON_NOT_COMPLETED", message: "Esta aula ainda não foi concluída." },
      { status: 403 },
    )
  }

  // Upsert certificate (lazy: só cria na primeira vez)
  const existing = await prisma.academyLessonCertificate.findUnique({
    where: {
      enrollmentId_lessonId: {
        enrollmentId: enrollment.id,
        lessonId: lesson.id,
      },
    },
  })

  let cert = existing
  if (!cert) {
    const year = new Date().getFullYear()
    const sequential = (await prisma.academyLessonCertificate.count()) + 1
    const code = generateLessonCertCode(year, sequential)
    cert = await prisma.academyLessonCertificate.create({
      data: {
        enrollmentId: enrollment.id,
        lessonId: lesson.id,
        code,
      },
    })
  }

  // Gerar PDF
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (req.headers.get("origin") ?? "https://biaquantis.bio")
  const verifyUrl = `${baseUrl}/verify/${cert.code}`

  const pdf = generateLessonCertificatePdf({
    studentName: user.name ?? user.email,
    lessonTitle: lesson.title,
    moduleTitle: lesson.module.title,
    moduleOrder: lesson.module.order,
    lessonOrder: lesson.order,
    durationHours: DEFAULT_HOURS_PER_LESSON,
    code: cert.code,
    issuedAt: cert.issuedAt,
    verifyUrl,
  })

  // Marca pdfGeneratedAt
  await prisma.academyLessonCertificate.update({
    where: { id: cert.id },
    data: { pdfGeneratedAt: new Date() },
  })

  const filename = `certificado-${cert.code}.pdf`
  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-cache",
    },
  })
}
