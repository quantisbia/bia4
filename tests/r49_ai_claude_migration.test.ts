/**
 * R49 · Camada de IA migrada do Google Gemini para o Claude (Anthropic).
 * Usa um cliente simulado: nenhum teste aqui chama a API de verdade.
 */
import { describe, it, expect, afterEach } from "vitest"
import fs from "fs"
import path from "path"
import { APIError, APIConnectionError } from "@anthropic-ai/sdk"
import {
  AI_MODEL, BiaAIError, aiErrorToHttp, classifyAIError, toClaudeMaxTokens, toClaudeMessages,
  generateContent, generateChat, generateChatStream, generateStructured, __setAIClientForTests,
} from "@/lib/ai/llm"

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, "..", p), "utf8")
const usage = { input_tokens: 10, cache_creation_input_tokens: 100, cache_read_input_tokens: 1000, output_tokens: 5 }
const message = (content: unknown[], stop_reason = "end_turn") => ({ content, stop_reason, usage })

/* eslint-disable @typescript-eslint/no-explicit-any */
function fakeClient(reply: (body: any) => unknown) {
  const calls: any[] = []
  const client = { messages: { create: async (body: any) => { calls.push(body); return reply(body) } } }
  __setAIClientForTests(client as any)
  return calls
}
async function* events(list: unknown[]) { for (const e of list) yield e }
async function readAll(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader(); const dec = new TextDecoder(); let out = ""
  for (;;) { const { done, value } = await reader.read(); if (done) break; out += dec.decode(value) }
  return out
}
const apiError = (status: number, type: string, msg: string) =>
  APIError.generate(status, { type: "error", error: { type, message: msg } }, msg, new Headers())

afterEach(() => __setAIClientForTests(null))

describe("R49 · requisição enviada ao Claude", () => {
  it("usa o modelo padrão, prompt de sistema com cache e nenhum parâmetro recusado pelos modelos atuais", async () => {
    const calls = fakeClient(() => message([{ type: "text", text: "ok" }]))
    await generateContent("pergunta", { systemPrompt: "SISTEMA", temperature: 0.3, maxTokens: 4096 })
    const body = calls[0]
    expect(AI_MODEL).toBe("claude-haiku-5-5")
    expect(body.model).toBe(AI_MODEL)
    expect(body.system).toEqual([{ type: "text", text: "SISTEMA", cache_control: { type: "ephemeral" } }])
    expect(body.messages).toEqual([{ role: "user", content: "pergunta" }])
    expect(body.max_tokens).toBe(toClaudeMaxTokens(4096))
    for (const k of ["temperature", "top_p", "top_k", "thinking"]) expect(body).not.toHaveProperty(k)
  })

  it("converte os limites de saída calibrados para o Gemini", () => {
    expect(toClaudeMaxTokens(3000)).toBe(6500)
    expect(toClaudeMaxTokens(4096)).toBe(8144)
    expect(toClaudeMaxTokens(8192)).toBe(14288)
    expect(toClaudeMaxTokens(50000)).toBe(21000)
  })

  it("junta só os blocos de texto (ignora raciocínio) e soma todos os tokens", async () => {
    fakeClient(() => message([{ type: "thinking", thinking: "", signature: "x" }, { type: "text", text: "Olá, " }, { type: "text", text: "mundo" }]))
    expect(await generateContent("p")).toEqual({ text: "Olá, mundo", tokens: 1115 })
  })
})

describe("R49 · histórico do chat", () => {
  it("troca 'model' por 'assistant', descarta vazias e junta turnos seguidos do mesmo autor", () => {
    expect(toClaudeMessages([
      { role: "model", content: "resposta órfã" },
      { role: "user", content: "primeira" },
      { role: "user", content: "segunda (a resposta anterior falhou)" },
      { role: "model", content: "  " },
      { role: "model", content: "resposta" },
      { role: "user", content: "terceira" },
    ])).toEqual([
      { role: "user", content: "primeira\n\nsegunda (a resposta anterior falhou)" },
      { role: "assistant", content: "resposta" },
      { role: "user", content: "terceira" },
    ])
  })

  it("recusa histórico que não termina com mensagem do usuário", () => {
    expect(() => toClaudeMessages([{ role: "user", content: "oi" }, { role: "model", content: "olá" }])).toThrow()
    expect(() => toClaudeMessages([])).toThrow()
  })

  it("generateChat envia o histórico convertido", async () => {
    const calls = fakeClient(() => message([{ type: "text", text: "r" }]))
    await generateChat([{ role: "user", content: "a" }, { role: "model", content: "b" }, { role: "user", content: "c" }])
    expect(calls[0].messages.map((m: any) => m.role)).toEqual(["user", "assistant", "user"])
  })
})

