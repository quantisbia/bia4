import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { requireCredits } from "@/lib/auth/credits"
import {
  getUserChatSessions,
  createChatSession,
  getChatSession,
  addChatMessage,
} from "@/lib/db/queries"
import { generateChatStream, SYSTEM_PROMPTS, type GeminiMessage } from "@/lib/ai/gemini"
import { Prisma } from "@prisma/client"
import { z } from "zod"

// GET /api/chat — listar sessões
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get("sessionId")

  if (sessionId) {
    const chatSession = await getChatSession(sessionId, session.user.id)
    if (!chatSession) return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
    return NextResponse.json(chatSession)
  }

  const sessions = await getUserChatSessions(session.user.id)
  return NextResponse.json(sessions)
}

const messageSchema = z.object({
  message: z.string().min(1).max(4000),
  sessionId: z.string().optional(),
  mode: z.enum(["general", "pipeline", "biomaterial", "organoid", "protocol"]).default("general"),
  streaming: z.boolean().default(true),
})

// POST /api/chat — enviar mensagem
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = messageSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 })
  }

  const { message, sessionId, mode, streaming } = parsed.data

  // Verificar e gastar créditos (2 por mensagem) — ADMIN tem bypass
  const userRole = (session.user as { role?: string }).role
  const creditCheck = await requireCredits(
    session.user.id,
    "CHAT_MESSAGE",
    `Chat ${mode}: ${message.substring(0, 50)}`,
    { mode, sessionId } as Prisma.InputJsonValue,
    userRole
  )
  if (creditCheck) return creditCheck.error

  // Obter ou criar sessão
  let chatSessionId = sessionId
  if (!chatSessionId) {
    const newSession = await createChatSession(
      session.user.id,
      `Chat - ${new Date().toLocaleDateString("pt-BR")}`
    )
    chatSessionId = newSession.id
  }

  // Carregar histórico
  const chatSession = await getChatSession(chatSessionId, session.user.id)
  const history: GeminiMessage[] = (chatSession?.messages ?? []).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    content: m.content,
  }))

  // Adicionar nova mensagem
  history.push({ role: "user", content: message })

  // Salvar mensagem do usuário no DB
  await addChatMessage(chatSessionId, {
    role: "user",
    content: message,
    creditsUsed: 2,
  })

  // Escolher system prompt baseado no modo
  const systemPromptMap: Record<string, string> = {
    general: SYSTEM_PROMPTS.BIOFAB_EXPERT,
    pipeline: SYSTEM_PROMPTS.PIPELINE_ASSISTANT,
    biomaterial: SYSTEM_PROMPTS.BIOMATERIAL_EXPERT,
    organoid: SYSTEM_PROMPTS.ORGANOID_DESIGNER,
    protocol: SYSTEM_PROMPTS.PROTOCOL_GENERATOR,
  }

  const systemPrompt = systemPromptMap[mode] ?? SYSTEM_PROMPTS.BIOFAB_EXPERT

  // Resposta com streaming
  if (streaming) {
    const stream = await generateChatStream(history, { systemPrompt })

    // Acumular resposta para salvar no DB
    let fullResponse = ""

    const transformStream = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(chunk)
        // Extrair texto do chunk SSE
        const text = new TextDecoder().decode(chunk)
        const lines = text.split("\n")
        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.slice(6))
              fullResponse += data.text ?? ""
            } catch {
              // Ignorar erros de parse
            }
          }
        }
      },
      async flush() {
        // Salvar resposta completa no DB (após stream finalizar)
        if (fullResponse && chatSessionId) {
          await addChatMessage(chatSessionId, {
            role: "assistant",
            content: fullResponse,
            model: "gemini-2.0-flash",
            creditsUsed: 0, // Já cobrado na mensagem do usuário
          }).catch(console.error)
        }
      },
    })

    const readable = stream.pipeThrough(transformStream)

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Session-Id": chatSessionId,
        "X-Accel-Buffering": "no",
      },
    })
  }

  // Resposta sem streaming (fallback)
  const { generateChat } = await import("@/lib/ai/gemini")
  const { text, tokens } = await generateChat(history, { systemPrompt })

  await addChatMessage(chatSessionId, {
    role: "assistant",
    content: text,
    model: "gemini-2.0-flash",
    tokens,
  })

  return NextResponse.json({
    message: text,
    sessionId: chatSessionId,
    tokens,
  })
}
