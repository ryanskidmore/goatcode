import type { AgentMode } from "../../types/agent"

export const REVIEWER_MODEL = "openai/gpt-5.4"
export const REVIEWER_TEMPERATURE = 0.1
export const REVIEWER_MODE: AgentMode = "subagent"
export const REVIEWER_FALLBACK_MODELS = [
  "openai/gpt-5.4",
  "anthropic/claude-opus-4-6",
]
export const REVIEWER_DENIED_TOOLS = ["write", "edit", "task"]
