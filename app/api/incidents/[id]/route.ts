import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { incidentUpdateSchema } from "@/lib/validations"
import { notifyStatusChange, notifyIncidentResolved, notifyIncidentAssigned } from "@/lib/notifications"
import { IncidentStatus } from "@prisma/client"

type Params = Promise<{ id: string }>

// Valid status transitions (forward-only)
const validTransitions: Record<IncidentStatus, IncidentStatus[]> = {
  OPEN: ["INVESTIGATING"],
  INVESTIGATING: ["RESOLVED"],
  RESOLVED: [],
}

export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Reporters must use /api/reporter/incidents
    if (session.user.role === "REPORTER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const isAdmin = session.user.role === "ADMIN"

    const incident = await prisma.incident.findFirst({
      where: {
        id,
        // Admins can view any incident, users can only view their own
        ...(!isAdmin && { userId: session.user.id }),
      },
      include: {
        timeline: {
          orderBy: { createdAt: "asc" },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }

    return NextResponse.json(incident)
  } catch (error) {
    console.error("Error fetching incident:", error)
    return NextResponse.json(
      { error: "Failed to fetch incident" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Reporters cannot modify incidents
    if (session.user.role === "REPORTER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = incidentUpdateSchema.parse(body)
    const isAdmin = session.user.role === "ADMIN"

    const existingIncident = await prisma.incident.findFirst({
      where: {
        id,
        // Admins can update any incident, users can only update their own
        ...(!isAdmin && { userId: session.user.id }),
      },
    })

    if (!existingIncident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }

    const timelineEvents: { type: string; message: string }[] = []
    const updateData: Record<string, unknown> = {}

    // Handle status change
    if (validatedData.status && validatedData.status !== existingIncident.status) {
      const allowedTransitions = validTransitions[existingIncident.status]
      if (!allowedTransitions.includes(validatedData.status)) {
        return NextResponse.json(
          { error: `Cannot transition from ${existingIncident.status} to ${validatedData.status}` },
          { status: 400 }
        )
      }

      updateData.status = validatedData.status

      if (validatedData.status === "RESOLVED") {
        updateData.resolvedAt = new Date()
        timelineEvents.push({
          type: "RESOLVED",
          message: "Incident resolved",
        })
      } else {
        timelineEvents.push({
          type: "STATUS_CHANGED",
          message: `Status changed from ${existingIncident.status} to ${validatedData.status}`,
        })
      }
    }

    // Handle severity change
    if (validatedData.severity && validatedData.severity !== existingIncident.severity) {
      updateData.severity = validatedData.severity
      timelineEvents.push({
        type: "SEVERITY_CHANGED",
        message: `Severity changed from ${existingIncident.severity} to ${validatedData.severity}`,
      })
    }

    // Handle title/description changes
    if (validatedData.title !== undefined) {
      updateData.title = validatedData.title
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description
    }

    // Handle assignee change
    let newAssigneeName: string | null = null
    if (validatedData.assigneeId !== undefined && validatedData.assigneeId !== existingIncident.assigneeId) {
      updateData.assigneeId = validatedData.assigneeId

      if (validatedData.assigneeId) {
        // Verify assignee exists and is an admin or user (not reporter)
        const assignee = await prisma.user.findFirst({
          where: {
            id: validatedData.assigneeId,
            role: { in: ["ADMIN", "USER"] },
            active: true,
            deletedAt: null,
          },
          select: { id: true, name: true, email: true },
        })

        if (!assignee) {
          return NextResponse.json(
            { error: "Invalid assignee" },
            { status: 400 }
          )
        }

        newAssigneeName = assignee.name || assignee.email
        timelineEvents.push({
          type: "ASSIGNED",
          message: `Assigned to ${newAssigneeName}`,
        })
      } else {
        timelineEvents.push({
          type: "ASSIGNED",
          message: "Unassigned",
        })
      }
    }

    const incident = await prisma.incident.update({
      where: { id },
      data: {
        ...updateData,
        timeline: timelineEvents.length > 0 ? {
          create: timelineEvents.map(e => ({
            type: e.type as "STATUS_CHANGED" | "SEVERITY_CHANGED" | "ASSIGNED" | "RESOLVED",
            message: e.message,
          })),
        } : undefined,
      },
      include: {
        timeline: {
          orderBy: { createdAt: "asc" },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    // Send notifications for status changes
    if (validatedData.status && validatedData.status !== existingIncident.status) {
      if (validatedData.status === "RESOLVED") {
        await notifyIncidentResolved(incident.id, session.user.id, incident.title)
      } else {
        await notifyStatusChange(
          incident.id,
          session.user.id,
          incident.title,
          existingIncident.status,
          validatedData.status
        )
      }
    }

    // Send notification for assignment
    if (validatedData.assigneeId && validatedData.assigneeId !== existingIncident.assigneeId) {
      await notifyIncidentAssigned(
        incident.id,
        validatedData.assigneeId,
        incident.title
      )
    }

    return NextResponse.json(incident)
  } catch (error) {
    console.error("Error updating incident:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to update incident" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Reporters cannot delete incidents
    if (session.user.role === "REPORTER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const isAdmin = session.user.role === "ADMIN"

    const incident = await prisma.incident.findFirst({
      where: {
        id,
        // Admins can delete any incident, users can only delete their own
        ...(!isAdmin && { userId: session.user.id }),
      },
    })

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }

    // Only allow deletion of resolved incidents
    if (incident.status !== "RESOLVED") {
      return NextResponse.json(
        { error: "Only resolved incidents can be deleted" },
        { status: 400 }
      )
    }

    await prisma.incident.delete({ where: { id } })

    return NextResponse.json({ message: "Incident deleted" })
  } catch (error) {
    console.error("Error deleting incident:", error)
    return NextResponse.json(
      { error: "Failed to delete incident" },
      { status: 500 }
    )
  }
}
