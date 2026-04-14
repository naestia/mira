"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Subtask } from "@/types"

interface SubtaskListProps {
  subtasks: Subtask[]
  taskId: string
  onToggle: (subtaskId: string, done: boolean) => void
  onAdd: (taskId: string, title: string) => void
  onDelete: (subtaskId: string) => void
}

export function SubtaskList({
  subtasks,
  taskId,
  onToggle,
  onAdd,
  onDelete,
}: SubtaskListProps) {
  const [newSubtask, setNewSubtask] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = () => {
    if (newSubtask.trim()) {
      onAdd(taskId, newSubtask.trim())
      setNewSubtask("")
      setIsAdding(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAdd()
    } else if (e.key === "Escape") {
      setNewSubtask("")
      setIsAdding(false)
    }
  }

  return (
    <div className="mt-2 space-y-2">
      {subtasks.map((subtask) => (
        <div
          key={subtask.id}
          className="flex items-center gap-2 group"
        >
          <Checkbox
            checked={subtask.done}
            onCheckedChange={(checked) =>
              onToggle(subtask.id, checked as boolean)
            }
          />
          <span
            className={cn(
              "flex-1 text-sm",
              subtask.done && "line-through text-muted-foreground"
            )}
          >
            {subtask.title}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onDelete(subtask.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}

      {isAdding ? (
        <div className="flex items-center gap-2">
          <Input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Subtask title..."
            className="h-8 text-sm"
            autoFocus
          />
          <Button size="sm" onClick={handleAdd}>
            Add
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setNewSubtask("")
              setIsAdding(false)
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add subtask
        </Button>
      )}
    </div>
  )
}
