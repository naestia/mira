"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Loader2, X } from "lucide-react"
import { TaskWithRelations, Label } from "@/types"
import { BoardColumn } from "./BoardColumn"
import { BoardCard } from "./BoardCard"

const NONE = "none"

interface ProjectBoardProps {
  projectId: string
  canEdit: boolean
  isArchived: boolean
  tasks: TaskWithRelations[]
  onEditTask: (task: TaskWithRelations) => void
  onTasksChanged: () => void
}

type Columns = Record<string, TaskWithRelations[]>

function buildColumns(tasks: TaskWithRelations[], labels: Label[]): Columns {
  const cols: Columns = { [NONE]: [] }
  labels.forEach((l) => {
    cols[l.id] = []
  })
  const sorted = [...tasks].sort(
    (a, b) =>
      a.position - b.position ||
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  sorted.forEach((t) => {
    const col = t.labelId && cols[t.labelId] ? t.labelId : NONE
    cols[col].push(t)
  })
  return cols
}

export function ProjectBoard({
  projectId,
  canEdit,
  isArchived,
  tasks,
  onEditTask,
  onTasksChanged,
}: ProjectBoardProps) {
  const [labels, setLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(true)
  const [columns, setColumns] = useState<Columns>({ [NONE]: [] })
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null)
  const [addingLabel, setAddingLabel] = useState(false)
  const [newLabelName, setNewLabelName] = useState("")

  const draggingRef = useRef(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const fetchLabels = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/labels`)
      if (!res.ok) throw new Error()
      setLabels(await res.json())
    } catch {
      toast.error("Failed to load board labels")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchLabels()
  }, [fetchLabels])

  // Rebuild the board from authoritative props whenever tasks/labels change —
  // but never mid-drag, or we'd yank the card out from under the cursor.
  useEffect(() => {
    if (draggingRef.current) return
    setColumns(buildColumns(tasks, labels))
  }, [tasks, labels])

  const columnList = useMemo(() => {
    const ordered = [...labels].sort((a, b) => a.position - b.position)
    const list: { id: string; label: Label | null }[] = []
    // Only show the catch-all "No label" column when it actually holds cards.
    if ((columns[NONE]?.length ?? 0) > 0) list.push({ id: NONE, label: null })
    ordered.forEach((l) => list.push({ id: l.id, label: l }))
    return list
  }, [labels, columns])

  const findContainer = useCallback(
    (id: string): string | undefined => {
      if (id in columns) return id
      return Object.keys(columns).find((col) => columns[col].some((t) => t.id === id))
    },
    [columns]
  )

  const persistMove = useCallback(
    async (taskId: string, columnId: string, orderedTaskIds: string[]) => {
      try {
        const res = await fetch(`/api/projects/${projectId}/board/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId,
            toLabelId: columnId === NONE ? null : columnId,
            orderedTaskIds,
          }),
        })
        if (!res.ok) throw new Error()
      } catch {
        toast.error("Failed to move task")
      } finally {
        onTasksChanged()
      }
    },
    [projectId, onTasksChanged]
  )

  const handleDragStart = (event: DragStartEvent) => {
    draggingRef.current = true
    const id = String(event.active.id)
    const container = findContainer(id)
    const task = container ? columns[container].find((t) => t.id === id) : null
    setActiveTask(task ?? null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    const activeContainer = findContainer(activeId)
    const overContainer = findContainer(overId)
    if (!activeContainer || !overContainer || activeContainer === overContainer) return

    setColumns((prev) => {
      const activeItems = prev[activeContainer]
      const overItems = prev[overContainer]
      const moved = activeItems.find((t) => t.id === activeId)
      if (!moved) return prev
      const overIndex = overItems.findIndex((t) => t.id === overId)
      const insertAt = overId in prev ? overItems.length : overIndex >= 0 ? overIndex : overItems.length
      return {
        ...prev,
        [activeContainer]: activeItems.filter((t) => t.id !== activeId),
        [overContainer]: [
          ...overItems.slice(0, insertAt),
          moved,
          ...overItems.slice(insertAt),
        ],
      }
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    draggingRef.current = false
    setActiveTask(null)
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)
    const container = findContainer(activeId)
    if (!container) return

    const items = columns[container]
    const oldIndex = items.findIndex((t) => t.id === activeId)
    let newIndex = items.length - 1
    if (!(overId in columns)) {
      const idx = items.findIndex((t) => t.id === overId)
      if (idx >= 0) newIndex = idx
    }

    const reordered = oldIndex === newIndex ? items : arrayMove(items, oldIndex, newIndex)
    setColumns((prev) => ({ ...prev, [container]: reordered }))
    persistMove(activeId, container, reordered.map((t) => t.id))
  }

  // ---- Label CRUD ----------------------------------------------------------
  const addLabel = async () => {
    const name = newLabelName.trim()
    if (!name) return
    try {
      const res = await fetch(`/api/projects/${projectId}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error()
      const label = await res.json()
      setLabels((prev) => [...prev, label])
      setNewLabelName("")
      setAddingLabel(false)
    } catch {
      toast.error("Failed to add label")
    }
  }

  const patchLabel = async (id: string, data: { name?: string; color?: string }) => {
    setLabels((prev) => prev.map((l) => (l.id === id ? { ...l, ...data } : l)))
    try {
      const res = await fetch(`/api/labels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
    } catch {
      toast.error("Failed to update label")
      fetchLabels()
    }
  }

  const deleteLabel = async (id: string) => {
    try {
      const res = await fetch(`/api/labels/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setLabels((prev) => prev.filter((l) => l.id !== id))
      onTasksChanged()
    } catch {
      toast.error("Failed to delete label")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const boardEditable = canEdit && !isArchived

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columnList.map(({ id, label }) => (
          <BoardColumn
            key={id}
            columnId={id}
            label={label}
            tasks={columns[id] ?? []}
            canEdit={boardEditable}
            onEditTask={onEditTask}
            onRenameLabel={(lid, name) => patchLabel(lid, { name })}
            onRecolorLabel={(lid, color) => patchLabel(lid, { color })}
            onDeleteLabel={deleteLabel}
          />
        ))}

        {boardEditable && (
          <div className="w-72 shrink-0">
            {addingLabel ? (
              <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card/60 p-1.5 backdrop-blur-md">
                <Input
                  autoFocus
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addLabel()
                    if (e.key === "Escape") {
                      setAddingLabel(false)
                      setNewLabelName("")
                    }
                  }}
                  placeholder="Label name"
                  className="h-8"
                />
                <Button size="sm" onClick={addLabel} className="h-8">
                  Add
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => {
                    setAddingLabel(false)
                    setNewLabelName("")
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground"
                onClick={() => setAddingLabel(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add label
              </Button>
            )}
          </div>
        )}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="w-72 rotate-2">
            <BoardCard task={activeTask} onEdit={() => {}} disabled />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
