// ============================================
// BIA v4 - Type Definitions
// ============================================

export type UserRole = "USER" | "ADMIN" | "RESEARCHER"
export type SubscriptionPlan = "FREE" | "DISCOVERY" | "ADVANCED" | "ENTERPRISE" | "ACADEMY"
export type SubscriptionStatus = "ACTIVE" | "INACTIVE" | "CANCELLED" | "PAST_DUE"
export type TransactionType = "CREDIT" | "DEBIT"
export type PipelineStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED"
export type StageStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED"

export interface User {
  id: string
  name: string
  email: string
  image?: string
  role: UserRole
  createdAt: Date
  subscription?: Subscription
  creditBalance?: CreditBalance
}

export interface Subscription {
  id: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  currentPeriodStart: Date
  currentPeriodEnd: Date
  credits: number
  maxCredits: number
}

export interface CreditBalance {
  id: string
  balance: number
  totalEarned: number
  totalSpent: number
  updatedAt: Date
}

export interface PlanConfig {
  id: SubscriptionPlan
  name: string
  price: number
  credits: number
  features: string[]
  color: string
  popular?: boolean
}

export const PLANS: PlanConfig[] = [
  {
    id: "DISCOVERY",
    name: "Discovery",
    price: 270,
    credits: 500,
    color: "violet",
    popular: true,
    features: [
      "500 créditos/mês",
      "Pipeline de 12 etapas",
      "Formulador básico (50 formulações)",
      "Chat IA (limitado)",
      "Base de conhecimento (20 artigos)",
      "Suporte por email",
    ],
  },
  {
    id: "ADVANCED",
    name: "Advanced",
    price: 490,
    credits: 1500,
    color: "blue",
    features: [
      "1.500 créditos/mês",
      "Pipeline completo",
      "Formulador avançado (400 formulações)",
      "Organoid Builder",
      "Chat IA ilimitado",
      "Base de conhecimento completa",
      "Gerador de protocolos",
      "Suporte prioritário",
    ],
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: 990,
    credits: 5000,
    color: "purple",
    features: [
      "5.000 créditos/mês",
      "Tudo do Advanced",
      "Formulador completo (807+ formulações)",
      "RAG personalizado",
      "API access",
      "Relatórios avançados",
      "Gerenciamento de equipe",
      "Suporte dedicado",
    ],
  },
  {
    id: "ACADEMY",
    name: "Academy",
    price: 4970,
    credits: 20000,
    color: "indigo",
    features: [
      "20.000 créditos/mês",
      "Tudo do Enterprise",
      "Treinamento dedicado",
      "Personalização de IA",
      "Integração ERP/LIMS",
      "SLA garantido 99.9%",
      "Gerente de conta dedicado",
      "Acesso beta features",
    ],
  },
]

export const CREDIT_COSTS = {
  PIPELINE_STAGE: 5,
  BIOMATERIAL_FORMULATION: 10,
  ORGANOID_DESIGN: 15,
  PROTOCOL_GENERATION: 8,
  CHAT_MESSAGE: 2,
  KNOWLEDGE_SEARCH: 1,
}

// Pipeline Types
export interface PipelineProject {
  id: string
  name: string
  description?: string
  status: PipelineStatus
  tissueType: string
  currentStage: number
  stages: PipelineStage[]
  createdAt: Date
  updatedAt: Date
}

export interface PipelineStage {
  id: number
  name: string
  description: string
  status: StageStatus
  inputs?: Record<string, unknown>
  outputs?: Record<string, unknown>
  aiAnalysis?: string
  completedAt?: Date
}

export const PIPELINE_STAGES: Omit<PipelineStage, "status" | "inputs" | "outputs" | "aiAnalysis" | "completedAt">[] = [
  { id: 1, name: "Definição do Tecido-Alvo", description: "Identificação e caracterização do tecido a ser reproduzido" },
  { id: 2, name: "Análise de Biomarcadores", description: "Mapeamento de marcadores celulares e moleculares específicos" },
  { id: 3, name: "Seleção de Scaffold", description: "Escolha da estrutura de suporte tridimensional" },
  { id: 4, name: "Formulação do Biomaterial", description: "Design da composição química e propriedades mecânicas" },
  { id: 5, name: "Seleção Celular", description: "Definição dos tipos e fontes celulares" },
  { id: 6, name: "Protocolo de Cultura", description: "Estabelecimento das condições de crescimento celular" },
  { id: 7, name: "Bioimpressão/Montagem", description: "Processo de construção do tecido artificial" },
  { id: 8, name: "Maturação in vitro", description: "Condições de amadurecimento e diferenciação" },
  { id: 9, name: "Controle de Qualidade", description: "Testes de viabilidade, funcionalidade e segurança" },
  { id: 10, name: "Caracterização Funcional", description: "Avaliação das propriedades funcionais do tecido" },
  { id: 11, name: "Validação Regulatória", description: "Conformidade com normas e regulamentações" },
  { id: 12, name: "Escalabilidade", description: "Estratégias para produção em escala" },
]

// Biomaterial Types
export interface Biomaterial {
  id: string
  name: string
  category: BiomaterialCategory
  composition: string[]
  properties: BiomaterialProperties
  applications: string[]
  references?: string[]
}

export type BiomaterialCategory =
  | "HYDROGEL"
  | "SCAFFOLD"
  | "BIOINK"
  | "MEMBRANE"
  | "COATING"
  | "COMPOSITE"
  | "DECELLULARIZED"

export interface BiomaterialProperties {
  elasticity?: number // kPa
  porosity?: number // %
  degradation?: string // tempo
  biocompatibility: "HIGH" | "MEDIUM" | "LOW"
  printability?: boolean
  crosslinking?: string
}

// Chat Types
export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  creditsUsed?: number
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

// Knowledge Base Types
export interface KnowledgeArticle {
  id: string
  title: string
  authors: string[]
  abstract: string
  journal: string
  year: number
  doi?: string
  tags: string[]
  category: string
  relevanceScore?: number
}
