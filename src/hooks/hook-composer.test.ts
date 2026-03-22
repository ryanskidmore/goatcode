import { describe, expect, it } from "bun:test"

import type { PluginHookHandler } from "../types/plugin"
import { composeHooks } from "./hook-composer"

describe("composeHooks", () => {
  describe("#given 3 handlers", () => {
    describe("#when composed and called", () => {
      it("#then all 3 fire in order", async () => {
        const calls: number[] = []
        const handler1: PluginHookHandler = async () => {
          calls.push(1)
        }
        const handler2: PluginHookHandler = async () => {
          calls.push(2)
        }
        const handler3: PluginHookHandler = async () => {
          calls.push(3)
        }

        const composed = composeHooks("event", [handler1, handler2, handler3])

        await composed({}, {})

        expect(calls).toEqual([1, 2, 3])
      })
    })
  })

  describe("#given one handler throws", () => {
    describe("#when composed with safe=true and called", () => {
      it("#then other handlers still fire", async () => {
        const calls: string[] = []
        const first: PluginHookHandler = async () => {
          calls.push("first")
        }
        const failing: PluginHookHandler = async () => {
          throw new Error("boom")
        }
        const last: PluginHookHandler = async () => {
          calls.push("last")
        }

        const composed = composeHooks("event", [first, failing, last], { safe: true })

        await composed({}, {})

        expect(calls).toEqual(["first", "last"])
      })
    })
  })
})
