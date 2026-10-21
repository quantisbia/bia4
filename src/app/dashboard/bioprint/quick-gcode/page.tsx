import { redirect } from "next/navigation"
/** R20: G-code Rápido foi unificado no BioSlicer (Etapa 3) — primitivas: bloco, disco, tubo, domo. */
export default function QuickGcodeRedirect() { redirect("/dashboard/bioprint/slice?quick=1") }
