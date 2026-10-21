import { redirect } from "next/navigation"
/** R20: hub de G-code unificado no BioSlicer (Etapa 3). */
export default function GcodeHubRedirect() { redirect("/dashboard/bioprint/slice") }
