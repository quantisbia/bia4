import type { Metadata, Viewport } from "next"
import "./globals.css"
import { SessionProvider } from "@/components/providers/SessionProvider"
import { ToastProvider } from "@/components/ui/Toast"
import { auth } from "@/lib/auth/config"

// Fontes Inter + JetBrains Mono carregadas via <link> no <head> (CSS @import)
// para evitar falhas de fetch em build-time em sandboxes com rede restrita.
// Variáveis CSS --font-inter / --font-mono ficam definidas em globals.css.

const siteUrl = process.env.NEXTAUTH_URL || "https://bia.quantis.bio"

export const metadata: Metadata = {
  title: { default: "BIA v4 - Biofabrication Intelligent Assistant", template: "%s | BIA v4" },
  description: "Plataforma de IA para biofabricação: design de tecidos artificiais, organoides, bioimpressão 3D, formulação de biomateriais e protocolos GLP/GMP. 807+ formulações, 120+ artigos científicos, 12 etapas de pipeline.",
  keywords: [
    "biofabricação", "biofabrication", "tecidos artificiais", "tissue engineering",
    "organoides", "organoids", "bioimpressão 3D", "3D bioprinting",
    "biomateriais", "biomaterials", "hidrogéis", "GelMA", "alginato",
    "bioink", "scaffold", "inteligência artificial", "IA",
    "protocolos laboratoriais", "GLP", "GMP",
    "engenharia de tecidos", "medicina regenerativa",
    "Quantis Biotechnology", "BIA",
  ],
  authors: [
    { name: "Janaína Dernowsek", url: "https://quantis.bio" },
    { name: "Quantis Biotechnology" },
  ],
  creator: "Quantis Biotechnology",
  publisher: "Quantis Biotechnology",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "BIA - Biofabrication Intelligent Assistant",
    title: "BIA v4 - IA para Biofabricação | Quantis Biotechnology",
    description: "Plataforma de IA para design de tecidos, organoides e biomateriais. Pipeline de 12 etapas, 807+ formulações, 120+ artigos científicos. Comece com 30 créditos grátis.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BIA v4 - Biofabrication Intelligent Assistant",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BIA v4 - IA para Biofabricação",
    description: "Design de tecidos, organoides e biomateriais com IA. 807+ formulações, 120+ artigos. Comece grátis.",
    images: ["/og-image.png"],
    creator: "@quantisbio",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "technology",
  classification: "Biotechnology, Artificial Intelligence, Tissue Engineering",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0514" },
    { media: "(prefers-color-scheme: light)", color: "#0a0514" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        {/* Fontes Inter + JetBrains Mono via Google Fonts CSS (runtime, não build-time) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
        {/* Structured Data - Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "BIA - Biofabrication Intelligent Assistant",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description: "Plataforma de IA para biofabricação: design de tecidos, organoides e biomateriais",
              url: siteUrl,
              author: {
                "@type": "Organization",
                name: "Quantis Biotechnology",
                url: "https://quantis.bio",
              },
              offers: {
                "@type": "AggregateOffer",
                lowPrice: "0",
                highPrice: "4970",
                priceCurrency: "BRL",
                offerCount: "6",
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                ratingCount: "47",
                bestRating: "5",
              },
            }),
          }}
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="font-sans antialiased">
        <SessionProvider session={session}>
          <ToastProvider>
            {children}
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
