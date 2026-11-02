-- R28 · Módulo introdutório (aulas só com PDF), upload de arquivos e notificações
ALTER TABLE "academy_lessons" ALTER COLUMN "youtubeId" DROP NOT NULL;
ALTER TABLE "academy_enrollments" ADD COLUMN "notifyEmail" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "academy_files" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
  "sizeBytes" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "ready" BOOLEAN NOT NULL DEFAULT false,
  "uploadedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "academy_files_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "academy_files_lessonId_idx" ON "academy_files"("lessonId");
ALTER TABLE "academy_files" ADD CONSTRAINT "academy_files_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "academy_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "academy_notifications" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "url" TEXT,
  "lessonId" TEXT,
  "sentById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "emailSent" INTEGER NOT NULL DEFAULT 0,
  "emailFailed" INTEGER NOT NULL DEFAULT 0,
  "emailSkipped" INTEGER NOT NULL DEFAULT 0,
  "emailedAt" TIMESTAMP(3),
  CONSTRAINT "academy_notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "academy_notifications_createdAt_idx" ON "academy_notifications"("createdAt");
CREATE INDEX "academy_notifications_lessonId_idx" ON "academy_notifications"("lessonId");
ALTER TABLE "academy_notifications" ADD CONSTRAINT "academy_notifications_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "academy_lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "academy_notification_reads" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "academy_notification_reads_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "academy_notification_reads_notificationId_enrollmentId_key" ON "academy_notification_reads"("notificationId", "enrollmentId");
CREATE INDEX "academy_notification_reads_enrollmentId_idx" ON "academy_notification_reads"("enrollmentId");
ALTER TABLE "academy_notification_reads" ADD CONSTRAINT "academy_notification_reads_notificationId_fkey"
  FOREIGN KEY ("notificationId") REFERENCES "academy_notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "academy_notification_reads" ADD CONSTRAINT "academy_notification_reads_enrollmentId_fkey"
  FOREIGN KEY ("enrollmentId") REFERENCES "academy_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
