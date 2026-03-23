import type { PluginHookContributions } from "../../types/hook"
import { log } from "../../shared/logger"

export const CONTEXT_WINDOW_LIMIT_PATTERNS = [
  /context window/i,
  /token limit/i,
  /maximum context length/i,
  /prompt is too long/i,
  /too many tokens/i,
] as const

const CONTEXT_WINDOW_LIMIT_MARKER = "[CONTEXT WINDOW LIMIT RECOVERY]"

export const CONTEXT_WINDOW_LIMIT_RECOVERY_MESSAGE = `${CONTEXT_WINDOW_LIMIT_MARKER}\nContext usage is near the limit. Compact older turns, summarize large tool outputs, and continue with a reduced context footprint.`

type EventHook = NonNullable<PluginHookContributions["event"]>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function toUsageRatio(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null
  }

  if (value > 1) {
    return value / 100
  }

  return value
}

function extractErrorText(properties: Record<string, unknown>): string {
  const rawError = properties.error
  if (typeof rawError === "string") {
    return rawError
  }

  if (isRecord(rawError) && typeof rawError.message === "string") {
    return rawError.message
  }

  return ""
}

function appendRecoveryActions(properties: Record<string, unknown>): void {
  const existing = properties.recoveryActions
  if (Array.isArray(existing)) {
    const actions = new Set(existing.filter((value): value is string => typeof value === "string"))
    actions.add("compact")
    actions.add("summarize")
    properties.recoveryActions = [...actions]
    return
  }

  properties.recoveryActions = ["compact", "summarize"]
}

function appendRecoveryContext(properties: Record<string, unknown>): void {
  const existing = properties.recoveryContext
  if (typeof existing === "string" && existing.includes(CONTEXT_WINDOW_LIMIT_MARKER)) {
    return
  }

  if (typeof existing === "string" && existing.length > 0) {
    properties.recoveryContext = `${existing}\n${CONTEXT_WINDOW_LIMIT_RECOVERY_MESSAGE}`
    return
  }

  properties.recoveryContext = CONTEXT_WINDOW_LIMIT_RECOVERY_MESSAGE
}

function isNearLimitSessionIdle(event: Record<string, unknown>, properties: Record<string, unknown>): boolean {
  if (event.type !== "session.idle") {
    return false
  }

  const ratio =
    toUsageRatio(properties.contextWindowUsage) ??
    toUsageRatio(properties.contextWindowUsagePct) ??
    toUsageRatio(properties.contextUsage)

  return ratio !== null && ratio >= 0.9
}

function isTokenLimitError(event: Record<string, unknown>, properties: Record<string, unknown>): boolean {
  if (event.type !== "session.error") {
    return false
  }

  const errorText = extractErrorText(properties)
  return CONTEXT_WINDOW_LIMIT_PATTERNS.some((pattern) => pattern.test(errorText))
}

export function createContextWindowLimitHandler(): EventHook {
  return async (input: unknown) => {
    if (!isRecord(input)) {
      return
    }

    const event = input.event
    if (!isRecord(event)) {
      return
    }

    const properties = event.properties
    if (!isRecord(properties)) {
      return
    }

    const shouldRecover = isNearLimitSessionIdle(event, properties) || isTokenLimitError(event, properties)
    if (!shouldRecover) {
      return
    }

    appendRecoveryActions(properties)
    appendRecoveryContext(properties)
    log("[context-window-limit] injected compaction and summarization recovery")
  }
}
