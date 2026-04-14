"use client"

import { TaskCard } from "./TaskCard"
import { TaskWithRelations, Status } from "@/types"
import { FileX } from "lucide-react"

interface TaskListProps {
  tasks: TaskWithRelations[]
  onEdit: (task: TaskWithRelations) => void
  onDelete: (taskId: string) => void
  onStatusChange: (taskId: string, status: Status) => void
  onSubtaskToggle: (subtaskId: string, done: boolean) => void
  onSubtaskAdd: (taskId: string, title: string) => void
  onSubtaskDelete: (subtaskId: string) => void
}

export function TaskList({
  tasks,
  onEdit,
  onDelete,
  onStatusChange,
  onSubtaskToggle,
  onSubtaskAdd,
  onSubtaskDelete,
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileX className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No tasks found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Create a new task to get started
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          onSubtaskToggle={onSubtaskToggle}
          onSubtaskAdd={onSubtaskAdd}
          onSubtaskDelete={onSubtaskDelete}
        />
      ))}
    </div>
  )
}
