import { log } from "../../shared/logger"
import { createInitialLoopState, type LoopOptions, type LoopState, type LoopStore } from "./state"

export class MemoryLoopStore implements LoopStore {
  private readonly loopStates = new Map<string, LoopState>()

  startLoop(sessionId: string, options?: LoopOptions): void {
    const state = createInitialLoopState({ ...options, persist: false })
    this.loopStates.set(sessionId, state)
    log("[loop] started (memory)", { sessionId, maxIterations: state.maxIterations })
  }

  stopLoop(sessionId: string): void {
    const existing = this.loopStates.get(sessionId)
    if (!existing) {
      return
    }

    this.loopStates.delete(sessionId)
    log("[loop] stopped (memory)", { sessionId, iteration: existing.iteration })
  }

  isActive(sessionId: string): boolean {
    return this.loopStates.get(sessionId)?.active === true
  }

  getLoopState(sessionId: string): LoopState | undefined {
    const state = this.loopStates.get(sessionId)
    return state ? { ...state } : undefined
  }

  incrementIteration(sessionId: string): void {
    const state = this.loopStates.get(sessionId)
    if (!state || !state.active || state.completionDetected) {
      return
    }

    this.loopStates.set(sessionId, { ...state, iteration: state.iteration + 1 })
  }

  markCompletionDetected(sessionId: string): void {
    const state = this.loopStates.get(sessionId)
    if (!state) {
      return
    }

    this.loopStates.set(sessionId, { ...state, active: false, completionDetected: true })
  }

  clearAllForTests(): void {
    this.loopStates.clear()
  }
}
