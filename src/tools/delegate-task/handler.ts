import type { ToolDefinition } from "@opencode-ai/plugin";
import type { BackgroundAgentManager } from "../../runtime";
import type { CategoryOverrides } from "../../types/config";
import type { OpenCodeContext } from "../../types/plugin";
import type { TaskInput, CategoryConfig } from "./types";
import type { ExecutorDeps } from "./executor";
import { z } from "zod";

import { buildTool } from "../tool-builder";
import { getClientFromToolContext } from "../lsp/client";
import { resolveCategory } from "./category-resolver";
import { executeBackground, executeSync } from "./executor";
import { CATEGORY_NAMES, MAX_DELEGATION_DEPTH } from "./constants";
import { log } from "../../shared/logger";

type DelegationBlockCode = "DEPTH_LOOKUP_FAILED" | "DEPTH_LIMIT_REACHED";

type DelegationBlockDetails = {
  code: DelegationBlockCode;
  message: string;
  currentDepth?: number;
  maxDepth: number;
  category: string;
  subagentType: string;
  runInBackground: boolean;
  sessionID?: string;
};

function formatDelegationBlock(details: DelegationBlockDetails): string {
  const lines = [
    details.message,
    "",
    "<task_error>",
    `code: ${details.code}`,
    "retryable: false",
    "recommended_action: execute_directly",
    ...(typeof details.currentDepth === "number" ? [`current_depth: ${details.currentDepth}`] : []),
    `max_depth: ${details.maxDepth}`,
    `category: ${details.category}`,
    `subagent_type: ${details.subagentType}`,
    `run_in_background: ${details.runInBackground}`,
    ...(details.sessionID
      ? [`session_id: ${details.sessionID}`, `sessionId: ${details.sessionID}`]
      : []),
    "</task_error>",
  ];

  return lines.join("\n");
}

function emitDelegationBlockMetadata(
  toolContext: Parameters<ToolDefinition["execute"]>[1],
  details: DelegationBlockDetails,
): void {
  toolContext.metadata({
    metadata: {
      error_code: details.code,
      retryable: false,
      recommended_action: "execute_directly",
      category: details.category,
      subagent_type: details.subagentType,
      run_in_background: details.runInBackground,
      ...(typeof details.currentDepth === "number"
        ? { current_depth: details.currentDepth, currentDepth: details.currentDepth }
        : {}),
      max_depth: details.maxDepth,
      maxDepth: details.maxDepth,
      ...(details.sessionID ? { session_id: details.sessionID, sessionId: details.sessionID } : {}),
    },
  });
}

/**
 * Pattern injected by the executor into child session prompts.
 * @see executor.ts injectDelegationDepth
 */
const DEPTH_MARKER_PATTERN = /<!-- goatcode:delegation_depth=(\d+) -->/;

/**
 * Reads the current session's messages to find the delegation depth marker.
 * Returns null on any error (fail-closed — blocks delegation when depth is unknown).
 */
export async function extractDelegationDepth(
  client: OpenCodeContext["client"],
  sessionID: string | undefined,
): Promise<number | null> {
  if (!sessionID) return 0;

  try {
    const result = await client.session.messages({ path: { id: sessionID } });
    const messages = (result.data ?? []) as Array<Record<string, unknown>>;
    // Depth marker is in the initial prompt — only check first 3 messages
    const raw = JSON.stringify(messages.slice(0, 3));
    const match = raw.match(DEPTH_MARKER_PATTERN);
    if (match) return parseInt(match[1], 10);
  } catch {
    log("[delegate-task] Could not determine delegation depth, blocking delegation", { sessionID });
    return null;
  }

  return 0;
}

const categoryListForDescription = CATEGORY_NAMES.map((name) => `"${name}"`).join(", ");

const taskArgsSchema = z.object({
  category: z.string().describe(`Category to route to. One of: ${categoryListForDescription}`),
  subagent_type: z
    .string()
    .describe(
      "The type of specialized agent to use for this task. " +
        "Determines the UI label shown on the task card (ex: deepworker, explorer, quick, deep). " +
        "If unsure, use the same value as category.",
    ),
  description: z.string().describe("Short 3-5 word task description"),
  prompt: z.string().describe("Full prompt/instructions for the delegated agent"),
  load_skills: z.array(z.string()).optional().describe("Skill names to inject"),
  run_in_background: z
    .boolean()
    .describe("true: async (returns task_id), false: sync (waits for result)"),
  session_id: z.string().optional().describe("Resume an existing session"),
});

/**
 * Resolve the OpenCode client, trying the tool context first then
 * falling back to the stored plugin-level context.
 *
 * OpenCode's plugin runtime does not always expose `client` on the
 * tool execution context. The plugin-level context (captured at setup)
 * is a reliable fallback.
 */
function resolveClient(
  toolContext: Parameters<ToolDefinition["execute"]>[1],
  getStoredContext: () => OpenCodeContext | undefined,
): OpenCodeContext["client"] {
  // Try tool context first (works if OpenCode exposes client there)
  try {
    return getClientFromToolContext(toolContext);
  } catch {
    // Fall back to stored plugin-level context
    const stored = getStoredContext();
    if (stored?.client) {
      return stored.client;
    }
    throw new Error(
      "OpenCode client unavailable. Neither the tool context nor the plugin context expose it.",
    );
  }
}

