import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { z } from "zod"

type Params = Promise<{ id: string }>

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  overview: z.string().max(10000).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
})

async function getProjectAccess(projectId: string, userId: string) {
  const [project, membership, dbUser] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: { select: { memberships: true, groups: true, tasks: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
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

  return { project, membership, isAdmin, isMember, role }
}

export async function GET(request: Request, { params }: { params: Params }) {
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
      // Return 404 for private projects to not reveal existence
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json({
      ...project,
      memberCount: project._count.memberships,
      groupCount: project._count.groups,
      taskCount: project._count.tasks,
      myRole: role,
      isMember,
      _count: undefined,
    })
  } catch (error) {
    console.error("Error fetching project:", error)
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request, { params }: { params: Params }) {
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

    const body = await request.json()
    const result = updateProjectSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { status: newStatus, ...updates } = result.data

    // Check permission for status changes (archive/restore)
    if (newStatus !== undefined) {
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Only admins can archive or restore projects" },
          { status: 403 }
        )
      }
    }

    // Check permission for other updates
    if (Object.keys(updates).length > 0) {
      const canEdit = isAdmin || role === "OWNER" || role === "MANAGER"
      if (!canEdit) {
        return NextResponse.json(
          { error: "You don't have permission to edit this project" },
          { status: 403 }
        )
      }

      // Check if project is archived
      if (project.status === "ARCHIVED" && !isAdmin) {
        return NextResponse.json(
          { error: "Cannot edit an archived project" },
          { status: 403 }
        )
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        ...updates,
        ...(newStatus !== undefined && {
          status: newStatus,
          archivedAt: newStatus === "ARCHIVED" ? new Date() : null,
        }),
      },
      include: {
        _count: { select: { memberships: true, groups: true, tasks: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({
      ...updatedProject,
      memberCount: updatedProject._count.memberships,
      groupCount: updatedProject._count.groups,
      taskCount: updatedProject._count.tasks,
      myRole: role,
      isMember,
      _count: undefined,
    })
  } catch (error) {
    console.error("Error updating project:", error)
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    )
  }
}
