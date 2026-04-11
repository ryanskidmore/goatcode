import type { BackgroundAgentManager, BackgroundTask } from "../../../runtime";
import type { OpenCodeContext } from "../../../types/plugin";
import { log } from "../../../shared/logger";
import type { BackgroundOutputArgs } from "./types";

/**
 * Default timeout (ms) when the caller requests blocking but doesn't
 * specify a value. The manager resolves the Promise as soon as the
 * session.idle event fires, so this is just a safety ceiling — not a
 * polling interval.
 */
const DEFAULT_BLOCK_TIMEOUT_MS = 120_000;

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
  return `Task ${task.id} is ${task.status} (elapsed: ${elapsed}). The system will notify you on completion, or use block=true to wait.`;
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

export async function handleBackgroundOutput(
  manager: BackgroundAgentManager,
  args: BackgroundOutputArgs,
  client?: OpenCodeContext["client"],
): Promise<string> {
  log("[background-output] called", { task_id: args.task_id, block: args.block });

  const task = manager.get(args.task_id);
  if (!task) {
    return `Task not found: ${args.task_id}`;
  }

  const isActive = task.status === "queued" || task.status === "running";

  // ---- Blocking path: wait for event-driven completion ----
  if (args.block === true && isActive) {
    const timeoutMs = args.timeout ?? DEFAULT_BLOCK_TIMEOUT_MS;
    const resolved = await manager.waitForCompletion(args.task_id, timeoutMs);

    if (!resolved) {
      return `Task ${args.task_id} was deleted while waiting.`;
    }

    if (resolved.status === "queued" || resolved.status === "running") {
      // Still active after timeout — return current status (no budget penalty).
      const output = formatTaskOutput(resolved);
      const statusLabel = resolved.status === "queued" ? "queued" : "running";
      if (args.full_session && client && resolved.sessionId) {
        const sessionOutput = await fetchSessionMessages(client, resolved, args);
        return `${output}\n\n${sessionOutput}\n\n> Timed out waiting after ${timeoutMs}ms. Task is still ${statusLabel} and will complete in the background.`;
      }
      return `${output}\n\n> Timed out waiting after ${timeoutMs}ms. Task is still ${statusLabel} and will complete in the background.`;
    }

    // Task reached terminal state.
    if (args.full_session && client && resolved.sessionId) {
      return await fetchSessionMessages(client, resolved, args);
    }
    return await formatTaskOutputWithFallback(resolved, args, client);
  }

  // ---- Non-blocking path: return current status ----
  if (isActive) {
    if (args.full_session && client && task.sessionId) {
      return await fetchSessionMessages(client, task, args);
    }
    return await formatTaskOutputWithFallback(task, args, client);
  }

  // ---- Terminal state ----
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
