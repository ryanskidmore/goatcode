import type { PluginHookContributions } from "../../types/hook";
import { log } from "../../shared/logger";

export type EffortLevel = "low" | "medium" | "high" | "max";

type ChatParamsHook = NonNullable<PluginHookContributions["chat.params"]>;

const EFFORT_BUDGET_TOKENS: Record<Exclude<EffortLevel, "low">, number> = {
  medium: 5000,
  high: 10000,
  max: 32000,
};

const OPUS_PATTERN = /claude-opus/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAnthropicClaude(providerID: string, modelID: string): boolean {
  const claudeProviders = ["anthropic", "google-vertex-anthropic", "opencode"];
  if (claudeProviders.includes(providerID)) return true;
  if (providerID === "github-copilot" && modelID.toLowerCase().includes("claude")) return true;
  return false;
}

function normalizeModelID(modelID: string): string {
  return modelID.replace(/\./g, "-");
}

export function createAnthropicEffortHandler(effortLevel: EffortLevel = "high"): ChatParamsHook {
  return async (input: unknown, output: unknown): Promise<void> => {
    if (!isRecord(input) || !isRecord(output)) return;

    const model = input.model;
    if (!isRecord(model)) return;
    if (typeof model.providerID !== "string" || typeof model.modelID !== "string") return;

    if (!isAnthropicClaude(model.providerID, model.modelID)) return;

    if (effortLevel === "low") return;

    const options = output.options;
    if (!isRecord(options)) return;
    if (options.thinking !== undefined) return;

    const budgetTokens = EFFORT_BUDGET_TOKENS[effortLevel];
    options.thinking = {
      type: "enabled",
      budget_tokens: budgetTokens,
    };

    const normalized = normalizeModelID(model.modelID);
    if (effortLevel === "max" && OPUS_PATTERN.test(normalized) && options.effort === undefined) {
      options.effort = "max";
    }

    log("[anthropic-effort] thinking parameters injected", {
      sessionID: input.sessionID,
      effortLevel,
      budget_tokens: budgetTokens,
    });
  };
}
