import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"

type Params = Promise<{ id: string }>

export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        _count: { select: { memberships: true, tasks: true } },
        creator: { select: { id: true, name: true, email: true } },
        memberships: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    })

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: group.id,
      name: group.name,
      description: group.description,
      createdAt: group.createdAt,
      creator: group.creator,
      memberCount: group._count.memberships,
      taskCount: group._count.tasks,
      members: group.memberships.map((m) => ({
        id: m.id,
        userId: m.userId,
        permissions: m.permissions,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
      tasks: group.tasks,
    })
  } catch (error) {
    console.error("Error fetching group:", error)
    return NextResponse.json(
      { error: "Failed to fetch group" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    const group = await prisma.group.findUnique({
      where: { id },
    })

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
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
