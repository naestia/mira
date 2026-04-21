import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { z } from "zod"

type Params = Promise<{ id: string; userId: string }>

const updateRoleSchema = z.object({
  role: z.enum(["MEMBER", "MANAGER", "OWNER"]),
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

export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, userId: targetUserId } = await params
    const { project, isAdmin, isMember, role } = await getProjectAccess(id, user.id)

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check visibility access
    if (project.visibility === "PRIVATE" && !isMember && !isAdmin) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check if project is archived
    if (project.status === "ARCHIVED" && !isAdmin) {
      return NextResponse.json(
        { error: "Cannot modify members in an archived project" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const result = updateRoleSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { role: newRole } = result.data

    // Get target membership
    const targetMembership = await prisma.projectMembership.findUnique({
      where: { userId_projectId: { userId: targetUserId, projectId: id } },
    })

    if (!targetMembership) {
      return NextResponse.json(
        { error: "User is not a member of this project" },
        { status: 404 }
      )
    }

    // Only OWNER or admin can change roles
    if (!isAdmin && role !== "OWNER") {
      return NextResponse.json(
        { error: "Only the project owner can change member roles" },
        { status: 403 }
      )
    }

    // Handle ownership transfer
    if (newRole === "OWNER") {
      // Find current owner and demote to MANAGER
      const currentOwner = await prisma.projectMembership.findFirst({
        where: { projectId: id, role: "OWNER" },
      })

      if (currentOwner && currentOwner.userId !== targetUserId) {
        await prisma.projectMembership.update({
          where: { id: currentOwner.id },
          data: { role: "MANAGER" },
        })
      }
    }

    // Prevent demoting yourself if you're the only owner
    if (user.id === targetUserId && role === "OWNER" && newRole !== "OWNER") {
      const ownerCount = await prisma.projectMembership.count({
        where: { projectId: id, role: "OWNER" },
      })

      if (ownerCount === 1) {
        return NextResponse.json(
          { error: "Cannot demote yourself. Transfer ownership first." },
          { status: 400 }
        )
      }
    }

    const updatedMembership = await prisma.projectMembership.update({
      where: { userId_projectId: { userId: targetUserId, projectId: id } },
      data: { role: newRole },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(updatedMembership)
  } catch (error) {
    console.error("Error updating member role:", error)
    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, userId: targetUserId } = await params
    const { project, isAdmin, isMember, role } = await getProjectAccess(id, user.id)

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check visibility access
    if (project.visibility === "PRIVATE" && !isMember && !isAdmin) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check if project is archived
    if (project.status === "ARCHIVED" && !isAdmin) {
      return NextResponse.json(
        { error: "Cannot remove members from an archived project" },
        { status: 403 }
      )
    }

    // Get target membership
    const targetMembership = await prisma.projectMembership.findUnique({
      where: { userId_projectId: { userId: targetUserId, projectId: id } },
    })

    if (!targetMembership) {
      return NextResponse.json(
        { error: "User is not a member of this project" },
        { status: 404 }
      )
    }

    // Self-removal (leaving)
    if (user.id === targetUserId) {
      // Cannot leave if you're the sole owner
      if (targetMembership.role === "OWNER") {
        const ownerCount = await prisma.projectMembership.count({
          where: { projectId: id, role: "OWNER" },
        })

        if (ownerCount === 1) {
          return NextResponse.json(
            { error: "Cannot leave project as the sole owner. Transfer ownership first." },
            { status: 400 }
          )
        }
      }
    } else {
      // Removing someone else
      const canManage = isAdmin || role === "OWNER" || role === "MANAGER"
      if (!canManage) {
        return NextResponse.json(
          { error: "You don't have permission to remove members" },
          { status: 403 }
        )
      }

      // Managers cannot remove owners
      if (role === "MANAGER" && targetMembership.role === "OWNER") {
        return NextResponse.json(
          { error: "Managers cannot remove the project owner" },
          { status: 403 }
        )
      }
    }

    await prisma.projectMembership.delete({
      where: { userId_projectId: { userId: targetUserId, projectId: id } },
    })

    return NextResponse.json({ message: "Member removed" })
  } catch (error) {
    console.error("Error removing member:", error)
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    )
  }
}
