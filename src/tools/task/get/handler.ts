import type { ToolDefinition } from "@opencode-ai/plugin";
import { z } from "zod";
import { log } from "../../../shared/logger";
import { buildTool } from "../../tool-builder";
import { taskStore } from "../storage";
import { TaskGetInputSchema } from "../types";
import { formatTask } from "../format-task";

const argsSchema = z.object({
  id: z.string(),
});

export const taskGetTool: ToolDefinition = buildTool({
  description:
    "Get a task by ID. Returns full task details including subject, status, priority, content, and timestamps. Returns an error message if the task is not found.",
  args: argsSchema.shape as unknown as ToolDefinition["args"],
  execute: async (args) => {
    try {
      const parsed = TaskGetInputSchema.parse(args);
      const task = taskStore.get(parsed.id);

      if (!task) {
        log("task_get: task not found", { id: parsed.id });
        return `Error: task not found: ${parsed.id}`;
      }

      log("task_get: retrieved task", { id: task.id });
      return formatTask(task);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log("task_get: error", { error: message });
      return `Error: ${message}`;
    }
  },
});
