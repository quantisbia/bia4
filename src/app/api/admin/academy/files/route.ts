/**
 * BIA · Academy · Admin · R28 — Upload de PDF direto na aula
 *
 * POST /api/admin/academy/files  (multipart/form-data)
 *   Campos: lessonId, title, file (PDF), e para upload em partes:
 *     fileId? (continuação), chunkIndex, chunkCount, fileName, totalSize
 *
 * Por que em partes: a Vercel limita o corpo de cada request a 4,5 MB.
 * O cliente fatia o PDF em pedaços de 3 MB; o 1º cria o registro
 * (ready=false), os seguintes anexam bytes; o último marca ready=true.
 * Bytes ficam no Postgres (Neon) — sem S3/Blob. Limite total: 40 MB.
 *
 * GET /api/admin/academy/files?lessonId=…  → lista (sem bytes)
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAcademyAdmin } from "@/lib/academy/admin-auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60

export const MAX_FILE_BYTES = 40 * 1024 * 1024
export const MAX_CHUNK_BYTES = 4 * 1024 * 1024

export async function GET(req: NextRequest) {
  const auth = await requireAcademyAdmin()
  if (!auth.ok) return auth.response
  const lessonId = req.nextUrl.searchParams.get("lessonId")
  if (!lessonId) return NextResponse.json({ error: "MISSING_LESSON" }, { status: 400 })
  const files = await prisma.academyFile.findMany({
    where: { lessonId },
    select: { id: true, title: true, fileName: true, mimeType: true, sizeBytes: true, ready: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json({ files })
}

export async function POST(req: NextRequest) {
  const auth = await requireAcademyAdmin()
  if (!auth.ok) return auth.response

  let form: FormData
  try { form = await req.formData() } catch { return NextResponse.json({ error: "INVALID_FORM" }, { status: 400 }) }

  const lessonId = String(form.get("lessonId") ?? "")
  const title = String(form.get("title") ?? "").trim()
  const part = form.get("file")
  const fileId = form.get("fileId") ? String(form.get("fileId")) : null
  const chunkIndex = Number(form.get("chunkIndex") ?? 0)
  const chunkCount = Number(form.get("chunkCount") ?? 1)
  const fileName = String(form.get("fileName") ?? (part instanceof File ? part.name : "arquivo.pdf"))
  const totalSize = Number(form.get("totalSize") ?? (part instanceof File ? part.size : 0))

  if (!lessonId) return NextResponse.json({ error: "MISSING_LESSON" }, { status: 400 })
  if (!(part instanceof Blob)) return NextResponse.json({ error: "MISSING_FILE", message: "Envie o arquivo no campo 'file'." }, { status: 400 })
  if (!Number.isFinite(chunkIndex) || !Number.isFinite(chunkCount) || chunkIndex < 0 || chunkIndex >= chunkCount) {
    return NextResponse.json({ error: "BAD_CHUNK" }, { status: 400 })
  }
  if (totalSize > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "TOO_LARGE", message: `Arquivo acima de ${MAX_FILE_BYTES / 1048576} MB. Comprima o PDF ou divida em partes.` }, { status: 413 })
  }
  const bytes = Buffer.from(await part.arrayBuffer())
  if (bytes.length > MAX_CHUNK_BYTES) return NextResponse.json({ error: "CHUNK_TOO_LARGE" }, { status: 413 })

  const isPdf = /\.pdf$/i.test(fileName) || (part instanceof File && part.type === "application/pdf")
  if (!isPdf) return NextResponse.json({ error: "NOT_PDF", message: "Só PDF por enquanto." }, { status: 415 })

  // 1ª parte → cria
  if (chunkIndex === 0) {
    if (!title) return NextResponse.json({ error: "MISSING_TITLE", message: "Dê um título ao material." }, { status: 400 })
    if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") {
      return NextResponse.json({ error: "NOT_PDF", message: "O conteúdo não parece um PDF válido." }, { status: 415 })
    }
    const lesson = await prisma.academyLesson.findUnique({ where: { id: lessonId }, select: { id: true } })
    if (!lesson) return NextResponse.json({ error: "LESSON_NOT_FOUND" }, { status: 404 })
    const created = await prisma.academyFile.create({
      data: {
        lessonId, title, fileName: fileName.replace(/[^\w.\-() À-ÿ]+/g, "_").slice(0, 160),
        mimeType: "application/pdf", sizeBytes: bytes.length, data: bytes,
        ready: chunkCount === 1, uploadedBy: auth.userId,
      },
      select: { id: true, title: true, fileName: true, sizeBytes: true, ready: true, createdAt: true },
    })
    return NextResponse.json({ file: created, nextChunk: chunkCount === 1 ? null : 1 }, { status: 201 })
  }

  // partes seguintes → anexa bytes (concatenação no próprio Postgres)
  if (!fileId) return NextResponse.json({ error: "MISSING_FILE_ID" }, { status: 400 })
  const existing = await prisma.academyFile.findUnique({ where: { id: fileId }, select: { id: true, lessonId: true, sizeBytes: true, ready: true } })
  if (!existing || existing.lessonId !== lessonId) return NextResponse.json({ error: "FILE_NOT_FOUND" }, { status: 404 })
  if (existing.ready) return NextResponse.json({ error: "ALREADY_COMPLETE" }, { status: 409 })
  if (existing.sizeBytes + bytes.length > MAX_FILE_BYTES) return NextResponse.json({ error: "TOO_LARGE" }, { status: 413 })

  const last = chunkIndex === chunkCount - 1
  await prisma.$executeRaw`UPDATE "academy_files" SET "data" = "data" || ${bytes}::bytea, "sizeBytes" = "sizeBytes" + ${bytes.length}, "ready" = ${last} WHERE "id" = ${fileId}`
  const updated = await prisma.academyFile.findUnique({ where: { id: fileId }, select: { id: true, title: true, fileName: true, sizeBytes: true, ready: true, createdAt: true } })
  return NextResponse.json({ file: updated, nextChunk: last ? null : chunkIndex + 1 })
}
