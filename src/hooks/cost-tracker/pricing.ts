import type { ModelPricing } from "./types"

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "claude-3-5-sonnet": { inputPer1M: 3, outputPer1M: 15, currency: "USD" },
  "claude-3-5-haiku": { inputPer1M: 0.8, outputPer1M: 4, currency: "USD" },
  "claude-sonnet-4": { inputPer1M: 3, outputPer1M: 15, currency: "USD" },
  "claude-opus-4": { inputPer1M: 15, outputPer1M: 75, currency: "USD" },
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10, currency: "USD" },
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6, currency: "USD" },
  "gpt-4.1": { inputPer1M: 2, outputPer1M: 8, currency: "USD" },
  "gpt-4.1-mini": { inputPer1M: 0.4, outputPer1M: 1.6, currency: "USD" },
  "gpt-4.1-nano": { inputPer1M: 0.1, outputPer1M: 0.4, currency: "USD" },
  o3: { inputPer1M: 2, outputPer1M: 8, currency: "USD" },
  "o4-mini": { inputPer1M: 1.1, outputPer1M: 4.4, currency: "USD" },
  "deepseek-chat": { inputPer1M: 0.27, outputPer1M: 1.1, currency: "USD" },
  "deepseek-reasoner": { inputPer1M: 0.55, outputPer1M: 2.19, currency: "USD" },
}

function normalizeModelID(modelId: string): string {
  return modelId.trim().toLowerCase().replace(/[_.]/g, "-")
}

export function lookupPricing(modelId: string): ModelPricing | null {
  const normalized = normalizeModelID(modelId)
  if (!normalized) {
    return null
  }

  const candidates = new Set<string>([
    normalized,
    normalized.split("/").at(-1) ?? normalized,
    normalized.split(":").at(-1) ?? normalized,
  ])

  for (const candidate of candidates) {
    const exact = MODEL_PRICING[candidate]
    if (exact) {
      return exact
    }
  }

  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    for (const candidate of candidates) {
      if (candidate.includes(key) || key.includes(candidate)) {
        return pricing
      }
    }
  }

  return null
}
