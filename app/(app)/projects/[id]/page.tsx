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
import { TaskList } from "@/components/tasks/TaskList"
import { TaskForm } from "@/components/tasks/TaskForm"
import { Loader2, ArrowLeft, FolderKanban, Users, FileText, CheckSquare, Plus, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { TaskWithRelations, Tag, Status } from "@/types"
import { TaskInput } from "@/lib/validations"

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
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [isEditing, setIsEditing] = useState(false)
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null)

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

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`)
      if (!response.ok) throw new Error("Failed to fetch tasks")
      const data = await response.json()
      setTasks(data)
    } catch {
      // Silently fail - tasks will be empty
    }
  }, [projectId])

  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch("/api/tags")
      if (!response.ok) throw new Error("Failed to fetch tags")
      const data = await response.json()
      setTags(data)
    } catch {
      // Tags are optional
    }
  }, [])

  useEffect(() => {
    fetchProject()
    fetchGroups()
    fetchMembers()
    fetchTasks()
    fetchTags()
  }, [fetchProject, fetchGroups, fetchMembers, fetchTasks, fetchTags])

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

  const handleCreateTask = async (data: TaskInput) => {
    const response = await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.title,
        description: data.description,
        priority: data.priority,
        dueDate: data.dueDate,
        tagIds: data.tagIds,
      }),
    })
    if (!response.ok) {
      const error = await response.json()
      toast.error(error.error || "Failed to create task")
      throw new Error(error.error)
    }
    const newTask = await response.json()
    setTasks((prev) => [newTask, ...prev])
    toast.success("Task created")
  }

  const handleUpdateTask = async (data: TaskInput) => {
    if (!editingTask) return
    const response = await fetch(`/api/tasks/${editingTask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      toast.error(error.error || "Failed to update task")
      throw new Error(error.error)
    }
    const updatedTask = await response.json()
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    )
    setEditingTask(null)
    toast.success("Task updated")
  }

  const handleDeleteTask = async (taskId: string) => {
    if (isArchived) {
      toast.error("Cannot modify tasks in an archived project")
      return
    }
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "DELETE",
    })
    if (!response.ok) {
      const error = await response.json()
      toast.error(error.error || "Failed to delete task")
      return
    }
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    toast.success("Task deleted")
  }

  const handleStatusChange = async (taskId: string, newStatus: Status) => {
    if (isArchived) {
      toast.error("Cannot modify tasks in an archived project")
      return
    }
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!response.ok) {
      toast.error("Failed to update task")
      return
    }
    const updatedTask = await response.json()
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    )
  }

  const handleSubtaskToggle = async (subtaskId: string, done: boolean) => {
    if (isArchived) {
      toast.error("Cannot modify tasks in an archived project")
      return
    }
    const response = await fetch(`/api/subtasks/${subtaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    })
    if (!response.ok) {
      toast.error("Failed to update subtask")
      return
    }
    await fetchTasks()
  }

  const handleSubtaskAdd = async (taskId: string, title: string) => {
    if (isArchived) {
      toast.error("Cannot modify tasks in an archived project")
      return
    }
    const response = await fetch(`/api/tasks/${taskId}/subtasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
    if (!response.ok) {
      toast.error("Failed to add subtask")
      return
    }
    await fetchTasks()
    toast.success("Subtask added")
  }

  const handleSubtaskDelete = async (subtaskId: string) => {
    if (isArchived) {
      toast.error("Cannot modify tasks in an archived project")
      return
    }
    const response = await fetch(`/api/subtasks/${subtaskId}`, {
      method: "DELETE",
    })
    if (!response.ok) {
      toast.error("Failed to delete subtask")
      return
    }
    await fetchTasks()
    toast.success("Subtask deleted")
  }

  const handleCreateTag = async (name: string, color: string) => {
    const response = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    })
    if (!response.ok) {
      toast.error("Failed to create tag")
      return
    }
    const newTag = await response.json()
    setTags((prev) => [...prev, newTag])
    toast.success("Tag created")
  }

  const handleEditTask = (task: TaskWithRelations) => {
    if (isArchived) {
      toast.error("Cannot modify tasks in an archived project")
      return
    }
    setEditingTask(task)
    setIsTaskFormOpen(true)
  }

  const handleTaskFormClose = (open: boolean) => {
    setIsTaskFormOpen(open)
    if (!open) setEditingTask(null)
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
    { id: "tasks" as Tab, label: "Tasks", icon: CheckSquare, count: tasks.length },
  ]

  const canCreateTask = (project.isMember || isAdmin) && !isArchived

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
          <div className="space-y-4">
            {isArchived && (
              <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4 text-yellow-600 dark:text-yellow-400">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">This project is archived</span>
                </div>
                <p className="mt-1 text-sm opacity-80">
                  Tasks are read-only. No modifications allowed.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Project Tasks</h2>
              {canCreateTask && (
                <Button onClick={() => setIsTaskFormOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Task
                </Button>
              )}
            </div>

            <TaskList
              tasks={tasks}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onStatusChange={handleStatusChange}
              onSubtaskToggle={handleSubtaskToggle}
              onSubtaskAdd={handleSubtaskAdd}
              onSubtaskDelete={handleSubtaskDelete}
            />

            {!isArchived && (
              <TaskForm
                open={isTaskFormOpen}
                onOpenChange={handleTaskFormClose}
                task={editingTask}
                tags={tags}
                groups={[]}
                onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
                onCreateTag={handleCreateTag}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
