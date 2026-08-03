-- AlterTable
ALTER TABLE "notebook_entries" ADD COLUMN     "currentVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "projectId" TEXT;

-- CreateTable
CREATE TABLE "notebook_versions" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "changeSummary" TEXT,
    "snapshot" JSONB NOT NULL,
    "previousSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notebook_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notebook_images" (
    "id" TEXT NOT NULL,
    "entryId" TEXT,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "caption" TEXT,
    "experimentId" TEXT,
    "sampleNumber" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "observations" TEXT,
    "versionNumber" INTEGER,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "dataBase64" TEXT,
    "storageUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notebook_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "researchArea" TEXT,
    "color" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notebook_versions_entryId_idx" ON "notebook_versions"("entryId");

-- CreateIndex
CREATE INDEX "notebook_versions_userId_idx" ON "notebook_versions"("userId");

-- CreateIndex
CREATE INDEX "notebook_versions_createdAt_idx" ON "notebook_versions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notebook_versions_entryId_versionNumber_key" ON "notebook_versions"("entryId", "versionNumber");

-- CreateIndex
CREATE INDEX "notebook_images_entryId_idx" ON "notebook_images"("entryId");

-- CreateIndex
CREATE INDEX "notebook_images_userId_idx" ON "notebook_images"("userId");

-- CreateIndex
CREATE INDEX "notebook_images_experimentId_idx" ON "notebook_images"("experimentId");

-- CreateIndex
CREATE INDEX "notebook_images_createdAt_idx" ON "notebook_images"("createdAt");

-- CreateIndex
CREATE INDEX "projects_userId_idx" ON "projects"("userId");

-- CreateIndex
CREATE INDEX "projects_isArchived_idx" ON "projects"("isArchived");

-- CreateIndex
CREATE INDEX "projects_createdAt_idx" ON "projects"("createdAt");

-- CreateIndex
CREATE INDEX "notebook_entries_projectId_idx" ON "notebook_entries"("projectId");

-- AddForeignKey
ALTER TABLE "notebook_entries" ADD CONSTRAINT "notebook_entries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notebook_versions" ADD CONSTRAINT "notebook_versions_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "notebook_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notebook_versions" ADD CONSTRAINT "notebook_versions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notebook_images" ADD CONSTRAINT "notebook_images_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "notebook_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notebook_images" ADD CONSTRAINT "notebook_images_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

