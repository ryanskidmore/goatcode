import type { AgentMode } from "../../types/agent";

export const ANALYST_MODEL = "anthropic/claude-opus-4-6";
export const ANALYST_TEMPERATURE = 0.3;
export const ANALYST_MODE: AgentMode = "subagent";
export const ANALYST_FALLBACK_MODELS = ["anthropic/claude-opus-4-6", "openai/gpt-5.4"];
