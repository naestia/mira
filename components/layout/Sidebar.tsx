"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./ThemeToggle"
import {
  CheckSquare,
  Settings,
  LogOut,
  LayoutDashboard,
  Shield,
  Users,
  AlertTriangle,
  ListTodo,
} from "lucide-react"
import { NotificationBell } from "@/components/incidents/NotificationBell"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Tasks", href: "/tasks", icon: ListTodo },
  { name: "Groups", href: "/groups", icon: Users },
  { name: "Incidents", href: "/incidents", icon: AlertTriangle },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center justify-between border-b px-6">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight">Mira</span>
        </div>
        <NotificationBell />
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-2.5 text-[15px] font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}

        {session?.user?.role === "ADMIN" && (
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-[15px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground mt-4 border-t pt-4"
          >
            <Shield className="h-5 w-5" />
            Admin Portal
          </Link>
        )}
      </nav>

      <div className="border-t p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-medium truncate">
              {session?.user?.name || "User"}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {session?.user?.email}
            </p>
          </div>
          <ThemeToggle />
        </div>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  )
}
