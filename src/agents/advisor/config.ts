import type { AgentMode } from "../../types/agent"

export const ADVISOR_MODEL = "openai/gpt-5.4"
export const ADVISOR_TEMPERATURE = 0.1
export const ADVISOR_MODE: AgentMode = "subagent"
export const ADVISOR_FALLBACK_MODELS = [
  "openai/gpt-5.4",
  "anthropic/claude-opus-4-6",
]
export const ADVISOR_DENIED_TOOLS = ["write", "edit", "task"]
