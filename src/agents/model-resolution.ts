export type ModelResolutionInput = {
  override?: string
  categoryDefault?: string
  fallbackChain?: string[]
  systemDefault?: string
}

export type ModelResolutionResult = {
  model: string
  source: "override" | "category-default" | "fallback" | "system-default"
}

export function resolveModel(input: ModelResolutionInput): ModelResolutionResult | undefined {
  if (input.override) {
    return { model: input.override, source: "override" }
  }

  if (input.categoryDefault) {
    return { model: input.categoryDefault, source: "category-default" }
  }

  if (input.fallbackChain?.length) {
    return { model: input.fallbackChain[0], source: "fallback" }
  }

  if (input.systemDefault) {
    return { model: input.systemDefault, source: "system-default" }
  }

  return undefined
}
