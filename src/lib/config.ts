// BIA v4 — Configuração e Feature Gates por Plano
// Janaina Dernowsek / Quantis Biotechnology — 2026

export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY!,
  NODE_ENV: process.env.NODE_ENV || "development",
  APP_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
}

export const siteConfig = {
  name: "BIA v4",
  description: "Plataforma de IA para Biofabricação — Quantis Biotechnology",
  url: env.APP_URL,
  version: "4.0.0",
}

// ─── Créditos por plano ────────────────────────────────────────────────────────
export const PLAN_CREDITS: Record<string, number> = {
  FREE:       10,
  DISCOVERY:  500,
  ADVANCED:   1500,
  ENTERPRISE: 5000,
  ACADEMY:    20000,
}

// ─── Custo de cada ação ────────────────────────────────────────────────────────
export const CREDIT_COSTS = {
  PIPELINE_STAGE:         5,
  BIOMATERIAL_FORMULATION:10,
  ORGANOID_DESIGN:        15,
  PROTOCOL_GENERATION:    8,
  REGULATORY_DOSSIER:     20,
  ANALYSIS_RUN:           12,
  STL_GCODE:              6,
  CHAT_MESSAGE:           2,
  KNOWLEDGE_SEARCH:       1,
} as const

export type CreditAction = keyof typeof CREDIT_COSTS

// ─── Feature Gates por plano ──────────────────────────────────────────────────
// Cada feature define quais planos têm acesso.
// "todos" = FREE+, "discovery+" = DISCOVERY ou acima, etc.

type PlanTier = "FREE" | "DISCOVERY" | "ADVANCED" | "ENTERPRISE" | "ACADEMY"

const PLAN_ORDER: PlanTier[] = ["FREE", "DISCOVERY", "ADVANCED", "ENTERPRISE", "ACADEMY"]

export const PLAN_FEATURES: Record<string, PlanTier> = {
  // ── Módulos básicos ──────────────────────────────────────
  dashboard:                "FREE",
  chat_ia:                  "FREE",
  knowledge_search:         "FREE",

  // ── Módulos intermediários ───────────────────────────────
  pipeline:                 "DISCOVERY",
  biomaterials_basic:       "DISCOVERY",
  protocols_basic:          "DISCOVERY",      // protocolos simples (cultura, esterilização)
  bioprinting_basic:        "DISCOVERY",

  // ── Módulos avançados ────────────────────────────────────
  biomaterials_advanced:    "ADVANCED",       // 807+ formulações
  protocols_advanced:       "ADVANCED",       // dossiê regulatório completo
  organoids:                "ADVANCED",
  bioprinting_advanced:     "ADVANCED",       // STL/GCode avançado + reologia CFD
  electrospinning:          "ADVANCED",

  // ── Análises especializadas ─────────────────────────────
  analysis_molecular:       "ADVANCED",
  analysis_biochemical:     "ADVANCED",
  analysis_cellular:        "ADVANCED",
  analysis_in_vitro:        "ADVANCED",
  analysis_in_vivo:         "ENTERPRISE",
  analysis_preclinical:     "ENTERPRISE",
  analysis_clinical:        "ENTERPRISE",
  regulatory_dossier:       "ENTERPRISE",    // CTD/510k dossiê completo
  regulatory_anvisa:        "ENTERPRISE",
  regulatory_ema:           "ENTERPRISE",
  stl_gcode_generator:      "ADVANCED",
  rheology_cfdsim:          "ADVANCED",

  // ── Enterprise/Academy ──────────────────────────────────
  api_access:               "ENTERPRISE",
  market_intelligence:      "ENTERPRISE",
  custom_ai_training:       "ACADEMY",
  team_workspace:           "ACADEMY",
  dedicated_support:        "ACADEMY",
}

/**
 * Verifica se um plano tem acesso a uma feature.
 */
