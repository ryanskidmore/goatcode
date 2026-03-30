export const AGENT_FALLBACK_CHAINS: Record<string, string[]> = {
  orchestrator: ["anthropic/claude-sonnet-4-6"],
  "deep-worker": ["anthropic/claude-opus-4-6"],
  planner: ["anthropic/claude-sonnet-4-6"],
  advisor: ["anthropic/claude-opus-4-6"],
  researcher: ["anthropic/claude-sonnet-4-6"],
  explorer: ["anthropic/claude-sonnet-4-6"],
  worker: ["anthropic/claude-haiku-4-6"],
};

export function getFallbackChain(agentName: string): string[] {
  return AGENT_FALLBACK_CHAINS[agentName] ?? [];
}
