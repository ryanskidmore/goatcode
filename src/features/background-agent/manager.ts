import type { OpenCodeContext } from "../../types/plugin"

import { log } from "../../shared/logger"
import { resetMessageCursor } from "../session-state/session-cursor"
import { deleteSessionTools } from "../session-state/session-tools-store"

import { ConcurrencyManager } from "./concurrency"
import { pollUntilStable } from "./poller"
import { spawnBackgroundSession } from "./spawner"
import type { BackgroundTask, LaunchInput } from "./types"

const TASK_TTL_MS = 5 * 60 * 1_000

type SessionMessage = {
  role?: string
  content?: string
}

function isTerminalStatus(status: BackgroundTask["status"]): boolean {
  return status === "completed" || status === "failed" || status === "cancelled"
}

export class BackgroundAgentManager {
  private readonly tasks = new Map<string, BackgroundTask>()
  private readonly concurrency: ConcurrencyManager
  private readonly abortControllers = new Map<string, AbortController>()

  constructor(concurrencyLimit = 5) {
    this.concurrency = new ConcurrencyManager(concurrencyLimit)
  }

  async launch(ctx: OpenCodeContext, input: LaunchInput): Promise<BackgroundTask> {
    const task: BackgroundTask = {
      id: input.id,
      status: "queued",
      prompt: input.prompt,
      model: input.model,
      createdAt: Date.now(),
    }

    this.tasks.set(input.id, task)
    log("[manager] Task queued", { id: input.id })

    void this.runLifecycle(ctx, task, input)
    return task
  }

  private async runLifecycle(
    ctx: OpenCodeContext,
    task: BackgroundTask,
    input: LaunchInput,
  ): Promise<void> {
    try {
      await this.concurrency.acquire(task.model)

      if (task.status === "cancelled") {
        this.concurrency.release(task.model)
        return
      }

      task.status = "running"
      task.startedAt = Date.now()
      log("[manager] Task started", { id: task.id })

      const { sessionId } = await spawnBackgroundSession(ctx, input)
      task.sessionId = sessionId

      // cancel() may have mutated status concurrently while spawn was in-flight
      if ((task as BackgroundTask).status === "cancelled") {
        try {
          await ctx.client.session.delete({ path: { id: sessionId } })
        } catch (error) {
          log("[manager] Failed to delete session after late cancel", { id: task.id, error })
        }
        return
      }

      const controller = new AbortController()
      this.abortControllers.set(task.id, controller)

      const finalSnapshot = await pollUntilStable(async () => {
        const [messagesResult, statusResult] = await Promise.all([
          ctx.client.session.messages({ path: { id: sessionId } }),
          ctx.client.session.status({ query: { directory: ctx.directory } }),
        ])

        const messages = (messagesResult.data ?? []) as SessionMessage[]
        const statusType = statusResult.data?.[sessionId]?.type
        const isIdle = statusType === "idle"
        const lastAssistantMessage = [...messages]
          .reverse()
          .find((message) => message.role === "assistant")

        return {
          messageCount: messages.length,
          isIdle,
          result: lastAssistantMessage?.content,
        }
      }, 120, controller.signal)

      this.abortControllers.delete(task.id)

      this.complete(task.id, finalSnapshot.result ?? "")
    } catch (error) {
      this.fail(task.id, error instanceof Error ? error.message : String(error))
    }
  }

  complete(id: string, result: string): void {
    const task = this.tasks.get(id)
    if (!task || isTerminalStatus(task.status)) return

    task.status = "completed"
    task.result = result
    task.completedAt = Date.now()
    this.abortControllers.delete(id)
    this.concurrency.release(task.model)
    this.cleanupSession(task.sessionId)
    this.evictStaleTasks()
    log("[manager] Task completed", { id })
  }

  fail(id: string, error: string): void {
    const task = this.tasks.get(id)
    if (!task || isTerminalStatus(task.status)) return

    task.status = "failed"
    task.error = error
    task.completedAt = Date.now()
    this.abortControllers.delete(id)
    this.concurrency.release(task.model)
    this.cleanupSession(task.sessionId)
    this.evictStaleTasks()
    log("[manager] Task failed", { id, error })
  }

  async cancel(ctx: OpenCodeContext, id: string): Promise<void> {
    const task = this.tasks.get(id)
    if (!task || isTerminalStatus(task.status)) return

    const wasRunning = task.status === "running"
    task.status = "cancelled"
    task.completedAt = Date.now()

    this.abortControllers.get(id)?.abort()
    this.abortControllers.delete(id)

    if (wasRunning) {
      this.concurrency.release(task.model)
      if (task.sessionId) {
        try {
          await ctx.client.session.delete({ path: { id: task.sessionId } })
        } catch (error) {
          log("[manager] Failed to delete cancelled session", { id, error })
        }
      }
    }

    this.cleanupSession(task.sessionId)
    this.evictStaleTasks()
    log("[manager] Task cancelled", { id })
  }

  private cleanupSession(sessionId: string | undefined): void {
    if (!sessionId) return
    resetMessageCursor(sessionId)
    deleteSessionTools(sessionId)
  }

  private evictStaleTasks(): void {
    const now = Date.now()
    for (const [id, task] of this.tasks) {
      if (isTerminalStatus(task.status) && task.completedAt && now - task.completedAt > TASK_TTL_MS) {
        this.tasks.delete(id)
      }
    }
  }

  get(id: string): BackgroundTask | undefined {
    return this.tasks.get(id)
  }

  getAll(): BackgroundTask[] {
    return [...this.tasks.values()]
  }
}
