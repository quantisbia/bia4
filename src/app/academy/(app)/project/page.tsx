import { redirect } from "next/navigation"
// R24.6 · "Meu Projeto" vive no Notebook da BIA (NotebookEntry com versionamento V1/V2/V3).
export default function AcademyProjectRedirect() { redirect("/dashboard/notebook") }
