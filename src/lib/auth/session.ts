import { auth } from "@/lib/auth/config"
import { redirect } from "next/navigation"

/**
 * Get the current authenticated session (server-side).
 * Redirects to login if not authenticated.
 */
export async function requireAuth() {
  const session = await auth()
  if (!session?.user) {
    redirect("/auth/login")
  }
  return session
}

/**
 * Get the current session without redirecting.
 * Returns null if not authenticated.
 */
export async function getOptionalAuth() {
  return await auth()
}

/**
 * Get the current user ID (server-side).
 * Redirects if not authenticated.
 */
export async function requireUserId(): Promise<string> {
  const session = await requireAuth()
  return session.user.id
}
