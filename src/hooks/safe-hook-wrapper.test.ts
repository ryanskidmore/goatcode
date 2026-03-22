import { describe, expect, it } from "bun:test"

import type { PluginHookHandler } from "../types/plugin"
import { wrapSafely } from "./safe-hook-wrapper"

describe("wrapSafely", () => {
  describe("#given a handler that throws", () => {
    describe("#when wrapped and called", () => {
      it("#then error is caught and no throw escapes", async () => {
        const failing: PluginHookHandler = async () => {
          throw new Error("boom")
        }
        const wrapped = wrapSafely("event", failing)

        await expect(wrapped({}, {})).resolves.toBeUndefined()
      })
    })
  })

  describe("#given a handler that succeeds", () => {
    describe("#when wrapped and called", () => {
      it("#then it executes normally", async () => {
        const calls: string[] = []
        const success: PluginHookHandler = async () => {
          calls.push("ran")
        }
        const wrapped = wrapSafely("event", success)

        await wrapped({}, {})

        expect(calls).toEqual(["ran"])
      })
    })
  })
})
