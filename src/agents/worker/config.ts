import type { AgentMode } from "../../types/agent";
import { DEFAULT_TEMPERATURE } from "../../config/defaults";

export const WORKER_MODEL = "claude-sonnet-4-6";
export const WORKER_TEMPERATURE = DEFAULT_TEMPERATURE;
export const WORKER_MODE: AgentMode = "subagent";
export const WORKER_FALLBACK_MODELS = ["claude-sonnet-4-6", "claude-haiku-4-6"];
