"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { TaskList } from "@/components/tasks/TaskList"
import { TaskFilters } from "@/components/tasks/TaskFilters"
import { TaskForm } from "@/components/tasks/TaskForm"
import { Badge } from "@/components/ui/badge"
import { Plus, Loader2, Users, Settings, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { TaskWithRelations, Tag, Status } from "@/types"
import { TaskInput } from "@/lib/validations"
import { hasPermission, Permissions } from "@/lib/permissions"

interface Group {
  id: string
  name: string
  description?: string | null
  memberCount: number
  taskCount: number
  myPermissions: number
}

export default function GroupTaskBoardPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string

  const [group, setGroup] = useState<Group | null>(null)
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

  const canCreate = group ? hasPermission(group.myPermissions, Permissions.CREATE) : false
  const canManage = group ? hasPermission(group.myPermissions, Permissions.MANAGE_MEMBERS) : false

  const fetchGroup = useCallback(async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}`)
      if (!response.ok) {
        if (response.status === 403 || response.status === 404) {
          router.push("/groups")
          return
        }
        throw new Error("Failed to fetch group")
      }
      const data = await response.json()
      setGroup(data)
    } catch (error) {
      toast.error("Failed to fetch group")
      router.push("/groups")
    }
  }, [groupId, router])

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.set("groupId", groupId)
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
  }, [groupId, status, priority, tagId, search, sortBy])

  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch("/api/tags")
      if (!response.ok) throw new Error("Failed to fetch tags")
      const data = await response.json()
      setTags(data)
    } catch (error) {
      // Tags are optional, don't show error
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await fetchGroup()
      await Promise.all([fetchTasks(), fetchTags()])
      setIsLoading(false)
    }
    loadData()
  }, [fetchGroup, fetchTasks, fetchTags])

  const handleCreateTask = async (data: TaskInput) => {
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, groupId }),
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

  if (!group) {
    return null
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/groups" />}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{group.name}</h1>
            <Badge variant="secondary">
              <Users className="h-3 w-3 mr-1" />
              {group.memberCount}
            </Badge>
          </div>
          {group.description && (
            <p className="text-muted-foreground">{group.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <Button variant="outline" nativeButton={false} render={<Link href={`/groups/${groupId}/members`} />}>
                <Users className="mr-2 h-4 w-4" />
                Members
              </Button>
              <Button variant="outline" nativeButton={false} render={<Link href={`/groups/${groupId}/settings`} />}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </>
          )}
          {canCreate && (
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          )}
        </div>
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

      <TaskForm
        open={isFormOpen}
        onOpenChange={handleFormClose}
        task={editingTask}
        tags={tags}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        onCreateTag={handleCreateTag}
      />
    </div>
  )
}
