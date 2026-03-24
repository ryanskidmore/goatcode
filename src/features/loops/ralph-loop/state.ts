import { log } from "../../../shared/logger"

export interface RalphLoopState {
  active: boolean
  iteration: number
  maxIterations: number
  completionDetected: boolean
}

export interface RalphLoopStartOptions {
  maxIterations?: number
}

const DEFAULT_MAX_ITERATIONS = 100
const loopStates = new Map<string, RalphLoopState>()

function createInitialState(options?: RalphLoopStartOptions): RalphLoopState {
  return {
    active: true,
    iteration: 0,
    maxIterations: options?.maxIterations ?? DEFAULT_MAX_ITERATIONS,
    completionDetected: false,
  }
}

export function startLoop(sessionId: string, options?: RalphLoopStartOptions): RalphLoopState {
  const state = createInitialState(options)
  loopStates.set(sessionId, state)
  log("[ralph-loop] started", { sessionId, maxIterations: state.maxIterations })
  return { ...state }
}

export function stopLoop(sessionId: string): boolean {
  const existing = loopStates.get(sessionId)
  if (!existing) {
    return false
  }

  loopStates.delete(sessionId)
  log("[ralph-loop] stopped", { sessionId, iteration: existing.iteration })
  return true
}

export function isActive(sessionId: string): boolean {
  return loopStates.get(sessionId)?.active === true
}

export function getLoopState(sessionId: string): RalphLoopState | null {
  const state = loopStates.get(sessionId)
  return state ? { ...state } : null
}

export function markCompletionDetected(sessionId: string): RalphLoopState | null {
  const state = loopStates.get(sessionId)
  if (!state) {
    return null
  }

  const nextState: RalphLoopState = {
    ...state,
    active: false,
    completionDetected: true,
  }
  loopStates.set(sessionId, nextState)
  return { ...nextState }
}

export function incrementIteration(sessionId: string): RalphLoopState | null {
  const state = loopStates.get(sessionId)
  if (!state || !state.active || state.completionDetected) {
    return null
  }

  const nextState: RalphLoopState = { ...state, iteration: state.iteration + 1 }
  loopStates.set(sessionId, nextState)
  return { ...nextState }
}

export function clearRalphLoopStateForTests(): void {
  loopStates.clear()
}
