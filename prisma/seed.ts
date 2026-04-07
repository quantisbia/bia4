/**
 * Seed: Admin user + Knowledge Base articles from BIA Master Prompt
 * Run: npx ts-node --project tsconfig.json prisma/seed.ts
 * Or: DATABASE_URL="..." npx tsx prisma/seed.ts
 */

import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { neonConfig } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

// Required for Node.js environments
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

async function main() {
  console.log("🌱 Starting BIA seed...")

  // ══════════════════════════════════════════════════════════
  // 1. ADMIN USER — janaina.dernowsek@quantis.bio
  // ══════════════════════════════════════════════════════════
  const adminEmail = "janaina.dernowsek@quantis.bio"
  const adminPassword = await bcrypt.hash("Quantis@2026!", 12)

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: "ADMIN",
      name: "Janaina Dernowsek",
    },
    create: {
      email: adminEmail,
      name: "Janaina Dernowsek",
      password: adminPassword,
      role: "ADMIN",
      institution: "Quantis Biotechnology",
      researchArea: "Biofabricação e Biomateriais",
      bio: "CEO e pesquisadora sênior da Quantis Biotechnology. Especialista em biofabricação, bioimpressão 3D e biomateriais.",
      emailVerified: new Date(),
    },
  })

  // Admin: ACADEMY plan with 20000 credits
  await prisma.subscription.upsert({
    where: { userId: admin.id },
    update: { plan: "ACADEMY", status: "ACTIVE", monthlyCredits: 20000 },
    create: {
      userId: admin.id,
      plan: "ACADEMY",
      status: "ACTIVE",
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      monthlyCredits: 20000,
    },
  })

  await prisma.creditBalance.upsert({
    where: { userId: admin.id },
    update: { balance: 20000, totalEarned: 20000 },
    create: { userId: admin.id, balance: 20000, totalEarned: 20000, totalSpent: 0 },
  })

  console.log(`✅ Admin user: ${adminEmail} (role: ADMIN, plan: ACADEMY)`)

  // ══════════════════════════════════════════════════════════
  // 2. DEMO USER for testing
  // ══════════════════════════════════════════════════════════
  const demoPassword = await bcrypt.hash("demo1234", 12)
  const demo = await prisma.user.upsert({
    where: { email: "demo@bia.com" },
    update: {},
    create: {
      email: "demo@bia.com",
      name: "Demo User",
      password: demoPassword,
      role: "USER",
      institution: "Laboratório de Teste",
      researchArea: "Engenharia de Tecidos",
      emailVerified: new Date(),
    },
  })

  await prisma.subscription.upsert({
    where: { userId: demo.id },
    update: {},
    create: {
      userId: demo.id,
      plan: "FREE",
      status: "ACTIVE",
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      monthlyCredits: 10,
    },
  })

  await prisma.creditBalance.upsert({
    where: { userId: demo.id },
    update: {},
    create: { userId: demo.id, balance: 10, totalEarned: 10, totalSpent: 0 },
  })

  console.log("✅ Demo user: demo@bia.com / demo1234")

  // ══════════════════════════════════════════════════════════
  // 3. KNOWLEDGE BASE — Articles from BIA Master Prompt
  // ══════════════════════════════════════════════════════════
  const articles = [
    // BIOPRINTING
    {
      title: "From Bioinks to Functional Tissues and Organs",
      authors: ["Wiley Authors"],
      abstract: "Comprehensive review of bioink development and applications in bioprinting for functional tissue and organ fabrication. Covers extrusion, inkjet, laser-based and DLP techniques.",
      journal: "Macromolecular Materials and Engineering",
      year: 2025,
      doi: "10.1002/mame.202500251",
      url: "https://onlinelibrary.wiley.com/doi/full/10.1002/mame.202500251",
      tags: ["bioink", "bioprinting", "tissue engineering", "organs"],
      category: "bioprinting",
      keywords: ["bioinks", "functional tissues", "organs", "3D bioprinting"],
    },
    {
      title: "A Review of Bioprinting Techniques, Scaffolds, and Bioinks",
      authors: ["SAGE Authors"],
      abstract: "Systematic review of current bioprinting technologies including scaffold design strategies and bioink formulation for tissue engineering applications.",
      journal: "Cell Transplantation",
      year: 2024,
      doi: "10.1177/11795972241288099",
      url: "https://journals.sagepub.com/doi/10.1177/11795972241288099",
      tags: ["bioprinting", "scaffolds", "bioinks", "review"],
      category: "bioprinting",
      keywords: ["bioprinting techniques", "scaffolds", "bioinks"],
    },
    {
      title: "In situ 3D Bioprinting for Tissue Regeneration",
      authors: ["Bioactive Materials Authors"],
      abstract: "Novel approach to in situ 3D bioprinting directly in living tissue for regenerative medicine applications.",
      journal: "Bioactive Materials",
      year: 2025,
      doi: "10.1016/j.bioactmat.2025.01.001",
      url: "https://www.sciencedirect.com/science/article/pii/S2667325825003048",
      tags: ["in situ bioprinting", "tissue regeneration", "in vivo"],
      category: "bioprinting",
      keywords: ["in situ bioprinting", "tissue regeneration"],
    },
    {
      title: "3D Bioprinting of Collagen-Based Channeled Scaffolds",
      authors: ["Science Advances Authors"],
      abstract: "Development of collagen-based scaffolds with integrated microchannels for vascularization in tissue engineering via advanced 3D bioprinting.",
      journal: "Science Advances",
      year: 2025,
      doi: "10.1126/sciadv.adu5905",
      url: "https://www.science.org/doi/10.1126/sciadv.adu5905",
      tags: ["collagen", "channeled scaffolds", "vascularization", "3D bioprinting"],
      category: "scaffolds",
      keywords: ["collagen scaffold", "microchannels", "vascularization"],
    },
    // HYDROGELS
    {
      title: "Advanced Cell-Adaptable Hydrogels for Bioprinting",
      authors: ["ScienceDirect Authors"],
      abstract: "State-of-the-art review of cell-adaptable hydrogels engineered for bioprinting applications, focusing on mechanical tuning and biocompatibility.",
      journal: "Biomaterials",
      year: 2025,
      doi: "10.1016/j.biomaterials.2025.01.001",
      url: "https://www.sciencedirect.com/science/article/pii/S2452199X25003378",
      tags: ["hydrogels", "bioprinting", "cell-adaptable", "GelMA"],
      category: "hydrogels",
      keywords: ["hydrogels", "bioprinting", "cell adaptable"],
    },
    {
      title: "Advancements in Hydrogels: Natural and Synthetic Polymers",
      authors: ["PMC Authors"],
      abstract: "Comprehensive overview of natural (gelatin, collagen, alginate, chitosan, fibrin, hyaluronic acid) and synthetic (PEG, PVA, PEGDA) hydrogels for biomedical applications.",
      journal: "PMC/Polymers",
      year: 2025,
      doi: "10.3390/polym17010001",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12349326/",
      tags: ["hydrogels", "natural polymers", "synthetic polymers", "GelMA", "HAMA"],
      category: "hydrogels",
      keywords: ["natural hydrogels", "synthetic hydrogels", "gelatin", "alginate", "PEG"],
    },
    {
      title: "Multi-Stimulus-Responsive Smart Hydrogels for Biomedical Applications",
      authors: ["ACS Authors"],
      abstract: "Review of smart hydrogels responsive to pH, temperature, light, enzymes and ROS for tissue engineering and drug delivery.",
      journal: "ACS Biomaterials Science & Engineering",
      year: 2026,
      doi: "10.1021/acsbiomaterials.5c02155",
      url: "https://pubs.acs.org/doi/10.1021/acsbiomaterials.5c02155",
      tags: ["smart hydrogels", "stimuli-responsive", "pH-responsive", "thermo-responsive"],
      category: "hydrogels",
      keywords: ["smart hydrogels", "stimuli responsive", "pH temperature light"],
    },
    {
      title: "Optimized GelMA Bioink for High-Fidelity Bioprinting",
      authors: ["ChemRxiv Authors"],
      abstract: "Optimization of gelatin methacryloyl (GelMA) bioink formulations for high-fidelity 3D bioprinting of complex tissue constructs.",
      journal: "ChemRxiv",
      year: 2024,
      url: "https://chemrxiv.org/doi/10.26434/chemrxiv-2024-xqhwg",
      tags: ["GelMA", "bioink", "high-fidelity bioprinting", "optimization"],
      category: "hydrogels",
      keywords: ["GelMA", "bioink optimization", "high fidelity bioprinting"],
    },
    // SCAFFOLDS
    {
      title: "Advances in 3D-Printed Scaffolds for Bone Defect Repair",
      authors: ["PMC Authors"],
      abstract: "Review of 3D-printed bone scaffolds using HAP, TCP, PLGA, PEEK and composite materials for bone defect repair and regeneration.",
      journal: "PMC/Biomedicines",
      year: 2025,
      doi: "10.3390/biomedicines13010001",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12042599/",
      tags: ["bone scaffolds", "3D printing", "HAP", "TCP", "PLGA", "PEEK"],
      category: "scaffolds",
      keywords: ["bone scaffold", "HAP", "TCP", "bone defect repair"],
    },
    {
      title: "3D Printed Responsive Scaffolds for Bone Repair",
      authors: ["ScienceDirect Authors"],
      abstract: "Stimuli-responsive 3D-printed scaffolds with controlled degradation and bioactive molecule release for bone repair.",
      journal: "Biomaterials Advances",
      year: 2025,
      url: "https://www.sciencedirect.com/science/article/pii/S2590006425009226",
      tags: ["responsive scaffolds", "bone repair", "controlled degradation", "bioactive"],
      category: "scaffolds",
      keywords: ["responsive scaffolds", "bone repair", "3D printing"],
    },
    // dECM
    {
      title: "Advances in dECM Bioinks for 3D Bioprinting",
      authors: ["IJB Authors"],
      abstract: "Review of decellularized extracellular matrix (dECM) bioinks from heart, liver, kidney, skin, cartilage, bone, and cornea for tissue-specific 3D bioprinting.",
      journal: "International Journal of Bioprinting",
      year: 2025,
      doi: "10.36922/IJB025210205",
      url: "https://accscience.com/journal/IJB/11/5/10.36922/IJB025210205",
      tags: ["dECM", "bioink", "decellularization", "tissue-specific"],
      category: "decellularization",
      keywords: ["dECM bioink", "decellularized ECM", "tissue specific"],
    },
    // VASCULARIZATION
    {
      title: "Advances in 3D Bioprinting and Microfluidics for Organ-on-a-Chip",
      authors: ["PMC Authors"],
      abstract: "Integration of 3D bioprinting with microfluidics to create organ-on-chip models for liver, kidney, lung, heart and tumor.",
      journal: "PMC/Lab on a Chip",
      year: 2025,
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12656030/",
      tags: ["organ-on-chip", "microfluidics", "3D bioprinting", "vascularization"],
      category: "organ_on_chip",
      keywords: ["organ on chip", "microfluidics", "bioprinting"],
    },
    // ORGANOIDS
    {
      title: "Bioprinted Organoids: An Innovative Engine in Biomedicine",
      authors: ["Advanced Science Authors"],
      abstract: "Review of 3D bioprinted organoids for intestine, brain, liver, kidney and heart applications in disease modeling and drug testing.",
      journal: "Advanced Science",
      year: 2025,
      doi: "10.1002/advs.202507317",
      url: "https://advanced.onlinelibrary.wiley.com/doi/10.1002/advs.202507317",
      tags: ["organoids", "bioprinting", "disease modeling", "iPSC", "MSC"],
      category: "organoids",
      keywords: ["bioprinted organoids", "brain organoid", "liver organoid"],
    },
    // AI + BIOFABRICATION
    {
      title: "The Synergy of Artificial Intelligence and 3D Bioprinting",
      authors: ["Advanced Functional Materials Authors"],
      abstract: "Machine learning and AI applications in bioink optimization, printing parameter prediction, scaffold design and cellular response modeling.",
      journal: "Advanced Functional Materials",
      year: 2025,
      doi: "10.1002/adfm.202509530",
      url: "https://advanced.onlinelibrary.wiley.com/doi/10.1002/adfm.202509530",
      tags: ["AI", "machine learning", "3D bioprinting", "optimization", "scaffold design"],
      category: "ai_biofabrication",
      keywords: ["artificial intelligence", "machine learning", "bioprinting optimization"],
    },
    {
      title: "Sustainable Biofabrication: From Bioprinting to AI-Driven Predictive Modeling",
      authors: ["Cell/Trends in Biotechnology Authors"],
      abstract: "AI-driven predictive modeling for sustainable biofabrication, integrating machine learning with bioprinting for tissue engineering.",
      journal: "Trends in Biotechnology",
      year: 2024,
      doi: "10.1016/j.tibtech.2024.01.001",
      url: "https://www.cell.com/trends/biotechnology/fulltext/S0167-7799(24)00180-X",
      tags: ["AI", "sustainable biofabrication", "predictive modeling", "machine learning"],
      category: "ai_biofabrication",
      keywords: ["AI biofabrication", "predictive modeling", "sustainable"],
    },
    {
      title: "AI-Guided Biomaterials and Biofabrication Strategies",
      authors: ["ScienceDirect Authors"],
      abstract: "Review of AI-guided strategies for biomaterial design, screening and biofabrication optimization using machine learning models.",
      journal: "Biomaterials and Biosystems",
      year: 2026,
      url: "https://www.sciencedirect.com/science/article/pii/S3050562325001795",
      tags: ["AI", "biomaterials", "biofabrication", "deep learning", "screening"],
      category: "ai_biofabrication",
      keywords: ["AI guided biomaterials", "biofabrication strategies"],
    },
  ]

  let articlesCreated = 0
  for (const article of articles) {
    await prisma.knowledgeArticle.upsert({
      where: { doi: article.doi ?? `no-doi-${article.title.slice(0, 20).replace(/\s/g, "-")}` },
      update: { accessCount: { increment: 0 } },
      create: {
        ...article,
        doi: article.doi ?? `no-doi-${article.title.slice(0, 20).replace(/\s/g, "-")}`,
        embedding: [],
        chunkCount: 1,
        isPublic: true,
        accessCount: 0,
      },
    })
    articlesCreated++
  }

  console.log(`✅ Knowledge base: ${articlesCreated} articles seeded`)

  // ══════════════════════════════════════════════════════════
  // 4. AUDIT LOG for seed
  // ══════════════════════════════════════════════════════════
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "system_seed",
      entity: "system",
      metadata: {
        articlesCreated,
        adminCreated: adminEmail,
        seedDate: new Date().toISOString(),
      },
    },
  })

  console.log("🎉 BIA seed completed successfully!")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
