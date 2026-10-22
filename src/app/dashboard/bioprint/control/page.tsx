import { redirect } from "next/navigation"
/** R22: Etapa 4 é UMA só página — /execute (conexão, pré-flight, joystick, fluxo, validação, impressão, modo avançado). */
export default function ControlRedirect() { redirect("/dashboard/bioprint/execute") }
