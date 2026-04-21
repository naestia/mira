"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, X } from "lucide-react"
import { Tag } from "@/types"

interface TaskFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  status: string
  onStatusChange: (value: string) => void
  priority: string
  onPriorityChange: (value: string) => void
  tagId: string
  onTagChange: (value: string) => void
  sortBy: string
  onSortByChange: (value: string) => void
  tags: Tag[]
}

export function TaskFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  tagId,
  onTagChange,
  sortBy,
  onSortByChange,
  tags,
}: TaskFiltersProps) {
  const hasFilters = search || status !== "all" || priority !== "all" || tagId !== "all"

  const statusLabels: Record<string, string> = {
    all: "All Status",
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    DONE: "Done",
  }

  const priorityLabels: Record<string, string> = {
    all: "All Priority",
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    URGENT: "Urgent",
  }

  const sortLabels: Record<string, string> = {
    "createdAt-desc": "Newest first",
    "createdAt-asc": "Oldest first",
    "dueDate-asc": "Due date (asc)",
    "dueDate-desc": "Due date (desc)",
    "priority-desc": "Priority (high)",
    "priority-asc": "Priority (low)",
  }

  const getTagLabel = (id: string) => {
    if (id === "all") return "All Tags"
    return tags.find((t) => t.id === id)?.name || "Select tag"
  }

  const clearFilters = () => {
    onSearchChange("")
    onStatusChange("all")
    onPriorityChange("all")
    onTagChange("all")
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={status} onValueChange={(v) => v && onStatusChange(v)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue>{statusLabels[status]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="TODO">To Do</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="DONE">Done</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priority} onValueChange={(v) => v && onPriorityChange(v)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue>{priorityLabels[priority]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tagId} onValueChange={(v) => v && onTagChange(v)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue>{getTagLabel(tagId)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {tags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => v && onSortByChange(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue>{sortLabels[sortBy]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">Newest first</SelectItem>
              <SelectItem value="createdAt-asc">Oldest first</SelectItem>
              <SelectItem value="dueDate-asc">Due date (asc)</SelectItem>
              <SelectItem value="dueDate-desc">Due date (desc)</SelectItem>
              <SelectItem value="priority-desc">Priority (high)</SelectItem>
              <SelectItem value="priority-asc">Priority (low)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-4 w-4" />
          Clear filters
        </Button>
      )}
    </div>
  )
}
