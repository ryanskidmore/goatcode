import { describe, test, expect } from "bun:test"
import { createMockPluginContext } from "./mock-plugin-context"
import { createMockAgentConfig } from "./mock-agent-config"

describe("createMockPluginContext", () => {
  test("returns context with default directory", () => {
    //#given
    //#when
    const ctx = createMockPluginContext()
    //#then
    expect(ctx.directory).toBe("/tmp/test-project")
  })

  test("respects overrides", () => {
    //#given
    const customDir = "/custom/dir"
    //#when
    const ctx = createMockPluginContext({ directory: customDir })
    //#then
    expect(ctx.directory).toBe(customDir)
  })
})

describe("createMockAgentConfig", () => {
  test("returns config with default model", () => {
    //#given
    //#when
    const config = createMockAgentConfig()
    //#then
    expect(config.model).toBe("anthropic/claude-sonnet-4-6")
  })
})
