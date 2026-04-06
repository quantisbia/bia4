import { cn } from "@/lib/utils/helpers"
import { HTMLAttributes } from "react"

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  variant?: "default" | "gradient" | "success" | "warning"
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
}

function Progress({
  className,
  value,
  max = 100,
  variant = "gradient",
  showLabel = false,
  size = "md",
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  const barVariants = {
    default: "bg-white/40",
    gradient: "bg-gradient-to-r from-emerald-500 to-teal-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
  }

  const heights = {
    sm: "h-1",
    md: "h-1.5",
    lg: "h-2.5",
  }

  return (
    <div className={cn("w-full", className)} {...props}>
      {showLabel && (
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>{value}</span>
          <span>{percentage.toFixed(0)}%</span>
        </div>
      )}
      <div className={cn("w-full bg-white/10 rounded-full overflow-hidden", heights[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", barVariants[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export { Progress }
