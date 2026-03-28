import type { SessionCostSummary, UsageEntry } from "./types"

export class CostStore {
  private readonly entries: UsageEntry[] = []

  record(entry: UsageEntry): void {
    this.entries.push(entry)
  }

  getSummary(): SessionCostSummary {
    const totalInputTokens = this.entries.reduce((sum, entry) => sum + entry.inputTokens, 0)
    const totalOutputTokens = this.entries.reduce((sum, entry) => sum + entry.outputTokens, 0)
    const totalEstimatedCost = this.entries.reduce((sum, entry) => sum + entry.estimatedCost, 0)

    return {
      entries: [...this.entries],
      totalInputTokens,
      totalOutputTokens,
      totalEstimatedCost,
      currency: "USD",
    }
  }

  reset(): void {
    this.entries.length = 0
  }
}

export const costStore = new CostStore()
