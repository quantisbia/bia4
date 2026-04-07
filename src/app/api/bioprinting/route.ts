import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { requireCredits } from "@/lib/auth/credits"
import { generateContent } from "@/lib/ai/gemini"
import { SYSTEM_PROMPTS } from "@/lib/ai/gemini"
import { prisma } from "@/lib/db/prisma"
import { Prisma } from "@prisma/client"
import { z } from "zod"

const bioprintSchema = z.object({
  slicer: z.object({
    technology: z.string(),
    layerHeight: z.number(),
    printSpeed: z.number(),
    nozzleTemp: z.number(),
    platformTemp: z.number(),
    pressure: z.number(),
    nozzleDiameter: z.number(),
    infillPattern: z.string(),
    infillPercent: z.number(),
    walls: z.number(),
    skirtLoops: z.number(),
    retraction: z.number(),
    supportEnabled: z.boolean(),
  }),
  bioink: z.object({
    material: z.string(),
    concentration: z.number(),
    crosslinker: z.string(),
    crosslinkerConc: z.number(),
    cellDensity: z.number(),
    hasCells: z.boolean(),
    additives: z.string(),
  }),
  tissue: z.string().min(2),
  application: z.string().min(2),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = bioprintSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 })
  }

  const userRole = (session.user as { role?: string }).role
  const creditCheck = await requireCredits(
    session.user.id,
    "BIOMATERIAL_FORMULATION",
    `Análise bioimpressão 3D - ${parsed.data.tissue}`,
    { tissue: parsed.data.tissue, technology: parsed.data.slicer.technology } as Prisma.InputJsonValue,
    userRole
  )
  if (creditCheck) return creditCheck.error

  const { slicer, bioink, tissue, application } = parsed.data

  const prompt = `
Você é a BIA v4 — especialista em bioimpressão 3D. Analise os seguintes parâmetros e gere uma análise técnica detalhada em JSON.

TECIDO ALVO: ${tissue}
APLICAÇÃO CLÍNICA: ${application}

PARÂMETROS DE FATIAMENTO:
- Tecnologia: ${slicer.technology}
- Altura de camada: ${slicer.layerHeight} µm
- Velocidade de impressão: ${slicer.printSpeed} mm/s
- Temperatura do bico: ${slicer.nozzleTemp}°C
- Temperatura da plataforma: ${slicer.platformTemp}°C
- Pressão de extrusão: ${slicer.pressure} kPa
- Diâmetro do bico: ${slicer.nozzleDiameter} µm
- Padrão de preenchimento: ${slicer.infillPattern}
- Porcentagem de preenchimento: ${slicer.infillPercent}%
- Número de paredes: ${slicer.walls}
- Saia (skirt): ${slicer.skirtLoops} loops
- Retração: ${slicer.retraction} mm
- Suporte: ${slicer.supportEnabled ? "ativado" : "desativado"}

BIOTINTA:
- Material: ${bioink.material}
- Concentração: ${bioink.concentration}%
- Crosslinker: ${bioink.crosslinker} (${bioink.crosslinkerConc})
- Com células: ${bioink.hasCells ? `Sim — ${bioink.cellDensity}×10⁶ cel/mL` : "Não (scaffold acelular)"}
- Aditivos: ${bioink.additives || "Nenhum"}

Retorne JSON com esta estrutura exata:
{
  "summary": "resumo técnico de 2-3 frases sobre adequação dos parâmetros ao tecido alvo",
  "slicerRecommendations": ["rec1", "rec2", "rec3", "rec4"],
  "bioinkNotes": ["note1", "note2", "note3"],
  "cellViabilityPrediction": "predição sobre viabilidade celular ou null se sem células",
  "structuralFidelity": "avaliação da fidelidade estrutural esperada",
  "crosslinkingProtocol": "protocolo detalhado de crosslinking pós-impressão",
  "postPrintingSteps": ["passo1", "passo2", "passo3", "passo4", "passo5"],
  "regulatoryNotes": "notas regulatórias específicas para FDA/ANVISA/EMA para este produto"
}
`

  try {
    const { text: raw } = await generateContent(prompt, { systemPrompt: SYSTEM_PROMPTS.BIOMATERIAL_EXPERT })
    
    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("Resposta inválida da IA")
    
    const analysis = JSON.parse(jsonMatch[0])

    // Save to audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "bioprinting_analysis",
        entity: "bioprinting",
        metadata: {
          tissue,
          technology: slicer.technology,
          material: bioink.material,
        } as Prisma.InputJsonValue,
      },
    }).catch(() => {})

    return NextResponse.json({ ...analysis, creditsUsed: 10 })
  } catch (error) {
    console.error("[bioprinting API]", error)
    return NextResponse.json(
      { error: "Erro ao gerar análise. Tente novamente." },
      { status: 500 }
    )
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  // Return reference data for biofabrication parameters
  return NextResponse.json({
    technologies: [
      { id: "EXTRUSION", pressureRange: [10, 600], speedRange: [1, 30], resolutionMicrons: [100, 1000] },
      { id: "INKJET",    dropletPl: [1, 100],       resolutionMicrons: [20, 100] },
      { id: "DLP_SLA",   irradianceMwCm2: [10, 100], resolutionXY: [25, 100], layerMicrons: [25, 100] },
      { id: "FRESH",     supportMaterial: "gelatin/agarose 0.1-1%", note: "Impressão em banho de suporte" },
      { id: "LASER",     energyMjCm2: [10, 100],    resolutionMicrons: 1 },
      { id: "COAXIAL",   note: "Core/shell — vascularização in situ" },
    ],
    bioinkDatabase: [
      { material: "gelma",    gPrimeRange: [100, 5000], printTemp: 37, crosslink: "UV 365nm 30-60s" },
      { material: "alginate", gPrimeRange: [500, 5000], printTemp: 25, crosslink: "CaCl₂ 50-200mM" },
      { material: "fibrin",   gelTime: "5-10min@37°C",  printTemp: 4 },
      { material: "collagen", concentration: "1-5mg/mL", printTemp: 4, gelTemp: 37 },
      { material: "pcl",      meltTemp: 60,              printTemp: "90-100°C" },
    ],
    cellParameters: {
      minViability: 0.80,
      maxShearStress: 50,
      maxPrintTime: 120,
      densityRange: [1e6, 20e6],
    },
  })
}
