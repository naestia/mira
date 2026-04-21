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

    // Check VIEW permission - handle both group tasks and project tasks
    if (task.groupId) {
      const membership = await prisma.groupMembership.findUnique({
        where: { userId_groupId: { userId: user.id, groupId: task.groupId } },
      })

      if (!membership || !hasPermission(membership.permissions, Permissions.VIEW)) {
        return NextResponse.json({ error: "No permission to view this task" }, { status: 403 })
      }
    } else if (task.projectId) {
      // Project-level task - check project membership or visibility
      const project = await prisma.project.findUnique({
        where: { id: task.projectId },
        select: { visibility: true },
      })
      const projectMembership = await prisma.projectMembership.findUnique({
        where: { userId_projectId: { userId: user.id, projectId: task.projectId } },
      })
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true },
      })
      const isAdmin = dbUser?.role === "ADMIN"

      if (!projectMembership && project?.visibility !== "PUBLIC" && !isAdmin) {
        return NextResponse.json({ error: "No permission to view this task" }, { status: 403 })
      }
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

    // Check EDIT permission - handle both group tasks and project tasks
    const isOwner = existingTask.userId === user.id

    if (existingTask.groupId) {
      const membership = await prisma.groupMembership.findUnique({
        where: { userId_groupId: { userId: user.id, groupId: existingTask.groupId } },
      })

      if (!membership) {
        return NextResponse.json({ error: "Not a member of this group" }, { status: 403 })
      }

      const canEditAny = hasPermission(membership.permissions, Permissions.EDIT_ANY)
      const canEditOwn = isOwner && hasPermission(membership.permissions, Permissions.EDIT_OWN)

      if (!canEditAny && !canEditOwn) {
        return NextResponse.json({ error: "No permission to edit this task" }, { status: 403 })
      }
    } else if (existingTask.projectId) {
      // Project-level task - check project membership
      const project = await prisma.project.findUnique({
        where: { id: existingTask.projectId },
        select: { status: true },
      })
      const projectMembership = await prisma.projectMembership.findUnique({
        where: { userId_projectId: { userId: user.id, projectId: existingTask.projectId } },
      })
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true },
      })
      const isAdmin = dbUser?.role === "ADMIN"

      if (!projectMembership && !isAdmin) {
        return NextResponse.json({ error: "No permission to edit this task" }, { status: 403 })
      }

      if (project?.status === "ARCHIVED") {
        return NextResponse.json({ error: "Cannot modify tasks in an archived project" }, { status: 403 })
      }
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

    // Check DELETE permission - handle both group tasks and project tasks
    const isOwner = existingTask.userId === user.id

    if (existingTask.groupId) {
      const membership = await prisma.groupMembership.findUnique({
        where: { userId_groupId: { userId: user.id, groupId: existingTask.groupId } },
      })

      if (!membership) {
        return NextResponse.json({ error: "Not a member of this group" }, { status: 403 })
      }

      const canDeleteAny = hasPermission(membership.permissions, Permissions.DELETE_ANY)
      const canDeleteOwn = isOwner && hasPermission(membership.permissions, Permissions.DELETE_OWN)

      if (!canDeleteAny && !canDeleteOwn) {
        return NextResponse.json({ error: "No permission to delete this task" }, { status: 403 })
      }
    } else if (existingTask.projectId) {
      // Project-level task - check project membership
      const project = await prisma.project.findUnique({
        where: { id: existingTask.projectId },
        select: { status: true },
      })
      const projectMembership = await prisma.projectMembership.findUnique({
        where: { userId_projectId: { userId: user.id, projectId: existingTask.projectId } },
      })
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true },
      })
      const isAdmin = dbUser?.role === "ADMIN"

      if (!projectMembership && !isAdmin) {
        return NextResponse.json({ error: "No permission to delete this task" }, { status: 403 })
      }

      if (project?.status === "ARCHIVED") {
        return NextResponse.json({ error: "Cannot delete tasks in an archived project" }, { status: 403 })
      }
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
