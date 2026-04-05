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

const SUBAGENT_PATTERNS = [/^\s*subagent:\s*(.+?)\s*$/m, /^\s*Agent:\s*(.+?)\s*\(subagent\)\s*$/m];

const CATEGORY_PATTERNS = [/^\s*Category:\s*(.+?)\s*$/m];

const TASK_ID_PATTERNS = [
  /^\s*Task ID:\s*(task_[a-zA-Z0-9_-]+)\s*$/m,
  /^\s*task_id:\s*(task_[a-zA-Z0-9_-]+)\s*$/m,
];

function extractSessionId(output: string): string | null {
  for (const pattern of SESSION_ID_PATTERNS) {
    const match = output.match(pattern);
    if (match) return match[1] ?? null;
  }
  return null;
}

function extractFirstMatch(output: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = output.match(pattern);
    if (match && typeof match[1] === "string" && match[1].trim().length > 0) {
      return match[1].trim();
    }
  }
  return null;
}

function ensureTaskStatusLine(toolOutput: string, sessionId: string): string {
  if (toolOutput.includes("\nStatus:")) {
    return toolOutput;
  }

  const taskId = extractFirstMatch(toolOutput, TASK_ID_PATTERNS);
  const lines = toolOutput.split("\n");
  const taskIdIndex = lines.findIndex((line) => line.startsWith("Task ID:"));
  if (taskIdIndex === -1) {
    return toolOutput;
  }

  const marker = taskId ? `running (${taskId})` : `running (${sessionId})`;
  lines.splice(taskIdIndex + 1, 0, `Status: ${marker}`);
  return lines.join("\n");
}

function ensureTaskMetadata(
  input: Record<string, unknown>,
  output: Record<string, unknown>,
  toolOutput: string,
  sessionId: string,
): void {
  const existing = isRecord(output.metadata) ? output.metadata : {};
  const args = isRecord(input.args) ? input.args : {};

  const category =
    typeof args.category === "string"
      ? args.category
      : extractFirstMatch(toolOutput, CATEGORY_PATTERNS);
  const subagent =
    typeof args.subagent_type === "string"
      ? args.subagent_type
      : extractFirstMatch(toolOutput, SUBAGENT_PATTERNS);

  const merged: Record<string, unknown> = {
    ...existing,
    sessionId,
    session_id: sessionId,
  };

  if (
    typeof args.description === "string" &&
    args.description.trim().length > 0 &&
    typeof merged.description !== "string"
  ) {
    merged.description = args.description;
  }
  if (category && typeof merged.category !== "string") {
    merged.category = category;
  }
  if (subagent && typeof merged.subagent_type !== "string") {
    merged.subagent_type = subagent;
  }

  output.metadata = merged;
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

    const sessionId = extractSessionId(toolOutput);
    if (!sessionId) {
      return;
    }

    ensureTaskMetadata(input, output, toolOutput, sessionId);

    const withStatus = ensureTaskStatusLine(toolOutput, sessionId);
    if (withStatus !== toolOutput) {
      output.output = withStatus;
    }

    if ((output.output as string).includes("\nto continue:")) {
      return;
    }

    output.output =
      (output.output as string).trimEnd() +
      `\n\nto continue: task(session_id="${sessionId}", prompt="...")`;

    log("[task-resume-info] injected resume continuation info", { sessionId });
  };
}
