import type { AgentMode } from "../../types/agent"

export const INSPECTOR_MODEL = "openai/gpt-5.3-codex"
export const INSPECTOR_TEMPERATURE = 0.1
export const INSPECTOR_MODE: AgentMode = "subagent"
export const INSPECTOR_FALLBACK_MODELS = [
  "openai/gpt-5.3-codex",
  "anthropic/claude-opus-4-6",
]
export const INSPECTOR_ALLOWED_TOOLS = ["read"]
