import type { AgentMode } from "../../types/agent";
import { DEFAULT_TEMPERATURE } from "../../config/defaults";

export const RESEARCHER_MODEL = "claude-sonnet-4-6";
export const RESEARCHER_TEMPERATURE = DEFAULT_TEMPERATURE;
export const RESEARCHER_MODE: AgentMode = "all";
export const RESEARCHER_FALLBACK_MODELS = ["gpt-5.3-codex"];
