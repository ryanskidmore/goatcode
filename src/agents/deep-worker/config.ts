import type { AgentMode } from "../../types/agent"

export const DEEP_WORKER_MODEL = "openai/gpt-5.3-codex"
export const DEEP_WORKER_TEMPERATURE = 0.1
export const DEEP_WORKER_MODE: AgentMode = "all"
export const DEEP_WORKER_FALLBACK_MODELS = [
  "openai/gpt-5.3-codex",
  "anthropic/claude-opus-4-6",
]
