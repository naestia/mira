"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Loader2, ExternalLink, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow, format } from "date-fns"

interface Incident {
  id: string
  title: string
  description: string | null
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  status: "OPEN" | "INVESTIGATING" | "RESOLVED"
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  user: {
    id: string
    name: string | null
    email: string
  }
  timelineCount: number
}

const severityColors = {
  LOW: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  MEDIUM: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
}

const statusColors = {
  OPEN: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  INVESTIGATING: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  RESOLVED: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
}

export default function AdminIncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [severityFilter, setSeverityFilter] = useState("all")

  const statusLabels: Record<string, string> = {
    all: "All Status",
    OPEN: "Open",
    INVESTIGATING: "Investigating",
    RESOLVED: "Resolved",
  }

  const severityLabels: Record<string, string> = {
    all: "All Severities",
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
  }

  const fetchIncidents = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (severityFilter !== "all") params.set("severity", severityFilter)

      const response = await fetch(`/api/admin/incidents?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch incidents")
      const data = await response.json()
      setIncidents(data)
    } catch (error) {
      toast.error("Failed to fetch incidents")
    } finally {
      setIsLoading(false)
    }
  }, [search, statusFilter, severityFilter])

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchIncidents()
    }, 300)
    return () => clearTimeout(debounce)
  }, [fetchIncidents])

  const activeCount = incidents.filter(
    (i) => i.status === "OPEN" || i.status === "INVESTIGATING"
  ).length

  const criticalCount = incidents.filter(
    (i) => i.severity === "CRITICAL" && i.status !== "RESOLVED"
  ).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Incidents</h1>
          <p className="text-muted-foreground">
            Manage all incidents across the system
          </p>
        </div>
        <div className="flex items-center gap-4">
          {criticalCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {criticalCount} Critical
            </Badge>
          )}
          <Badge variant="secondary">
            {activeCount} Active / {incidents.length} Total
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Incidents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search incidents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue>{statusLabels[statusFilter]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={(v) => v && setSeverityFilter(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue>{severityLabels[severityFilter]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : incidents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No incidents found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Incident</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Resolution Time</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.map((incident) => (
                    <TableRow key={incident.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{incident.title}</div>
                          {incident.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                              {incident.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {incident.user.name || "—"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {incident.user.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={severityColors[incident.severity]}>
                          {incident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[incident.status]}>
                          {incident.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(incident.createdAt), "MMM d, yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(incident.createdAt), {
                            addSuffix: true,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {incident.resolvedAt ? (
                          <div className="text-sm">
                            {formatDistanceToNow(
                              new Date(incident.createdAt),
                              { includeSeconds: true }
                            ).replace("about ", "")}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          nativeButton={false}
                          render={<Link href={`/incidents/${incident.id}`} />}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
