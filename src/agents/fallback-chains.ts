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

/**
 * Convert a user-supplied `fallback_models` config value into a `FallbackEntry[]`
 * suitable for the model resolution pipeline.
 *
 * Qualified strings ("provider/model-id") extract the provider prefix and include
 * "opencode" as a universal fallback alongside it.
 * Unqualified strings ("model-id") are served by "opencode" only.
 *
 * @example
 *   buildCustomFallbackChain("anthropic/claude-opus-4-6")
 *   // => [{ providers: ["anthropic", "opencode"], model: "claude-opus-4-6" }]
 *
 *   buildCustomFallbackChain(["openai/gpt-5.4", "claude-sonnet-4-6"])
 *   // => [
 *   //   { providers: ["openai", "opencode"], model: "gpt-5.4" },
 *   //   { providers: ["opencode"], model: "claude-sonnet-4-6" },
 *   // ]
 */
export function buildCustomFallbackChain(models: string | string[]): FallbackEntry[] {
  const list = Array.isArray(models) ? models : [models];
  return list.map((m): FallbackEntry => {
    const slash = m.indexOf("/");
    if (slash > 0) {
      return { providers: [m.slice(0, slash), "opencode"], model: m.slice(slash + 1) };
    }
    return { providers: ["opencode"], model: m };
  });
}

function uniqueFallbackEntries(entries: FallbackEntry[]): FallbackEntry[] {
  const seen = new Set<string>();
  const result: FallbackEntry[] = [];
  for (const entry of entries) {
    const providersKey = [...entry.providers].sort().join("|");
    const key = `${providersKey}/${entry.model}/${entry.variant ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }
  return result;
}

export function mergeFallbackChains(input: {
  defaults: FallbackEntry[];
  overrides?: string | string[];
  mode?: "replace" | "append" | "prepend";
}): FallbackEntry[] {
  const overrideEntries = input.overrides ? buildCustomFallbackChain(input.overrides) : [];
  if (overrideEntries.length === 0) {
    return [...input.defaults];
  }

  const mode = input.mode ?? "replace";
  if (mode === "append") {
    return uniqueFallbackEntries([...input.defaults, ...overrideEntries]);
  }
  if (mode === "prepend") {
    return uniqueFallbackEntries([...overrideEntries, ...input.defaults]);
  }

  return uniqueFallbackEntries([...overrideEntries]);
}
