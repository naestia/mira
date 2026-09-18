import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { boardMoveSchema } from "@/lib/validations"

export const dynamic = "force-dynamic"

type Params = Promise<{ id: string }>

export async function POST(request: Request, { params }: { params: Params }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: projectId } = await params

    const [project, membership, dbUser] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId }, select: { status: true } }),
      prisma.projectMembership.findUnique({
        where: { userId_projectId: { userId: user.id, projectId } },
      }),
      prisma.user.findUnique({ where: { id: user.id }, select: { role: true } }),
    ])

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }
    const isAdmin = dbUser?.role === "ADMIN"
    if (!membership && !isAdmin) {
      return NextResponse.json({ error: "No permission to modify this board" }, { status: 403 })
    }
    if (project.status === "ARCHIVED") {
      return NextResponse.json({ error: "Cannot modify an archived project" }, { status: 403 })
    }

    const body = await request.json()
    const result = boardMoveSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }
    const { taskId, toLabelId, orderedTaskIds } = result.data

    // The moved task must belong to this project.
    const task = await prisma.task.findFirst({
      where: { id: taskId, projectId },
      select: { id: true },
    })
    if (!task) {
      return NextResponse.json({ error: "Task not found in this project" }, { status: 404 })
    }

    // The destination column (if any) must belong to this project.
    if (toLabelId) {
      const label = await prisma.label.findFirst({
        where: { id: toLabelId, projectId },
        select: { id: true },
      })
      if (!label) {
        return NextResponse.json({ error: "Label not found in this project" }, { status: 404 })
      }
    }

    // Only reorder tasks that actually live in this project (guards against
    // a client sending foreign ids). Positions come from the target ordering.
    const validIds = new Set(
      (
        await prisma.task.findMany({
          where: { id: { in: orderedTaskIds }, projectId },
          select: { id: true },
        })
      ).map((t) => t.id)
    )

    await prisma.$transaction(
      orderedTaskIds
        .filter((tid) => validIds.has(tid))
        .map((tid, index) =>
          prisma.task.update({
            where: { id: tid },
            data: { labelId: toLabelId, position: index },
          })
        )
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error moving task on board:", error)
    return NextResponse.json({ error: "Failed to move task" }, { status: 500 })
  }
}
