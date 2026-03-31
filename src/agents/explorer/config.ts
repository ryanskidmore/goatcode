import type { AgentMode } from "../../types/agent";
import { DEFAULT_TEMPERATURE } from "../../config/defaults";

export const EXPLORER_TEMPERATURE = DEFAULT_TEMPERATURE;
export const EXPLORER_MODE: AgentMode = "subagent";
export const EXPLORER_FALLBACK_MODELS = ["gpt-5.4-mini", "gemini-3.1-flash-lite-preview"];
export const EXPLORER_DEFAULT_MODEL = EXPLORER_FALLBACK_MODELS[0];
