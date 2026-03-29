import type { PluginHookContributions } from "../../types/hook"
import { buildFallbackChain } from "../../shared/fallback-chain"
import { resolveModel } from "../../shared/model-resolution-pipeline"
import { log } from "../../shared/logger"

type EventHook = NonNullable<PluginHookContributions["event"]>

type ForegroundFallbackReason = "rate-limit"

type ForegroundFallbackDependencies = {
  defaultFallbackChain?: string[]
  getCurrentModel?: (sessionID: string) => string | undefined
  getAvailableModels?: (sessionID: string) => Set<string>
  setCurrentModel?: (sessionID: string, model: string) => void | Promise<void>
  onFallbackApplied?: (input: {
    sessionID: string
    previousModel: string
    nextModel: string
    reason: ForegroundFallbackReason
  }) => void | Promise<void>
  onRetryRequested?: (input: { sessionID: string; model: string }) => void | Promise<void>
  now?: () => number
}

type EventEnvelope = {
  event?: {
    type?: unknown
    properties?: unknown
  }
}

const RATE_LIMIT_PATTERNS = [
  /\b429\b/,
  /rate.?limit/i,
  /too many requests/i,
  /quota.?exceeded/i,
  /usage.?exceeded/i,
  /usage limit/i,
  /overloaded/i,
  /resource.?exhausted/i,
  /insufficient.?quota/i,
  /high concurrency/i,
  /reduce concurrency/i,
] as const

const DEDUP_WINDOW_MS = 5_000
const SESSION_TTL_MS = 5 * 60 * 1000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function collectErrorFragments(error: unknown, depth = 0): string[] {
  if (depth > 5) return []

  if (typeof error === "string") {
    return [error]
  }

  if (!isRecord(error)) {
    return []
  }

  const parts: string[] = []

  const message = error.message
  if (typeof message === "string") parts.push(message)

  const statusCode = error.statusCode
  if (typeof statusCode === "number") parts.push(String(statusCode))

  const status = error.status
  if (typeof status === "number") parts.push(String(status))

  const data = error.data
  if (isRecord(data)) {
    if (typeof data.message === "string") parts.push(data.message)
    if (typeof data.responseBody === "string") parts.push(data.responseBody)
    if (typeof data.statusCode === "number") parts.push(String(data.statusCode))
  }

  const nested = error.error
  if (nested !== undefined && nested !== error) {
    parts.push(...collectErrorFragments(nested, depth + 1))
  }

  return parts
}

function isRateLimitError(error: unknown): boolean {
  const normalized = collectErrorFragments(error).join(" ")
  if (normalized.length === 0) return false
  return RATE_LIMIT_PATTERNS.some((pattern) => pattern.test(normalized))
}

function getSessionID(properties: Record<string, unknown>): string | undefined {
  const directSessionID = properties.sessionID
  if (typeof directSessionID === "string" && directSessionID.length > 0) {
    return directSessionID
  }

  const info = properties.info
  if (isRecord(info)) {
    const infoID = info.id
    if (typeof infoID === "string" && infoID.length > 0) {
      return infoID
    }

    const infoSessionID = info.sessionID
    if (typeof infoSessionID === "string" && infoSessionID.length > 0) {
      return infoSessionID
    }
  }

  return undefined
}

function getCurrentModelFromProperties(properties: Record<string, unknown>): string | undefined {
  const model = properties.model
  if (typeof model === "string" && model.length > 0) {
    return model
  }

  const info = properties.info
  if (isRecord(info)) {
    const providerID = info.providerID
    const modelID = info.modelID
    if (typeof providerID === "string" && typeof modelID === "string" && providerID && modelID) {
      return `${providerID}/${modelID}`
    }
  }

  return undefined
}

function getConfiguredFallbacks(properties: Record<string, unknown>): string | string[] | undefined {
  const fallbackChain = properties.fallbackChain
  if (typeof fallbackChain === "string") {
    return fallbackChain
  }
  if (Array.isArray(fallbackChain)) {
    const strings = fallbackChain.filter((item): item is string => typeof item === "string")
    return strings.length > 0 ? strings : undefined
  }

  return undefined
}

