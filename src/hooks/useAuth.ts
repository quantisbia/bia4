"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

export function useAuth() {
  const { data: session, status, update } = useSession()
  const router = useRouter()

  const user = session?.user

  const isLoading = status === "loading"
  const isAuthenticated = status === "authenticated"
  const isUnauthenticated = status === "unauthenticated"

  const logout = async () => {
    await signOut({ redirect: false })
    router.push("/auth/login")
    router.refresh()
  }

  const refreshSession = () => update()

  return {
    user,
    session,
    status,
    isLoading,
    isAuthenticated,
    isUnauthenticated,
    logout,
    refreshSession,
    // Shorthand getters
    userId: user?.id,
    userName: user?.name,
    userEmail: user?.email,
    userImage: user?.image,
    userRole: user?.role,
    userPlan: (user?.plan as string) ?? "FREE",
    userCredits: (user?.credits as number) ?? 0,
    isAdmin: user?.role === "ADMIN",
    isResearcher: user?.role === "RESEARCHER" || user?.role === "ADMIN",
  }
}
