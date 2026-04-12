import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + "..."
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function calculateProgress(current: number, total: number): number {
  if (total === 0) return 0
  return Math.round((current / total) * 100)
}

export function getCreditCost(action: string): number {
  const costs: Record<string, number> = {
    pipeline_stage: 5,
    biomaterial_formulation: 10,
    organoid_design: 15,
    protocol_generation: 8,
    chat_message: 2,
    knowledge_search: 1,
  }
  return costs[action] || 1
}

export function getPlanColor(plan: string): string {
  const colors: Record<string, string> = {
    FREE:         "gray",
    ORGANOID_LAB: "teal",
    DISCOVERY:    "emerald",
    ADVANCED:     "blue",
    ENTERPRISE:   "purple",
    ACADEMY:      "amber",
  }
  return colors[plan] || "gray"
}

export function getStageStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: "gray",
    IN_PROGRESS: "blue",
    COMPLETED: "emerald",
    SKIPPED: "yellow",
  }
  return colors[status] || "gray"
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return function (...args: Parameters<T>) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}
