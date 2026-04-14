"use client"

import { Suspense, useEffect, useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { TaskList } from "@/components/tasks/TaskList"
import { TaskFilters } from "@/components/tasks/TaskFilters"
import { TaskForm } from "@/components/tasks/TaskForm"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { TaskWithRelations, Tag, Status } from "@/types"
import { TaskInput } from "@/lib/validations"

interface Group {
  id: string
  name: string
  memberCount: number
  taskCount: number
  myPermissions: number
}

function TasksContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null)

  // Filter state from URL params
  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [status, setStatus] = useState(searchParams.get("status") || "all")
  const [priority, setPriority] = useState(searchParams.get("priority") || "all")
  const [tagId, setTagId] = useState(searchParams.get("tagId") || "all")
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "createdAt-desc")

  const updateUrlParams = useCallback(
    (params: Record<string, string>) => {
      const newParams = new URLSearchParams(searchParams.toString())
      Object.entries(params).forEach(([key, value]) => {
        if (value && value !== "all") {
          newParams.set(key, value)
        } else {
          newParams.delete(key)
        }
      })
      router.push(`/tasks?${newParams.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  const fetchGroups = useCallback(async () => {
    try {
      const response = await fetch("/api/groups?filter=my")
      if (!response.ok) throw new Error("Failed to fetch groups")
      const data = await response.json()
      setGroups(data)
    } catch (error) {
      // Groups are required now
    }
  }, [])

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (status !== "all") params.set("status", status)
      if (priority !== "all") params.set("priority", priority)
      if (tagId !== "all") params.set("tagId", tagId)
      if (search) params.set("search", search)
      const [sortField, sortOrder] = sortBy.split("-")
      params.set("sortBy", sortField)
      params.set("sortOrder", sortOrder)

      const response = await fetch(`/api/tasks?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch tasks")
      const data = await response.json()
      setTasks(data)
    } catch (error) {
      toast.error("Failed to fetch tasks")
    }
  }, [status, priority, tagId, search, sortBy])

  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch("/api/tags")
      if (!response.ok) throw new Error("Failed to fetch tags")
      const data = await response.json()
      setTags(data)
    } catch (error) {
      // Tags are optional
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchGroups(), fetchTasks(), fetchTags()])
      setIsLoading(false)
    }
    loadData()
  }, [fetchGroups, fetchTasks, fetchTags])

  const handleCreateTask = async (data: TaskInput) => {
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">
            {groups.length > 0
              ? `Tasks across personal and ${groups.length} shared group${groups.length !== 1 ? "s" : ""}`
              : "Your personal tasks"}
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      <TaskFilters
        search={search}
        onSearchChange={(value) => {
          setSearch(value)
          updateUrlParams({ search: value })
        }}
        status={status}
        onStatusChange={(value) => {
          setStatus(value)
          updateUrlParams({ status: value })
        }}
        priority={priority}
        onPriorityChange={(value) => {
          setPriority(value)
          updateUrlParams({ priority: value })
        }}
        tagId={tagId}
        onTagChange={(value) => {
          setTagId(value)
          updateUrlParams({ tagId: value })
        }}
        sortBy={sortBy}
        onSortByChange={(value) => {
          setSortBy(value)
          updateUrlParams({ sortBy: value })
        }}
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

      <TaskForm
        open={isFormOpen}
        onOpenChange={handleFormClose}
        task={editingTask}
        tags={tags}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        onCreateTag={handleCreateTag}
      />
    </div>
  )
}

function TasksLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">Manage your work tasks</p>
        </div>
      </div>
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </div>
  )
}

export default function TasksPage() {
  return (
    <Suspense fallback={<TasksLoading />}>
      <TasksContent />
    </Suspense>
  )
}
