import { Metadata } from "next"
import { auth } from "@/lib/auth/config"
import { redirect } from "next/navigation"
import { DashboardSidebar } from "@/components/layout/DashboardSidebar"

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s | BIA v3" },
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session) {
    redirect("/auth/login")
  }

  return (
    <div className="flex h-screen bg-[#030a04] overflow-hidden">
      <DashboardSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
