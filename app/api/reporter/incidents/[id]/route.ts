import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "REPORTER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        timeline: {
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }

    // Verify ownership - reporters can only view their own incidents
    if (incident.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(incident)
  } catch (error) {
    console.error("Error fetching reporter incident:", error)
    return NextResponse.json(
      { error: "Failed to fetch incident" },
      { status: 500 }
    )
  }
}
