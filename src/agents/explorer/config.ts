import type { AgentMode } from "../../types/agent";

export const EXPLORER_MODEL = "google/gemini-2.5-flash";
export const EXPLORER_TEMPERATURE = 0.0;
export const EXPLORER_MODE: AgentMode = "subagent";
export const EXPLORER_FALLBACK_MODELS = ["google/gemini-2.5-flash", "anthropic/claude-sonnet-4-6"];
