import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"

export async function GET() {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const [
      totalUsers,
      totalTasks,
      totalGroups,
      totalIncidents,
      tasksByStatus,
      incidentsByStatus,
      incidentsBySeverity,
      recentTasks,
      recentIncidents,
      activeIncidents,
      mostActiveUsers,
    ] = await Promise.all([
      // Total users (excluding deleted)
      prisma.user.count({
        where: { deletedAt: null },
      }),
      // Total tasks
      prisma.task.count(),
      // Total groups
      prisma.group.count(),
      // Total incidents
      prisma.incident.count(),
      // Tasks by status
      prisma.task.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      // Incidents by status
      prisma.incident.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      // Incidents by severity
      prisma.incident.groupBy({
        by: ["severity"],
        _count: { severity: true },
      }),
      // Tasks created in the last 7 days
      prisma.task.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      // Incidents created in the last 7 days
      prisma.incident.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      // Active incidents (OPEN or INVESTIGATING)
      prisma.incident.findMany({
        where: {
          status: { in: ["OPEN", "INVESTIGATING"] },
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: [
          { severity: "desc" },
          { createdAt: "desc" },
        ],
        take: 5,
      }),
      // Most active users (by task count)
      prisma.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          _count: { select: { tasks: true } },
        },
        orderBy: { tasks: { _count: "desc" } },
        take: 5,
      }),
    ])

    const taskStatusCounts = {
      TODO: 0,
      IN_PROGRESS: 0,
      DONE: 0,
    }

    tasksByStatus.forEach((item) => {
      taskStatusCounts[item.status] = item._count.status
    })

    const incidentStatusCounts = {
      OPEN: 0,
      INVESTIGATING: 0,
      RESOLVED: 0,
    }

    incidentsByStatus.forEach((item) => {
      incidentStatusCounts[item.status] = item._count.status
    })

    const incidentSeverityCounts = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    }

    incidentsBySeverity.forEach((item) => {
      incidentSeverityCounts[item.severity] = item._count.severity
    })

    return NextResponse.json({
      totalUsers,
      totalTasks,
      totalGroups,
      totalIncidents,
      tasksByStatus: taskStatusCounts,
      incidentsByStatus: incidentStatusCounts,
      incidentsBySeverity: incidentSeverityCounts,
      tasksLast7Days: recentTasks,
      incidentsLast7Days: recentIncidents,
      activeIncidents: activeIncidents.map((i) => ({
        id: i.id,
        title: i.title,
        severity: i.severity,
        status: i.status,
        createdAt: i.createdAt,
        user: i.user,
      })),
      mostActiveUsers: mostActiveUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        taskCount: u._count.tasks,
      })),
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
