/**
 * BIA · Landing · Biofabrication and 3D Bioprinting applied to Dentistry — R31.1
 *
 * English version of /odontologia. Same layout, assets, payment link (Asaas)
 * and proposal PDF; copy from ../_components/copy.ts (lang = "en").
 */
import type { Metadata } from "next"
import OdontologiaLanding from "../_components/OdontologiaLanding"

export const metadata: Metadata = {
  title: "Biofabrication and 3D Bioprinting applied to Dentistry | Quantis",
  description:
    "Hands-on biofabrication training for regenerative dentistry: bone regeneration, scaffolds, biomaterials, digital planning and 3D bioprinting. Groups of 5 to 8 professionals, hands-on sessions at the Quantis laboratory (São Paulo, Brazil), learning kit with printed practical guide and 6 months of BIA. R$ 4,287.50 per professional.",
  openGraph: {
    type: "website",
    title: "Biofabrication and 3D Bioprinting applied to Dentistry",
    description: "From the clinical challenge to the biofabrication project. Closed group of 5 to 8 professionals · in-person hands-on sessions · learning kit · BIA platform.",
    images: [{ url: "/odontologia/og.jpg", width: 1200, height: 630 }],
    locale: "en_US",
  },
  alternates: {
    canonical: "https://biaquantis.bio/odontologia/en",
    languages: { "pt-BR": "https://biaquantis.bio/odontologia", en: "https://biaquantis.bio/odontologia/en" },
  },
}

export default function OdontologiaLandingPageEn() {
  return <OdontologiaLanding lang="en" />
}
