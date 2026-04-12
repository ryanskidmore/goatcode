import { CategoryResolver, type CategoryOverrides } from "../../runtime";
import { DEFAULT_CATEGORIES as DELEGATE_DEFAULT_CATEGORIES } from "./constants";
import type { CategoryConfig as DelegateCategoryConfig } from "./types";
import { mergeFallbackChains } from "../../agents/fallback-chains";

const resolver = new CategoryResolver();

export function resolveCategory(
  name: string,
  configOverrides?: CategoryOverrides,
): DelegateCategoryConfig | undefined {
  const effectiveOverrides = configOverrides;
  const base = DELEGATE_DEFAULT_CATEGORIES[name];
  if (!base) return undefined;

  const resolved = resolver.resolve(name, effectiveOverrides);
  if (!resolved) return undefined;

  const override = effectiveOverrides?.[name as keyof CategoryOverrides];
  const mergedFallbackChain = mergeFallbackChains({
    defaults: base.fallback_chain ?? [],
    overrides: override?.fallback_models,
    mode: override?.fallback_mode,
  });

  // Keep runtime-resolved model/variant/prompt data while preserving
  // delegate-task specific fallback_chain from tool defaults.
  return {
    ...base,
    ...resolved,
    fallback_chain: mergedFallbackChain,
  };
}

export function resolveCategoryWithDefaults(
  name: string,
  configOverrides?: CategoryOverrides,
): DelegateCategoryConfig | undefined {
  return resolveCategory(name, configOverrides);
}