function getNextFallbackModel(input: {
  currentModel: string
  configuredFallbacks: string | string[] | undefined
  defaultChain: string[]
  availableModels: Set<string>
}): string | undefined {
  const fullChain = buildFallbackChain(input.configuredFallbacks, input.defaultChain)
  const currentIndex = fullChain.findIndex((model) => model.toLowerCase() === input.currentModel.toLowerCase())
  const remaining = currentIndex >= 0 ? fullChain.slice(currentIndex + 1) : fullChain

  return resolveModel({
    fallbackChain: remaining,
    availableModels: input.availableModels,
  })?.model
}

function setRetryProperties(properties: Record<string, unknown>, model: string): void {
  properties.retryRequested = true
  properties.retryWithModel = model
}

function shouldHandleRateLimitEvent(type: string, properties: Record<string, unknown>): boolean {
  if (type === "session.error") {
    return isRateLimitError(properties.error)
  }

  if (type === "message.updated") {
    const info = properties.info
    if (!isRecord(info)) return false
    return isRateLimitError(info.error)
  }

  return false
}

export function createForegroundFallbackHandler(deps: ForegroundFallbackDependencies = {}): EventHook {
  const now = deps.now ?? Date.now
  const sessionModels = new Map<string, string>()
  const inProgress = new Set<string>()
  const lastTrigger = new Map<string, number>()

  const cleanupExpiredSessionState = (currentTime: number) => {
    for (const [key, timestamp] of lastTrigger.entries()) {
      if (currentTime - timestamp > SESSION_TTL_MS) {
        lastTrigger.delete(key)
      }
    }

    for (const sessionID of sessionModels.keys()) {
      const hasRecentTrigger = Array.from(lastTrigger.entries()).some(([key, timestamp]) => {
        return key.startsWith(`${sessionID}:`) && currentTime - timestamp <= SESSION_TTL_MS
      })

      if (!hasRecentTrigger) {
        sessionModels.delete(sessionID)
      }
    }
  }

  const defaultSetCurrentModel = async (sessionID: string, model: string) => {
    sessionModels.set(sessionID, model)
  }

  return async (input: unknown) => {
    if (!isRecord(input)) return
    if (lastTrigger.size > 100) {
      cleanupExpiredSessionState(now())
    }

    const envelope = input as EventEnvelope
    if (!isRecord(envelope.event)) return

    const type = envelope.event.type
    if (typeof type !== "string") return

    const properties = envelope.event.properties
    if (!isRecord(properties)) return
    if (!shouldHandleRateLimitEvent(type, properties)) return

    const sessionID = getSessionID(properties)
    if (!sessionID) return

    if (inProgress.has(sessionID)) return

    inProgress.add(sessionID)
    try {
      const configuredFallbacks = getConfiguredFallbacks(properties)
      const eventModel = getCurrentModelFromProperties(properties)
      const currentModel =
        eventModel ?? deps.getCurrentModel?.(sessionID) ?? sessionModels.get(sessionID)
      if (!currentModel) return

      const currentTime = now()
      const dedupKey = `${sessionID}:${currentModel}`
      const lastTime = lastTrigger.get(dedupKey)
      if (typeof lastTime === "number" && currentTime - lastTime < DEDUP_WINDOW_MS) {
        return
      }

      const availableModels = deps.getAvailableModels?.(sessionID) ?? new Set<string>()
      const nextModel = getNextFallbackModel({
        currentModel,
        configuredFallbacks,
        defaultChain: deps.defaultFallbackChain ?? [],
        availableModels,
      })

      if (!nextModel || nextModel.toLowerCase() === currentModel.toLowerCase()) {
        log("[foreground-fallback] no eligible fallback model", { sessionID, currentModel })
        return
      }

      if (deps.setCurrentModel) {
        await Promise.resolve(deps.setCurrentModel(sessionID, nextModel))
      }
      await Promise.resolve(defaultSetCurrentModel(sessionID, nextModel))

      setRetryProperties(properties, nextModel)
      await Promise.resolve(deps.onRetryRequested?.({ sessionID, model: nextModel }))
      await Promise.resolve(
        deps.onFallbackApplied?.({
          sessionID,
          previousModel: currentModel,
          nextModel,
          reason: "rate-limit",
        }),
      )
      lastTrigger.set(dedupKey, currentTime)
      lastTrigger.set(`${sessionID}:${nextModel}`, currentTime)

      log("[foreground-fallback] switched model and requested retry", {
        sessionID,
        from: currentModel,
        to: nextModel,
      })
    } finally {
      inProgress.delete(sessionID)
    }
  }
}
