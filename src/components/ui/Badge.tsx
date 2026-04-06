import { cn } from "@/lib/utils/helpers"
import { HTMLAttributes } from "react"

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline"
  size?: "sm" | "md"
}

function Badge({ className, variant = "default", size = "md", ...props }: BadgeProps) {
  const variants = {
    default: "bg-white/10 text-gray-300 border border-white/10",
    success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20",
    info: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    outline: "border border-white/20 text-gray-300",
  }

  const sizes = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium rounded-full",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
