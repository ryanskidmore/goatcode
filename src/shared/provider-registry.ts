export interface ProviderDefinition {
  readonly id: string;
  readonly patterns: readonly RegExp[];
  /** Lower = higher priority. Direct providers: 0, aggregators: 10. */
  readonly priority: number;
}

export interface ProviderResolutionResult {
  readonly qualifiedModel: string;
  readonly providerId: string;
}

const ANTHROPIC_PATTERNS: readonly RegExp[] = [/^claude-/];

const OPENAI_PATTERNS: readonly RegExp[] = [
  /^gpt-/,
  /^o[1-4](-|$)/,
  /^codex-/,
  /^text-embedding-/,
  /^dall-e-/,
  /^whisper-/,
  /^tts-/,
];

const GOOGLE_PATTERNS: readonly RegExp[] = [/^gemini-/, /^gemma-/];

const OPENCODE_PATTERNS: readonly RegExp[] = [
  /^claude-/,
  /^gpt-/,
  /^o[1-4](-|$)/,
  /^codex-/,
  /^gemini-/,
  /^gemma-/,
  /^glm-/,
  /^minimax-/,
  /^qwen/,
  /^kimi-/,
  /^deepseek-/,
];

const BUILTIN_PROVIDERS: ProviderDefinition[] = [
  { id: "anthropic", patterns: ANTHROPIC_PATTERNS, priority: 0 },
  { id: "openai", patterns: OPENAI_PATTERNS, priority: 0 },
  { id: "google", patterns: GOOGLE_PATTERNS, priority: 0 },
  { id: "opencode", patterns: OPENCODE_PATTERNS, priority: 10 },
];

let providers: ProviderDefinition[] = [...BUILTIN_PROVIDERS];

export function registerProvider(definition: ProviderDefinition): void {
  providers = providers.filter((p) => p.id !== definition.id);
  providers.push(definition);
}

export function unregisterProvider(id: string): boolean {
  const before = providers.length;
  providers = providers.filter((p) => p.id !== id);
  return providers.length < before;
}

export function getRegisteredProviders(): readonly ProviderDefinition[] {
  return [...providers].sort((a, b) => a.priority - b.priority);
}

export function resetProviders(): void {
  providers = [...BUILTIN_PROVIDERS];
}

export function isQualifiedModel(model: string): boolean {
  return model.includes("/");
}

export function findMatchingProviders(bareModel: string): ProviderDefinition[] {
  const normalized = bareModel.toLowerCase().trim();
  return providers
    .filter((p) => p.patterns.some((re) => re.test(normalized)))
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Resolve a bare model name to "provider/model". Already-qualified models
 * pass through. Uses `preferredProvider` when set, otherwise highest-priority match.
 */
export function resolveProvider(
  model: string,
  preferredProvider?: string,
): ProviderResolutionResult | undefined {
  const trimmed = model.trim().toLowerCase();
  if (!trimmed) return undefined;

  if (isQualifiedModel(trimmed)) {
    const slashIdx = trimmed.indexOf("/");
    return {
      qualifiedModel: trimmed,
      providerId: trimmed.slice(0, slashIdx),
    };
  }

  const matches = findMatchingProviders(trimmed);
  if (matches.length === 0) return undefined;

  if (preferredProvider) {
    const preferred = matches.find((p) => p.id === preferredProvider);
    if (preferred) {
      return {
        qualifiedModel: `${preferred.id}/${trimmed}`,
        providerId: preferred.id,
      };
    }
  }

  const best = matches[0]!;
  return {
    qualifiedModel: `${best.id}/${trimmed}`,
    providerId: best.id,
  };
}

export function qualifyModel(model: string, preferredProvider?: string): string {
  const result = resolveProvider(model, preferredProvider);
  return result?.qualifiedModel ?? model;
}
