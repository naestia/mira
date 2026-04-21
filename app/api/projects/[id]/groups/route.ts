import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { FULL_PERMISSIONS } from "@/lib/permissions"
import { z } from "zod"

type Params = Promise<{ id: string }>

const createGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
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

    const groups = await prisma.group.findMany({
      where: { projectId: id },
      include: {
        _count: { select: { memberships: true, tasks: true } },
        creator: { select: { id: true, name: true, email: true } },
        memberships: {
          where: { userId: user.id },
          select: { permissions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(
      groups.map((g) => ({
        ...g,
        memberCount: g._count.memberships,
        taskCount: g._count.tasks,
        myPermissions: g.memberships[0]?.permissions || null,
        isGroupMember: g.memberships.length > 0,
        memberships: undefined,
        _count: undefined,
      }))
    )
  } catch (error) {
    console.error("Error fetching project groups:", error)
    return NextResponse.json(
      { error: "Failed to fetch project groups" },
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
    const { project, isAdmin, isMember, role } = await getProjectAccess(id, user.id)

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
        { error: "Cannot create groups in an archived project" },
        { status: 403 }
      )
    }

    // Check permission
    const canCreate = isAdmin || role === "OWNER" || role === "MANAGER"
    if (!canCreate) {
      return NextResponse.json(
        { error: "You don't have permission to create groups in this project" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const result = createGroupSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, description } = result.data

    const group = await prisma.group.create({
      data: {
        name,
        description,
        projectId: id,
        createdBy: user.id,
        memberships: {
          create: {
            userId: user.id,
            permissions: FULL_PERMISSIONS,
          },
        },
      },
      include: {
        _count: { select: { memberships: true, tasks: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(
      {
        ...group,
        memberCount: group._count.memberships,
        taskCount: group._count.tasks,
        myPermissions: FULL_PERMISSIONS,
        isGroupMember: true,
        _count: undefined,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating group:", error)
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 }
    )
  }
}
