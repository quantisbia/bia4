/**
 * BIA · Notebook · API de imagens — R12.66
 *
 * GET    /api/notebook/[id]/images                → lista imagens da entrada
 * POST   /api/notebook/[id]/images                → faz upload de nova imagem
 *                                                   (base64 no Postgres — R12.70 migra p/ Vercel Blob)
 * DELETE /api/notebook/[id]/images?imageId=xyz    → remove uma imagem específica
 *
 * Segurança: sempre valida ownership (userId da sessão === userId da entry/imagem).
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

// Limite de tamanho seguro para base64-in-Postgres.
// 5 MB de bytes originais ≈ 6.7 MB em base64. Deixamos margem em 8 MB de string.
const MAX_BASE64_STRING_LENGTH = 8 * 1024 * 1024
const MAX_ORIGINAL_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME_PREFIX = "image/"
const ALLOWED_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
])

// ────────────────────────────────────────────────────────────
// GET — listar imagens da entrada
// ────────────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  // Confirma ownership da entrada
  const entry = await prisma.notebookEntry.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true, title: true, currentVersion: true },
  })
  if (!entry) {
    return NextResponse.json({ error: "Entrada não encontrada" }, { status: 404 })
  }

  const url = new URL(req.url)
  const versionParam = url.searchParams.get("version")
  const includeData = url.searchParams.get("includeData") === "true"

  const where: {
    entryId: string
    userId: string
    versionNumber?: number
  } = {
    entryId: entry.id,
    userId: session.user.id,
  }
  if (versionParam) {
    const v = Number(versionParam)
    if (Number.isFinite(v) && v > 0) where.versionNumber = v
  }

  const images = await prisma.notebookImage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      entryId: true,
      userId: true,
      title: true,
      caption: true,
      experimentId: true,
      sampleNumber: true,
      tags: true,
      observations: true,
      versionNumber: true,
      mimeType: true,
      sizeBytes: true,
      width: true,
      height: true,
      storageUrl: true,
      createdAt: true,
      updatedAt: true,
      // Base64 é pesado; só devolve se o caller explicitamente pedir.
      ...(includeData ? { dataBase64: true } : {}),
    },
  })

  return NextResponse.json({
    entryId: entry.id,
    entryTitle: entry.title,
    currentVersion: entry.currentVersion,
    total: images.length,
    images,
  })
}

// ────────────────────────────────────────────────────────────
// POST — upload de nova imagem (base64)
// ────────────────────────────────────────────────────────────
const uploadSchema = z.object({
  // Aceita dataURL completa ("data:image/png;base64,...") ou base64 puro + mimeType separado
  dataBase64: z.string().min(10),
  mimeType: z.string().optional(),
  title: z.string().max(200).optional().nullable(),
  caption: z.string().max(500).optional().nullable(),
  experimentId: z.string().max(100).optional().nullable(),
  sampleNumber: z.string().max(100).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  observations: z.string().max(2000).optional().nullable(),
  versionNumber: z.number().int().positive().optional().nullable(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
})

/**
 * Detecta mimeType a partir de dataURL "data:image/xxx;base64,...."
 * Retorna null se não for dataURL.
 */
