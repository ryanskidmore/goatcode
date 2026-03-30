import { normalizeModel } from "./model-normalization";
import { isModelAvailable } from "./model-availability";
import { qualifyModel } from "./provider-registry";

export type ModelResolutionInput = {
  override?: string;
  categoryDefault?: string;
  fallbackChain?: string[];
  systemDefault?: string;
  availableModels?: Set<string>;
  preferredProvider?: string;
};

export type ModelResolutionSource = "override" | "category-default" | "fallback" | "system-default";

export type ModelResolutionResult = {
  model: string;
  source: ModelResolutionSource;
};

function normalizeAndQualify(model: string | undefined, preferredProvider?: string): string | undefined {
  const normalized = normalizeModel(model);
  if (!normalized) return undefined;
  return qualifyModel(normalized, preferredProvider);
}

export function resolveModel(input: ModelResolutionInput): ModelResolutionResult | undefined {
  const available = input.availableModels ?? new Set<string>();
  const pref = input.preferredProvider;

  const override = normalizeAndQualify(input.override, pref);
  if (override) return { model: override, source: "override" };

  const categoryDefault = normalizeAndQualify(input.categoryDefault, pref);
  if (categoryDefault && isModelAvailable(categoryDefault, available)) {
    return { model: categoryDefault, source: "category-default" };
  }

  for (const fallback of input.fallbackChain ?? []) {
    const normalized = normalizeAndQualify(fallback, pref);
    if (normalized && isModelAvailable(normalized, available)) {
      return { model: normalized, source: "fallback" };
    }
  }

  const systemDefault = normalizeAndQualify(input.systemDefault, pref);
  if (systemDefault && isModelAvailable(systemDefault, available)) {
    return { model: systemDefault, source: "system-default" };
  }

  return undefined;
}
