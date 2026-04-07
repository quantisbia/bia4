/**
 * BIA v4 — API de Sugestões Inteligentes de Bioimpressão
 * GET /api/bioprint/suggest?material=alginate&tissue=cartilagem
 * Busca no banco de 807 formulações validadas e retorna sugestões ranqueadas
 */

import { NextRequest, NextResponse } from "next/server"
import { BIOPRINT_DB } from "@/lib/db/bioprint-database"

// Mapeamento de tecidos → materiais mais adequados (baseado em literatura)
const TISSUE_TO_MATERIALS: Record<string, string[]> = {
  cartilagem:   ["GelMA", "Alginate", "Gelatin", "Hyaluronic Acid", "dECM", "Fibrinogen"],
  osso:         ["PCL", "Hydroxyapatite", "Alginate", "Chitosan", "PCL"],
  pele:         ["Gelatin", "Collagen", "GelMA", "Fibrinogen", "Alginate"],
  vascular:     ["GelMA", "Gelatin", "Fibrinogen", "Pluronic F127", "Collagen"],
  neural:       ["GelMA", "Hyaluronic Acid", "Alginate", "dECM", "Collagen"],
  cardíaco:     ["GelMA", "dECM", "Fibrinogen", "Alginate", "Gelatin"],
  hepático:     ["dECM", "GelMA", "Alginate", "Gelatin", "Collagen"],
  renal:        ["dECM", "GelMA", "Alginate", "Gelatin"],
  muscular:     ["Gelatin", "GelMA", "Fibrinogen", "dECM", "Collagen"],
  córnea:       ["GelMA", "Collagen", "Silk", "Alginate"],
  traqueia:     ["PCL", "GelMA", "Alginate", "Collagen"],
  bexiga:       ["GelMA", "Alginate", "dECM", "Collagen"],
  pulmão:       ["GelMA", "Alginate", "dECM", "Fibrinogen"],
  intestino:    ["GelMA", "Alginate", "dECM", "Gelatin"],
  esofago:      ["GelMA", "Alginate", "PCL", "Gelatin"],
  tendão:       ["GelMA", "Collagen", "PCL", "Fibrinogen"],
  menisco:      ["GelMA", "Alginate", "Hyaluronic Acid", "dECM"],
}

// Normaliza nome de material para lookup
function normalizeMaterial(name: string): string {
  const map: Record<string, string> = {
    "gelma": "GelMA",
    "gelatin methacrylated": "GelMA",
    "alginate": "Alginate",
    "alginato": "Alginate",
    "gelatin": "Gelatin",
    "gelatina": "Gelatin",
    "pcl": "PCL",
    "policaprolactona": "PCL",
    "hyaluronic acid": "Hyaluronic Acid",
    "hialuronico": "Hyaluronic Acid",
    "hama": "Hyaluronic Acid",
    "ha-ma": "Hyaluronic Acid",
    "chitosan": "Chitosan",
    "quitosana": "Chitosan",
    "collagen": "Collagen",
    "colageno": "Collagen",
    "fibrin": "Fibrinogen",
    "fibrina": "Fibrinogen",
    "fibrinogen": "Fibrinogen",
    "decm": "dECM",
    "dECM": "dECM",
    "pluronic": "Pluronic F127",
    "plga": "PLGA",
    "pla": "PLA",
    "hydroxyapatite": "Hydroxyapatite",
    "hidroxiapatita": "Hydroxyapatite",
    "pegda": "PEGDA",
    "polyurethane": "Polyurethane",
    "methylcellulose": "Methylcellulose",
    "gellan": "Gellan Gum",
    "laponite": "Laponite",
  }
  const lower = name.toLowerCase().trim()
  return map[lower] ?? name
}