function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl)
  if (!match) return null
  return { mimeType: match[1].trim().toLowerCase(), base64: match[2] }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = uploadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  // Confirma ownership
  const entry = await prisma.notebookEntry.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true, currentVersion: true },
  })
  if (!entry) {
    return NextResponse.json({ error: "Entrada não encontrada" }, { status: 404 })
  }

  // Normaliza mimeType + base64 (aceita dataURL OU base64 puro)
  let mimeType = parsed.data.mimeType?.toLowerCase() ?? ""
  let base64Payload = parsed.data.dataBase64

  const dataUrlMatch = parseDataUrl(base64Payload)
  if (dataUrlMatch) {
    mimeType = dataUrlMatch.mimeType
    base64Payload = dataUrlMatch.base64
  }

  if (!mimeType || !mimeType.startsWith(ALLOWED_MIME_PREFIX)) {
    return NextResponse.json(
      { error: "mimeType inválido — deve ser image/*" },
      { status: 400 },
    )
  }
  if (!ALLOWED_MIMES.has(mimeType)) {
    return NextResponse.json(
      { error: `Tipo de imagem não suportado: ${mimeType}` },
      { status: 400 },
    )
  }

  // Sanidade da string base64
  if (base64Payload.length > MAX_BASE64_STRING_LENGTH) {
    return NextResponse.json(
      { error: `Imagem muito grande. Limite: ${MAX_ORIGINAL_BYTES / (1024 * 1024)} MB (${MAX_BASE64_STRING_LENGTH} chars base64)` },
      { status: 413 },
    )
  }
  if (!/^[A-Za-z0-9+/=\s]+$/.test(base64Payload)) {
    return NextResponse.json({ error: "Payload base64 inválido" }, { status: 400 })
  }

  // Calcula tamanho original em bytes (aprox.)
  const cleanBase64 = base64Payload.replace(/\s+/g, "")
  const paddingChars = (cleanBase64.match(/=+$/) || [""])[0].length
  const sizeBytes = Math.floor((cleanBase64.length * 3) / 4) - paddingChars

  if (sizeBytes > MAX_ORIGINAL_BYTES) {
    return NextResponse.json(
      { error: `Imagem excede ${MAX_ORIGINAL_BYTES / (1024 * 1024)} MB` },
      { status: 413 },
    )
  }

  // Reconstrói dataURL para armazenar (padrão que o front pode usar direto em <img src>)
  const storedDataUrl = `data:${mimeType};base64,${cleanBase64}`

  const image = await prisma.notebookImage.create({
    data: {
      entryId: entry.id,
      userId: session.user.id,
      title: parsed.data.title ?? null,
      caption: parsed.data.caption ?? null,
      experimentId: parsed.data.experimentId ?? null,
      sampleNumber: parsed.data.sampleNumber ?? null,
      tags: parsed.data.tags ?? [],
      observations: parsed.data.observations ?? null,
      versionNumber: parsed.data.versionNumber ?? entry.currentVersion,
      mimeType,
      sizeBytes,
      dataBase64: storedDataUrl,
      storageUrl: null, // R12.70: preencher com URL Vercel Blob e limpar dataBase64
      width: parsed.data.width ?? null,
      height: parsed.data.height ?? null,
    },
    select: {
      id: true,
      entryId: true,
      title: true,
      caption: true,
      experimentId: true,
      sampleNumber: true,
      tags: true,
      observations: true,
      versionNumber: true,
      mimeType: true,
      sizeBytes: true,
      width: true,
      height: true,
      createdAt: true,
    },
  })

  return NextResponse.json(
    { success: true, image },
    { status: 201 },
  )
}

// ────────────────────────────────────────────────────────────
// DELETE — remove uma imagem
// ────────────────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const url = new URL(req.url)
  const imageId = url.searchParams.get("imageId")
  if (!imageId) {
    return NextResponse.json(
      { error: "Parâmetro imageId obrigatório" },
      { status: 400 },
    )
  }

  // Confirma ownership da entrada
  const entry = await prisma.notebookEntry.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true },
  })
  if (!entry) {
    return NextResponse.json({ error: "Entrada não encontrada" }, { status: 404 })
  }

  // Confirma que a imagem pertence à mesma entry E ao mesmo usuário
  const image = await prisma.notebookImage.findFirst({
    where: {
      id: imageId,
      entryId: entry.id,
      userId: session.user.id,
    },
    select: { id: true },
  })
  if (!image) {
    return NextResponse.json({ error: "Imagem não encontrada" }, { status: 404 })
  }

  await prisma.notebookImage.delete({ where: { id: image.id } })

  return NextResponse.json({ success: true, imageId: image.id })
}
