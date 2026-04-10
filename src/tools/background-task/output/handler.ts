import type { BackgroundAgentManager, BackgroundTask } from "../../../runtime";
import type { OpenCodeContext } from "../../../types/plugin";
import { log } from "../../../shared/logger";
import type { BackgroundOutputArgs } from "./types";

/**
 * Maximum time (ms) the handler will block waiting for task completion.
 *
 * This is intentionally short. `background_output` is a *status check*,
 * not a synchronous execution mechanism. The brief blocking window exists
 * only to catch tasks that complete within a few seconds, avoiding an
 * unnecessary extra round-trip. For longer-running tasks the handler
 * returns "still running" quickly so the calling agent can do other work
 * instead of burning its entire inference turn waiting.
 *
 * NOTE: This caps the *polling wait* per call, NOT the subagent's total
 * execution time. The subagent continues running in the background
 * regardless of this limit.
 */
const MAX_BLOCK_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Polling budget — prevents agents from burning infinite inference turns
// polling a stuck task. After MAX_POLL_ATTEMPTS "still running" responses,
// the output includes a strong warning directing the agent to cancel and
// execute directly.
// ---------------------------------------------------------------------------

/** Shape stored per-task for poll tracking with TTL-based cleanup. */
type PollEntry = { count: number; lastPollAt: number };

/** Per-task poll count tracking (module-level state). */
const pollCounts = new Map<string, PollEntry>();

/** Maximum polls before warning the agent to stop. */
const MAX_POLL_ATTEMPTS = 3;

/** Stale poll entries are cleaned up after 1 hour. */
const POLL_ENTRY_TTL_MS = 60 * 60 * 1000;

function trackPoll(taskId: string): number {
  const now = Date.now();

  // Opportunistic cleanup of stale entries
  for (const [id, entry] of pollCounts) {
    if (now - entry.lastPollAt > POLL_ENTRY_TTL_MS) {
      pollCounts.delete(id);
    }
  }

  const existing = pollCounts.get(taskId);
  const count = (existing?.count ?? 0) + 1;
  pollCounts.set(taskId, { count, lastPollAt: now });
  return count;
}

function clearPollCount(taskId: string): void {
  pollCounts.delete(taskId);
}

function buildPollBudgetWarning(pollCount: number): string {
  if (pollCount < MAX_POLL_ATTEMPTS) return "";
  return (
    `\n\n⚠️ POLLING BUDGET EXHAUSTED (${pollCount}/${MAX_POLL_ATTEMPTS} attempts). ` +
    `This task is still running after ${pollCount} polls. ` +
    `To avoid wasting further inference cycles:\n` +
    `1. Cancel this task with background_cancel\n` +
    `2. Execute the work directly using your own tools\n` +
    `Do NOT continue polling.`
  );
}

function buildTimeoutCapNote(requestedMs: number | undefined): string {
  if (requestedMs === undefined || requestedMs <= MAX_BLOCK_TIMEOUT_MS) return "";
  return `\n> Note: requested timeout (${requestedMs}ms) was capped to ${MAX_BLOCK_TIMEOUT_MS}ms to stay within tool-execution limits.`;
}

type SessionMessage = {
  id?: string;
  role?: string;
  content?: string;
};

/** Raw shape returned by client.session.messages() */
type ApiMessage = {
  info: { id?: string; role?: string; time?: { created?: number } };
  parts: Array<{ type?: string; text?: string; thinking?: string }>;
};

function extractTextFromApiParts(
  parts: ApiMessage["parts"],
  options: {
    includeThinking: boolean;
    includeToolResults: boolean;
    thinkingMaxChars: number;
  },
): string {
  const thinkingLimit = Math.max(0, options.thinkingMaxChars);
  const extracted: string[] = [];

  for (const part of parts) {
    switch (part.type) {
      case "text":
        if (typeof part.text === "string") extracted.push(part.text);
        break;
      case "thinking":
        if (!options.includeThinking) break;
        {
          const rawThinking = typeof part.thinking === "string" ? part.thinking : part.text;
          if (typeof rawThinking === "string") {
            extracted.push(
              rawThinking.length > thinkingLimit
                ? `${rawThinking.slice(0, thinkingLimit)}... (truncated)`
                : rawThinking,
            );
          }
        }
        break;
      case "tool":
        if (options.includeToolResults && typeof part.text === "string") extracted.push(part.text);
        break;
    }
  }

  return extracted.join(" ").trim();
}

