import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { incidentCreateSchema } from "@/lib/validations"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "REPORTER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const incidents = await prisma.incident.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: { select: { timeline: true } },
      },
    })

    return NextResponse.json(incidents)
  } catch (error) {
    console.error("Error fetching reporter incidents:", error)
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

    if (session.user.role !== "REPORTER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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
            message: `Incident reported with severity ${validatedData.severity || "MEDIUM"}`,
          },
        },
      },
      include: {
        timeline: true,
      },
    })

    // Notify all admins about the new incident
    const admins = await prisma.user.findMany({
      where: {
        role: "ADMIN",
        active: true,
        deletedAt: null,
      },
      select: { id: true },
    })

    const reporterName = session.user.name || session.user.email

    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        incidentId: incident.id,
        userId: admin.id,
        message: `New incident reported by ${reporterName}: ${incident.title}`,
      })),
    })

    return NextResponse.json(incident, { status: 201 })
  } catch (error) {
    console.error("Error creating reporter incident:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to create incident" },
      { status: 500 }
    )
  }
}
