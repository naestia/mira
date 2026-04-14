import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"
import { z } from "zod"

type Params = Promise<{ id: string }>

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  forceChange: z.boolean().optional().default(true),
})

export async function POST(request: Request, { params }: { params: Params }) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const result = resetPasswordSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { newPassword, forceChange } = result.data

    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Prevent admin from resetting their own password through this route
    if (user.id === admin.id) {
      return NextResponse.json(
        { error: "Use the settings page to change your own password" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        mustChangePassword: forceChange,
      },
    })

    return NextResponse.json({
      message: "Password reset successfully",
      mustChangePassword: forceChange,
    })
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    )
  }
}
