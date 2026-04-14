"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SeverityBadge } from "./SeverityBadge"
import { Badge } from "@/components/ui/badge"
import { Clock, MessageSquare, User } from "lucide-react"
import { Severity, IncidentStatus } from "@prisma/client"

interface IncidentCardProps {
  incident: {
    id: string
    title: string
    description?: string | null
    severity: Severity
    status: IncidentStatus
    createdAt: string | Date
    resolvedAt?: string | Date | null
    _count?: { timeline: number }
    user?: { id: string; name: string | null; email: string }
  }
}

const statusLabels: Record<IncidentStatus, string> = {
  OPEN: "Open",
  INVESTIGATING: "Investigating",
  RESOLVED: "Resolved",
}

const statusColors: Record<IncidentStatus, string> = {
  OPEN: "destructive",
  INVESTIGATING: "default",
  RESOLVED: "secondary",
}

export function IncidentCard({ incident }: IncidentCardProps) {
  const createdAt = new Date(incident.createdAt)
  const resolvedAt = incident.resolvedAt ? new Date(incident.resolvedAt) : null

  const timeToResolve = resolvedAt
    ? formatDistanceToNow(createdAt, { addSuffix: false })
    : null

  return (
    <Link href={`/incidents/${incident.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base line-clamp-1">{incident.title}</CardTitle>
            <SeverityBadge severity={incident.severity} />
          </div>
        </CardHeader>
        <CardContent>
          {incident.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {incident.description}
            </p>
          )}
          {incident.user && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
              <User className="h-3 w-3" />
              <span>{incident.user.name || incident.user.email}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={statusColors[incident.status] as "default" | "secondary" | "destructive"}>
                {statusLabels[incident.status]}
              </Badge>
              {incident._count && incident._count.timeline > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  {incident._count.timeline}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {resolvedAt ? (
                <span>Resolved in {timeToResolve}</span>
              ) : (
                <span>{formatDistanceToNow(createdAt, { addSuffix: true })}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
