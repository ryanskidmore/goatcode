import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
  FileLoopStore,
  MemoryLoopStore,
  createLoopHandler,
  fileLoopStore,
  memoryLoopStore,
  startLoop,
  stopLoop,
} from "./index"

describe("unified loops", () => {
  describe("MemoryLoopStore", () => {
    let store: MemoryLoopStore

    beforeEach(() => {
      store = new MemoryLoopStore()
    })

    it("starts active in memory and increments iterations", () => {
      store.startLoop("memory-session", { maxIterations: 5 })
      store.incrementIteration("memory-session")
      store.incrementIteration("memory-session")

      const state = store.getLoopState("memory-session")
      expect(state?.persist).toBeFalse()
      expect(state?.iteration).toBe(2)
      expect(store.isActive("memory-session")).toBeTrue()
    })

    it("marks completion and deactivates the loop", () => {
      store.startLoop("memory-complete")
      store.markCompletionDetected("memory-complete")

      const state = store.getLoopState("memory-complete")
      expect(state?.active).toBeFalse()
      expect(state?.completionDetected).toBeTrue()
    })
  })

  describe("FileLoopStore", () => {
    let tempDir = ""
    let stateFilePath = ""

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), "goatcode-loop-store-"))
      stateFilePath = join(tempDir, "loop-state.json")
    })

    afterEach(() => {
      if (tempDir) {
        rmSync(tempDir, { recursive: true, force: true })
      }
    })

    it("persists loop state to disk and reloads it", () => {
      const initialStore = new FileLoopStore({ stateFilePath })
      initialStore.startLoop("persisted-session", { persist: true, maxIterations: 9 })

      const reloadedStore = new FileLoopStore({ stateFilePath })
      expect(reloadedStore.isActive("persisted-session")).toBeTrue()
      expect(reloadedStore.getLoopState("persisted-session")?.maxIterations).toBe(9)
      expect(reloadedStore.getLoopState("persisted-session")?.persist).toBeTrue()
    })

    it("stops loop and clears persisted state for that session", () => {
      const initialStore = new FileLoopStore({ stateFilePath })
      initialStore.startLoop("persisted-session", { persist: true })
      initialStore.stopLoop("persisted-session")

      const reloadedStore = new FileLoopStore({ stateFilePath })
      expect(reloadedStore.getLoopState("persisted-session")).toBeUndefined()
      expect(reloadedStore.isActive("persisted-session")).toBeFalse()
    })
  })

  describe("createLoopHandler", () => {
    async function runIdle(handler: (input: unknown) => Promise<void>, sessionID: string): Promise<void> {
      await handler({ event: { type: "session.idle", properties: { sessionID } } })
    }

    it("continues loop iterations until max is reached", async () => {
      const store = new MemoryLoopStore()
      const sentMessages: string[] = []
      const handler = createLoopHandler(store, {
        detectCompletion: () => false,
        sendContinuationMessage: (_sessionId, message) => {
          sentMessages.push(message)
        },
      })

      store.startLoop("handler-max", { maxIterations: 2 })
      await runIdle(handler, "handler-max")
      await runIdle(handler, "handler-max")
      await runIdle(handler, "handler-max")

      expect(sentMessages).toHaveLength(2)
      expect(sentMessages[0]).toContain("[SYSTEM DIRECTIVE: LOOP CONTINUE]")
      expect(store.isActive("handler-max")).toBeFalse()
    })

    it("marks completion when detector returns true", async () => {
      const store = new MemoryLoopStore()
      const handler = createLoopHandler(store, { detectCompletion: () => true })

      store.startLoop("handler-complete", { maxIterations: 5 })
      await runIdle(handler, "handler-complete")

      expect(store.isActive("handler-complete")).toBeFalse()
      expect(store.getLoopState("handler-complete")?.completionDetected).toBeTrue()
    })

    it("uses default completion detector for <promise>DONE</promise>", async () => {
      const store = new MemoryLoopStore()
      const handler = createLoopHandler(store)

      store.startLoop("handler-default", { maxIterations: 5 })
      await handler({
        event: {
          type: "session.idle",
          properties: {
            sessionID: "handler-default",
            lastAssistantMessage: "all done <promise>DONE</promise>",
          },
        },
      })

      expect(store.getLoopState("handler-default")?.completionDetected).toBeTrue()
    })
  })

  describe("default routed store", () => {
    let tempDir = ""
    let stateFilePath = ""

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), "goatcode-loop-router-"))
      stateFilePath = join(tempDir, "loop-state.json")
      memoryLoopStore.clearAllForTests()
      fileLoopStore.setStateFilePathForTests(stateFilePath)
      fileLoopStore.clearAllForTests(true)
    })

    afterEach(() => {
      memoryLoopStore.clearAllForTests()
      fileLoopStore.clearAllForTests(true)
      if (tempDir) {
        rmSync(tempDir, { recursive: true, force: true })
      }
    })

    it("routes persisted loops to file store", () => {
      startLoop("persisted", { persist: true })

      expect(fileLoopStore.getLoopState("persisted")?.persist).toBeTrue()
      expect(memoryLoopStore.getLoopState("persisted")).toBeUndefined()
      stopLoop("persisted")
    })

    it("routes non-persisted loops to memory store", () => {
      startLoop("in-memory")

      expect(memoryLoopStore.getLoopState("in-memory")?.persist).toBeFalse()
      expect(fileLoopStore.getLoopState("in-memory")).toBeUndefined()
      stopLoop("in-memory")
    })
  })
})