// Score de adequação para o tecido
function scoreForTissue(material: string, tissue: string): number {
  const lower = tissue.toLowerCase()
  for (const [key, mats] of Object.entries(TISSUE_TO_MATERIALS)) {
    if (lower.includes(key)) {
      const idx = mats.indexOf(material)
      if (idx === 0) return 10
      if (idx === 1) return 8
      if (idx === 2) return 6
      if (idx > 2) return 4
    }
  }
  return 2
}

// Conta entradas com células para calcular "cell-friendliness"
function cellFriendliness(entry: { n: number; with_cells: number }): number {
  if (entry.n === 0) return 0
  return Math.round((entry.with_cells / entry.n) * 100)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const materialRaw = searchParams.get("material") ?? ""
  const tissue      = searchParams.get("tissue") ?? ""
  const withCells   = searchParams.get("cells") === "true"
  const technologyId = searchParams.get("tech") ?? "EXTRUSION"

  // Se tem material específico, retornar parâmetros desse material
  if (materialRaw) {
    const key = normalizeMaterial(materialRaw)
    const entry = BIOPRINT_DB[key]

    if (entry) {
      return NextResponse.json({
        found: true,
        material: key,
        n: entry.n,
        parameters: {
          pressure_kpa:  entry.pressure_kpa,
          temp_c:        entry.temp_c,
          speed_mms:     entry.speed_mms,
          needle_um:     entry.needle_um,
        },
        withCellsCount: entry.with_cells,
        cellFriendly: cellFriendliness(entry),
        concentrations: entry.concs.slice(0, 6),
        sampleFormulations: entry.sample_comps.slice(0, 3),
        dois: entry.dois.slice(0, 3),
        // Parâmetros recomendados para este material
        recommended: buildRecommended(key, entry, technologyId, withCells),
      })
    }
  }

  // Se tem tecido, ranquear materiais mais adequados
  if (tissue) {
    const lower = tissue.toLowerCase()
    let candidates: string[] = []
    
    for (const [key, mats] of Object.entries(TISSUE_TO_MATERIALS)) {
      if (lower.includes(key)) {
        candidates = mats
        break
      }
    }
    
    // Se não encontrou tecido específico, usa os top materiais gerais
    if (candidates.length === 0) {
      candidates = ["GelMA", "Alginate", "Gelatin", "Collagen", "dECM", "PCL", "Fibrinogen"]
    }

    const results = candidates
      .map(mat => {
        const entry = BIOPRINT_DB[mat]
        if (!entry) return null
        const score = scoreForTissue(mat, tissue)
        const cf = cellFriendliness(entry)
        // Penaliza materiais sem célula quando solicitado com células
        const cellPenalty = withCells && cf < 30 ? -2 : 0
        return {
          material: mat,
          score: score + cellPenalty,
          n: entry.n,
          cellFriendly: cf,
          typicalPressure: entry.pressure_kpa.typical,
          typicalTemp: entry.temp_c.typical,
          typicalSpeed: entry.speed_mms.typical,
          typicalNeedle: entry.needle_um.typical,
          concentrations: entry.concs.slice(0, 4),
          sampleFormulation: entry.sample_comps[0] ?? mat,
        }
      })
      .filter(Boolean)
      .sort((a, b) => (b!.score - a!.score))
      .slice(0, 6)

    return NextResponse.json({
      tissue,
      withCells,
      suggestions: results,
    })
  }

  // Retornar lista completa de materiais disponíveis
  const allMaterials = Object.entries(BIOPRINT_DB).map(([name, entry]) => ({
    name,
    n: entry.n,
    withCells: entry.with_cells,
    cellFriendly: cellFriendliness(entry),
    typicalPressure: entry.pressure_kpa.typical,
    typicalTemp: entry.temp_c.typical,
  })).sort((a, b) => b.n - a.n)

  return NextResponse.json({ materials: allMaterials, total: allMaterials.length })
}

