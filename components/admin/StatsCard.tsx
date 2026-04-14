"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  variant?: "default" | "warning" | "danger"
}

export function StatsCard({ title, value, description, icon: Icon, variant = "default" }: StatsCardProps) {
  const variantStyles = {
    default: {
      card: "",
      icon: "text-muted-foreground",
      value: "",
    },
    warning: {
      card: "border-orange-200 dark:border-orange-800",
      icon: "text-orange-500",
      value: "text-orange-600 dark:text-orange-400",
    },
    danger: {
      card: "border-red-200 dark:border-red-800",
      icon: "text-red-500",
      value: "text-red-600 dark:text-red-400",
    },
  }

  const styles = variantStyles[variant]

  return (
    <Card className={cn(styles.card)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className={cn("h-4 w-4", styles.icon)} />}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", styles.value)}>{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
