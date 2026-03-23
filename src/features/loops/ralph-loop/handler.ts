import { log } from "../../../shared/logger"
import {
  getLoopState,
  incrementIteration,
  isActive,
  markCompletionDetected,
  stopLoop,
  type RalphLoopState,
} from "./state"

interface HookEvent {
  type?: unknown
  properties?: unknown
}

type HookInput = { event?: HookEvent }

export interface RalphLoopHandlerOptions {
  completionPromise?: string
  detectCompletion?: (event: HookEvent, state: RalphLoopState) => boolean
  sendContinuationMessage?: (sessionId: string, message: string) => Promise<void> | void
}

function asEvent(input: unknown): HookEvent | null {
  if (typeof input !== "object" || input === null) {
    return null
  }

  const value = (input as HookInput).event
  if (!value || typeof value !== "object") {
    return null
  }

  return value
}

function getSessionId(properties: unknown): string | null {
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

function defaultCompletionDetector(event: HookEvent, completionPromise: string): boolean {
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

export function buildRalphContinuationMessage(
  state: RalphLoopState,
  completionPromise: string,
): string {
  return [
    "[SYSTEM DIRECTIVE: RALPH LOOP CONTINUE]",
    `Iteration ${state.iteration}/${state.maxIterations}`,
    "Continue the task from your previous work.",
    `When fully complete, output <promise>${completionPromise}</promise>.`,
  ].join("\n")
}

export function createRalphLoopHandler(options?: RalphLoopHandlerOptions) {
  const completionPromise = options?.completionPromise ?? "DONE"

  return async (input: unknown): Promise<void> => {
    const event = asEvent(input)
    if (!event || event.type !== "session.idle") {
      return
    }

    const sessionId = getSessionId(event.properties)
    if (!sessionId || !isActive(sessionId)) {
      return
    }

    const state = getLoopState(sessionId)
    if (!state || state.completionDetected) {
      stopLoop(sessionId)
      return
    }

    const completionDetected = options?.detectCompletion
      ? options.detectCompletion(event, state)
      : defaultCompletionDetector(event, completionPromise)

    if (completionDetected) {
      markCompletionDetected(sessionId)
      stopLoop(sessionId)
      log("[ralph-loop] completion detected", { sessionId, iteration: state.iteration })
      return
    }

    if (state.iteration >= state.maxIterations) {
      stopLoop(sessionId)
      log("[ralph-loop] max iterations reached", {
        sessionId,
        iteration: state.iteration,
        maxIterations: state.maxIterations,
      })
      return
    }

    const updatedState = incrementIteration(sessionId)
    if (!updatedState) {
      return
    }

    const continuationMessage = buildRalphContinuationMessage(updatedState, completionPromise)
    try {
      await options?.sendContinuationMessage?.(sessionId, continuationMessage)
    } catch (error) {
      log("[ralph-loop] continuation injection failed", { sessionId, error: String(error) })
    }
  }
}
