"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { Loader2, Search, Archive, ArchiveRestore, Eye, Lock, Globe, FolderKanban } from "lucide-react"
import { toast } from "sonner"

interface Project {
  id: string
  name: string
  description?: string | null
  visibility: "PUBLIC" | "PRIVATE"
  status: "ACTIVE" | "ARCHIVED"
  createdAt: string
  archivedAt?: string | null
  memberCount: number
  groupCount: number
  taskCount: number
  creator?: {
    id: string
    name: string | null
    email: string
  }
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)

  const statusLabels: Record<string, string> = {
    all: "All Status",
    ACTIVE: "Active",
    ARCHIVED: "Archived",
  }

  const fetchProjects = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (statusFilter !== "all") params.set("status", statusFilter)

      const response = await fetch(`/api/admin/projects?${params}`)
      if (!response.ok) throw new Error("Failed to fetch projects")
      const data = await response.json()
      setProjects(data)
    } catch {
      toast.error("Failed to fetch projects")
    } finally {
      setIsLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleArchiveToggle = async () => {
    if (!archiveTarget) return
    setIsArchiving(true)
    try {
      const newStatus = archiveTarget.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED"
      const response = await fetch(`/api/projects/${archiveTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      toast.success(newStatus === "ARCHIVED" ? "Project archived" : "Project restored")
      setArchiveTarget(null)
      fetchProjects()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operation failed")
    } finally {
      setIsArchiving(false)
    }
  }

  const activeCount = projects.filter((p) => p.status === "ACTIVE").length
  const archivedCount = projects.filter((p) => p.status === "ARCHIVED").length

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
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Manage all projects across the system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {activeCount} Active
          </Badge>
          <Badge variant="outline">
            {archivedCount} Archived
          </Badge>
        </div>
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
          <SelectTrigger className="w-[150px]">
            <SelectValue>{statusLabels[statusFilter]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No projects found</h3>
          <p className="mt-2 text-muted-foreground">
            {search ? "Try a different search term" : "No projects have been created yet"}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Project</th>
                <th className="px-4 py-3 text-left font-medium">Visibility</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Members</th>
                <th className="px-4 py-3 text-left font-medium">Groups</th>
                <th className="px-4 py-3 text-left font-medium">Tasks</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{project.name}</div>
                      {project.creator && (
                        <div className="text-muted-foreground text-xs">
                          by {project.creator.name || project.creator.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {project.visibility === "PRIVATE" ? (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="h-3 w-3" />
                        Private
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Globe className="h-3 w-3" />
                        Public
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {project.status === "ARCHIVED" ? (
                      <Badge variant="secondary" className="gap-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                        <Archive className="h-3 w-3" />
                        Archived
                      </Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">{project.memberCount}</td>
                  <td className="px-4 py-3">{project.groupCount}</td>
                  <td className="px-4 py-3">{project.taskCount}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(project.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={`/projects/${project.id}`} />}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setArchiveTarget(project)}
                      >
                        {project.status === "ARCHIVED" ? (
                          <ArchiveRestore className="h-4 w-4" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {archiveTarget && (
        <ConfirmDialog
          open={!!archiveTarget}
          onOpenChange={(open) => !open && setArchiveTarget(null)}
          title={archiveTarget.status === "ARCHIVED" ? "Restore Project" : "Archive Project"}
          description={
            archiveTarget.status === "ARCHIVED"
              ? `This will restore "${archiveTarget.name}" and allow members to create and edit content again.`
              : `This will freeze all groups and tasks under "${archiveTarget.name}". Members will retain read access.`
          }
          confirmLabel={archiveTarget.status === "ARCHIVED" ? "Restore" : "Archive"}
          variant={archiveTarget.status === "ARCHIVED" ? "default" : "destructive"}
          onConfirm={handleArchiveToggle}
          isLoading={isArchiving}
        />
      )}
    </div>
  )
}
