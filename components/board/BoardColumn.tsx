"use client"

import { useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Trash2, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { TaskWithRelations, Label, Status } from "@/types"
import { BoardCard } from "./BoardCard"

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "DONE", label: "Done" },
]

interface BoardColumnProps {
  columnId: string
  label: Label | null
  tasks: TaskWithRelations[]
  canEdit: boolean
  onEditTask: (task: TaskWithRelations) => void
  onRenameLabel: (id: string, name: string) => void
  onRecolorLabel: (id: string, color: string) => void
  onSetLabelStatus: (id: string, status: Status) => void
  onDeleteLabel: (id: string) => void
}

export function BoardColumn({
  columnId,
  label,
  tasks,
  canEdit,
  onEditTask,
  onRenameLabel,
  onRecolorLabel,
  onSetLabelStatus,
  onDeleteLabel,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId })
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(label?.name ?? "")

  const dotColor = label?.color ?? "#7c7263"
  const isRealLabel = !!label

  const commitRename = () => {
    setRenaming(false)
    const next = draft.trim()
    if (label && next && next !== label.name) onRenameLabel(label.id, next)
    else setDraft(label?.name ?? "")
  }

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        {canEdit && label ? (
          <input
            type="color"
            value={label.color}
            onChange={(e) => onRecolorLabel(label.id, e.target.value)}
            aria-label="Label color"
            className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
          />
        ) : (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: dotColor }}
          />
        )}

        {renaming && label ? (
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename()
              if (e.key === "Escape") {
                setRenaming(false)
                setDraft(label.name)
              }
            }}
            className="h-7 py-0 text-sm font-semibold"
          />
        ) : (
          <button
            type="button"
            disabled={!canEdit || !isRealLabel}
            onClick={() => isRealLabel && canEdit && setRenaming(true)}
            className={cn(
              "truncate text-sm font-semibold",
              canEdit && isRealLabel && "hover:text-muted-foreground"
            )}
          >
            {label?.name ?? "No label"}
          </button>
        )}

        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {tasks.length}
        </span>

        {canEdit && isRealLabel && (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Marks tasks as
              </DropdownMenuLabel>
              {STATUS_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => onSetLabelStatus(label!.id, opt.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      label!.status === opt.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {opt.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDeleteLabel(label!.id)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete label
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 rounded-xl border border-dashed border-transparent p-1.5 transition-colors",
          isOver && "border-border bg-muted/40"
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <BoardCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              disabled={!canEdit}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground/70">
            Drop tasks here
          </p>
        )}
      </div>
    </div>
  )
}
