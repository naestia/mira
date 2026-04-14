"use client"

import { useState } from "react"
import { format, isPast, isToday } from "date-fns"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Calendar,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TaskWithRelations, Status, Priority } from "@/types"
import { SubtaskList } from "./SubtaskList"

const statusColors: Record<Status, string> = {
  TODO: "bg-slate-500",
  IN_PROGRESS: "bg-blue-500",
  DONE: "bg-green-500",
}

const priorityColors: Record<Priority, string> = {
  LOW: "bg-slate-400",
  MEDIUM: "bg-yellow-500",
  HIGH: "bg-orange-500",
  URGENT: "bg-red-500",
}

const priorityLabels: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
}

const statusLabels: Record<Status, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
}

interface TaskCardProps {
  task: TaskWithRelations
  onEdit: (task: TaskWithRelations) => void
  onDelete: (taskId: string) => void
  onStatusChange: (taskId: string, status: Status) => void
  onSubtaskToggle: (subtaskId: string, done: boolean) => void
  onSubtaskAdd: (taskId: string, title: string) => void
  onSubtaskDelete: (subtaskId: string) => void
}

export function TaskCard({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  onSubtaskToggle,
  onSubtaskAdd,
  onSubtaskDelete,
}: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const completedSubtasks = task.subtasks.filter((s) => s.done).length
  const totalSubtasks = task.subtasks.length

  const isOverdue =
    task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "DONE"
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate))

  return (
    <Card
      className={cn(
        "transition-shadow hover:shadow-md",
        task.status === "DONE" && "opacity-60"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Checkbox
              checked={task.status === "DONE"}
              onCheckedChange={(checked) =>
                onStatusChange(task.id, checked ? "DONE" : "TODO")
              }
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <h3
                className={cn(
                  "font-medium leading-tight",
                  task.status === "DONE" && "line-through text-muted-foreground"
                )}
              >
                {task.title}
              </h3>
              {task.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-8 w-8 hover:bg-accent hover:text-accent-foreground">
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onStatusChange(task.id, "TODO")}>
                Set as To Do
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onStatusChange(task.id, "IN_PROGRESS")}
              >
                Set as In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(task.id, "DONE")}>
                Set as Done
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(task.id)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Badge variant="outline" className={cn("text-white", statusColors[task.status])}>
            {statusLabels[task.status]}
          </Badge>
          <Badge variant="outline" className={cn("text-white", priorityColors[task.priority])}>
            {priorityLabels[task.priority]}
          </Badge>
          {task.dueDate && (
            <Badge
              variant="outline"
              className={cn(
                isOverdue && "border-red-500 text-red-500",
                isDueToday && !isOverdue && "border-yellow-500 text-yellow-500"
              )}
            >
              <Calendar className="mr-1 h-3 w-3" />
              {format(new Date(task.dueDate), "MMM d, yyyy")}
            </Badge>
          )}
          {task.tags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              style={{ backgroundColor: tag.color, color: "white" }}
            >
              {tag.name}
            </Badge>
          ))}
        </div>

        {totalSubtasks > 0 && (
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-auto font-normal text-muted-foreground"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="mr-1 h-4 w-4" />
              ) : (
                <ChevronDown className="mr-1 h-4 w-4" />
              )}
              {completedSubtasks}/{totalSubtasks} subtasks
            </Button>
            {isExpanded && (
              <SubtaskList
                subtasks={task.subtasks}
                taskId={task.id}
                onToggle={onSubtaskToggle}
                onAdd={onSubtaskAdd}
                onDelete={onSubtaskDelete}
              />
            )}
          </div>
        )}

        {totalSubtasks === 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 p-0 h-auto font-normal text-muted-foreground"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Hide subtasks" : "Add subtasks"}
          </Button>
        )}

        {isExpanded && totalSubtasks === 0 && (
          <SubtaskList
            subtasks={[]}
            taskId={task.id}
            onToggle={onSubtaskToggle}
            onAdd={onSubtaskAdd}
            onDelete={onSubtaskDelete}
          />
        )}
      </CardContent>
    </Card>
  )
}
