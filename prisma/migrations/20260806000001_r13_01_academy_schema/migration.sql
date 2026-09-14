
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'STUDENT';
ALTER TYPE "UserRole" ADD VALUE 'INSTRUCTOR';

-- CreateTable
CREATE TABLE "academy_enrollments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessUntil" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "source" TEXT,
    "asaasPaymentId" TEXT,

    CONSTRAINT "academy_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_modules" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_lessons" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT,
    "summary" TEXT,
    "youtubeId" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 0,
    "level" TEXT NOT NULL DEFAULT 'intermediate',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "biaHook" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_attachments" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_quizzes" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "passingScore" INTEGER NOT NULL DEFAULT 70,

    CONSTRAINT "academy_quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_quiz_questions" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctIndex" INTEGER NOT NULL,
    "explanation" TEXT,

    CONSTRAINT "academy_quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_progress" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "watchedSeconds" INTEGER NOT NULL DEFAULT 0,
    "quizScore" INTEGER,
    "biaHookOpened" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_projects" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "notebookEntryId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_live_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "meetingUrl" TEXT,
    "recordingUrl" TEXT,
    "order" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_live_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_updates" (
    "id" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "academy_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_certificates" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "code" TEXT NOT NULL,
    "pdfUrl" TEXT,

    CONSTRAINT "academy_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academy_enrollments_userId_key" ON "academy_enrollments"("userId");

-- CreateIndex
CREATE INDEX "academy_enrollments_userId_idx" ON "academy_enrollments"("userId");

-- CreateIndex
CREATE INDEX "academy_enrollments_accessUntil_idx" ON "academy_enrollments"("accessUntil");

-- CreateIndex
CREATE UNIQUE INDEX "academy_modules_slug_key" ON "academy_modules"("slug");

-- CreateIndex
CREATE INDEX "academy_modules_order_idx" ON "academy_modules"("order");

-- CreateIndex
CREATE INDEX "academy_modules_isPublished_idx" ON "academy_modules"("isPublished");

-- CreateIndex
CREATE INDEX "academy_lessons_moduleId_idx" ON "academy_lessons"("moduleId");

-- CreateIndex
CREATE INDEX "academy_lessons_isPublished_idx" ON "academy_lessons"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "academy_lessons_moduleId_slug_key" ON "academy_lessons"("moduleId", "slug");

-- CreateIndex
CREATE INDEX "academy_attachments_lessonId_idx" ON "academy_attachments"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "academy_quizzes_lessonId_key" ON "academy_quizzes"("lessonId");

-- CreateIndex
CREATE INDEX "academy_quiz_questions_quizId_idx" ON "academy_quiz_questions"("quizId");

-- CreateIndex
CREATE INDEX "academy_progress_enrollmentId_idx" ON "academy_progress"("enrollmentId");

-- CreateIndex
CREATE INDEX "academy_progress_lessonId_idx" ON "academy_progress"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "academy_progress_enrollmentId_lessonId_key" ON "academy_progress"("enrollmentId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "academy_projects_enrollmentId_key" ON "academy_projects"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "academy_projects_notebookEntryId_key" ON "academy_projects"("notebookEntryId");

-- CreateIndex
CREATE INDEX "academy_live_events_scheduledAt_idx" ON "academy_live_events"("scheduledAt");

-- CreateIndex
CREATE INDEX "academy_live_events_order_idx" ON "academy_live_events"("order");

-- CreateIndex
CREATE INDEX "academy_updates_publishedAt_idx" ON "academy_updates"("publishedAt");

-- CreateIndex
CREATE INDEX "academy_updates_kind_idx" ON "academy_updates"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "academy_certificates_enrollmentId_key" ON "academy_certificates"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "academy_certificates_code_key" ON "academy_certificates"("code");

-- CreateIndex
CREATE INDEX "academy_certificates_code_idx" ON "academy_certificates"("code");

-- AddForeignKey
ALTER TABLE "academy_enrollments" ADD CONSTRAINT "academy_enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_lessons" ADD CONSTRAINT "academy_lessons_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "academy_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_attachments" ADD CONSTRAINT "academy_attachments_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "academy_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_quizzes" ADD CONSTRAINT "academy_quizzes_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "academy_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_quiz_questions" ADD CONSTRAINT "academy_quiz_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "academy_quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_progress" ADD CONSTRAINT "academy_progress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "academy_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_progress" ADD CONSTRAINT "academy_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "academy_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_projects" ADD CONSTRAINT "academy_projects_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "academy_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_projects" ADD CONSTRAINT "academy_projects_notebookEntryId_fkey" FOREIGN KEY ("notebookEntryId") REFERENCES "notebook_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_certificates" ADD CONSTRAINT "academy_certificates_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "academy_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

