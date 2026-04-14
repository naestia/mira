import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { hasPermission, Permissions, DEFAULT_MEMBER_PERMISSIONS } from "@/lib/permissions"
import { z } from "zod"

type Params = Promise<{ id: string }>

const updateMemberSchema = z.object({
  userId: z.string(),
  permissions: z.number().min(0).max(127),
})

const addMemberSchema = z.object({
  userId: z.string(),
  permissions: z.number().min(0).max(127).optional(),
})

const removeMemberSchema = z.object({
  userId: z.string(),
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

    if (!membership || !hasPermission(membership.permissions, Permissions.VIEW)) {
      return NextResponse.json({ error: "No view permission" }, { status: 403 })
    }

    const members = await prisma.groupMembership.findMany({
      where: { groupId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    })

    const canManage = hasPermission(membership.permissions, Permissions.MANAGE_MEMBERS)

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        permissions: m.permissions,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
      canManage,
      myPermissions: membership.permissions,
    })
  } catch (error) {
    console.error("Error fetching members:", error)
    return NextResponse.json(
      { error: "Failed to fetch members" },
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

    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: user.id, groupId: id } },
    })

    if (!membership || !hasPermission(membership.permissions, Permissions.MANAGE_MEMBERS)) {
      return NextResponse.json({ error: "No permission to manage members" }, { status: 403 })
    }

    const body = await request.json()
    const result = addMemberSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { userId: targetUserId, permissions } = result.data

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if already a member
    const existingMembership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: targetUserId, groupId: id } },
    })

    if (existingMembership) {
      return NextResponse.json({ error: "User is already a member" }, { status: 400 })
    }

    const newMembership = await prisma.groupMembership.create({
      data: {
        userId: targetUserId,
        groupId: id,
        permissions: permissions ?? DEFAULT_MEMBER_PERMISSIONS,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, createdAt: true },
        },
      },
    })

    // Delete any pending join request
    await prisma.joinRequest.deleteMany({
      where: { userId: targetUserId, groupId: id },
    })

    return NextResponse.json(
      {
        id: newMembership.id,
        userId: newMembership.userId,
        permissions: newMembership.permissions,
        joinedAt: newMembership.joinedAt,
        user: newMembership.user,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error adding member:", error)
    return NextResponse.json(
      { error: "Failed to add member" },
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
      return NextResponse.json({ error: "No permission to manage members" }, { status: 403 })
    }

    const body = await request.json()
    const result = updateMemberSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { userId: targetUserId, permissions } = result.data

    // Check if trying to modify own MANAGE_MEMBERS permission
    if (targetUserId === user.id) {
      const removingManagePermission =
        hasPermission(membership.permissions, Permissions.MANAGE_MEMBERS) &&
        !hasPermission(permissions, Permissions.MANAGE_MEMBERS)

      if (removingManagePermission) {
        // Check if there's another manager
        const otherManagers = await prisma.groupMembership.count({
          where: {
            groupId: id,
            userId: { not: user.id },
            // Check if they have MANAGE_MEMBERS bit set (64)
          },
        })

        // More precise check for managers
        const allMembers = await prisma.groupMembership.findMany({
          where: { groupId: id, userId: { not: user.id } },
          select: { permissions: true },
        })

        const hasOtherManager = allMembers.some((m) =>
          hasPermission(m.permissions, Permissions.MANAGE_MEMBERS)
        )

        if (!hasOtherManager) {
          return NextResponse.json(
            { error: "Cannot remove your manage permission - you are the only manager" },
            { status: 400 }
          )
        }
      }
    }

    const targetMembership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: targetUserId, groupId: id } },
    })

    if (!targetMembership) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    const updated = await prisma.groupMembership.update({
      where: { id: targetMembership.id },
      data: { permissions },
      include: {
        user: {
          select: { id: true, name: true, email: true, createdAt: true },
        },
      },
    })

    return NextResponse.json({
      id: updated.id,
      userId: updated.userId,
      permissions: updated.permissions,
      joinedAt: updated.joinedAt,
      user: updated.user,
    })
  } catch (error) {
    console.error("Error updating member:", error)
    return NextResponse.json(
      { error: "Failed to update member" },
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

    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: user.id, groupId: id } },
    })

    const body = await request.json()
    const result = removeMemberSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { userId: targetUserId } = result.data

    // Users can remove themselves, managers can remove anyone
    const isSelf = targetUserId === user.id
    const canManage = membership && hasPermission(membership.permissions, Permissions.MANAGE_MEMBERS)

    if (!isSelf && !canManage) {
      return NextResponse.json({ error: "No permission to remove this member" }, { status: 403 })
    }

    // Check if trying to remove the last manager
    if (canManage) {
      const targetMembership = await prisma.groupMembership.findUnique({
        where: { userId_groupId: { userId: targetUserId, groupId: id } },
      })

      if (targetMembership && hasPermission(targetMembership.permissions, Permissions.MANAGE_MEMBERS)) {
        const allMembers = await prisma.groupMembership.findMany({
          where: { groupId: id, userId: { not: targetUserId } },
          select: { permissions: true },
        })

        const hasOtherManager = allMembers.some((m) =>
          hasPermission(m.permissions, Permissions.MANAGE_MEMBERS)
        )

        if (!hasOtherManager) {
          return NextResponse.json(
            { error: "Cannot remove the last manager from the group" },
            { status: 400 }
          )
        }
      }
    }

    await prisma.groupMembership.delete({
      where: { userId_groupId: { userId: targetUserId, groupId: id } },
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
