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

    // Reporters cannot access tasks
    if (user.role === "REPORTER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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
    const projectId = searchParams.get("projectId")

    // Get all groups the user is a member of with VIEW permission
    const memberships = await prisma.groupMembership.findMany({
      where: { userId: user.id },
      select: { groupId: true, permissions: true },
    })

    const viewableGroupIds = memberships
      .filter((m) => hasPermission(m.permissions, Permissions.VIEW))
      .map((m) => m.groupId)

    // Get all projects the user is a member of
    const projectMemberships = await prisma.projectMembership.findMany({
      where: { userId: user.id },
      select: { projectId: true },
    })
    const memberProjectIds = projectMemberships.map((m) => m.projectId)

    // Also get public projects for viewing
    const publicProjects = await prisma.project.findMany({
      where: { visibility: "PUBLIC" },
      select: { id: true },
    })
    const viewableProjectIds = [...new Set([
      ...memberProjectIds,
      ...publicProjects.map((p) => p.id),
    ])]

    // Build where clause
    const where: Record<string, unknown> = {}

    // Filter by project if specified
    if (projectId) {
      if (!viewableProjectIds.includes(projectId)) {
        return NextResponse.json([])
      }
      where.projectId = projectId
      where.groupId = null // Only project-level tasks
    } else if (groupId) {
      // Filter by specific group
      if (!viewableGroupIds.includes(groupId)) {
        return NextResponse.json([])
      }
      where.groupId = groupId
    } else {
      // Default: all tasks from viewable groups only
      // Project-level tasks (groupId: null, projectId: not null) are excluded
      // and should only appear in the project's Tasks tab
      where.groupId = { in: viewableGroupIds }
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
      const searchCondition = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
      // Merge search with existing OR if present
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchCondition }]
        delete where.OR
      } else {
        where.OR = searchCondition
      }
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
        project: {
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

    // Reporters cannot access tasks
    if (user.role === "REPORTER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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
