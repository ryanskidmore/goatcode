import { describe, expect, it } from "bun:test";
import { buildAgent } from "../agents/agent-builder";
import type { AgentConfig, AgentFactory } from "../types/agent";
import type { PluginDefinition } from "../types/plugin";
import type { PluginToolContribution } from "../types/tool";
import { aggregateAgents } from "./agent-aggregator";
import { aggregateHooks } from "./hook-aggregator";
import { PluginRegistry } from "./plugin-registry";
import { aggregateTools } from "./tool-aggregator";

function makeTool(): PluginToolContribution {
  return { execute: async () => "ok" } as unknown as PluginToolContribution;
}

function makeAgent(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    instructions: "test agent",
    model: "test-model",
    temperature: 0.5,
    ...overrides,
  } as AgentConfig;
}

describe("plugin overrides integration", () => {
  describe("aggregateAgents", () => {
    describe("#given a plugin contributing an agent named 'advisor'", () => {
      describe("#when aggregated with disabledAgents containing 'advisor'", () => {
        it("#then 'advisor' is not present in the aggregated output", () => {
          const plugin: PluginDefinition = {
            name: "test-plugin",
            agents: { advisor: makeAgent() },
          };

          const result = aggregateAgents([plugin], ["advisor"]);

          expect(result).not.toHaveProperty("advisor");
          expect(Object.keys(result)).toHaveLength(0);
        });
      });
    });
  });

  describe("aggregateTools", () => {
    describe("#given a plugin contributing a tool named 'grep'", () => {
      describe("#when aggregated with disabledTools containing 'grep'", () => {
        it("#then 'grep' is not present in the aggregated output", () => {
          const plugin: PluginDefinition = {
            name: "test-plugin",
            tools: { grep: makeTool() },
          };

          const result = aggregateTools([plugin], ["grep"]);

          expect(result).not.toHaveProperty("grep");
          expect(Object.keys(result)).toHaveLength(0);
        });
      });
    });
  });

  describe("aggregateHooks", () => {
    describe("#given a plugin contributing a 'tool.execute.before' hook handler", () => {
      describe("#when aggregated with disabledHooks containing 'tool.execute.before'", () => {
        it("#then 'tool.execute.before' is absent from the result map", () => {
          const plugin: PluginDefinition = {
            name: "test-plugin",
            hooks: {
              "tool.execute.before": async () => {},
            },
          };

          const result = aggregateHooks([plugin], ["tool.execute.before"]);

          expect(result.has("tool.execute.before")).toBe(false);
          expect(result.size).toBe(0);
        });
      });
    });
  });

  describe("buildAgent", () => {
    describe("#given an agent factory returning model 'original-model' and temperature 0.5", () => {
      describe("#when built with overrides model 'override-model' and temperature 0.9", () => {
        it("#then the returned config has the overridden model and temperature", () => {
          const factory: AgentFactory = Object.assign(
            (_model: string): AgentConfig =>
              ({
                instructions: "test agent",
                model: "original-model",
                temperature: 0.5,
              }) as AgentConfig,
            { mode: "all" as const },
          );

          const result = buildAgent(factory, "base-model", undefined, {
            model: "override-model",
            temperature: 0.9,
          });

          expect(result.model).toBe("override-model");
          expect(result.temperature).toBe(0.9);
          expect(result.instructions).toBe("test agent");
        });
      });
    });
  });

  describe("PluginRegistry.aggregate", () => {
    describe("#given a plugin with agent 'advisor', tool 'grep', and hook 'tool.execute.before'", () => {
      describe("#when aggregated with disabledAgents=['advisor'] and disabledTools=['grep']", () => {
        it("#then 'advisor' not in agents, 'grep' not in tools, but hook is still present", () => {
          const plugin: PluginDefinition = {
            name: "test-plugin",
            agents: { advisor: makeAgent() },
            tools: { grep: makeTool() },
            hooks: {
              "tool.execute.before": async () => {},
            },
          };

          const registry = new PluginRegistry();
          registry.register(plugin);
          const resolved = registry.resolve();

          const aggregated = registry.aggregate(resolved, {
            disabledAgents: ["advisor"],
            disabledTools: ["grep"],
          });

          expect(aggregated.agents).not.toHaveProperty("advisor");
          expect(Object.keys(aggregated.agents)).toHaveLength(0);
          expect(aggregated.tools).not.toHaveProperty("grep");
          expect(Object.keys(aggregated.tools)).toHaveLength(0);
          expect(aggregated.hooks.has("tool.execute.before")).toBe(true);
          expect(aggregated.hooks.get("tool.execute.before")).toHaveLength(1);
        });
      });
    });
  });
});
