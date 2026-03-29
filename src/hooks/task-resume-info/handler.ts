import type { PluginHookContributions } from "../../types/hook";
import { log } from "../../shared/logger";

type PostToolUseHook = NonNullable<PluginHookContributions["tool.execute.after"]>;

const TARGET_TOOLS = ["task", "Task", "task_tool", "call_omo_agent"];

const SESSION_ID_PATTERNS = [
  /Session ID: (ses_[a-zA-Z0-9_-]+)/,
  /session_id: (ses_[a-zA-Z0-9_-]+)/,
  /<task_metadata>\s*session_id: (ses_[a-zA-Z0-9_-]+)/,
  /sessionId: (ses_[a-zA-Z0-9_-]+)/,
];

function extractSessionId(output: string): string | null {
  for (const pattern of SESSION_ID_PATTERNS) {
    const match = output.match(pattern);
    if (match) return match[1] ?? null;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function createTaskResumeInfoHandler(): PostToolUseHook {
  return async (input: unknown, output: unknown) => {
    if (!isRecord(input) || !isRecord(output)) {
      return;
    }

    const tool = input.tool;
    if (typeof tool !== "string" || !TARGET_TOOLS.includes(tool)) {
      return;
    }

    const toolOutput = output.output;
    if (typeof toolOutput !== "string") {
      return;
    }

    if (toolOutput.startsWith("Error:") || toolOutput.startsWith("Failed")) {
      return;
    }

    if (toolOutput.includes("\nto continue:")) {
      return;
    }

    const sessionId = extractSessionId(toolOutput);
    if (!sessionId) {
      return;
    }

    output.output =
      toolOutput.trimEnd() + `\n\nto continue: task(session_id="${sessionId}", prompt="...")`;

    log("[task-resume-info] injected resume continuation info", { sessionId });
  };
}
