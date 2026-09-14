/**
 * BIA · Academy · Autorização para o CRUD admin — R13.10.1
 *
 * Regra travada com Janaina (opção B):
 *   Podem editar módulos/aulas: SUPERADMIN (email hardcoded) + role ADMIN
 *   + role INSTRUCTOR (prepara futuro time de conteúdo)
 *
 * Uso típico em route handlers:
 *   const auth = await requireAcademyAdmin()
 *   if (!auth.ok) return auth.response
 *   // ... prossegue com session.user
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { isSuperAdmin } from "@/lib/auth/admin-shared"

export type AdminAuthResult =
  | { ok: true; userId: string; email: string; role: string; isSuperAdmin: boolean }
  | { ok: false; response: NextResponse }

/**
 * Verifica se o usuário logado pode acessar o CRUD Academy admin.
 * Retorna sucesso com dados da sessão, ou uma NextResponse de erro pronta.
 *
 * Ordem de validação:
 *   1. Sessão presente (session.user.id) → 401 se não
 *   2. SUPERADMIN por email OU role ∈ {ADMIN, INSTRUCTOR} → 403 se não
 */
export async function requireAcademyAdmin(): Promise<AdminAuthResult> {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "UNAUTHORIZED", message: "Sessão não encontrada. Faça login." },
        { status: 401 },
      ),
    }
  }

  const email = session.user.email ?? ""
  const role = (session.user as { role?: string }).role ?? "USER"
  const superAdmin = isSuperAdmin(email)
  const hasElevatedRole = role === "ADMIN" || role === "INSTRUCTOR"

  if (!superAdmin && !hasElevatedRole) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Este recurso é restrito a administradores e instrutores da BIA Academy.",
        },
        { status: 403 },
      ),
    }
  }

  return {
    ok: true,
    userId: session.user.id,
    email,
    role,
    isSuperAdmin: superAdmin,
  }
}

/**
 * Versão para uso em Server Components (páginas /dashboard/admin/academy/*).
 * Retorna null se autorizado (pode renderizar); retorna o path de redirect
 * caso contrário.
 *
 * Uso:
 *   const redirectTo = await checkAcademyAdminOrRedirect()
 *   if (redirectTo) redirect(redirectTo)
 */
export async function checkAcademyAdminOrRedirect(): Promise<string | null> {
  const session = await auth()

  if (!session?.user?.id) {
    return "/auth/login?callbackUrl=/dashboard/admin/academy"
  }

  const email = session.user.email ?? ""
  const role = (session.user as { role?: string }).role ?? "USER"
  const superAdmin = isSuperAdmin(email)
  const hasElevatedRole = role === "ADMIN" || role === "INSTRUCTOR"

  if (!superAdmin && !hasElevatedRole) {
    // Manda pra dashboard normal (não tem acesso ao admin)
    return "/dashboard?error=forbidden-academy-admin"
  }

  return null // pode acessar
}
