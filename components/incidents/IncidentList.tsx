"use client"

import { IncidentCard } from "./IncidentCard"
import { Severity, IncidentStatus } from "@prisma/client"

interface Incident {
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

interface IncidentListProps {
  incidents: Incident[]
  emptyMessage?: string
}

export function IncidentList({ incidents, emptyMessage = "No incidents found" }: IncidentListProps) {
  if (incidents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {incidents.map((incident) => (
        <IncidentCard key={incident.id} incident={incident} />
      ))}
    </div>
  )
}
