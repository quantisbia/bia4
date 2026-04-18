// ============================================
// BIA v4 - Type Definitions
// ============================================

export type UserRole = "USER" | "ADMIN" | "RESEARCHER"
export type SubscriptionPlan = "FREE" | "ORGANOID_LAB" | "DISCOVERY" | "ADVANCED" | "ENTERPRISE" | "ACADEMY"
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
    id: "ORGANOID_LAB",
    name: "Organoid Lab",
    price: 150,
    credits: 300,
    color: "teal",
    features: [
      "300 créditos/mês",
      "Organoid Builder completo",
      "Protocolo QMicroNiche™",
      "7 tipos de organoides por IA",
      "QMatrix™ integrado",
      "Chat IA (contexto organoides)",
    ],
  },
  {
    id: "DISCOVERY",
    name: "Discovery",
    price: 270,
    credits: 500,
    color: "violet",
    features: [
      "500 créditos/mês",
      "Pipeline de 12 etapas",
      "Formulador básico de biomateriais",
      "Chat IA BIA",
      "Base de conhecimento",
      "5 projetos ativos",
    ],
  },
  {
    id: "ADVANCED",
    name: "Advanced",
    price: 490,
    credits: 1500,
    color: "blue",
    popular: true,
    features: [
      "1.500 créditos/mês",
      "Todos os módulos",
      "Formulador avançado (807+ formulações)",
      "Organoid Builder completo",
      "Bioimpressão 3D + STL/G-Code",
      "Reologia CFD",
      "Análises: molecular, bioquímica, celular",
      "20 projetos ativos",
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
      "Dossiê Regulatório (FDA/ANVISA/EMA)",
      "Análises in vivo e pré-clínicas",
      "Inteligência de mercado",
      "Acesso à API",
      "Projetos ilimitados",
      "Suporte prioritário",
    ],
  },
  {
    id: "ACADEMY",
    name: "Academy",
    price: 4970,
    credits: 20000,
    color: "amber",
    features: [
      "20.000 créditos/mês",
      "Tudo do Enterprise",
      "Workspace para equipes",
      "Treinamento IA personalizado",
      "Integração ERP/LIMS",
      "SLA garantido 99,9%",
      "Gerente de conta dedicado",
      "Acesso beta features",
    ],
  },
]

// CREDIT_COSTS importar de @/lib/config.ts — fonte única de verdade
// Reexportando para compatibilidade:
export { CREDIT_COSTS } from "@/lib/config"

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
