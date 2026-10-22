/**
 * BIA v4 · /dashboard/studio
 *
 * R24 · Racional de 6 fases — "um só lugar de STL".
 * O BIA Studio (gerador de scaffolds TPMS por voz/texto, R14.3) deixou de ser
 * um destino próprio: toda geometria 3D (anatômica, primitiva, upload, desenho,
 * scaffold) vive na Fase 3 · Fatiamento (BioSlicer), que já oferece gyroid,
 * Schwarz P, Diamond, Voronoi e Perlin como preenchimentos honestos.
 *
 * Esta rota permanece apenas como redirecionamento para não quebrar links
 * antigos (manual, academy, favoritos). R24.6: StudioClient.tsx foi removido;
 * repositório (não roteado) para referência/reativação futura.
 */
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default function StudioPage() {
  redirect("/dashboard/bioprint/slice?tab=advanced&from=studio")
}
