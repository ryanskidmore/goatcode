import type { AgentMode } from "../../types/agent";

export const ORCHESTRATOR_MODEL = "anthropic/claude-opus-4-6";
export const ORCHESTRATOR_TEMPERATURE = 0.1;
export const ORCHESTRATOR_MODE: AgentMode = "all";
export const ORCHESTRATOR_FALLBACK_MODELS = [
  "anthropic/claude-opus-4-6",
  "anthropic/claude-sonnet-4-6",
];
