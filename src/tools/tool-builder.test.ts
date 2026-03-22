import { describe, it, expect } from "bun:test"
import type { ToolDefinition } from "@opencode-ai/plugin"
import { buildTool } from "./tool-builder"

const mockContext = {
  sessionID: "session-1",
  messageID: "message-1",
  agent: "agent-1",
  directory: "/tmp",
  worktree: "/tmp",
  abort: new AbortController().signal,
  metadata: () => {},
  ask: async () => {},
} satisfies Parameters<ToolDefinition["execute"]>[1]

describe("buildTool", () => {
  describe("#given a valid tool input", () => {
    describe("#when buildTool is called", () => {
      it("#then it returns a tool with description, args, and callable execute", async () => {
        const result = buildTool({
          description: "Searches for a query string",
          args: {},
          execute: async ({ query }: { query: string }) => `result:${query}`,
        })

        expect(result.description).toBe("Searches for a query string")
        expect(result.args).toEqual({})
        await expect(result.execute({ query: "alpha" }, mockContext)).resolves.toBe("result:alpha")
      })
    })
  })
})
