import type { OpenCodeContext } from "../../types/plugin";

import { log } from "../../shared/logger";
import { resetMessageCursor } from "../session-state/session-cursor";
import { deleteSessionTools } from "../session-state/session-tools-store";

import { ConcurrencyManager } from "./concurrency";
import { pollUntilStable } from "./poller";
import { spawnBackgroundSession } from "./spawner";
import type { BackgroundTask, LaunchInput } from "./types";

const TASK_TTL_MS = 5 * 60 * 1_000;

type SessionMessage = {
  role?: string;
  content?: string;
};

function isTerminalStatus(status: BackgroundTask["status"]): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

export class BackgroundAgentManager {
  private readonly tasks = new Map<string, BackgroundTask>();
  private readonly concurrency: ConcurrencyManager;
  private readonly abortControllers = new Map<string, AbortController>();

  constructor(concurrencyLimit = 5) {
    this.concurrency = new ConcurrencyManager(concurrencyLimit);
  }

  async launch(ctx: OpenCodeContext, input: LaunchInput): Promise<BackgroundTask> {
    const task: BackgroundTask = {
      id: input.id,
      status: "queued",
      prompt: input.prompt,
      model: input.model,
      createdAt: Date.now(),
    };

    this.tasks.set(input.id, task);
    log("[manager] Task queued", { id: input.id });

    void this.runLifecycle(ctx, task, input);
    return task;
  }

  private async runLifecycle(
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

      // cancel() may have mutated status concurrently while spawn was in-flight
      if ((task as BackgroundTask).status === "cancelled") {
        try {
          await ctx.client.session.delete({ path: { id: sessionId } });
        } catch (error) {
          log("[manager] Failed to delete session after late cancel", { id: task.id, error });
        }
        return;
      }

      const controller = new AbortController();
      this.abortControllers.set(task.id, controller);

      const finalSnapshot = await pollUntilStable(
        async () => {
          const [messagesResult, statusResult] = await Promise.all([
            ctx.client.session.messages({ path: { id: sessionId } }),
            ctx.client.session.status({ query: { directory: ctx.directory } }),
          ]);

          const messages = (messagesResult.data ?? []) as SessionMessage[];
          const statusType = statusResult.data?.[sessionId]?.type;
          // Background sessions may not appear in the status map
          // (statusType === undefined). Fall back to message-based
          // completion detection — message-count stability prevents
          // false positives during brief thinking pauses.
          const isIdle = statusType === "idle" || statusType === undefined;
          const lastAssistantMessage = [...messages]
            .reverse()
            .find((message) => message.role === "assistant");

          return {
            messageCount: messages.length,
            isIdle,
            result: lastAssistantMessage?.content,
          };
        },
        120,
        controller.signal,
      );

      this.abortControllers.delete(task.id);

      const hasMessages = finalSnapshot.messageCount > 0;
      const pollerResult = finalSnapshot.result?.trim();
      const hasPollerResult = pollerResult != null && pollerResult.length > 0;

      if (!hasMessages) {
        // Session stabilised with zero messages — the agent never started or
        // all messages were lost (e.g. rate limiting prevented the provider
        // from returning any response).
        this.fail(
          task.id,
          "Background agent produced no output (0 messages). " +
            "This may indicate rate limiting or a session creation failure.",
        );
      } else if (hasPollerResult) {
        this.complete(task.id, finalSnapshot.result!);
      } else {
        // Messages were recorded but the poller did not capture assistant
        // content. Try one final direct fetch before giving up.
        let recovered = false;
        if (task.sessionId) {
          try {
            const messagesResult = await ctx.client.session.messages({
              path: { id: task.sessionId },
            });
            const messages = (messagesResult.data ?? []) as SessionMessage[];
            const lastAssistant = [...messages]
              .reverse()
              .find((message) => message.role === "assistant");
            if (lastAssistant?.content && lastAssistant.content.trim().length > 0) {
              this.complete(task.id, lastAssistant.content);
              recovered = true;
            }
          } catch (fetchError) {
            log("[manager] Failed to recover assistant result from session", {
              id: task.id,
              error: fetchError instanceof Error ? fetchError.message : String(fetchError),
            });
          }
        }
        if (!recovered) {
          this.fail(
            task.id,
            `Background agent session ended without usable output ` +
              `(${finalSnapshot.messageCount} messages recorded, no assistant content found).`,
          );
        }
      }

      // Terminate the background session to prevent continued execution
      // after the orchestrator has consumed the result. Without this,
      // OpenCode continuation hooks can re-activate the session and make
      // unwanted changes after we consider the task finished.
      if (task.sessionId) {
        try {
          await ctx.client.session.delete({ path: { id: task.sessionId } });
          log("[manager] Deleted session", { id: task.id, sessionId: task.sessionId });
        } catch (deleteError) {
          log("[manager] Failed to delete session (non-fatal)", {
            id: task.id,
            error: deleteError instanceof Error ? deleteError.message : String(deleteError),
          });
        }
      }
    } catch (error) {
      const isCancelledTask = task.status === "cancelled";
      const isCancelledError = error instanceof Error && error.message === "Polling cancelled";
      if (isCancelledTask || isCancelledError) {
        if (!isCancelledTask) {
          task.status = "cancelled";
          task.completedAt = Date.now();
          this.concurrency.release(task.model);
          this.cleanupSession(task.sessionId);
          this.evictStaleTasks();
        }
        return;
      }
      this.fail(task.id, error instanceof Error ? error.message : String(error));
    }
  }

  dispose(): void {
    for (const [id, controller] of this.abortControllers) {
      controller.abort();
      log("[manager] Aborted pending task on dispose", { id });
    }
    this.abortControllers.clear();
  }

  complete(id: string, result: string): void {
    const task = this.tasks.get(id);
    if (!task || isTerminalStatus(task.status)) return;

    task.status = "completed";
    task.result = result;
    task.completedAt = Date.now();
    this.abortControllers.delete(id);
    this.concurrency.release(task.model);
    this.cleanupSession(task.sessionId);
    this.evictStaleTasks();
    log("[manager] Task completed", { id });
  }

  fail(id: string, error: string): void {
    const task = this.tasks.get(id);
    if (!task || isTerminalStatus(task.status)) return;

    task.status = "failed";
    task.error = error;
    task.completedAt = Date.now();
    this.abortControllers.delete(id);
    this.concurrency.release(task.model);
    this.cleanupSession(task.sessionId);
    this.evictStaleTasks();
    log("[manager] Task failed", { id, error });
  }

  async cancel(ctx: OpenCodeContext, id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task || isTerminalStatus(task.status)) return;

    const wasRunning = task.status === "running";
    task.status = "cancelled";
    task.completedAt = Date.now();

    this.abortControllers.get(id)?.abort();
    this.abortControllers.delete(id);

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

    this.cleanupSession(task.sessionId);
    this.evictStaleTasks();
    log("[manager] Task cancelled", { id });
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
