import { describe, expect, it } from "bun:test";
import { withPriority } from "../hooks/hook-ordering";
import type { PluginDefinition } from "../types/plugin";
import { aggregateHooks } from "./hook-aggregator";

describe("aggregateHooks", () => {
  it("orders handlers by explicit priority", async () => {
    const execution: string[] = [];

    const low = withPriority(async () => {
      execution.push("low");
    }, 20);

    const high = withPriority(async () => {
      execution.push("high");
    }, -20);

    const pluginA: PluginDefinition = {
      name: "plugin-a",
      hooks: {
        "tool.execute.after": low,
      },
    };

    const pluginB: PluginDefinition = {
      name: "plugin-b",
      hooks: {
        "tool.execute.after": high,
      },
    };

    const map = aggregateHooks([pluginA, pluginB]);
    const handlers = map.get("tool.execute.after");

    expect(handlers).toBeDefined();
    for (const handler of handlers ?? []) {
      await handler({}, {});
    }

    expect(execution).toEqual(["high", "low"]);
  });

  it("keeps registration order when priorities are equal", async () => {
    const execution: string[] = [];

    const first = async () => {
      execution.push("first");
    };

    const second = async () => {
      execution.push("second");
    };

    const pluginA: PluginDefinition = {
      name: "plugin-a",
      hooks: {
        "chat.message": first,
      },
    };

    const pluginB: PluginDefinition = {
      name: "plugin-b",
      hooks: {
        "chat.message": second,
      },
    };

    const map = aggregateHooks([pluginA, pluginB]);
    const handlers = map.get("chat.message");

    expect(handlers).toBeDefined();
    for (const handler of handlers ?? []) {
      await handler({}, {});
    }

    expect(execution).toEqual(["first", "second"]);
  });
});
