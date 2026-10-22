import { redirect } from "next/navigation"
/**
 * R24.6 · Os testes de imprimibilidade (linha, Pf, colapso, torre, escada Z,
 * leque, estrela, fidelidade) viraram uma FONTE DE MODELO da Fase 3 — o
 * BioSlicer é o único lugar de STL/geometria. ?test=<id> abre o teste direto.
 */
export default function PrintabilityRedirect({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const t = searchParams?.test
  const id = typeof t === "string" ? t : "test_grid"
  redirect(`/dashboard/bioprint/slice?test=${encodeURIComponent(id)}`)
}
