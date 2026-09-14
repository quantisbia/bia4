/**
 * BIA · Academy · Admin API — Criar anexo em aula (R13.10.1)
 *
 * POST /api/admin/academy/attachments
 *   Body: { lessonId, kind: PDF|LINK|STL|GCODE|IMAGE, title, url, sizeBytes? }
 *
 * Nota: nesta sprint aceita apenas URL de anexo (upload real fica pra R13.10.2).
 * URLs típicas: link direto a S3, Drive público, PubMed DOI, GitHub, etc.
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAcademyAdmin } from "@/lib/academy/admin-auth"
import { z } from "zod"

export const dynamic = "force-dynamic"

const CreateAttachmentSchema = z.object({
  lessonId: z.string().min(1),
  kind: z.enum(["PDF", "LINK", "STL", "GCODE", "IMAGE"]),
  title: z.string().min(1).max(200),
  url: z.string().url("URL inválida"),
  sizeBytes: z.number().int().min(0).nullable().optional(),
})

export async function POST(req: NextRequest) {
  const auth = await requireAcademyAdmin()
  if (!auth.ok) return auth.response

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 })
  }

  const parsed = CreateAttachmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const { lessonId, kind, title, url, sizeBytes } = parsed.data

  // Confirma que aula existe
  const lesson = await prisma.academyLesson.findUnique({
    where: { id: lessonId },
    select: { id: true },
  })
  if (!lesson) {
    return NextResponse.json({ error: "LESSON_NOT_FOUND" }, { status: 404 })
  }

  const created = await prisma.academyAttachment.create({
    data: {
      lessonId,
      kind,
      title,
      url,
      sizeBytes: sizeBytes ?? null,
    },
  })

  return NextResponse.json({ attachment: created }, { status: 201 })
}
