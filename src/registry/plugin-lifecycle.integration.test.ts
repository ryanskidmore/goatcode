import { describe, expect, it, mock } from "bun:test";
import { createMockPluginContext } from "../test-utils/mock-plugin-context";
import type { PluginDefinition } from "../types/plugin";
import type { PluginToolContribution } from "../types/tool";
import { PluginRegistry } from "./plugin-registry";

function makeTool(): PluginToolContribution {
  return { execute: async () => "ok" } as unknown as PluginToolContribution;
}

describe("plugin lifecycle integration", () => {
  it("resolves, sets up, aggregates, and composes a valid plugin graph", async () => {
    const setupCore = mock(async () => {});
    const setupAddon = mock(async () => {});

    const core: PluginDefinition = {
      name: "core",
      setup: setupCore,
      tools: { core_tool: makeTool() },
    };

    const addon: PluginDefinition = {
      name: "addon",
      dependencies: ["core"],
      setup: setupAddon,
      hooks: {
        "tool.execute.before": async () => {},
      },
    };

    const registry = new PluginRegistry();
    registry.register(addon);
    registry.register(core);

    const resolved = registry.resolve();
    expect(resolved.map((plugin) => plugin.name)).toEqual(["core", "addon"]);

    const initialized = await registry.setup(resolved, createMockPluginContext());
    expect(initialized.map((plugin) => plugin.name)).toEqual(["core", "addon"]);
    expect(setupCore).toHaveBeenCalledTimes(1);
    expect(setupAddon).toHaveBeenCalledTimes(1);

    const aggregated = registry.aggregate(initialized);
    expect(Object.keys(aggregated.tools)).toContain("core_tool");
    expect(aggregated.hooks.get("tool.execute.before")?.length).toBe(1);

    expect(aggregated.tools.core_tool).toBeDefined();
    expect(aggregated.hooks.get("tool.execute.before")?.length).toBe(1);
  });

  it("fails resolution when a dependency is missing", () => {
    const registry = new PluginRegistry();
    registry.register({ name: "feature", dependencies: ["missing"] });

    expect(() => registry.resolve()).toThrow("depends on unknown plugin");
  });

  it("fails resolution when dependencies are circular", () => {
    const registry = new PluginRegistry();
    registry.register({ name: "a", dependencies: ["b"] });
    registry.register({ name: "b", dependencies: ["a"] });

    expect(() => registry.resolve()).toThrow("Circular dependency");
  });

  it("continues setup when one plugin setup fails", async () => {
    const registry = new PluginRegistry();
    const badSetup = mock(async () => {
      throw new Error("setup failed");
    });
    const goodSetup = mock(async () => {});

    registry.register({
      name: "bad",
      setup: badSetup,
      tools: { bad_tool: makeTool() },
    });
    registry.register({
      name: "good",
      setup: goodSetup,
      tools: { good_tool: makeTool() },
    });

    const resolved = registry.resolve();
    const initialized = await registry.setup(resolved, createMockPluginContext());

    expect(initialized.map((plugin) => plugin.name)).toEqual(["good"]);
    expect(goodSetup).toHaveBeenCalledTimes(1);

    const aggregated = registry.aggregate(initialized);
    expect(Object.keys(aggregated.tools)).toContain("good_tool");
    expect(Object.keys(aggregated.tools)).not.toContain("bad_tool");
  });
});
