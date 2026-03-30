import type { AgentMode } from "../../types/agent";
import { DEFAULT_TEMPERATURE } from "../../config/defaults";

export const EXPLORER_MODEL = "claude-haiku-4-5";
export const EXPLORER_TEMPERATURE = DEFAULT_TEMPERATURE;
export const EXPLORER_MODE: AgentMode = "subagent";
export const EXPLORER_FALLBACK_MODELS = ["gpt-5.4-mini", "gemini-3.1-flash-lite-preview"];
