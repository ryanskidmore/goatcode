import { log } from "../../shared/logger"
import {
  type HookEvent,
  asEvent,
  defaultCompletionDetector,
  getSessionId,
} from "./shared/event-utils"
import { type LoopState, type LoopStore } from "./state"

export interface LoopHandlerOptions {
  completionPromise?: string
  detectCompletion?: (event: HookEvent, state: LoopState) => boolean
  sendContinuationMessage?: (sessionId: string, message: string) => Promise<void> | void
}

export function buildLoopContinuationMessage(state: LoopState, completionPromise: string): string {
  const maxIterations =
    state.maxIterations === Number.MAX_SAFE_INTEGER ? "unbounded" : String(state.maxIterations)

  return [
    "[SYSTEM DIRECTIVE: LOOP CONTINUE]",
    `Iteration ${state.iteration}/${maxIterations}`,
    "Continue the task from your previous work.",
    `When fully complete, output <promise>${completionPromise}</promise>.`,
  ].join("\n")
}

export function createLoopHandler(store: LoopStore, options?: LoopHandlerOptions) {
  const completionPromise = options?.completionPromise ?? "DONE"

  return async (input: unknown): Promise<void> => {
    const event = asEvent(input)
    if (!event || event.type !== "session.idle") {
      return
    }

    const sessionId = getSessionId(event.properties)
    if (!sessionId) {
      return
    }

    const state = store.getLoopState(sessionId)
    if (!state) {
      return
    }

    if (state.completionDetected) {
      store.stopLoop(sessionId)
      return
    }

    if (!store.isActive(sessionId)) {
      return
    }

    const completionDetected = options?.detectCompletion
      ? options.detectCompletion(event, state)
      : defaultCompletionDetector(event, completionPromise)

    if (completionDetected) {
      store.markCompletionDetected(sessionId)
      log("[loop] completion detected", { sessionId, iteration: state.iteration })
      return
    }

    if (state.iteration >= state.maxIterations) {
      store.stopLoop(sessionId)
      log("[loop] max iterations reached", {
        sessionId,
        iteration: state.iteration,
        maxIterations: state.maxIterations,
      })
      return
    }

    store.incrementIteration(sessionId)
    const updatedState = store.getLoopState(sessionId)
    if (!updatedState) {
      return
    }

    const continuationMessage = buildLoopContinuationMessage(updatedState, completionPromise)
    try {
      await options?.sendContinuationMessage?.(sessionId, continuationMessage)
    } catch (error) {
      log("[loop] continuation injection failed", { sessionId, error: String(error) })
    }
  }
}
