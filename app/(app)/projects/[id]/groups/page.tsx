"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreateGroupForm } from "@/components/groups/CreateGroupForm"
import { Plus, Loader2, ArrowLeft, AlertTriangle, Users, CheckSquare } from "lucide-react"
import { toast } from "sonner"

interface Project {
  id: string
  name: string
  status: "ACTIVE" | "ARCHIVED"
  myRole?: "MEMBER" | "MANAGER" | "OWNER" | null
  isMember: boolean
}

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

export default function ProjectGroupsPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const isAdmin = session?.user?.role === "ADMIN"
  const myRole = project?.myRole
  const isArchived = project?.status === "ARCHIVED"
  const canCreate = (isAdmin || myRole === "OWNER" || myRole === "MANAGER") && !isArchived

  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.status === 404) {
        toast.error("Project not found")
        router.push("/projects")
        return null
      }
      if (!response.ok) throw new Error("Failed to fetch project")
      const data = await response.json()
      setProject(data)
      return data
    } catch {
      toast.error("Failed to fetch project")
      router.push("/projects")
      return null
    }
  }, [projectId, router])

  const fetchGroups = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/groups`)
      if (!response.ok) throw new Error("Failed to fetch groups")
      const data = await response.json()
      setGroups(data)
    } catch {
      toast.error("Failed to fetch groups")
    }
  }, [projectId])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      const proj = await fetchProject()
      if (proj) {
        await fetchGroups()
      }
      setIsLoading(false)
    }
    loadData()
  }, [fetchProject, fetchGroups])

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
    fetchGroups()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!project) {
    return null
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={`/projects/${projectId}`} />}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {project.name}
        </Button>
      </div>

      {isArchived && (
        <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4 text-yellow-600 dark:text-yellow-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">This project is archived</span>
          </div>
          <p className="mt-1 text-sm opacity-80">
            Groups are read-only. No modifications allowed.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Project Groups</h1>
          <p className="text-muted-foreground">
            Groups for {project.name}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Group
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Groups ({groups.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {canCreate
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
      </Card>

      <CreateGroupForm
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateGroup}
      />
    </div>
  )
}
