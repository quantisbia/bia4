import { redirect } from "next/navigation"
/** R20: gerador "avançado" (Voronoi/Perlin/vasculatura) foi absorvido pela base BioSlicer — infills avançados vivem na aba Avançado da Etapa 3. */
export default function AdvancedGcodeRedirect() { redirect("/dashboard/bioprint/slice?tab=advanced") }
