export const AGENT_FALLBACK_CHAINS: Record<string, string[]> = {
  orchestrator: ["anthropic/claude-opus-4-6", "anthropic/claude-sonnet-4-6"],
  "deep-worker": ["openai/gpt-5.3-codex", "anthropic/claude-opus-4-6"],
  "plan-builder": ["anthropic/claude-opus-4-6", "anthropic/claude-sonnet-4-6"],
  advisor: ["openai/gpt-5.4", "anthropic/claude-opus-4-6"],
  researcher: ["google/gemini-3-flash", "anthropic/claude-sonnet-4-6"],
  explorer: ["x-ai/grok-code-fast-1", "anthropic/claude-sonnet-4-6"],
  executor: ["anthropic/claude-sonnet-4-6", "anthropic/claude-haiku-4-6"],
  analyst: ["anthropic/claude-opus-4-6", "openai/gpt-5.4"],
  reviewer: ["openai/gpt-5.4", "anthropic/claude-opus-4-6"],
  inspector: ["openai/gpt-5.3-codex", "anthropic/claude-opus-4-6"],
  worker: ["anthropic/claude-sonnet-4-6", "anthropic/claude-haiku-4-6"],
}

export function getFallbackChain(agentName: string): string[] {
  return AGENT_FALLBACK_CHAINS[agentName] ?? []
}
