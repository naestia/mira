import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"
import { labelUpdateSchema } from "@/lib/validations"

export const dynamic = "force-dynamic"

type Params = Promise<{ id: string }>

// A user may edit a label if they're a member of its project (or an admin),
// and the project isn't archived.
async function getLabelAccess(labelId: string, userId: string) {
  const label = await prisma.label.findUnique({
    where: { id: labelId },
    include: { project: { select: { id: true, status: true } } },
  })
  if (!label) return { label: null, canEdit: false, archived: false }

  const [membership, dbUser] = await Promise.all([
    prisma.projectMembership.findUnique({
      where: { userId_projectId: { userId, projectId: label.projectId } },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
  ])
  const canEdit = !!membership || dbUser?.role === "ADMIN"
  return { label, canEdit, archived: label.project.status === "ARCHIVED" }
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { label, canEdit, archived } = await getLabelAccess(id, user.id)

    if (!label) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 })
    }
    if (!canEdit) {
      return NextResponse.json({ error: "No permission to edit this label" }, { status: 403 })
    }
    if (archived) {
      return NextResponse.json({ error: "Cannot modify an archived project" }, { status: 403 })
    }

    const body = await request.json()
    const result = labelUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const updated = await prisma.label.update({
      where: { id },
      data: result.data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating label:", error)
    return NextResponse.json({ error: "Failed to update label" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { label, canEdit, archived } = await getLabelAccess(id, user.id)

    if (!label) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 })
    }
    if (!canEdit) {
      return NextResponse.json({ error: "No permission to delete this label" }, { status: 403 })
    }
    if (archived) {
      return NextResponse.json({ error: "Cannot modify an archived project" }, { status: 403 })
    }

    // Tasks in this column fall back to the unlabeled column (FK is SetNull).
    await prisma.label.delete({ where: { id } })

    return NextResponse.json({ message: "Label deleted" })
  } catch (error) {
    console.error("Error deleting label:", error)
    return NextResponse.json({ error: "Failed to delete label" }, { status: 500 })
  }
}
