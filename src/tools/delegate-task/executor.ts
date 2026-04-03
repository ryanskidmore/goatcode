import type { OpenCodeContext } from "../../types/plugin";
import type { BackgroundAgentManager } from "../../runtime";
import type { TaskInput, CategoryConfig } from "./types";
import { log } from "../../shared/logger";
import { parseModelId } from "../../shared/model-normalization";
import { qualifyModel } from "../../shared/provider-registry";

export interface ExecutorDeps {
  manager: BackgroundAgentManager;
  client: OpenCodeContext["client"];
  directory: string;
}

export async function executeBackground(
  input: TaskInput,
  config: CategoryConfig,
  deps: ExecutorDeps,
): Promise<string> {
  if (input.session_id) {
    return "Error: 'session_id' is not supported for background tasks. Use run_in_background=false to resume a session.";
  }

  const { manager, client, directory } = deps;
  const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  log("[delegate-task] Launching background task", {
    taskId,
    category: input.category,
    model: config.model,
  });

  const ctx: OpenCodeContext = { client, directory } as OpenCodeContext;
  const task = await manager.launch(ctx, {
    id: taskId,
    prompt: input.prompt,
    model: config.model,
  });

  return formatBackgroundResult(task.id, input, config);
}

function formatBackgroundResult(taskId: string, input: TaskInput, config: CategoryConfig): string {
  return [
    "Background task launched.",
    "",
    `Task ID: ${taskId}`,
    `Category: ${input.category}`,
    `Model: ${config.model}${config.variant ? ` (variant: ${config.variant})` : ""}`,
    `Description: ${input.description}`,
    "",
    `Use \`background_output\` with task_id="${taskId}" to check status.`,
  ].join("\n");
}

export async function executeSync(
  input: TaskInput,
  config: CategoryConfig,
  deps: ExecutorDeps,
): Promise<string> {
  const { client, directory } = deps;

  log("[delegate-task] Executing sync task", {
    category: input.category,
    model: config.model,
  });

  let sessionId: string;

  if (input.session_id) {
    sessionId = input.session_id;
    log("[delegate-task] Resuming existing session", { sessionId });
  } else {
    const createResult = await client.session.create({
      body: { title: `task:${input.category}:${input.description.slice(0, 50)}` },
      query: { directory },
    });

    if (createResult.error) {
      const errorMsg = `Failed to create session: ${String(createResult.error)}`;
      log("[delegate-task] Session creation failed", { error: errorMsg });
      return errorMsg;
    }

    sessionId = createResult.data.id;
  }
  const parsed = parseModelId(qualifyModel(config.model));

  const promptResult = await client.session.promptAsync({
    path: { id: sessionId },
    body: {
      parts: [{ type: "text", text: input.prompt }],
      ...(parsed && { model: { providerID: parsed.provider, modelID: parsed.modelId } }),
    },
  });

  if (promptResult.error) {
    const errorMsg = `Failed to send prompt: ${String(promptResult.error)}`;
    log("[delegate-task] Prompt send failed", { error: errorMsg, sessionId });
    return errorMsg;
  }

  return await pollForResult(client, directory, sessionId);
}

const POLL_INTERVAL_MS = 2_000;
/**
 * Maximum time (ms) for sync task polling. Capped at 55s to stay well
 * within the OpenCode tool-execution timeout (~120s), leaving headroom
 * for the response to be assembled and returned.
 */
const MAX_POLL_DURATION_MS = 55_000;

async function pollForResult(
  client: OpenCodeContext["client"],
  directory: string,
  sessionId: string,
): Promise<string> {
  const start = Date.now();
  let lastMessageCount = -1;
  let stablePolls = 0;
  // This threshold is intentionally higher than poller.ts STABILITY_REQUIRED_POLLS=2.
  // The sync executor has no status API fallback once it returns, so we require
  // extra stability before treating the session as complete.
  const STABLE_THRESHOLD = 3;

  while (Date.now() - start < MAX_POLL_DURATION_MS) {
    const [statusResult, messagesResult] = await Promise.all([
      client.session.status({ query: { directory } }),
      client.session.messages({ path: { id: sessionId } }),
    ]);

    const sessionStatus = statusResult.data?.[sessionId]?.type;
    const messages = (messagesResult.data ?? []) as SessionMessage[];
    const messageCount = messages.length;

    if (sessionStatus === "idle") {
      return await fetchLastAssistantMessage(client, sessionId);
    }
    // any known terminal status other than active running states
    if (sessionStatus !== undefined && sessionStatus !== "busy" && sessionStatus !== "retry") {
      return await fetchLastAssistantMessage(client, sessionId);
    }

    // Status API may not return data for this session (undefined).
    // Fall back to message-count stability detection.
    // Keep waiting until the session has more than the initial prompt; otherwise
    // a single user message can look stable before the assistant replies.
    if (sessionStatus === undefined && messageCount > 1) {
      if (messageCount === lastMessageCount) {
        stablePolls += 1;
        if (stablePolls >= STABLE_THRESHOLD) {
          return await fetchLastAssistantMessage(client, sessionId);
        }
      } else {
        stablePolls = 0;
      }
    }
    lastMessageCount = messageCount;

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return `Task timed out after ${MAX_POLL_DURATION_MS / 1_000}s. Session: ${sessionId}`;
}

/**
 * OpenCode messages use a structured format: { info: { role }, parts: [{ type, text }] }
 * NOT a flat { role, content } shape. We must handle both formats for resilience.
 */
type MessagePart = {
  type?: string;
  text?: string;
};

type StructuredMessage = {
  info?: { role?: string };
  parts?: MessagePart[];
};

type FlatMessage = {
  role?: string;
  content?: string;
};

type SessionMessage = StructuredMessage | FlatMessage;

function extractMessageRole(msg: SessionMessage): string | undefined {
  // Structured format: { info: { role } }
  if ("info" in msg && msg.info?.role) {
    return msg.info.role;
  }
  // Flat format fallback: { role }
  if ("role" in msg && typeof msg.role === "string") {
    return msg.role;
  }
  return undefined;
}

function extractMessageText(msg: SessionMessage): string | undefined {
  // Structured format: { parts: [{ type: "text", text: "..." }] }
  if ("parts" in msg && Array.isArray(msg.parts)) {
    const textParts = msg.parts
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text!);
    if (textParts.length > 0) {
      return textParts.join("\n");
    }
  }
  // Flat format fallback: { content }
  if ("content" in msg && typeof msg.content === "string") {
    return msg.content;
  }
  return undefined;
}

async function fetchLastAssistantMessage(
  client: OpenCodeContext["client"],
  sessionId: string,
): Promise<string> {
  const messagesResult = await client.session.messages({
    path: { id: sessionId },
  });

  const messages = (messagesResult.data ?? []) as SessionMessage[];
  const lastAssistant = [...messages]
    .reverse()
    .find((m) => extractMessageRole(m) === "assistant");

  if (!lastAssistant) {
    return "Task completed but no response was returned.";
  }

  return extractMessageText(lastAssistant) ?? "Task completed but no response was returned.";
}
