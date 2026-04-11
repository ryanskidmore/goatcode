import type { OpenCodeContext } from "../../types/plugin";
import type { BackgroundAgentManager } from "../../runtime";
import type { TaskInput, CategoryConfig } from "./types";
import { log } from "../../shared/logger";
import { parseModelId } from "../../shared/model-normalization";
import { resolveModel } from "../../shared/model-resolution-pipeline";

export type MetadataCallback = (input: {
  title?: string;
  metadata?: Record<string, unknown>;
}) => void;

export interface ExecutorDeps {
  manager: BackgroundAgentManager;
  client: OpenCodeContext["client"];
  directory: string;
  sessionID?: string;
  messageID?: string;
  metadata?: MetadataCallback;
  /** Current delegation depth of the calling agent. Injected as depth+1 into child prompts. */
  delegationDepth?: number;
}

/**
 * Builds the full prompt by appending the category context block (if defined)
 * to the user's prompt. This ensures each category's behavioral guidance
 * reaches the delegated agent.
 */
/**
 * Maximum number of background sub-tasks a single parent agent can launch.
 * Prevents explosive fan-out that saturates concurrency pools.
 */
const MAX_CHILDREN_PER_PARENT = 6;

function buildPromptWithCategoryContext(prompt: string, config: CategoryConfig): string {
  if (!config.prompt_append) return prompt;
  return `${prompt}\n\n${config.prompt_append}`;
}

/**
 * Appends concurrency awareness guidance for depth≥1 agents so they
 * prefer direct execution over sub-delegating to many background tasks.
 */
function injectConcurrencyGuidance(prompt: string, delegationDepth: number): string {
  if (delegationDepth < 1) return prompt;
  return (
    prompt +
    "\n\n# Sub-Delegation Constraints (You Are a Sub-Agent)" +
    "\nYou are running as a delegated sub-agent. Further sub-delegation has real costs:" +
    "\n- **Latency**: Each delegation adds 10-30s startup overhead before any work begins." +
    "\n- **Concurrency slots**: Background tasks consume limited pool slots, starving other work." +
    "\n- **Context loss**: Sub-agents start cold and must re-discover context you already have." +
    "\n- **Coordination tax**: You must poll for results, parse output, and handle failures." +
    "\n" +
    "\nDo the work directly unless ALL of these are true:" +
    "\n- The work splits into genuinely independent parallel streams." +
    `\n- You currently have fewer than ${MAX_CHILDREN_PER_PARENT} sub-tasks.` +
    "\n- Each sub-task requires 5+ minutes of tool work." +
    "\n- You can make meaningful progress on other work while waiting." +
    "\n" +
    "\nFor any task completable in ≤5 tool calls, execute it yourself. " +
    "The delegation overhead alone exceeds the work."
  );
}

/**
 * Injects an invisible delegation depth marker into the child prompt.
 * The delegate-task handler reads this marker from session messages to
 * enforce {@link MAX_DELEGATION_DEPTH} and prevent runaway recursion.
 */
function injectDelegationDepth(prompt: string, currentDepth: number): string {
  const childDepth = currentDepth + 1;
  const cleanedPrompt = prompt.replace(/<!--\s*goatcode:delegation_depth=\d+\s*-->/g, "").trim();
  return `<!-- goatcode:delegation_depth=${childDepth} -->\n\n${cleanedPrompt}`;
}

function sanitiseValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function deriveSubagent(input: TaskInput): string {
  if (input.subagent_type && input.subagent_type.trim().length > 0)
    return sanitiseValue(input.subagent_type);
  return input.category;
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
  const subagent = deriveSubagent(input);

  log("[delegate-task] Launching background task", {
    taskId,
    category: input.category,
    model: config.model,
  });

  // Emit metadata immediately with title/subagent so the TUI can render
  // a meaningful card label before the child session is ready. The TUI's
  // onMount only fires once — if sessionId isn't available at that point
  // the sync never triggers, so we emit early then update with sessionId.
  if (deps.metadata) {
    deps.metadata({
      title: input.description,
      metadata: {
        category: input.category,
        subagent_type: subagent,
        description: input.description,
        ...(deps.messageID ? { parentMessageId: deps.messageID } : {}),
        ...(deps.messageID ? { parent_message_id: deps.messageID } : {}),
        ...(config.model ? { model: config.model } : {}),
      },
    });
  }

  // --- Fan-out limit: prevent a single parent from spawning too many children ---
  if (deps.sessionID) {
    const existingChildren = manager.getAll().filter((t) => t.parentSessionID === deps.sessionID);
    if (existingChildren.length >= MAX_CHILDREN_PER_PARENT) {
      log("[delegate-task] Fan-out limit reached", {
        parentSessionID: deps.sessionID,
        existingChildren: existingChildren.length,
        limit: MAX_CHILDREN_PER_PARENT,
      });
      return (
        `Cannot launch more background tasks: per-parent limit (${MAX_CHILDREN_PER_PARENT}) reached. ` +
        `You already have ${existingChildren.length} background tasks. Execute the remaining work directly using your available tools instead of delegating.`
      );
    }
  }

  const currentDepth = deps.delegationDepth ?? 0;
  const childDepth = currentDepth + 1;
  const basePrompt = buildPromptWithCategoryContext(input.prompt, config);
  const guidedPrompt = injectConcurrencyGuidance(basePrompt, currentDepth);
  const fullPrompt = injectDelegationDepth(guidedPrompt, currentDepth);
  const ctx: OpenCodeContext = { client, directory } as OpenCodeContext;
  const task = await manager.launch(ctx, {
    id: taskId,
    prompt: fullPrompt,
    model: config.model,
    parentSessionID: deps.sessionID,
    title: `${sanitiseValue(input.description)} (@${subagent} subagent)`,
    fallbackChain: config.fallback_chain,
    delegationDepth: childDepth,
  });

  // Wait briefly for the session to be created so we can update metadata
  // with sessionId. The TUI uses this to make the task card clickable
  // and to subscribe to the child session for live tool call stats.
  const sessionId = await waitForSessionId(manager, task.id);

  // Second metadata emission: add sessionId now that child session exists.
  // If no sessionId yet (task still queued behind concurrency), indicate queued status.
  if (deps.metadata) {
    const metadata: Record<string, unknown> = {
      prompt: input.prompt,
      category: input.category,
      subagent_type: subagent,
      description: input.description,
      ...(deps.messageID ? { parentMessageId: deps.messageID } : {}),
      ...(deps.messageID ? { parent_message_id: deps.messageID } : {}),
      ...(sessionId ? { session_id: sessionId } : {}),
      ...(sessionId ? { sessionId } : {}),
      ...(config.model ? { model: config.model } : {}),
      ...(!sessionId ? { status: "queued", queuePosition: manager.getQueuePosition(taskId) } : {}),
    };
    deps.metadata({ title: input.description, metadata });
    log("[delegate-task] Emitted task metadata", { taskId, sessionId, queued: !sessionId });
  }

  return formatBackgroundResult(task.id, input, config, sessionId);
}

const WAIT_FOR_SESSION_TIMEOUT_MS = 5_000;
const WAIT_FOR_SESSION_INTERVAL_MS = 250;

async function waitForSessionId(
  manager: BackgroundAgentManager,
  taskId: string,
): Promise<string | undefined> {
  const deadline = Date.now() + WAIT_FOR_SESSION_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const updated = manager.get(taskId);
    if (updated?.sessionId) return updated.sessionId;
    if (!updated || updated.status === "failed" || updated.status === "cancelled") return undefined;
    await new Promise<void>((resolve) => setTimeout(resolve, WAIT_FOR_SESSION_INTERVAL_MS));
  }
  return manager.get(taskId)?.sessionId;
}

function formatBackgroundResult(
  taskId: string,
  input: TaskInput,
  config: CategoryConfig,
  sessionId?: string,
): string {
  const subagent = deriveSubagent(input);
  const lines = [
    "Background task launched.",
    "",
    `Task ID: ${taskId}`,
    `Status: running`,
    `Category: ${input.category}`,
    `Model: ${config.model}${config.variant ? ` (variant: ${config.variant})` : ""}`,
    `Description: ${sanitiseValue(input.description)}`,
    `Agent: ${subagent} (subagent)`,
    "",
    `Use \`background_output\` with task_id="${taskId}" to check status.`,
  ];

  if (sessionId) {
    lines.push("", ...buildTaskMetadataLines(sessionId, taskId, subagent));
  }

  return lines.join("\n");
}

