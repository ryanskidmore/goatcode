import type { AgentMode } from "../../types/agent";

export const EXECUTOR_MODEL = "anthropic/claude-sonnet-4-6";
export const EXECUTOR_TEMPERATURE = 0.1;
export const EXECUTOR_MODE: AgentMode = "primary";
export const EXECUTOR_FALLBACK_MODELS = [
  "anthropic/claude-sonnet-4-6",
  "anthropic/claude-haiku-4-6",
];
