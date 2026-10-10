-- R13.14 · AcademyLessonCertificate (certificado individual por aula)
-- Modelo lazy: só cria linha quando aluno pede o PDF a primeira vez.

CREATE TABLE "academy_lesson_certificates" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdfGeneratedAt" TIMESTAMP(3),

    CONSTRAINT "academy_lesson_certificates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "academy_lesson_certificates_code_key" ON "academy_lesson_certificates"("code");
CREATE INDEX "academy_lesson_certificates_code_idx" ON "academy_lesson_certificates"("code");
CREATE INDEX "academy_lesson_certificates_enrollmentId_idx" ON "academy_lesson_certificates"("enrollmentId");
CREATE UNIQUE INDEX "academy_lesson_certificates_enrollmentId_lessonId_key" ON "academy_lesson_certificates"("enrollmentId", "lessonId");

ALTER TABLE "academy_lesson_certificates" ADD CONSTRAINT "academy_lesson_certificates_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "academy_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "academy_lesson_certificates" ADD CONSTRAINT "academy_lesson_certificates_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "academy_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
