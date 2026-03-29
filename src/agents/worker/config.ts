import type { AgentMode } from "../../types/agent";

export const WORKER_MODEL = "anthropic/claude-sonnet-4-6";
export const WORKER_TEMPERATURE = 0.1;
export const WORKER_MODE: AgentMode = "all";
export const WORKER_FALLBACK_MODELS = ["anthropic/claude-sonnet-4-6", "anthropic/claude-haiku-4-6"];
