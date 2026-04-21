import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { z } from "zod"

// Disable caching for this dynamic route
export const dynamic = "force-dynamic"

type Params = Promise<{ id: string }>

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().datetime().optional().nullable(),
  tagIds: z.array(z.string()).optional(),
})

async function getProjectAccess(projectId: string, userId: string) {
  const [project, membership, dbUser] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
    }),
    prisma.projectMembership.findUnique({
      where: { userId_projectId: { userId, projectId } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    }),
  ])

  const isAdmin = dbUser?.role === "ADMIN"
  const isMember = !!membership
  const role = membership?.role || null

  return { project, isAdmin, isMember, role }
}

export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { project, isAdmin, isMember } = await getProjectAccess(id, user.id)

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check visibility access
    if (project.visibility === "PRIVATE" && !isMember && !isAdmin) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const priority = searchParams.get("priority")
    const search = searchParams.get("search")

    // Query tasks that belong to this project
    // Project-level tasks have groupId = null, but we also include tasks
    // in groups that belong to this project for visibility
    const where: Record<string, unknown> = {
      projectId: id,
    }

    if (status) {
      where.status = status
    }

    if (priority) {
      where.priority = priority
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
        user: { select: { id: true, name: true, email: true } },
        subtasks: true,
        tags: true,
        project: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error("Error fetching project tasks:", error)
    return NextResponse.json(
      { error: "Failed to fetch project tasks" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request, { params }: { params: Params }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { project, isAdmin, isMember } = await getProjectAccess(id, user.id)

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check visibility access
    if (project.visibility === "PRIVATE" && !isMember && !isAdmin) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check if project is archived
    if (project.status === "ARCHIVED") {
      return NextResponse.json(
        { error: "Cannot create tasks in an archived project" },
        { status: 403 }
      )
    }

    // Only members can create tasks
    if (!isMember && !isAdmin) {
      return NextResponse.json(
        { error: "You must be a project member to create tasks" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const result = createTaskSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { title, description, priority, dueDate, tagIds } = result.data

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        project: {
          connect: { id },
        },
        user: {
          connect: { id: user.id },
        },
        ...(tagIds?.length && {
          tags: {
            connect: tagIds.map((tagId) => ({ id: tagId })),
          },
        }),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        subtasks: true,
        tags: true,
        project: { select: { id: true, name: true } },
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
