import { Task, Subtask, Tag, User, Status, Priority, Role, Group, GroupMembership, JoinRequest, JoinRequestStatus } from "@prisma/client"

export type { Task, Subtask, Tag, User, Status, Priority, Role, Group, GroupMembership, JoinRequest, JoinRequestStatus }

export type TaskWithRelations = Task & {
  subtasks: Subtask[]
  tags: Tag[]
}

export type TaskCreateInput = {
  title: string
  description?: string
  status?: Status
  priority?: Priority
  dueDate?: string | null
  tagIds?: string[]
  subtasks?: { title: string }[]
}

export type TaskUpdateInput = Partial<TaskCreateInput>

export type SubtaskCreateInput = {
  title: string
  taskId: string
}

export type TagCreateInput = {
  name: string
  color?: string
}
