/**
 * BIA · Academy · Helpers de matrícula — R13.01
 *
 * Este módulo encapsula toda a lógica de estado de matrícula do aluno:
 *  - Cálculo de accessUntil (enrolledAt + 12 meses)
 *  - Enum de estados derivados (ACTIVE / EXPIRED / COMPLETED / PENDING)
 *  - Percentual de progresso agregado (aulas concluídas / total)
 *  - Verificação de acesso a uma aula/módulo em runtime
 *
 * Não faz I/O direto — recebe os objetos Prisma já carregados. Isso
 * torna todos os cálculos testáveis sem tocar no banco.
 */

import type {
  AcademyEnrollment,
  AcademyLesson,
  AcademyModule,
  AcademyProgress,
} from "@prisma/client"

// ─── Constantes ─────────────────────────────────────────────────

/** Duração do acesso padrão em milissegundos. */
export const ACCESS_DURATION_MS = 365 * 24 * 60 * 60 * 1000 // 365 dias

/** Sources aceitos de origem da matrícula. */
export type EnrollmentSource = "asaas" | "corporate" | "manual"

/** Estado derivado da matrícula (calculado em runtime). */
export type EnrollmentState =
  | "PENDING"   // criada mas ainda sem accessUntil válido (raro)
  | "ACTIVE"    // dentro do período de 12 meses
  | "COMPLETED" // completedAt preenchido
  | "EXPIRED"   // accessUntil passou

// ─── Cálculo de accessUntil ─────────────────────────────────────

/**
 * Calcula a data de expiração do acesso — enrolledAt + 12 meses.
 * Usa cálculo em milissegundos (365 dias corridos) para evitar
 * problemas com meses de tamanhos diferentes.
 */
export function calculateAccessUntil(
  enrolledAt: Date = new Date(),
): Date {
  return new Date(enrolledAt.getTime() + ACCESS_DURATION_MS)
}

// ─── Estado da matrícula ────────────────────────────────────────

/**
 * Deriva o estado da matrícula a partir dos campos persistidos.
 * Ordem de prioridade: COMPLETED > EXPIRED > ACTIVE > PENDING.
 */
export function getEnrollmentState(
  enrollment: Pick<AcademyEnrollment, "accessUntil" | "completedAt">,
  now: Date = new Date(),
): EnrollmentState {
  if (enrollment.completedAt) return "COMPLETED"
  if (!enrollment.accessUntil) return "PENDING"
  if (enrollment.accessUntil.getTime() < now.getTime()) return "EXPIRED"
  return "ACTIVE"
}

/**
 * True se a matrícula permite acesso a conteúdo no momento (ACTIVE ou COMPLETED).
 * EXPIRED e PENDING não permitem.
 */
export function hasAccess(
  enrollment: Pick<AcademyEnrollment, "accessUntil" | "completedAt">,
  now: Date = new Date(),
): boolean {
  const s = getEnrollmentState(enrollment, now)
  return s === "ACTIVE" || s === "COMPLETED"
}

/**
 * Dias restantes de acesso. Retorna:
 *  - Número positivo se ACTIVE (arredondado para baixo)
 *  - 0 se EXPIRED / PENDING
 *  - null se COMPLETED (não faz sentido contar dias)
 */
export function daysRemaining(
  enrollment: Pick<AcademyEnrollment, "accessUntil" | "completedAt">,
  now: Date = new Date(),
): number | null {
  if (enrollment.completedAt) return null
  if (!enrollment.accessUntil) return 0
  const diff = enrollment.accessUntil.getTime() - now.getTime()
  if (diff <= 0) return 0
  return Math.floor(diff / (24 * 60 * 60 * 1000))
}

// ─── Progresso agregado ─────────────────────────────────────────

/**
 * Calcula o % de conclusão de um MÓDULO (0-100).
 * "Concluído" = AcademyProgress.status === "COMPLETED".
 * Se o módulo não tem aulas, retorna 0 (não 100 — evita ilusão de completo).
 */
export function moduleCompletionPercent(
  lessons: Pick<AcademyLesson, "id">[],
  progressForEnrollment: Pick<AcademyProgress, "lessonId" | "status">[],
): number {
  if (lessons.length === 0) return 0
  const lessonIds = new Set(lessons.map((l) => l.id))
  const completed = progressForEnrollment.filter(
    (p) => lessonIds.has(p.lessonId) && p.status === "COMPLETED",
  ).length
  return Math.round((completed / lessons.length) * 100)
}

/**
 * Calcula o % de conclusão do PROGRAMA INTEIRO (0-100).
 * Considera todas as aulas de todos os módulos publicados.
 */
export function overallCompletionPercent(
  modules: Array<
    Pick<AcademyModule, "id" | "isPublished"> & {
      lessons: Pick<AcademyLesson, "id" | "isPublished">[]
    }
  >,
  progressForEnrollment: Pick<AcademyProgress, "lessonId" | "status">[],
): number {
  const publishedLessons = modules
    .filter((m) => m.isPublished)
    .flatMap((m) => m.lessons.filter((l) => l.isPublished))
  if (publishedLessons.length === 0) return 0
  const lessonIds = new Set(publishedLessons.map((l) => l.id))
  const completed = progressForEnrollment.filter(
    (p) => lessonIds.has(p.lessonId) && p.status === "COMPLETED",
  ).length
  return Math.round((completed / publishedLessons.length) * 100)
}

// ─── Geração de código de certificado ───────────────────────────

/**
 * Gera um código legível para o certificado (ex: "BIA-ACAD-2027-0001").
 * O sequencial é o índice do próximo certificado no ano corrente — o caller
 * é responsável por passá-lo (usualmente vem de um COUNT no banco).
 */
export function generateCertificateCode(
  year: number,
  sequential: number,
): string {
  const y = year.toString().padStart(4, "0")
  const seq = sequential.toString().padStart(4, "0")
  return `BIA-ACAD-${y}-${seq}`
}

// ─── Payload para criar matrícula ───────────────────────────────

/**
 * Prepara o payload para prisma.academyEnrollment.create({ data }).
 * O caller já deve ter validado que o usuário existe e tem role STUDENT.
 */
export interface CreateEnrollmentInput {
  userId: string
  source: EnrollmentSource
  asaasPaymentId?: string | null
  /** Se não passado, usa now(). Útil para testes deterministas. */
  enrolledAt?: Date
}

export function prepareEnrollmentData(input: CreateEnrollmentInput): {
  userId: string
  enrolledAt: Date
  accessUntil: Date
  source: EnrollmentSource
  asaasPaymentId: string | null
} {
  const enrolledAt = input.enrolledAt ?? new Date()
  return {
    userId: input.userId,
    enrolledAt,
    accessUntil: calculateAccessUntil(enrolledAt),
    source: input.source,
    asaasPaymentId: input.asaasPaymentId ?? null,
  }
}
