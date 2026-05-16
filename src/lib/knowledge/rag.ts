/**
 * RAG simples para o Motor de Conhecimento (R12)
 *
 * Busca uploads relevantes do usuário (e públicos) e monta um bloco de contexto
 * para injetar no system prompt do chat BIA.
 *
 * Implementação leve (sem vector DB): faz match por palavras-chave da pergunta
 * contra title/abstract/textContent. Suficiente para um corpus pequeno (<500 itens).
 */

import { prisma } from "@/lib/db/prisma"

export interface RagSnippet {
  id: string
  title: string
  source: "user_upload"
  excerpt: string
  uploadedByMe: boolean
}

const STOPWORDS = new Set([
  // PT
  "o", "a", "os", "as", "de", "da", "do", "das", "dos", "e", "ou", "para", "com",
  "em", "no", "na", "nos", "nas", "por", "que", "qual", "quais", "como", "um",
  "uma", "uns", "umas", "se", "é", "ao", "à", "tem", "tens", "ser", "estar",
  // EN
  "the", "a", "an", "of", "and", "or", "for", "with", "in", "on", "to", "is",
  "are", "what", "which", "how", "by", "from", "this", "that", "be", "as",
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
}

function scoreText(query: string, text: string): number {
  if (!text) return 0
  const qTokens = new Set(tokenize(query))
  if (qTokens.size === 0) return 0
  const tTokens = tokenize(text)
  let hits = 0
  for (const tok of tTokens) {
    if (qTokens.has(tok)) hits++
  }
  return hits
}

function extractExcerpt(text: string, query: string, maxChars = 400): string {
  if (!text) return ""
  if (text.length <= maxChars) return text
  const qTokens = tokenize(query)
  const lower = text.toLowerCase()
  // Encontrar primeira ocorrência de qualquer token da query
  let bestPos = -1
  for (const tok of qTokens) {
    const pos = lower.indexOf(tok)
    if (pos !== -1 && (bestPos === -1 || pos < bestPos)) bestPos = pos
  }
  const start = Math.max(0, bestPos === -1 ? 0 : bestPos - 80)
  return (start > 0 ? "..." : "") + text.slice(start, start + maxChars) + (start + maxChars < text.length ? "..." : "")
}

/**
 * Busca uploads relevantes para a query do usuário.
 * Retorna até `limit` snippets ranqueados por score (palavras em comum).
 */
export async function retrieveUploads(
  query: string,
  userId: string | undefined,
  limit = 3,
): Promise<RagSnippet[]> {
  if (!query.trim()) return []

  try {
    // Buscar uploads do usuário + uploads públicos de outros
    const where = userId
      ? { OR: [{ uploadedBy: userId }, { isPublic: true }] }
      : { isPublic: true }

    const items = await prisma.knowledgeArticle.findMany({
      where: where as any,
      take: 200, // limite de varredura
      orderBy: { createdAt: "desc" },
    })

    const scored = items
      .map((item: any) => {
        const haystack = [item.title, item.abstract ?? "", item.textContent ?? ""]
          .filter(Boolean)
          .join(" ")
        const score = scoreText(query, haystack)
        return { item, score }
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return scored.map(({ item }: any) => ({
      id: item.id,
      title: item.title,
      source: "user_upload" as const,
      excerpt: extractExcerpt(
        item.textContent || item.abstract || item.title,
        query,
      ),
      uploadedByMe: item.uploadedBy === userId,
    }))
  } catch (e) {
    // DB pode não ter os novos campos ainda (schema não migrado) — degrade silencioso
    console.warn("[rag] retrieveUploads falhou:", (e as Error).message)
    return []
  }
}

/**
 * Monta bloco de contexto formatado para o system prompt.
 * Retorna string vazia se nenhum snippet relevante.
 */
export function buildRagContext(snippets: RagSnippet[]): string {
  if (snippets.length === 0) return ""
  const lines = [
    "",
    "## Contexto adicional (uploads do usuário no Motor de Conhecimento BIA)",
    "Os documentos abaixo foram enviados pelo usuário ou pela equipe. Use-os como",
    "referência prioritária quando relevantes à pergunta. Cite-os pelo título.",
    "",
  ]
  snippets.forEach((s, i) => {
    lines.push(`### [${i + 1}] ${s.title}${s.uploadedByMe ? " (seu upload)" : ""}`)
    lines.push(s.excerpt)
    lines.push("")
  })
  return lines.join("\n")
}
