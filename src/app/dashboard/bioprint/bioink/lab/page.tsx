import { redirect } from "next/navigation"
// R24.6 · Laboratório guiado vive na Fase 2 (modo "Laboratório guiado").
export default function BioinkLabRedirect() { redirect("/dashboard/bioprint/bioink?mode=lab") }
