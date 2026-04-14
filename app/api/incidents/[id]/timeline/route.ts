import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { timelineNoteSchema } from "@/lib/validations"

type Params = Promise<{ id: string }>

export async function POST(request: Request, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = timelineNoteSchema.parse(body)
    const isAdmin = session.user.role === "ADMIN"

    // Verify incident exists and user has access
    const incident = await prisma.incident.findFirst({
      where: {
        id,
        // Admins can add notes to any incident, users can only add to their own
        ...(!isAdmin && { userId: session.user.id }),
      },
    })

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 })
    }

    const timelineEvent = await prisma.timelineEvent.create({
      data: {
        incidentId: id,
        type: "NOTE_ADDED",
        message: validatedData.message,
      },
    })

    return NextResponse.json(timelineEvent, { status: 201 })
  } catch (error) {
    console.error("Error adding note:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to add note" },
      { status: 500 }
    )
  }
}
