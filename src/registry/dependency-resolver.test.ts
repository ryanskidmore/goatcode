import { describe, expect, test } from "bun:test";

import type { PluginDefinition } from "../types/plugin";

import { resolvePluginOrder } from "./dependency-resolver";

function makePlugin(name: string, deps: string[] = []): PluginDefinition {
  return { name, dependencies: deps };
}

describe("resolvePluginOrder", () => {
  test("returns all plugins in registration order when no dependencies", () => {
    const plugins = [makePlugin("a"), makePlugin("b"), makePlugin("c")];
    const { order } = resolvePluginOrder(plugins);
    expect(order.map((plugin) => plugin.name)).toEqual(["a", "b", "c"]);
  });

  test("orders dependencies before dependents", () => {
    const plugins = [makePlugin("c", ["b"]), makePlugin("b", ["a"]), makePlugin("a")];
    const { order } = resolvePluginOrder(plugins);
    const names = order.map((plugin) => plugin.name);
    expect(names.indexOf("a")).toBeLessThan(names.indexOf("b"));
    expect(names.indexOf("b")).toBeLessThan(names.indexOf("c"));
  });

  test("throws on circular dependencies", () => {
    const plugins = [makePlugin("a", ["b"]), makePlugin("b", ["a"])];
    expect(() => resolvePluginOrder(plugins)).toThrow("Circular dependency");
  });

  test("throws on unknown dependency", () => {
    const plugins = [makePlugin("a", ["unknown"])];
    expect(() => resolvePluginOrder(plugins)).toThrow('unknown plugin "unknown"');
  });
});
