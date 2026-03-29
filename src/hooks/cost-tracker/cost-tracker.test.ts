import { beforeEach, describe, expect, it } from "bun:test"

import { createChatParamsHandler, createEventHandler, resetCostTrackerState } from "./handler"
import { lookupPricing } from "./pricing"
import { CostStore, costStore } from "./store"

describe("cost-tracker", () => {
  beforeEach(() => {
    costStore.reset()
    resetCostTrackerState()
  })

  describe("pricing lookup", () => {
    it("returns pricing for exact model matches", () => {
      const pricing = lookupPricing("gpt-4o")

      expect(pricing).not.toBeNull()
      expect(pricing?.inputPer1M).toBe(2.5)
      expect(pricing?.outputPer1M).toBe(10)
      expect(pricing?.currency).toBe("USD")
    })

    it("returns pricing for fuzzy model matches", () => {
      const pricing = lookupPricing("anthropic/claude-3-5-sonnet-20241022")

      expect(pricing).not.toBeNull()
      expect(pricing?.inputPer1M).toBe(3)
      expect(pricing?.outputPer1M).toBe(15)
    })

    it("returns null when model pricing is unknown", () => {
      const pricing = lookupPricing("unknown/model")

      expect(pricing).toBeNull()
    })
  })

  describe("CostStore", () => {
    it("records entries and returns aggregate summary", () => {
      const store = new CostStore()

      store.record({
        timestamp: "2026-03-28T00:00:00.000Z",
        model: "gpt-4o",
        provider: "openai",
        inputTokens: 1000,
        outputTokens: 500,
        estimatedCost: 0.0075,
      })
      store.record({
        timestamp: "2026-03-28T00:01:00.000Z",
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokens: 2000,
        outputTokens: 1000,
        estimatedCost: 0.0009,
      })

      const summary = store.getSummary()
      expect(summary.entries).toHaveLength(2)
      expect(summary.totalInputTokens).toBe(3000)
      expect(summary.totalOutputTokens).toBe(1500)
      expect(summary.totalEstimatedCost).toBeCloseTo(0.0084)
      expect(summary.currency).toBe("USD")
    })
  })

  describe("handlers", () => {
    it("records session.idle usage when model context exists", async () => {
      const chatParamsHandler = createChatParamsHandler() as (
        input: unknown,
        output: unknown,
      ) => Promise<void> | void
      const eventHandler = createEventHandler() as (input: unknown) => Promise<void> | void

      await chatParamsHandler(
        {
          sessionID: "session-1",
          model: {
            modelID: "anthropic/claude-3-5-sonnet-20241022",
            providerID: "anthropic",
          },
        },
        {},
      )

      await eventHandler({
        event: {
          type: "session.idle",
          properties: {
            sessionID: "session-1",
            usage: {
              inputTokens: 1000,
              outputTokens: 500,
            },
          },
        },
      })

      const summary = costStore.getSummary()
      expect(summary.entries).toHaveLength(1)
      expect(summary.entries[0]?.model).toBe("anthropic/claude-3-5-sonnet-20241022")
      expect(summary.entries[0]?.provider).toBe("anthropic")
      expect(summary.totalInputTokens).toBe(1000)
      expect(summary.totalOutputTokens).toBe(500)
      expect(summary.totalEstimatedCost).toBeCloseTo(0.0105)
    })

    it("ignores invalid payloads without recording entries", async () => {
      const chatParamsHandler = createChatParamsHandler() as (
        input: unknown,
        output: unknown,
      ) => Promise<void> | void
      const eventHandler = createEventHandler() as (input: unknown) => Promise<void> | void

      await chatParamsHandler(null, null)
      await chatParamsHandler({ model: "invalid" }, {})

      await eventHandler(null)
      await eventHandler({ event: "invalid" })
      await eventHandler({
        event: {
          type: "session.idle",
          properties: {
            usage: {
              inputTokens: "1000",
            },
          },
        },
      })

      const summary = costStore.getSummary()
      expect(summary.entries).toHaveLength(0)
      expect(summary.totalInputTokens).toBe(0)
      expect(summary.totalOutputTokens).toBe(0)
      expect(summary.totalEstimatedCost).toBe(0)
    })
  })
})
