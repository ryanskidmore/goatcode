import { describe, expect, test } from "bun:test"

import type { PluginAgentContribution } from "../types/agent"
import type { PluginDefinition, PluginHookHandler } from "../types/plugin"
import type { PluginToolContribution } from "../types/tool"

import { PluginRegistry } from "./plugin-registry"

function makePlugin(name: string, deps: string[] = []): PluginDefinition {
  return { name, dependencies: deps }
}

function makeToolContribution(): PluginToolContribution {
  return { execute: async () => "ok" } as unknown as PluginToolContribution
}

function makeAgentContribution(): PluginAgentContribution {
  return { instructions: "test", model: "model" } as unknown as PluginAgentContribution
}

describe("PluginRegistry", () => {
  test("registers a plugin", () => {
    const registry = new PluginRegistry()
    registry.register(makePlugin("test"))
    expect(registry.size).toBe(1)
    expect(registry.registeredNames).toContain("test")
  })

  test("throws on duplicate plugin names", () => {
    const registry = new PluginRegistry()
    registry.register(makePlugin("test"))
    expect(() => registry.register(makePlugin("test"))).toThrow("already registered")
  })

  test("resolves and aggregates hooks tools and agents", () => {
    const handler: PluginHookHandler = async () => {}
    const registry = new PluginRegistry()
    registry.register({ name: "a", tools: { tool_a: makeToolContribution() } })
    registry.register({ name: "b", agents: { agent_b: makeAgentContribution() } })
    registry.register({ name: "c", hooks: { "tool.execute.before": handler } })

    const resolved = registry.resolve()
    const aggregated = registry.aggregate(resolved)

    expect(Object.keys(aggregated.tools)).toContain("tool_a")
    expect(Object.keys(aggregated.agents)).toContain("agent_b")
    expect(aggregated.hooks.get("tool.execute.before")).toHaveLength(1)
  })

  test("propagates cycle detection from resolver", () => {
    const registry = new PluginRegistry()
    registry.register(makePlugin("x", ["y"]))
    registry.register(makePlugin("y", ["x"]))
    expect(() => registry.resolve()).toThrow("Circular dependency")
  })
})
