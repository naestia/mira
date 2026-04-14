"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { taskSchema, TaskInput } from "@/lib/validations"
import { TaskWithRelations, Tag } from "@/types"

interface Group {
  id: string
  name: string
}

interface TaskFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: TaskWithRelations | null
  tags: Tag[]
  groups?: Group[]
  defaultGroupId?: string
  onSubmit: (data: TaskInput) => Promise<void>
  onCreateTag: (name: string, color: string) => Promise<void>
}

export function TaskForm({
  open,
  onOpenChange,
  task,
  tags,
  groups,
  defaultGroupId,
  onSubmit,
  onCreateTag,
}: TaskFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [date, setDate] = useState<Date | undefined>()
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState("#6366f1")
  const [showNewTag, setShowNewTag] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string>(defaultGroupId || "")

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      groupId: defaultGroupId || "",
    },
  })

  useEffect(() => {
    if (task) {
      setValue("title", task.title)
      setValue("description", task.description || "")
      setValue("status", task.status)
      setValue("priority", task.priority)
      setValue("groupId", task.groupId)
      setSelectedGroupId(task.groupId)
      setSelectedTagIds(task.tags.map((t) => t.id))
      setDate(task.dueDate ? new Date(task.dueDate) : undefined)
    } else {
      reset({
        title: "",
        description: "",
        status: "TODO",
        priority: "MEDIUM",
        groupId: defaultGroupId || (groups?.[0]?.id || ""),
      })
      setSelectedGroupId(defaultGroupId || (groups?.[0]?.id || ""))
      setSelectedTagIds([])
      setDate(undefined)
    }
  }, [task, setValue, reset, defaultGroupId, groups])

  const handleFormSubmit = async (data: TaskInput) => {
    setIsSubmitting(true)
    try {
      await onSubmit({
        ...data,
        // Only include groupId if one is selected (otherwise API defaults to personal group)
        groupId: selectedGroupId || undefined,
        dueDate: date ? date.toISOString() : null,
        tagIds: selectedTagIds,
      })
      onOpenChange(false)
      reset()
      setSelectedTagIds([])
      setDate(undefined)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateTag = async () => {
    if (newTagName.trim()) {
      await onCreateTag(newTagName.trim(), newTagColor)
      setNewTagName("")
      setShowNewTag(false)
    }
  }

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    )
  }

  const colors = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#14b8a6",
    "#06b6d4",
    "#3b82f6",
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" {...register("title")} />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          {!task && (
            <div className="space-y-2">
              <Label>Group</Label>
              <Select
                value={selectedGroupId || "personal"}
                onValueChange={(value) => {
                  if (value === "personal") {
                    setSelectedGroupId("")
                    setValue("groupId", undefined)
                  } else if (value) {
                    setSelectedGroupId(value)
                    setValue("groupId", value)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Personal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  {groups?.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              {...register("description")}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Add a description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={watch("status")}
                onValueChange={(value) =>
                  value && setValue("status", value as "TODO" | "IN_PROGRESS" | "DONE")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">To Do</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={watch("priority")}
                onValueChange={(value) =>
                  value && setValue(
                    "priority",
                    value as "LOW" | "MEDIUM" | "HIGH" | "URGENT"
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger
                className={cn(
                  "flex h-10 w-full items-center justify-start rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : "Pick a date"}
                {date && (
                  <X
                    className="ml-auto h-4 w-4 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDate(undefined)
                    }}
                  />
                )}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={selectedTagIds.includes(tag.id) ? "default" : "outline"}
                  className="cursor-pointer"
                  style={
                    selectedTagIds.includes(tag.id)
                      ? { backgroundColor: tag.color, color: "white" }
                      : {}
                  }
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </Badge>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNewTag(!showNewTag)}
              >
                + New Tag
              </Button>
            </div>
            {showNewTag && (
              <div className="flex items-center gap-2 mt-2">
                <Input
                  placeholder="Tag name"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="flex-1"
                />
                <div className="flex gap-1">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        "h-6 w-6 rounded-full border-2",
                        newTagColor === color
                          ? "border-foreground"
                          : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewTagColor(color)}
                    />
                  ))}
                </div>
                <Button type="button" size="sm" onClick={handleCreateTag}>
                  Add
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : task ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
