import type { AgentMode } from "../../types/agent";
import { DEFAULT_TEMPERATURE } from "../../config/defaults";

export const PLANNER_TEMPERATURE = DEFAULT_TEMPERATURE;
export const PLANNER_MODE: AgentMode = "all";
export const PLANNER_FALLBACK_MODELS = ["claude-opus-4-6", "gpt-5.4"];
export const PLANNER_DEFAULT_MODEL = PLANNER_FALLBACK_MODELS[0];
