"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ProjectHeader } from "@/components/projects/ProjectHeader"
import { ProjectOverview } from "@/components/projects/ProjectOverview"
import { ProjectGroupList } from "@/components/projects/ProjectGroupList"
import { ProjectMemberList } from "@/components/projects/ProjectMemberList"
import { Loader2, ArrowLeft, FolderKanban, Users, FileText, CheckSquare } from "lucide-react"
import { toast } from "sonner"

interface Project {
  id: string
  name: string
  description?: string | null
  overview?: string | null
  visibility: "PUBLIC" | "PRIVATE"
  status: "ACTIVE" | "ARCHIVED"
  createdAt: string
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

interface Member {
  id: string
  userId: string
  projectId: string
  role: "MEMBER" | "MANAGER" | "OWNER"
  joinedAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

type Tab = "overview" | "groups" | "members" | "tasks"

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [isEditing, setIsEditing] = useState(false)

  const isAdmin = session?.user?.role === "ADMIN"
  const myRole = project?.myRole
  const canEdit = isAdmin || myRole === "OWNER" || myRole === "MANAGER"
  const isArchived = project?.status === "ARCHIVED"

  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.status === 404) {
        toast.error("Project not found")
        router.push("/projects")
        return
      }
      if (!response.ok) throw new Error("Failed to fetch project")
      const data = await response.json()
      setProject(data)
    } catch {
      toast.error("Failed to fetch project")
      router.push("/projects")
    } finally {
      setIsLoading(false)
    }
  }, [projectId, router])

  const fetchGroups = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/groups`)
      if (!response.ok) throw new Error("Failed to fetch groups")
      const data = await response.json()
      setGroups(data)
    } catch {
      // Silently fail - groups will be empty
    }
  }, [projectId])

  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members`)
      if (!response.ok) throw new Error("Failed to fetch members")
      const data = await response.json()
      setMembers(data)
    } catch {
      // Silently fail - members will be empty
    }
  }, [projectId])

  useEffect(() => {
    fetchProject()
    fetchGroups()
    fetchMembers()
  }, [fetchProject, fetchGroups, fetchMembers])

  const handleArchiveToggle = async () => {
    if (!project) return
    const newStatus = project.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED"

    const response = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error)
    }

    fetchProject()
  }

  const handleSaveOverview = async (overview: string) => {
    const response = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overview }),
    })

    if (!response.ok) {
      const error = await response.json()
      toast.error(error.error || "Failed to save overview")
      throw new Error(error.error)
    }

    toast.success("Overview saved")
    fetchProject()
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

  const tabs = [
    { id: "overview" as Tab, label: "Overview", icon: FileText },
    { id: "groups" as Tab, label: "Groups", icon: FolderKanban, count: groups.length },
    { id: "members" as Tab, label: "Members", icon: Users, count: members.length },
    { id: "tasks" as Tab, label: "Tasks", icon: CheckSquare, count: project.taskCount },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/projects" />}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
      </div>

      <ProjectHeader
        project={project}
        myRole={myRole}
        isAdmin={isAdmin}
        onEdit={() => setIsEditing(true)}
        onArchiveToggle={handleArchiveToggle}
        onManageMembers={() => setActiveTab("members")}
      />

      <div className="border-b">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-6">
        {activeTab === "overview" && (
          <ProjectOverview
            overview={project.overview}
            canEdit={canEdit}
            isArchived={isArchived}
            onSave={handleSaveOverview}
          />
        )}

        {activeTab === "groups" && (
          <ProjectGroupList
            projectId={projectId}
            groups={groups}
            canCreate={canEdit}
            isArchived={isArchived}
            onGroupCreated={fetchGroups}
          />
        )}

        {activeTab === "members" && session?.user?.id && (
          <ProjectMemberList
            projectId={projectId}
            members={members}
            myRole={myRole}
            isAdmin={isAdmin}
            isArchived={isArchived}
            currentUserId={session.user.id}
            onMemberUpdated={fetchMembers}
          />
        )}

        {activeTab === "tasks" && (
          <div className="text-center py-8">
            <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">Project Tasks</h3>
            <p className="mt-2 text-muted-foreground">
              View and manage project-level tasks
            </p>
            <Button
              className="mt-4"
              nativeButton={false}
              render={<Link href={`/projects/${projectId}/tasks`} />}
            >
              Go to Tasks
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
