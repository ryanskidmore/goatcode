import type { ToolDefinition } from "@opencode-ai/plugin";
import { z } from "zod";
import { log } from "../../../shared/logger";
import { buildTool } from "../../tool-builder";
import { taskStore } from "../storage";
import { TaskUpdateInputSchema } from "../types";
import { formatTask } from "../format-task";

const argsSchema = z.object({
  id: z.string(),
  subject: z.string().optional(),
  content: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
});

export const taskUpdateTool: ToolDefinition = buildTool({
  description:
    "Update an existing task by ID. Accepts optional subject, content, status (pending/in_progress/completed/cancelled), and priority (high/medium/low). Returns the updated task, or an error if not found.",
  args: argsSchema.shape as unknown as ToolDefinition["args"],
  execute: async (args) => {
    try {
      const parsed = TaskUpdateInputSchema.parse(args);
      const task = taskStore.get(parsed.id);

      if (!task) {
        log("task_update: task not found", { id: parsed.id });
        return `Error: task not found: ${parsed.id}`;
      }

      if (parsed.subject !== undefined) {
        task.subject = parsed.subject;
      }
      if (parsed.content !== undefined) {
        task.content = parsed.content;
      }
      if (parsed.status !== undefined) {
        task.status = parsed.status;
      }
      if (parsed.priority !== undefined) {
        task.priority = parsed.priority;
      }
      task.updatedAt = Date.now();

      taskStore.set(task.id, task);
      log("task_update: updated task", { id: task.id });
      return formatTask(task);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log("task_update: error", { error: message });
      return `Error: ${message}`;
    }
  },
});
