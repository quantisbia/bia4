-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'RESEARCHER');
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'DISCOVERY', 'ADVANCED', 'ENTERPRISE', 'ACADEMY');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CANCELLED', 'PAST_DUE', 'TRIALING');
CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE "PipelineStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');
CREATE TYPE "StageStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');
CREATE TYPE "BiomaterialCategory" AS ENUM ('HYDROGEL', 'SCAFFOLD', 'BIOINK', 'MEMBRANE', 'COATING', 'COMPOSITE', 'DECELLULARIZED', 'NANOPARTICLE');
CREATE TYPE "OrganoidType" AS ENUM ('BRAIN', 'HEART', 'LIVER', 'KIDNEY', 'INTESTINE', 'LUNG', 'PANCREAS', 'RETINA', 'CUSTOM');

-- CreateTable: Users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "institution" TEXT,
    "researchArea" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateTable: Accounts (NextAuth)
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateTable: Sessions (NextAuth)
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateTable: VerificationTokens
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateTable: Subscriptions
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL DEFAULT NOW() + INTERVAL '7 days',
    "trialEndsAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "monthlyCredits" INTEGER NOT NULL DEFAULT 50,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");

-- CreateTable: CreditBalances
CREATE TABLE "credit_balances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 50,
    "totalEarned" INTEGER NOT NULL DEFAULT 50,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "credit_balances_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "credit_balances_userId_key" ON "credit_balances"("userId");

-- CreateTable: CreditTransactions
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "credit_transactions_userId_idx" ON "credit_transactions"("userId");
CREATE INDEX "credit_transactions_createdAt_idx" ON "credit_transactions"("createdAt");

-- CreateTable: PipelineProjects
CREATE TABLE "pipeline_projects" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tissueType" TEXT NOT NULL,
    "status" "PipelineStatus" NOT NULL DEFAULT 'DRAFT',
    "currentStage" INTEGER NOT NULL DEFAULT 1,
    "targetApplication" TEXT,
    "patientProfile" TEXT,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pipeline_projects_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pipeline_projects_userId_idx" ON "pipeline_projects"("userId");
CREATE INDEX "pipeline_projects_status_idx" ON "pipeline_projects"("status");

-- CreateTable: PipelineStages
CREATE TABLE "pipeline_stages" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stageNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "StageStatus" NOT NULL DEFAULT 'PENDING',
    "inputs" JSONB,
    "outputs" JSONB,
    "aiAnalysis" TEXT,
    "creditsUsed" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pipeline_stages_projectId_stageNumber_key" ON "pipeline_stages"("projectId", "stageNumber");
CREATE INDEX "pipeline_stages_projectId_idx" ON "pipeline_stages"("projectId");

-- CreateTable: Biomaterials
CREATE TABLE "biomaterials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "BiomaterialCategory" NOT NULL,
    "components" TEXT[],
    "composition" JSONB NOT NULL,
    "elasticity" DOUBLE PRECISION,
    "porosity" DOUBLE PRECISION,
    "degradationTime" TEXT,
    "biocompatibility" TEXT NOT NULL,
    "printable" BOOLEAN NOT NULL DEFAULT false,
    "crosslinking" TEXT,
    "applications" TEXT[],
    "tissueTypes" TEXT[],
    "references" TEXT[],
    "doi" TEXT[],
    "tags" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "biomaterials_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "biomaterials_category_idx" ON "biomaterials"("category");

-- CreateTable: FormulationRecords
CREATE TABLE "formulation_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "biomaterialId" TEXT NOT NULL,
    "customInputs" JSONB,
    "aiSuggestion" TEXT,
    "notes" TEXT,
    "creditsUsed" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "formulation_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "formulation_records_biomaterialId_idx" ON "formulation_records"("biomaterialId");

-- CreateTable: OrganoidDesigns
CREATE TABLE "organoid_designs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organoidType" "OrganoidType" NOT NULL,
    "cellTypes" TEXT[],
    "scaffold" TEXT,
    "dimensions" JSONB,
    "protocol" TEXT,
    "aiDesign" TEXT,
    "predictions" JSONB,
    "creditsUsed" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organoid_designs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "organoid_designs_userId_idx" ON "organoid_designs"("userId");

-- CreateTable: Protocols
CREATE TABLE "protocols" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "steps" JSONB NOT NULL,
    "materials" JSONB NOT NULL,
    "equipment" TEXT[],
    "safetyNotes" TEXT[],
    "aiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "sourceInputs" JSONB,
    "duration" TEXT,
    "difficulty" TEXT,
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "creditsUsed" INTEGER NOT NULL DEFAULT 8,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "protocols_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "protocols_userId_idx" ON "protocols"("userId");
CREATE INDEX "protocols_category_idx" ON "protocols"("category");

-- CreateTable: KnowledgeArticles
CREATE TABLE "knowledge_articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authors" TEXT[],
    "abstract" TEXT NOT NULL,
    "journal" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "doi" TEXT,
    "url" TEXT,
    "tags" TEXT[],
    "category" TEXT NOT NULL,
    "keywords" TEXT[],
    "embedding" DOUBLE PRECISION[],
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "knowledge_articles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "knowledge_articles_doi_key" ON "knowledge_articles"("doi");
CREATE INDEX "knowledge_articles_category_idx" ON "knowledge_articles"("category");
CREATE INDEX "knowledge_articles_year_idx" ON "knowledge_articles"("year");

-- CreateTable: ChatSessions
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Nova Conversa',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "context" TEXT,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "totalCredits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "chat_sessions_userId_idx" ON "chat_sessions"("userId");

-- CreateTable: ChatMessages
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "model" TEXT,
    "tokens" INTEGER,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "sources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "chat_messages_sessionId_idx" ON "chat_messages"("sessionId");
CREATE INDEX "chat_messages_createdAt_idx" ON "chat_messages"("createdAt");

-- CreateTable: AuditLogs
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey constraints
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credit_balances" ADD CONSTRAINT "credit_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pipeline_projects" ADD CONSTRAINT "pipeline_projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "pipeline_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "formulation_records" ADD CONSTRAINT "formulation_records_biomaterialId_fkey" FOREIGN KEY ("biomaterialId") REFERENCES "biomaterials"("id") ON UPDATE CASCADE;
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
