/**
 * BIA v3 - Gemini AI Client
 * Integração com Google Gemini 2.0 Flash
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai"

const API_KEY = process.env.GEMINI_API_KEY ?? ""

// Lazy-init para evitar erro em build time sem API key
let genAI: GoogleGenerativeAI | null = null

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!API_KEY) throw new Error("GEMINI_API_KEY não configurada")
    genAI = new GoogleGenerativeAI(API_KEY)
  }
  return genAI
}

// Safety settings permissivos para contexto científico
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
]

// System prompts especializados
export const SYSTEM_PROMPTS = {
  BIOFAB_EXPERT: `Você é BIA (Biofabrication Intelligence Assistant), uma IA especializada em engenharia de tecidos e biofabricação.

Contexto da plataforma:
- Plataforma SaaS para pesquisadores e empresas de biotech
- Foco em: design de tecidos, organoides, biomateriais, protocolos laboratoriais
- Base científica: literatura peer-reviewed, boas práticas de GLP/GMP

Suas capacidades:
1. Pipeline de Design de Tecidos (12 etapas validadas)
2. Formulação de Biomateriais (807+ formulações no banco)
3. Design de Organoides (intestinal, hepático, neural, cardíaco, renal)
4. Geração de Protocolos (formato ISO/ASTM)
5. Base de Conhecimento Científica
6. Chat especializado em biofabricação

Diretrizes de resposta:
- Use terminologia científica precisa
- Cite parâmetros quantitativos quando relevante (concentrações, temperaturas, tempos)
- Indique limitações e considerações de segurança
- Responda em Português Brasileiro por padrão
- Seja preciso mas acessível para diferentes níveis de expertise`,

  PIPELINE_ASSISTANT: `Você é o assistente do Pipeline de Design de Tecidos da BIA v3.
Analise e guie o usuário pelas 12 etapas do pipeline:
1. Definição do Tecido Alvo
2. Seleção da Scaffolding Strategy  
3. Escolha de Biomateriais
4. Incorporação Celular
5. Fatores de Crescimento
6. Bioimpressão/Fabricação
7. Cultura em Biorreator
8. Caracterização Mecânica
9. Análise Bioquímica
10. Testes de Viabilidade
11. Validação Funcional
12. Translação Clínica

Para cada etapa, forneça:
- Parâmetros específicos e ranges
- Protocolos recomendados
- Pontos de controle de qualidade
- Referências bibliográficas relevantes`,

  BIOMATERIAL_EXPERT: `Você é o especialista em biomateriais da BIA v3.
Banco de dados: 807+ formulações validadas.
Categorias: Hidrogéis, Polímeros Sintéticos, Matrizes Naturais, Compósitos, Bioinks.
Forneça: composição, concentração, propriedades mecânicas, biocompatibilidade, aplicações.`,

  ORGANOID_DESIGNER: `Você é o designer de organoides da BIA v3.
Tipos suportados: intestinal, hepático, neural, cardíaco, renal, pancreático, pulmonar.
Para cada design, especifique: células-tronco, fatores de crescimento, protocolo de diferenciação, caracterização esperada.`,

  PROTOCOL_GENERATOR: `Você é o gerador de protocolos da BIA v3.
Gere protocolos no formato padrão científico incluindo:
- Objetivo e escopo
- Materiais e reagentes (com fornecedores e cat. numbers)
- Equipamentos necessários
- Procedimento passo a passo
- Pontos críticos de controle
- Análise e interpretação de resultados
- Referências normativas (ISO, ASTM, ABNT)`,
}

// Interface principal do Gemini
export interface GeminiOptions {
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export interface GeminiMessage {
  role: "user" | "model"
  content: string
}

/**
 * Gera resposta simples (não streaming)
 */
export async function generateContent(
  prompt: string,
  options: GeminiOptions = {}
): Promise<{ text: string; tokens: number }> {
  const model = getGenAI().getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: options.systemPrompt ?? SYSTEM_PROMPTS.BIOFAB_EXPERT,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 2048,
      topP: 0.95,
      topK: 40,
    },
  })

  const result = await model.generateContent(prompt)
  const response = result.response
  const text = response.text()
  const tokens = response.usageMetadata?.totalTokenCount ?? 0

  return { text, tokens }
}

/**
 * Chat com histórico (multi-turn)
 */
export async function generateChat(
  messages: GeminiMessage[],
  options: GeminiOptions = {}
): Promise<{ text: string; tokens: number }> {
  const model = getGenAI().getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: options.systemPrompt ?? SYSTEM_PROMPTS.BIOFAB_EXPERT,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 4096,
      topP: 0.95,
    },
  })

  const chat = model.startChat({
    history: messages.slice(0, -1).map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
  })

  const lastMessage = messages[messages.length - 1]
  const result = await chat.sendMessage(lastMessage.content)
  const text = result.response.text()
  const tokens = result.response.usageMetadata?.totalTokenCount ?? 0

  return { text, tokens }
}

/**
 * Streaming response (para chat em tempo real)
 */
export async function generateContentStream(
  prompt: string,
  options: GeminiOptions = {}
): Promise<ReadableStream<string>> {
  const model = getGenAI().getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: options.systemPrompt ?? SYSTEM_PROMPTS.BIOFAB_EXPERT,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 4096,
    },
  })

  const result = await model.generateContentStream(prompt)

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of result.stream) {
        const text = chunk.text()
        if (text) controller.enqueue(text)
      }
      controller.close()
    },
  })
}

/**
 * Chat streaming com histórico
 */
export async function generateChatStream(
  messages: GeminiMessage[],
  options: GeminiOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  const model = getGenAI().getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: options.systemPrompt ?? SYSTEM_PROMPTS.BIOFAB_EXPERT,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 4096,
    },
  })

  const chat = model.startChat({
    history: messages.slice(0, -1).map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
  })

  const lastMessage = messages[messages.length - 1]
  const result = await chat.sendMessageStream(lastMessage.content)

  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of result.stream) {
        const text = chunk.text()
        if (text) {
          // Server-Sent Events format
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
        }
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"))
      controller.close()
    },
  })
}

/**
 * Análise estruturada com JSON output
 */
export async function generateStructured<T>(
  prompt: string,
  schema: string,
  options: GeminiOptions = {}
): Promise<T> {
  const structuredPrompt = `${prompt}

IMPORTANTE: Responda APENAS com um objeto JSON válido seguindo exatamente este schema:
${schema}

Não inclua markdown, comentários ou texto adicional. Apenas o JSON.`

  const { text } = await generateContent(structuredPrompt, {
    ...options,
    temperature: 0.3, // Mais determinístico para JSON
  })

  try {
    // Limpar possíveis ```json ... ```
    const clean = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim()
    return JSON.parse(clean) as T
  } catch {
    throw new Error(`Gemini retornou JSON inválido: ${text.substring(0, 200)}`)
  }
}

/**
 * Calcula tokens estimados (1 token ≈ 4 chars em inglês, ~3 em português)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5)
}

/**
 * Converte tokens para créditos BIA
 * 1 crédito = 500 tokens (aprox)
 */
export function tokensToCreditCost(tokens: number): number {
  return Math.max(1, Math.ceil(tokens / 500))
}
