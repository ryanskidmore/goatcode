export const AGENT_FALLBACK_CHAINS: Record<string, string[]> = {
  orchestrator: ["gpt-5.4", "gemini-3.1-pro-preview", "claude-sonnet-4-6"],
  deepworker: ["claude-opus-4-6"],
  planner: ["gpt-5.4", "gemini-3.1-pro-preview", "claude-sonnet-4-6"],
  advisor: ["claude-opus-4-6"],
  researcher: ["gpt-5.3-codex"],
  explorer: ["gpt-5.4-mini", "gemini-3.1-flash-lite-preview"],
  worker: ["gpt-5.3-codex"],
};

export function getFallbackChain(agentName: string): string[] {
  return AGENT_FALLBACK_CHAINS[agentName] ?? [];
}
