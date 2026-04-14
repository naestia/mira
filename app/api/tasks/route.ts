import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { taskSchema } from "@/lib/validations"
import { hasPermission, Permissions } from "@/lib/permissions"
import { getOrCreatePersonalGroup } from "@/lib/personal-group"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Ensure personal group exists for the user
    await getOrCreatePersonalGroup(user.id)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const priority = searchParams.get("priority")
    const tagId = searchParams.get("tagId")
    const search = searchParams.get("search")
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"
    const groupId = searchParams.get("groupId")

    // Get all groups the user is a member of with VIEW permission
    const memberships = await prisma.groupMembership.findMany({
      where: { userId: user.id },
      select: { groupId: true, permissions: true },
    })

    const viewableGroupIds = memberships
      .filter((m) => hasPermission(m.permissions, Permissions.VIEW))
      .map((m) => m.groupId)

    if (viewableGroupIds.length === 0) {
      return NextResponse.json([])
    }

    const where: Record<string, unknown> = {
      groupId: groupId && viewableGroupIds.includes(groupId)
        ? groupId
        : { in: viewableGroupIds },
    }

    if (status) {
      where.status = status
    }

    if (priority) {
      where.priority = priority
    }

    if (tagId) {
      where.tags = {
        some: { id: tagId },
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const tasks = await prisma.task.findMany({
      where,
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
      orderBy: {
        [sortBy]: sortOrder,
      },
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const result = taskSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { title, description, status, priority, dueDate, tagIds, subtasks, groupId: providedGroupId } =
      result.data

    // Use personal group if no groupId provided
    let groupId = providedGroupId
    if (!groupId) {
      const personalGroup = await getOrCreatePersonalGroup(user.id)
      groupId = personalGroup.id
    }

    // Check membership and CREATE permission
    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: user.id, groupId } },
    })

    if (!membership || !hasPermission(membership.permissions, Permissions.CREATE)) {
      return NextResponse.json(
        { error: "No permission to create tasks in this group" },
        { status: 403 }
      )
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        userId: user.id,
        groupId,
        tags: tagIds?.length
          ? {
              connect: tagIds.map((id) => ({ id })),
            }
          : undefined,
        subtasks: subtasks?.length
          ? {
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

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error("Error creating task:", error)
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    )
  }
}
