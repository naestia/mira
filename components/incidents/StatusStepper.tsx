"use client"

import { cn } from "@/lib/utils"
import { IncidentStatus } from "@prisma/client"
import { Check, Circle, AlertCircle, Search } from "lucide-react"

interface StatusStepperProps {
  currentStatus: IncidentStatus
  onStatusChange?: (status: IncidentStatus) => void
  disabled?: boolean
}

const steps: { status: IncidentStatus; label: string; icon: React.ElementType }[] = [
  { status: "OPEN", label: "Open", icon: AlertCircle },
  { status: "INVESTIGATING", label: "Investigating", icon: Search },
  { status: "RESOLVED", label: "Resolved", icon: Check },
]

const statusOrder: Record<IncidentStatus, number> = {
  OPEN: 0,
  INVESTIGATING: 1,
  RESOLVED: 2,
}

export function StatusStepper({ currentStatus, onStatusChange, disabled }: StatusStepperProps) {
  const currentIndex = statusOrder[currentStatus]

  const handleClick = (status: IncidentStatus) => {
    if (disabled || !onStatusChange) return
    const targetIndex = statusOrder[status]
    // Only allow forward progression by one step
    if (targetIndex === currentIndex + 1) {
      onStatusChange(status)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const Icon = step.icon
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex
        const isNext = index === currentIndex + 1
        const isClickable = isNext && !disabled && onStatusChange

        return (
          <div key={step.status} className="flex items-center">
            <button
              type="button"
              onClick={() => handleClick(step.status)}
              disabled={!isClickable}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                isCompleted && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                isCurrent && "bg-primary text-primary-foreground",
                !isCompleted && !isCurrent && "bg-muted text-muted-foreground",
                isClickable && "cursor-pointer hover:bg-primary/80 hover:text-primary-foreground",
                !isClickable && !isCurrent && "cursor-default"
              )}
            >
              {isCompleted ? (
                <Check className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              {step.label}
            </button>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 w-8",
                  index < currentIndex ? "bg-green-500" : "bg-muted"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
