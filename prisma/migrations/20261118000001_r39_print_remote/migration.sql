-- R39 · Ponte tablet ↔ notebook para a Impressão Básica (controle remoto via servidor)
CREATE TABLE "PrintRemoteSession" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "hostLabel" TEXT,
  "state" JSONB NOT NULL DEFAULT '{}',
  "hostSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "clientSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PrintRemoteSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PrintRemoteSession_code_key" ON "PrintRemoteSession"("code");
CREATE INDEX "PrintRemoteSession_userId_idx" ON "PrintRemoteSession"("userId");
CREATE INDEX "PrintRemoteSession_expiresAt_idx" ON "PrintRemoteSession"("expiresAt");

CREATE TABLE "PrintRemoteCommand" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "seq" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "payload" JSONB,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "result" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "doneAt" TIMESTAMP(3),
  CONSTRAINT "PrintRemoteCommand_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PrintRemoteCommand_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PrintRemoteSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PrintRemoteCommand_sessionId_status_seq_idx" ON "PrintRemoteCommand"("sessionId", "status", "seq");
