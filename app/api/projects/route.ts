import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { hasUserPermission, UserPermissions } from "@/lib/permissions"
import { z } from "zod"

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().min(1, "Description is required").max(500),
  overview: z.string().max(10000).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PRIVATE"),
})

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") // "ACTIVE" | "ARCHIVED" | null (all)
    const visibility = searchParams.get("visibility") // "PUBLIC" | "PRIVATE" | null (all)
    const search = searchParams.get("search")

    // Get user's project memberships
    const userMemberships = await prisma.projectMembership.findMany({
      where: { userId: user.id },
      select: { projectId: true, role: true },
    })

    const memberProjectIds = userMemberships.map((m) => m.projectId)
    const membershipMap = new Map(userMemberships.map((m) => [m.projectId, m.role]))

    // Build where clause
    const where: Record<string, unknown> = {
      OR: [
        { visibility: "PUBLIC" },
        { id: { in: memberProjectIds } },
      ],
    }

    if (status) {
      where.status = status
    }

    if (visibility) {
      if (visibility === "PRIVATE") {
        // For private filter, only show user's own private projects
        where.AND = [
          { visibility: "PRIVATE" },
          { id: { in: memberProjectIds } },
        ]
        delete where.OR
      } else {
        where.visibility = visibility
      }
    }

    if (search) {
      where.name = { contains: search, mode: "insensitive" }
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        _count: { select: { memberships: true, groups: true, tasks: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(
      projects.map((p) => ({
        ...p,
        memberCount: p._count.memberships,
        groupCount: p._count.groups,
        taskCount: p._count.tasks,
        myRole: membershipMap.get(p.id) || null,
        isMember: memberProjectIds.includes(p.id),
        _count: undefined,
      }))
    )
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json(
      { error: "Failed to fetch projects" },
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

    // Check if user has CREATE_PROJECT permission or is admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, userPermissions: true },
    })

    const isAdmin = dbUser?.role === "ADMIN"
    const hasCreatePermission = hasUserPermission(
      dbUser?.userPermissions || 0,
      UserPermissions.CREATE_PROJECT
    )

    if (!isAdmin && !hasCreatePermission) {
      return NextResponse.json(
        { error: "You don't have permission to create projects" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const result = createProjectSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, description, overview, visibility } = result.data

    const project = await prisma.project.create({
      data: {
        name,
        description,
        overview,
        visibility,
        createdBy: user.id,
        memberships: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      },
      include: {
        _count: { select: { memberships: true, groups: true, tasks: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(
      {
        ...project,
        memberCount: project._count.memberships,
        groupCount: project._count.groups,
        taskCount: project._count.tasks,
        myRole: "OWNER",
        isMember: true,
        _count: undefined,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    )
  }
}
