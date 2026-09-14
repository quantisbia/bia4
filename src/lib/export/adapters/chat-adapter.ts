/**
 * BIA · Adapter Chat IA → ExportableContent — R12.68
 *
 * Converte uma sessão de Chat IA (mensagens do usuário + respostas do
 * assistente) em ExportableContent.
 *
 * Filtro (opção C aprovada pela Janaina):
 *   - "all"        → transcrição integral verbatim
 *   - "assistant"  → só as respostas da IA (vira "resumo científico")
 *   - "user"       → só as perguntas do usuário (útil para revisão de dúvidas)
 *
 * Cada mensagem vira uma seção do PDF/DOCX com heading (autor + hora) e
 * parágrafo com o conteúdo. Blocos de código dentro da mensagem são
 * detectados heuristicamente e viram CodeBlock.
 */
import type { ExportableContent, ContentBlock } from "../types"

// ─── Tipos espelhados de /dashboard/chat/page.tsx ────────────────

export interface ChatMessageLike {
  id?: string
  role: "user" | "assistant" | "system"
  content: string
  createdAt?: string | Date
}

export interface ChatSessionLike {
  id: string
  title?: string
  mode?: string
  createdAt?: string | Date
}

export type ChatExportFilter = "all" | "assistant" | "user"

/**
 * Constrói ExportableContent a partir de uma sessão + mensagens + filtro.
 */
export function buildContentFromChatSession(params: {
  session: ChatSessionLike
  messages: ChatMessageLike[]
  filter: ChatExportFilter
  existing?: { entryId: string; currentVersion: number }
}): ExportableContent {
  const { session, messages, filter, existing } = params

  // Aplica filtro (system messages sempre ficam de fora do export)
  const filtered = messages.filter((m) => {
    if (m.role === "system") return false
    if (filter === "all") return m.role === "user" || m.role === "assistant"
    if (filter === "assistant") return m.role === "assistant"
    if (filter === "user") return m.role === "user"
    return true
  })

  const blocks: ContentBlock[] = []

  // Cabeçalho da sessão
  const sessionMeta: Array<{ key: string; value: string }> = []
  if (session.mode) sessionMeta.push({ key: "Modo", value: humanMode(session.mode) })
  sessionMeta.push({
    key: "Escopo do export",
    value: filterLabel(filter),
  })
  sessionMeta.push({
    key: "Total de mensagens",
    value: `${filtered.length} (${messages.filter((m) => m.role !== "system").length} na sessão original)`,
  })
  if (session.createdAt) {
    sessionMeta.push({ key: "Iniciada em", value: fmtDate(session.createdAt) })
  }
  blocks.push({ type: "keyvalue", pairs: sessionMeta })

  if (filtered.length === 0) {
    blocks.push({
      type: "callout",
      variant: "info",
      text: `Nenhuma mensagem encontrada com o filtro "${filterLabel(filter)}".`,
    })
  }

  // Cada mensagem = uma seção
  filtered.forEach((m, idx) => {
    blocks.push({ type: "divider" })
    const authorLabel = m.role === "assistant" ? "🤖 BIA" : "👤 Você"
    const time = m.createdAt ? ` · ${fmtTime(m.createdAt)}` : ""
    blocks.push({
      type: "heading",
      level: 3,
      text: `${authorLabel}${time}`,
    })

    // Detecta blocos de código dentro do content (```lang ... ```)
    const parts = splitCodeFences(m.content)
    for (const part of parts) {
      if (part.kind === "code") {
        blocks.push({ type: "code", language: part.lang, content: part.text })
      } else if (part.text.trim()) {
        // Quebra em parágrafos por linha em branco dupla
        const paragraphs = part.text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
        for (const p of paragraphs) {
          blocks.push({ type: "paragraph", text: p })
        }
      }
    }

    // Se for a última mensagem, não adiciona espaço extra
    void idx
  })

  const title = session.title?.trim() || `Conversa · ${fmtDate(session.createdAt ?? new Date())}`
  const subtitle =
    filter === "assistant"
      ? "Respostas da IA científica BIA"
      : filter === "user"
        ? "Perguntas do usuário"
        : "Transcrição integral"

  return {
    title,
    subtitle,
    source: "Chat IA",
    entryType: "RESEARCH_LOG",
    tags: uniqTags([
      "chat",
      "ia",
      "conversa",
      filter,
      ...(session.mode ? [slug(session.mode)] : []),
    ]),
    category: "Chat",
    blocks,
    existing,
    metadata: {
      chatSessionId: session.id,
      chatMode: session.mode,
      filter,
      messageCount: filtered.length,
      totalInSession: messages.filter((m) => m.role !== "system").length,
    },
    autoChangeSummary: `Transcrição de chat · filtro=${filter} · ${filtered.length} mensagens`,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Divide o content de uma mensagem em pedaços de texto e blocos de código,
 * detectando cercas de código markdown (```lang ... ```).
 * É defensivo: se as cercas não fecharem, tudo vira texto.
 */
function splitCodeFences(
  content: string,
): Array<{ kind: "text" | "code"; text: string; lang?: string }> {
  if (!content.includes("```")) {
    return [{ kind: "text", text: content }]
  }
  const parts: Array<{ kind: "text" | "code"; text: string; lang?: string }> = []
  const fenceRe = /```(\w*)\n?([\s\S]*?)```/g
  let lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = fenceRe.exec(content)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ kind: "text", text: content.slice(lastIndex, m.index) })
    }
    parts.push({
      kind: "code",
      lang: m[1] || undefined,
      text: m[2] ?? "",
    })
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < content.length) {
    parts.push({ kind: "text", text: content.slice(lastIndex) })
  }
  return parts
}

function fmtDate(input: string | Date): string {
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return String(input)
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d)
}

function fmtTime(input: string | Date): string {
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return String(input)
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

function filterLabel(f: ChatExportFilter): string {
  const map: Record<ChatExportFilter, string> = {
    all: "Transcrição integral (usuário + IA)",
    assistant: "Apenas respostas da IA",
    user: "Apenas perguntas do usuário",
  }
  return map[f]
}

function humanMode(mode: string): string {
  const map: Record<string, string> = {
    general: "Geral",
    formulation: "Formulação",
    protocol: "Protocolo",
    biomaterials: "Biomateriais",
    bioprinting: "Bioimpressão",
    organoids: "Organoides",
    regulatory: "Regulatório",
  }
  return map[mode] ?? mode
}

function slug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
}

function uniqTags(list: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of list) {
    if (!t) continue
    if (seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}
