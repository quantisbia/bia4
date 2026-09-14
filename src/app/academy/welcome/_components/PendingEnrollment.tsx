"use client"

/**
 * BIA · Academy · PendingEnrollment (opção B da Janaina) — R13.02
 *
 * Renderizada quando o usuário está logado mas NÃO tem matrícula ativa:
 *  - state === "NO_ENROLLMENT" → nunca comprou o curso
 *  - state === "EXPIRED"       → 12 meses passaram
 *  - state === "PENDING"       → matrícula criada mas ainda sem accessUntil (raro)
 *
 * Mostra os 2 CTAs comerciais (Asaas + WhatsApp) + link "Voltar ao BIA".
 * Trackamos o view + os cliques para o time comercial ver funil.
 */

import { useEffect } from "react"
import Link from "next/link"
import {
  Lock, ArrowRight, MessageCircle, ExternalLink,
  GraduationCap, Clock,
} from "lucide-react"

const ASAAS_LINK = "https://www.asaas.com/c/iu7ym1dp93cei9zk"
const WHATSAPP_LINK = "https://wa.me/11968632231"

function track(event: string, metadata?: Record<string, unknown>) {
  fetch("/api/academy/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, path: "/academy/welcome", metadata }),
    keepalive: true,
  }).catch(() => {})
}

export function PendingEnrollment({
  state,
  userName,
  accessUntil,
}: {
  state: "NO_ENROLLMENT" | "EXPIRED" | "PENDING"
  userName: string | null
  accessUntil?: Date
}) {
  useEffect(() => {
    track("pending_enrollment_viewed", { state })
  }, [state])

  const firstName = userName?.split(" ")[0] ?? ""

  const isExpired = state === "EXPIRED"

  return (
    <div className="min-h-screen bg-[#0a0514] text-white flex items-start sm:items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">
              BIA <span className="text-violet-300">Academy</span>
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.05] p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
              {isExpired ? (
                <Clock className="w-5 h-5 text-amber-300" />
              ) : (
                <Lock className="w-5 h-5 text-amber-300" />
              )}
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white leading-tight">
                {isExpired
                  ? "Sua matrícula expirou"
                  : firstName
                    ? `Olá, ${firstName} — você ainda não é aluno`
                    : "Você ainda não tem matrícula ativa"}
              </h1>
              <p className="text-xs sm:text-sm text-amber-200/80 mt-0.5">
                {isExpired
                  ? "Renove seu acesso para continuar de onde parou"
                  : "Inscreva-se para acessar as 12 aulas do programa"}
              </p>
            </div>
          </div>

          {isExpired && accessUntil && (
            <p className="text-xs text-gray-400 mb-4">
              Seu acesso terminou em{" "}
              <strong className="text-white">
                {new Intl.DateTimeFormat("pt-BR").format(new Date(accessUntil))}
              </strong>.
              Seu <strong className="text-white">Notebook continua acessível</strong> com todos os
              seus protocolos, formulações e projetos.
            </p>
          )}

          <div className="space-y-2">
            <a
              href={ASAAS_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("cta_asaas_clicked", { location: "pending", state })}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-semibold px-6 py-3 shadow-lg shadow-violet-500/20"
              data-testid="pending-cta-asaas"
            >
              {isExpired ? "Renovar acesso" : "Inscreva-se no curso online"}
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("cta_whatsapp_clicked", { location: "pending", state })}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium px-6 py-3"
              data-testid="pending-cta-whatsapp"
            >
              <MessageCircle className="w-4 h-4" />
              Grupo fechado / corporativo
            </a>
          </div>

          <p className="text-[11px] text-gray-500 mt-4 text-center">
            Pagamento seguro via Asaas · Corporativo pelo WhatsApp comercial
          </p>
        </div>

        <div className="text-center mt-6 space-y-2">
          <Link
            href="/academy"
            className="text-xs text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            Conhecer o programa completo
          </Link>
          <div>
            <Link
              href="/dashboard"
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Voltar ao BIA (plataforma)
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
