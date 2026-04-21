"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ProjectCard } from "@/components/projects/ProjectCard"
import { CreateProjectForm } from "@/components/projects/CreateProjectForm"
import { Plus, Loader2, Search, FolderKanban } from "lucide-react"
import { toast } from "sonner"
import { hasUserPermission, UserPermissions } from "@/lib/permissions"

interface Project {
  id: string
  name: string
  description?: string | null
  visibility: "PUBLIC" | "PRIVATE"
  status: "ACTIVE" | "ARCHIVED"
  memberCount: number
  groupCount: number
  taskCount: number
  myRole?: "MEMBER" | "MANAGER" | "OWNER" | null
  isMember: boolean
  creator?: {
    id: string
    name: string | null
    email: string
  }
}

export default function ProjectsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [canCreateProject, setCanCreateProject] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE")
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all")
  const [search, setSearch] = useState("")

  const fetchProjects = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (visibilityFilter !== "all") params.set("visibility", visibilityFilter)
      if (search) params.set("search", search)

      const response = await fetch(`/api/projects?${params}`)
      if (!response.ok) throw new Error("Failed to fetch projects")
      const data = await response.json()
      setProjects(data)
    } catch {
      toast.error("Failed to fetch projects")
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, visibilityFilter, search])

  const checkCreatePermission = useCallback(async () => {
    if (!session?.user?.id) return

    // Admins can always create
    if (session.user.role === "ADMIN") {
      setCanCreateProject(true)
      return
    }

    // Check user permissions
    try {
      const response = await fetch("/api/user/profile")
      if (response.ok) {
        const user = await response.json()
        setCanCreateProject(
          hasUserPermission(user.userPermissions || 0, UserPermissions.CREATE_PROJECT)
        )
      }
    } catch {
      // Ignore errors
    }
  }, [session])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    checkCreatePermission()
  }, [checkCreatePermission])

  const handleCreateProject = async (data: {
    name: string
    description: string
    overview?: string
    visibility: "PUBLIC" | "PRIVATE"
  }) => {
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      toast.error(error.error || "Failed to create project")
      throw new Error(error.error)
    }

    const project = await response.json()
    toast.success("Project created")
    router.push(`/projects/${project.id}`)
  }

  const handleCreateClick = () => {
    if (!canCreateProject) {
      toast.error("You don't have permission to create projects")
      return
    }
    setIsCreateOpen(true)
  }

  const activeProjects = projects.filter((p) => p.status === "ACTIVE")
  const archivedProjects = projects.filter((p) => p.status === "ARCHIVED")

  const statusLabels: Record<string, string> = {
    all: "All Status",
    ACTIVE: "Active",
    ARCHIVED: "Archived",
  }

  const visibilityLabels: Record<string, string> = {
    all: "All Visibility",
    PUBLIC: "Public",
    PRIVATE: "Private",
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Organize groups and tasks under projects
          </p>
        </div>
        {canCreateProject && (
          <Button onClick={handleCreateClick}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue>{statusLabels[statusFilter]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={visibilityFilter} onValueChange={(v) => v && setVisibilityFilter(v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue>{visibilityLabels[visibilityFilter]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Visibility</SelectItem>
            <SelectItem value="PUBLIC">Public</SelectItem>
            <SelectItem value="PRIVATE">Private</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No projects found</h3>
          <p className="mt-2 text-muted-foreground">
            {canCreateProject
              ? "Create your first project to get started."
              : "There are no public projects available yet."}
          </p>
          {canCreateProject && (
            <Button className="mt-4" onClick={handleCreateClick}>
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          )}
        </div>
      ) : (
        <>
          {statusFilter !== "ARCHIVED" && activeProjects.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Active Projects</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}

          {statusFilter !== "ACTIVE" && archivedProjects.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Archived Projects</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {archivedProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <CreateProjectForm
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateProject}
      />
    </div>
  )
}