export function canAccess(userPlan: string, feature: string): boolean {
  const required = PLAN_FEATURES[feature]
  if (!required) return true // feature não mapeada = livre
  const userIdx   = PLAN_ORDER.indexOf(userPlan as PlanTier)
  const reqIdx    = PLAN_ORDER.indexOf(required)
  if (userIdx === -1) return false
  return userIdx >= reqIdx
}

/**
 * Retorna o plano mínimo necessário para acessar uma feature (legível).
 */
export function requiredPlanLabel(feature: string): string {
  const tier = PLAN_FEATURES[feature]
  const LABELS: Record<string, string> = {
    FREE:       "Gratuito",
    DISCOVERY:  "Discovery",
    ADVANCED:   "Advanced",
    ENTERPRISE: "Enterprise",
    ACADEMY:    "Academy",
  }
  return LABELS[tier ?? "FREE"] ?? "Discovery"
}

// ─── Descrição dos planos (para UI) ──────────────────────────────────────────
export const PLAN_INFO = {
  DISCOVERY: {
    name: "BIA Discovery",
    price: 270,
    credits: 500,
    badge: null as string | null,
    color: "violet",
    paymentUrl: "https://www.asaas.com/c/rneusgbvs6mvm2kg",
    highlight: "Entrada ideal — pipeline básico, formulador, chat IA",
    features: [
      "500 créditos/mês",
      "Pipeline 12 etapas",
      "Formulador básico de biomateriais",
      "Protocolos básicos (cultura celular, esterilização)",
      "Chat IA BIA",
      "Base de conhecimento",
      "5 projetos ativos",
    ],
    limits: { projects: 5, protocols: 20, pipelines: 5 },
  },
  ADVANCED: {
    name: "BIA Advanced",
    price: 490,
    credits: 1500,
    badge: "POPULAR",
    color: "blue",
    paymentUrl: "https://www.asaas.com/c/qsnp08rvpuwlj8ip",
    highlight: "Pesquisadores e laboratórios — módulos completos",
    features: [
      "1.500 créditos/mês",
      "Todos os módulos",
      "Formulador avançado (807+ formulações)",
      "Organoid Builder completo",
      "Protocolos avançados + Dossiê Regulatório",
      "Bioimpressão 3D com STL/G-Code",
      "Reologia CFD (Herschel-Bulkley, Casson)",
      "Análises: molecular, bioquímica, celular, in vitro",
      "Eletrofiação avançada",
      "20 projetos ativos",
    ],
    limits: { projects: 20, protocols: -1, pipelines: 20 },
  },
  ENTERPRISE: {
    name: "BIA Enterprise",
    price: 990,
    credits: 5000,
    badge: null as string | null,
    color: "purple",
    paymentUrl: "https://www.asaas.com/c/j983il0upnkiab2w",
    highlight: "Farmacêuticas e institutos — dossiê regulatório completo",
    features: [
      "5.000 créditos/mês",
      "Tudo do Advanced",
      "Dossiê Regulatório completo (FDA/ANVISA/EMA)",
      "CTD, 510k, DOSSIE ANVISA automatizados",
      "Análises in vivo, pré-clínicas e clínicas",
      "Inteligência de mercado",
      "Acesso à API",
      "Projetos ilimitados",
      "Suporte prioritário",
    ],
    limits: { projects: -1, protocols: -1, pipelines: -1 },
  },
  ACADEMY: {
    name: "BIA Academy",
    price: 4970,
    credits: 20000,
    badge: "PREMIUM",
    color: "amber",
    paymentUrl: "https://www.asaas.com/c/9nvzkrlezi7ht2u5",
    highlight: "Instituições de ensino, CROs e pharmas globais",
    features: [
      "20.000 créditos/mês",
      "Tudo do Enterprise",
      "Workspace para equipes",
      "Treinamento de IA personalizado",
      "Suporte dedicado",
      "SLA garantido",
      "Integração ERP/LIMS",
    ],
    limits: { projects: -1, protocols: -1, pipelines: -1 },
  },
}
