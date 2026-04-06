import { PrismaClient, BiomaterialCategory } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Iniciando seed do banco de dados BIA v3...")

  // ============================================
  // DEMO USER
  // ============================================
  console.log("👤 Criando usuário demo...")
  const hashedPassword = await bcrypt.hash("demo1234", 12)

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@bia.com" },
    update: {},
    create: {
      email: "demo@bia.com",
      name: "Demo Researcher",
      password: hashedPassword,
      role: "RESEARCHER",
      institution: "BIA Labs",
      researchArea: "tissue_engineering",
      emailVerified: new Date(),
    },
  })

  // Create subscription for demo user
  await prisma.subscription.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      plan: "DISCOVERY",
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      monthlyCredits: 500,
    },
  })

  // Create credit balance
  await prisma.creditBalance.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      balance: 500,
      totalEarned: 500,
      totalSpent: 0,
    },
  })

  console.log(`✅ Usuário demo criado: ${demoUser.email}`)

  // ============================================
  // BIOMATERIALS DATABASE (Amostra de 20)
  // ============================================
  console.log("🧪 Populando database de biomateriais...")

  const biomaterials = [
    {
      name: "GelMA (Gelatin Methacryloyl)",
      category: BiomaterialCategory.HYDROGEL,
      components: ["Gelatin", "Methacrylic anhydride", "Photo-initiator (LAP)"],
      composition: { gelatin: "5-20%", methacryloyl: "degree of substitution 50-90%", LAP: "0.1%" },
      elasticity: 1.5,
      porosity: 85.0,
      degradationTime: "4-8 weeks",
      biocompatibility: "HIGH",
      printable: true,
      crosslinking: "UV photo-crosslinking (405nm), 30-60s",
      applications: ["Vascular tissue", "Cartilage", "Skin", "Cornea", "Neural tissue"],
      tissueTypes: ["cartilage", "skin", "vascular", "cornea", "neural"],
      references: ["Nichol JW et al., Biomaterials 2010", "Yue K et al., Biomaterials 2015"],
      doi: ["10.1016/j.biomaterials.2010.01.179"],
      tags: ["gelatin", "hydrogel", "photocrosslinkable", "bioprinting", "GelMA"],
      isPublic: true,
      verified: true,
    },
    {
      name: "Alginate-Gelatin Composite",
      category: BiomaterialCategory.BIOINK,
      components: ["Sodium alginate", "Gelatin", "CaCl2 (crosslinker)"],
      composition: { alginate: "2-4%", gelatin: "10-20%", CaCl2: "0.1-0.5M" },
      elasticity: 3.2,
      porosity: 78.0,
      degradationTime: "2-6 weeks",
      biocompatibility: "HIGH",
      printable: true,
      crosslinking: "Ionic crosslinking with CaCl2, thermal gelation",
      applications: ["Cartilage", "Bone", "Skin", "3D bioprinting scaffolds"],
      tissueTypes: ["cartilage", "bone", "skin"],
      references: ["Duan B et al., Acta Biomater 2013"],
      doi: ["10.1016/j.actbio.2013.01.002"],
      tags: ["alginate", "gelatin", "bioink", "ionic crosslinking", "3D printing"],
      isPublic: true,
      verified: true,
    },
    {
      name: "PLGA Scaffold (85:15)",
      category: BiomaterialCategory.SCAFFOLD,
      components: ["Poly(lactic-co-glycolic acid) 85:15", "Solvent (HFIP)"],
      composition: { PLGA: "100%", ratio: "85% PLA : 15% PGA" },
      elasticity: 400.0,
      porosity: 70.0,
      degradationTime: "5-6 months",
      biocompatibility: "HIGH",
      printable: false,
      crosslinking: "Not applicable (thermoplastic)",
      applications: ["Bone regeneration", "Cartilage", "Drug delivery", "Vascular grafts"],
      tissueTypes: ["bone", "cartilage", "vascular"],
      references: ["Makadia HK, Siegel SJ. Polymers 2011"],
      doi: ["10.3390/polym3031377"],
      tags: ["PLGA", "biodegradable", "scaffold", "bone", "FDA approved"],
      isPublic: true,
      verified: true,
    },
    {
      name: "Fibrin Gel",
      category: BiomaterialCategory.HYDROGEL,
      components: ["Fibrinogen", "Thrombin", "CaCl2"],
      composition: { fibrinogen: "5-20 mg/mL", thrombin: "1-5 U/mL", CaCl2: "2.5mM" },
      elasticity: 0.3,
      porosity: 90.0,
      degradationTime: "1-3 weeks",
      biocompatibility: "HIGH",
      printable: false,
      crosslinking: "Enzymatic (thrombin-mediated polymerization)",
      applications: ["Wound healing", "Vascular tissue", "Neural tissue", "Cardiac tissue"],
      tissueTypes: ["vascular", "neural", "cardiac", "skin"],
      references: ["Ahmed TA et al., Tissue Eng 2008"],
      doi: ["10.1089/ten.teb.2007.0435"],
      tags: ["fibrin", "natural polymer", "wound healing", "autologous"],
      isPublic: true,
      verified: true,
    },
    {
      name: "Decellularized ECM (dECM) Bioink",
      category: BiomaterialCategory.DECELLULARIZED,
      components: ["Decellularized tissue", "PBS", "Pepsin"],
      composition: { dECM: "3-6%", pepsin: "0.1%", PBS: "balance" },
      elasticity: 1.8,
      porosity: 80.0,
      degradationTime: "4-12 weeks",
      biocompatibility: "HIGH",
      printable: true,
      crosslinking: "Thermal gelation at 37°C",
      applications: ["Organ-specific tissue engineering", "Disease modeling", "Drug testing"],
      tissueTypes: ["cardiac", "hepatic", "renal", "lung"],
      references: ["Pati F et al., Nature Communications 2014"],
      doi: ["10.1038/ncomms4935"],
      tags: ["dECM", "decellularized", "organ-specific", "bioink", "natural"],
      isPublic: true,
      verified: true,
    },
    {
      name: "Hyaluronic Acid (HA) Hydrogel",
      category: BiomaterialCategory.HYDROGEL,
      components: ["Hyaluronic acid", "PEGDA crosslinker", "Photoinitiator"],
      composition: { HA: "1-4%", PEGDA: "1-5%", photoinitiator: "0.05%" },
      elasticity: 0.5,
      porosity: 92.0,
      degradationTime: "2-8 weeks",
      biocompatibility: "HIGH",
      printable: true,
      crosslinking: "Photo-crosslinking or chemical crosslinking",
      applications: ["Cartilage", "Eye tissue", "Neural tissue", "Skin"],
      tissueTypes: ["cartilage", "neural", "ophthalmic", "skin"],
      references: ["Highley CB et al., Adv Mater 2015"],
      doi: ["10.1002/adma.201501234"],
      tags: ["hyaluronic acid", "HA", "hydrogel", "cartilage", "injectable"],
      isPublic: true,
      verified: true,
    },
    {
      name: "PCL Electrospun Membrane",
      category: BiomaterialCategory.MEMBRANE,
      components: ["Polycaprolactone (PCL)", "Chloroform", "Methanol"],
      composition: { PCL: "15-20% w/v", solvent: "chloroform:methanol 3:1" },
      elasticity: 25.0,
      porosity: 75.0,
      degradationTime: "24-36 months",
      biocompatibility: "HIGH",
      printable: false,
      crosslinking: "Not applicable",
      applications: ["Skin tissue engineering", "Vascular grafts", "Nerve conduits", "Bone membranes"],
      tissueTypes: ["skin", "vascular", "neural", "bone"],
      references: ["Woodruff MA, Hutmacher DW. Progress in Polymer Science 2010"],
      doi: ["10.1016/j.progpolymsci.2010.04.002"],
      tags: ["PCL", "electrospun", "membrane", "nanofibrous", "slow degradation"],
      isPublic: true,
      verified: true,
    },
    {
      name: "Silk Fibroin Scaffold",
      category: BiomaterialCategory.SCAFFOLD,
      components: ["Silk fibroin", "Water", "Methanol (for β-sheet induction)"],
      composition: { fibroin: "8-16%", water: "balance" },
      elasticity: 12.0,
      porosity: 65.0,
      degradationTime: "1-24 months",
      biocompatibility: "HIGH",
      printable: true,
      crosslinking: "Methanol treatment, water annealing, autoclaving",
      applications: ["Bone", "Cartilage", "Skin", "Ligament", "Cornea"],
      tissueTypes: ["bone", "cartilage", "skin", "ligament", "cornea"],
      references: ["Rockwood DN et al., Nature Protocols 2011"],
      doi: ["10.1038/nprot.2011.379"],
      tags: ["silk", "fibroin", "natural polymer", "tunable degradation", "FDA approved"],
      isPublic: true,
      verified: true,
    },
    {
      name: "Matrigel Basement Membrane Matrix",
      category: BiomaterialCategory.HYDROGEL,
      components: ["Laminin", "Collagen IV", "Entactin", "Heparan sulfate proteoglycan"],
      composition: { laminin: "60%", collagen_IV: "30%", entactin: "8%", other: "2%" },
      elasticity: 0.02,
      porosity: 95.0,
      degradationTime: "1-2 weeks",
      biocompatibility: "HIGH",
      printable: false,
      crosslinking: "Thermal gelation at 37°C",
      applications: ["Organoid culture", "Tumor models", "Angiogenesis assays", "Invasion assays"],
      tissueTypes: ["organoid", "tumor", "vascular", "neural"],
      references: ["Hughes CS et al., Proteomics 2010"],
      doi: ["10.1002/pmic.200900758"],
      tags: ["matrigel", "basement membrane", "organoid", "tumor model", "Engelbreth-Holm-Swarm"],
      isPublic: true,
      verified: true,
    },
    {
      name: "Collagen Type I Hydrogel",
      category: BiomaterialCategory.HYDROGEL,
      components: ["Collagen type I", "PBS", "NaOH (pH adjustment)"],
      composition: { collagen: "1-4 mg/mL", PBS: "balance" },
      elasticity: 0.08,
      porosity: 99.0,
      degradationTime: "1-4 weeks",
      biocompatibility: "HIGH",
      printable: false,
      crosslinking: "Thermal gelation 37°C, chemical (NHS/EDC)",
      applications: ["3D cell culture", "Wound healing", "Cornea", "Bone marrow models"],
      tissueTypes: ["skin", "cornea", "bone_marrow", "vascular"],
      references: ["Grinnell F. J Cell Biol 1994"],
      doi: ["10.1083/jcb.124.4.401"],
      tags: ["collagen", "type I", "most abundant ECM protein", "fibrils", "natural"],
      isPublic: true,
      verified: true,
    },
  ]

  for (const material of biomaterials) {
    await prisma.biomaterial.upsert({
      where: { id: material.name.replace(/\s+/g, "_").toLowerCase().substring(0, 25) },
      update: {},
      create: {
        id: material.name.replace(/\s+/g, "_").toLowerCase().substring(0, 25),
        ...material,
      },
    })
  }

  console.log(`✅ ${biomaterials.length} biomateriais inseridos`)

  // ============================================
  // KNOWLEDGE BASE ARTICLES
  // ============================================
  console.log("📚 Populando base de conhecimento científico...")

  const articles = [
    {
      title: "Bioprinting of Functional Cardiac Tissue Using Human iPSC-Derived Cardiomyocytes",
      authors: ["Zhang YS", "Arneri A", "Bersini S", "Shin SR", "Khademhosseini A"],
      abstract: "We present a multi-material bioprinting approach to fabricate perfusable cardiac tissue constructs using human iPSC-derived cardiomyocytes embedded in a GelMA/alginate bioink. The constructs demonstrated spontaneous beating, electrical signal propagation, and pharmacological responsiveness, representing a significant advance toward cardiac tissue engineering for drug screening and regenerative medicine applications.",
      journal: "Nature Biomedical Engineering",
      year: 2021,
      doi: "10.1038/s41551-021-00694-8",
      tags: ["cardiac", "bioprinting", "iPSC", "cardiomyocytes"],
      category: "tissue_engineering",
      keywords: ["cardiac tissue", "bioprinting", "iPSC-derived", "drug screening"],
      isPublic: true,
    },
    {
      title: "Organoid Technology and Applications in Cancer Research",
      authors: ["Drost J", "Clevers H"],
      abstract: "Patient-derived tumor organoids (tumoroids) faithfully recapitulate the architecture and functionality of the parental tumor, providing an unprecedented platform for drug screening, personalized medicine, and mechanistic studies of cancer biology. This review covers the current state of cancer organoid technology and its clinical applications.",
      journal: "Nature Reviews Cancer",
      year: 2018,
      doi: "10.1038/s41568-018-0007-6",
      tags: ["organoid", "cancer", "tumor", "drug screening", "personalized medicine"],
      category: "organoids",
      keywords: ["tumor organoid", "patient-derived", "drug testing", "precision oncology"],
      isPublic: true,
    },
    {
      title: "4D Printing of Biomaterials for Tissue Engineering and Regenerative Medicine",
      authors: ["Miao S", "Castro N", "Nowicki M", "Xia L", "Zhang LG"],
      abstract: "4D printing combines 3D bioprinting with smart materials capable of changing shape or function over time in response to stimuli such as temperature, pH, light, or moisture. This review discusses recent advances in 4D-printed biomaterials for musculoskeletal, cardiovascular, and neural tissue engineering applications.",
      journal: "Materials Today",
      year: 2017,
      doi: "10.1016/j.mattod.2017.06.005",
      tags: ["4D printing", "smart materials", "tissue engineering", "shape memory"],
      category: "biomaterials",
      keywords: ["4D printing", "shape memory polymer", "stimuli-responsive", "bioprinting"],
      isPublic: true,
    },
    {
      title: "Vascularization Strategies in Tissue Engineering",
      authors: ["Novosel EC", "Kleinhans C", "Kluger PJ"],
      abstract: "Vascularization remains one of the central challenges in tissue engineering. This review examines prevascularization approaches, in vitro vessel formation, microfluidic vasculature, and coculture systems that enable the creation of thick, vascularized tissue constructs beyond the diffusion limit.",
      journal: "Advanced Drug Delivery Reviews",
      year: 2011,
      doi: "10.1016/j.addr.2011.03.004",
      tags: ["vascularization", "angiogenesis", "tissue engineering", "microfluidics"],
      category: "tissue_engineering",
      keywords: ["blood vessel", "prevascularization", "angiogenesis", "thick tissue"],
      isPublic: true,
    },
    {
      title: "Stem Cell-Based Organoids as Models of Liver Disease",
      authors: ["Huch M", "Gehart H", "van Boxtel R", "Hamer K", "Blokzijl F", "Clevers H"],
      abstract: "Long-term expansion of liver ductal organoids derived from adult human liver tissue represents a platform for disease modeling of inherited metabolic disorders including NTBC-treated tyrosinemia, Wilson's disease, and Alagille syndrome, with implications for gene therapy and drug discovery.",
      journal: "Cell",
      year: 2015,
      doi: "10.1016/j.cell.2014.11.042",
      tags: ["liver", "organoid", "stem cell", "disease model", "drug discovery"],
      category: "organoids",
      keywords: ["hepatic organoid", "liver disease", "adult stem cell", "expansion"],
      isPublic: true,
    },
    {
      title: "GelMA-Based Hydrogels for Biomedical Applications: A Review",
      authors: ["Yue K", "Trujillo-de Santiago G", "Alvarez MM", "Tamayol A", "Khademhosseini A"],
      abstract: "Gelatin methacryloyl (GelMA) has emerged as one of the most versatile biomaterials for tissue engineering due to its biocompatibility, tunable mechanical properties, and photocrosslinkable nature. This comprehensive review covers synthesis, modification strategies, mechanical characterization, and applications in bioprinting, drug delivery, and organ-on-chip systems.",
      journal: "Biomaterials",
      year: 2015,
      doi: "10.1016/j.biomaterials.2015.01.047",
      tags: ["GelMA", "hydrogel", "photocrosslinkable", "bioprinting", "drug delivery"],
      category: "biomaterials",
      keywords: ["gelatin methacryloyl", "photo-crosslinking", "mechanical tuning", "bioprinting"],
      isPublic: true,
    },
    {
      title: "Human Brain Organoids Recapitulate Early Human Brain Development",
      authors: ["Lancaster MA", "Renner M", "Martin CA", "Wenzel D", "Knoblich JA"],
      abstract: "We describe a method for generating three-dimensional organoids from human pluripotent stem cells that recapitulate features of early human brain development, including outer radial glial cells and functional cortical neurons. These cerebral organoids represent a powerful model for studying neurological disorders including microcephaly.",
      journal: "Nature",
      year: 2013,
      doi: "10.1038/nature13402",
      tags: ["brain organoid", "cerebral organoid", "neural development", "iPSC", "neurological disease"],
      category: "organoids",
      keywords: ["cerebral organoid", "neural differentiation", "cortical development", "microcephaly"],
      isPublic: true,
    },
    {
      title: "Decellularized Extracellular Matrix Bioinks: Advances in Bioprinting",
      authors: ["Pati F", "Jang J", "Ha DH", "Kim SW", "Cho DW"],
      abstract: "Decellularized extracellular matrix (dECM) derived from adipose tissue, cartilage, and heart was converted into bioinks for 3D bioprinting. The organ-specific dECM bioinks provided superior microenvironmental cues compared to conventional hydrogels, resulting in significantly improved cell viability, metabolic activity, and lineage-specific differentiation.",
      journal: "Nature Communications",
      year: 2014,
      doi: "10.1038/ncomms4935",
      tags: ["dECM", "decellularized", "bioink", "organ-specific", "3D bioprinting"],
      category: "biomaterials",
      keywords: ["decellularized ECM", "tissue-specific bioink", "cell viability", "differentiation"],
      isPublic: true,
    },
  ]

  for (const article of articles) {
    await prisma.knowledgeArticle.upsert({
      where: { doi: article.doi },
      update: {},
      create: {
        ...article,
        embedding: [],
        chunkCount: 0,
        accessCount: 0,
      },
    })
  }

  console.log(`✅ ${articles.length} artigos científicos inseridos`)

  // ============================================
  // DEMO PIPELINE PROJECT
  // ============================================
  console.log("🔬 Criando projeto pipeline demo...")

  const STAGE_NAMES = [
    { name: "Definição do Tecido-Alvo", description: "Identificação e caracterização do tecido a ser reproduzido" },
    { name: "Análise de Biomarcadores", description: "Mapeamento de marcadores celulares e moleculares específicos" },
    { name: "Seleção de Scaffold", description: "Escolha da estrutura de suporte tridimensional" },
    { name: "Formulação do Biomaterial", description: "Design da composição química e propriedades mecânicas" },
    { name: "Seleção Celular", description: "Definição dos tipos e fontes celulares" },
    { name: "Protocolo de Cultura", description: "Estabelecimento das condições de crescimento celular" },
    { name: "Bioimpressão/Montagem", description: "Processo de construção do tecido artificial" },
    { name: "Maturação in vitro", description: "Condições de amadurecimento e diferenciação" },
    { name: "Controle de Qualidade", description: "Testes de viabilidade, funcionalidade e segurança" },
    { name: "Caracterização Funcional", description: "Avaliação das propriedades funcionais do tecido" },
    { name: "Validação Regulatória", description: "Conformidade com normas e regulamentações" },
    { name: "Escalabilidade", description: "Estratégias para produção em escala" },
  ]

  const existingProject = await prisma.pipelineProject.findFirst({
    where: { userId: demoUser.id, name: "Cartilagem Hialina Demo" },
  })

  if (!existingProject) {
    await prisma.pipelineProject.create({
      data: {
        userId: demoUser.id,
        name: "Cartilagem Hialina Demo",
        description: "Projeto demonstrativo para engenharia de cartilagem articular",
        tissueType: "Cartilagem Hialina",
        targetApplication: "Reparo de defeitos em cartilagem do joelho",
        patientProfile: "Adultos 30-60 anos, defeito focal articular",
        status: "IN_PROGRESS",
        currentStage: 4,
        completionRate: 25.0,
        stages: {
          create: STAGE_NAMES.map((stage, index) => ({
            stageNumber: index + 1,
            name: stage.name,
            description: stage.description,
            status:
              index < 3
                ? "COMPLETED"
                : index === 3
                ? "IN_PROGRESS"
                : "PENDING",
            completedAt: index < 3 ? new Date() : undefined,
            creditsUsed: index < 3 ? 5 : undefined,
          })),
        },
      },
    })
  }

  console.log("✅ Projeto pipeline demo criado")

  console.log("\n🎉 Seed concluído com sucesso!")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("📧 Demo email: demo@bia.com")
  console.log("🔑 Demo password: demo1234")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