export function resolveParentSessionID(
  toolContext: Parameters<ToolDefinition["execute"]>[1],
): string | undefined {
  const legacy = Reflect.get(toolContext as Record<string, unknown>, "sessionID");
  if (typeof legacy === "string" && legacy.length > 0) return legacy;

  const camel = Reflect.get(toolContext as Record<string, unknown>, "sessionId");
  if (typeof camel === "string" && camel.length > 0) return camel;

  return undefined;
}

function resolveParentMessageID(
  toolContext: Parameters<ToolDefinition["execute"]>[1],
): string | undefined {
  const legacy = Reflect.get(toolContext as Record<string, unknown>, "messageID");
  if (typeof legacy === "string" && legacy.length > 0) return legacy;

  const camel = Reflect.get(toolContext as Record<string, unknown>, "messageId");
  if (typeof camel === "string" && camel.length > 0) return camel;

  return undefined;
}

export function createTaskTool(
  getManager: () => BackgroundAgentManager,
  getStoredContext?: () => OpenCodeContext | undefined,
  getCategoryOverrides?: () => CategoryOverrides | undefined,
): ToolDefinition {
  const contextGetter = getStoredContext ?? (() => undefined);
  const categoryOverridesGetter = getCategoryOverrides ?? (() => undefined);

  return buildTool({
    name: "delegate_task",
    timeoutMs: 0, // No timeout — sync tasks run for minutes; background tasks return immediately but depth check is async
    description: [
      "Delegate a task to a category-based agent.",
      `Available categories: ${categoryListForDescription}.`,
      "Set run_in_background=true for async execution (returns task_id), false for sync.",
    ].join(" "),
    args: taskArgsSchema.shape as unknown as ToolDefinition["args"],
    execute: async (rawArgs, toolContext) => {
      const args = taskArgsSchema.parse(rawArgs);
      const input: TaskInput = {
        category: args.category,
        subagent_type: args.subagent_type,
        description: args.description,
        prompt: args.prompt,
        load_skills: args.load_skills,
        run_in_background: args.run_in_background,
        session_id: args.session_id,
      };

      const config = resolveCategory(input.category, categoryOverridesGetter()) as
        | CategoryConfig
        | undefined;
      if (!config) {
        const available = CATEGORY_NAMES.join(", ");
        log("[delegate-task] Unknown category", { category: input.category });
        return `Unknown category: "${input.category}". Available: ${available}`;
      }

      const client = resolveClient(toolContext, contextGetter);
      const currentSessionID = resolveParentSessionID(toolContext);

      // --- Delegation depth enforcement ---
      const currentDepth = await extractDelegationDepth(client, currentSessionID);
      if (currentDepth === null) {
        const details: DelegationBlockDetails = {
          code: "DEPTH_LOOKUP_FAILED",
          message:
            "Delegation blocked: unable to determine current delegation depth. Execute the work directly using your available tools instead of delegating.",
          maxDepth: MAX_DELEGATION_DEPTH,
          category: input.category,
          subagentType: input.subagent_type,
          runInBackground: input.run_in_background,
          sessionID: currentSessionID,
        };
        log("[delegate-task] Blocked: unable to determine delegation depth", {
          ...details,
          retryable: false,
          recommendedAction: "execute_directly",
        });
        emitDelegationBlockMetadata(toolContext, details);
        return formatDelegationBlock(details);
      }
      if (currentDepth >= MAX_DELEGATION_DEPTH) {
        const details: DelegationBlockDetails = {
          code: "DEPTH_LIMIT_REACHED",
          message:
            `Delegation blocked: maximum depth (${MAX_DELEGATION_DEPTH}) reached. ` +
            `Current depth: ${currentDepth}. ` +
            `Execute the work directly using your available tools instead of delegating.`,
          currentDepth,
          maxDepth: MAX_DELEGATION_DEPTH,
          category: input.category,
          subagentType: input.subagent_type,
          runInBackground: input.run_in_background,
          sessionID: currentSessionID,
        };
        log("[delegate-task] Blocked: delegation depth limit reached", {
          ...details,
          retryable: false,
          recommendedAction: "execute_directly",
        });
        emitDelegationBlockMetadata(toolContext, details);
        return formatDelegationBlock(details);
      }

      const manager = getManager();
      const deps: ExecutorDeps = {
        manager,
        client,
        directory: toolContext.directory,
        sessionID: currentSessionID,
        messageID: resolveParentMessageID(toolContext),
        metadata: (input) => toolContext.metadata(input),
        delegationDepth: currentDepth,
      };

      log("[delegate-task] Routing task", {
        category: input.category,
        model: config.model,
        background: input.run_in_background,
        delegationDepth: currentDepth,
      });

      if (input.run_in_background) {
        return executeBackground(input, config, deps);
      }

      return executeSync(input, config, deps);
    },
  });
}
