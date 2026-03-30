import type { AgentMode } from "../../types/agent";
import { DEFAULT_TEMPERATURE } from "../../config/defaults";

export const DEEP_WORKER_TEMPERATURE = DEFAULT_TEMPERATURE;
export const DEEP_WORKER_MODE: AgentMode = "all";
export const DEEP_WORKER_FALLBACK_MODELS = ["claude-opus-4-6"];
