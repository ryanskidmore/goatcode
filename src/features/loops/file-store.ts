import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

import { log } from "../../shared/logger"
import { createInitialLoopState, type LoopOptions, type LoopState, type LoopStore } from "./state"

interface FileLoopStoreOptions {
  stateFilePath?: string
}

function isValidLoopState(value: unknown): value is LoopState {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const obj = value as Record<string, unknown>
  return (
    typeof obj.active === "boolean" &&
    typeof obj.iteration === "number" &&
    typeof obj.maxIterations === "number" &&
    typeof obj.completionDetected === "boolean" &&
    typeof obj.persist === "boolean"
  )
}

export class FileLoopStore implements LoopStore {
  private stateFilePath: string
  private loadedFromDisk = false
  private readonly loopStates = new Map<string, LoopState>()

  constructor(options?: FileLoopStoreOptions) {
    this.stateFilePath = options?.stateFilePath ?? resolve(process.cwd(), ".sisyphus", "loop-state.json")
  }

  startLoop(sessionId: string, options?: LoopOptions): void {
    this.ensureLoadedFromDisk()
    const state = createInitialLoopState({ ...options, persist: true })
    this.loopStates.set(sessionId, state)
    this.persist()
    log("[loop] started (file)", { sessionId, maxIterations: state.maxIterations })
  }

  stopLoop(sessionId: string): void {
    this.ensureLoadedFromDisk()
    const existing = this.loopStates.get(sessionId)
    if (!existing) {
      return
    }

    this.loopStates.delete(sessionId)
    this.persist()
    log("[loop] stopped (file)", { sessionId, iteration: existing.iteration })
  }

  isActive(sessionId: string): boolean {
    this.ensureLoadedFromDisk()
    return this.loopStates.get(sessionId)?.active === true
  }

  getLoopState(sessionId: string): LoopState | undefined {
    this.ensureLoadedFromDisk()
    const state = this.loopStates.get(sessionId)
    return state ? { ...state } : undefined
  }

  incrementIteration(sessionId: string): void {
    this.ensureLoadedFromDisk()
    const state = this.loopStates.get(sessionId)
    if (!state || !state.active || state.completionDetected) {
      return
    }

    this.loopStates.set(sessionId, { ...state, iteration: state.iteration + 1 })
    this.persist()
  }

  markCompletionDetected(sessionId: string): void {
    this.ensureLoadedFromDisk()
    const state = this.loopStates.get(sessionId)
    if (!state) {
      return
    }

    this.loopStates.set(sessionId, { ...state, active: false, completionDetected: true })
    this.persist()
  }

  setStateFilePathForTests(filePath: string): void {
    this.stateFilePath = filePath
    this.loadedFromDisk = false
    this.loopStates.clear()
  }

  loadPersistedStateForTests(): void {
    this.loadedFromDisk = false
    this.ensureLoadedFromDisk()
  }

  clearAllForTests(clearPersistedFile = false): void {
    this.loopStates.clear()
    this.loadedFromDisk = false
    if (clearPersistedFile) {
      rmSync(this.stateFilePath, { force: true })
    }
  }

  private ensureLoadedFromDisk(): void {
    if (this.loadedFromDisk) {
      return
    }

    this.loadedFromDisk = true
    if (!existsSync(this.stateFilePath)) {
      return
    }

    try {
      const fileContent = readFileSync(this.stateFilePath, "utf-8")
      const parsed = JSON.parse(fileContent) as Record<string, unknown>

      for (const [sessionId, state] of Object.entries(parsed)) {
        if (!isValidLoopState(state)) {
          log("[loop] skipping invalid persisted state", { sessionId })
          continue
        }

        this.loopStates.set(sessionId, { ...state })
      }
    } catch (error) {
      log("[loop] failed to load persisted state", { error: String(error) })
    }
  }

  private persist(): void {
    try {
      mkdirSync(dirname(this.stateFilePath), { recursive: true })
      const serializable = Object.fromEntries(this.loopStates.entries())
      const tmpPath = `${this.stateFilePath}.tmp`
      writeFileSync(tmpPath, JSON.stringify(serializable, null, 2), "utf-8")
      renameSync(tmpPath, this.stateFilePath)
    } catch (error) {
      log("[loop] failed to persist state", { error: String(error) })
    }
  }
}
