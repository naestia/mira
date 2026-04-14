"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { UserTable, AdminUser } from "@/components/admin/UserTable"
import { UserForm } from "@/components/admin/UserForm"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function AdminUsersPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    confirmLabel: string
    variant: "default" | "destructive"
    onConfirm: () => void
  } | null>(null)
  const [isConfirmLoading, setIsConfirmLoading] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (roleFilter !== "all") params.set("role", roleFilter)

      const response = await fetch(`/api/admin/users?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch users")
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      toast.error("Failed to fetch users")
    } finally {
      setIsLoading(false)
    }
  }, [search, roleFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleCreateUser = async (data: {
    name: string
    email: string
    password: string
    role: "USER" | "ADMIN"
  }) => {
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      toast.error(error.error || "Failed to create user")
      throw new Error(error.error)
    }

    toast.success("User created successfully")
    fetchUsers()
  }

  const handleToggleActive = (userId: string, active: boolean) => {
    setConfirmDialog({
      open: true,
      title: active ? "Activate User" : "Deactivate User",
      description: active
        ? "This user will be able to log in again."
        : "This user will no longer be able to log in.",
      confirmLabel: active ? "Activate" : "Deactivate",
      variant: active ? "default" : "destructive",
      onConfirm: async () => {
        setIsConfirmLoading(true)
        try {
          const response = await fetch(`/api/admin/users/${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error)
          }

          toast.success(active ? "User activated" : "User deactivated")
          fetchUsers()
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Operation failed")
        } finally {
          setIsConfirmLoading(false)
          setConfirmDialog(null)
        }
      },
    })
  }

  const handleDelete = (userId: string) => {
    setConfirmDialog({
      open: true,
      title: "Delete User",
      description: "This action cannot be undone. The user's data will be preserved for audit purposes.",
      confirmLabel: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        setIsConfirmLoading(true)
        try {
          const response = await fetch(`/api/admin/users/${userId}`, {
            method: "DELETE",
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error)
          }

          toast.success("User deleted")
          fetchUsers()
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Failed to delete user")
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage user accounts</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <UserTable
        users={users}
        search={search}
        onSearchChange={setSearch}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        onToggleActive={handleToggleActive}
        onDelete={handleDelete}
        currentUserId={session?.user?.id}
      />

      <UserForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleCreateUser}
      />

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
    </div>
  )
}
