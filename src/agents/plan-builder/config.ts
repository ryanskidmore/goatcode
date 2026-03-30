import type { AgentMode } from "../../types/agent";
import { DEFAULT_TEMPERATURE } from "../../config/defaults";

export const PLAN_BUILDER_MODEL = "claude-opus-4-6";
export const PLAN_BUILDER_TEMPERATURE = DEFAULT_TEMPERATURE;
export const PLAN_BUILDER_MODE: AgentMode = "all";
export const PLAN_BUILDER_FALLBACK_MODELS = [
  "claude-opus-4-6",
  "claude-sonnet-4-6",
];
