import type { AgentMode } from "../../types/agent";
import { DEFAULT_TEMPERATURE } from "../../config/defaults";

export const PLANNER_MODEL = "claude-opus-4-6";
export const PLANNER_TEMPERATURE = DEFAULT_TEMPERATURE;
export const PLANNER_MODE: AgentMode = "all";
export const PLANNER_FALLBACK_MODELS = [
  "gpt-5.4",
  "gemini-3.1-pro-preview",
  "claude-sonnet-4-6",
];
