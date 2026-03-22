import { describe, it, expect, beforeEach } from "bun:test"
import {
  setSessionState,
  getSessionState,
  deleteSessionState,
  clearSessionStore,
} from "./session-store"

describe("session-store", () => {
  beforeEach(() => {
    clearSessionStore()
  })

  describe("#given a new session ID", () => {
    describe("#when setSessionState is called", () => {
      it("#then creates a new session entry with defaults", () => {
        const before = Date.now()
        setSessionState("session-1", { model: "claude-opus", status: "active" })
        const after = Date.now()

        const state = getSessionState("session-1")
        expect(state).toBeDefined()
        expect(state?.sessionId).toBe("session-1")
        expect(state?.model).toBe("claude-opus")
        expect(state?.status).toBe("active")
        expect(state?.createdAt).toBeGreaterThanOrEqual(before)
        expect(state?.createdAt).toBeLessThanOrEqual(after)
        expect(state?.updatedAt).toBeGreaterThanOrEqual(before)
        expect(state?.updatedAt).toBeLessThanOrEqual(after)
      })
    })

    describe("#when getSessionState is called before any set", () => {
      it("#then returns undefined", () => {
        const state = getSessionState("nonexistent")
        expect(state).toBeUndefined()
      })
    })
  })

  describe("#given an existing session", () => {
    describe("#when setSessionState is called again", () => {
      it("#then updates fields while preserving createdAt", () => {
        setSessionState("session-2", { model: "gpt-4", status: "active" })
        const first = getSessionState("session-2")
        const originalCreatedAt = first?.createdAt

        setSessionState("session-2", { status: "idle" })
        const updated = getSessionState("session-2")

        expect(updated?.createdAt).toBe(originalCreatedAt)
        expect(updated?.status).toBe("idle")
        expect(updated?.model).toBe("gpt-4")
        expect(updated?.updatedAt).toBeGreaterThanOrEqual(first?.updatedAt ?? 0)
      })
    })

    describe("#when deleteSessionState is called", () => {
      it("#then removes the session entry", () => {
        setSessionState("session-3", { agent: "sisyphus" })
        expect(getSessionState("session-3")).toBeDefined()

        deleteSessionState("session-3")
        expect(getSessionState("session-3")).toBeUndefined()
      })
    })
  })

  describe("#given multiple sessions", () => {
    describe("#when clearSessionStore is called", () => {
      it("#then removes all session entries", () => {
        setSessionState("session-a", { model: "claude" })
        setSessionState("session-b", { model: "gpt" })

        clearSessionStore()

        expect(getSessionState("session-a")).toBeUndefined()
        expect(getSessionState("session-b")).toBeUndefined()
      })
    })
  })
})
