import { auth } from "@/lib/auth/config"
import { redirect } from "next/navigation"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  return <>{children}</>
}
