import { redirect } from "next/navigation"
/**
 * R24.6 · Formulador Pro vive na Fase 2 · Biotinta (modo "Formulador Pro (IA)").
 * Preserva query string (Academy biaHook: ?template=…&from=academy&lessonId=…).
 */
export default function FormulatorProRedirect({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(searchParams ?? {})) {
    if (typeof v === "string") qs.set(k, v)
    else if (Array.isArray(v) && v[0]) qs.set(k, v[0])
  }
  qs.set("mode", "pro")
  redirect(`/dashboard/bioprint/bioink?${qs.toString()}`)
}
