import type { PluginHookContributions } from "../../types/hook";
import { log } from "../../shared/logger";

export const EDIT_ERROR_PATTERNS = [
  /oldstring and newstring must be different/i,
  /oldstring not found/i,
  /oldstring found multiple times/i,
  /string to replace not found/i,
] as const;

const EDIT_ERROR_RECOVERY_MARKER = "[EDIT ERROR RECOVERY]";

export const EDIT_ERROR_RECOVERY_MESSAGE = `${EDIT_ERROR_RECOVERY_MARKER}\nEdit failed because the target text did not match the current file state. Re-read the file, copy the exact current content, and retry the edit with an unambiguous oldString.`;

type PostToolUseHook = NonNullable<PluginHookContributions["tool.execute.after"]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function createEditErrorHandler(): PostToolUseHook {
  return async (input: unknown, output: unknown) => {
    if (!isRecord(input) || !isRecord(output)) {
      return;
    }

    const tool = input.tool;
    const toolOutput = output.output;

    if (typeof tool !== "string" || tool.toLowerCase() !== "edit") {
      return;
    }

    if (typeof toolOutput !== "string") {
      return;
    }

    if (toolOutput.includes(EDIT_ERROR_RECOVERY_MARKER)) {
      return;
    }

    const hasEditError = EDIT_ERROR_PATTERNS.some((pattern) => pattern.test(toolOutput));
    if (!hasEditError) {
      return;
    }

    output.output = `${toolOutput}\n${EDIT_ERROR_RECOVERY_MESSAGE}`;
    log("[edit-error] injected edit recovery message");
  };
}
