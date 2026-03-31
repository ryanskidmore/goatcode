import type { PluginHookContributions } from "../../types/hook";
import { log } from "../../shared/logger";

type PostToolUseHook = NonNullable<PluginHookContributions["tool.execute.after"]>;

export const POST_READ_NUDGE =
  "\n\n---\nWorkflow Reminder: delegate based on rules; if mentioning a specialist, launch it in this same turn.";

const DELEGATION_NUDGE_THRESHOLD = 3;

export const DELEGATION_ESCALATION_NUDGE =
  "\n\n---\n[DELEGATION NUDGE] You have made multiple exploration calls without delegating. " +
  "Stop reading files and delegate to a specialist agent NOW. " +
  "Each read compounds context bloat from AGENTS.md injection. " +
  "Use explorer for codebase discovery or deepworker for thorough analysis.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isReadTool(tool: string): boolean {
  return tool.toLowerCase() === "read";
}

function isExplorationTool(tool: string): boolean {
  const name = tool.toLowerCase();
  return name === "read" || name === "grep" || name === "glob";
}

export function createPostReadNudgeHandler(): PostToolUseHook {
  // Track exploration call count to escalate delegation nudges.
  // Resets when the handler is recreated (new session).
  let explorationCallCount = 0;

  return async (input: unknown, output: unknown) => {
    if (!isRecord(input) || !isRecord(output)) return;

    const tool = input.tool;
    const text = output.output;
    if (typeof tool !== "string" || typeof text !== "string") return;

    // Count all exploration tool calls (read, grep, glob)
    if (isExplorationTool(tool)) {
      explorationCallCount++;
    }

    // Only append nudges to read tool outputs
    if (!isReadTool(tool)) return;
    if (text.includes(POST_READ_NUDGE.trim())) return;

    // After threshold, escalate to a stronger delegation nudge
    if (explorationCallCount >= DELEGATION_NUDGE_THRESHOLD) {
      if (!text.includes(DELEGATION_ESCALATION_NUDGE.trim())) {
        output.output = `${text}${DELEGATION_ESCALATION_NUDGE}`;
        log("[post-read-nudge] escalated to delegation nudge", {
          explorationCallCount,
        });
      }
      return;
    }

    output.output = `${text}${POST_READ_NUDGE}`;
  };
}
