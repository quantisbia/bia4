import type { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    default: "BIA Academy — Aprenda biofabricação com a ferramenta ao lado",
    template: "%s | BIA Academy",
  },
  description:
    "BIA Academy é a única formação em biofabricação e bioimpressão 3D onde a " +
    "ferramenta abre junto com a aula. 12 módulos, 12 meses de acesso, " +
    "3 encontros online ao vivo, acesso à plataforma BIA e certificado.",
  keywords: [
    "curso biofabricação",
    "curso bioimpressão",
    "engenharia tecidual",
    "biomateriais",
    "GelMA",
    "organoides",
    "medicina regenerativa",
    "cursos científicos",
    "BIA Academy",
    "Quantis Biotechnology",
  ],
  openGraph: {
    type: "website",
    title: "BIA Academy — Formação em biofabricação com plataforma integrada",
    description:
      "Aprenda e aplique na mesma tela. 12 módulos, 12 meses de acesso à BIA, " +
      "3 encontros ao vivo, certificado.",
    locale: "pt_BR",
    siteName: "BIA Academy",
  },
}

/**
 * Layout do /academy — INTENCIONALMENTE minimalista.
 *
 * Este layout NÃO usa o DashboardSidebar (essa área não faz parte do
 * dashboard do pesquisador). A landing pública precisa ser acessível
 * sem login, com header e footer próprios definidos em cada página.
 *
 * O layout raiz (src/app/layout.tsx) já provê SessionProvider,
 * ThemeProvider, LocaleProvider e ToastProvider — herdamos tudo.
 */
export default function AcademyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
