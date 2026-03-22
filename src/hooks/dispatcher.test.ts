import { describe, it, expect } from "bun:test"
import { buildHooks } from "./dispatcher"
import type { PluginHookHandler } from "../types/plugin"

describe("buildHooks", () => {
  describe("#given a hook map with handlers for tool.execute.before", () => {
    describe("#when buildHooks is called", () => {
      it("#then the returned object has tool.execute.before as a function", () => {
        const hookMap = new Map<string, PluginHookHandler[]>([
          ["tool.execute.before", [async () => {}]],
        ])
        const tools = {}

        const result = buildHooks(hookMap, tools)

        expect(typeof result["tool.execute.before"]).toBe("function")
      })
    })
  })

  describe("#given two handlers for the same hook", () => {
    describe("#when the hook is called", () => {
      it("#then both handlers are called in order", async () => {
        const calls: number[] = []
        const handler1: PluginHookHandler = async () => {
          calls.push(1)
        }
        const handler2: PluginHookHandler = async () => {
          calls.push(2)
        }
        const hookMap = new Map<string, PluginHookHandler[]>([
          ["event", [handler1, handler2]],
        ])
        const tools = {}

        const result = buildHooks(hookMap, tools)
        await (result.event as Function)({}, {})

        expect(calls).toEqual([1, 2])
      })
    })
  })

  describe("#given an empty hook map and empty tools", () => {
    describe("#when buildHooks is called", () => {
      it("#then the returned object has no keys", () => {
        const hookMap = new Map<string, PluginHookHandler[]>()
        const tools = {}

        const result = buildHooks(hookMap, tools)

        expect(Object.keys(result)).toEqual([])
      })
    })
  })

  describe("#given a tools record with one tool", () => {
    describe("#when buildHooks is called", () => {
      it("#then hooks.tool equals the tools record", () => {
        const hookMap = new Map<string, PluginHookHandler[]>()
        const mockTool = {
          description: "A test tool",
          args: {},
          execute: async () => "result",
        }
        const tools = {
          "my-tool": mockTool,
        }

        const result = buildHooks(hookMap, tools)

        expect(result.tool).toEqual(tools)
      })
    })
  })

  describe("#given an empty tools record", () => {
    describe("#when buildHooks is called", () => {
      it("#then hooks.tool is undefined", () => {
        const hookMap = new Map<string, PluginHookHandler[]>()
        const tools = {}

        const result = buildHooks(hookMap, tools)

        expect(result.tool).toBeUndefined()
      })
    })
  })
})
