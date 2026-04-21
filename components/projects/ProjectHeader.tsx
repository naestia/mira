"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Lock,
  Globe,
  Archive,
  MoreHorizontal,
  Edit,
  ArchiveRestore,
  Users,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

interface ProjectHeaderProps {
  project: {
    id: string
    name: string
    description?: string | null
    visibility: "PUBLIC" | "PRIVATE"
    status: "ACTIVE" | "ARCHIVED"
    createdAt: string
    creator?: {
      id: string
      name: string | null
      email: string
    }
  }
  myRole?: "MEMBER" | "MANAGER" | "OWNER" | null
  isAdmin?: boolean
  onEdit?: () => void
  onArchiveToggle?: () => Promise<void>
  onManageMembers?: () => void
}

export function ProjectHeader({
  project,
  myRole,
  isAdmin,
  onEdit,
  onArchiveToggle,
  onManageMembers,
}: ProjectHeaderProps) {
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

  const canEdit = isAdmin || myRole === "OWNER" || myRole === "MANAGER"
  const canArchive = isAdmin
  const isArchived = project.status === "ARCHIVED"

  const handleArchiveToggle = async () => {
    if (!onArchiveToggle) return
    setIsArchiving(true)
    try {
      await onArchiveToggle()
      setIsArchiveDialogOpen(false)
      toast.success(isArchived ? "Project restored" : "Project archived")
    } catch {
      toast.error("Failed to update project status")
    } finally {
      setIsArchiving(false)
    }
  }

  return (
    <div className="space-y-4">
      {isArchived && (
        <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4 text-yellow-600 dark:text-yellow-400">
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            <span className="font-medium">This project is archived</span>
          </div>
          <p className="mt-1 text-sm opacity-80">
            All groups and tasks are read-only. Members retain read access.
          </p>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <div className="flex items-center gap-1.5">
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
              {isArchived && (
                <Badge variant="secondary" className="gap-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                  <Archive className="h-3 w-3" />
                  Archived
                </Badge>
              )}
            </div>
          </div>

          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}

          <div className="text-sm text-muted-foreground">
            Created by {project.creator?.name || project.creator?.email || "Unknown"} on{" "}
            {new Date(project.createdAt).toLocaleDateString()}
          </div>
        </div>

        {(canEdit || canArchive) && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="icon" />}>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && !isArchived && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4" />
                  Edit Project
                </DropdownMenuItem>
              )}
              {canEdit && (
                <DropdownMenuItem onClick={onManageMembers}>
                  <Users className="h-4 w-4" />
                  Manage Members
                </DropdownMenuItem>
              )}
              {canArchive && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setIsArchiveDialogOpen(true)}
                    variant={isArchived ? "default" : "destructive"}
                  >
                    {isArchived ? (
                      <>
                        <ArchiveRestore className="h-4 w-4" />
                        Restore Project
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4" />
                        Archive Project
                      </>
                    )}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isArchived ? "Restore Project" : "Archive Project"}
            </DialogTitle>
            <DialogDescription>
              {isArchived
                ? "This will restore the project and allow members to create and edit content again."
                : "This will freeze all groups and tasks under this project. Members will retain read access."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsArchiveDialogOpen(false)}
              disabled={isArchiving}
            >
              Cancel
            </Button>
            <Button
              variant={isArchived ? "default" : "destructive"}
              onClick={handleArchiveToggle}
              disabled={isArchiving}
            >
              {isArchiving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isArchived ? "Restore" : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
