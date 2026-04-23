"use client"

import { cn } from "@/lib/utils"
import { Role } from "@prisma/client"

interface RoleBadgeProps {
  role: Role
  className?: string
}

const roleConfig: Record<Role, { label: string; className: string }> = {
  ADMIN: {
    label: "Admin",
    className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  USER: {
    label: "User",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  REPORTER: {
    label: "Reporter",
    className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  },
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const config = roleConfig[role]

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
