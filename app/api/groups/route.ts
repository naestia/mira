import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { FULL_PERMISSIONS } from "@/lib/permissions"
import { z } from "zod"

const createGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
})

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get("filter") // "my" | "discover" | null (all)

    if (filter === "my") {
      // Get groups the user is a member of (excluding personal groups)
      const memberships = await prisma.groupMembership.findMany({
        where: { userId: user.id },
        include: {
          group: {
            include: {
              _count: { select: { memberships: true, tasks: true } },
              creator: { select: { id: true, name: true, email: true } },
            },
          },
        },
      })

      return NextResponse.json(
        memberships
          .filter((m) => !m.group.isPersonal)
          .map((m) => ({
            ...m.group,
            memberCount: m.group._count.memberships,
            taskCount: m.group._count.tasks,
            myPermissions: m.permissions,
            isMember: true,
          }))
      )
    }

    if (filter === "discover") {
      // Get groups the user is NOT a member of (excluding personal groups)
      const groups = await prisma.group.findMany({
        where: {
          memberships: { none: { userId: user.id } },
          isPersonal: false,
        },
        include: {
          _count: { select: { memberships: true, tasks: true } },
          creator: { select: { id: true, name: true, email: true } },
          joinRequests: {
            where: { userId: user.id, status: "PENDING" },
            select: { id: true, status: true },
          },
        },
      })

      return NextResponse.json(
        groups.map((g) => ({
          ...g,
          memberCount: g._count.memberships,
          taskCount: g._count.tasks,
          isMember: false,
          hasPendingRequest: g.joinRequests.length > 0,
          joinRequests: undefined,
          _count: undefined,
        }))
      )
    }

    // Default: return both (excluding personal groups)
    const [memberships, discoverGroups] = await Promise.all([
      prisma.groupMembership.findMany({
        where: { userId: user.id },
        include: {
          group: {
            include: {
              _count: { select: { memberships: true, tasks: true } },
              creator: { select: { id: true, name: true, email: true } },
            },
          },
        },
      }),
      prisma.group.findMany({
        where: {
          memberships: { none: { userId: user.id } },
          isPersonal: false,
        },
        include: {
          _count: { select: { memberships: true, tasks: true } },
          creator: { select: { id: true, name: true, email: true } },
          joinRequests: {
            where: { userId: user.id, status: "PENDING" },
            select: { id: true },
          },
        },
      }),
    ])

    return NextResponse.json({
      myGroups: memberships
        .filter((m) => !m.group.isPersonal)
        .map((m) => ({
          ...m.group,
          memberCount: m.group._count.memberships,
          taskCount: m.group._count.tasks,
          myPermissions: m.permissions,
          isMember: true,
        })),
      discover: discoverGroups.map((g) => ({
        ...g,
        memberCount: g._count.memberships,
        taskCount: g._count.tasks,
        isMember: false,
        hasPendingRequest: g.joinRequests.length > 0,
        joinRequests: undefined,
        _count: undefined,
      })),
    })
  } catch (error) {
    console.error("Error fetching groups:", error)
    return NextResponse.json(
      { error: "Failed to fetch groups" },
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
        isMember: true,
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
