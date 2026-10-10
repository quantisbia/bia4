/**
 * BIA · Academy · R13.14 · Validação pública de certificado
 *
 * Rota: /verify/[code]  (PÚBLICA — sem login)
 *
 * Permite que qualquer pessoa (empregador, instituição, parceiro) cole o
 * código impresso no rodapé do certificado PDF e valide se o certificado
 * foi realmente emitido pela BIA Academy, para quem, quando e para qual
 * conteúdo.
 *
 * Códigos aceitos:
 *   • BIA-AULA-{YEAR}-{SEQ}   → certificado de aula  (AcademyLessonCertificate)
 *   • BIA-ACAD-{YEAR}-{SEQ}   → certificado de conclusão de programa
 *                               (AcademyEnrollment.certificateCode)
 *
 * Design: tela escura minimalista, cards com status (válido/inválido),
 * mesma linguagem visual da Academy (violet / fuchsia / amber).
 */
import Link from "next/link"
import { prisma } from "@/lib/db/prisma"
import { CheckCircle2, XCircle, ArrowLeft, Award, GraduationCap, Calendar, User, BookOpen } from "lucide-react"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface LessonCertResult {
  type: "lesson"
  code: string
  issuedAt: Date
  studentName: string | null
  studentEmail: string
  lessonTitle: string
  moduleTitle: string
}

interface ProgramCertResult {
  type: "program"
  code: string
  issuedAt: Date
  studentName: string | null
  studentEmail: string
  completedAt: Date | null
}

type VerifyResult = LessonCertResult | ProgramCertResult | null

