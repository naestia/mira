"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { format, isPast, isToday } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Calendar, GripVertical, ListChecks } from "lucide-react"
import { cn } from "@/lib/utils"
import { TaskWithRelations, Priority } from "@/types"

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

interface BoardCardProps {
  task: TaskWithRelations
  onEdit: (task: TaskWithRelations) => void
  disabled?: boolean
}

export function BoardCard({ task, onEdit, disabled }: BoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  const completed = task.subtasks.filter((s) => s.done).length
  const total = task.subtasks.length
  const isOverdue =
    task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "DONE"
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate))

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/bc rounded-xl border border-border bg-card p-3 text-card-foreground shadow-sm ring-1 ring-foreground/[0.06]",
        "backdrop-blur-md transition-shadow hover:shadow-md",
        isDragging && "opacity-50",
        task.status === "DONE" && "opacity-70"
      )}
    >
      <div className="flex items-start gap-1.5">
        {!disabled && (
          <button
            type="button"
            className="mt-0.5 cursor-grab touch-none text-muted-foreground/50 opacity-0 transition-opacity group-hover/bc:opacity-100 active:cursor-grabbing"
            aria-label="Drag task"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="min-w-0 flex-1 text-left"
        >
          <h4
            className={cn(
              "text-sm font-medium leading-snug",
              task.status === "DONE" && "text-muted-foreground line-through"
            )}
          >
            {task.title}
          </h4>
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-6">
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
            {format(new Date(task.dueDate), "MMM d")}
          </Badge>
        )}
        {total > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ListChecks className="h-3.5 w-3.5" />
            {completed}/{total}
          </span>
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
    </div>
  )
}
