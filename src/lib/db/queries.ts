import { prisma } from "./prisma"
import { Prisma, SubscriptionPlan, SubscriptionStatus } from "@prisma/client"

// ============================================
// PLAN CONFIGS
// ============================================

export const PLAN_CREDITS: Record<SubscriptionPlan, number> = {
  FREE: 50,
  DISCOVERY: 500,
  ADVANCED: 1500,
  ENTERPRISE: 5000,
  ACADEMY: 20000,
}

export const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  FREE: 0,
  DISCOVERY: 270,
  ADVANCED: 490,
  ENTERPRISE: 990,
  ACADEMY: 4970,
}

// ============================================
// USER QUERIES
// ============================================

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      subscription: true,
      creditBalance: true,
    },
  })
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      subscription: true,
      creditBalance: true,
    },
  })
}

export async function updateUserProfile(
  userId: string,
  data: {
    name?: string
    institution?: string
    researchArea?: string
    bio?: string
  }
) {
  return prisma.user.update({
    where: { id: userId },
    data,
  })
}

// ============================================
// SUBSCRIPTION QUERIES
// ============================================

export async function getUserSubscription(userId: string) {
  return prisma.subscription.findUnique({
    where: { userId },
  })
}

export async function createOrUpdateSubscription(
  userId: string,
  plan: SubscriptionPlan
) {
  const credits = PLAN_CREDITS[plan]
  const periodEnd = new Date()
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  const subscription = await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
      monthlyCredits: credits,
    },
    update: {
      plan,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
      monthlyCredits: credits,
    },
  })

  // Update credit balance
  await prisma.creditBalance.upsert({
    where: { userId },
    create: {
      userId,
      balance: credits,
      totalEarned: credits,
      totalSpent: 0,
    },
    update: {
      balance: { increment: credits },
      totalEarned: { increment: credits },
    },
  })

  // Log the credit top-up
  const newBalance = await prisma.creditBalance.findUnique({ where: { userId } })
  await prisma.creditTransaction.create({
    data: {
      userId,
      type: "CREDIT",
      amount: credits,
      balance: newBalance?.balance ?? credits,
      description: `Créditos do plano ${plan} - renovação mensal`,
      metadata: { plan, action: "subscription_renewal" },
    },
  })

  return subscription
}

// ============================================
// CREDIT QUERIES
// ============================================

export async function getCreditBalance(userId: string) {
  return prisma.creditBalance.findUnique({
    where: { userId },
  })
}

export async function spendCredits(
  userId: string,
  amount: number,
  description: string,
  metadata?: Prisma.InputJsonValue
): Promise<{ success: boolean; balance: number; error?: string }> {
  const balance = await prisma.creditBalance.findUnique({
    where: { userId },
  })

  if (!balance) {
    return { success: false, balance: 0, error: "Saldo de créditos não encontrado" }
  }

  if (balance.balance < amount) {
    return {
      success: false,
      balance: balance.balance,
      error: `Créditos insuficientes. Você tem ${balance.balance} créditos, mas precisa de ${amount}.`,
    }
  }

  const newBalance = balance.balance - amount

  await prisma.$transaction([
    prisma.creditBalance.update({
      where: { userId },
      data: {
        balance: { decrement: amount },
        totalSpent: { increment: amount },
      },
    }),
    prisma.creditTransaction.create({
      data: {
        userId,
        type: "DEBIT",
        amount: -amount,
        balance: newBalance,
        description,
        metadata,
      },
    }),
  ])

  return { success: true, balance: newBalance }
}

export async function addCredits(
  userId: string,
  amount: number,
  description: string,
  metadata?: Prisma.InputJsonValue
): Promise<number> {
  await prisma.creditBalance.upsert({
    where: { userId },
    create: {
      userId,
      balance: amount,
      totalEarned: amount,
      totalSpent: 0,
    },
    update: {
      balance: { increment: amount },
      totalEarned: { increment: amount },
    },
  })

  const newBalance = await prisma.creditBalance.findUnique({ where: { userId } })

  await prisma.creditTransaction.create({
    data: {
      userId,
      type: "CREDIT",
      amount,
      balance: newBalance?.balance ?? amount,
      description,
      metadata,
    },
  })

  return newBalance?.balance ?? amount
}

export async function getCreditHistory(userId: string, limit = 20) {
  return prisma.creditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
}

// ============================================
// PIPELINE QUERIES
// ============================================

