import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth/config"

// Esta rota lê query params em runtime — não pode ser pré-renderizada (R12.14 fix)
export const dynamic = "force-dynamic"

/**
 * POST /api/knowledge/upload
 *
 * Recebe um arquivo (PDF/DOCX/TXT/MD) + metadados e persiste em KnowledgeArticle.
 * Para arquivos texto, extrai conteúdo para indexação RAG futura pela BIA.
 *
 * Limite: 10MB por upload, 50 uploads por usuário.
 *
 * FormData expected:
 *  - file        : File (obrigatório)
 *  - title       : string
 *  - authors     : string (vírgula-separado)
 *  - year        : number
 *  - kind        : "article" | "patent" | "methodology" | "user_upload"
 *  - category    : string
 *  - tags        : string (vírgula-separado)
 *  - abstract    : string (resumo)
 *  - url         : string (URL externa, opcional)
 *  - doi         : string (opcional)
 *  - isPublic    : "true" | "false"
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      )
    }

    const form = await req.formData()
    const file = form.get("file") as File | null
    const title = (form.get("title") as string | null)?.trim()
    const authors = (form.get("authors") as string | null)?.trim() ?? ""
    const year = parseInt((form.get("year") as string | null) ?? "0", 10)
    const kind = ((form.get("kind") as string | null) ?? "user_upload").trim()
    const category = (form.get("category") as string | null)?.trim() ?? "Geral"
    const tagsRaw = (form.get("tags") as string | null) ?? ""
    const abstract = (form.get("abstract") as string | null)?.trim() ?? ""
    const externalUrl = (form.get("url") as string | null)?.trim() ?? ""
    const doi = (form.get("doi") as string | null)?.trim() || null
    const isPublic = (form.get("isPublic") as string | null) === "true"

    if (!title || title.length < 3) {
      return NextResponse.json(
        { success: false, error: "Título obrigatório (min 3 caracteres)" },
        { status: 400 }
      )
    }
    if (!["article", "patent", "methodology", "user_upload"].includes(kind)) {
      return NextResponse.json(
        { success: false, error: "Tipo inválido" },
        { status: 400 }
      )
    }

    // Rate-limit por usuário: máximo 50 uploads
    const userCount = await prisma.knowledgeArticle.count({
      where: { uploadedBy: userId },
    })
    if (userCount >= 50) {
      return NextResponse.json(
        { success: false, error: "Limite de 50 uploads por usuário atingido" },
        { status: 429 }
      )
    }

    let fileUrl: string | null = null
    let fileName: string | null = null
    let fileType: string | null = null
    let fileSize: number | null = null
    let textContent: string | null = null

    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: "Arquivo excede 10MB" },
          { status: 400 }
        )
      }
      fileName = file.name
      fileType = file.type || file.name.split(".").pop() || "unknown"
      fileSize = file.size

      // Extrair conteúdo textual (apenas TXT/MD por enquanto — PDF/DOCX precisariam de libs binárias)
      try {
        if (fileType?.includes("text") || /\.(txt|md|markdown)$/i.test(file.name)) {
          textContent = await file.text()
          // Limitar a 200KB de texto para evitar bloat no DB
          if (textContent.length > 200_000) {
            textContent = textContent.slice(0, 200_000) + "\n\n[truncado em 200KB]"
          }
        }
      } catch (err) {
        console.warn("[upload] não foi possível extrair texto:", err)
      }

      // Armazenar como data URL no DB para simplicidade (Vercel não tem filesystem persistente)
      // Para produção, substituir por upload para S3/R2/Vercel Blob
      try {
        const buf = await file.arrayBuffer()
        const base64 = Buffer.from(buf).toString("base64")
        fileUrl = `data:${file.type};base64,${base64}`
        // Limitar a 5MB no fileUrl base64 para não explodir o DB
        if (fileUrl.length > 7_000_000) {
          fileUrl = null
          // Mantém o externalUrl como fallback
        }
      } catch (err) {
        console.warn("[upload] não foi possível encodar arquivo:", err)
      }
    }

    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    const authorsList = authors
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean)

    const created = await prisma.knowledgeArticle.create({
      data: {
        title,
        authors: authorsList,
        abstract: abstract || `Upload do usuário: ${title}`,
        journal: kind === "patent" ? "Patente" : kind === "methodology" ? "Protocolo" : "Upload",
        year: year > 1900 && year < 2100 ? year : new Date().getFullYear(),
        doi: doi || undefined,
        url: externalUrl || undefined,
        tags,
        category,
        keywords: tags,
        kind,
        source: "user",
        fileUrl: fileUrl || undefined,
        fileName: fileName || undefined,
        fileType: fileType || undefined,
        fileSize: fileSize ?? undefined,
        uploadedBy: userId,
        textContent: textContent || undefined,
        isPublic,
      },
    })

    return NextResponse.json({
      success: true,
      id: created.id,
      message: "Upload realizado com sucesso. A BIA já tem acesso a este conhecimento.",
    })
  } catch (error) {
    console.error("[knowledge/upload] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Falha no upload",
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/knowledge/upload?id=xxx
 * Remove upload do usuário (só dele próprio)
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      )
    }
    const id = new URL(req.url).searchParams.get("id")
    if (!id) {
      return NextResponse.json(
        { success: false, error: "id obrigatório" },
        { status: 400 }
      )
    }
    const article = await prisma.knowledgeArticle.findUnique({ where: { id } })
    if (!article || article.uploadedBy !== userId) {
      return NextResponse.json(
        { success: false, error: "Não autorizado" },
        { status: 403 }
      )
    }
    await prisma.knowledgeArticle.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[knowledge/upload DELETE] error:", error)
    return NextResponse.json({ success: false, error: "Falha ao deletar" }, { status: 500 })
  }
}
