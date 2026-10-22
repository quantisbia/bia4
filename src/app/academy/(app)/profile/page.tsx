import { redirect } from "next/navigation"
// R24.6 · Perfil do aluno = Configurações da BIA (senha, dados).
export default function AcademyProfileRedirect() { redirect("/dashboard/settings") }
