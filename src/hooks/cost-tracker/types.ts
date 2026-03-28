export type ModelPricing = {
  inputPer1M: number
  outputPer1M: number
  currency: string
}

export type UsageEntry = {
  timestamp: string
  model: string
  provider: string
  inputTokens: number
  outputTokens: number
  estimatedCost: number
}

export type SessionCostSummary = {
  entries: UsageEntry[]
  totalInputTokens: number
  totalOutputTokens: number
  totalEstimatedCost: number
  currency: string
}
