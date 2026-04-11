import type { OpenCodeContext } from "../../../types/plugin";
import type { BackgroundAgentManager } from "../../../runtime";
import { log } from "../../../shared/logger";
import type { BackgroundCancelArgs } from "./types";

/**
 * Optional caller context for scoped cancellation.
 * When provided, depth≥1 agents can only cancel their own children.
 */
export interface CancelCallerContext {
  /** Session ID of the calling agent. */
  callerSessionID?: string;
  /** Delegation depth of the calling agent (0 = root orchestrator). */
  delegationDepth?: number;
}

export async function handleBackgroundCancel(
  manager: BackgroundAgentManager,
  ctx: OpenCodeContext,
  args: BackgroundCancelArgs,
  callerCtx?: CancelCallerContext,
): Promise<string> {
  log("[background-cancel] called", { task_id: args.task_id, all: args.all });

  const cancelAll = args.all === true;

  if (!cancelAll && !args.task_id) {
    return "[ERROR] Invalid arguments: provide a task_id or set all=true to cancel all running tasks.";
  }

  if (cancelAll) {
    const tasks = manager.getAll();
    const allCancellable = tasks.filter((t) => t.status === "queued" || t.status === "running");

    if (allCancellable.length === 0) {
      return "No running or queued background tasks to cancel.";
    }

    // Scope cancellation by delegation depth:
    // - Root orchestrator (depth=0 or unknown): global cancel — all tasks
    // - Sub-agent (depth≥1): only cancel tasks spawned by this agent
    const callerDepth = callerCtx?.delegationDepth ?? 0;
    const callerSessionID = callerCtx?.callerSessionID;

    let cancellable: typeof allCancellable;
    if (callerDepth > 0 && callerSessionID) {
      cancellable = allCancellable.filter((t) => t.parentSessionID === callerSessionID);
      log("[background-cancel] Scoped cancel: depth≥1 agent cancelling own children only", {
        callerSessionID,
        callerDepth,
        totalCancellable: allCancellable.length,
        scopedCancellable: cancellable.length,
      });
    } else {
      cancellable = allCancellable;
      log("[background-cancel] Global cancel: root agent cancelling all tasks", {
        count: cancellable.length,
      });
    }

    if (cancellable.length === 0) {
      return "No cancellable background tasks found for this agent.";
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
