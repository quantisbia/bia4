/**
 * BIA · Landing · Biofabricação e Bioimpressão 3D aplicadas à Odontologia — R31 / R31.1
 *
 * Versão em português (padrão). Versão em inglês em /odontologia/en.
 * Layout e copy: ./_components/OdontologiaLanding.tsx + ./_components/copy.ts
 *
 * Fotos: 10 registros REAIS de turmas e do laboratório Quantis
 * (public/odontologia/*.jpg) — nenhuma imagem gerada. Guia Prático: mockup
 * espiral feito a partir da capa oficial (public/odontologia/guia-pratico-espiral.*).
 *
 * Fonte dos dados: docs/Quantis — Proposta institucional em biofabricação
 * aplicada à odontologia (PDF em public/odontologia/).
 */
import type { Metadata } from "next"
import OdontologiaLanding from "./_components/OdontologiaLanding"

export const metadata: Metadata = {
  title: "Biofabricação e Bioimpressão 3D aplicadas à Odontologia | Quantis",
  description:
    "Capacitação prática em biofabricação para odontologia regenerativa: regeneração óssea, scaffolds, biomateriais, planejamento digital e bioimpressão 3D. Turma de 5 a 8 profissionais, práticas no laboratório Quantis (SP), kit didático com guia prático impresso e 6 meses de BIA. R$ 4.287,50 por profissional.",
  openGraph: {
    type: "website",
    title: "Biofabricação e Bioimpressão 3D aplicadas à Odontologia",
    description: "Do desafio clínico ao projeto de biofabricação. Turma fechada de 5 a 8 profissionais · práticas presenciais · kit didático · plataforma BIA.",
    images: [{ url: "/odontologia/og.jpg", width: 1200, height: 630 }],
    locale: "pt_BR",
  },
  alternates: {
    canonical: "https://biaquantis.bio/odontologia",
    languages: { "pt-BR": "https://biaquantis.bio/odontologia", en: "https://biaquantis.bio/odontologia/en" },
  },
}

export default function OdontologiaLandingPage() {
  return <OdontologiaLanding lang="pt" />
}
