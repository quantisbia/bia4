"use client"

import { useState, useCallback } from "react"
import { useSession } from "next-auth/react"

export interface CreditTransaction {
  id: string
  type: "CREDIT" | "DEBIT"
  amount: number
  balance: number
  description: string
  createdAt: string
}

export interface UseCreditsReturn {
  balance: number
  isLoading: boolean
  error: string | null
  spend: (amount: number, description: string, metadata?: Record<string, unknown>) => Promise<boolean>
  refresh: () => Promise<void>
  fetchHistory: (limit?: number) => Promise<CreditTransaction[]>
  hasEnough: (amount: number) => boolean
  formatBalance: () => string
}

export function useCredits(): UseCreditsReturn {
  const { data: session, update } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const balance = (session?.user?.credits as number) ?? 0

  const hasEnough = useCallback(
    (amount: number) => balance >= amount,
    [balance]
  )

  const formatBalance = useCallback(
    () => balance.toLocaleString("pt-BR"),
    [balance]
  )

  const spend = useCallback(
    async (
      amount: number,
      description: string,
      metadata?: Record<string, unknown>
    ): Promise<boolean> => {
      if (!hasEnough(amount)) {
        setError(`Créditos insuficientes. Você tem ${balance} créditos, precisa de ${amount}.`)
        return false
      }

      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch("/api/credits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "spend", amount, description, metadata }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error ?? "Erro ao gastar créditos.")
          return false
        }

        // Update session with new balance
        await update({ credits: data.balance })
        return true
      } catch {
        setError("Erro de conexão. Tente novamente.")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [balance, hasEnough, update]
  )

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/credits")
      if (res.ok) {
        const data = await res.json()
        await update({ credits: data.balance })
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false)
    }
  }, [update])

  const fetchHistory = useCallback(async (limit = 20): Promise<CreditTransaction[]> => {
    try {
      const res = await fetch(`/api/credits/history?limit=${limit}`)
      if (!res.ok) return []
      const data = await res.json()
      return data.history ?? []
    } catch {
      return []
    }
  }, [])

  return {
    balance,
    isLoading,
    error,
    spend,
    refresh,
    fetchHistory,
    hasEnough,
    formatBalance,
  }
}
