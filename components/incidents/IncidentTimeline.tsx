"use client"

import { format, formatDistanceToNow } from "date-fns"
import { EventType } from "@prisma/client"
import {
  AlertCircle,
  ArrowRight,
  Check,
  MessageSquare,
  Plus,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TimelineEvent {
  id: string
  type: EventType
  message: string
  createdAt: string | Date
}

interface IncidentTimelineProps {
  events: TimelineEvent[]
}

const eventConfig: Record<EventType, { icon: React.ElementType; color: string }> = {
  CREATED: {
    icon: Plus,
    color: "text-blue-500 bg-blue-100 dark:bg-blue-900/30",
  },
  STATUS_CHANGED: {
    icon: ArrowRight,
    color: "text-purple-500 bg-purple-100 dark:bg-purple-900/30",
  },
  SEVERITY_CHANGED: {
    icon: TrendingUp,
    color: "text-orange-500 bg-orange-100 dark:bg-orange-900/30",
  },
  NOTE_ADDED: {
    icon: MessageSquare,
    color: "text-gray-500 bg-gray-100 dark:bg-gray-800",
  },
  RESOLVED: {
    icon: Check,
    color: "text-green-500 bg-green-100 dark:bg-green-900/30",
  },
}

export function IncidentTimeline({ events }: IncidentTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No activity yet
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const config = eventConfig[event.type]
        const Icon = config.icon
        const createdAt = new Date(event.createdAt)

        return (
          <div key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  config.color
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              {index < events.length - 1 && (
                <div className="w-0.5 flex-1 bg-border mt-2" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <p className="text-sm">{event.message}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(createdAt, { addSuffix: true })}
                {" · "}
                {format(createdAt, "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
