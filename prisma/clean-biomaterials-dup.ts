/**
 * Remove biomateriais duplicados do seed antigo:
 * mantém sempre o registro criado pelo seed novo (nome canônico do catálogo BIA).
 *
 * Run: DATABASE_URL="..." npx tsx prisma/clean-biomaterials-dup.ts
 */

import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { neonConfig } from "@neondatabase/serverless"

// eslint-disable-next-line @typescript-eslint/no-require-imports
neonConfig.webSocketConstructor = require("ws")

const connectionString = process.env.DATABASE_URL ?? ""
if (!connectionString) throw new Error("DATABASE_URL required")

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaNeon({ connectionString } as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any)

// Nomes do seed antigo que precisam ser removidos
// (foram substituídos por nomes canônicos do catálogo BIA)
const OLD_NAMES_TO_REMOVE = [
  "Matrigel (BDR Biosciences)",          // → Matrigel™ / MEC Engelbreth
  "GelMA (Gelatina Metacrilada)",        // → Gelatina Metacrilada (GelMA)
  "PEGDA (PEG Diacrilato)",              // → Poli(etileno glicol) Diacrilato
  "PCL (Poli-ε-caprolactona)",           // → Policaprolactona
  "Ácido Hialurônico (HA)",              // → Ácido Hialurônico
  "Fibrina",                              // → Fibrinogênio/Fibrina
  "GelXA (Alginato + GelMA)",            // formulação antiga — agora em BIOINK_PRESETS
]

async function main() {
  console.log("🧹 Limpando biomateriais duplicados do seed antigo...\n")

  let removed = 0
  let protectedCount = 0

  for (const oldName of OLD_NAMES_TO_REMOVE) {
    const found = await prisma.biomaterial.findFirst({
      where: { name: oldName },
      select: { id: true, name: true, formulations: { select: { id: true } } },
    })

    if (!found) {
      console.log(`  ⏭️  ${oldName.padEnd(42)} — não encontrado`)
      continue
    }

    // Se tem formulation_records apontando, não podemos deletar (onDelete: NoAction).
    // Marcamos como isPublic=false para sumir da listagem pública.
    if (found.formulations.length > 0) {
      await prisma.biomaterial.update({
        where: { id: found.id },
        data: { isPublic: false, verified: false },
      })
      protectedCount++
      console.log(`  🔒 ${oldName.padEnd(42)} — ${found.formulations.length} uso(s), ocultado (isPublic=false)`)
    } else {
      await prisma.biomaterial.delete({ where: { id: found.id } })
      removed++
      console.log(`  🗑️  ${oldName.padEnd(42)} — REMOVIDO`)
    }
  }

  const total = await prisma.biomaterial.count({ where: { isPublic: true } })
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log(`  🗑️  Removidos:  ${removed}`)
  console.log(`  🔒 Ocultados:  ${protectedCount}`)
  console.log(`  📚 Total público final: ${total} biomateriais`)
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
}

main()
  .catch((e) => {
    console.error("❌ Clean falhou:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
