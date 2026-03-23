import type { BackgroundAgentManager } from "../../../features/background-agent/manager"
import type { BackgroundTask } from "../../../features/background-agent/types"
import { log } from "../../../shared/logger"
import type { BackgroundOutputArgs } from "./types"

function formatElapsed(startedAt: number): string {
  const elapsedMs = Date.now() - startedAt
  const seconds = Math.floor(elapsedMs / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

function formatRunningStatus(task: BackgroundTask): string {
  const elapsed = task.startedAt ? formatElapsed(task.startedAt) : "unknown"
  return `Task ${task.id} is ${task.status} (elapsed: ${elapsed}). Check back later or use block=true to wait.`
}

function formatCompletedResult(task: BackgroundTask): string {
  const result = task.result ?? "(no output)"
  return `Task ${task.id} completed.\n\n${result}`
}

function formatFailedStatus(task: BackgroundTask): string {
  const error = task.error ?? "(no error details)"
  return `Task ${task.id} failed: ${error}`
}

function formatCancelledStatus(task: BackgroundTask): string {
  return `Task ${task.id} was cancelled.`
}

function formatTaskOutput(task: BackgroundTask): string {
  switch (task.status) {
    case "completed":
      return formatCompletedResult(task)
    case "failed":
      return formatFailedStatus(task)
    case "cancelled":
      return formatCancelledStatus(task)
    case "queued":
      return `Task ${task.id} is queued and waiting to start.`
    case "running":
      return formatRunningStatus(task)
  }
}

async function waitForCompletion(
  manager: BackgroundAgentManager,
  taskId: string,
  timeoutMs: number,
): Promise<BackgroundTask | undefined> {
  const deadline = Date.now() + timeoutMs
  const pollIntervalMs = 1000

  while (Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, pollIntervalMs))
    const current = manager.get(taskId)
    if (!current) return undefined
    if (current.status !== "queued" && current.status !== "running") return current
  }

  return manager.get(taskId)
}

export async function handleBackgroundOutput(
  manager: BackgroundAgentManager,
  args: BackgroundOutputArgs,
): Promise<string> {
  log("[background-output] called", { task_id: args.task_id, block: args.block })

  const task = manager.get(args.task_id)
  if (!task) {
    return `Task not found: ${args.task_id}`
  }

  const isActive = task.status === "queued" || task.status === "running"

  if (args.block === true && isActive) {
    const timeoutMs = Math.min(args.timeout ?? 60_000, 600_000)
    const resolved = await waitForCompletion(manager, args.task_id, timeoutMs)
    if (!resolved) {
      return `Task ${args.task_id} was deleted while waiting.`
    }
    const output = formatTaskOutput(resolved)
    if (resolved.status === "queued" || resolved.status === "running") {
      return `${output}\n\n> Timed out waiting after ${timeoutMs}ms. Task is still running.`
    }
    return output
  }

  return formatTaskOutput(task)
}
