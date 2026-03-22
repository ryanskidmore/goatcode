import { normalizeModel } from "./model-normalization"
import { isModelAvailable } from "./model-availability"

export type ModelResolutionInput = {
  override?: string
  categoryDefault?: string
  fallbackChain?: string[]
  systemDefault?: string
  availableModels?: Set<string>
}

export type ModelResolutionSource = "override" | "category-default" | "fallback" | "system-default"

export type ModelResolutionResult = {
  model: string
  source: ModelResolutionSource
}

export function resolveModel(input: ModelResolutionInput): ModelResolutionResult | undefined {
  const available = input.availableModels ?? new Set<string>()

  const override = normalizeModel(input.override)
  if (override) return { model: override, source: "override" }

  const categoryDefault = normalizeModel(input.categoryDefault)
  if (categoryDefault && isModelAvailable(categoryDefault, available)) {
    return { model: categoryDefault, source: "category-default" }
  }

  for (const fallback of input.fallbackChain ?? []) {
    const normalized = normalizeModel(fallback)
    if (normalized && isModelAvailable(normalized, available)) {
      return { model: normalized, source: "fallback" }
    }
  }

  const systemDefault = normalizeModel(input.systemDefault)
  if (systemDefault) return { model: systemDefault, source: "system-default" }

  return undefined
}
