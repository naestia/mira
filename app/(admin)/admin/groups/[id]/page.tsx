"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MemberTable } from "@/components/groups/MemberTable"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { ArrowLeft, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Status, Priority } from "@prisma/client"

interface Member {
  id: string
  userId: string
  permissions: number
  joinedAt: string
  user: {
    id: string
    name: string | null
    email: string
    createdAt: string
  }
}

interface Task {
  id: string
  title: string
  status: Status
  priority: Priority
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface GroupDetail {
  id: string
  name: string
  description?: string | null
  createdAt: string
  creator: {
    id: string
    name: string | null
    email: string
  }
  memberCount: number
  taskCount: number
  members: Member[]
  tasks: Task[]
}

const statusColors: Record<Status, string> = {
  TODO: "secondary",
  IN_PROGRESS: "default",
  DONE: "outline",
}

export default function AdminGroupDetailPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string

  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    async function fetchGroup() {
      try {
        const response = await fetch(`/api/admin/groups/${groupId}`)
        if (!response.ok) {
          router.push("/admin/groups")
          return
        }
        const data = await response.json()
        setGroup(data)
      } catch (error) {
        toast.error("Failed to fetch group")
        router.push("/admin/groups")
      } finally {
        setIsLoading(false)
      }
    }

    fetchGroup()
  }, [groupId, router])

  const handleUpdatePermissions = async (userId: string, permissions: number) => {
    const response = await fetch(`/api/groups/${groupId}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, permissions }),
    })

    if (!response.ok) {
      const error = await response.json()
      toast.error(error.error || "Failed to update permissions")
      throw new Error(error.error)
    }

    toast.success("Permissions updated")

    // Refresh
    const refreshResponse = await fetch(`/api/admin/groups/${groupId}`)
    if (refreshResponse.ok) {
      const data = await refreshResponse.json()
      setGroup(data)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    const response = await fetch(`/api/groups/${groupId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })

    if (!response.ok) {
      const error = await response.json()
      toast.error(error.error || "Failed to remove member")
      throw new Error(error.error)
    }

    toast.success("Member removed")

    // Refresh
    const refreshResponse = await fetch(`/api/admin/groups/${groupId}`)
    if (refreshResponse.ok) {
      const data = await refreshResponse.json()
      setGroup(data)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/groups/${groupId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      toast.success("Group deleted")
      router.push("/admin/groups")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete group")
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!group) {
    return null
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/admin/groups" />}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{group.name}</h1>
            {group.description && (
              <p className="text-muted-foreground">{group.description}</p>
            )}
          </div>
        </div>
        <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Group
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{group.memberCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{group.taskCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Created By
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-medium">{group.creator.name || group.creator.email}</div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(group.createdAt), "MMM d, yyyy")}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members ({group.members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <MemberTable
            members={group.members}
            canManage={true}
            currentUserId=""
            onUpdatePermissions={handleUpdatePermissions}
            onRemoveMember={handleRemoveMember}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Tasks ({group.tasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {group.tasks.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tasks yet</p>
          ) : (
            <div className="rounded-lg border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Title</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Created By</th>
                    <th className="px-4 py-3 text-left font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {group.tasks.map((task) => (
                    <tr key={task.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{task.title}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusColors[task.status] as "default" | "secondary" | "outline"}>
                          {task.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {task.user.name || task.user.email}
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

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Group"
        description={`Are you sure you want to delete "${group.name}"? This will permanently delete all ${group.taskCount} tasks in this group.`}
        confirmLabel="Delete Group"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  )
}
