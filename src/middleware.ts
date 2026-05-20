/**
 * Middleware — roda no Edge Runtime da Vercel.
 *
 * NÃO pode importar Prisma, bcryptjs ou qualquer código Node-only.
 * Por isso usamos `authEdgeConfig` (sem providers de DB) em vez do
 * `@/lib/auth/config` completo.
 */

import NextAuth from "next-auth"
import { authEdgeConfig } from "@/lib/auth/edge"

export const { auth: middleware } = NextAuth(authEdgeConfig)

export default middleware((req) => {
  // O callback `authorized` em authEdgeConfig já cuida da lógica de
  // proteção de rotas. Aqui só precisamos deixar a request seguir.
  return
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
