import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

import { log } from "../../../shared/logger"

export interface UlwLoopState {
  active: boolean
  iteration: number
  maxIterations: number
  completionDetected: boolean
}

export interface UlwLoopStartOptions {
  maxIterations?: number
}

const DEFAULT_MAX_ITERATIONS = Number.MAX_SAFE_INTEGER

let ulwStateFilePath = resolve(process.cwd(), ".sisyphus", "ulw-state.json")
let loadedFromDisk = false
const loopStates = new Map<string, UlwLoopState>()

function isValidUlwLoopState(value: unknown): value is UlwLoopState {
  if (typeof value !== "object" || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.active === "boolean" &&
    typeof obj.iteration === "number" &&
    typeof obj.maxIterations === "number" &&
    typeof obj.completionDetected === "boolean"
  )
}

function ensureLoadedFromDisk(): void {
  if (loadedFromDisk) return
  loadedFromDisk = true

  if (!existsSync(ulwStateFilePath)) {
    return
  }

  try {
    const fileContent = readFileSync(ulwStateFilePath, "utf-8")
    const parsed = JSON.parse(fileContent) as Record<string, UlwLoopState>
    for (const [sessionId, state] of Object.entries(parsed)) {
      if (isValidUlwLoopState(state)) {
        loopStates.set(sessionId, { ...state })
      } else {
        log("[ulw-loop] skipping invalid persisted state", { sessionId })
      }
    }
  } catch (error) {
    log("[ulw-loop] failed to load persisted state", { error: String(error) })
  }
}

function persist(): void {
  try {
    mkdirSync(dirname(ulwStateFilePath), { recursive: true })
    const serializable = Object.fromEntries(loopStates.entries())
    writeFileSync(ulwStateFilePath, JSON.stringify(serializable, null, 2), "utf-8")
  } catch (error) {
    log("[ulw-loop] failed to persist state", { error: String(error) })
  }
}

function createInitialState(options?: UlwLoopStartOptions): UlwLoopState {
  return {
    active: true,
    iteration: 0,
    maxIterations: options?.maxIterations ?? DEFAULT_MAX_ITERATIONS,
    completionDetected: false,
  }
}

export function startLoop(sessionId: string, options?: UlwLoopStartOptions): UlwLoopState {
  ensureLoadedFromDisk()
  const state = createInitialState(options)
  loopStates.set(sessionId, state)
  persist()
  log("[ulw-loop] started", { sessionId, maxIterations: state.maxIterations })
  return { ...state }
}

export function stopLoop(sessionId: string): boolean {
  ensureLoadedFromDisk()
  const existing = loopStates.get(sessionId)
  if (!existing) {
    return false
  }

  loopStates.set(sessionId, { ...existing, active: false })
  persist()
  log("[ulw-loop] stopped", { sessionId, iteration: existing.iteration })
  return true
}

export function isActive(sessionId: string): boolean {
  ensureLoadedFromDisk()
  return loopStates.get(sessionId)?.active === true
}

export function getLoopState(sessionId: string): UlwLoopState | null {
  ensureLoadedFromDisk()
  const state = loopStates.get(sessionId)
  return state ? { ...state } : null
}

export function markCompletionDetected(sessionId: string): UlwLoopState | null {
  ensureLoadedFromDisk()
  const state = loopStates.get(sessionId)
  if (!state) {
    return null
  }

  const nextState: UlwLoopState = {
    ...state,
    active: false,
    completionDetected: true,
  }
  loopStates.set(sessionId, nextState)
  persist()
  return { ...nextState }
}

export function incrementIteration(sessionId: string): UlwLoopState | null {
  ensureLoadedFromDisk()
  const state = loopStates.get(sessionId)
  if (!state || !state.active || state.completionDetected) {
    return null
  }

  const nextState: UlwLoopState = { ...state, iteration: state.iteration + 1 }
  loopStates.set(sessionId, nextState)
  persist()
  return { ...nextState }
}

export function configureUlwStateFilePathForTests(filePath: string): void {
  ulwStateFilePath = filePath
  loadedFromDisk = false
  loopStates.clear()
}

export function loadPersistedUlwStateForTests(): void {
  loadedFromDisk = false
  ensureLoadedFromDisk()
}

export function clearUlwLoopStateForTests(clearPersistedFile = false): void {
  loopStates.clear()
  loadedFromDisk = false
  if (!clearPersistedFile) {
    return
  }

  if (existsSync(ulwStateFilePath)) {
    rmSync(ulwStateFilePath)
  }
}
