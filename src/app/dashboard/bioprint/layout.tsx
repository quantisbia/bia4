"use client"

/**
 * BIA — Layout do processo de bioimpressão
 *
 * Envolve TODAS as sub-rotas /dashboard/bioprint/* com o
 * BioprintProcessProvider para que o estado das 4 etapas
 * seja compartilhado entre páginas (model → bioink → slice → control).
 *
 * Também renderiza o stepper visual fixo no topo, sempre mostrando
 * em qual etapa o usuário está e qual é o progresso geral.
 */

import { BioprintProcessProvider } from "@/lib/bioprint/process-context"
import { BioprintStepper } from "@/components/bioprint/BioprintStepper"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function BioprintLayout({ children }: { children: React.ReactNode }) {
  return (
    <BioprintProcessProvider>
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        {/* Header global do processo */}
        <header className="border-b border-white/5 bg-black/40 backdrop-blur sticky top-0 z-20">
          <div className="px-4 sm:px-6 py-3 flex items-center gap-3 max-w-7xl mx-auto">
            <Link
              href="/dashboard"
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs"
            >
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Link>
            <span className="text-white/20">/</span>
            <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-emerald-300 via-cyan-300 to-violet-300 bg-clip-text text-transparent">
              Processo de Bioimpressão
            </h1>
          </div>
          {/* Stepper visual logo abaixo do header */}
          <div className="px-4 sm:px-6 pb-3 max-w-7xl mx-auto">
            <BioprintStepper />
          </div>
        </header>

        {/* Conteúdo da etapa atual */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </main>
      </div>
    </BioprintProcessProvider>
  )
}
