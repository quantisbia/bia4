import { redirect } from "next/navigation"
/** R20: gerador "médico" (placas de poços, zonas críticas) foi absorvido pela base BioSlicer — alvo Placa 6–96 poços na Etapa 3. */
export default function MedicalGcodeRedirect() { redirect("/dashboard/bioprint/slice") }
