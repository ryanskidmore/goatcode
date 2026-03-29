import type { OpenCodeContext } from "../../../types/plugin";
import type { BackgroundAgentManager } from "../../../runtime";
import { log } from "../../../shared/logger";
import type { BackgroundCancelArgs } from "./types";

export async function handleBackgroundCancel(
  manager: BackgroundAgentManager,
  ctx: OpenCodeContext,
  args: BackgroundCancelArgs,
): Promise<string> {
  log("[background-cancel] called", { task_id: args.task_id, all: args.all });

  const cancelAll = args.all === true;

  if (!cancelAll && !args.task_id) {
    return "[ERROR] Invalid arguments: provide a task_id or set all=true to cancel all running tasks.";
  }

  if (cancelAll) {
    const tasks = manager.getAll();
    const cancellable = tasks.filter((t) => t.status === "queued" || t.status === "running");

    if (cancellable.length === 0) {
      return "No running or queued background tasks to cancel.";
    }

    const cancelled: string[] = [];
    for (const task of cancellable) {
      await manager.cancel(ctx, task.id);
      cancelled.push(task.id);
    }

    return `Cancelled ${cancelled.length} background task(s): ${cancelled.join(", ")}`;
  }

  const taskId = args.task_id;
  if (!taskId) {
    return "[ERROR] Invalid arguments: task_id is required when all is not true.";
  }

  const task = manager.get(taskId);
  if (!task) {
    return `[ERROR] Task not found: ${taskId}`;
  }

  if (task.status !== "queued" && task.status !== "running") {
    return `[ERROR] Cannot cancel task ${taskId}: current status is "${task.status}". Only queued or running tasks can be cancelled.`;
  }

  await manager.cancel(ctx, task.id);
  return `Task ${task.id} cancelled successfully.`;
}
