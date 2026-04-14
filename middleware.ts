import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Force password change for users who must change their password
    if (token?.mustChangePassword && pathname !== "/change-password") {
      return NextResponse.redirect(new URL("/change-password", req.url))
    }

    // Don't allow access to change-password if not required
    if (!token?.mustChangePassword && pathname === "/change-password") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Protect admin routes
    if (pathname.startsWith("/admin")) {
      if (!token || token.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }
    }

    return NextResponse.next()
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/admin/:path*", "/change-password"],
}
