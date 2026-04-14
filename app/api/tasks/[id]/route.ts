import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { taskUpdateSchema } from "@/lib/validations"
import { hasPermission, Permissions } from "@/lib/permissions"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        subtasks: {
          orderBy: { createdAt: "asc" },
        },
        tags: true,
        group: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Check VIEW permission
    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: user.id, groupId: task.groupId } },
    })

    if (!membership || !hasPermission(membership.permissions, Permissions.VIEW)) {
      return NextResponse.json({ error: "No permission to view this task" }, { status: 403 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error("Error fetching task:", error)
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    )
  }
}

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
    const result = taskUpdateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const existingTask = await prisma.task.findUnique({
      where: { id },
    })

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Check EDIT permission
    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: user.id, groupId: existingTask.groupId } },
    })

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 })
    }

    const isOwner = existingTask.userId === user.id
    const canEditAny = hasPermission(membership.permissions, Permissions.EDIT_ANY)
    const canEditOwn = isOwner && hasPermission(membership.permissions, Permissions.EDIT_OWN)

    if (!canEditAny && !canEditOwn) {
      return NextResponse.json({ error: "No permission to edit this task" }, { status: 403 })
    }

    const { title, description, status, priority, dueDate, tagIds, subtasks } =
      result.data

    const task = await prisma.task.update({
      where: { id },
      data: {
        title,
        description,
        status,
        priority,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
        tags: tagIds
          ? {
              set: tagIds.map((tagId) => ({ id: tagId })),
            }
          : undefined,
        subtasks: subtasks
          ? {
              deleteMany: {},
              create: subtasks.map((s) => ({ title: s.title })),
            }
          : undefined,
      },
      include: {
        subtasks: true,
        tags: true,
        group: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json(
      { error: "Failed to update task" },
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

    const existingTask = await prisma.task.findUnique({
      where: { id },
    })

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Check DELETE permission
    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: user.id, groupId: existingTask.groupId } },
    })

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 })
    }

    const isOwner = existingTask.userId === user.id
    const canDeleteAny = hasPermission(membership.permissions, Permissions.DELETE_ANY)
    const canDeleteOwn = isOwner && hasPermission(membership.permissions, Permissions.DELETE_OWN)

    if (!canDeleteAny && !canDeleteOwn) {
      return NextResponse.json({ error: "No permission to delete this task" }, { status: 403 })
    }

    await prisma.task.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Task deleted" })
  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    )
  }
}
