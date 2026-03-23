import { z } from "zod"

export const TaskStatusSchema = z.enum(["pending", "in_progress", "completed", "cancelled"])
export type TaskStatus = z.infer<typeof TaskStatusSchema>

export const TaskPrioritySchema = z.enum(["high", "medium", "low"])
export type TaskPriority = z.infer<typeof TaskPrioritySchema>

export const TaskSchema = z.object({
  id: z.string(),
  subject: z.string(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  content: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export type Task = z.infer<typeof TaskSchema>

export const TaskCreateInputSchema = z.object({
  subject: z.string(),
  content: z.string().optional(),
  priority: TaskPrioritySchema.default("medium"),
  status: TaskStatusSchema.default("pending"),
})

export type TaskCreateInput = z.infer<typeof TaskCreateInputSchema>

export const TaskListInputSchema = z.object({
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
})

export type TaskListInput = z.infer<typeof TaskListInputSchema>

export const TaskGetInputSchema = z.object({
  id: z.string(),
})

export type TaskGetInput = z.infer<typeof TaskGetInputSchema>

export const TaskUpdateInputSchema = z.object({
  id: z.string(),
  subject: z.string().optional(),
  content: z.string().optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
})

export type TaskUpdateInput = z.infer<typeof TaskUpdateInputSchema>
