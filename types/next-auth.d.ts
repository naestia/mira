import { DefaultSession, DefaultUser } from "next-auth"
import { JWT, DefaultJWT } from "next-auth/jwt"
import { Role } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: Role
      mustChangePassword: boolean
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    id: string
    role: Role
    mustChangePassword: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    role: Role
    mustChangePassword: boolean
  }
}
