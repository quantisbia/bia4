-- R13.14.1 · Library Leads
-- Captura de leads (nome, email, instituição) dos downloads de white papers brinde
-- (open-access) na biblioteca. Visíveis no dashboard admin da Academy.

CREATE TABLE "library_leads" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceTitle" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "role" TEXT,
    "consentMarketing" BOOLEAN NOT NULL DEFAULT false,
    "downloadCount" INTEGER NOT NULL DEFAULT 1,
    "firstDownloadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDownloadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "library_leads_pkey" PRIMARY KEY ("id")
);

-- Impede duplicatas do mesmo email no mesmo recurso (vira UPDATE em vez de INSERT)
CREATE UNIQUE INDEX "library_leads_email_resourceId_key"
    ON "library_leads"("email", "resourceId");

CREATE INDEX "library_leads_resourceId_idx"   ON "library_leads"("resourceId");
CREATE INDEX "library_leads_email_idx"        ON "library_leads"("email");
CREATE INDEX "library_leads_lastDownloadAt_idx" ON "library_leads"("lastDownloadAt");
CREATE INDEX "library_leads_createdAt_idx"    ON "library_leads"("createdAt");
