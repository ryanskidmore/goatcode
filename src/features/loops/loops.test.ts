import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

import {
  clearRalphLoopStateForTests,
  clearUlwLoopStateForTests,
  configureUlwStateFilePathForTests,
  createRalphLoopHandler,
  createUlwLoopHandler,
  getRalphLoopState,
  getUlwLoopState,
  isRalphLoopActive,
  isUlwLoopActive,
  loadPersistedUlwStateForTests,
  startRalphLoop,
  startUlwLoop,
} from "./index"

describe("loops", () => {
  const ulwSessionId = "ulw-session"
  let ulwStatePath = ""
  let tempDir = ""

  beforeEach(() => {
    clearRalphLoopStateForTests()
    tempDir = mkdtempSync(join(tmpdir(), "goatcode-loops-"))
    ulwStatePath = join(tempDir, "ulw-state.json")
    configureUlwStateFilePathForTests(ulwStatePath)
    clearUlwLoopStateForTests(true)
  })

  afterEach(() => {
    clearRalphLoopStateForTests()
    clearUlwLoopStateForTests(true)
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe("#given an active Ralph loop", () => {
    describe("#when session.idle repeats without completion", () => {
      it("#then loop continues for each iteration", async () => {
        startRalphLoop("ralph-continue", { maxIterations: 5 })
        const sentMessages: string[] = []
        const handler = createRalphLoopHandler({
          detectCompletion: () => false,
          sendContinuationMessage: (_sessionId, message) => {
            sentMessages.push(message)
          },
        })

        await handler({ event: { type: "session.idle", properties: { sessionID: "ralph-continue" } } })
        await handler({ event: { type: "session.idle", properties: { sessionID: "ralph-continue" } } })
        await handler({ event: { type: "session.idle", properties: { sessionID: "ralph-continue" } } })

        expect(sentMessages).toHaveLength(3)
        expect(getRalphLoopState("ralph-continue")?.iteration).toBe(3)
        expect(isRalphLoopActive("ralph-continue")).toBeTrue()
      })
    })

    describe("#when completion is detected", () => {
      it("#then loop stops immediately", async () => {
        startRalphLoop("ralph-complete", { maxIterations: 5 })
        const sentMessages: string[] = []
        const handler = createRalphLoopHandler({
          detectCompletion: () => true,
          sendContinuationMessage: (_sessionId, message) => {
            sentMessages.push(message)
          },
        })

        await handler({ event: { type: "session.idle", properties: { sessionID: "ralph-complete" } } })

        expect(sentMessages).toHaveLength(0)
        expect(isRalphLoopActive("ralph-complete")).toBeFalse()
        expect(getRalphLoopState("ralph-complete")?.completionDetected).toBeTrue()
      })
    })

    describe("#when max iterations are reached", () => {
      it("#then loop stops and does not inject further messages", async () => {
        startRalphLoop("ralph-max", { maxIterations: 2 })
        const sentMessages: string[] = []
        const handler = createRalphLoopHandler({
          detectCompletion: () => false,
          sendContinuationMessage: (_sessionId, message) => {
            sentMessages.push(message)
          },
        })

        await handler({ event: { type: "session.idle", properties: { sessionID: "ralph-max" } } })
        await handler({ event: { type: "session.idle", properties: { sessionID: "ralph-max" } } })
        await handler({ event: { type: "session.idle", properties: { sessionID: "ralph-max" } } })

        expect(sentMessages).toHaveLength(2)
        expect(isRalphLoopActive("ralph-max")).toBeFalse()
      })
    })
  })

  describe("#given an active ULW loop", () => {
    describe("#when session.idle repeats without completion", () => {
      it("#then loop continues for each iteration", async () => {
        startUlwLoop(ulwSessionId, { maxIterations: 4 })
        const sentMessages: string[] = []
        const handler = createUlwLoopHandler({
          detectCompletion: () => false,
          sendContinuationMessage: (_sessionId, message) => {
            sentMessages.push(message)
          },
        })

        await handler({ event: { type: "session.idle", properties: { sessionID: ulwSessionId } } })
        await handler({ event: { type: "session.idle", properties: { sessionID: ulwSessionId } } })

        expect(sentMessages).toHaveLength(2)
        expect(getUlwLoopState(ulwSessionId)?.iteration).toBe(2)
        expect(isUlwLoopActive(ulwSessionId)).toBeTrue()
      })
    })

    describe("#when completion is detected", () => {
      it("#then loop stops immediately", async () => {
        startUlwLoop(ulwSessionId, { maxIterations: 4 })
        const sentMessages: string[] = []
        const handler = createUlwLoopHandler({
          detectCompletion: () => true,
          sendContinuationMessage: (_sessionId, message) => {
            sentMessages.push(message)
          },
        })

        await handler({ event: { type: "session.idle", properties: { sessionID: ulwSessionId } } })

        expect(sentMessages).toHaveLength(0)
        expect(isUlwLoopActive(ulwSessionId)).toBeFalse()
        expect(getUlwLoopState(ulwSessionId)?.completionDetected).toBeTrue()
      })
    })

    describe("#when max iterations are reached", () => {
      it("#then loop stops and does not inject further messages", async () => {
        startUlwLoop(ulwSessionId, { maxIterations: 1 })
        const sentMessages: string[] = []
        const handler = createUlwLoopHandler({
          detectCompletion: () => false,
          sendContinuationMessage: (_sessionId, message) => {
            sentMessages.push(message)
          },
        })

        await handler({ event: { type: "session.idle", properties: { sessionID: ulwSessionId } } })
        await handler({ event: { type: "session.idle", properties: { sessionID: ulwSessionId } } })

        expect(sentMessages).toHaveLength(1)
        expect(isUlwLoopActive(ulwSessionId)).toBeFalse()
      })
    })

    describe("#when state is reloaded from disk", () => {
      it("#then loop remains resumable across sessions", () => {
        startUlwLoop(ulwSessionId, { maxIterations: 9 })

        clearUlwLoopStateForTests(false)
        loadPersistedUlwStateForTests()

        expect(isUlwLoopActive(ulwSessionId)).toBeTrue()
        expect(getUlwLoopState(ulwSessionId)?.maxIterations).toBe(9)
      })
    })
  })
})
