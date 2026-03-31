import type { AgentMode } from "../../types/agent";
import { DEFAULT_TEMPERATURE } from "../../config/defaults";

export const RESEARCHER_TEMPERATURE = DEFAULT_TEMPERATURE;
export const RESEARCHER_MODE: AgentMode = "all";
export const RESEARCHER_FALLBACK_MODELS = ["google/gemini-3-flash", "anthropic/claude-sonnet-4-6"];
export const RESEARCHER_DEFAULT_MODEL = RESEARCHER_FALLBACK_MODELS[0];
