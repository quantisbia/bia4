/**
 * Seed: Biomateriais básicos para BIA v4
 * Run: npx tsx scripts/seed-biomaterials.ts
 */

import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { neonConfig } from "@neondatabase/serverless"

// eslint-disable-next-line @typescript-eslint/no-require-imports
neonConfig.webSocketConstructor = require("ws")

const connectionString = process.env.DATABASE_URL ?? ""
if (!connectionString) throw new Error("DATABASE_URL is required")

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaNeon({ connectionString } as any)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any)

const BIOMATERIALS = [
  {
    name: "GelMA (Gelatina Metacrilada)",
    category: "HYDROGEL" as const,
    components: ["Gelatina", "Metacrilato de anidrido", "Fotoiniciador LAP"],
    composition: { gelatin: "5-15% w/v", crosslinker: "LAP 0.25%", uv_exposure: "30-60s" },
    elasticity: 1.5,
    porosity: 85.0,
    degradationTime: "2-8 semanas",
    biocompatibility: "Excelente — suporta adesão, proliferação e diferenciação celular",
    printable: true,
    crosslinking: "Fotopolimerização UV (365nm, 50mW/cm²)",
    applications: ["Bioimpressão", "Engenharia de cartilagem", "Pele artificial", "Modelos vasculares"],
    tissueTypes: ["Cartilagem", "Pele", "Músculo", "Vascular"],
    references: ["Nichol et al. 2010 Biomaterials", "Yue et al. 2015 Biomaterials"],
    doi: ["10.1016/j.biomaterials.2010.01.078"],
    tags: ["hidrogel", "gelma", "fotopolimerizável", "bioink", "UV"],
    isPublic: true,
    verified: true,
  },
  {
    name: "Alginato de Sódio",
    category: "HYDROGEL" as const,
    components: ["Alginato de sódio", "CaCl2 (crosslinker)"],
    composition: { alginate: "1-4% w/v", cacl2: "100-200mM", gelation: "ionic" },
    elasticity: 0.5,
    porosity: 90.0,
    degradationTime: "4-12 semanas",
    biocompatibility: "Boa — inerte, baixa imunogenicidade, aprovado FDA",
    printable: true,
    crosslinking: "Iônico — CaCl2 50-200mM",
    applications: ["Encapsulamento celular", "Bioimpressão", "Liberação controlada", "Modelo tumoral"],
    tissueTypes: ["Pâncreas", "Fígado", "Cartilagem", "Universal"],
    references: ["Lee & Mooney 2012 Progress in Polymer Science"],
    doi: ["10.1016/j.progpolymsci.2011.06.003"],
    tags: ["alginato", "hidrogel", "encapsulamento", "ionic crosslinking"],
    isPublic: true,
    verified: true,
  },
  {
    name: "Fibrina",
    category: "HYDROGEL" as const,
    components: ["Fibrinogênio", "Trombina", "CaCl2"],
    composition: { fibrinogen: "5-20mg/mL", thrombin: "1-10 U/mL", cacl2: "2-5mM" },
    elasticity: 0.3,
    porosity: 80.0,
    degradationTime: "1-4 semanas",
    biocompatibility: "Excelente — componente natural da matriz extracelular",
    printable: true,
    crosslinking: "Enzimático — Trombina catalisa polimerização",
    applications: ["Wound healing", "Engenharia vascular", "Scaffold dérmico", "Entrega de células-tronco"],
    tissueTypes: ["Pele", "Vascular", "Osso", "Músculo"],
    references: ["Ahmed et al. 2008 Tissue Engineering"],
    doi: ["10.1089/ten.tea.2007.0436"],
    tags: ["fibrina", "fibrinogênio", "trombin", "wound healing", "natural"],
    isPublic: true,
    verified: true,
  },
  {
    name: "Colágeno Tipo I",
    category: "HYDROGEL" as const,
    components: ["Colágeno bovino tipo I", "PBS", "NaOH neutralizante"],
    composition: { collagen: "2-8 mg/mL", ph: "7.4", temperature: "37°C" },
    elasticity: 0.1,
    porosity: 95.0,
    degradationTime: "1-3 semanas",
    biocompatibility: "Excelente — proteína estrutural mais abundante do corpo",
    printable: true,
    crosslinking: "Térmico — gelificação a 37°C (fibrilogênese)",
    applications: ["Scaffold 3D", "Modelos in vitro", "Regeneração óssea", "Pele artificial"],
    tissueTypes: ["Pele", "Osso", "Tendão", "Córnea", "Vascular"],
    references: ["Parenteau-Bareil et al. 2010 Materials"],
    doi: ["10.3390/ma3031863"],
    tags: ["colágeno", "tipo I", "ECM", "scaffold", "natural"],
    isPublic: true,
    verified: true,
  },
  {
    name: "PCL (Poli-ε-caprolactona)",
    category: "SCAFFOLD" as const,
    components: ["Poli-ε-caprolactona"],
    composition: { molecular_weight: "80.000 Da", concentration: "15-25% w/v", solvent: "DCM ou HFIP" },
    elasticity: 300.0,
    porosity: 70.0,
    degradationTime: "2-3 anos",
    biocompatibility: "Boa — aprovado FDA, degradação lenta",
    printable: true,
    crosslinking: "Fusão/solidificação — extrusão a 60-90°C",
    applications: ["Scaffold ósseo", "Eletrofiação", "Implante médico", "Drug delivery"],
    tissueTypes: ["Osso", "Cartilagem", "Vascular", "Nervoso"],
    references: ["Woodruff & Hutmacher 2010 Progress in Polymer Science"],
    doi: ["10.1016/j.progpolymsci.2010.04.002"],
    tags: ["PCL", "poliéster", "biodegradável", "scaffold", "sintético"],
    isPublic: true,
    verified: true,
  },
  {
    name: "Matrigel (BDR Biosciences)",
    category: "HYDROGEL" as const,
    components: ["Laminina", "Colágeno IV", "Entactina", "HSPG"],
    composition: { protein_concentration: "8-12 mg/mL", major_component: "Laminina 60%", secondary: "Colágeno IV 30%" },
    elasticity: 0.04,
    porosity: 99.0,
    degradationTime: "1-2 semanas",
    biocompatibility: "Excelente — ECM extraída de tumor de Engelbreth-Holm-Swarm",
    printable: false,
    crosslinking: "Térmico — gelificação a 37°C",
    applications: ["Cultura 3D", "Organoides", "Invasão tumoral", "Vascularização"],
    tissueTypes: ["Organoides", "Glandular", "Tumoral", "Universal"],
    references: ["Kleinman & Martin 2005 Seminars in Cancer Biology"],
    doi: ["10.1016/j.semcancer.2005.05.004"],
    tags: ["matrigel", "ECM", "organoides", "basement membrane", "laminina"],
    isPublic: true,
    verified: true,
  },
  {
    name: "PEGDA (PEG Diacrilato)",
    category: "HYDROGEL" as const,
    components: ["PEG-diacrilato", "Fotoiniciador I2959 ou LAP"],
    composition: { pegda: "5-20% w/v", photoinitiator: "LAP 0.1-0.5%", mw: "3400-20000 Da" },
    elasticity: 5.0,
    porosity: 80.0,
    degradationTime: "Meses (ajustável)",
    biocompatibility: "Boa — bioinerte, requer funcionalização para adesão celular",
    printable: true,
    crosslinking: "Fotopolimerização UV/visible light",
    applications: ["Scaffold modular", "Bioimpressão SLA/DLP", "Drug delivery", "Revestimentos"],
    tissueTypes: ["Cartilagem", "Cardiovascular", "Nervoso", "Universal"],
    references: ["Zhu 2010 Biomaterials"],
    doi: ["10.1016/j.biomaterials.2010.02.044"],
    tags: ["PEGDA", "PEG", "sintético", "fotopolimerizável", "bioinerte"],
    isPublic: true,
    verified: true,
  },
  {
    name: "Quitosana",
    category: "HYDROGEL" as const,
    components: ["Quitosana", "Ácido acético (solubilizante)", "NaOH (gelificante)"],
    composition: { chitosan: "1-3% w/v", deacetylation: ">85%", ph_gelation: "7.0-7.4" },
    elasticity: 2.0,
    porosity: 75.0,
    degradationTime: "4-24 semanas",
    biocompatibility: "Excelente — antimicrobiano, pró-cicatrização, FDA GRAS",
    printable: true,
    crosslinking: "Físico (pH) ou químico (glutaraldeído)",
    applications: ["Wound healing", "Liberação de fármacos", "Engenharia óssea", "Revestimento implantes"],
    tissueTypes: ["Pele", "Osso", "Cartilagem", "Mucosa"],
    references: ["Croisier & Jérôme 2013 European Polymer Journal"],
    doi: ["10.1016/j.eurpolymj.2013.04.010"],
    tags: ["quitosana", "chitosan", "natural", "antimicrobiano", "wound healing"],
    isPublic: true,
    verified: true,
  },
  {
    name: "Ácido Hialurônico (HA)",
    category: "HYDROGEL" as const,
    components: ["Ácido hialurônico", "Crosslinker BDDE ou DVS"],
    composition: { ha: "1-4% w/v", mw: "1-4 MDa", crosslinker: "BDDE 0.5-2%" },
    elasticity: 0.8,
    porosity: 92.0,
    degradationTime: "2-6 semanas",
    biocompatibility: "Excelente — glicosaminoglicano natural, anti-inflamatório",
    printable: true,
    crosslinking: "Químico — BDDE, DVS, ou EDC/NHS",
    applications: ["Injeção articular", "Preenchimento dérmico", "Scaffold ocular", "Cartilagem"],
    tissueTypes: ["Cartilagem", "Pele", "Olho", "Articular"],
    references: ["Burdick & Prestwich 2011 Advanced Materials"],
    doi: ["10.1002/adma.201003963"],
    tags: ["ácido hialurônico", "HA", "GAG", "injetável", "articular"],
    isPublic: true,
    verified: true,
  },
  {
    name: "GelXA (Alginato + GelMA)",
    category: "BIOINK" as const,
    components: ["GelMA", "Alginato de sódio", "CaCl2", "LAP fotoiniciador"],
    composition: { gelma: "5-10% w/v", alginate: "1-2% w/v", lap: "0.25%", cacl2: "100mM" },
    elasticity: 3.0,
    porosity: 85.0,
    degradationTime: "3-8 semanas",
    biocompatibility: "Excelente — combina vantagens de ambos os componentes",
    printable: true,
    crosslinking: "Duplo: iônico (CaCl2) + fotopolimerização UV",
    applications: ["Bioimpressão de alta fidelidade", "Tecido cardíaco", "Vascular", "Osso"],
    tissueTypes: ["Cardíaco", "Vascular", "Osso", "Cartilagem"],
    references: ["Jia et al. 2016 Biomaterials"],
    doi: ["10.1016/j.biomaterials.2016.01.016"],
    tags: ["gelxa", "composto", "gelma", "alginato", "bioink", "dual crosslinking"],
    isPublic: true,
    verified: true,
  },
]

async function main() {
  console.log("🌱 Seeding biomaterials...")
  
  let created = 0
  let skipped = 0
  
  for (const bio of BIOMATERIALS) {
    try {
      const existing = await prisma.biomaterial.findFirst({
        where: { name: bio.name },
      })
      
      if (existing) {
        console.log(`  ⏭  Skipping: ${bio.name}`)
        skipped++
        continue
      }
      
      await prisma.biomaterial.create({ data: bio })
      console.log(`  ✅ Created: ${bio.name}`)
      created++
    } catch (err) {
      console.error(`  ❌ Error creating ${bio.name}:`, err)
    }
  }
  
  console.log(`\n🎉 Done! Created: ${created}, Skipped: ${skipped}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
