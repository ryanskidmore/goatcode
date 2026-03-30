import type { AgentMode } from "../../types/agent";
import { DEFAULT_TEMPERATURE } from "../../config/defaults";

export const RESEARCHER_TEMPERATURE = DEFAULT_TEMPERATURE;
export const RESEARCHER_MODE: AgentMode = "all";
export const RESEARCHER_FALLBACK_MODELS = ["gemini-3-flash", "claude-sonnet-4-6"];
