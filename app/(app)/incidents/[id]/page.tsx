"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { format, formatDistanceStrict } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SeverityBadge } from "@/components/incidents/SeverityBadge"
import { StatusStepper } from "@/components/incidents/StatusStepper"
import { IncidentTimeline } from "@/components/incidents/IncidentTimeline"
import { NoteForm } from "@/components/incidents/NoteForm"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { ArrowLeft, Clock, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Severity, IncidentStatus, EventType } from "@prisma/client"

interface TimelineEvent {
  id: string
  type: EventType
  message: string
  createdAt: string
}

interface Incident {
  id: string
  title: string
  description?: string | null
  severity: Severity
  status: IncidentStatus
  createdAt: string
  updatedAt: string
  resolvedAt?: string | null
  timeline: TimelineEvent[]
}

export default function IncidentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const incidentId = params.id as string

  const [incident, setIncident] = useState<Incident | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchIncident = useCallback(async () => {
    try {
      const response = await fetch(`/api/incidents/${incidentId}`)
      if (!response.ok) {
        router.push("/incidents")
        return
      }
      const data = await response.json()
      setIncident(data)
    } catch (error) {
      toast.error("Failed to fetch incident")
      router.push("/incidents")
    } finally {
      setIsLoading(false)
    }
  }, [incidentId, router])

  useEffect(() => {
    fetchIncident()
  }, [fetchIncident])

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    if (!incident || isUpdating) return
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/incidents/${incidentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      toast.success(`Status updated to ${newStatus}`)
      fetchIncident()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSeverityChange = async (newSeverity: Severity) => {
    if (!incident || isUpdating) return
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/incidents/${incidentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ severity: newSeverity }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      toast.success("Severity updated")
      fetchIncident()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update severity")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAddNote = async (message: string) => {
    const response = await fetch(`/api/incidents/${incidentId}/timeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    })

    if (!response.ok) {
      const error = await response.json()
      toast.error(error.error || "Failed to add note")
      throw new Error(error.error)
    }

    toast.success("Note added")
    fetchIncident()
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/incidents/${incidentId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      toast.success("Incident deleted")
      router.push("/incidents")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete incident")
      setIsDeleting(false)
      setIsDeleteOpen(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!incident) {
    return null
  }

  const createdAt = new Date(incident.createdAt)
  const resolvedAt = incident.resolvedAt ? new Date(incident.resolvedAt) : null
  const timeToResolve = resolvedAt
    ? formatDistanceStrict(createdAt, resolvedAt)
    : null

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/incidents" />}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{incident.title}</h1>
        </div>
        {incident.status === "RESOLVED" && (
          <Button variant="destructive" onClick={() => setIsDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        )}
      </div>

      {/* Status and Severity */}
      <div className="flex flex-wrap items-center gap-4">
        <StatusStepper
          currentStatus={incident.status}
          onStatusChange={handleStatusChange}
          disabled={isUpdating}
        />
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Severity:</span>
          <Select
            value={incident.severity}
            onValueChange={(value) => value && handleSeverityChange(value as Severity)}
            disabled={isUpdating || incident.status === "RESOLVED"}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Timestamps */}
      <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          Created: {format(createdAt, "MMM d, yyyy 'at' h:mm a")}
        </div>
        {resolvedAt && (
          <>
            <div>Resolved: {format(resolvedAt, "MMM d, yyyy 'at' h:mm a")}</div>
            <div className="font-medium text-green-600 dark:text-green-400">
              Time to resolve: {timeToResolve}
            </div>
          </>
        )}
      </div>

      {/* Description */}
      {incident.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{incident.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <IncidentTimeline events={incident.timeline} />
          <div className="border-t pt-4">
            <NoteForm
              onSubmit={handleAddNote}
              disabled={incident.status === "RESOLVED"}
            />
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete Incident"
        description={`Are you sure you want to delete "${incident.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  )
}
