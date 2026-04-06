import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "@/components/providers/SessionProvider"
import { ToastProvider } from "@/components/ui/Toast"
import { auth } from "@/lib/auth/config"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: { default: "BIA v4 - Biofabrication Intelligent Assistant", template: "%s | BIA v4" },
  description: "BIA v4 - Biofabrication Intelligent Assistant. Plataforma de inteligência artificial especializada em design de tecidos artificiais e organoides.",
  keywords: ["biofabricação", "tecidos artificiais", "organoides", "inteligência artificial", "biomateriais", "BIA"],
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0514" },
  ],
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <SessionProvider session={session}>
          <ToastProvider>
            {children}
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
