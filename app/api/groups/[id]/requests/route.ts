import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { hasPermission, Permissions, DEFAULT_MEMBER_PERMISSIONS } from "@/lib/permissions"
import { z } from "zod"

type Params = Promise<{ id: string }>

const updateRequestSchema = z.object({
  requestId: z.string(),
  action: z.enum(["approve", "reject"]),
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

    if (!membership || !hasPermission(membership.permissions, Permissions.MANAGE_MEMBERS)) {
      return NextResponse.json({ error: "No permission to view join requests" }, { status: 403 })
    }

    const requests = await prisma.joinRequest.findMany({
      where: { groupId: id, status: "PENDING" },
      include: {
        user: {
          select: { id: true, name: true, email: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error("Error fetching join requests:", error)
    return NextResponse.json(
      { error: "Failed to fetch join requests" },
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
      return NextResponse.json({ error: "No permission to manage join requests" }, { status: 403 })
    }

    const body = await request.json()
    const result = updateRequestSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { requestId, action } = result.data

    const joinRequest = await prisma.joinRequest.findUnique({
      where: { id: requestId },
    })

    if (!joinRequest || joinRequest.groupId !== id) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    if (joinRequest.status !== "PENDING") {
      return NextResponse.json({ error: "Request already processed" }, { status: 400 })
    }

    if (action === "approve") {
      // Create membership and update request status in a transaction
      await prisma.$transaction([
        prisma.groupMembership.create({
          data: {
            userId: joinRequest.userId,
            groupId: id,
            permissions: DEFAULT_MEMBER_PERMISSIONS,
          },
        }),
        prisma.joinRequest.update({
          where: { id: requestId },
          data: { status: "APPROVED" },
        }),
      ])

      return NextResponse.json({ message: "Request approved", status: "APPROVED" })
    } else {
      await prisma.joinRequest.update({
        where: { id: requestId },
        data: { status: "REJECTED" },
      })

      return NextResponse.json({ message: "Request rejected", status: "REJECTED" })
    }
  } catch (error) {
    console.error("Error processing join request:", error)
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}
