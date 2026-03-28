export interface LoopOptions {
  persist?: boolean
  maxIterations?: number
}

export interface LoopState {
  active: boolean
  iteration: number
  maxIterations: number
  completionDetected: boolean
  persist: boolean
}

export interface LoopStore {
  startLoop(sessionId: string, options?: LoopOptions): void
  stopLoop(sessionId: string): void
  isActive(sessionId: string): boolean
  getLoopState(sessionId: string): LoopState | undefined
  incrementIteration(sessionId: string): void
  markCompletionDetected(sessionId: string): void
}

export const DEFAULT_MAX_ITERATIONS = 100
export const UNBOUNDED_MAX_ITERATIONS = Number.MAX_SAFE_INTEGER

export function createInitialLoopState(options?: LoopOptions): LoopState {
  const persist = options?.persist ?? false
  return {
    active: true,
    iteration: 0,
    maxIterations:
      options?.maxIterations ?? (persist ? UNBOUNDED_MAX_ITERATIONS : DEFAULT_MAX_ITERATIONS),
    completionDetected: false,
    persist,
  }
}
