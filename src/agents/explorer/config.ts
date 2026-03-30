import type { AgentMode } from "../../types/agent";
import { DEFAULT_TEMPERATURE } from "../../config/defaults";

export const EXPLORER_MODEL = "gemini-2.5-flash";
export const EXPLORER_TEMPERATURE = DEFAULT_TEMPERATURE;
export const EXPLORER_MODE: AgentMode = "subagent";
export const EXPLORER_FALLBACK_MODELS = ["gemini-2.5-flash", "claude-sonnet-4-6"];
