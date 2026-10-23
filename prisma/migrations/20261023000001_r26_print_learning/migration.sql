-- R26 · Tabela de aprendizado de bioimpressão
CREATE TABLE "PrintLearning" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "material" TEXT NOT NULL,
  "materialKey" TEXT NOT NULL,
  "application" TEXT NOT NULL,
  "geometryId" TEXT,
  "params" JSONB NOT NULL,
  "flowed" BOOLEAN NOT NULL,
  "rating" INTEGER NOT NULL,
  "text" TEXT NOT NULL DEFAULT '',
  "symptoms" JSONB,
  "adjustments" JSONB,
  "effectiveFactor" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrintLearning_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PrintLearning_userId_idx" ON "PrintLearning"("userId");
CREATE INDEX "PrintLearning_materialKey_idx" ON "PrintLearning"("materialKey");
CREATE INDEX "PrintLearning_createdAt_idx" ON "PrintLearning"("createdAt");
