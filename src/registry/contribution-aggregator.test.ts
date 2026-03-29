import { describe, expect, test } from "bun:test"

import type { PluginAgentContribution } from "../types/agent"
import type { PluginDefinition, PluginHookHandler } from "../types/plugin"

import { aggregateContributions } from "./contribution-aggregator"

function makeAgentContribution(model: string): PluginAgentContribution {
  return { instructions: "test", model } as unknown as PluginAgentContribution
}

describe("aggregateContributions", () => {
  test("replaces conflicting entries and filters disabled names", () => {
    const plugins: PluginDefinition[] = [
      { name: "a", agents: { shared: makeAgentContribution("model-a"), keep: makeAgentContribution("model-a") } },
      { name: "b", agents: { shared: makeAgentContribution("model-b"), skip: makeAgentContribution("model-b") } },
    ]

    const aggregated = aggregateContributions<"agents", PluginAgentContribution>(plugins, "agents", {
      disabled: ["skip"],
      onConflict: "replace",
    })

    expect(Object.keys(aggregated)).toEqual(["shared", "keep"])
    expect(aggregated.shared.model).toBe("model-b")
    expect(aggregated.skip).toBeUndefined()
  })

  test("appends hook handlers in plugin order", () => {
    type ToolExecuteBeforeHandler = NonNullable<PluginDefinition["hooks"]>["tool.execute.before"]
    const first: ToolExecuteBeforeHandler = async () => {}
    const second: ToolExecuteBeforeHandler = async () => {}

    const plugins: PluginDefinition[] = [
      { name: "a", hooks: { "tool.execute.before": first } },
      { name: "b", hooks: { "tool.execute.before": second } },
    ]

    const aggregated = aggregateContributions<"hooks", PluginHookHandler>(plugins, "hooks", {
      disabled: [],
      onConflict: "append",
    })

    expect(aggregated.get("tool.execute.before")).toEqual([first, second] as PluginHookHandler[])
  })
})