function buildTaskMetadataLines(sessionId: string, taskId: string, subagent: string): string[] {
  return [
    `Session ID: ${sessionId}`,
    `sessionId: ${sessionId}`,
    `<task_metadata>`,
    `session_id: ${sessionId}`,
    `sessionId: ${sessionId}`,
    `task_id: ${taskId}`,
    `subagent: ${subagent}`,
    `</task_metadata>`,
  ];
}

/**
 * Maximum time (ms) to wait for a sync task to complete via event-based
 * notification. No longer constrained by a poll loop, so we can afford a
 * generous ceiling. The underlying session.idle event fires as soon as the
 * agent finishes, so in practice this timeout is rarely reached.
 */
const SYNC_TASK_TIMEOUT_MS = 5 * 60 * 1_000; // 5 minutes

export async function executeSync(
  input: TaskInput,
  config: CategoryConfig,
  deps: ExecutorDeps,
): Promise<string> {
  const { manager, client, directory } = deps;

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
      body: {
        title: `task:${input.category}:${sanitiseValue(input.description).slice(0, 50)}`,
        ...(deps.sessionID ? { parentID: deps.sessionID } : {}),
      },
      query: { directory },
    });

    if (createResult.error) {
      const errorMsg = `Failed to create session: ${String(createResult.error)}`;
      log("[delegate-task] Session creation failed", { error: errorMsg });
      return errorMsg;
    }

    sessionId = createResult.data.id;
  }

  const taskId = `sync_${sessionId.slice(0, 8)}`;
  const subagent = deriveSubagent(input);

  // Emit metadata so the TUI can make the tool card clickable.
  if (deps.metadata) {
    deps.metadata({
      title: input.description,
      metadata: {
        prompt: input.prompt,
        category: input.category,
        subagent_type: subagent,
        description: input.description,
        ...(deps.messageID ? { parentMessageId: deps.messageID } : {}),
        ...(deps.messageID ? { parent_message_id: deps.messageID } : {}),
        session_id: sessionId,
        sessionId,
        ...(config.model ? { model: config.model } : {}),
      },
    });
  }

  // Register with the manager BEFORE sending the prompt so that the
  // session.idle event fired on completion is caught and resolves the
  // waitForCompletion() promise below.
  const ctx: OpenCodeContext = { client, directory } as OpenCodeContext;
  manager.trackSyncSession(sessionId, taskId, ctx, config.model, deps.delegationDepth ?? 0);

  // Resolve model and send prompt.
  const basePrompt = buildPromptWithCategoryContext(input.prompt, config);
  const fullPrompt = injectDelegationDepth(basePrompt, deps.delegationDepth ?? 0);
  const resolved = resolveModel({
    override: config.model.includes("/") ? config.model : undefined,
    fallbackChain: config.fallback_chain,
  });
  const parsed = parseModelId(resolved?.model ?? config.model);
  const promptResult = await client.session.promptAsync({
    path: { id: sessionId },
    body: {
      parts: [{ type: "text", text: fullPrompt }],
      ...(parsed && { model: { providerID: parsed.provider, modelID: parsed.modelId } }),
    },
  });

  if (promptResult.error) {
    const errorMsg = `Failed to send prompt: ${String(promptResult.error)}`;
    log("[delegate-task] Prompt send failed", { error: errorMsg, sessionId });
    return errorMsg;
  }

  // Block until the session.idle event fires (event-driven, no polling).
  const task = await manager.waitForCompletion(taskId, SYNC_TASK_TIMEOUT_MS);

  const meta = buildTaskMetadataLines(sessionId, taskId, subagent).join("\n");

  if (!task || task.status === "running") {
    return `Task timed out after ${SYNC_TASK_TIMEOUT_MS / 1_000}s. Session: ${sessionId}\n\n${meta}`;
  }

  if (task.status === "failed") {
    return `Task failed: ${task.error ?? "unknown error"}\n\n${meta}`;
  }

  // task.result is set by manager.complete() via handleSessionIdle().
  // Fall back to fetching directly only if somehow empty.
  const result = task.result ?? (await fetchLastAssistantMessage(client, sessionId));
  return `${result}\n\n${meta}`;
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
  const lastAssistant = [...messages].reverse().find((m) => extractMessageRole(m) === "assistant");

  if (!lastAssistant) {
    return "Task completed but no response was returned.";
  }

  return extractMessageText(lastAssistant) ?? "Task completed but no response was returned.";
}
