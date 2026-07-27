/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  POST /api/bioprint/model/ai-generate
 * ─────────────────────────────────────────────────────────────────────────
 *  Recebe uma descrição em linguagem natural do tecido/scaffold alvo e
 *  retorna proposta estruturada usando Claude Sonnet 4.5.
 *
 *  BODY:
 *    { prompt: string }        // 5-2000 caracteres
 *
 *  RETORNOS:
 *    200 { result: AiGenerateResult, meta: { latencyMs, inputTokens, outputTokens } }
 *    400 { error: "prompt_curto" | "prompt_longo" }
 *    401 { error: "unauthorized" }
 *    422 { error: "resposta_invalida", details, warnings }
 *    500 { error: "api_key_missing" | "llm_error", message }
 *
 *  R12.56 — Sprint A (sem cobrança de créditos, whitelist de 5 geometrias)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

import {
  AI_SYSTEM_PROMPT,
  AI_TOOL_SCHEMA,
  validateAiResponse,
} from "@/lib/bioprint/ai-generate"

// Esta rota chama LLM externo em runtime — nunca pré-renderiza
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Modelo Claude usado (R12.56 — pode ser configurado por env em v2)
const CLAUDE_MODEL = "claude-sonnet-4-5-20250929"

// Timeout hard: 60s (Claude Sonnet ~3-8s típico, mas prompts complexos podem
// levar até ~20s com raciocínio; damos folga sem chegar no 100s da Vercel).
const LLM_TIMEOUT_MS = 60_000

export async function POST(req: NextRequest) {
  const startedAt = Date.now()

  // ─── 1) Parse body ────────────────────────────────────────────────────
  let body: { prompt?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "body_json_invalido" }, { status: 400 })
  }
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : ""

  // ─── 2) Validar tamanho do prompt ─────────────────────────────────────
  if (prompt.length < 5) {
    return NextResponse.json(
      { error: "prompt_curto", message: "Descreva o tecido em pelo menos 5 caracteres." },
      { status: 400 },
    )
  }
  if (prompt.length > 2000) {
    return NextResponse.json(
      { error: "prompt_longo", message: "Prompt limitado a 2000 caracteres." },
      { status: 400 },
    )
  }

  // ─── 3) Verificar API key ─────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    console.error("[ai-generate] ANTHROPIC_API_KEY ausente ou inválida")
    return NextResponse.json(
      {
        error: "api_key_missing",
        message: "Configuração de servidor incompleta. Contate o administrador.",
      },
      { status: 500 },
    )
  }

  // ─── 4) Chamar Claude com tool_use forçado ────────────────────────────
  const client = new Anthropic({ apiKey, timeout: LLM_TIMEOUT_MS })

  let llmResponse: Anthropic.Messages.Message
  try {
    llmResponse = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2500,
      system: AI_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [AI_TOOL_SCHEMA as any],
      tool_choice: { type: "tool", name: "propose_bioprint_design" },
    })
  } catch (err) {
    console.error("[ai-generate] Claude API error", err)
    const message = err instanceof Error ? err.message : String(err)
    // Erro de credenciais → sinalizar
    if (message.includes("401") || message.toLowerCase().includes("authentication")) {
      return NextResponse.json(
        { error: "api_key_invalid", message: "API key rejeitada pelo servidor Anthropic." },
        { status: 500 },
      )
    }
    // Rate limit
    if (message.includes("429") || message.toLowerCase().includes("rate")) {
      return NextResponse.json(
        {
          error: "rate_limited",
          message: "Limite de requisições atingido. Tente novamente em alguns segundos.",
        },
        { status: 429 },
      )
    }
    return NextResponse.json(
      { error: "llm_error", message: message.slice(0, 200) },
      { status: 500 },
    )
  }

  // ─── 5) Extrair tool_use block ────────────────────────────────────────
  const toolBlock = llmResponse.content.find((b) => b.type === "tool_use")
  if (!toolBlock || toolBlock.type !== "tool_use") {
    console.error("[ai-generate] Nenhum tool_use na resposta", llmResponse.content)
    return NextResponse.json(
      {
        error: "resposta_sem_tool",
        message: "O modelo não retornou estrutura válida. Tente reformular o prompt.",
      },
      { status: 422 },
    )
  }

  // ─── 6) Validar payload ───────────────────────────────────────────────
  const validation = validateAiResponse(toolBlock.input, prompt)
  if (!validation.ok) {
    return NextResponse.json(
      {
        error: "resposta_invalida",
        details: validation.error,
        warnings: validation.warnings,
      },
      { status: 422 },
    )
  }

  // ─── 7) Sucesso ───────────────────────────────────────────────────────
  const latencyMs = Date.now() - startedAt
  return NextResponse.json({
    result: validation.result,
    meta: {
      latencyMs,
      model: CLAUDE_MODEL,
      inputTokens: llmResponse.usage.input_tokens,
      outputTokens: llmResponse.usage.output_tokens,
      stopReason: llmResponse.stop_reason,
    },
  })
}

/** GET com metadados úteis para debug/UI. */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/bioprint/model/ai-generate",
    method: "POST",
    body: { prompt: "string, 5-2000 chars" },
    model: CLAUDE_MODEL,
    hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY?.startsWith("sk-ant-")),
    version: "R12.56 · Sprint A",
  })
}
