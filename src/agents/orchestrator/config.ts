import type { AgentMode } from "../../types/agent";
import { DEFAULT_TEMPERATURE } from "../../config/defaults";

export const ORCHESTRATOR_TEMPERATURE = DEFAULT_TEMPERATURE;
export const ORCHESTRATOR_MODE: AgentMode = "all";
export const ORCHESTRATOR_FALLBACK_MODELS = [
  "gpt-5.4",
  "gemini-3.1-pro-preview",
  "claude-sonnet-4-6",
];
export const ORCHESTRATOR_DEFAULT_MODEL = ORCHESTRATOR_FALLBACK_MODELS[0];
