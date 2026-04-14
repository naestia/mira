"use client"

import { cn } from "@/lib/utils"
import { Severity } from "@prisma/client"

interface SeverityBadgeProps {
  severity: Severity
  className?: string
}

const severityConfig: Record<Severity, { label: string; className: string }> = {
  LOW: {
    label: "Low",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  MEDIUM: {
    label: "Medium",
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  HIGH: {
    label: "High",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
  CRITICAL: {
    label: "Critical",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const config = severityConfig[severity]

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
