import type { AgentMode } from "../../types/agent";
import { DEFAULT_TEMPERATURE } from "../../config/defaults";

export const ORCHESTRATOR_MODEL = "claude-opus-4-6";
export const ORCHESTRATOR_TEMPERATURE = DEFAULT_TEMPERATURE;
export const ORCHESTRATOR_MODE: AgentMode = "all";
export const ORCHESTRATOR_FALLBACK_MODELS = [
  "claude-opus-4-6",
  "claude-sonnet-4-6",
];
