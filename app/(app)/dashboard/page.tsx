"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SeverityBadge } from "@/components/incidents/SeverityBadge"
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Users,
  Loader2,
  ArrowRight,
  ListTodo,
  CheckCircle2,
  Circle,
} from "lucide-react"
import { Severity, IncidentStatus, Status, Priority } from "@prisma/client"

interface DashboardStats {
  tasks: {
    total: number
    todo: number
    inProgress: number
    done: number
    dueSoon: number
  }
  incidents: {
    total: number
    open: number
    investigating: number
    resolved: number
  }
  groups: {
    total: number
  }
}

interface RecentTask {
  id: string
  title: string
  status: Status
  priority: Priority
  createdAt: string
  group: { name: string }
}

interface RecentIncident {
  id: string
  title: string
  severity: Severity
  status: IncidentStatus
  createdAt: string
}

const statusIcons: Record<Status, React.ElementType> = {
  TODO: Circle,
  IN_PROGRESS: Clock,
  DONE: CheckCircle2,
}

const statusColors: Record<Status, string> = {
  TODO: "text-muted-foreground",
  IN_PROGRESS: "text-blue-500",
  DONE: "text-green-500",
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([])
  const [recentIncidents, setRecentIncidents] = useState<RecentIncident[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchDashboardData = useCallback(async () => {
    try {
      const [tasksRes, incidentsRes, groupsRes] = await Promise.all([
        fetch("/api/tasks?limit=5"),
        fetch("/api/incidents?tab=active"),
        fetch("/api/groups?filter=my"),
      ])

      const tasks = tasksRes.ok ? await tasksRes.json() : []
      const incidents = incidentsRes.ok ? await incidentsRes.json() : []
      const groups = groupsRes.ok ? await groupsRes.json() : []

      // Calculate stats from tasks
      const taskStats = {
        total: tasks.length,
        todo: tasks.filter((t: RecentTask) => t.status === "TODO").length,
        inProgress: tasks.filter((t: RecentTask) => t.status === "IN_PROGRESS").length,
        done: tasks.filter((t: RecentTask) => t.status === "DONE").length,
        dueSoon: 0, // Could calculate based on dueDate
      }

      // Calculate incident stats
      const incidentStats = {
        total: incidents.length,
        open: incidents.filter((i: RecentIncident) => i.status === "OPEN").length,
        investigating: incidents.filter((i: RecentIncident) => i.status === "INVESTIGATING").length,
        resolved: 0,
      }

      setStats({
        tasks: taskStats,
        incidents: incidentStats,
        groups: { total: groups.length },
      })

      setRecentTasks(tasks.slice(0, 5))
      setRecentIncidents(incidents.slice(0, 5))
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your workspace</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tasks
            </CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.tasks.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.tasks.inProgress || 0} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              To Do
            </CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.tasks.todo || 0}</div>
            <p className="text-xs text-muted-foreground">
              Tasks waiting to start
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Incidents
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.incidents.open || 0) + (stats?.incidents.investigating || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.incidents.investigating || 0} investigating
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Groups
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.groups.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active memberships
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Tasks</CardTitle>
              <CardDescription>Your latest tasks across all groups</CardDescription>
            </div>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/tasks" />}>
              View all
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tasks yet</p>
                <Button
                  variant="link"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/tasks" />}
                >
                  Create your first task
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((task) => {
                  const StatusIcon = statusIcons[task.status]
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <StatusIcon className={`h-4 w-4 ${statusColors[task.status]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{task.group.name}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Incidents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Active Incidents</CardTitle>
              <CardDescription>Incidents requiring attention</CardDescription>
            </div>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/incidents" />}>
              View all
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentIncidents.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active incidents</p>
                <p className="text-xs">All clear!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentIncidents.map((incident) => (
                  <Link
                    key={incident.id}
                    href={`/incidents/${incident.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{incident.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(incident.createdAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <SeverityBadge severity={incident.severity} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button nativeButton={false} render={<Link href="/tasks" />}>
            <CheckSquare className="mr-2 h-4 w-4" />
            View Tasks
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/groups" />}>
            <Users className="mr-2 h-4 w-4" />
            Manage Groups
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/incidents" />}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            View Incidents
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
