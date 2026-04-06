import type { FallbackEntry } from "../agents/fallback-chains";
import { normalizeModel } from "./model-normalization";
import { isModelAvailable } from "./model-availability";
import { readConnectedProviders } from "./connected-providers-cache";
import { log } from "./logger";

export type ModelResolutionInput = {
  /** User-specified model override (already qualified, e.g. "openai/gpt-5.4"). */
  override?: string;
  /** Fallback chain with explicit provider lists per entry. */
  fallbackChain?: FallbackEntry[];
  /** Connected provider IDs. If omitted, reads from disk cache. */
  connectedProviders?: string[] | null;
};

export type ModelResolutionSource = "override" | "fallback" | "skipped";

export type ModelResolutionResult = {
  /** Fully qualified model: "provider/model". */
  model: string;
  source: ModelResolutionSource;
  variant?: string;
};

/**
 * Resolve a model by matching fallback entries against connected providers.
 *
 * 1. If an explicit override is given, use it directly.
 * 2. Iterate the fallback chain — for each entry, check if any of its
 *    providers are in the connected set. Return the first match as
 *    "provider/model".
 * 3. If no connected providers data exists (first run), return undefined
 *    so the caller can let OpenCode handle routing.
 */
export function resolveModel(input: ModelResolutionInput): ModelResolutionResult | undefined {
  // 1. Explicit override — pass through unchanged
  const override = normalizeModel(input.override);
  if (override) {
    log("[model-resolution] Resolved via override", { model: override });
    return { model: override, source: "override" };
  }

  // 2. Determine connected providers
  const connected =
    input.connectedProviders !== undefined ? input.connectedProviders : readConnectedProviders();

  // First run — no cache, no discovery. Let OpenCode handle routing.
  if (connected === null) {
    log("[model-resolution] No connected providers data (first run), skipping");
    return undefined;
  }

  const connectedSet = new Set(connected);

  // 3. Walk the fallback chain
  const chain = input.fallbackChain ?? [];
  for (const entry of chain) {
    for (const provider of entry.providers) {
      if (connectedSet.has(provider)) {
        const qualified = `${provider}/${entry.model}`;
        log("[model-resolution] Resolved via fallback chain", {
          provider,
          model: entry.model,
          variant: entry.variant,
          qualified,
        });
        return {
          model: qualified,
          source: "fallback",
          variant: entry.variant,
        };
      }
    }
  }

  log("[model-resolution] No connected provider matched any fallback entry", {
    connected,
    chainLength: chain.length,
  });
  return undefined;
}

// ---------------------------------------------------------------------------
// Runtime fallback — for hooks that work with already-qualified model strings
// ---------------------------------------------------------------------------

export type QualifiedFallbackInput = {
  /** User override (already qualified). */
  override?: string;
  /** Already-qualified model strings to try in order. */
  fallbackChain?: string[];
  /** Set of available models for availability checking. */
  availableModels?: Set<string>;
};

/**
 * Resolve a model from a list of already-qualified strings.
 * Used by runtime fallback hooks (model-fallback, runtime-fallback,
 * foreground-fallback) that operate on qualified model IDs.
 */
export function resolveQualifiedModel(
  input: QualifiedFallbackInput,
): ModelResolutionResult | undefined {
  const available = input.availableModels ?? new Set<string>();

  const override = normalizeModel(input.override);
  if (override) return { model: override, source: "override" };

  for (const model of input.fallbackChain ?? []) {
    const normalized = normalizeModel(model);
    if (normalized && isModelAvailable(normalized, available)) {
      return { model: normalized, source: "fallback" };
    }
  }

  return undefined;
}
