import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { incidentCreateSchema } from "@/lib/validations"
import { notifyIncidentCreated } from "@/lib/notifications"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const severity = searchParams.get("severity")
    const search = searchParams.get("search")
    const tab = searchParams.get("tab") // "active" or "resolved"
    const isAdmin = session.user.role === "ADMIN"

    const where: Record<string, unknown> = {}

    // Admins see all incidents, users see only their own
    if (!isAdmin) {
      where.userId = session.user.id
    }

    // Filter by tab
    if (tab === "active") {
      where.status = { in: ["OPEN", "INVESTIGATING"] }
    } else if (tab === "resolved") {
      where.status = "RESOLVED"
    } else if (status) {
      where.status = status
    }

    if (severity) {
      where.severity = severity
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const incidents = await prisma.incident.findMany({
      where,
      orderBy: [
        { status: "asc" }, // OPEN first, then INVESTIGATING, then RESOLVED
        { severity: "desc" }, // CRITICAL first
        { createdAt: "desc" },
      ],
      include: {
        _count: { select: { timeline: true } },
        // Include user info for admins to see who created each incident
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json(incidents)
  } catch (error) {
    console.error("Error fetching incidents:", error)
    return NextResponse.json(
      { error: "Failed to fetch incidents" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = incidentCreateSchema.parse(body)

    const incident = await prisma.incident.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        severity: validatedData.severity || "MEDIUM",
        userId: session.user.id,
        timeline: {
          create: {
            type: "CREATED",
            message: `Incident created with severity ${validatedData.severity || "MEDIUM"}`,
          },
        },
      },
      include: {
        timeline: true,
      },
    })

    // Create notification for HIGH/CRITICAL incidents
    await notifyIncidentCreated(
      incident.id,
      session.user.id,
      incident.title,
      incident.severity
    )

    return NextResponse.json(incident, { status: 201 })
  } catch (error) {
    console.error("Error creating incident:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to create incident" },
      { status: 500 }
    )
  }
}
