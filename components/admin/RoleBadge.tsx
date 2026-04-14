"use client"

import { Badge } from "@/components/ui/badge"
import { Role } from "@prisma/client"

interface RoleBadgeProps {
  role: Role
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <Badge variant={role === "ADMIN" ? "default" : "secondary"}>
      {role}
    </Badge>
  )
}
