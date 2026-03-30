import type { AgentMode } from "../../types/agent";

export const RESEARCHER_MODEL = "google/gemini-3-flash";
export const RESEARCHER_TEMPERATURE = 0.1;
export const RESEARCHER_MODE: AgentMode = "all";
export const RESEARCHER_FALLBACK_MODELS = ["google/gemini-3-flash", "anthropic/claude-sonnet-4-6"];
