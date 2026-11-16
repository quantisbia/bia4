import type { Metadata } from "next"
import { PrintBasicClient } from "./PrintBasicClient"

export const metadata: Metadata = {
  title: "Impressão Básica",
  description: "Módulo básico de impressão da BIA: superfície (mesa, Petri, lâmina ou multiwell), objetos simples, até 3 cabeçotes com extrusão pneumática, mecânica/volumétrica ou filamento → G-code Marlin.",
}

export default function PrintBasicPage({ searchParams }: { searchParams?: { step?: string } }) {
  return <PrintBasicClient initialStep={searchParams?.step} />
}
