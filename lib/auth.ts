import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import { Role } from "@prisma/client"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials")
        }

        // Try to find user by email or username
        const identifier = credentials.email.toLowerCase()
        let user = await prisma.user.findUnique({
          where: { email: identifier },
        })

        // If not found by email, try username
        if (!user) {
          user = await prisma.user.findUnique({
            where: { username: identifier },
          })
        }

        if (!user || !user.password) {
          throw new Error("Invalid credentials")
        }

        if (!user.active || user.deletedAt) {
          throw new Error("Your account has been deactivated")
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          throw new Error("Invalid credentials")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.mustChangePassword = user.mustChangePassword
      }
      // Refresh mustChangePassword from DB on update trigger
      if (trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { mustChangePassword: true },
        })
        if (dbUser) {
          token.mustChangePassword = dbUser.mustChangePassword
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.mustChangePassword = token.mustChangePassword as boolean
      }
      return session
    },
  },
}

export async function requireAdmin() {
  const { getServerSession } = await import("next-auth")
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "ADMIN") {
    return null
  }

  return session.user
}
