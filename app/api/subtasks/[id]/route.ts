import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { subtaskUpdateSchema } from "@/lib/validations"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const result = subtaskUpdateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const existingSubtask = await prisma.subtask.findFirst({
      where: {
        id,
        task: {
          userId: user.id,
        },
      },
    })

    if (!existingSubtask) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 })
    }

    const subtask = await prisma.subtask.update({
      where: { id },
      data: result.data,
    })

    return NextResponse.json(subtask)
  } catch (error) {
    console.error("Error updating subtask:", error)
    return NextResponse.json(
      { error: "Failed to update subtask" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const existingSubtask = await prisma.subtask.findFirst({
      where: {
        id,
        task: {
          userId: user.id,
        },
      },
    })

    if (!existingSubtask) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 })
    }

    await prisma.subtask.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Subtask deleted" })
  } catch (error) {
    console.error("Error deleting subtask:", error)
    return NextResponse.json(
      { error: "Failed to delete subtask" },
      { status: 500 }
    )
  }
}
