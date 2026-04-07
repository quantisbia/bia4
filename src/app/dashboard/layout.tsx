import { Metadata } from "next"
import { auth } from "@/lib/auth/config"
import { redirect } from "next/navigation"
import { DashboardSidebar } from "@/components/layout/DashboardSidebar"
import { MobileBottomNav } from "@/components/layout/MobileBottomNav"

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s | BIA v4" },
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/auth/login")

  return (
    <div className="flex h-screen bg-[#0a0514] overflow-hidden">
      {/* Desktop sidebar */}
      <DashboardSidebar />

      {/* Main — top padding for mobile top bar, bottom padding for mobile bottom nav */}
      <main className="flex-1 overflow-y-auto flex flex-col pt-[56px] md:pt-0 pb-[68px] md:pb-0">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <MobileBottomNav />
    </div>
  )
}
