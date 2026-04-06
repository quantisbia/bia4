"use client"

import { useState, useCallback } from "react"
import { useCredits } from "./useCredits"
import { useToast } from "@/components/ui/Toast"
import { InsufficientCreditsModal } from "@/components/credits/CreditWidgets"
import { CREDIT_COSTS } from "@/lib/auth/credits"

type CreditAction = keyof typeof CREDIT_COSTS

interface UseCreditGuardReturn {
  guard: (action: CreditAction, description: string, metadata?: Record<string, unknown>) => Promise<boolean>
  isGuarding: boolean
  Modal: React.ReactNode
}

export function useCreditGuard(): UseCreditGuardReturn {
  const { spend, balance, hasEnough } = useCredits()
  const { creditSpent } = useToast()
  const [isGuarding, setIsGuarding] = useState(false)
  const [modalState, setModalState] = useState<{
    open: boolean
    required: number
    action: string
  }>({ open: false, required: 0, action: "" })

  const guard = useCallback(
    async (
      action: CreditAction,
      description: string,
      metadata?: Record<string, unknown>
    ): Promise<boolean> => {
      const cost = CREDIT_COSTS[action]

      if (!hasEnough(cost)) {
        setModalState({ open: true, required: cost, action: description })
        return false
      }

      setIsGuarding(true)
      const ok = await spend(cost, description, metadata)
      setIsGuarding(false)

      if (ok) {
        creditSpent(cost, description)
      }

      return ok
    },
    [hasEnough, spend, creditSpent]
  )

  const Modal = (
    <InsufficientCreditsModal
      isOpen={modalState.open}
      onClose={() => setModalState((s) => ({ ...s, open: false }))}
      required={modalState.required}
      balance={balance}
      action={modalState.action}
    />
  )

  return { guard, isGuarding, Modal }
}
