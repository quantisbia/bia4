import { redirect } from "next/navigation"
/**
 * R24.6 · O "Toolpath Intelligence" duplicava Fase 2 (formulador multi-material)
 * e Fase 3 (G-codes de teste, viewer, análise). Viewer 3D + validador + análise
 * de shear vivem na Fase 4 (/execute); geração de G-code vive na Fase 3.
 */
export default function ToolpathRedirect() { redirect("/dashboard/bioprint/execute") }
