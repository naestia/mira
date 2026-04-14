import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { adminUserUpdateSchema } from "@/lib/validations"

type Params = Promise<{ id: string }>

export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        protected: true,
        createdAt: true,
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await request.json()
    const result = adminUserUpdateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, email, role, active } = result.data

    // Prevent modifications to protected users
    if (user.protected) {
      if (role === "USER") {
        return NextResponse.json(
          { error: "Cannot demote a protected user" },
          { status: 400 }
        )
      }
      if (active === false) {
        return NextResponse.json(
          { error: "Cannot deactivate a protected user" },
          { status: 400 }
        )
      }
    }

    // Prevent self-demotion
    if (id === admin.id && role === "USER") {
      return NextResponse.json(
        { error: "You cannot demote yourself" },
        { status: 400 }
      )
    }

    // Ensure at least one admin exists
    if (role === "USER" && user.role === "ADMIN") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN", deletedAt: null, active: true },
      })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "At least one admin must exist" },
          { status: 400 }
        )
      }
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })
      if (existingUser) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 400 }
        )
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(role !== undefined && { role }),
        ...(active !== undefined && { active }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Prevent deletion of protected users
    if (user.protected) {
      return NextResponse.json(
        { error: "Cannot delete a protected user" },
        { status: 400 }
      )
    }

    // Prevent self-deletion
    if (id === admin.id) {
      return NextResponse.json(
        { error: "You cannot delete yourself" },
        { status: 400 }
      )
    }

    // Ensure at least one admin exists
    if (user.role === "ADMIN") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN", deletedAt: null },
      })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "At least one admin must exist" },
          { status: 400 }
        )
      }
    }

    // Soft delete
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    })

    return NextResponse.json({ message: "User deleted" })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    )
  }
}
