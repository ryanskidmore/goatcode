import type { ToolDefinition } from "@opencode-ai/plugin"
import { z } from "zod"
import { log } from "../../../shared/logger"
import { buildTool } from "../../tool-builder"
import { taskStore } from "../storage"
import { TaskListInputSchema } from "../types"
import type { Task } from "../types"

const argsSchema = z.object({
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
})

function formatTaskLine(task: Task): string {
  const content = task.content ? ` | ${task.content}` : ""
  return `[${task.id}] ${task.subject} (${task.status}, ${task.priority})${content}`
}

export const taskListTool: ToolDefinition = buildTool({
  description:
    "List tasks. Accepts optional status filter (pending/in_progress/completed/cancelled) and optional priority filter (high/medium/low). Returns a formatted list of matching tasks.",
  args: argsSchema.shape as unknown as ToolDefinition["args"],
  execute: async (args) => {
    try {
      const parsed = TaskListInputSchema.parse(args)
      let tasks = Array.from(taskStore.values())

      if (parsed.status !== undefined) {
        tasks = tasks.filter((t) => t.status === parsed.status)
      }
      if (parsed.priority !== undefined) {
        tasks = tasks.filter((t) => t.priority === parsed.priority)
      }

      if (tasks.length === 0) {
        return "No tasks found."
      }

      const lines = tasks.map(formatTaskLine)
      log("task_list: listed tasks", { count: tasks.length })
      return lines.join("\n")
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log("task_list: error", { error: message })
      return `Error: ${message}`
    }
  },
})
