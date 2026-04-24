import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
})

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  description: z.string().max(5000, "Description too long").optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
  subtasks: z.array(z.object({ title: z.string().min(1) })).optional(),
  groupId: z.string().optional(),
})

export const taskUpdateSchema = taskSchema.partial()

export const subtaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  taskId: z.string(),
})

export const subtaskUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  done: z.boolean().optional(),
})

export const tagSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name too long"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").optional(),
})

// Admin validations
export const adminUserCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["USER", "ADMIN", "REPORTER"]).optional(),
})

export const adminUserUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["USER", "ADMIN", "REPORTER"]).optional(),
  active: z.boolean().optional(),
})

export const appSettingsUpdateSchema = z.object({
  allow_registration: z.enum(["true", "false"]).optional(),
  default_task_limit: z.string().regex(/^\d+$/, "Must be a number").optional(),
})

// Incident validations
export const incidentCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  description: z.string().max(5000, "Description too long").optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
})

export const incidentUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional().nullable(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  status: z.enum(["OPEN", "INVESTIGATING", "RESOLVED"]).optional(),
  assigneeId: z.string().nullable().optional(),
})

export const timelineNoteSchema = z.object({
  message: z.string().min(1, "Message is required").max(2000, "Message too long"),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type TaskInput = z.infer<typeof taskSchema>
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>
export type SubtaskInput = z.infer<typeof subtaskSchema>
export type SubtaskUpdateInput = z.infer<typeof subtaskUpdateSchema>
export type TagInput = z.infer<typeof tagSchema>
export type AdminUserCreateInput = z.infer<typeof adminUserCreateSchema>
export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>
export type AppSettingsUpdateInput = z.infer<typeof appSettingsUpdateSchema>
export type IncidentCreateInput = z.infer<typeof incidentCreateSchema>
export type IncidentUpdateInput = z.infer<typeof incidentUpdateSchema>
export type TimelineNoteInput = z.infer<typeof timelineNoteSchema>
