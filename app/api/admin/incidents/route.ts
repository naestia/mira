import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const severity = searchParams.get("severity")
    const search = searchParams.get("search")
    const userId = searchParams.get("userId")

    const where: Record<string, unknown> = {}

    if (status && status !== "all") {
      where.status = status
    }

    if (severity && severity !== "all") {
      where.severity = severity
    }

    if (userId) {
      where.userId = userId
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const incidents = await prisma.incident.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            timeline: true,
            notifications: true,
          },
        },
      },
      orderBy: [
        { status: "asc" },
        { severity: "desc" },
        { createdAt: "desc" },
      ],
    })

    return NextResponse.json(
      incidents.map((i) => ({
        ...i,
        timelineCount: i._count.timeline,
        notificationCount: i._count.notifications,
        _count: undefined,
      }))
    )
  } catch (error) {
    console.error("Error fetching admin incidents:", error)
    return NextResponse.json(
      { error: "Failed to fetch incidents" },
      { status: 500 }
    )
  }
}
