import type { OpenCodeContext } from "../../types/plugin";

import { log } from "../../shared/logger";
import { resetMessageCursor } from "../session-state/session-cursor";
import { deleteSessionTools } from "../session-state/session-tools-store";

import { ConcurrencyManager } from "./concurrency";
import { spawnBackgroundSession } from "./spawner";
import type { BackgroundTask, LaunchInput } from "./types";

const TASK_TTL_MS = 5 * 60 * 1_000;

/**
 * Minimum elapsed time (ms) before accepting a session.idle event as
 * completion. Prevents premature completion when idle fires before the
 * agent has produced any output (e.g. during session initialisation).
 */
const MIN_IDLE_TIME_MS = 5_000;

type SessionMessage = {
  role?: string;
  content?: string;
  info?: { role?: string };
  parts?: Array<{ type?: string; text?: string; thinking?: string }>;
};

function extractAssistantContent(message: SessionMessage): string | undefined {
  if (
    message.role === "assistant" &&
    typeof message.content === "string" &&
    message.content.trim().length > 0
  ) {
    return message.content;
  }

  const role = message.role ?? message.info?.role;
  if (role !== "assistant" || !Array.isArray(message.parts)) {
    return undefined;
  }

  const content = message.parts
    .filter(
      (part) =>
        part.type === "text" && typeof part.text === "string" && part.text.trim().length > 0,
    )
    .map((part) => part.text!.trim())
    .join("\n\n");

  return content.length > 0 ? content : undefined;
}

function getLastAssistantContent(messages: SessionMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const content = extractAssistantContent(messages[i]);
    if (content) return content;
  }

  return undefined;
}

function isTerminalStatus(status: BackgroundTask["status"]): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

