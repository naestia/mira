"use client"

import { formatDistanceToNow, differenceInMinutes } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SeverityBadge } from "@/components/incidents/SeverityBadge"
import { Badge } from "@/components/ui/badge"
import { Clock, ChevronRight } from "lucide-react"
import { Severity, IncidentStatus } from "@prisma/client"

interface SubmissionCardProps {
  submission: {
    id: string
    title: string
    description?: string | null
    severity: Severity
    status: IncidentStatus
    createdAt: string | Date
    resolvedAt?: string | Date | null
    _count?: { timeline: number }
  }
  onClick?: () => void
}

const statusLabels: Record<IncidentStatus, string> = {
  OPEN: "Submitted",
  INVESTIGATING: "Being looked into",
  RESOLVED: "Resolved",
}

const statusColors: Record<IncidentStatus, string> = {
  OPEN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  INVESTIGATING: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  RESOLVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
}

function formatDuration(start: Date, end: Date): string {
  const minutes = differenceInMinutes(end, start)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${minutes % 60}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

export function SubmissionCard({ submission, onClick }: SubmissionCardProps) {
  const createdAt = new Date(submission.createdAt)
  const resolvedAt = submission.resolvedAt ? new Date(submission.resolvedAt) : null

  return (
    <Card
      className="hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base line-clamp-1">{submission.title}</CardTitle>
          <SeverityBadge severity={submission.severity} />
        </div>
      </CardHeader>
      <CardContent>
        {submission.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {submission.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <Badge className={statusColors[submission.status]}>
            {statusLabels[submission.status]}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {resolvedAt ? (
              <span>Resolved in {formatDuration(createdAt, resolvedAt)}</span>
            ) : (
              <span>{formatDistanceToNow(createdAt, { addSuffix: true })}</span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end mt-2 text-xs text-muted-foreground">
          <span>View details</span>
          <ChevronRight className="h-3 w-3 ml-1" />
        </div>
      </CardContent>
    </Card>
  )
}
