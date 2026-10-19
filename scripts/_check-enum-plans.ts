/**
 * Verifica se CLINICO e LAB_PRO existem no enum SubscriptionPlan em Neon.
 * Uso: npx tsx scripts/_check-enum-plans.ts
 */
import { prisma } from "../src/lib/db/prisma"

async function main() {
  const result = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
    SELECT enumlabel::text AS enumlabel FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SubscriptionPlan')
    ORDER BY enumsortorder;
  `
  console.log("SubscriptionPlan values in Neon:")
  for (const r of result) console.log("  •", r.enumlabel)

  const names = result.map(r => r.enumlabel)
  const hasClinico = names.includes("CLINICO")
  const hasLabPro = names.includes("LAB_PRO")
  console.log()
  console.log(hasClinico ? "✅ CLINICO presente" : "❌ CLINICO ausente")
  console.log(hasLabPro  ? "✅ LAB_PRO presente" : "❌ LAB_PRO ausente")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
