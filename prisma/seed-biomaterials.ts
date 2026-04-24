/**
 * Seed: popular banco com os 30+ biomateriais do catálogo BIA
 * (src/lib/bioprinting/biomaterials.ts) para que o Formulador Bio
 * e o Motor GCODE usem exatamente a mesma biblioteca.
 *
 * Run: DATABASE_URL="..." npx tsx prisma/seed-biomaterials.ts
 *      ou  npm run db:seed:biomaterials
 */

import { PrismaClient, Prisma } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { neonConfig } from "@neondatabase/serverless"
import { BIOMATERIALS, type Biomaterial } from "../src/lib/bioprinting/biomaterials"

// Required for Node.js environments (WS driver)
// eslint-disable-next-line @typescript-eslint/no-require-imports
neonConfig.webSocketConstructor = require("ws")

const connectionString = process.env.DATABASE_URL ?? ""
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required")
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaNeon({ connectionString } as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any)

// ──────────────────────────────────────────────────────────
// MAPEAMENTO:  categoria do catálogo  →  enum Prisma
// ──────────────────────────────────────────────────────────
type PrismaCategory =
  | "HYDROGEL" | "SCAFFOLD" | "BIOINK" | "MEMBRANE"
  | "COATING" | "COMPOSITE" | "DECELLULARIZED" | "NANOPARTICLE"

function mapCategory(bm: Biomaterial): PrismaCategory {
  // 1) Matrix descelularizada
  if (bm.category === "decellularized") return "DECELLULARIZED"

  // 2) Composto / mistura pronta (formulações curadas)
  if (bm.category === "composite") return "COMPOSITE"

  // 3) Nanopartículas / reforços
  if (["graphene_oxide", "cnc", "hydroxyapatite", "tcp", "bioactive_glass"].includes(bm.id)) {
    return "NANOPARTICLE"
  }

  // 4) Scaffolds rígidos (termoplásticos/cerâmicas sinterizadas)
  if (["pcl", "plga", "polyurethane"].includes(bm.id)) return "SCAFFOLD"

  // 5) Coatings / peptídeos bioativos
  if (["rgd_peptide", "laminin", "collagen_IV"].includes(bm.id)) return "COATING"

  // 6) Demais — bioinks imprimíveis viram BIOINK se tiverem extrusion + células
  //    caso contrário classificam como HYDROGEL
  const isBioink =
    bm.printability.includes("extrusion") &&
    ["gelma", "alg_gel_standard", "gelma_ha_cartilage", "col_fibrin_vascular", "gelma_decm_heart"].includes(bm.id)
  if (isBioink) return "BIOINK"

  return "HYDROGEL"
}

// ──────────────────────────────────────────────────────────
// Converter registro do catálogo → payload Prisma
// ──────────────────────────────────────────────────────────
function toPrismaPayload(bm: Biomaterial) {
  const category = mapCategory(bm)

  // composition Json — guardamos dados quantitativos
  const composition: Record<string, unknown> = {
    concentration: `${bm.concentrationRange.min}–${bm.concentrationRange.max} ${bm.concentrationRange.unit} (típico ${bm.concentrationRange.typical})`,
    crosslink: bm.crosslink,
    modulus_kPa: `${bm.modulus_kPa.min}–${bm.modulus_kPa.max} kPa`,
    poreSize_um: `${bm.poreSize_um.min}–${bm.poreSize_um.max} µm`,
    printability: bm.printability,
    cellViability_24h_pct: bm.cellViability_24h_pct,
    costTier: bm.costTier,
    icon: bm.icon,
    shortName: bm.shortName,
    family: bm.family,
  }
  if (bm.diffusionCoeff) composition.diffusion = bm.diffusionCoeff
  if (bm.viscosity_Pas) {
    composition.viscosity_Pas = `${bm.viscosity_Pas.min}–${bm.viscosity_Pas.max} Pa·s`
  }
  if (bm.regulatoryStatus) composition.regulatoryStatus = bm.regulatoryStatus
  if (bm.typicalPartners) composition.typicalPartners = bm.typicalPartners
  composition.pros = bm.pros
  composition.cons = bm.cons

  // crosslinking legível
  const crosslinkingText = bm.crosslink.map((c) => {
    switch (c) {
      case "ionic": return "Iônico (Ca²⁺/Ba²⁺)"
      case "photo_UV": return "Foto-reticulação UV 365 nm"
      case "photo_visible": return "Foto-reticulação visível (LAP 405 nm)"
      case "thermal": return "Térmico (resfriamento/aquecimento)"
      case "enzymatic": return "Enzimático (trombina, transglutaminase)"
      case "physical": return "Físico (H-bonds, self-assembly)"
      case "chemical": return "Químico (EDC/NHS, genipina)"
    }
  }).join(" + ")

  return {
    name: bm.name,
    category,
    components: [bm.shortName, bm.family],
    composition,
    elasticity: (bm.modulus_kPa.min + bm.modulus_kPa.max) / 2,     // kPa média
    porosity: null,                                                 // não armazenado puntual
    degradationTime: bm.regulatoryStatus ?? null,
    biocompatibility:
      bm.cellViability_24h_pct >= 90 ? "Excelente — viabilidade >90% em 24h" :
      bm.cellViability_24h_pct >= 80 ? "Boa — viabilidade 80–90% em 24h" :
      bm.cellViability_24h_pct >= 70 ? "Moderada — viabilidade 70–80% em 24h" :
      "Limitada — viabilidade <70% em 24h",
    printable: bm.printability.length > 0,
    crosslinking: crosslinkingText,
    applications: bm.tissueApplications,
    tissueTypes: bm.tissueApplications,
    references: bm.keyReferences,
    doi: [],
    tags: [
      bm.id,
      bm.family.toLowerCase(),
      ...bm.printability,
      ...bm.crosslink,
      bm.category,
    ],
    isPublic: true,
    verified: true,
  }
}

// ──────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────
async function main() {
  console.log(`🌱 Populando banco com ${BIOMATERIALS.length} biomateriais do catálogo BIA…`)

  let created = 0
  let updated = 0

  for (const bm of BIOMATERIALS) {
    const payload = toPrismaPayload(bm)

    // upsert por NAME (único na prática — não há unique constraint, então fazemos manual)
    const existing = await prisma.biomaterial.findFirst({
      where: { name: payload.name },
      select: { id: true },
    })

    if (existing) {
      await prisma.biomaterial.update({
        where: { id: existing.id },
        // cast: composition é Json (aceita qualquer objeto serializável)
        data: payload as Prisma.BiomaterialUpdateInput,
      })
      updated++
      process.stdout.write(`  ✏️  ${bm.icon} ${bm.name.padEnd(42)} [${payload.category}]\n`)
    } else {
      await prisma.biomaterial.create({
        data: payload as Prisma.BiomaterialCreateInput,
      })
      created++
      process.stdout.write(`  ✅ ${bm.icon} ${bm.name.padEnd(42)} [${payload.category}]\n`)
    }
  }

  const total = await prisma.biomaterial.count({ where: { isPublic: true } })
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log(`  ✅ Criados:    ${created}`)
  console.log(`  ✏️  Atualizados: ${updated}`)
  console.log(`  📚 Total no banco: ${total} biomateriais públicos`)
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
}

main()
  .catch((e) => {
    console.error("❌ Seed falhou:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
