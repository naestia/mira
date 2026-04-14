"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RoleBadge } from "@/components/admin/RoleBadge"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { ResetPasswordDialog } from "@/components/admin/ResetPasswordDialog"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { ArrowLeft, Loader2, KeyRound, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Role, Status, Priority } from "@prisma/client"
import Link from "next/link"

interface UserTask {
  id: string
  title: string
  status: Status
  priority: Priority
  createdAt: string
}

interface UserDetail {
  id: string
  name: string | null
  email: string
  role: Role
  active: boolean
  protected: boolean
  createdAt: string
  tasks: UserTask[]
}

const statusColors: Record<Status, string> = {
  TODO: "secondary",
  IN_PROGRESS: "default",
  DONE: "outline",
}

const priorityColors: Record<Priority, string> = {
  LOW: "secondary",
  MEDIUM: "outline",
  HIGH: "default",
  URGENT: "destructive",
}

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    confirmLabel: string
    variant: "default" | "destructive"
    onConfirm: () => void
  } | null>(null)
  const [isConfirmLoading, setIsConfirmLoading] = useState(false)
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false)

  const userId = params.id as string
  const isCurrentUser = session?.user?.id === userId

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch(`/api/admin/users/${userId}`)
        if (!response.ok) throw new Error("Failed to fetch user")
        const data = await response.json()
        setUser(data)
      } catch (error) {
        toast.error("Failed to fetch user")
        router.push("/admin/users")
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [userId, router])

  const handleRoleChange = async (newRole: Role) => {
    if (!user) return

    if (isCurrentUser && newRole === "USER") {
      toast.error("You cannot demote yourself")
      return
    }

    setConfirmDialog({
      open: true,
      title: newRole === "ADMIN" ? "Promote to Admin" : "Demote to User",
      description:
        newRole === "ADMIN"
          ? "This user will have full admin access."
          : "This user will lose admin access.",
      confirmLabel: "Confirm",
      variant: "default",
      onConfirm: async () => {
        setIsConfirmLoading(true)
        try {
          const response = await fetch(`/api/admin/users/${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: newRole }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error)
          }

          const updatedUser = await response.json()
          setUser((prev) => prev ? { ...prev, role: updatedUser.role } : null)
          toast.success("Role updated")
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Failed to update role")
        } finally {
          setIsConfirmLoading(false)
          setConfirmDialog(null)
        }
      },
    })
  }

  const handleToggleActive = () => {
    if (!user) return

    const newActive = !user.active

    setConfirmDialog({
      open: true,
      title: newActive ? "Activate User" : "Deactivate User",
      description: newActive
        ? "This user will be able to log in again."
        : "This user will no longer be able to log in.",
      confirmLabel: newActive ? "Activate" : "Deactivate",
      variant: newActive ? "default" : "destructive",
      onConfirm: async () => {
        setIsConfirmLoading(true)
        try {
          const response = await fetch(`/api/admin/users/${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active: newActive }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error)
          }

          const updatedUser = await response.json()
          setUser((prev) => prev ? { ...prev, active: updatedUser.active } : null)
          toast.success(newActive ? "User activated" : "User deactivated")
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Operation failed")
        } finally {
          setIsConfirmLoading(false)
          setConfirmDialog(null)
        }
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">User not found.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/admin/users" />}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{user.name || "Unnamed User"}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={user.active ? "default" : "destructive"}>
                {user.active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Role</span>
              <RoleBadge role={user.role} />
            </div>
            {user.protected && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Protection</span>
                <Badge variant="outline" className="gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Protected
                </Badge>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Joined</span>
              <span>{format(new Date(user.createdAt), "MMM d, yyyy")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Tasks</span>
              <span>{user.tasks.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Change Role</label>
              <Select
                value={user.role}
                onValueChange={(value) => handleRoleChange(value as Role)}
                disabled={isCurrentUser || user.protected}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
              {isCurrentUser && (
                <p className="text-xs text-muted-foreground">
                  You cannot change your own role
                </p>
              )}
              {user.protected && !isCurrentUser && (
                <p className="text-xs text-muted-foreground">
                  This user is protected and cannot be demoted
                </p>
              )}
            </div>

            {!isCurrentUser && (
              <>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsResetPasswordOpen(true)}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Reset Password
                </Button>
                {!user.protected && (
                  <Button
                    variant={user.active ? "destructive" : "default"}
                    className="w-full"
                    onClick={handleToggleActive}
                  >
                    {user.active ? "Deactivate User" : "Activate User"}
                  </Button>
                )}
                {user.protected && (
                  <p className="text-xs text-muted-foreground text-center">
                    Protected users cannot be deactivated or deleted
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tasks ({user.tasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {user.tasks.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tasks yet</p>
          ) : (
            <div className="rounded-lg border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Title</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Priority</th>
                    <th className="px-4 py-3 text-left font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {user.tasks.map((task) => (
                    <tr key={task.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{task.title}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusColors[task.status] as "default" | "secondary" | "outline"}>
                          {task.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={priorityColors[task.priority] as "default" | "secondary" | "outline" | "destructive"}>
                          {task.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(task.createdAt), "MMM d, yyyy")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {confirmDialog && (
        <ConfirmDialog
          open={confirmDialog.open}
          onOpenChange={(open) => !open && setConfirmDialog(null)}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm}
          isLoading={isConfirmLoading}
        />
      )}

      <ResetPasswordDialog
        open={isResetPasswordOpen}
        onOpenChange={setIsResetPasswordOpen}
        userId={userId}
        userName={user.name || user.email}
      />
    </div>
  )
}
