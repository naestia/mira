"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SubmissionCard } from "./SubmissionCard"
import { Loader2, Plus, FileText } from "lucide-react"
import { toast } from "sonner"
import { Severity, IncidentStatus } from "@prisma/client"

interface Submission {
  id: string
  title: string
  description: string | null
  severity: Severity
  status: IncidentStatus
  createdAt: string
  resolvedAt: string | null
  _count: { timeline: number }
}

export function SubmissionList() {
  const router = useRouter()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchSubmissions = useCallback(async () => {
    try {
      const response = await fetch("/api/reporter/incidents")
      if (!response.ok) throw new Error("Failed to fetch submissions")
      const data = await response.json()
      setSubmissions(data)
    } catch {
      toast.error("Failed to load submissions")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-1">No incidents submitted yet</h3>
        <p className="text-muted-foreground mb-4">
          Submit your first incident to get started
        </p>
        <Button nativeButton={false} render={<Link href="/reporter/new" />}>
          <Plus className="h-4 w-4 mr-2" />
          Submit an incident
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Your Submissions ({submissions.length})
        </h2>
        <Button nativeButton={false} render={<Link href="/reporter/new" />}>
          <Plus className="h-4 w-4 mr-2" />
          Submit new incident
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {submissions.map((submission) => (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            onClick={() => router.push(`/reporter/${submission.id}`)}
          />
        ))}
      </div>
    </div>
  )
}