export async function getUserPipelineProjects(userId: string) {
  return prisma.pipelineProject.findMany({
    where: { userId },
    include: {
      stages: {
        orderBy: { stageNumber: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  })
}

export async function getPipelineProject(id: string, userId: string) {
  return prisma.pipelineProject.findFirst({
    where: { id, userId },
    include: {
      stages: {
        orderBy: { stageNumber: "asc" },
      },
    },
  })
}

export async function createPipelineProject(
  userId: string,
  data: {
    name: string
    description?: string
    tissueType: string
    targetApplication?: string
    cellSource?: string
    patientProfile?: string
  }
) {
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

  return prisma.pipelineProject.create({
    data: {
      userId,
      ...data,
      status: "DRAFT",
      currentStage: 1,
      completionRate: 0,
      stages: {
        create: STAGE_NAMES.map((stage, index) => ({
          stageNumber: index + 1,
          name: stage.name,
          description: stage.description,
          status: index === 0 ? "IN_PROGRESS" : "PENDING",
        })),
      },
    },
    include: {
      stages: { orderBy: { stageNumber: "asc" } },
    },
  })
}

export async function updatePipelineStage(
  stageId: string,
  data: {
    status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED"
    inputs?: Prisma.InputJsonValue
    outputs?: Prisma.InputJsonValue
    aiAnalysis?: string
    creditsUsed?: number
    completedAt?: Date
  }
) {
  return prisma.pipelineStage.update({
    where: { id: stageId },
    data,
  })
}

export async function advancePipelineStage(projectId: string, userId: string) {
  const project = await prisma.pipelineProject.findFirst({
    where: { id: projectId, userId },
    include: { stages: { orderBy: { stageNumber: "asc" } } },
  })

  if (!project) throw new Error("Projeto não encontrado")

  const nextStage = project.currentStage + 1
  const completedStages = project.stages.filter((s) => s.status === "COMPLETED").length
  const completionRate = (completedStages / 12) * 100

  return prisma.pipelineProject.update({
    where: { id: projectId },
    data: {
      currentStage: Math.min(nextStage, 12),
      completionRate,
      status: completedStages === 12 ? "COMPLETED" : "IN_PROGRESS",
    },
  })
}

// ============================================
// CHAT QUERIES
// ============================================

export async function getUserChatSessions(userId: string) {
  return prisma.chatSession.findMany({
    where: { userId, isActive: true },
    orderBy: { updatedAt: "desc" },
    take: 20,
  })
}

export async function getChatSession(id: string, userId: string) {
  return prisma.chatSession.findFirst({
    where: { id, userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 100,
      },
    },
  })
}

export async function createChatSession(userId: string, title?: string) {
  return prisma.chatSession.create({
    data: {
      userId,
      title: title || "Nova Conversa",
    },
  })
}

export async function addChatMessage(
  sessionId: string,
  data: {
    role: "user" | "assistant" | "system"
    content: string
    model?: string
    tokens?: number
    creditsUsed?: number
    sources?: Prisma.InputJsonValue
  }
) {
  const [message] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        sessionId,
        ...data,
      },
    }),
    prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        messageCount: { increment: 1 },
        totalCredits: { increment: data.creditsUsed ?? 0 },
        updatedAt: new Date(),
      },
    }),
  ])

  return message
}

// ============================================
// KNOWLEDGE BASE QUERIES
// ============================================

export async function searchKnowledgeArticles(query: string, limit = 10) {
  return prisma.knowledgeArticle.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { abstract: { contains: query, mode: "insensitive" } },
        { tags: { has: query.toLowerCase() } },
        { keywords: { has: query.toLowerCase() } },
      ],
      isPublic: true,
    },
    orderBy: { accessCount: "desc" },
    take: limit,
  })
}

export async function getKnowledgeArticlesByCategory(category: string) {
  return prisma.knowledgeArticle.findMany({
    where: { category, isPublic: true },
    orderBy: { year: "desc" },
  })
}

export async function incrementArticleAccess(id: string) {
  return prisma.knowledgeArticle.update({
    where: { id },
    data: { accessCount: { increment: 1 } },
  })
}

// ============================================
// ANALYTICS QUERIES
// ============================================

export async function getUserStats(userId: string) {
  const [
    creditBalance,
    pipelineCount,
    chatCount,
    protocolCount,
    recentTransactions,
  ] = await Promise.all([
    prisma.creditBalance.findUnique({ where: { userId } }),
    prisma.pipelineProject.count({ where: { userId } }),
    prisma.chatSession.count({ where: { userId } }),
    prisma.protocol.count({ where: { userId } }),
    prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ])

  return {
    credits: creditBalance?.balance ?? 0,
    creditsSpent: creditBalance?.totalSpent ?? 0,
    pipelineCount,
    chatCount,
    protocolCount,
    recentTransactions,
  }
}
