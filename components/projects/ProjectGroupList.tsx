"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreateGroupForm } from "@/components/groups/CreateGroupForm"
import { Plus, Users, CheckSquare } from "lucide-react"
import { toast } from "sonner"

interface Group {
  id: string
  name: string
  description?: string | null
  memberCount: number
  taskCount: number
  isGroupMember?: boolean
  myPermissions?: number | null
  creator?: {
    id: string
    name: string | null
    email: string
  }
}

interface ProjectGroupListProps {
  projectId: string
  groups: Group[]
  canCreate?: boolean
  isArchived?: boolean
  onGroupCreated?: () => void
}

export function ProjectGroupList({
  projectId,
  groups,
  canCreate,
  isArchived,
  onGroupCreated,
}: ProjectGroupListProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const handleCreateGroup = async (data: { name: string; description?: string }) => {
    const response = await fetch(`/api/projects/${projectId}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      toast.error(error.error || "Failed to create group")
      throw new Error(error.error)
    }

    toast.success("Group created")
    onGroupCreated?.()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Groups</CardTitle>
        {canCreate && !isArchived && (
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Create Group
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {canCreate && !isArchived
              ? "No groups yet. Create one to get started."
              : "No groups in this project."}
          </p>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/groups/${group.id}`}
                      className="font-medium hover:underline"
                    >
                      {group.name}
                    </Link>
                    {group.isGroupMember && (
                      <Badge variant="secondary" className="text-xs">
                        Member
                      </Badge>
                    )}
                  </div>
                  {group.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {group.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{group.memberCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckSquare className="h-4 w-4" />
                    <span>{group.taskCount}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/groups/${group.id}`} />}
                  >
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CreateGroupForm
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateGroup}
      />
    </Card>
  )
}
