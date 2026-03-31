import type { AgentMode } from "../../types/agent";
import { DEFAULT_TEMPERATURE } from "../../config/defaults";

export const DEEP_WORKER_TEMPERATURE = DEFAULT_TEMPERATURE;
export const DEEP_WORKER_MODE: AgentMode = "all";
export const DEEP_WORKER_FALLBACK_MODELS = ["gpt-5.3-codex", "claude-opus-4-6"];
export const DEEP_WORKER_DEFAULT_MODEL = DEEP_WORKER_FALLBACK_MODELS[0];
