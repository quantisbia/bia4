import { redirect } from "next/navigation"
// R24.6 · Formulação livre vive na Fase 2 (modo "Formular do zero").
export default function BioinkClassicRedirect() { redirect("/dashboard/bioprint/bioink?mode=free") }
