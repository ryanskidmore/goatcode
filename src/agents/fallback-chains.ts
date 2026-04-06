/**
 * A fallback entry names which providers can serve a model.
 * The resolution pipeline iterates entries and picks the first
 * whose `providers` list intersects with the connected providers.
 */
export type FallbackEntry = {
  providers: string[];
  model: string;
  variant?: string;
};

/**
 * Per-agent fallback chains. Each entry lists the providers that
 * serve the model — resolution picks the first connected match.
 */
export const AGENT_FALLBACK_CHAINS: Record<string, FallbackEntry[]> = {
  orchestrator: [
    { providers: ["anthropic", "opencode"], model: "claude-opus-4-6", variant: "max" },
    { providers: ["openai", "opencode"], model: "gpt-5.4", variant: "medium" },
    { providers: ["google", "opencode"], model: "gemini-3.1-pro-preview" },
  ],
  deepworker: [
    { providers: ["openai", "opencode"], model: "gpt-5.3-codex", variant: "medium" },
    { providers: ["anthropic", "opencode"], model: "claude-opus-4-6", variant: "max" },
  ],
  planner: [
    { providers: ["openai", "opencode"], model: "gpt-5.4", variant: "high" },
    { providers: ["google", "opencode"], model: "gemini-3.1-pro-preview" },
    { providers: ["anthropic", "opencode"], model: "claude-sonnet-4-6" },
  ],
  advisor: [
    { providers: ["anthropic", "opencode"], model: "claude-opus-4-6", variant: "max" },
    { providers: ["openai", "opencode"], model: "gpt-5.4", variant: "high" },
  ],
  researcher: [
    { providers: ["openai", "opencode"], model: "gpt-5.3-codex", variant: "medium" },
    { providers: ["anthropic", "opencode"], model: "claude-sonnet-4-6" },
  ],
  explorer: [
    { providers: ["anthropic", "opencode"], model: "claude-haiku-4-5" },
    { providers: ["openai", "opencode"], model: "gpt-5.4-mini" },
    { providers: ["google", "opencode"], model: "gemini-3.1-flash-lite-preview" },
  ],
  worker: [
    { providers: ["anthropic", "opencode"], model: "claude-sonnet-4-6" },
    { providers: ["openai", "opencode"], model: "gpt-5.3-codex", variant: "medium" },
  ],
};

export function getFallbackChain(agentName: string): FallbackEntry[] {
  return AGENT_FALLBACK_CHAINS[agentName] ?? [];
}

/**
 * Per-category fallback chains for task delegation.
 */
export const CATEGORY_FALLBACK_CHAINS: Record<string, FallbackEntry[]> = {
  "visual-engineering": [
    { providers: ["google", "opencode"], model: "gemini-3.1-pro", variant: "high" },
    { providers: ["anthropic", "opencode"], model: "claude-opus-4-6", variant: "max" },
    { providers: ["openai", "opencode"], model: "gpt-5.4" },
  ],
  ultrabrain: [
    { providers: ["openai", "opencode"], model: "gpt-5.4", variant: "xhigh" },
    { providers: ["google", "opencode"], model: "gemini-3.1-pro", variant: "high" },
    { providers: ["anthropic", "opencode"], model: "claude-opus-4-6", variant: "max" },
  ],
  deep: [
    { providers: ["openai", "opencode"], model: "gpt-5.3-codex", variant: "medium" },
    { providers: ["anthropic", "opencode"], model: "claude-opus-4-6", variant: "max" },
    { providers: ["google", "opencode"], model: "gemini-3.1-pro", variant: "high" },
  ],
  artistry: [
    { providers: ["google", "opencode"], model: "gemini-3.1-pro", variant: "high" },
    { providers: ["anthropic", "opencode"], model: "claude-opus-4-6", variant: "max" },
    { providers: ["openai", "opencode"], model: "gpt-5.4" },
  ],
  quick: [
    { providers: ["openai", "opencode"], model: "gpt-5.4-mini" },
    { providers: ["anthropic", "opencode"], model: "claude-haiku-4-5" },
    { providers: ["google", "opencode"], model: "gemini-3-flash" },
  ],
  "unspecified-low": [
    { providers: ["anthropic", "opencode"], model: "claude-sonnet-4-6" },
    { providers: ["openai", "opencode"], model: "gpt-5.3-codex", variant: "medium" },
    { providers: ["google", "opencode"], model: "gemini-3-flash" },
  ],
  "unspecified-high": [
    { providers: ["anthropic", "opencode"], model: "claude-opus-4-6", variant: "max" },
    { providers: ["openai", "opencode"], model: "gpt-5.4", variant: "high" },
    { providers: ["google", "opencode"], model: "gemini-3.1-pro", variant: "high" },
  ],
  writing: [
    { providers: ["google", "opencode"], model: "gemini-3.1-flash-lite" },
    { providers: ["anthropic", "opencode"], model: "claude-sonnet-4-6" },
    { providers: ["openai", "opencode"], model: "gpt-5.4-mini" },
  ],
};

export function getCategoryFallbackChain(categoryName: string): FallbackEntry[] {
  return CATEGORY_FALLBACK_CHAINS[categoryName] ?? [];
}
