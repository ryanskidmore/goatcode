import type { ToolDefinition } from "@opencode-ai/plugin";
import { z } from "zod";
import { log } from "../../../shared/logger";
import { buildTool } from "../../tool-builder";
import { taskStore, generateTaskId } from "../storage";
import { TaskCreateInputSchema } from "../types";
import { formatTask } from "../format-task";
import type { Task } from "../types";

const argsSchema = z.object({
  subject: z.string(),
  content: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
});

export const taskCreateTool: ToolDefinition = buildTool({
  description:
    "Create a new task. Accepts subject (required), optional content, optional priority (high/medium/low, default medium), optional status (pending/in_progress/completed/cancelled, default pending). Returns the created task.",
  args: argsSchema.shape as unknown as ToolDefinition["args"],
  execute: async (args) => {
    try {
      const parsed = TaskCreateInputSchema.parse(args);
      const now = Date.now();
      const task: Task = {
        id: generateTaskId(),
        subject: parsed.subject,
        status: parsed.status,
        priority: parsed.priority,
        content: parsed.content,
        createdAt: now,
        updatedAt: now,
      };
      taskStore.set(task.id, task);
      log("task_create: created task", { id: task.id });
      return formatTask(task);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log("task_create: error", { error: message });
      return `Error: ${message}`;
    }
  },
});