function formatElapsed(startedAt: number): string {
  const elapsedMs = Date.now() - startedAt;
  const seconds = Math.floor(elapsedMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatRunningStatus(task: BackgroundTask): string {
  const elapsed = task.startedAt ? formatElapsed(task.startedAt) : "unknown";
  return `Task ${task.id} is ${task.status} (elapsed: ${elapsed}). Check back later or use block=true to wait.`;
}

function formatCompletedResult(task: BackgroundTask): string {
  const result = hasMeaningfulText(task.result) ? task.result : "(no output)";
  return `Task ${task.id} completed.\n\n${result}`;
}

function hasMeaningfulText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function formatFailedStatus(task: BackgroundTask): string {
  const error = task.error ?? "(no error details)";
  return `Task ${task.id} failed: ${error}`;
}

function formatCancelledStatus(task: BackgroundTask): string {
  return `Task ${task.id} was cancelled.`;
}

function formatTaskOutput(task: BackgroundTask): string {
  switch (task.status) {
    case "completed":
      return formatCompletedResult(task);
    case "failed":
      return formatFailedStatus(task);
    case "cancelled":
      return formatCancelledStatus(task);
    case "queued":
      return `Task ${task.id} is queued and waiting to start.`;
    case "running":
      return formatRunningStatus(task);
  }
}

async function waitForCompletion(
  manager: BackgroundAgentManager,
  taskId: string,
  timeoutMs: number,
): Promise<BackgroundTask | undefined> {
  const safeTimeout = Math.min(timeoutMs, MAX_BLOCK_TIMEOUT_MS);
  const startedAt = Date.now();
  const deadline = startedAt + safeTimeout;
  const pollIntervalMs = 100;

  while (true) {
    const current = manager.get(taskId);
    if (!current) return undefined;
    if (current.status !== "queued" && current.status !== "running") return current;

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      return current;
    }

    await new Promise<void>((resolve) =>
      setTimeout(resolve, Math.min(pollIntervalMs, remainingMs)),
    );
  }
}

export async function handleBackgroundOutput(
  manager: BackgroundAgentManager,
  args: BackgroundOutputArgs,
  client?: OpenCodeContext["client"],
): Promise<string> {
  log("[background-output] called", { task_id: args.task_id, block: args.block });

  const task = manager.get(args.task_id);
  if (!task) {
    clearPollCount(args.task_id);
    return `Task not found: ${args.task_id}`;
  }

  const isActive = task.status === "queued" || task.status === "running";

  // Task reached a terminal state — clear poll tracking
  if (!isActive) {
    clearPollCount(args.task_id);
  }

  if (args.block === true && isActive) {
    const timeoutMs = Math.min(args.timeout ?? MAX_BLOCK_TIMEOUT_MS, MAX_BLOCK_TIMEOUT_MS);
    const capNote = buildTimeoutCapNote(args.timeout);
    const resolved = await waitForCompletion(manager, args.task_id, timeoutMs);
    if (!resolved) {
      clearPollCount(args.task_id);
      return `Task ${args.task_id} was deleted while waiting.`;
    }
    if (resolved.status === "queued" || resolved.status === "running") {
      // Still running after blocking wait — count as a poll attempt
      const pollCount = trackPoll(args.task_id);
      const budgetWarning = buildPollBudgetWarning(pollCount);
      const output = formatTaskOutput(resolved);
      // If full_session requested, append session messages before the timeout note
      if (args.full_session && client && resolved.sessionId) {
        const sessionOutput = await fetchSessionMessages(client, resolved, args);
        return `${output}\n\n${sessionOutput}\n\n> Timed out waiting after ${timeoutMs}ms. Task is still running.${capNote}${budgetWarning}`;
      }
      return `${output}\n\n> Timed out waiting after ${timeoutMs}ms. Task is still running.${capNote}${budgetWarning}`;
    }
    // Task completed — clear poll tracking, return result
    clearPollCount(args.task_id);
    if (args.full_session && client && resolved.sessionId) {
      return await fetchSessionMessages(client, resolved, args);
    }
    return await formatTaskOutputWithFallback(resolved, args, client);
  }

  // Non-blocking path: track polls for active tasks
  if (isActive) {
    const pollCount = trackPoll(args.task_id);
    const budgetWarning = buildPollBudgetWarning(pollCount);

    if (args.full_session && client && task.sessionId) {
      const sessionOutput = await fetchSessionMessages(client, task, args);
      return `${sessionOutput}${budgetWarning}`;
    }

    const output = await formatTaskOutputWithFallback(task, args, client);
    return `${output}${budgetWarning}`;
  }

  // Non-blocking path: terminal task
  if (args.full_session && client && task.sessionId) {
    return await fetchSessionMessages(client, task, args);
  }

  return await formatTaskOutputWithFallback(task, args, client);
}

async function fetchSessionMessages(
  client: OpenCodeContext["client"],
  task: BackgroundTask,
  args: BackgroundOutputArgs,
): Promise<string> {
  if (!task.sessionId) {
    return formatTaskOutput(task);
  }

  try {
    const messagesResult = await client.session.messages({
      path: { id: task.sessionId },
    });

    // API returns Array<{ info: Message; parts: Part[] }> — transform to flat SessionMessage
    const rawMessages = (messagesResult.data ?? []) as ApiMessage[];
    const thinkingMaxChars = args.thinking_max_chars ?? 2000;
    let messages: SessionMessage[] = rawMessages.map((m) => ({
      id: m.info?.id,
      role: m.info?.role,
      content: extractTextFromApiParts(m.parts, {
        includeThinking: args.include_thinking ?? false,
        includeToolResults: args.include_tool_results ?? false,
        thinkingMaxChars,
      }),
    }));
    messages = messages.filter((m) => (m.content ?? "").length > 0);

    // Filter by since_message_id if provided
    if (args.since_message_id) {
      const sinceIdx = messages.findIndex((m) => m.id === args.since_message_id);
      if (sinceIdx !== -1) {
        messages = messages.slice(sinceIdx + 1);
      }
    }

    // Apply message limit
    const limit = Math.min(args.message_limit ?? 100, 100);
    if (messages.length > limit) {
      messages = messages.slice(-limit);
    }

    const formatted = messages
      .map((m) => {
        return `[${m.role ?? "unknown"}] ${m.content ?? ""}`;
      })
      .join("\n\n---\n\n");

    const header = [
      `Task ${task.id} — status: ${task.status}`,
      `Session: ${task.sessionId}`,
      `Messages: ${messages.length}`,
    ].join("\n");

    return `${header}\n\n${formatted}`;
  } catch (error) {
    log("[background-output] Failed to fetch session messages", { error, taskId: task.id });
    return `${formatTaskOutput(task)}\n\n(Failed to fetch session messages: ${error instanceof Error ? error.message : String(error)})`;
  }
}

async function fetchFinalAssistantResult(
  client: OpenCodeContext["client"],
  task: BackgroundTask,
  args: BackgroundOutputArgs,
): Promise<string | undefined> {
  if (!task.sessionId) return undefined;

  try {
    const messagesResult = await client.session.messages({
      path: { id: task.sessionId },
    });

    const rawMessages = (messagesResult.data ?? []) as ApiMessage[];
    const thinkingMaxChars = args.thinking_max_chars ?? 2000;
    const assistantMessages = rawMessages
      .filter((message) => message.info?.role === "assistant")
      .map((message) =>
        extractTextFromApiParts(message.parts, {
          includeThinking: args.include_thinking ?? false,
          includeToolResults: args.include_tool_results ?? false,
          thinkingMaxChars,
        }),
      )
      .filter(hasMeaningfulText);

    return assistantMessages.at(-1);
  } catch (error) {
    log("[background-output] Failed to fetch final assistant result", { error, taskId: task.id });
    return undefined;
  }
}

async function formatTaskOutputWithFallback(
  task: BackgroundTask,
  args: BackgroundOutputArgs,
  client?: OpenCodeContext["client"],
): Promise<string> {
  if (task.status !== "completed") {
    return formatTaskOutput(task);
  }
  if (hasMeaningfulText(task.result)) {
    return formatCompletedResult(task);
  }
  if (!client || !task.sessionId) {
    return formatCompletedResult(task);
  }

  const fallbackResult = await fetchFinalAssistantResult(client, task, args);
  if (!hasMeaningfulText(fallbackResult)) {
    return formatCompletedResult(task);
  }

  return `Task ${task.id} completed.\n\n${fallbackResult}`;
}