async function lookupCertificate(code: string): Promise<VerifyResult> {
  const normalized = code.trim().toUpperCase()

  // Tenta certificado de aula
  if (normalized.startsWith("BIA-AULA-")) {
    const cert = await prisma.academyLessonCertificate.findUnique({
      where: { code: normalized },
      include: {
        enrollment: { include: { user: true } },
        lesson: { include: { module: true } },
      },
    })
    if (!cert) return null
    return {
      type: "lesson",
      code: cert.code,
      issuedAt: cert.issuedAt,
      studentName: cert.enrollment.user.name,
      studentEmail: cert.enrollment.user.email,
      lessonTitle: cert.lesson.title,
      moduleTitle: cert.lesson.module.title,
    }
  }

  // Tenta certificado de programa (AcademyCertificate)
  if (normalized.startsWith("BIA-ACAD-")) {
    const cert = await prisma.academyCertificate.findUnique({
      where: { code: normalized },
      include: { enrollment: { include: { user: true } } },
    })
    if (!cert) return null
    return {
      type: "program",
      code: cert.code,
      issuedAt: cert.issuedAt,
      studentName: cert.enrollment.user.name,
      studentEmail: cert.enrollment.user.email,
      completedAt: cert.enrollment.completedAt,
    }
  }

  return null
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!local || !domain) return email
  const visible = local.slice(0, 2)
  return `${visible}${"*".repeat(Math.max(local.length - 2, 2))}@${domain}`
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d)
}

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const decoded = decodeURIComponent(code)
  const result = await lookupCertificate(decoded)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white px-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">BIA Academy</h1>
            <p className="text-xs text-gray-400">Validação pública de certificado</p>
          </div>
        </div>

        {/* Código consultado */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-6">
          <p className="text-xs text-gray-500 mb-1">Código consultado</p>
          <p className="font-mono text-sm text-white break-all" data-testid="verify-code">
            {decoded}
          </p>
        </div>

        {/* Resultado */}
        {!result ? (
          <div
            className="rounded-2xl border border-red-500/30 bg-red-500/[0.06] p-6 sm:p-8"
            data-testid="verify-result-invalid"
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-11 h-11 rounded-full bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-300" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-red-200 mb-1">
                  Certificado não encontrado
                </h2>
                <p className="text-sm text-red-100/80 leading-relaxed">
                  Não há nenhum certificado emitido pela BIA Academy com este código.
                  Confira a digitação (os códigos seguem o padrão{" "}
                  <span className="font-mono">BIA-AULA-2027-000001</span> ou{" "}
                  <span className="font-mono">BIA-ACAD-2027-0001</span>) ou peça ao
                  titular para reenviar o PDF original.
                </p>
                <Link
                  href="/academy"
                  className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-lg bg-white/[0.05] border border-white/10 hover:bg-white/[0.08] text-sm text-white transition-all"
                >
                  Conhecer a BIA Academy
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-6 sm:p-8"
            data-testid="verify-result-valid"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="shrink-0 w-11 h-11 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-300" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-emerald-200 mb-1">
                  Certificado válido
                </h2>
                <p className="text-sm text-emerald-100/80 leading-relaxed">
                  Este certificado foi emitido oficialmente pela BIA Academy — Quantis
                  Biotechnology.
                </p>
              </div>
            </div>

            {/* Detalhes */}
            <dl className="space-y-4 border-t border-emerald-500/20 pt-5">
              <div className="flex items-start gap-3">
                <Award className="w-4 h-4 text-emerald-300 mt-0.5 shrink-0" />
                <div>
                  <dt className="text-xs text-gray-400">Tipo</dt>
                  <dd className="text-sm text-white font-medium">
                    {result.type === "lesson"
                      ? "Certificado de aula"
                      : "Certificado de conclusão do programa"}
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-emerald-300 mt-0.5 shrink-0" />
                <div>
                  <dt className="text-xs text-gray-400">Aluno(a)</dt>
                  <dd className="text-sm text-white font-medium">
                    {result.studentName ?? "—"}
                  </dd>
                  <dd className="text-xs text-gray-400 mt-0.5">
                    {maskEmail(result.studentEmail)}
                  </dd>
                </div>
              </div>

              {result.type === "lesson" && (
                <div className="flex items-start gap-3">
                  <BookOpen className="w-4 h-4 text-emerald-300 mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-xs text-gray-400">Conteúdo certificado</dt>
                    <dd className="text-sm text-white font-medium">
                      {result.lessonTitle}
                    </dd>
                    <dd className="text-xs text-gray-400 mt-0.5">
                      Módulo: {result.moduleTitle}
                    </dd>
                  </div>
                </div>
              )}

              {result.type === "program" && (
                <div className="flex items-start gap-3">
                  <BookOpen className="w-4 h-4 text-emerald-300 mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-xs text-gray-400">Programa</dt>
                    <dd className="text-sm text-white font-medium">
                      Formação completa — BIA Academy · Programa de Biofabricação (12
                      módulos · 120h)
                    </dd>
                    {result.completedAt && (
                      <dd className="text-xs text-gray-400 mt-0.5">
                        Concluído em {formatDate(result.completedAt)}
                      </dd>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-emerald-300 mt-0.5 shrink-0" />
                <div>
                  <dt className="text-xs text-gray-400">Data de emissão</dt>
                  <dd className="text-sm text-white font-medium">
                    {formatDate(result.issuedAt)}
                  </dd>
                </div>
              </div>
            </dl>

            <div className="mt-6 pt-5 border-t border-emerald-500/20">
              <p className="text-xs text-gray-400 leading-relaxed">
                Autenticidade garantida pela BIA Academy — Quantis Biotechnology.
                Dúvidas sobre este certificado podem ser direcionadas para{" "}
                <a
                  href="mailto:contato@biaquantis.bio"
                  className="text-fuchsia-300 hover:text-fuchsia-200 underline"
                >
                  contato@biaquantis.bio
                </a>
                .
              </p>
            </div>
          </div>
        )}

        {/* Rodapé */}
        <p className="text-center text-xs text-gray-600 mt-10">
          BIA Academy · Quantis Biotechnology — biaquantis.bio
        </p>
      </div>
    </div>
  )
}
