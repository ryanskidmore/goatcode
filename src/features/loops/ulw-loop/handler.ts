import { log } from "../../../shared/logger"
import {
  getLoopState,
  incrementIteration,
  isActive,
  markCompletionDetected,
  stopLoop,
  type UlwLoopState,
} from "./state"
import {
  type HookEvent,
  asEvent,
  getSessionId,
  defaultCompletionDetector,
} from "../shared/event-utils"

export interface UlwLoopHandlerOptions {
  completionPromise?: string
  detectCompletion?: (event: HookEvent, state: UlwLoopState) => boolean
  sendContinuationMessage?: (sessionId: string, message: string) => Promise<void> | void
}

export function buildUlwContinuationMessage(
  state: UlwLoopState,
  completionPromise: string,
): string {
  return [
    "[SYSTEM DIRECTIVE: ULW LOOP CONTINUE]",
    `Iteration ${state.iteration}/${state.maxIterations === Number.MAX_SAFE_INTEGER ? "unbounded" : state.maxIterations}`,
    "Continue ultra-long-work execution from current progress.",
    `When fully complete, output <promise>${completionPromise}</promise>.`,
  ].join("\n")
}

export function createUlwLoopHandler(options?: UlwLoopHandlerOptions) {
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
      log("[ulw-loop] completion detected", { sessionId, iteration: state.iteration })
      return
    }

    if (state.iteration >= state.maxIterations) {
      stopLoop(sessionId)
      log("[ulw-loop] max iterations reached", {
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

    const continuationMessage = buildUlwContinuationMessage(updatedState, completionPromise)
    try {
      await options?.sendContinuationMessage?.(sessionId, continuationMessage)
    } catch (error) {
      log("[ulw-loop] continuation injection failed", { sessionId, error: String(error) })
    }
  }
}
