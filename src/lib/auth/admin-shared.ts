/**
 * BIA v4 – Admin shared constants (safe for client and server)
 * NÃO importar server-only APIs aqui.
 */

export const SUPERADMIN_EMAILS = [
  "janaina.dernowsek@quantis.bio",
  "janaina@quantis.bio",
]

export function isSuperAdmin(email?: string | null): boolean {
  if (!email) return false
  return SUPERADMIN_EMAILS.includes(email.toLowerCase().trim())
}
