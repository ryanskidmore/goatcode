import type { PluginHookContributions } from "../../types/hook";
import { log } from "../../shared/logger";

type PostToolUseHook = NonNullable<PluginHookContributions["tool.execute.after"]>;

const EMPTY_RESPONSE_MARKER = "[EMPTY RESPONSE WARNING]";

export const EMPTY_RESPONSE_WARNING = `${EMPTY_RESPONSE_MARKER}
Task invocation completed but returned no response. This indicates the agent either:
- Failed to execute properly
- Did not terminate correctly
- Returned an empty result

Note: The call has already completed - you are NOT waiting for a response. Proceed accordingly.`;

const NEAR_EMPTY_THRESHOLD = 10;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTaskTool(tool: string): boolean {
  return tool.toLowerCase() === "task";
}

function isEmptyOrNearEmpty(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length === 0 || trimmed.length < NEAR_EMPTY_THRESHOLD;
}

export function createEmptyResponseDetectorHandler(): PostToolUseHook {
  return async (input: unknown, output: unknown) => {
    if (!isRecord(input) || !isRecord(output)) {
      return;
    }

    const tool = input.tool;
    if (typeof tool !== "string" || !isTaskTool(tool)) {
      return;
    }

    const toolOutput = output.output;
    if (typeof toolOutput !== "string") {
      if (toolOutput === undefined || toolOutput === null) {
        output.output = EMPTY_RESPONSE_WARNING;
        log("[empty-response-detector] injected warning for undefined/null output");
      }
      return;
    }

    if (toolOutput.includes(EMPTY_RESPONSE_MARKER)) {
      return;
    }

    if (!isEmptyOrNearEmpty(toolOutput)) {
      return;
    }

    output.output = EMPTY_RESPONSE_WARNING;
    log("[empty-response-detector] injected warning for empty/near-empty output");
  };
}
