/**
 * BIA v4 – Admin shared constants (safe for client and server)
 * NÃO importar server-only APIs aqui.
 *
 * SUPERADMIN_EMAILS: bypass permanente de qualquer gate de autorização.
 * Estes emails têm acesso automático a:
 *   - /dashboard/admin (painel admin completo)
 *   - /dashboard/admin/academy (CRUD de módulos/aulas)
 *   - /academy/dashboard (área do aluno) via role check no layout
 *   - Todas as APIs /api/admin/* (guard requireAcademyAdmin passa)
 *
 * IMPORTANTE: além do bypass hardcoded aqui, cada superadmin também deve
 * ter role=ADMIN no banco (via scripts/promote-team-admins.ts) porque
 * alguns componentes checam session.user.role em vez do isSuperAdmin.
 *
 * R13.11.2 (2026-09-16): Time interno Quantis adicionado como
 * superadmins — Janaina + 4 pessoas do time (Vitor, Lucas, Kamila,
 * Thaís). Acesso equivalente a admin completo, sem pagar. Também
 * recebem AcademyEnrollment manual para acessar /academy/dashboard
 * como aluno sem redirect.
 */

export const SUPERADMIN_EMAILS = [
  // CEO / fundadora
  "janaina.dernowsek@quantis.bio",
  "janaina@quantis.bio",
  // Time interno Quantis (R13.11.2)
  "vitor.mattos@quantis.bio",
  "lucas.guarnier@quantis.bio",
  "kamila.leichtweis@quantis.bio",
  "thais.amaral@quantis.bio",
]

export function isSuperAdmin(email?: string | null): boolean {
  if (!email) return false
  return SUPERADMIN_EMAILS.includes(email.toLowerCase().trim())
}
