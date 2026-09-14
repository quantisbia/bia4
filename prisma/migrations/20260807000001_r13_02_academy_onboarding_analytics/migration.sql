-- AlterTable
ALTER TABLE "academy_enrollments" ADD COLUMN     "onboarding" JSONB;

-- CreateTable
CREATE TABLE "academy_analytics" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "userId" TEXT,
    "path" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "academy_analytics_event_idx" ON "academy_analytics"("event");

-- CreateIndex
CREATE INDEX "academy_analytics_userId_idx" ON "academy_analytics"("userId");

-- CreateIndex
CREATE INDEX "academy_analytics_createdAt_idx" ON "academy_analytics"("createdAt");
