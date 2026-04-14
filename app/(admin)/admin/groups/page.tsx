"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { Search, Eye, Trash2, Loader2, Users, CheckSquare } from "lucide-react"
import { toast } from "sonner"

interface AdminGroup {
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
}

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<AdminGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [deletingGroup, setDeletingGroup] = useState<AdminGroup | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchGroups = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)

      const response = await fetch(`/api/admin/groups?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch groups")
      const data = await response.json()
      setGroups(data)
    } catch (error) {
      toast.error("Failed to fetch groups")
    } finally {
      setIsLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const handleDelete = async () => {
    if (!deletingGroup) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/groups/${deletingGroup.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      toast.success("Group deleted")
      fetchGroups()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete group")
    } finally {
      setIsDeleting(false)
      setDeletingGroup(null)
    }
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
      <div>
        <h1 className="text-3xl font-bold">Groups</h1>
        <p className="text-muted-foreground">Manage all groups in the system</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search groups..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Group</th>
              <th className="px-4 py-3 text-left font-medium">Creator</th>
              <th className="px-4 py-3 text-left font-medium">Members</th>
              <th className="px-4 py-3 text-left font-medium">Tasks</th>
              <th className="px-4 py-3 text-left font-medium">Created</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium">{group.name}</div>
                    {group.description && (
                      <div className="text-muted-foreground text-xs line-clamp-1">
                        {group.description}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-muted-foreground">
                    {group.creator.name || group.creator.email}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {group.memberCount}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <CheckSquare className="h-4 w-4" />
                    {group.taskCount}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {format(new Date(group.createdAt), "MMM d, yyyy")}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon-sm" nativeButton={false} render={<Link href={`/admin/groups/${group.id}`} />}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeletingGroup(group)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No groups found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {deletingGroup && (
        <ConfirmDialog
          open={!!deletingGroup}
          onOpenChange={(open) => !open && setDeletingGroup(null)}
          title="Delete Group"
          description={`Are you sure you want to delete "${deletingGroup.name}"? This will permanently delete all ${deletingGroup.taskCount} tasks in this group.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={handleDelete}
          isLoading={isDeleting}
        />
      )}
    </div>
  )
}