describe("R49 · erros viram mensagens corretas", () => {
  it("classifica pelo status/tipo devolvido pela API", () => {
    expect(classifyAIError(apiError(401, "authentication_error", "invalid x-api-key"))).toBe("API_KEY_INVALID")
    expect(classifyAIError(apiError(429, "rate_limit_error", "rate limited"))).toBe("QUOTA_EXCEEDED")
    expect(classifyAIError(apiError(529, "overloaded_error", "Overloaded"))).toBe("OVERLOADED")
    expect(classifyAIError(apiError(500, "api_error", "internal"))).toBe("OVERLOADED")
    expect(classifyAIError(apiError(400, "invalid_request_error", "Your credit balance is too low to access the Anthropic API."))).toBe("BILLING")
    expect(classifyAIError(apiError(402, "billing_error", "payment required"))).toBe("BILLING")
    expect(classifyAIError(new APIConnectionError({ message: "fetch failed" }))).toBe("NETWORK")
    expect(classifyAIError(new Error("qualquer coisa"))).toBe("UNKNOWN")
  })

  it("saldo esgotado não é mais mostrado como falha de rede do usuário", () => {
    const e = new BiaAIError(apiError(400, "invalid_request_error", "Your credit balance is too low"))
    expect(e.code).toBe("BILLING")
    expect(e.userMessage).not.toMatch(/sua conexão|sua internet/i)
    expect(aiErrorToHttp(e)).toMatchObject({ code: "AI_BILLING", status: 503 })
  })

  it("recusa do modelo vira bloqueio de segurança (422)", async () => {
    fakeClient(() => message([], "refusal"))
    const err = await generateContent("p").catch((e) => e)
    expect(err).toBeInstanceOf(BiaAIError)
    expect(aiErrorToHttp(err)).toMatchObject({ code: "AI_SAFETY_BLOCK", status: 422 })
  })

  it("resposta sem texto é erro, não string vazia", async () => {
    fakeClient(() => message([{ type: "thinking", thinking: "", signature: "x" }], "max_tokens"))
    await expect(generateContent("p")).rejects.toBeInstanceOf(BiaAIError)
  })

  it("chave ausente ou de outro serviço não é enviada: NOT_CONFIGURED", async () => {
    const saved = process.env.ANTHROPIC_API_KEY
    try {
      for (const key of [undefined, "gsk-token-de-outro-servico", "AIzaChaveDoGoogle"]) {
        if (key === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = key
        __setAIClientForTests(null)
        const err = await generateContent("p").catch((e) => e)
        expect(err.code).toBe("NOT_CONFIGURED")
      }
    } finally {
      if (saved === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = saved
    }
  })
})

describe("R49 · streaming no formato que a tela do chat lê", () => {
  it("emite só o texto em linhas 'data:' e fecha com [DONE]", async () => {
    const calls = fakeClient(() => events([
      { type: "message_start" },
      { type: "content_block_delta", delta: { type: "thinking_delta", thinking: "raciocínio" } },
      { type: "content_block_delta", delta: { type: "text_delta", text: "Olá" } },
      { type: "content_block_delta", delta: { type: "text_delta", text: " mundo" } },
      { type: "message_delta", delta: { stop_reason: "end_turn" } },
    ]))
    const out = await readAll(await generateChatStream([{ role: "user", content: "oi" }]))
    expect(calls[0].stream).toBe(true)
    expect(out).toBe('data: {"text":"Olá"}\n\ndata: {"text":" mundo"}\n\ndata: [DONE]\n\n')
  })

  it("recusa ou falha no meio do stream envia a mensagem de erro e fecha", async () => {
    fakeClient(() => events([
      { type: "content_block_delta", delta: { type: "text_delta", text: "parcial" } },
      { type: "message_delta", delta: { stop_reason: "refusal" } },
    ]))
    const out = await readAll(await generateChatStream([{ role: "user", content: "oi" }]))
    expect(out).toContain('"error":"Sua solicitação foi bloqueada')
    expect(out.endsWith("data: [DONE]\n\n")).toBe(true)
  })

  it("erro antes do stream começar é lançado (a rota responde 503 em vez de stream vazio)", async () => {
    fakeClient(() => { throw apiError(429, "rate_limit_error", "rate limited") })
    const err = await generateChatStream([{ role: "user", content: "oi" }]).catch((e) => e)
    expect(err.code).toBe("QUOTA_EXCEEDED")
  })
})

describe("R49 · JSON estruturado", () => {
  it("anexa o esquema ao pedido e lê JSON mesmo dentro de bloco markdown", async () => {
    const calls = fakeClient(() => message([{ type: "text", text: '```json\n{"a": 1, "b": ["x"]}\n```' }]))
    expect(await generateStructured<{ a: number; b: string[] }>("Analise", '{"a": 0, "b": []}')).toEqual({ a: 1, b: ["x"] })
    expect(calls[0].messages[0].content).toContain("Esquema esperado:")
    expect(calls[0].max_tokens).toBe(toClaudeMaxTokens(8192))
  })
})

describe("R49 · código-fonte", () => {
  it("nenhum arquivo de src importa mais o SDK do Google nem lê a chave do Google", () => {
    const hits: string[] = []
    const walk = (dir: string) => {
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, f.name)
        if (f.isDirectory()) walk(p)
        else if (/\.(ts|tsx)$/.test(f.name) && !p.includes(`${path.sep}stl${path.sep}meshes`)) {
          const s = fs.readFileSync(p, "utf8")
          if (/@google\/generative-ai|GOOGLE_AI_API_KEY|GEMINI_API_KEY|lib\/ai\/gemini/.test(s)) hits.push(p)
        }
      }
    }
    walk(path.resolve(__dirname, "..", "src"))
    expect(hits).toEqual([])
  })

  it("o cliente fixa o endereço da Anthropic (não obedece a ANTHROPIC_BASE_URL do ambiente)", () => {
    const src = read("src/lib/ai/llm.ts")
    expect(src).toMatch(/const ANTHROPIC_API_URL = "https:\/\/api\.anthropic\.com"/)
    expect(src).toMatch(/new Anthropic\(\{ apiKey, baseURL: ANTHROPIC_API_URL/)
  })

  it("a tela do Pipeline importa as etapas de um arquivo sem o SDK de IA", () => {
    expect(read("src/app/dashboard/pipeline/page.tsx")).toContain('from "@/lib/ai/pipeline-stages"')
    expect(read("src/lib/ai/pipeline-stages.ts")).not.toMatch(/^import /m)
  })

  it("o chat grava o modelo realmente usado", () => {
    const src = read("src/app/api/chat/route.ts")
    expect(src).not.toContain("gemini-2.5-flash")
    expect(src.match(/model: AI_MODEL,/g)?.length).toBe(2)
  })
})
