import type { AgentMode } from "../../types/agent";
import { DEFAULT_TEMPERATURE } from "../../config/defaults";

export const WORKER_TEMPERATURE = DEFAULT_TEMPERATURE;
export const WORKER_MODE: AgentMode = "subagent";
export const WORKER_FALLBACK_MODELS = ["gpt-5.3-codex"];
