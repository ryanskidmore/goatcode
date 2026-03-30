import type { AgentMode } from "../../types/agent";
import { DEFAULT_TEMPERATURE } from "../../config/defaults";

export const ADVISOR_MODEL = "gpt-5.4";
export const ADVISOR_TEMPERATURE = DEFAULT_TEMPERATURE;
export const ADVISOR_MODE: AgentMode = "subagent";
export const ADVISOR_FALLBACK_MODELS = ["gpt-5.4", "claude-opus-4-6"];
