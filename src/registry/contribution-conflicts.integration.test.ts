import { describe, expect, it, mock } from "bun:test";

import type { PluginAgentContribution } from "../types/agent";
import type { PluginDefinition, PluginHookHandler } from "../types/plugin";
import type { PluginToolContribution } from "../types/tool";

const logSpy = mock(() => {});

mock.module("../shared/logger", () => ({
  log: logSpy,
}));

import { wrapSafely } from "../hooks/safe-hook-wrapper";
import { aggregateAgents } from "./agent-aggregator";
import { aggregateHooks } from "./hook-aggregator";
import { aggregateTools } from "./tool-aggregator";

function makeToolContribution(id: string): PluginToolContribution {
  return {
    execute: async () => id,
  } as unknown as PluginToolContribution;
}

function makeAgentContribution(model: string): PluginAgentContribution {
  return {
    instructions: "integration-test",
    model,
  } as unknown as PluginAgentContribution;
}

describe("aggregateTools", () => {
  describe("#given two plugins that register the same tool name", () => {
    describe("#when aggregateTools runs in replace conflict mode", () => {
      it("#then the last plugin tool wins and a conflict warning is logged", () => {
        const toolA = makeToolContribution("plugin-a");
        const toolB = makeToolContribution("plugin-b");
        const plugins: PluginDefinition[] = [
          { name: "plugin-a", tools: { search: toolA } },
          { name: "plugin-b", tools: { search: toolB } },
        ];
        const callsBefore = logSpy.mock.calls.length;

        const aggregated = aggregateTools(plugins);

        expect(aggregated.search).toBe(toolB);
        expect(aggregated.search).not.toBe(toolA);
        expect(logSpy.mock.calls.length).toBeGreaterThan(callsBefore);
        expect(
          logSpy.mock.calls
            .slice(callsBefore)
            .some(
              (call) =>
                typeof call[0] === "string" &&
                call[0].includes("CONFLICT") &&
                call[0].includes('"search"'),
            ),
        ).toBe(true);
      });
    });
  });
});

describe("aggregateAgents", () => {
  describe("#given two plugins that register the same agent name", () => {
    describe("#when aggregateAgents runs in replace conflict mode", () => {
      it("#then the second plugin agent overwrites the first", () => {
        const firstAgent = makeAgentContribution("model-a");
        const secondAgent = makeAgentContribution("model-b");
        const plugins: PluginDefinition[] = [
          { name: "plugin-a", agents: { advisor: firstAgent } },
          { name: "plugin-b", agents: { advisor: secondAgent } },
        ];

        const aggregated = aggregateAgents(plugins);

        expect(aggregated.advisor).toBe(secondAgent);
        expect(aggregated.advisor).not.toBe(firstAgent);
      });
    });
  });
});

describe("aggregateHooks", () => {
  describe("#given two plugins that register the same hook event", () => {
    describe("#when aggregateHooks runs in append conflict mode", () => {
      it("#then both handlers are collected in plugin order", () => {
        type ToolExecuteBeforeHandler = NonNullable<
          PluginDefinition["hooks"]
        >["tool.execute.before"];
        const first: ToolExecuteBeforeHandler = async () => {};
        const second: ToolExecuteBeforeHandler = async () => {};
        const plugins: PluginDefinition[] = [
          { name: "plugin-a", hooks: { "tool.execute.before": first } },
          { name: "plugin-b", hooks: { "tool.execute.before": second } },
        ];

        const aggregated = aggregateHooks(plugins);

        expect(aggregated.get("tool.execute.before")).toEqual([first, second]);
      });
    });
  });
});

describe("wrapSafely", () => {
  describe("#given a hook handler partially mutates output before throwing", () => {
    describe("#when the wrapped handler executes", () => {
      it("#then the throw is swallowed and partial mutation remains", async () => {
        const handler: PluginHookHandler = async (_input, output) => {
          const mutableOutput = output as { output: string };
          mutableOutput.output = "partial";
          throw new Error("boom");
        };
        const wrapped = wrapSafely("test", handler);
        const output = { output: "" };

        await expect(wrapped({}, output)).resolves.toBeUndefined();
        expect(output.output).toBe("partial");
      });
    });
  });

  describe("#given handlers that throw non-Error values", () => {
    describe("#when each handler is wrapped and executed", () => {
      it("#then string, number, and object throws are all swallowed", async () => {
        const nonErrorThrows = ["string error", 42, { code: "ERR_CUSTOM" }] as const;

        for (const thrownValue of nonErrorThrows) {
          const handler: PluginHookHandler = async () => {
            throw thrownValue;
          };
          const wrapped = wrapSafely("non-error", handler);

          await expect(wrapped({}, {})).resolves.toBeUndefined();
        }
      });
    });
  });
});

describe("disabled contributions", () => {
  describe("#given hook, tool, and agent entries that are disabled by name", () => {
    describe("#when each aggregator runs with disabled arrays", () => {
      it("#then disabled entries are excluded from aggregated output", () => {
        const hooksPlugins: PluginDefinition[] = [
          {
            name: "hooks-plugin",
            hooks: {
              "comment-checker": async () => {},
              "tool.execute.before": async () => {},
            } as unknown as NonNullable<PluginDefinition["hooks"]>,
          },
        ];
        const toolsPlugins: PluginDefinition[] = [
          {
            name: "tools-plugin",
            tools: {
              grep: makeToolContribution("grep"),
              safe_tool: makeToolContribution("safe-tool"),
            },
          },
        ];
        const agentsPlugins: PluginDefinition[] = [
          {
            name: "agents-plugin",
            agents: {
              advisor: makeAgentContribution("model-advisor"),
              worker: makeAgentContribution("model-worker"),
            },
          },
        ];

        const hooks = aggregateHooks(hooksPlugins, ["comment-checker"]);
        const tools = aggregateTools(toolsPlugins, ["grep"]);
        const agents = aggregateAgents(agentsPlugins, ["advisor"]);

        expect(hooks.has("comment-checker")).toBe(false);
        expect(hooks.has("tool.execute.before")).toBe(true);
        expect(tools.grep).toBeUndefined();
        expect(tools.safe_tool).toBeDefined();
        expect(agents.advisor).toBeUndefined();
        expect(agents.worker).toBeDefined();
      });
    });
  });
});
