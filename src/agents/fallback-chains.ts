export const AGENT_FALLBACK_CHAINS: Record<string, string[]> = {
  orchestrator: ["claude-sonnet-4-6"],
  "deep-worker": ["claude-opus-4-6"],
  planner: ["claude-sonnet-4-6"],
  advisor: ["claude-opus-4-6"],
  researcher: ["claude-sonnet-4-6"],
  explorer: ["claude-sonnet-4-6"],
  worker: ["claude-haiku-4-6"],
};

export function getFallbackChain(agentName: string): string[] {
  return AGENT_FALLBACK_CHAINS[agentName] ?? [];
}
