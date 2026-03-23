import type { OpenCodeContext } from "../../../types/plugin"
import type { BackgroundAgentManager } from "../../../features/background-agent/manager"
import { log } from "../../../shared/logger"
import type { BackgroundCancelArgs } from "./types"

export async function handleBackgroundCancel(
  manager: BackgroundAgentManager,
  ctx: OpenCodeContext,
  args: BackgroundCancelArgs,
): Promise<string> {
  log("[background-cancel] called", { task_id: args.task_id, all: args.all })

  const cancelAll = args.all === true

  if (!cancelAll && !args.task_id) {
    return "[ERROR] Invalid arguments: provide a task_id or set all=true to cancel all running tasks."
  }

  if (cancelAll) {
    const tasks = manager.getAll()
    const cancellable = tasks.filter((t) => t.status === "queued" || t.status === "running")

    if (cancellable.length === 0) {
      return "No running or queued background tasks to cancel."
    }

    const cancelled: string[] = []
    for (const task of cancellable) {
      await manager.cancel(ctx, task.id)
      cancelled.push(task.id)
    }

    return `Cancelled ${cancelled.length} background task(s): ${cancelled.join(", ")}`
  }

  const task = manager.get(args.task_id!)
  if (!task) {
    return `[ERROR] Task not found: ${args.task_id}`
  }

  if (task.status !== "queued" && task.status !== "running") {
    return `[ERROR] Cannot cancel task ${args.task_id}: current status is "${task.status}". Only queued or running tasks can be cancelled.`
  }

  await manager.cancel(ctx, task.id)
  return `Task ${task.id} cancelled successfully.`
}
