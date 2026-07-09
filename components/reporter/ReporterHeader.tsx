"use client"

import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { LogOut } from "lucide-react"

export function ReporterHeader() {
  const { data: session } = useSession()

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg">Mira</span>
          <span className="text-muted-foreground text-sm">Reporter</span>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          {session?.user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {session.user.name || session.user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
