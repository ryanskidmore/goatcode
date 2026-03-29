import type { AgentMode } from "../../types/agent";

export const PLAN_BUILDER_MODEL = "anthropic/claude-opus-4-6";
export const PLAN_BUILDER_TEMPERATURE = 0.2;
export const PLAN_BUILDER_MODE: AgentMode = "subagent";
export const PLAN_BUILDER_FALLBACK_MODELS = [
  "anthropic/claude-opus-4-6",
  "anthropic/claude-sonnet-4-6",
];
