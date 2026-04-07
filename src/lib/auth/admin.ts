/**
 * BIA v4 – Admin Authorization (SERVER ONLY)
 * Janaina Dernowsek é a gestora principal com acesso SUPERADMIN
 */

import { auth } from "@/lib/auth/config"
import { NextResponse } from "next/server"
export { isSuperAdmin, SUPERADMIN_EMAILS } from "./admin-shared"
import { isSuperAdmin } from "./admin-shared"

/**
 * Verifica se a requisição vem de um admin autorizado.
 * Retorna { session } se OK, ou um NextResponse de erro.
 */
export async function requireAdmin() {
  const session = await auth()

  if (!session?.user) {
    return {
      error: NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      ),
      session: null,
    }
  }

  const email = session.user.email
  const role = (session.user as { role?: string }).role

  if (!isSuperAdmin(email) && role !== "ADMIN") {
    return {
      error: NextResponse.json(
        { error: "Acesso restrito — área administrativa" },
        { status: 403 }
      ),
      session: null,
    }
  }

  return { error: null, session }
}
