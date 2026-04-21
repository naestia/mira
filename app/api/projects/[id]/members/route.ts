import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { z } from "zod"

type Params = Promise<{ id: string }>

const addMemberSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["MEMBER", "MANAGER"]).default("MEMBER"),
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

    const members = await prisma.projectMembership.findMany({
      where: { projectId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { role: "asc" }, // OWNER first, then MANAGER, then MEMBER
        { joinedAt: "asc" },
      ],
    })

    return NextResponse.json(members)
  } catch (error) {
    console.error("Error fetching project members:", error)
    return NextResponse.json(
      { error: "Failed to fetch project members" },
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
        { error: "Cannot add members to an archived project" },
        { status: 403 }
      )
    }

    // Check permission
    const canManage = isAdmin || role === "OWNER" || role === "MANAGER"
    if (!canManage) {
      return NextResponse.json(
        { error: "You don't have permission to add members to this project" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const result = addMemberSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { userId, role: memberRole } = result.data

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, active: true },
    })

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (!targetUser.active) {
      return NextResponse.json(
        { error: "Cannot add inactive user" },
        { status: 400 }
      )
    }

    // Check if already a member
    const existingMembership = await prisma.projectMembership.findUnique({
      where: { userId_projectId: { userId, projectId: id } },
    })

    if (existingMembership) {
      return NextResponse.json(
        { error: "User is already a member of this project" },
        { status: 400 }
      )
    }

    const membership = await prisma.projectMembership.create({
      data: {
        userId,
        projectId: id,
        role: memberRole,
      },
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

    return NextResponse.json(membership, { status: 201 })
  } catch (error) {
    console.error("Error adding project member:", error)
    return NextResponse.json(
      { error: "Failed to add project member" },
      { status: 500 }
    )
  }
}
