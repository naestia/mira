import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { hasPermission, Permissions } from "@/lib/permissions"
import { z } from "zod"

type Params = Promise<{ id: string }>

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
})

export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: user.id, groupId: id } },
    })

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 })
    }

    if (!hasPermission(membership.permissions, Permissions.VIEW)) {
      return NextResponse.json({ error: "No view permission" }, { status: 403 })
    }

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        _count: { select: { memberships: true, tasks: true } },
        creator: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    })

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    return NextResponse.json({
      ...group,
      memberCount: group._count.memberships,
      taskCount: group._count.tasks,
      myPermissions: membership.permissions,
      isMember: true,
      projectId: group.projectId,
      project: group.project,
    })
  } catch (error) {
    console.error("Error fetching group:", error)
    return NextResponse.json(
      { error: "Failed to fetch group" },
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

    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: user.id, groupId: id } },
    })

    if (!membership || !hasPermission(membership.permissions, Permissions.MANAGE_MEMBERS)) {
      return NextResponse.json({ error: "No permission to manage this group" }, { status: 403 })
    }

    const body = await request.json()
    const result = updateGroupSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const group = await prisma.group.update({
      where: { id },
      data: result.data,
      include: {
        _count: { select: { memberships: true, tasks: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({
      ...group,
      memberCount: group._count.memberships,
      taskCount: group._count.tasks,
      myPermissions: membership.permissions,
    })
  } catch (error) {
    console.error("Error updating group:", error)
    return NextResponse.json(
      { error: "Failed to update group" },
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

    const { id } = await params

    const group = await prisma.group.findUnique({
      where: { id },
    })

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    // Check if group is owned by a project
    if (group.projectId) {
      return NextResponse.json(
        { error: "This group is owned by a project and cannot be deleted" },
        { status: 403 }
      )
    }

    // Check if user is the creator or an admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: user.id, groupId: id } },
    })

    const isCreator = group.createdBy === user.id
    const isAdmin = dbUser?.role === "ADMIN"
    const hasManagePermission = membership && hasPermission(membership.permissions, Permissions.MANAGE_MEMBERS)

    if (!isCreator && !isAdmin && !hasManagePermission) {
      return NextResponse.json({ error: "No permission to delete this group" }, { status: 403 })
    }

    await prisma.group.delete({ where: { id } })

    return NextResponse.json({ message: "Group deleted" })
  } catch (error) {
    console.error("Error deleting group:", error)
    return NextResponse.json(
      { error: "Failed to delete group" },
      { status: 500 }
    )
  }
}
