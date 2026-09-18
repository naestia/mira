import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { labelSchema } from "@/lib/validations"

// Dynamic route — never cache
export const dynamic = "force-dynamic"

type Params = Promise<{ id: string }>

// Default columns seeded the first time a project's board is opened.
const DEFAULT_LABELS = [
  { name: "To Do", color: "#7c7263" },
  { name: "In Progress", color: "#b0784e" },
  { name: "Done", color: "#2f7d4d" },
]

async function getProjectAccess(projectId: string, userId: string) {
  const [project, membership, dbUser] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId } }),
    prisma.projectMembership.findUnique({
      where: { userId_projectId: { userId, projectId } },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
  ])
  const isAdmin = dbUser?.role === "ADMIN"
  const isMember = !!membership
  return { project, isAdmin, isMember }
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
    if (project.visibility === "PRIVATE" && !isMember && !isAdmin) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    let labels = await prisma.label.findMany({
      where: { projectId: id },
      orderBy: { position: "asc" },
    })

    // Seed default columns the first time an editor opens the board.
    if (labels.length === 0 && (isMember || isAdmin) && project.status !== "ARCHIVED") {
      await prisma.$transaction(
        DEFAULT_LABELS.map((l, i) =>
          prisma.label.create({
            data: { name: l.name, color: l.color, position: i, projectId: id },
          })
        )
      )
      labels = await prisma.label.findMany({
        where: { projectId: id },
        orderBy: { position: "asc" },
      })
    }

    return NextResponse.json(labels)
  } catch (error) {
    console.error("Error fetching labels:", error)
    return NextResponse.json({ error: "Failed to fetch labels" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Params }) {
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
    if (!isMember && !isAdmin) {
      return NextResponse.json(
        { error: "You must be a project member to add labels" },
        { status: 403 }
      )
    }
    if (project.status === "ARCHIVED") {
      return NextResponse.json(
        { error: "Cannot modify an archived project" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const result = labelSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const last = await prisma.label.findFirst({
      where: { projectId: id },
      orderBy: { position: "desc" },
      select: { position: true },
    })
    const position = last ? last.position + 1 : 0

    const label = await prisma.label.create({
      data: {
        name: result.data.name,
        color: result.data.color ?? "#b0784e",
        position,
        projectId: id,
      },
    })

    return NextResponse.json(label, { status: 201 })
  } catch (error) {
    console.error("Error creating label:", error)
    return NextResponse.json({ error: "Failed to create label" }, { status: 500 })
  }
}
