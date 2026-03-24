export interface HookEvent {
  type?: unknown
  properties?: unknown
}

type HookInput = { event?: HookEvent }

export function asEvent(input: unknown): HookEvent | null {
  if (typeof input !== "object" || input === null) {
    return null
  }

  const value = (input as HookInput).event
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  return value
}

export function getSessionId(properties: unknown): string | null {
  if (!properties || typeof properties !== "object") {
    return null
  }

  const value = properties as Record<string, unknown>
  const sessionID = value.sessionID
  const sessionId = value.sessionId
  if (typeof sessionID === "string") return sessionID
  if (typeof sessionId === "string") return sessionId
  return null
}

export function defaultCompletionDetector(event: HookEvent, completionPromise: string): boolean {
  if (!event.properties || typeof event.properties !== "object") {
    return false
  }

  const props = event.properties as Record<string, unknown>
  if (props.completionDetected === true) {
    return true
  }

  const lastAssistantMessage = props.lastAssistantMessage
  if (typeof lastAssistantMessage !== "string") {
    return false
  }

  return lastAssistantMessage.includes(`<promise>${completionPromise}</promise>`)
}
