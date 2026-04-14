import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { z } from "zod"

const joinRequestSchema = z.object({
  groupId: z.string(),
  message: z.string().max(500).optional(),
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const result = joinRequestSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { groupId, message } = result.data

    // Check if group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    })

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    // Check if already a member
    const existingMembership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: user.id, groupId } },
    })

    if (existingMembership) {
      return NextResponse.json({ error: "Already a member of this group" }, { status: 400 })
    }

    // Check if there's already a pending request
    const existingRequest = await prisma.joinRequest.findUnique({
      where: { userId_groupId: { userId: user.id, groupId } },
    })

    if (existingRequest) {
      if (existingRequest.status === "PENDING") {
        return NextResponse.json({ error: "Request already pending" }, { status: 400 })
      }
      // If previously rejected, allow a new request by updating
      const updated = await prisma.joinRequest.update({
        where: { id: existingRequest.id },
        data: { status: "PENDING", message, updatedAt: new Date() },
      })
      return NextResponse.json(updated, { status: 201 })
    }

    const joinRequest = await prisma.joinRequest.create({
      data: {
        userId: user.id,
        groupId,
        message,
      },
    })

    return NextResponse.json(joinRequest, { status: 201 })
  } catch (error) {
    console.error("Error creating join request:", error)
    return NextResponse.json(
      { error: "Failed to create join request" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all pending requests for the current user
    const requests = await prisma.joinRequest.findMany({
      where: { userId: user.id },
      include: {
        group: {
          select: { id: true, name: true, description: true },
        },
      },
      orderBy: { createdAt: "desc" },
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