// ─── Constrói parâmetros recomendados a partir do DB ─────────────────────────
function buildRecommended(material: string, entry: typeof BIOPRINT_DB[string], tech: string, hasCells: boolean) {
  const p = entry.pressure_kpa
  const t = entry.temp_c
  const s = entry.speed_mms
  const n = entry.needle_um

  // Pega o valor típico ou calcula a partir do range
  const pressure = p.typical ?? (p.min && p.max ? Math.round((p.min + p.max) / 2) : 80)
  const temp     = t.typical ?? (t.min && t.max ? Math.round((t.min + t.max) / 2) : 25)
  const speed    = s.typical ?? (s.min && s.max ? Math.round(((s.min + s.max) / 2) * 10) / 10 : 10)
  const needle   = n.typical ?? (n.min && n.max ? Math.round((n.min + n.max) / 2) : 300)

  // Ajuste para células
  const pressureAdj = hasCells ? Math.min(pressure, 120) : pressure  // limitar para células
  const speedAdj    = hasCells ? Math.min(speed, 20) : speed

  // Infill baseado no tipo de material
  const isRigid = ["PCL", "PLA", "PLGA", "Hydroxyapatite"].includes(material)
  const infill  = isRigid ? 70 : 80

  return {
    pressure_kpa: pressureAdj,
    temp_c: temp,
    speed_mms: speedAdj,
    needle_um: needle,
    infill_percent: infill,
    layer_height_um: Math.round(needle * 0.6),  // layer height ≈ 60% do nozzle
    skirt_loops: 2,
    retraction_mm: hasCells ? 0 : 0.3,
    support_threshold_deg: 45,
    notes: buildNotes(material, hasCells, entry),
  }
}

function buildNotes(material: string, hasCells: boolean, entry: typeof BIOPRINT_DB[string]): string[] {
  const notes: string[] = []
  
  if (hasCells && entry.with_cells > 0) {
    notes.push(`✅ ${entry.with_cells}/${entry.n} estudos incluíram células viáveis`)
    notes.push("⚠️ Shear stress máximo tolerado: <50 Pa")
    notes.push("⏱️ Tempo máximo de impressão: <2h fora da incubadora")
  }
  if (hasCells && entry.with_cells === 0) {
    notes.push("⚠️ Nenhum estudo com células neste material no DB")
  }

  switch (material) {
    case "GelMA":
      notes.push("💡 Crosslinking UV 365 nm, 30–60 s pós-impressão")
      notes.push("🌡️ Imprimir a 20–25°C, manter em banho de gelo durante prep")
      break
    case "Alginate":
      notes.push("💡 Crosslinking iônico: CaCl₂ 50–200 mM imediatamente")
      notes.push("🌡️ Temperatura de impressão: ambiente (18–25°C)")
      break
    case "PCL":
      notes.push("🔥 Material fundido: temperatura de fusão 55–65°C")
      notes.push("⚗️ Scaffolds rígidos — sem células durante impressão")
      break
    case "Gelatin":
      notes.push("🌡️ Temperatura crítica: ≥26°C = gel, <22°C = solução")
      notes.push("💡 Crosslinking: glutaraldeído 0.5% ou EDC/NHS")
      break
    case "Collagen":
      notes.push("❄️ Preparar e imprimir a 4°C — gelifica a 37°C")
      notes.push("💡 Crosslinking térmico na incubadora 37°C/30 min")
      break
    case "Fibrinogen":
      notes.push("💊 Ativar com trombina 1–5 U/mL — gelifica em 5–10 min")
      notes.push("🌡️ Imprimir a 37°C ou temperatura ambiente")
      break
    case "dECM":
      notes.push("🧬 Decellularized ECM — bioink mais biomimético disponível")
      notes.push("❄️ Preparar a 4°C, imprimir a 15–25°C, gelificar a 37°C")
      break
    case "Hyaluronic Acid":
      notes.push("💡 Crosslinking UV ou BDDE químico")
      notes.push("🔬 Excelente para tecidos de cartilagem e córnea")
      break
  }

  if (entry.dois[0]) {
    notes.push(`📚 DOI referência: ${entry.dois[0]}`)
  }

  return notes
}
