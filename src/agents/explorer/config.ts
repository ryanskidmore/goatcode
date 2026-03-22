import type { AgentMode } from "../../types/agent"

export const EXPLORER_MODEL = "x-ai/grok-code-fast-1"
export const EXPLORER_TEMPERATURE = 0.0
export const EXPLORER_MODE: AgentMode = "subagent"
export const EXPLORER_FALLBACK_MODELS = [
  "x-ai/grok-code-fast-1",
  "anthropic/claude-sonnet-4-6",
]
