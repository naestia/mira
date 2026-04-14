"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { StatsCard } from "@/components/admin/StatsCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, CheckSquare, Clock, TrendingUp, AlertTriangle, Shield } from "lucide-react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

interface Stats {
  totalUsers: number
  totalTasks: number
  totalGroups: number
  totalIncidents: number
  tasksByStatus: {
    TODO: number
    IN_PROGRESS: number
    DONE: number
  }
  incidentsByStatus: {
    OPEN: number
    INVESTIGATING: number
    RESOLVED: number
  }
  incidentsBySeverity: {
    LOW: number
    MEDIUM: number
    HIGH: number
    CRITICAL: number
  }
  tasksLast7Days: number
  incidentsLast7Days: number
  activeIncidents: {
    id: string
    title: string
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    status: "OPEN" | "INVESTIGATING" | "RESOLVED"
    createdAt: string
    user: { id: string; name: string | null; email: string }
  }[]
  mostActiveUsers: {
    id: string
    name: string | null
    email: string
    taskCount: number
  }[]
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

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/admin/stats")
        if (!response.ok) throw new Error("Failed to fetch stats")
        const data = await response.json()
        setStats(data)
      } catch (error) {
        toast.error("Failed to fetch dashboard stats")
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Failed to load dashboard data.</p>
      </div>
    )
  }

  const activeIncidentCount = stats.incidentsByStatus.OPEN + stats.incidentsByStatus.INVESTIGATING

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of your application</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
        />
        <StatsCard
          title="Total Tasks"
          value={stats.totalTasks}
          icon={CheckSquare}
        />
        <StatsCard
          title="Total Incidents"
          value={stats.totalIncidents}
          icon={AlertTriangle}
        />
        <StatsCard
          title="Active Incidents"
          value={activeIncidentCount}
          icon={Shield}
          variant={activeIncidentCount > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Tasks (Last 7 Days)"
          value={stats.tasksLast7Days}
          icon={TrendingUp}
        />
        <StatsCard
          title="Incidents (Last 7 Days)"
          value={stats.incidentsLast7Days}
          icon={TrendingUp}
        />
        <StatsCard
          title="Tasks In Progress"
          value={stats.tasksByStatus.IN_PROGRESS}
          icon={Clock}
        />
        <StatsCard
          title="Critical Incidents"
          value={stats.incidentsBySeverity.CRITICAL}
          icon={AlertTriangle}
          variant={stats.incidentsBySeverity.CRITICAL > 0 ? "danger" : "default"}
        />
      </div>

      {/* Active Incidents Section */}
      {stats.activeIncidents.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Active Incidents
            </CardTitle>
            <Link
              href="/admin/incidents"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.activeIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{incident.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {incident.user.name || incident.user.email} &middot;{" "}
                      {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge className={severityColors[incident.severity]}>
                      {incident.severity}
                    </Badge>
                    <Badge className={statusColors[incident.status]}>
                      {incident.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Todo</span>
                <span className="font-medium">{stats.tasksByStatus.TODO}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">In Progress</span>
                <span className="font-medium">{stats.tasksByStatus.IN_PROGRESS}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Done</span>
                <span className="font-medium">{stats.tasksByStatus.DONE}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incidents by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Critical
                </span>
                <span className="font-medium">{stats.incidentsBySeverity.CRITICAL}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  High
                </span>
                <span className="font-medium">{stats.incidentsBySeverity.HIGH}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                  Medium
                </span>
                <span className="font-medium">{stats.incidentsBySeverity.MEDIUM}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                  Low
                </span>
                <span className="font-medium">{stats.incidentsBySeverity.LOW}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.mostActiveUsers.length === 0 ? (
                <p className="text-muted-foreground text-sm">No users yet</p>
              ) : (
                stats.mostActiveUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{user.name || "—"}</div>
                      <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                    </div>
                    <span className="text-sm text-muted-foreground ml-2">
                      {user.taskCount} tasks
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
