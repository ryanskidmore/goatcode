import type { PluginHookContributions } from "../../types/hook"
import { log } from "../../shared/logger"
import { lookupPricing } from "./pricing"
import { costStore } from "./store"
import type { UsageEntry } from "./types"

type ChatParamsHook = NonNullable<PluginHookContributions["chat.params"]>
type EventHook = NonNullable<PluginHookContributions["event"]>

type ModelContext = {
  model: string
  provider: string
}

const modelContextBySession = new Map<string, ModelContext>()
const MAX_SESSION_CONTEXTS = 5000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function getSessionID(record: Record<string, unknown>): string | null {
  const sessionID = record.sessionID
  if (typeof sessionID === "string" && sessionID.length > 0) {
    return sessionID
  }

  const sessionId = record.sessionId
  if (typeof sessionId === "string" && sessionId.length > 0) {
    return sessionId
  }

  return null
}

function toTokenCount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null
  }

  return value
}

function extractTokens(properties: Record<string, unknown>): { inputTokens: number; outputTokens: number } | null {
  const usage = properties.usage
  const usageRecord = isRecord(usage) ? usage : null

  const inputTokens =
    toTokenCount(usageRecord?.inputTokens) ??
    toTokenCount(usageRecord?.input) ??
    toTokenCount(properties.inputTokens) ??
    toTokenCount(properties.input)

  const outputTokens =
    toTokenCount(usageRecord?.outputTokens) ??
    toTokenCount(usageRecord?.output) ??
    toTokenCount(properties.outputTokens) ??
    toTokenCount(properties.output)

  if (inputTokens === null && outputTokens === null) {
    return null
  }

  return {
    inputTokens: inputTokens ?? 0,
    outputTokens: outputTokens ?? 0,
  }
}

function estimateCost(modelID: string, inputTokens: number, outputTokens: number): number {
  const pricing = lookupPricing(modelID)
  if (!pricing) {
    return 0
  }

  return (inputTokens / 1_000_000) * pricing.inputPer1M + (outputTokens / 1_000_000) * pricing.outputPer1M
}

function extractModelContext(properties: Record<string, unknown>): ModelContext | null {
  const model = properties.model
  if (isRecord(model) && typeof model.modelID === "string") {
    const provider = typeof model.providerID === "string" ? model.providerID : "unknown"
    return { model: model.modelID, provider }
  }

  const modelID = properties.modelID
  if (typeof modelID === "string") {
    const providerID = properties.providerID
    const provider = typeof providerID === "string" ? providerID : "unknown"
    return { model: modelID, provider }
  }

  return null
}

function resolveModelContext(properties: Record<string, unknown>): ModelContext {
  const directContext = extractModelContext(properties)
  if (directContext) {
    return directContext
  }

  const sessionID = getSessionID(properties)
  if (sessionID) {
    const sessionContext = modelContextBySession.get(sessionID)
    if (sessionContext) {
      return sessionContext
    }
  }

  return {
    model: "unknown",
    provider: "unknown",
  }
}

function recordUsage(modelContext: ModelContext, inputTokens: number, outputTokens: number): UsageEntry {
  const entry: UsageEntry = {
    timestamp: new Date().toISOString(),
    model: modelContext.model,
    provider: modelContext.provider,
    inputTokens,
    outputTokens,
    estimatedCost: estimateCost(modelContext.model, inputTokens, outputTokens),
  }

  costStore.record(entry)
  return entry
}

export function resetCostTrackerState(): void {
  modelContextBySession.clear()
}

export function createChatParamsHandler(): ChatParamsHook {
  return async (input: unknown) => {
    try {
      if (!isRecord(input)) {
        return
      }

      const model = input.model
      if (!isRecord(model) || typeof model.modelID !== "string" || typeof model.providerID !== "string") {
        return
      }

      const modelContext: ModelContext = {
        model: model.modelID,
        provider: model.providerID,
      }

      const sessionID = getSessionID(input)
      if (sessionID) {
        if (!modelContextBySession.has(sessionID) && modelContextBySession.size >= MAX_SESSION_CONTEXTS) {
          const oldestSessionID = modelContextBySession.keys().next().value
          if (typeof oldestSessionID === "string") {
            modelContextBySession.delete(oldestSessionID)
          }
        }
        modelContextBySession.set(sessionID, modelContext)
      }
    } catch (error) {
      log("[cost-tracker] chat.params handling failed", { error: String(error) })
    }
  }
}

export function createEventHandler(): EventHook {
  return async (input: unknown) => {
    try {
      if (!isRecord(input)) {
        return
      }

      const event = input.event
      if (!isRecord(event) || event.type !== "session.idle") {
        return
      }

      const properties = event.properties
      if (!isRecord(properties)) {
        return
      }

      const usage = extractTokens(properties)
      if (!usage) {
        return
      }

      const modelContext = resolveModelContext(properties)
      const entry = recordUsage(modelContext, usage.inputTokens, usage.outputTokens)
      const summary = costStore.getSummary()

      log("[cost-tracker] usage recorded", {
        entry,
        totals: {
          totalInputTokens: summary.totalInputTokens,
          totalOutputTokens: summary.totalOutputTokens,
          totalEstimatedCost: summary.totalEstimatedCost,
          currency: summary.currency,
        },
      })
    } catch (error) {
      log("[cost-tracker] event handling failed", { error: String(error) })
    }
  }
}
