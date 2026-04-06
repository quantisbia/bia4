import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: {
    default: "BIA v3 - Plataforma de IA para Biofabricação",
    template: "%s | BIA v3",
  },
  description:
    "Plataforma de inteligência artificial especializada em design de tecidos artificiais e organoides. Acelere sua pesquisa em biofabricação com IA avançada.",
  keywords: [
    "biofabricação",
    "tecidos artificiais",
    "organoides",
    "inteligência artificial",
    "biomateriais",
    "engenharia de tecidos",
    "bioimpressão",
  ],
  authors: [{ name: "BIA v3 Team" }],
  creator: "BIA v3",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://bia.biotech.com.br",
    title: "BIA v3 - Plataforma de IA para Biofabricação",
    description: "Acelere sua pesquisa em biofabricação com IA especializada",
    siteName: "BIA v3",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#030a04" },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
