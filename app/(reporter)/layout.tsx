import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ReporterHeader } from "@/components/reporter"

export default async function ReporterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role !== "REPORTER") {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      <ReporterHeader />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
