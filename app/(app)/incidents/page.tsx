"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IncidentList } from "@/components/incidents/IncidentList"
import { IncidentForm } from "@/components/incidents/IncidentForm"
import { Plus, Search, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Severity, IncidentStatus } from "@prisma/client"
import { cn } from "@/lib/utils"

interface Incident {
  id: string
  title: string
  description?: string | null
  severity: Severity
  status: IncidentStatus
  createdAt: string
  resolvedAt?: string | null
  _count?: { timeline: number }
  user?: { id: string; name: string | null; email: string }
}

type Tab = "active" | "resolved"

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [tab, setTab] = useState<Tab>("active")
  const [search, setSearch] = useState("")
  const [severityFilter, setSeverityFilter] = useState<string>("all")

  const fetchIncidents = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.set("tab", tab)
      if (search) params.set("search", search)
      if (severityFilter && severityFilter !== "all") params.set("severity", severityFilter)

      const response = await fetch(`/api/incidents?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch incidents")
      const data = await response.json()
      setIncidents(data)
    } catch (error) {
      toast.error("Failed to fetch incidents")
    } finally {
      setIsLoading(false)
    }
  }, [tab, search, severityFilter])

  useEffect(() => {
    fetchIncidents()
  }, [fetchIncidents])

  const severityLabels: Record<string, string> = {
    all: "All Severities",
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
  }

  const handleCreateIncident = async (data: { title: string; description?: string; severity?: string }) => {
    const response = await fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      toast.error(error.error || "Failed to create incident")
      throw new Error(error.error)
    }

    toast.success("Incident created")
    fetchIncidents()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Incidents</h1>
          <p className="text-muted-foreground">Track and manage incidents</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Incident
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab("active")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            tab === "active"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Active
        </button>
        <button
          onClick={() => setTab("resolved")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            tab === "resolved"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Resolved
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search incidents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={severityFilter} onValueChange={(value) => value && setSeverityFilter(value)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue>{severityLabels[severityFilter]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <IncidentList
        incidents={incidents}
        emptyMessage={
          tab === "active"
            ? "No active incidents. Great job!"
            : "No resolved incidents yet."
        }
      />

      <IncidentForm
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateIncident}
      />
    </div>
  )
}