type CompletionResolver = {
  resolve: (task: BackgroundTask) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class BackgroundAgentManager {
  private readonly tasks = new Map<string, BackgroundTask>();
  private readonly concurrency: ConcurrencyManager;
  /** O(1) lookup from session ID to task ID for event routing. */
  private readonly tasksBySessionId = new Map<string, string>();
  /** Promise resolvers for callers blocking on task completion. */
  private readonly completionResolvers = new Map<string, CompletionResolver[]>();
  /** Stored context for fetching session data during event handling. */
  private ctx: OpenCodeContext | undefined;

  constructor(concurrencyLimit = 5) {
    this.concurrency = new ConcurrencyManager(concurrencyLimit);
  }

  async launch(ctx: OpenCodeContext, input: LaunchInput): Promise<BackgroundTask> {
    this.ctx = ctx;

    const task: BackgroundTask = {
      id: input.id,
      status: "queued",
      prompt: input.prompt,
      model: input.model,
      createdAt: Date.now(),
    };

    this.tasks.set(input.id, task);
    log("[manager] Task queued", { id: input.id });

    void this.startTask(ctx, task, input);
    return task;
  }

  /**
   * Phase B: acquire concurrency slot, spawn background session, then
   * wait for event-driven completion (via handleSessionIdle / handleSessionError).
   */
  private async startTask(
    ctx: OpenCodeContext,
    task: BackgroundTask,
    input: LaunchInput,
  ): Promise<void> {
    try {
      await this.concurrency.acquire(task.model);

      if (task.status === "cancelled") {
        this.concurrency.release(task.model);
        return;
      }

      task.status = "running";
      task.startedAt = Date.now();
      log("[manager] Task started", { id: task.id });

      const { sessionId } = await spawnBackgroundSession(ctx, input);
      task.sessionId = sessionId;
      this.tasksBySessionId.set(sessionId, task.id);

      // cancel() may have mutated status concurrently while spawn was in-flight
      if ((task as BackgroundTask).status === "cancelled") {
        this.tasksBySessionId.delete(sessionId);
        try {
          await ctx.client.session.delete({ path: { id: sessionId } });
        } catch (error) {
          log("[manager] Failed to delete session after late cancel", { id: task.id, error });
        }
        return;
      }

      // No polling loop — completion is now driven by session events
      // routed through handleSessionIdle() and handleSessionError().
    } catch (error) {
      if (task.status === "cancelled") return;
      this.fail(task.id, error instanceof Error ? error.message : String(error));
    }
  }

  // ---------------------------------------------------------------------------
  // Event-driven completion handlers
  // ---------------------------------------------------------------------------

  /**
   * Handle a session.idle event. Called from the plugin event hook when
   * a background session goes idle (agent finished its turn).
   *
   * If the session has produced meaningful assistant output and enough
   * time has elapsed, the task is marked as completed.
   */
  async handleSessionIdle(sessionId: string): Promise<void> {
    const taskId = this.tasksBySessionId.get(sessionId);
    if (!taskId) return;

    const task = this.tasks.get(taskId);
    if (!task || isTerminalStatus(task.status)) return;
    if (!this.ctx) return;

    // Guard against premature idle events (session init, brief pauses).
    const elapsed = task.startedAt ? Date.now() - task.startedAt : 0;
    if (elapsed < MIN_IDLE_TIME_MS) {
      log("[manager] Ignoring early session.idle", { id: task.id, elapsed });
      return;
    }

    try {
      const messagesResult = await this.ctx.client.session.messages({
        path: { id: sessionId },
      });

      const messages = (messagesResult.data ?? []) as SessionMessage[];
      const lastAssistantContent = getLastAssistantContent(messages);

      if (lastAssistantContent && lastAssistantContent.trim().length > 0) {
        this.complete(task.id, lastAssistantContent);
      } else if (messages.length === 0) {
        // Session went idle with no messages — agent never started.
        this.fail(
          task.id,
          "Background agent produced no output (0 messages). " +
            "This may indicate rate limiting or a session creation failure.",
        );
      }
      // Otherwise: idle with messages but no assistant content yet.
      // The agent may still be working (tool calls without final response).
      // We'll catch completion on the next idle event.
    } catch (error) {
      log("[manager] Failed to check session on idle", {
        id: task.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle a session.error event for a background session.
   */
  async handleSessionError(sessionId: string, errorMessage: string): Promise<void> {
    const taskId = this.tasksBySessionId.get(sessionId);
    if (!taskId) return;

    const task = this.tasks.get(taskId);
    if (!task || isTerminalStatus(task.status)) return;

    // Try to salvage output before marking as failed.
    if (this.ctx && task.sessionId) {
      try {
        const messagesResult = await this.ctx.client.session.messages({
          path: { id: task.sessionId },
        });
        const messages = (messagesResult.data ?? []) as SessionMessage[];
        const lastContent = getLastAssistantContent(messages);
        if (lastContent && lastContent.trim().length > 0) {
          this.complete(task.id, lastContent);
          return;
        }
      } catch {
        // Fall through to fail.
      }
    }

    this.fail(task.id, errorMessage);
  }

  // ---------------------------------------------------------------------------
  // Promise-based waiting for background_output tool
  // ---------------------------------------------------------------------------

  /**
   * Wait for a task to reach a terminal state.
   * Returns immediately if already complete. Otherwise blocks until
   * the completion event fires or the timeout expires.
   */
  waitForCompletion(taskId: string, timeoutMs: number): Promise<BackgroundTask | undefined> {
    const task = this.tasks.get(taskId);
    if (!task) return Promise.resolve(undefined);
    if (isTerminalStatus(task.status)) return Promise.resolve(task);

    return new Promise<BackgroundTask | undefined>((resolve) => {
      const timer = setTimeout(() => {
        this.removeResolver(taskId, resolver);
        resolve(this.tasks.get(taskId));
      }, timeoutMs);

      const resolver: CompletionResolver = {
        resolve: (completed: BackgroundTask) => {
          clearTimeout(timer);
          resolve(completed);
        },
        timer,
      };

      const existing = this.completionResolvers.get(taskId) ?? [];
      existing.push(resolver);
      this.completionResolvers.set(taskId, existing);
    });
  }

  private removeResolver(taskId: string, resolver: CompletionResolver): void {
    const resolvers = this.completionResolvers.get(taskId);
    if (!resolvers) return;
    const idx = resolvers.indexOf(resolver);
    if (idx !== -1) resolvers.splice(idx, 1);
    if (resolvers.length === 0) this.completionResolvers.delete(taskId);
  }

  private notifyResolvers(task: BackgroundTask): void {
    const resolvers = this.completionResolvers.get(task.id);
    if (!resolvers || resolvers.length === 0) return;
    for (const resolver of resolvers) {
      clearTimeout(resolver.timer);
      resolver.resolve(task);
    }
    this.completionResolvers.delete(task.id);
  }

  // ---------------------------------------------------------------------------
  // Terminal state transitions
  // ---------------------------------------------------------------------------

  dispose(): void {
    // Resolve any waiting callers with current state.
    for (const [taskId] of this.completionResolvers) {
      const task = this.tasks.get(taskId);
      if (task) this.notifyResolvers(task);
    }
    this.completionResolvers.clear();
  }

  complete(id: string, result: string): void {
    const task = this.tasks.get(id);
    if (!task || isTerminalStatus(task.status)) return;

    task.status = "completed";
    task.result = result;
    task.completedAt = Date.now();
    this.concurrency.release(task.model);
    this.cleanupSessionIndex(task.sessionId);
    this.cleanupSession(task.sessionId);
    this.notifyResolvers(task);
    this.evictStaleTasks();
    log("[manager] Task completed", { id });
  }

  fail(id: string, error: string): void {
    const task = this.tasks.get(id);
    if (!task || isTerminalStatus(task.status)) return;

    task.status = "failed";
    task.error = error;
    task.completedAt = Date.now();
    this.concurrency.release(task.model);
    this.cleanupSessionIndex(task.sessionId);
    this.cleanupSession(task.sessionId);
    this.notifyResolvers(task);
    this.evictStaleTasks();
    log("[manager] Task failed", { id, error });
  }

  async cancel(ctx: OpenCodeContext, id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task || isTerminalStatus(task.status)) return;

    const wasRunning = task.status === "running";
    task.status = "cancelled";
    task.completedAt = Date.now();

    if (wasRunning) {
      this.concurrency.release(task.model);
      if (task.sessionId) {
        try {
          await ctx.client.session.delete({ path: { id: task.sessionId } });
        } catch (error) {
          log("[manager] Failed to delete cancelled session", { id, error });
        }
      }
    }

    this.cleanupSessionIndex(task.sessionId);
    this.cleanupSession(task.sessionId);
    this.notifyResolvers(task);
    this.evictStaleTasks();
    log("[manager] Task cancelled", { id });
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private cleanupSessionIndex(sessionId: string | undefined): void {
    if (sessionId) this.tasksBySessionId.delete(sessionId);
  }

  private cleanupSession(sessionId: string | undefined): void {
    if (!sessionId) return;
    resetMessageCursor(sessionId);
    deleteSessionTools(sessionId);
  }

  private evictStaleTasks(): void {
    const now = Date.now();
    for (const [id, task] of this.tasks) {
      if (
        isTerminalStatus(task.status) &&
        task.completedAt &&
        now - task.completedAt > TASK_TTL_MS
      ) {
        this.tasks.delete(id);
      }
    }
  }

  get(id: string): BackgroundTask | undefined {
    return this.tasks.get(id);
  }

  getAll(): BackgroundTask[] {
    return [...this.tasks.values()];
  }
}
