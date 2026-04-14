import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { z } from "zod"

const createSubtaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: taskId } = await params
    const body = await request.json()
    const result = createSubtaskSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: user.id,
      },
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const subtask = await prisma.subtask.create({
      data: {
        title: result.data.title,
        taskId,
      },
    })

    return NextResponse.json(subtask, { status: 201 })
  } catch (error) {
    console.error("Error creating subtask:", error)
    return NextResponse.json(
      { error: "Failed to create subtask" },
      { status: 500 }
    )
  }
}
