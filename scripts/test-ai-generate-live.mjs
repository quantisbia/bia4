#!/usr/bin/env node
/**
 * R12.56 · Sprint A — Live smoke test para o endpoint AI Generate.
 * Chama a API do Claude DIRETAMENTE (sem subir Next.js) para validar:
 *   1. API key funciona
 *   2. System prompt produz saída estruturada via tool_use
 *   3. validateAiResponse aceita a resposta real do modelo
 *
 * Uso: node scripts/test-ai-generate-live.mjs "Meu prompt aqui"
 */
import Anthropic from "@anthropic-ai/sdk"
import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, "..")

// Carregar .env.local manualmente (script direto, sem Next.js)
try {
  const envText = readFileSync(join(repoRoot, ".env.local"), "utf-8")
  for (const line of envText.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?(.*?)"?$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
} catch { /* ignore */ }

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey?.startsWith("sk-ant-")) {
  console.error("❌ ANTHROPIC_API_KEY ausente ou inválida em .env.local")
  process.exit(1)
}

const prompt = process.argv[2] ?? "Scaffold poroso para regeneração óssea cortical de 20×15×10 mm"
console.log(`\n📝 Prompt: "${prompt}"\n`)

// Reproduzimos o schema/prompt do endpoint (inline pra evitar transpiler)
const GEOMETRIES = ["cube_tissue", "skin_cylinder", "disk", "membrane", "vessel"]
const MATERIALS = [
  "GelMA", "Alginate", "Gelatin", "Collagen", "Fibrinogen",
  "dECM", "Hyaluronic Acid", "PCL", "Pluronic F127", "PEGDA",
]

const SYSTEM = `Você é o assistente científico do BIA (Quantis Biotechnology).
Sempre use a tool propose_bioprint_design.
Geometrias permitidas: ${GEOMETRIES.join(", ")}.
Materiais permitidos: ${MATERIALS.join(", ")}.
Dimensões em mm entre 5 e 100.
Rationale em pt-BR (2-4 parágrafos).
DOIs reais peer-review, ou array vazio se incerto.`

const TOOL = {
  name: "propose_bioprint_design",
  description: "Propõe geometria, dimensões, biotinta e parâmetros de processo.",
  input_schema: {
    type: "object",
    properties: {
      geometryId: { type: "string", enum: GEOMETRIES },
      dims: {
        type: "object",
        properties: {
          x: { type: "number", minimum: 5, maximum: 100 },
          y: { type: "number", minimum: 5, maximum: 100 },
          z: { type: "number", minimum: 0.3, maximum: 100 },
        },
        required: ["x", "y", "z"],
      },
      bioinkSuggestion: {
        type: "object",
        properties: {
          material: { type: "string", enum: MATERIALS },
          concentration_pct: { type: "number", minimum: 0.5, maximum: 100 },
          crosslinker: { type: ["string", "null"] },
          crosslinkerConc: { type: ["string", "null"] },
          rationale: { type: "string" },
        },
        required: ["material", "concentration_pct", "rationale"],
      },
      processParams: {
        type: "object",
        properties: {
          printSpeed_mms: { type: "number", minimum: 1, maximum: 50 },
          layerHeight_mm: { type: "number", minimum: 0.1, maximum: 0.6 },
          infillPercent: { type: "number", minimum: 10, maximum: 100 },
          needleDiameter_um: { type: "number", minimum: 100, maximum: 800 },
        },
        required: ["printSpeed_mms", "layerHeight_mm", "infillPercent", "needleDiameter_um"],
      },
      rationale: { type: "string" },
      dois: { type: "array", items: { type: "string" }, maxItems: 4 },
    },
    required: ["geometryId", "dims", "bioinkSuggestion", "processParams", "rationale", "dois"],
  },
}

const client = new Anthropic({ apiKey })
const t0 = Date.now()

try {
  const res = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2500,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
    tools: [TOOL],
    tool_choice: { type: "tool", name: "propose_bioprint_design" },
  })

  const latency = Date.now() - t0
  const toolBlock = res.content.find((b) => b.type === "tool_use")
  if (!toolBlock) {
    console.error("❌ Nenhum tool_use na resposta:", res.content)
    process.exit(1)
  }

  const p = toolBlock.input
  console.log(`✅ Resposta recebida em ${latency}ms`)
  console.log(`   Model:  ${res.model}`)
  console.log(`   Tokens: ${res.usage.input_tokens} in / ${res.usage.output_tokens} out`)
  console.log(`   Stop:   ${res.stop_reason}\n`)

  console.log(`━━━ PROPOSTA DA IA ━━━`)
  console.log(`Geometria:   ${p.geometryId}`)
  console.log(`Dimensões:   ${p.dims.x} × ${p.dims.y} × ${p.dims.z} mm`)
  console.log(`Biotinta:    ${p.bioinkSuggestion.material} ${p.bioinkSuggestion.concentration_pct}%`)
  console.log(`Crosslinker: ${p.bioinkSuggestion.crosslinker ?? "—"}`)
  console.log(`Velocidade:  ${p.processParams.printSpeed_mms} mm/s`)
  console.log(`Layer:       ${p.processParams.layerHeight_mm} mm`)
  console.log(`Infill:      ${p.processParams.infillPercent}%`)
  console.log(`Agulha:      ${p.processParams.needleDiameter_um} µm`)
  console.log(`\n━━━ RATIONALE ━━━`)
  console.log(p.rationale)
  console.log(`\n━━━ REFERÊNCIAS ━━━`)
  p.dois.forEach((d, i) => console.log(`[${i + 1}] ${d}`))

  // Validações mínimas
  const errors = []
  if (!GEOMETRIES.includes(p.geometryId)) errors.push(`Geometry '${p.geometryId}' fora whitelist`)
  if (!MATERIALS.includes(p.bioinkSuggestion.material)) errors.push(`Material '${p.bioinkSuggestion.material}' fora whitelist`)
  if (p.dims.x < 5 || p.dims.x > 100) errors.push(`X ${p.dims.x} fora [5,100]`)
  if (p.rationale.length < 100) errors.push(`Rationale muito curto: ${p.rationale.length}`)

  if (errors.length > 0) {
    console.log(`\n⚠️  Validações que falharam:`)
    errors.forEach((e) => console.log(`   - ${e}`))
    process.exit(2)
  }

  console.log(`\n✅ Todas validações passaram!`)
} catch (err) {
  console.error(`\n❌ Erro: ${err.message}`)
  if (err.status === 401) console.error("→ API key rejeitada. Verifique .env.local")
  process.exit(1)
}
