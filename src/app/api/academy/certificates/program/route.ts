/**
 * BIA · Academy · R13.14
 *
 * GET /api/academy/certificates/program?partial=1
 *
 * Gera PDF de certificado do programa inteiro:
 *   - Sem query = certificado de CONCLUSÃO (só emite se 100% das aulas
 *     publicadas estão COMPLETED)
 *   - ?partial=1 = DECLARAÇÃO DE PROGRESSO (lista as aulas concluídas
 *     até o momento, sem exigir 100%)
 *
 * Código único: BIA-ACAD-{YEAR}-{SEQ4} (ex: BIA-ACAD-2027-0001)
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { hasAccess } from "@/lib/academy/enrollment"
import {
  generateProgramCertificatePdf,
  generatePartialCertificatePdf,
  generateProgramCertCode,
  DEFAULT_HOURS_PER_LESSON,
  DEFAULT_HOURS_TOTAL_PROGRAM,
} from "@/lib/academy/certificate-generator"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  const url = new URL(req.url)
  const isPartial = url.searchParams.get("partial") === "1"

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

  // Buscar progresso + aulas publicadas
  const [progress, modules] = await Promise.all([
    prisma.academyProgress.findMany({
      where: { enrollmentId: enrollment.id, status: "COMPLETED" },
      include: {
        lesson: { include: { module: true } },
      },
      orderBy: { completedAt: "asc" },
    }),
    prisma.academyModule.findMany({
      where: { isPublished: true },
      include: { lessons: { where: { isPublished: true } } },
    }),
  ])

  const totalPublishedLessons = modules.reduce((s, m) => s + m.lessons.length, 0)
  const completedCount = progress.length
  const totalHours = completedCount * DEFAULT_HOURS_PER_LESSON

  // ───────── MODO PARCIAL (declaração de progresso) ─────────
  if (isPartial) {
    if (completedCount === 0) {
      return NextResponse.json(
        { error: "NO_PROGRESS", message: "Você ainda não concluiu nenhuma aula." },
        { status: 403 },
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.headers.get("origin") ?? "https://biaquantis.bio"
    // Código parcial é gerado on-the-fly (não persiste no banco)
    const seq = (await prisma.academyLessonCertificate.count()) + completedCount
    const partialCode = `BIA-PROG-${new Date().getFullYear()}-${String(seq).padStart(6, "0")}`
    const verifyUrl = `${baseUrl}/verify/${partialCode}`

    const pdf = generatePartialCertificatePdf({
      studentName: user.name ?? user.email,
      completedLessons: progress.map((p) => ({
        moduleOrder: p.lesson.module.order,
        lessonOrder: p.lesson.order,
        title: p.lesson.title,
        moduleTitle: p.lesson.module.title,
      })),
      totalHours,
      code: partialCode,
      issuedAt: new Date(),
      verifyUrl,
    })

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="declaracao-progresso-${partialCode}.pdf"`,
        "Cache-Control": "private, no-cache",
      },
    })
  }

  // ───────── MODO COMPLETO (certificado final) ─────────
  if (completedCount < totalPublishedLessons) {
    return NextResponse.json(
      {
        error: "PROGRAM_NOT_COMPLETED",
        message: `Para o certificado de conclusão, você precisa completar as ${totalPublishedLessons} aulas publicadas. Você concluiu ${completedCount}.`,
        completedCount,
        totalPublishedLessons,
      },
      { status: 403 },
    )
  }

  // Upsert certificado do programa
  const existing = await prisma.academyCertificate.findUnique({
    where: { enrollmentId: enrollment.id },
  })
  let cert = existing
  if (!cert) {
    const year = new Date().getFullYear()
    const seq = (await prisma.academyCertificate.count()) + 1
    const code = generateProgramCertCode(year, seq)
    cert = await prisma.academyCertificate.create({
      data: { enrollmentId: enrollment.id, code },
    })
    // Marca completedAt no enrollment também
    await prisma.academyEnrollment.update({
      where: { id: enrollment.id },
      data: { completedAt: new Date() },
    })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.headers.get("origin") ?? "https://biaquantis.bio"
  const verifyUrl = `${baseUrl}/verify/${cert.code}`

  const pdf = generateProgramCertificatePdf({
    studentName: user.name ?? user.email,
    completedLessonsCount: completedCount,
    totalLessonsCount: totalPublishedLessons,
    totalHours: DEFAULT_HOURS_TOTAL_PROGRAM,
    code: cert.code,
    issuedAt: cert.issuedAt,
    verifyUrl,
  })

  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificado-${cert.code}.pdf"`,
      "Cache-Control": "private, no-cache",
    },
  })
}
