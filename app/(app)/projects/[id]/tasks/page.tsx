"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { TaskList } from "@/components/tasks/TaskList"
import { TaskFilters } from "@/components/tasks/TaskFilters"
import { TaskForm } from "@/components/tasks/TaskForm"
import { Plus, Loader2, ArrowLeft, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { TaskWithRelations, Tag, Status } from "@/types"
import { TaskInput } from "@/lib/validations"

interface Project {
  id: string
  name: string
  status: "ACTIVE" | "ARCHIVED"
  myRole?: "MEMBER" | "MANAGER" | "OWNER" | null
  isMember: boolean
}

export default function ProjectTasksPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null)

  // Filter state
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [priority, setPriority] = useState("all")
  const [tagId, setTagId] = useState("all")
  const [sortBy, setSortBy] = useState("createdAt-desc")

  const isAdmin = session?.user?.role === "ADMIN"
  const isArchived = project?.status === "ARCHIVED"
  const canCreate = (project?.isMember || isAdmin) && !isArchived

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

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (status !== "all") params.set("status", status)
      if (priority !== "all") params.set("priority", priority)
      if (search) params.set("search", search)

      const response = await fetch(
        `/api/projects/${projectId}/tasks?${params.toString()}`
      )
      if (!response.ok) throw new Error("Failed to fetch tasks")
      const data = await response.json()
      setTasks(data)
    } catch {
      toast.error("Failed to fetch tasks")
    }
  }, [projectId, status, priority, search])

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
    const loadData = async () => {
      setIsLoading(true)
      const proj = await fetchProject()
      if (proj) {
        await Promise.all([fetchTasks(), fetchTags()])
      }
      setIsLoading(false)
    }
    loadData()
  }, [fetchProject, fetchTasks, fetchTags])

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

  const handleEdit = (task: TaskWithRelations) => {
    if (isArchived) {
      toast.error("Cannot modify tasks in an archived project")
      return
    }
    setEditingTask(task)
    setIsFormOpen(true)
  }

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open)
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
            Tasks are read-only. No modifications allowed.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Project Tasks</h1>
          <p className="text-muted-foreground">
            Tasks for {project.name}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        )}
      </div>

      <TaskFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        priority={priority}
        onPriorityChange={setPriority}
        tagId={tagId}
        onTagChange={setTagId}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        tags={tags}
      />

      <TaskList
        tasks={tasks}
        onEdit={handleEdit}
        onDelete={handleDeleteTask}
        onStatusChange={handleStatusChange}
        onSubtaskToggle={handleSubtaskToggle}
        onSubtaskAdd={handleSubtaskAdd}
        onSubtaskDelete={handleSubtaskDelete}
      />

      {!isArchived && (
        <TaskForm
          open={isFormOpen}
          onOpenChange={handleFormClose}
          task={editingTask}
          tags={tags}
          groups={[]}
          onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
          onCreateTag={handleCreateTag}
        />
      )}
    </div>
  )
}
