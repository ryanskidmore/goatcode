import type { AgentMode } from "../../types/agent";
import { DEFAULT_TEMPERATURE } from "../../config/defaults";

export const EXPLORER_TEMPERATURE = DEFAULT_TEMPERATURE;
export const EXPLORER_MODE: AgentMode = "subagent";
export const EXPLORER_FALLBACK_MODELS = ["claude-haiku-4.5", "gpt-5.4-nano"];
export const EXPLORER_DEFAULT_MODEL = EXPLORER_FALLBACK_MODELS[0];
