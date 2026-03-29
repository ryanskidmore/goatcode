import type { PluginHookContributions } from "../../types/hook";
import { getSessionMode } from "../keyword-detector/handler";
import { log } from "../../shared/logger";

const THINK_BUDGET_TOKENS = 10000;

type ChatParamsHook = NonNullable<PluginHookContributions["chat.params"]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAnthropicClaude(providerID: string, modelID: string): boolean {
  const claudeProviders = ["anthropic", "google-vertex-anthropic", "opencode"];
  if (claudeProviders.includes(providerID)) return true;
  if (providerID === "github-copilot" && modelID.toLowerCase().includes("claude")) return true;
  return false;
}

export function createThinkModeHandler(): ChatParamsHook {
  return async (input: unknown, output: unknown): Promise<void> => {
    if (!isRecord(input) || !isRecord(output)) return;

    const sessionID = input.sessionID;
    if (typeof sessionID !== "string") return;

    const mode = getSessionMode(sessionID);
    if (mode !== "think") return;

    const model = input.model;
    if (!isRecord(model)) return;
    if (typeof model.providerID !== "string" || typeof model.modelID !== "string") return;

    if (!isAnthropicClaude(model.providerID, model.modelID)) return;

    const options = output.options;
    if (!isRecord(options)) return;
    if (options.thinking !== undefined) return;

    options.thinking = {
      type: "enabled",
      budget_tokens: THINK_BUDGET_TOKENS,
    };

    log("[think-mode] thinking parameters injected", {
      sessionID,
      budget_tokens: THINK_BUDGET_TOKENS,
    });
  };
}
