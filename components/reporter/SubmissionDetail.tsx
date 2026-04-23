"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { format, formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SeverityBadge } from "@/components/incidents/SeverityBadge"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, Clock, CheckCircle, Search, FileText, MessageSquare, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { Severity, IncidentStatus, EventType } from "@prisma/client"

interface TimelineEvent {
  id: string
  type: EventType
  message: string
  createdAt: string
}

interface SubmissionDetailData {
  id: string
  title: string
  description: string | null
  severity: Severity
  status: IncidentStatus
  createdAt: string
  resolvedAt: string | null
  timeline: TimelineEvent[]
}

interface SubmissionDetailProps {
  id: string
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

const eventIcons: Record<EventType, typeof FileText> = {
  CREATED: FileText,
  STATUS_CHANGED: Clock,
  SEVERITY_CHANGED: Clock,
  NOTE_ADDED: MessageSquare,
  ASSIGNED: UserPlus,
  RESOLVED: CheckCircle,
}

export function SubmissionDetail({ id }: SubmissionDetailProps) {
  const router = useRouter()
  const [submission, setSubmission] = useState<SubmissionDetailData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchSubmission = useCallback(async () => {
    try {
      const response = await fetch(`/api/reporter/incidents/${id}`)
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Submission not found")
          router.push("/reporter")
          return
        }
        throw new Error("Failed to fetch submission")
      }
      const data = await response.json()
      setSubmission(data)
    } catch {
      toast.error("Failed to load submission details")
    } finally {
      setIsLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchSubmission()
  }, [fetchSubmission])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!submission) {
    return null
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/reporter")}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to submissions
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl">{submission.title}</CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Submitted {formatDistanceToNow(new Date(submission.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SeverityBadge severity={submission.severity} />
              <Badge className={statusColors[submission.status]}>
                {statusLabels[submission.status]}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {submission.description && (
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-muted-foreground">Description</h3>
              <p className="text-sm whitespace-pre-wrap">{submission.description}</p>
            </div>
          )}

          {submission.status === "RESOLVED" && submission.resolvedAt && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-md text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm">
                Resolved on {format(new Date(submission.resolvedAt), "MMMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
          )}

          {submission.status === "INVESTIGATING" && (
            <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-md text-purple-700 dark:text-purple-400">
              <Search className="h-5 w-5" />
              <span className="text-sm">
                Our team is currently investigating this incident
              </span>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="font-medium">Timeline</h3>
            <div className="relative space-y-4 pl-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border">
              {submission.timeline.map((event) => {
                const Icon = eventIcons[event.type]
                return (
                  <div key={event.id} className="relative">
                    <div className="absolute -left-6 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-background border">
                      <Icon className="h-2.5 w-2.5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm">{event.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
