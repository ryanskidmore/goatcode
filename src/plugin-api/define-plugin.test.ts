import { describe, test, expect } from "bun:test"

import { definePlugin } from "./define-plugin"
import { HOOK_EVENT_NAMES } from "./types"

describe("definePlugin", () => {
  describe("with minimal plugin", () => {
    test("returns the definition unchanged", () => {
      //#given
      const definition = { name: "test-plugin" }
      //#when
      const result = definePlugin(definition)
      //#then
      expect(result).toBe(definition)
    })
  })

  describe("with full plugin", () => {
    test("preserves all fields", () => {
      //#given
      const handler = async () => {}
      const definition = {
        name: "full-plugin",
        version: "1.0.0",
        dependencies: ["other-plugin"],
        hooks: { "tool.execute.before": handler },
      }
      //#when
      const result = definePlugin(definition)
      //#then
      expect(result.name).toBe("full-plugin")
      expect(result.version).toBe("1.0.0")
      expect(result.dependencies).toEqual(["other-plugin"])
      expect(result.hooks?.["tool.execute.before"]).toBe(handler)
    })
  })
})

describe("HOOK_EVENT_NAMES", () => {
  test("contains all OpenCode hook handler names", () => {
    //#given
    const expected = [
      "tool",
      "config",
      "chat.message",
      "chat.params",
      "chat.headers",
      "event",
      "tool.execute.before",
      "tool.execute.after",
      "experimental.chat.messages.transform",
      "experimental.chat.system.transform",
      "tool.definition",
      "permission.ask",
      "command.execute.before",
      "shell.env",
      "experimental.session.compacting",
      "experimental.text.complete",
    ]
    //#when / #then
    expect(HOOK_EVENT_NAMES).toHaveLength(16)
    for (const name of expected) {
      expect(HOOK_EVENT_NAMES).toContain(name)
    }
  })
})
